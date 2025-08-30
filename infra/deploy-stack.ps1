param(
  [Parameter(Mandatory=$true)][string]$StackName,
  [Parameter(Mandatory=$true)][string]$VpcId,
  [Parameter(Mandatory=$true)][string]$SubnetId,
  [Parameter(Mandatory=$true)][string]$ArtifactBucket,
  [Parameter(Mandatory=$true)][string]$ArtifactKey,
  [string]$Environment = 'prod',
  [string]$KeyName = '',
  [string]$InstanceType = 't2.micro',
  [string]$AwsRegion = 'us-east-1',
  [Parameter(Mandatory=$true)][string]$ImageId,
  [string]$TopicEmail = '',
  [string]$Profile = ''
)

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$template = Join-Path $here 'cloudformation.json'
if (-not (Test-Path $template)) { $template = Join-Path $here 'cloudformation.yaml' }

Write-Host "Deploying stack $StackName" -ForegroundColor Cyan

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
