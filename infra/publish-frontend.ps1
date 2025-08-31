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

# Do NOT auto-resolve ApiBase; by default we want relative paths so CloudFront proxies /api/* without mixed-content.

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

# If client folder doesn't exist, create a minimal static site as a fallback
if (-not (Test-Path $client)) {
  $tmp = Join-Path $env:TEMP ("funds-static-" + [guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $api = if ([string]::IsNullOrWhiteSpace($ApiBase)) { '#' } else { $ApiBase }
  $link = if ($api -eq '#') { '#' } else { "$api/weatherforecast" }
  $html = @(
    '<!doctype html>',
    '<html lang="en">',
    '<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/>',
    '<title>Funds App</title>',
    '<style>body{font-family:system-ui,Segoe UI,Roboto,Arial;margin:2rem;max-width:820px} code{background:#f2f4f7;padding:.2rem .4rem;border-radius:4px} .muted{color:#667085}</style>',
    '</head><body>',
    '<h1>Funds App</h1>',
    '<p class="muted">Static placeholder UI. Backend is deployed.</p>',
    ('<p>API base: <code>' + $api + '</code></p>'),
    ('<p>Try: <a href="' + $link + '">' + $link + '</a></p>'),
    '</body></html>'
  ) -join "`n"
  Set-Content -Path (Join-Path $tmp 'index.html') -Value $html -Encoding UTF8
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws s3 sync $tmp s3://$Bucket/ --delete --region $AwsRegion
  } else {
    aws s3 sync $tmp s3://$Bucket/ --delete --region $AwsRegion --profile $Profile
  }
  Remove-Item -Recurse -Force $tmp
  Write-Host "Uploaded minimal static site to s3://$Bucket" -ForegroundColor Green
  # Optional CloudFront invalidation when -StackName provided
  if (-not [string]::IsNullOrWhiteSpace($StackName)) {
    $cf = if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query "Stacks[0].Outputs[?OutputKey=='FrontendDomainName'].OutputValue" --output text
    } else {
      aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --profile $Profile --query "Stacks[0].Outputs[?OutputKey=='FrontendDomainName'].OutputValue" --output text
    }
    if ($cf) {
      $distId = if ([string]::IsNullOrWhiteSpace($Profile)) {
        aws cloudfront list-distributions --region $AwsRegion --query "DistributionList.Items[?DomainName=='$cf'].Id" --output text
      } else {
        aws cloudfront list-distributions --region $AwsRegion --profile $Profile --query "DistributionList.Items[?DomainName=='$cf'].Id" --output text
      }
      if ($distId) {
        if ([string]::IsNullOrWhiteSpace($Profile)) {
          aws cloudfront create-invalidation --distribution-id $distId --paths '/*' --region $AwsRegion | Out-Null
        } else {
          aws cloudfront create-invalidation --distribution-id $distId --paths '/*' --region $AwsRegion --profile $Profile | Out-Null
        }
        Write-Host "Created CloudFront invalidation for $distId" -ForegroundColor Green
      }
    }
  }
  return
}

Push-Location $client
try {

  if (-not [string]::IsNullOrWhiteSpace($ApiBase)) {
    $env:NEXT_PUBLIC_API_BASE = $ApiBase
  }
  # Resilient install to avoid EPERM locks on Windows
  if (Test-Path (Join-Path $client 'node_modules')) {
    Write-Host "node_modules exists; skipping npm install" -ForegroundColor Yellow
  } else {
    $installed = $false
    for ($i=1; $i -le 2 -and -not $installed; $i++) {
      try {
        npm ci
        $installed = $true
      } catch {
        Start-Sleep -Seconds (2 * $i)
      }
    }
    if (-not $installed) {
      Write-Warning "npm ci failed; falling back to 'npm install'"
      npm install --no-audit --no-fund
    }
  }
  # Build (with output: 'export' configured in next.config.ts, this writes to 'out')
  npx --yes next@15.5.2 build
  # If there is an export (out/), prefer uploading it (contains index.html and assets)
  $exportDir = Join-Path $client 'out'
  if (Test-Path $exportDir) {
    if ([string]::IsNullOrWhiteSpace($Profile)) {
      aws s3 sync $exportDir s3://$Bucket/ --delete --region $AwsRegion
    } else {
      aws s3 sync $exportDir s3://$Bucket/ --delete --region $AwsRegion --profile $Profile
    }
    # Invalidate CloudFront when StackName provided
    if (-not [string]::IsNullOrWhiteSpace($StackName)) {
      $cf = if ([string]::IsNullOrWhiteSpace($Profile)) {
        aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --query "Stacks[0].Outputs[?OutputKey=='FrontendDomainName'].OutputValue" --output text
      } else {
        aws cloudformation describe-stacks --stack-name $StackName --region $AwsRegion --profile $Profile --query "Stacks[0].Outputs[?OutputKey=='FrontendDomainName'].OutputValue" --output text
      }
      if ($cf) {
        $distId = if ([string]::IsNullOrWhiteSpace($Profile)) {
          aws cloudfront list-distributions --region $AwsRegion --query "DistributionList.Items[?DomainName=='$cf'].Id" --output text
        } else {
          aws cloudfront list-distributions --region $AwsRegion --profile $Profile --query "DistributionList.Items[?DomainName=='$cf'].Id" --output text
        }
        if ($distId) {
          if ([string]::IsNullOrWhiteSpace($Profile)) {
            aws cloudfront create-invalidation --distribution-id $distId --paths '/*' --region $AwsRegion | Out-Null
          } else {
            aws cloudfront create-invalidation --distribution-id $distId --paths '/*' --region $AwsRegion --profile $Profile | Out-Null
          }
          Write-Host "Created CloudFront invalidation for $distId" -ForegroundColor Green
        }
      }
    }
  } else {
    # Fallback: upload a minimal index.html to avoid AccessDenied at CloudFront root
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
