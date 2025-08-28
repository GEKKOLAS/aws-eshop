using Core.Entities;
using Infrastructure.Services;
using Microsoft.AspNetCore.Mvc;

namespace API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FundsController : ControllerBase
{
    private readonly IFundsService _service;
    public FundsController(IFundsService service) => _service = service;

    [HttpGet("balance")]
    public async Task<ActionResult<decimal>> GetBalance() => Ok(await _service.GetBalanceAsync());

    [HttpGet]
    public async Task<ActionResult<IEnumerable<Fund>>> GetFunds() => Ok(await _service.ListFundsAsync());

    public record SubscribeRequest(string FundId, string? NotifyChannel, string? NotifyDestination);

    [HttpPost("subscribe")]
    public async Task<ActionResult<object>> Subscribe([FromBody] SubscribeRequest req)
    {
        try
        {
            var id = await _service.SubscribeAsync(req.FundId, req.NotifyChannel, req.NotifyDestination);
            return Ok(new { transactionId = id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    public record CancelRequest(string FundId);

    [HttpPost("cancel")]
    public async Task<ActionResult<object>> Cancel([FromBody] CancelRequest req)
    {
        try
        {
            var id = await _service.CancelAsync(req.FundId);
            return Ok(new { transactionId = id });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<IEnumerable<Transaction>>> Latest([FromQuery] int count = 10)
        => Ok(await _service.LatestTransactionsAsync(count));
}
