namespace Core.Entities;

public enum TransactionType
{
    Subscribe,
    Cancel
}

public class Transaction
{
    public string Id { get; set; } = default!; // unique identifier
    public TransactionType Type { get; set; }
    public string FundId { get; set; } = default!;
    public decimal Amount { get; set; }
    public DateTime TimestampUtc { get; set; }
}
