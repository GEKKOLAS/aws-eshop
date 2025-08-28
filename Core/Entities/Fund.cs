namespace Core.Entities;

public class Fund
{
    public string Id { get; set; } = default!; // e.g., FIC-01
    public string Name { get; set; } = default!;
    public decimal MinAmount { get; set; }
    public string? Category { get; set; }
}
