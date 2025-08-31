using Amazon.SimpleEmail;
using Amazon.SimpleEmail.Model;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services;

public class SESEmailSender : INotificationSender
{
    private readonly IAmazonSimpleEmailService _ses;
    private readonly string _from;
    public SESEmailSender(IAmazonSimpleEmailService ses, IConfiguration config)
    {
        _ses = ses;
        _from = config["Notifications:FromEmail"] ?? throw new InvalidOperationException("Notifications:FromEmail requerido para SES.");
    }

    public async Task SendAsync(string destination, string message, string channel)
    {
        if (!channel.Equals("email", StringComparison.OrdinalIgnoreCase))
            throw new ArgumentException("SESEmailSender solo soporta canal 'email'.");

        var req = new SendEmailRequest
        {
            Source = _from,
            Destination = new Destination { ToAddresses = new List<string> { destination } },
            Message = new Message
            {
                Subject = new Content("Notificación de fondos"),
                Body = new Body { Text = new Content(message) }
            }
        };
        try
        {
            await _ses.SendEmailAsync(req);
        }
        catch (Exception ex)
        {
            // No bloquear la operación de negocio por fallos de SES; registrar y continuar
            Console.WriteLine($"SES send failed: {ex.Message}");
        }
    }
}
