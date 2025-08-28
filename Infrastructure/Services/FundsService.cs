using Core.Entities;
using Infrastructure.Repositories;

namespace Infrastructure.Services;

public interface INotificationSender
{
    Task SendAsync(string destination, string message, string channel); // channel: email|sms
}

public interface IFundsService
{
    Task<decimal> GetBalanceAsync();
    Task<IEnumerable<Fund>> ListFundsAsync();
    Task<string> SubscribeAsync(string fundId, string? notifyChannel = null, string? notifyDestination = null);
    Task<string> CancelAsync(string fundId);
    Task<IReadOnlyList<Transaction>> LatestTransactionsAsync(int count = 10);
}

public class FundsService : IFundsService
{
    private readonly IFundRepository _funds;
    private readonly ITransactionRepository _txRepo;
    private readonly INotificationSender? _notifier;
    private decimal _balance = 500_000m; // initial balance per spec

    public FundsService(IFundRepository funds, ITransactionRepository txRepo, INotificationSender? notifier = null)
    {
        _funds = funds;
        _txRepo = txRepo;
        _notifier = notifier;
    }

    public Task<decimal> GetBalanceAsync() => Task.FromResult(_balance);

    public Task<IEnumerable<Fund>> ListFundsAsync() => _funds.ListAsync();

    public async Task<string> SubscribeAsync(string fundId, string? notifyChannel = null, string? notifyDestination = null)
    {
        var fund = await _funds.GetAsync(fundId) ?? throw new ArgumentException($"Fondo {fundId} no existe");
        if (_balance < fund.MinAmount)
            throw new InvalidOperationException($"No tiene saldo disponible para vincularse al fondo {fund.Name}");

        _balance -= fund.MinAmount;
        var tx = new Transaction
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = TransactionType.Subscribe,
            FundId = fund.Id,
            Amount = fund.MinAmount,
            TimestampUtc = DateTime.UtcNow
        };
        await _txRepo.AddAsync(tx);

        if (_notifier != null && !string.IsNullOrWhiteSpace(notifyChannel) && !string.IsNullOrWhiteSpace(notifyDestination))
            await _notifier.SendAsync(notifyDestination, $"Suscripción exitosa al fondo {fund.Name} por {fund.MinAmount:C0}", notifyChannel);

        return tx.Id;
    }

    public async Task<string> CancelAsync(string fundId)
    {
        var fund = await _funds.GetAsync(fundId) ?? throw new ArgumentException($"Fondo {fundId} no existe");
        _balance += fund.MinAmount; // return linkage value back to client
        var tx = new Transaction
        {
            Id = Guid.NewGuid().ToString("N"),
            Type = TransactionType.Cancel,
            FundId = fund.Id,
            Amount = fund.MinAmount,
            TimestampUtc = DateTime.UtcNow
        };
    await _txRepo.AddAsync(tx);
        return tx.Id;
    }

    public Task<IReadOnlyList<Transaction>> LatestTransactionsAsync(int count = 10) => _txRepo.LatestAsync(count);
}
