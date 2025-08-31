using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Core.Entities;

namespace Infrastructure.Repositories;

public class DynamoTransactionRepository : ITransactionRepository
{
    private readonly IAmazonDynamoDB _ddb;
    public DynamoTransactionRepository(IAmazonDynamoDB ddb) => _ddb = ddb;

    public async Task AddAsync(Transaction tx)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            ["Id"] = new AttributeValue { S = tx.Id },
            ["FundId"] = new AttributeValue { S = tx.FundId },
            ["Type"] = new AttributeValue { S = tx.Type.ToString() },
            ["Amount"] = new AttributeValue { N = tx.Amount.ToString(System.Globalization.CultureInfo.InvariantCulture) },
            ["SortTs"] = new AttributeValue { N = new DateTimeOffset(tx.TimestampUtc).ToUnixTimeMilliseconds().ToString() },
            ["Gsi1Pk"] = new AttributeValue { S = "TX" }
        };
        await _ddb.PutItemAsync(new PutItemRequest("Transactions", item));
    }

    public async Task<IReadOnlyList<Transaction>> LatestAsync(int count = 10)
    {
        var request = new Amazon.DynamoDBv2.Model.QueryRequest
        {
            TableName = "Transactions",
            IndexName = "GSI1",
            KeyConditionExpression = "Gsi1Pk = :pk",
            ExpressionAttributeValues = new Dictionary<string, Amazon.DynamoDBv2.Model.AttributeValue>
            {
                [":pk"] = new() { S = "TX" }
            },
            ScanIndexForward = false, // descending by SortTs
            Limit = count
        };

        var resp = await _ddb.QueryAsync(request);
        var items = resp.Items.Select(d => new Transaction
        {
            Id = d["Id"].S,
            FundId = d["FundId"].S,
            Type = Enum.TryParse<TransactionType>(d["Type"].S, out var t) ? t : TransactionType.Subscribe,
            Amount = decimal.TryParse(d["Amount"].N, out var amt) ? amt : 0m,
            TimestampUtc = DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(d["SortTs"].N)).UtcDateTime
        }).ToList();
        return items;
    }

    public async Task<IReadOnlyList<Transaction>> GetAllAsync()
    {
        // For simplicity perform a Scan; for production, consider paginated queries on GSI1
        var scan = await _ddb.ScanAsync(new Amazon.DynamoDBv2.Model.ScanRequest
        {
            TableName = "Transactions"
        });
        var items = scan.Items.Select(d => new Transaction
        {
            Id = d["Id"].S,
            FundId = d["FundId"].S,
            Type = Enum.TryParse<TransactionType>(d["Type"].S, out var t) ? t : TransactionType.Subscribe,
            Amount = decimal.TryParse(d["Amount"].N, out var amt) ? amt : 0m,
            TimestampUtc = DateTimeOffset.FromUnixTimeMilliseconds(long.Parse(d["SortTs"].N)).UtcDateTime
        })
        .OrderBy(t => t.TimestampUtc)
        .ToList();
        return items;
    }
}
