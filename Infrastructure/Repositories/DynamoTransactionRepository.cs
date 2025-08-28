using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using Amazon.DynamoDBv2.DocumentModel;
using Core.Entities;

namespace Infrastructure.Repositories;

[DynamoDBTable("Transactions")]
public class TransactionRecord
{
    [DynamoDBHashKey]
    public string Id { get; set; } = default!;
    [DynamoDBGlobalSecondaryIndexHashKey("GSI1")]
    public string Gsi1Pk { get; set; } = "TX";
    [DynamoDBGlobalSecondaryIndexRangeKey("GSI1")]
    public long SortTs { get; set; }
    public string FundId { get; set; } = default!;
    public string Type { get; set; } = default!; // Subscribe|Cancel
    public decimal Amount { get; set; }
}

public class DynamoTransactionRepository : ITransactionRepository
{
    private readonly IAmazonDynamoDB _ddb;
    private readonly DynamoDBContext _ctx;
    public DynamoTransactionRepository(IAmazonDynamoDB ddb)
    {
        _ddb = ddb;
        _ctx = new DynamoDBContext(ddb);
    }

    public async Task AddAsync(Transaction tx)
    {
        var rec = new TransactionRecord
        {
            Id = tx.Id,
            FundId = tx.FundId,
            Type = tx.Type.ToString(),
            Amount = tx.Amount,
            SortTs = new DateTimeOffset(tx.TimestampUtc).ToUnixTimeMilliseconds(),
            Gsi1Pk = "TX"
        };
        await _ctx.SaveAsync(rec);
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
}
