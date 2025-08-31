using Core.Entities;

namespace Infrastructure.Repositories;

public interface ITransactionRepository
{
    Task AddAsync(Transaction tx);
    Task<IReadOnlyList<Transaction>> LatestAsync(int count = 10);
    Task<IReadOnlyList<Transaction>> GetAllAsync();
}
