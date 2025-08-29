param(
  [Parameter(Mandatory=$false)][string]$Bucket,
  [string]$ApiBase = '' ,
  [string]$AwsRegion = 'us-east-1',
  [string]$Profile = '',
  [string]$StackName = ''
)

$ErrorActionPreference = 'Stop'

# Fallback to environment variables if parameters weren't provided
if ([string]::IsNullOrWhiteSpace($Bucket)) { $Bucket = $env:FrontendBucket }
if ([string]::IsNullOrWhiteSpace($ApiBase)) { $ApiBase = $env:ApiBase }

# If still missing, try to resolve from CloudFormation outputs when StackName is provided
if ([string]::IsNullOrWhiteSpace($Bucket) -and -not [string]::IsNullOrWhiteSpace($StackName)) {
  # Ensure stack is in a stable completed state
  $statusQuery = "Stacks[0].StackStatus"
  $stackStatus = if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query $statusQuery --output text 2>$null
  } else {
    aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --profile $Profile --query $statusQuery --output text 2>$null
  }
  if (-not $stackStatus -or -not ($stackStatus -match '^(CREATE_COMPLETE|UPDATE_COMPLETE)$')) {
    throw "Stack '$StackName' is not ready (status: '$stackStatus'). Please deploy/complete the stack or pass -Bucket explicitly."
  }
  $bucketQuery = "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue | [0]"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    $Bucket = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query $bucketQuery --output text 2>$null
  } else {
    $Bucket = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --profile $Profile --query $bucketQuery --output text 2>$null
  }
}

if ([string]::IsNullOrWhiteSpace($ApiBase) -and -not [string]::IsNullOrWhiteSpace($StackName)) {
  $apiQuery = "Stacks[0].Outputs[?OutputKey=='PublicURL'].OutputValue | [0]"
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    $ApiBase = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query $apiQuery --output text 2>$null
  } else {
    $ApiBase = aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --profile $Profile --query $apiQuery --output text 2>$null
  }
}

if ([string]::IsNullOrWhiteSpace($Bucket)) {
  throw "Bucket is required. Pass -Bucket <name> or set environment variable FrontendBucket."
}

# Validate bucket exists
function Test-S3BucketExists {
  param([string]$Name)
  try {
    if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws s3api head-bucket --bucket $Name --region $AwsRegion | Out-Null
    } else {
      aws s3api head-bucket --bucket $Name --region $AwsRegion --profile $Profile | Out-Null
    }
    return $true
  } catch { return $false }
}
if (-not (Test-S3BucketExists -Name $Bucket)) {
  throw "S3 bucket '$Bucket' not found in region $AwsRegion. Ensure the CloudFormation stack created it or provide the correct bucket name."
}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
$client = Join-Path $root 'Client\funds'
Push-Location $client
try {
  if (-not [string]::IsNullOrWhiteSpace($ApiBase)) {
    $env:NEXT_PUBLIC_API_BASE = $ApiBase
  }
  # Resilient install to avoid EPERM locks on Windows
  $installed = $false
  for ($i=1; $i -le 3 -and -not $installed; $i++) {
    try {
      npm ci
      $installed = $true
    } catch {
      Start-Sleep -Seconds (2 * $i)
      if ($i -eq 3) { throw }
    }
  }
  npx --yes next@15.5.2 build
  # Next 15 default output is .next, use standalone export only if configured; we'll sync .next/static as assets and a simple index.html if exported
  # Prefer a static export (app router supports output: 'export' if configured). If no export, we'll package minimal static assets.
  $outDir = Join-Path $client '.next\standalone'
  $staticDir = Join-Path $client '.next\static'
  if (Test-Path $staticDir) {
    if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws s3 sync $staticDir s3://$Bucket/_next/static --delete --region $AwsRegion
    } else {
      aws s3 sync $staticDir s3://$Bucket/_next/static --delete --region $AwsRegion --profile $Profile
    }
  }
  # If there is an export (out/), prefer uploading it
  $exportDir = Join-Path $client 'out'
  if (Test-Path $exportDir) {
    if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws s3 sync $exportDir s3://$Bucket/ --delete --region $AwsRegion
    } else {
      aws s3 sync $exportDir s3://$Bucket/ --delete --region $AwsRegion --profile $Profile
    }
  } else {
    # Fallback: upload a minimal index.html pointing to the app root hosted elsewhere or placeholder
    $indexPath = Join-Path $client 'index.html'
  $indexHtml = "<!doctype html><html><head><meta http-equiv='refresh' content='0; url=/' /><title>Redirecting…</title></head><body></body></html>"
  Set-Content -Path $indexPath -Value $indexHtml -Encoding UTF8
    if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws s3 cp $indexPath s3://$Bucket/index.html --region $AwsRegion --content-type text/html
    } else {
      aws s3 cp $indexPath s3://$Bucket/index.html --region $AwsRegion --profile $Profile --content-type text/html
    }
    Remove-Item $indexPath -Force
  }
}
finally { Pop-Location }
