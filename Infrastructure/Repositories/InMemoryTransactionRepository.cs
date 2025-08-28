using Core.Entities;
using System.Collections.Concurrent;

namespace Infrastructure.Repositories;

public class InMemoryTransactionRepository : ITransactionRepository
{
    private readonly ConcurrentBag<Transaction> _items = new();

    public Task AddAsync(Transaction tx)
    {
        _items.Add(tx);
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<Transaction>> LatestAsync(int count = 10)
    {
        var list = _items
            .OrderByDescending(t => t.TimestampUtc)
            .Take(count)
            .ToList()
            .AsReadOnly();

        return Task.FromResult((IReadOnlyList<Transaction>)list);
    }
}
