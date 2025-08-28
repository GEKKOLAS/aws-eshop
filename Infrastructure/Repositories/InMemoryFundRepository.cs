using Core.Entities;

namespace Infrastructure.Repositories;

public class InMemoryFundRepository : IFundRepository
{
    private static readonly List<Fund> Funds =
    [
    new() { Id = "1", Name = "FPV_EL CLIENTE_RECAUDADORA", MinAmount = 75_000m, Category = "FPV" },
    new() { Id = "2", Name = "FPV_EL CLIENTE_ECOPETROL", MinAmount = 125_000m, Category = "FPV" },
    new() { Id = "3", Name = "DEUDAPRIVADA", MinAmount = 50_000m, Category = "FIC" },
    new() { Id = "4", Name = "FDO-ACCIONES", MinAmount = 250_000m, Category = "FIC" },
    new() { Id = "5", Name = "FPV_EL CLIENTE_DINAMICA", MinAmount = 100_000m, Category = "FPV" }
    ];

    public Task<Fund?> GetAsync(string id) => Task.FromResult(Funds.FirstOrDefault(f => f.Id == id));

    public Task<IEnumerable<Fund>> ListAsync() => Task.FromResult<IEnumerable<Fund>>(Funds);
}
