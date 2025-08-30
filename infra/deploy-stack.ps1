param(
  [Parameter(Mandatory=$true)][string]$StackName,
  [Parameter(Mandatory=$true)][string]$VpcId,
  [Parameter(Mandatory=$true)][string]$SubnetId,
  [Parameter(Mandatory=$true)][string]$ArtifactBucket,
  [Parameter(Mandatory=$true)][string]$ArtifactKey,
  [string]$Environment = 'prod',
  [string]$KeyName = '',
  [string]$InstanceType = 't3.micro',
  [string]$AwsRegion = 'us-east-1',
  [Parameter(Mandatory=$true)][string]$ImageId,
  [string]$TopicEmail = '',
  [string]$Profile = ''
)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$template = Join-Path $here 'cloudformation.json'
if (-not (Test-Path $template)) { $template = Join-Path $here 'cloudformation.yaml' }

function Get-FreeTierInstanceTypes {
  param([string]$Region, [string]$Profile)
  $query = "InstanceTypes[].InstanceType"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws ec2 describe-instance-types --region $Region --filters Name=free-tier-eligible,Values=true --query $query --output text 2>$null
  } else {
    aws ec2 describe-instance-types --region $Region --profile $Profile --filters Name=free-tier-eligible,Values=true --query $query --output text 2>$null
  }
}

function Get-ImageArchitecture {
  param([string]$ImageId, [string]$Region, [string]$Profile)
  $query = "Images[0].Architecture"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws ec2 describe-images --image-ids $ImageId --region $Region --query $query --output text 2>$null
  } else {
    aws ec2 describe-images --image-ids $ImageId --region $Region --profile $Profile --query $query --output text 2>$null
  }
}

function Get-SubnetAz {
  param([string]$SubnetId, [string]$Region, [string]$Profile)
  $query = "Subnets[0].AvailabilityZone"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws ec2 describe-subnets --subnet-ids $SubnetId --region $Region --query $query --output text 2>$null
  } else {
    aws ec2 describe-subnets --subnet-ids $SubnetId --region $Region --profile $Profile --query $query --output text 2>$null
  }
}

function Is-InstanceTypeOfferedInAz {
  param([string]$InstanceType, [string]$Az, [string]$Region, [string]$Profile)
  $query = "length(InstanceTypeOfferings)"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    $len = aws ec2 describe-instance-type-offerings --location-type availability-zone --filters Name=location,Values=$Az Name=instance-type,Values=$InstanceType --region $Region --query $query --output text 2>$null
  } else {
    $len = aws ec2 describe-instance-type-offerings --location-type availability-zone --filters Name=location,Values=$Az Name=instance-type,Values=$InstanceType --region $Region --profile $Profile --query $query --output text 2>$null
  }
  return ([int]$len -gt 0)
}

function Get-SubnetVpcId {
  param([string]$SubnetId, [string]$Region, [string]$Profile)
  $query = "Subnets[0].VpcId"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws ec2 describe-subnets --subnet-ids $SubnetId --region $Region --query $query --output text 2>$null
  } else {
    aws ec2 describe-subnets --subnet-ids $SubnetId --region $Region --profile $Profile --query $query --output text 2>$null
  }
}

function Find-PreferredSubnetInVpc {
  param([string]$VpcId, [string]$Region, [string]$Profile)
  # List subnets in preferred AZs (a/b/c/d/f), prefer ones with MapPublicIpOnLaunch = true
  $preferredAzRegex = 'a$|b$|c$|d$|f$'
  $query = "Subnets[].{Id:SubnetId,Az:AvailabilityZone,Public:MapPublicIpOnLaunch}"
  $subnetsJson = if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws ec2 describe-subnets --filters Name=vpc-id,Values=$VpcId --region $Region --query $query --output json 2>$null
  } else {
    aws ec2 describe-subnets --filters Name=vpc-id,Values=$VpcId --region $Region --profile $Profile --query $query --output json 2>$null
  }
  if (-not $subnetsJson) { return $null }
  $subnets = $subnetsJson | ConvertFrom-Json
  $filtered = @($subnets | Where-Object { $_.Az -match $preferredAzRegex })
  if ($filtered.Count -eq 0) { return $null }
  $publicFirst = @($filtered | Sort-Object -Property @{Expression = { -not $_.Public }})
  return $publicFirst[0].Id
}

Write-Host "Deploying stack $StackName" -ForegroundColor Cyan

# Validate/auto-select free-tier eligible instance type based on AMI architecture
try {
  $arch = Get-ImageArchitecture -ImageId $ImageId -Region $AwsRegion -Profile $Profile
  $freeTierTypesText = Get-FreeTierInstanceTypes -Region $AwsRegion -Profile $Profile
  $freeTierTypes = @()
  if ($freeTierTypesText) { $freeTierTypes = $freeTierTypesText -split "\s+" }
  $originalType = $InstanceType

  # Enforce architecture-compatible instance family and pick a Free Tier option
  if ($arch -eq 'arm64') {
    if ($InstanceType -notlike 't4g.*') { $InstanceType = if ($freeTierTypes -contains 't4g.micro') { 't4g.micro' } else { 't4g.micro' } }
  } else {
    if ($InstanceType -like 't4g.*') {
      if ($freeTierTypes -contains 't3.micro') { $InstanceType = 't3.micro' }
      elseif ($freeTierTypes -contains 't2.micro') { $InstanceType = 't2.micro' }
      else { $InstanceType = 't3.micro' }
    } elseif (-not ($freeTierTypes -contains $InstanceType)) {
      if ($freeTierTypes -contains 't3.micro') { $InstanceType = 't3.micro' }
      elseif ($freeTierTypes -contains 't2.micro') { $InstanceType = 't2.micro' }
    }
  }

  if ($originalType -ne $InstanceType) {
    Write-Host "Adjusted InstanceType from '$originalType' to '$InstanceType' (arch=$arch, region=$AwsRegion, free-tier eligible)." -ForegroundColor Yellow
  } else {
    Write-Host "Using InstanceType '$InstanceType' (arch=$arch)." -ForegroundColor Yellow
  }

  # Ensure the chosen type is offered in the subnet's AZ; if not, pick a compatible alternative
  $az = Get-SubnetAz -SubnetId $SubnetId -Region $AwsRegion -Profile $Profile
  if ($az) {
    if (-not (Is-InstanceTypeOfferedInAz -InstanceType $InstanceType -Az $az -Region $AwsRegion -Profile $Profile)) {
      Write-Host "InstanceType '$InstanceType' not offered in AZ '$az'. Searching alternatives..." -ForegroundColor Yellow
      $candidates = $freeTierTypes | Where-Object { $_ -match 'micro$' }
      # Strictly keep candidates compatible with AMI architecture
      if ($arch -eq 'arm64') {
        $candidates = $candidates | Where-Object { $_ -like 't4g.*' }
        $ordered = $candidates
      } else {
        # x86_64: prefer t3.micro then t2.micro; exclude arm64 families (t4g)
        $candidates = $candidates | Where-Object { $_ -notlike 't4g.*' }
        $ordered = @($candidates | Where-Object { $_ -like 't3.*' }) + (@($candidates | Where-Object { $_ -like 't2.*' }))
      }
      foreach ($t in $ordered) {
        if (Is-InstanceTypeOfferedInAz -InstanceType $t -Az $az -Region $AwsRegion -Profile $Profile) { $InstanceType = $t; break }
      }
      Write-Host "Selected InstanceType '$InstanceType' available in '$az'." -ForegroundColor Yellow
    }
    # Ensure subnet AZ is preferred (a/b/c/d/f). If not, try to switch subnet within the same VPC.
    if ($az -match 'e$') {
      $vpc = Get-SubnetVpcId -SubnetId $SubnetId -Region $AwsRegion -Profile $Profile
      if ($vpc) {
        $altSubnet = Find-PreferredSubnetInVpc -VpcId $vpc -Region $AwsRegion -Profile $Profile
        if ($altSubnet) {
          Write-Host "Switching SubnetId from '$SubnetId' (AZ $az) to '$altSubnet' in preferred AZ (a/b/c/d/f)." -ForegroundColor Yellow
          $SubnetId = $altSubnet
        } else {
          Write-Host "No alternate subnet in preferred AZs found within VPC '$vpc'. Proceeding with provided subnet '$SubnetId'." -ForegroundColor DarkYellow
        }
      }
    }
  }
} catch {
  Write-Host "Warning: Could not auto-validate Free Tier instance type. Proceeding with '$InstanceType'. Details: $($_.Exception.Message)" -ForegroundColor DarkYellow
}

$params = @(
  "ParameterKey=Environment,ParameterValue=$Environment",
  "ParameterKey=VpcId,ParameterValue=$VpcId",
  "ParameterKey=SubnetId,ParameterValue=$SubnetId",
  "ParameterKey=KeyName,ParameterValue=$KeyName",
  "ParameterKey=InstanceType,ParameterValue=$InstanceType",
  "ParameterKey=ArtifactBucket,ParameterValue=$ArtifactBucket",
  "ParameterKey=ArtifactKey,ParameterValue=$ArtifactKey",
  "ParameterKey=AwsRegion,ParameterValue=$AwsRegion",
  "ParameterKey=ImageId,ParameterValue=$ImageId",
  "ParameterKey=TopicEmail,ParameterValue=$TopicEmail"
)

if ([string]::IsNullOrWhiteSpace($Profile)) {
  aws cloudformation deploy `
    --stack-name $StackName `
    --template-file $template `
    --region $AwsRegion `
    --capabilities CAPABILITY_NAMED_IAM `
    --parameter-overrides $params
} else {
  aws cloudformation deploy `
    --stack-name $StackName `
    --template-file $template `
    --region $AwsRegion `
    --capabilities CAPABILITY_NAMED_IAM `
    --profile $Profile `
    --parameter-overrides $params
}

Write-Host "Stack deployed. Outputs:" -ForegroundColor Green
if ([string]::IsNullOrWhiteSpace($Profile)) {
  aws cloudformation describe-stacks --stack-name $StackName `
    --region $AwsRegion `
    --query "Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}" --output table
} else {
  aws cloudformation describe-stacks --stack-name $StackName `
    --region $AwsRegion `
    --profile $Profile `
    --query "Stacks[0].Outputs[*].{Key:OutputKey,Value:OutputValue}" --output table
}
