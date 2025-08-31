using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Core.Entities;

namespace Infrastructure.Repositories;

public class DynamoFundRepository : IFundRepository
{
    private readonly IAmazonDynamoDB _ddb;
    public DynamoFundRepository(IAmazonDynamoDB ddb)
    {
    _ddb = ddb;
    }

    public async Task<Fund?> GetAsync(string id)
    {
        var resp = await _ddb.GetItemAsync(new GetItemRequest
        {
            TableName = "Funds",
            Key = new Dictionary<string, AttributeValue> { ["Id"] = new AttributeValue { S = id } }
        });
        if (resp.Item == null || resp.Item.Count == 0) return null;
        var i = resp.Item;
        return new Fund
        {
            Id = i["Id"].S,
            Name = i.ContainsKey("Name") ? i["Name"].S : string.Empty,
            MinAmount = i.ContainsKey("MinAmount") && decimal.TryParse(i["MinAmount"].N, out var m) ? m : 0m,
            Category = i.ContainsKey("Category") ? i["Category"].S : null
        };
    }

    public async Task<IEnumerable<Fund>> ListAsync()
    {
        var resp = await _ddb.ScanAsync(new ScanRequest { TableName = "Funds" });
        var list = resp.Items.Select(i => new Fund
        {
            Id = i["Id"].S,
            Name = i.ContainsKey("Name") ? i["Name"].S : string.Empty,
            MinAmount = i.ContainsKey("MinAmount") && decimal.TryParse(i["MinAmount"].N, out var m) ? m : 0m,
            Category = i.ContainsKey("Category") ? i["Category"].S : null
        }).ToList();
        return list;
    }
}
