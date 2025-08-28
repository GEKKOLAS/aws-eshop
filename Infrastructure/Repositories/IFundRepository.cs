using Core.Entities;

namespace Infrastructure.Repositories;

public interface IFundRepository
{
    Task<Fund?> GetAsync(string id);
    Task<IEnumerable<Fund>> ListAsync();
}
