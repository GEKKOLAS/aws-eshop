param(
  [string]$StackName = 'FundsAppStack',
  [string]$AwsRegion = 'us-east-1',
  [string]$Profile = '',
  [string]$Bucket = '',
  [string]$ArtifactKey = 'artifacts/funds-api.zip',
  [string]$InstanceType = 't3.micro',
  [string]$TopicEmail = '',
  [string]$SubnetId = ''
)

$profileArgs = @()
if (-not [string]::IsNullOrWhiteSpace($Profile)) { $profileArgs = @('--profile', $Profile) }

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Split-Path -Parent $here

Write-Host "Validating AWS CLI and identity..." -ForegroundColor Cyan
$idOut = & aws @profileArgs 'sts' 'get-caller-identity' '--query' 'Account' '--output' 'text' '--region' $AwsRegion
$exit = $LASTEXITCODE
if ($exit -ne 0) { throw "AWS credentials not configured or region invalid. ExitCode=$exit" }
$accountId = (($idOut | Out-String).Trim())
if (-not $accountId) { throw "AWS credentials not configured. Run 'aws configure' or set a profile." }
Write-Host "Account: $accountId, Region: $AwsRegion" -ForegroundColor Yellow

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  $Bucket = "funds-artifacts-$accountId-$AwsRegion"
  Write-Host "Using artifact bucket: $Bucket" -ForegroundColor Yellow
}

# Create bucket if it does not exist
Write-Host "Ensuring S3 bucket exists: s3://$Bucket" -ForegroundColor Cyan
$bucketExists = $false
& aws @profileArgs 's3api' 'head-bucket' '--bucket' $Bucket '--region' $AwsRegion | Out-Null
if ($LASTEXITCODE -eq 0) { $bucketExists = $true } else { $bucketExists = $false }

if (-not $bucketExists) {
  # Buckets are global; only specify location-constraint when region != us-east-1
  if ($AwsRegion -eq 'us-east-1') {
    & aws @profileArgs 's3api' 'create-bucket' '--bucket' $Bucket '--region' $AwsRegion | Out-Null
  } else {
    & aws @profileArgs 's3api' 'create-bucket' '--bucket' $Bucket '--create-bucket-configuration' "LocationConstraint=$AwsRegion" '--region' $AwsRegion | Out-Null
  }
  Write-Host "Created bucket $Bucket" -ForegroundColor Green
  # wait for bucket to be ready
  $tries = 0
  do {
    Start-Sleep -Seconds 2
    try {
      & aws @profileArgs 's3api' 'head-bucket' '--bucket' $Bucket '--region' $AwsRegion | Out-Null
      $bucketExists = $true
    } catch { $bucketExists = $false }
    $tries++
  } while (-not $bucketExists -and $tries -lt 10)
  if (-not $bucketExists) { throw "Bucket $Bucket not accessible after creation." }
}

# Publish API and upload artifact
& (Join-Path $here 'publish-api.ps1') -Bucket $Bucket -Key $ArtifactKey -AwsRegion $AwsRegion -Profile $Profile

# Determine VPC and subnet
if (-not [string]::IsNullOrWhiteSpace($SubnetId)) {
  Write-Host "Using provided SubnetId: $SubnetId" -ForegroundColor Yellow
  $vpcId = (& aws @profileArgs 'ec2' 'describe-subnets' '--subnet-ids' $SubnetId '--region' $AwsRegion '--query' 'Subnets[0].VpcId' '--output' 'text')
  $vpcId = (($vpcId | Out-String).Trim())
  if (-not $vpcId -or $vpcId -eq 'None') { throw "Could not resolve VPC for SubnetId $SubnetId." }
  $subnetId = $SubnetId
} else {
  Write-Host "Discovering default VPC and a public subnet..." -ForegroundColor Cyan
  $vpcId = (& aws @profileArgs 'ec2' 'describe-vpcs' '--filters' 'Name=isDefault,Values=true' '--region' $AwsRegion '--query' 'Vpcs[0].VpcId' '--output' 'text')
  $vpcId = (($vpcId | Out-String).Trim())
  if (-not $vpcId -or $vpcId -eq 'None') { throw "No default VPC found in $AwsRegion. Provide explicit VPC/Subnet or create a VPC." }

  $subnetsJson = & aws @profileArgs 'ec2' 'describe-subnets' '--filters' "Name=vpc-id,Values=$vpcId" '--region' $AwsRegion '--query' "Subnets[].{Id:SubnetId,Public:MapPublicIpOnLaunch}" '--output' 'json'
  $subnets = $subnetsJson | ConvertFrom-Json
  if (-not $subnets -or $subnets.Count -eq 0) { throw "No subnets found in VPC $vpcId." }
  $publicSubnet = @($subnets | Where-Object { $_.Public })[0]
  if (-not $publicSubnet) { $publicSubnet = $subnets[0] }
  $subnetId = $publicSubnet.Id
}
Write-Host "VPC: $vpcId, Subnet: $subnetId" -ForegroundColor Yellow

# Find latest Amazon Linux 2023 x86_64 AMI
Write-Host "Looking up latest Amazon Linux 2023 x86_64 AMI..." -ForegroundColor Cyan
$amiQuery = 'Images | sort_by(@, &CreationDate) | [-1].ImageId'
$imageId = (& aws @profileArgs 'ec2' 'describe-images' '--owners' 'amazon' '--filters' 'Name=name,Values=al2023-ami-2023*' 'Name=architecture,Values=x86_64' 'Name=state,Values=available' '--region' $AwsRegion '--query' $amiQuery '--output' 'text')
$imageId = (($imageId | Out-String).Trim())
if (-not $imageId -or $imageId -eq 'None') { throw "Could not find AL2023 AMI in $AwsRegion." }
Write-Host "Using AMI: $imageId" -ForegroundColor Yellow

Write-Host "Deploying stack $StackName" -ForegroundColor Cyan
Write-Host ("CFN Params: `n" + (
  @(
    "Environment=$('prod')",
    "VpcId=$vpcId",
    "SubnetId=$subnetId",
    "KeyName=''",
    "InstanceType=$InstanceType",
    "ArtifactBucket=$Bucket",
    "ArtifactKey=$ArtifactKey",
    "AwsRegion=$AwsRegion",
    "ImageId=$imageId",
    "TopicEmail=$TopicEmail"
  ) -join "`n"
)) -ForegroundColor DarkGray

# Deploy stack
& (Join-Path $here 'deploy-stack.ps1') `
  -StackName $StackName `
  -VpcId $vpcId `
  -SubnetId $subnetId `
  -ArtifactBucket $Bucket `
  -ArtifactKey $ArtifactKey `
  -Environment 'prod' `
  -KeyName '' `
  -InstanceType $InstanceType `
  -AwsRegion $AwsRegion `
  -ImageId $imageId `
  -TopicEmail $TopicEmail `
  -Profile $Profile

Write-Host "Done. Use the PublicURL output to test the API." -ForegroundColor Green
