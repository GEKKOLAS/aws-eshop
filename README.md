## Vista previa en vivo

-live preview : https://dvsvnp7nbzde3.cloudfront.net/

## Preguntas query y modelado de DB en dynamo
- DynamoDb table : 

### Modelo DynamoDB — resumen formateado

#### Esquema general
- Claves primarias: `PK` (string), `SK` (string)  
- GSI principal: `GSI1` con `GSI1PK` (string) y `GSI1SK` (string)

---

#### Entidades

1. Usuario (perfil / saldo)
- PK = `USER#{UserId}`  
- SK = `PROFILE`  
- Atributos:  
    - `Balance` (number)  
    - `ContactChannel` (`"email"` | `"sms"`)  
    - `ContactDestination` (string)  
    - `CreatedAt` (ISO timestamp)  
- Semilla de ejemplo: `Balance = 500000`

2. Fund (catálogo)
- PK = `FUND#{FundId}`  
- SK = `METADATA`  
- Atributos: `Name`, `MinAmount` (number), `Category` (`"FPV"` | `"FIC"`)  
- GSI1:
    - `GSI1PK = "FUND"`  
    - `GSI1SK = "Category#{Category}#Name"`  
- Accesos:  
    - Obtener por id: `GetItem(PK=FUND#{FundId}, SK=METADATA)`  
    - Listar todos: `Query` en GSI1 con `GSI1PK="FUND"`  
    - Filtrar por categoría: `begins_with(GSI1SK, "Category#FPV")`

3. Subscription (suscripción activa)
- PK = `USER#{UserId}`  
- SK = `SUB#{FundId}`  
- Atributos: `FundId`, `FundName`, `Amount` (MinAmount), `SubscribedAt` (ISO), `Status = "Active"`  
- GSI1 (para listar suscripciones de un usuario):
    - `GSI1PK = USER#{UserId}#SUB`  
    - `GSI1SK = FundName`  
- Nota: al cancelar se puede `Delete` el ítem o marcar `Status="Cancelled"` y opcionalmente mover / duplicar a otra GSI para histórico.

4. Transaction (historial)
- PK = `USER#{UserId}#TX`  
- SK = `{TimestampTicks}#{TxId}`  
    - `TimestampTicks` puede ser ticks o un epoch invertido para ordenar descendente sin usar `ScanIndexForward=false`  
- Atributos: `TxId` (GUID), `Type` (`"Subscribe"` | `"Cancel"`), `FundId`, `FundName`, `Amount`, `TimestampUtc`  
- Acceso típico: últimas transacciones → `Query` por PK, `ScanIndexForward=false`, `Limit=N`

---

#### Accesos clave y validaciones (patrones y recomendaciones)

- Listar fondos:
    - `Query` en GSI1: `GSI1PK="FUND"`; opcional `begins_with(GSI1SK, "Category#...")` para filtrar categoría.

- Obtener saldo:
    - `GetItem` con `PK=USER#{UserId}`, `SK=PROFILE`.

- Suscribir (apertura) — atomicidad recomendada con `TransactWriteItems`:
    1. `GetItem` o `ConditionCheck` en `FUND#{FundId}/METADATA` para validar existencia y leer `MinAmount`.
    2. `ConditionCheck` para asegurar que `SUB#{FundId}` no existe: `attribute_not_exists(PK)` / `attribute_not_exists(SK)`.
    3. `Update` en `USER#{UserId}/PROFILE` con `ConditionExpression Balance >= :min` y `UpdateExpression SET Balance = Balance - :min`.
    4. `Put` del ítem `SUB#{FundId}` (Status = "Active").
    5. `Put` del `TX` (registro de la transacción).
    - Si no se usa transacción, aplicar orden y manejar fallos compensatorios; se recomienda `TransactWriteItems`.

- Cancelar (cierre) — usar `TransactWriteItems` para atomicidad:
    1. `ConditionCheck`/`GetItem` para verificar que `SUB#{FundId}` existe y está `Status="Active"`.
    2. `Update` en `USER#{UserId}/PROFILE` para devolver `Amount`: `SET Balance = Balance + :amount`.
    3. `Delete` del ítem `SUB#{FundId}` (o `Update` cambiando `Status="Cancelled"`).
    4. `Put` del `TX` (registro de cancelación).

- Historial:
    - `Query` por `PK=USER#{UserId}#TX` con `ScanIndexForward=false` y `Limit=N` para últimas N transacciones.

---

<img width="1835" height="560" alt="FundsApp_Model" src="https://github.com/user-attachments/assets/35300cf9-4f5e-404e-bca9-c6ec7f0708fd" /> 


#### Respuesta de la query SQL consultas devuelven los clientes cuyos productos inscritos están disponibles únicamente en las sucursales que ellos visitan.

SELECT c.id, c.nombre, c.apellidos
FROM cliente c
JOIN inscripcion i ON i.idCliente = c.id
JOIN disponibilidad d ON d.idProducto = i.idProducto
LEFT JOIN visitan v
  ON v.idSucursal = d.idSucursal AND v.idCliente = c.id
GROUP BY c.id, c.nombre, c.apellidos
HAVING COUNT(*) = COUNT(v.idSucursal);  -- ninguna sucursal ofertante queda sin ser visitada




# Funds App on AWS — EC2 + DynamoDB + S3/CloudFront

This guide explains how any developer can deploy this app in their own AWS account. It covers the backend (ASP.NET Core), DynamoDB, the frontend (Next.js static export), and CloudFront routing.

## What is provisioned
- EC2 (Amazon Linux 2023) running the API as a systemd service on port 80
- DynamoDB tables: `Funds` and `Transactions` (with GSI `GSI1`)
- S3 bucket for static frontend, fronted by CloudFront (with Origin Access Identity)
- CloudFront behaviors:
  - `/` → S3 static frontend
  - `/api/*` → EC2 Public DNS (HTTPS → CloudFront, HTTP to instance)
- SNS topic (optional) for notifications
- IAM role/profile for EC2 (DynamoDB access, S3 artifact read, SSM)

```
Client ──HTTPS──▶ CloudFront
  ├── /          ──▶ S3 (static frontend)
  └── /api/*     ──▶ EC2 (API on port 80)
                      │
                      └── DynamoDB (Funds, Transactions+GSI1)
```

## Prerequisites
- AWS account with permissions for IAM/EC2/DynamoDB/S3/CloudFront/SNS
- AWS CLI v2 installed and configured (credentials):
  - How to get access keys: AWS Console → IAM → Users → Security credentials → Create access key
  - Configure locally: `aws configure` (or set a named profile and pass `-Profile` to the scripts)
- PowerShell 7+ (pwsh) on Windows
- .NET SDK 9 (for building the API)
- Node.js 18+ and npm (for building the frontend)

## Repository layout
- `API/` — ASP.NET Core Web API (.NET 9)
- `Core/`, `Infrastructure/` — domain and data (DynamoDB repositories, bootstrapper)
- `Client/funds/` — Next.js app (configured with `output: 'export'`)
- `infra/cloudformation.json` — Infrastructure template
- `infra/deploy-stack.ps1` — Deploy/update the stack
- `infra/publish-frontend.ps1` — Build/export frontend, sync to S3, invalidate CloudFront

## 1) Build and package the API
Publish a self-contained Linux x64, single-file build and zip it.

PowerShell (from repo root):

- Publish API, create zip, and show result:
  - Go to `API/`
  - Run: `dotnet publish -c Release -r linux-x64 /p:PublishSingleFile=true /p:IncludeAllContentForSelfExtract=true --self-contained true -o ..\publish\api`
  - Create zip: `Compress-Archive -Force -Path .\publish\api\* -DestinationPath .\publish\funds-api.zip`

Upload the artifact to S3 (in the same region you will deploy, default us-east-1):
- Create bucket if needed: `aws s3 mb s3://your-artifact-bucket-us-east-1 --region us-east-1`
- Upload zip: `aws s3 cp .\publish\funds-api.zip s3://your-artifact-bucket-us-east-1/artifacts/funds-api.zip --region us-east-1`

You will pass `ArtifactBucket=your-artifact-bucket-us-east-1` and `ArtifactKey=artifacts/funds-api.zip` to the stack.

## 2) Pick VPC and Subnet
Use a public subnet so the instance receives a public IP. Find IDs in AWS Console:
- VPC → Your VPCs (copy VPC ID)
- Subnets → pick a public subnet in that VPC (copy Subnet ID)

## 3) Deploy infrastructure (CloudFormation)
The template parameters you need:
- `VpcId` — your VPC ID
- `SubnetId` — your public subnet ID
- `ArtifactBucket` — the S3 bucket containing the API zip
- `ArtifactKey` — the object key to the API zip (e.g., `artifacts/funds-api.zip`)
- Optional: `TopicEmail` — add an email subscriber to the SNS topic

Deploy from repo root:
- `pwsh -NoProfile -File .\infra\deploy-stack.ps1 -StackName FundsAppStack -VpcId vpc-xxxxxxxx -SubnetId subnet-xxxxxxxx -ArtifactBucket your-artifact-bucket-us-east-1 -ArtifactKey artifacts/funds-api.zip -AwsRegion us-east-1 -TopicEmail you@example.com`

Outputs:
- `PublicURL` — EC2 public DNS (HTTP)
- `FrontendBucketName` — S3 bucket for frontend
- `FrontendDomainName` — CloudFront domain for the site

Notes:
- On first run, the API creates/ensures DynamoDB tables and seeds 5 funds. The instance logs are uploaded to `s3://<ArtifactBucket>/logs/<instance-id>/`.

## 4) Publish the frontend (Next.js static export)
The frontend uses relative `/api/*` so CloudFront routes API traffic over HTTPS.

From repo root:
- `pwsh -NoProfile -File .\infra\publish-frontend.ps1 -StackName FundsAppStack -AwsRegion us-east-1`

This builds `Client/funds` as a static export, syncs `out/` to the S3 website bucket, and invalidates CloudFront.

Open: `https://<FrontendDomainName>` (from stack outputs). API via CDN:
- `https://<FrontendDomainName>/api/funds`
- `https://<FrontendDomainName>/api/funds/balance`

## 5) Update flows
Backend:
1) Rebuild and upload a new zip (step 1)
2) Re-run the stack deployment (step 3)

Frontend:
- Re-run the publish script (step 4)

## Troubleshooting
- CloudFront AccessDenied at root: ensure `index.html` exists; re-run publish.
- Mixed content error: do NOT set `NEXT_PUBLIC_API_BASE` to `http://EC2...`. We default to relative base so CloudFront proxies `/api/*` over HTTPS.
- Dynamo AccessDenied or 500 from API: check the EC2 role and Dynamo table existence. Review logs under `s3://<ArtifactBucket>/logs/<instance-id>/`.
- No data: the API seeds on first run. If needed, restart service via SSM Session Manager or redeploy the instance.
- Cache: invalidations are created by the script, but CloudFront still may take a few minutes. Hard refresh the browser.

## Clean up
- Delete the CloudFormation stack (`FundsAppStack`) to remove EC2, DynamoDB, S3 (frontend), CloudFront, IAM, SNS.
- Remove the uploaded API artifact zip if you created a separate artifact bucket.

## Template reference
- `infra/cloudformation.json` parameters: `Environment`, `VpcId`, `SubnetId`, `KeyName` (optional), `InstanceType`, `ArtifactBucket`, `ArtifactKey`, `AwsRegion`, `ImageId` (optional), `TopicEmail` (optional)
- Resources: DynamoDB (Funds, Transactions + GSI1), SNS, EC2 + role/profile + SG, S3 + OAI + CloudFront
- Behaviors: default S3; `/api/*` → EC2 (methods GET/HEAD/OPTIONS/PUT/PATCH/POST/DELETE, cache disabled policy)

For a custom domain and TLS: Provision an ACM certificate in the region required by CloudFront (us-east-1) and set up Route 53 DNS to point your domain to the CloudFront distribution.
