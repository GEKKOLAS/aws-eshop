using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Core.Entities;

namespace Infrastructure.Startup;

public static class DynamoBootstrapper
{
    // Creates tables if missing and seeds funds
    public static async Task EnsureTablesAndSeedAsync(IAmazonDynamoDB ddb)
    {
        // Funds table (PK: Id)
        if (!await TableExists(ddb, "Funds"))
        {
            await ddb.CreateTableAsync(new CreateTableRequest
            {
                TableName = "Funds",
                AttributeDefinitions = new List<AttributeDefinition>
                {
                    new("Id", ScalarAttributeType.S)
                },
                KeySchema = new List<KeySchemaElement>
                {
                    new("Id", KeyType.HASH)
                },
                BillingMode = BillingMode.PAY_PER_REQUEST
            });
            await ddb.WaitForTableActiveAsync("Funds");
        }

        // Transactions table (PK: Id) with GSI1 (Gsi1Pk HASH, SortTs RANGE)
        if (!await TableExists(ddb, "Transactions"))
        {
            await ddb.CreateTableAsync(new CreateTableRequest
            {
                TableName = "Transactions",
                AttributeDefinitions = new List<AttributeDefinition>
                {
                    new("Id", ScalarAttributeType.S),
                    new("Gsi1Pk", ScalarAttributeType.S),
                    new("SortTs", ScalarAttributeType.N)
                },
                KeySchema = new List<KeySchemaElement>
                {
                    new("Id", KeyType.HASH)
                },
                GlobalSecondaryIndexes = new List<GlobalSecondaryIndex>
                {
                    new()
                    {
                        IndexName = "GSI1",
                        KeySchema = new List<KeySchemaElement>
                        {
                            new("Gsi1Pk", KeyType.HASH),
                            new("SortTs", KeyType.RANGE)
                        },
                        Projection = new Projection { ProjectionType = ProjectionType.ALL },
                        ProvisionedThroughput = null
                    }
                },
                BillingMode = BillingMode.PAY_PER_REQUEST
            });
            await ddb.WaitForTableActiveAsync("Transactions");
        }

        await SeedFundsAsync(ddb);
    }

    private static async Task<bool> TableExists(IAmazonDynamoDB ddb, string table)
    {
        try
        {
            var resp = await ddb.DescribeTableAsync(table);
            return resp.Table.TableStatus == TableStatus.ACTIVE;
        }
        catch (ResourceNotFoundException)
        {
            return false;
        }
    }

    private static async Task SeedFundsAsync(IAmazonDynamoDB ddb)
    {
        var list = await ddb.ScanAsync(new ScanRequest
        {
            TableName = "Funds",
            Limit = 1
        });
        if (list.Count > 0) return; // already seeded

        var items = new List<Dictionary<string, AttributeValue>>
        {
            new() { ["Id"] = new("1"), ["Name"] = new("FPV_EL CLIENTE_RECAUDADORA"), ["MinAmount"] = new AttributeValue { N = "75000" }, ["Category"] = new("FPV") },
            new() { ["Id"] = new("2"), ["Name"] = new("FPV_EL CLIENTE_ECOPETROL"), ["MinAmount"] = new AttributeValue { N = "125000" }, ["Category"] = new("FPV") },
            new() { ["Id"] = new("3"), ["Name"] = new("DEUDAPRIVADA"), ["MinAmount"] = new AttributeValue { N = "50000" }, ["Category"] = new("FIC") },
            new() { ["Id"] = new("4"), ["Name"] = new("FDO-ACCIONES"), ["MinAmount"] = new AttributeValue { N = "250000" }, ["Category"] = new("FIC") },
            new() { ["Id"] = new("5"), ["Name"] = new("FPV_EL CLIENTE_DINAMICA"), ["MinAmount"] = new AttributeValue { N = "100000" }, ["Category"] = new("FPV") },
        };

        foreach (var item in items)
        {
            await ddb.PutItemAsync("Funds", item);
        }
    }
}

internal static class DynamoWaitExtensions
{
    public static async Task WaitForTableActiveAsync(this IAmazonDynamoDB ddb, string tableName, int pollSeconds = 5, int maxAttempts = 60)
    {
        for (var i = 0; i < maxAttempts; i++)
        {
            try
            {
                var resp = await ddb.DescribeTableAsync(tableName);
                if (resp.Table.TableStatus == TableStatus.ACTIVE) return;
            }
            catch (ResourceNotFoundException)
            {
                // ignore while creating
            }
            await Task.Delay(TimeSpan.FromSeconds(pollSeconds));
        }
        throw new TimeoutException($"Timeout esperando la tabla {tableName} ACTIVE");
    }
}
