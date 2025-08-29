using Core.Entities;
using Infrastructure.Repositories;
using Infrastructure.Services;
using Moq;
using Xunit;

namespace FundsService.Tests;

public class FundsServiceTests
{
	private static (FundsService svc, Mock<IFundRepository> funds, Mock<ITransactionRepository> txRepo, Mock<INotificationSender> notifier)
		CreateSut(decimal initialBalance = 500_000m)
	{
		var funds = new Mock<IFundRepository>(MockBehavior.Strict);
		var txRepo = new Mock<ITransactionRepository>(MockBehavior.Strict);
		var notifier = new Mock<INotificationSender>(MockBehavior.Strict);

		// We can't inject balance directly; it's internal field defaulting to 500_000.
		// For tests that need other balance values, we simulate via fund.MinAmount.

		var svc = new Infrastructure.Services.FundsService(funds.Object, txRepo.Object, notifier.Object);
		return (svc, funds, txRepo, notifier);
	}

	[Fact]
	public async Task GetBalance_Returns_DefaultInitialBalance()
	{
		var (svc, _, _, _) = CreateSut();
		var balance = await svc.GetBalanceAsync();
		Assert.Equal(500_000m, balance);
	}

	[Fact]
	public async Task ListFunds_Delegates_To_Repository()
	{
		var (svc, funds, _, _) = CreateSut();
		var list = new[] { new Fund { Id = "F1", Name = "Fondo 1", MinAmount = 100_000m } } as IEnumerable<Fund>;
		funds.Setup(f => f.ListAsync()).ReturnsAsync(list);

		var result = await svc.ListFundsAsync();
		Assert.Same(list, result);
		funds.VerifyAll();
	}

	[Fact]
	public async Task Subscribe_Decreases_Balance_And_Adds_Transaction_And_Notifies()
	{
		var (svc, funds, txRepo, notifier) = CreateSut();
		var fund = new Fund { Id = "F1", Name = "Fondo 1", MinAmount = 100_000m };
		funds.Setup(f => f.GetAsync("F1")).ReturnsAsync(fund);
		txRepo.Setup(r => r.AddAsync(It.Is<Transaction>(t => t.Type == TransactionType.Subscribe && t.FundId == "F1")))
			  .Returns(Task.CompletedTask);
		notifier.Setup(n => n.SendAsync("dest@ex.com", It.Is<string>(m => m.Contains("Fondo 1")), "email"))
				.Returns(Task.CompletedTask);

		var txId = await svc.SubscribeAsync("F1", notifyChannel: "email", notifyDestination: "dest@ex.com");

		Assert.False(string.IsNullOrWhiteSpace(txId));
		var balance = await svc.GetBalanceAsync();
		Assert.Equal(400_000m, balance);
		funds.VerifyAll();
		txRepo.VerifyAll();
		notifier.VerifyAll();
	}

	[Fact]
	public async Task Subscribe_Throws_When_Fund_NotFound()
	{
		var (svc, funds, _, _) = CreateSut();
		funds.Setup(f => f.GetAsync("X")).ReturnsAsync((Fund?)null);

		var ex = await Assert.ThrowsAsync<ArgumentException>(() => svc.SubscribeAsync("X"));
		Assert.Contains("no existe", ex.Message, StringComparison.InvariantCultureIgnoreCase);
		funds.VerifyAll();
	}

	[Fact]
	public async Task Subscribe_Throws_When_Insufficient_Balance()
	{
		var (svc, funds, _, _) = CreateSut();
		var fund = new Fund { Id = "F2", Name = "Caro", MinAmount = 600_000m };
		funds.Setup(f => f.GetAsync("F2")).ReturnsAsync(fund);

		var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.SubscribeAsync("F2"));
		Assert.Contains("saldo", ex.Message, StringComparison.InvariantCultureIgnoreCase);
		funds.VerifyAll();
	}

	[Fact]
	public async Task Cancel_Increases_Balance_And_Adds_Transaction()
	{
		var (svc, funds, txRepo, _) = CreateSut();
		var fund = new Fund { Id = "F1", Name = "Fondo 1", MinAmount = 100_000m };
		funds.Setup(f => f.GetAsync("F1")).ReturnsAsync(fund);
		txRepo.Setup(r => r.LatestAsync(1000)).ReturnsAsync(new List<Transaction> {
			new() { Id = "s1", Type = TransactionType.Subscribe, FundId = "F1", Amount = 100_000m, TimestampUtc = DateTime.UtcNow }
		});
		txRepo.Setup(r => r.AddAsync(It.Is<Transaction>(t => t.Type == TransactionType.Cancel && t.FundId == "F1")))
			  .Returns(Task.CompletedTask);

		var txId = await svc.CancelAsync("F1");
		Assert.False(string.IsNullOrWhiteSpace(txId));

		var balance = await svc.GetBalanceAsync();
		Assert.Equal(600_000m, balance);
		funds.VerifyAll();
		txRepo.VerifyAll();
	}

	[Fact]
	public async Task Cancel_Throws_When_No_Active_Subscription()
	{
		var (svc, funds, txRepo, _) = CreateSut();
		var fund = new Fund { Id = "F1", Name = "Fondo 1", MinAmount = 100_000m };
		funds.Setup(f => f.GetAsync("F1")).ReturnsAsync(fund);
		txRepo.Setup(r => r.LatestAsync(1000)).ReturnsAsync(new List<Transaction> {
			// equal subscribe/cancel or none
			new() { Id = "c1", Type = TransactionType.Cancel, FundId = "F1", Amount = 100_000m, TimestampUtc = DateTime.UtcNow }
		});

		var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => svc.CancelAsync("F1"));
		Assert.Contains("No tiene suscripción activa", ex.Message, StringComparison.InvariantCultureIgnoreCase);
		funds.VerifyAll();
		txRepo.VerifyAll();
	}

	[Fact]
	public async Task LatestTransactions_Delegates_To_Repository()
	{
		var (svc, _, txRepo, _) = CreateSut();
		var txs = new List<Transaction> { new() { Id = "1", Type = TransactionType.Subscribe, FundId = "F1", Amount = 1, TimestampUtc = DateTime.UtcNow } };
		txRepo.Setup(r => r.LatestAsync(5)).ReturnsAsync(txs);

		var result = await svc.LatestTransactionsAsync(5);
		Assert.Same(txs, result);
		txRepo.VerifyAll();
	}
}
