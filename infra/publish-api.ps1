param(
  [Parameter(Mandatory=$true)][string]$Bucket,
  [Parameter(Mandatory=$true)][string]$Key,
  [string]$AwsRegion = 'us-east-1',
  [string]$Profile = ''
)

Write-Host "Publishing API (Release) and uploading to s3://$Bucket/$Key"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Push-Location $root
try {
  dotnet publish .\API\API.csproj -c Release -o .\publish\api
  if (Test-Path .\publish\api.zip) { Remove-Item .\publish\api.zip -Force }
  Compress-Archive -Path .\publish\api\* -DestinationPath .\publish\api.zip -Force
  if ([string]::IsNullOrWhiteSpace($Profile)) {
    aws s3 cp .\publish\api.zip s3://$Bucket/$Key --region $AwsRegion
  } else {
    aws s3 cp .\publish\api.zip s3://$Bucket/$Key --region $AwsRegion --profile $Profile
  }
  Write-Host "Uploaded to s3://$Bucket/$Key" -ForegroundColor Green
}
finally { Pop-Location }
