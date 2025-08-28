using Amazon.SimpleNotificationService;
using Amazon.SimpleNotificationService.Model;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Services;

public class SNSNotificationSender : INotificationSender
{
    private readonly IAmazonSimpleNotificationService _sns;
    private readonly string? _topicArn;
    public SNSNotificationSender(IAmazonSimpleNotificationService sns, IConfiguration config)
    {
        _sns = sns;
        _topicArn = config["Notifications:TopicArn"]; // optional pre-created topic
    }

    public async Task SendAsync(string destination, string message, string channel)
    {
        // SMS: se puede publicar directo a número E.164 sin topic
        if (channel.Equals("sms", StringComparison.OrdinalIgnoreCase))
        {
            var req = new PublishRequest
            {
                Message = message,
                PhoneNumber = destination, // e.g., +573001234567 (E.164)
                MessageAttributes = new Dictionary<string, MessageAttributeValue>
                {
                    ["AWS.SNS.SMS.SMSType"] = new MessageAttributeValue { DataType = "String", StringValue = "Transactional" }
                }
            };
            await _sns.PublishAsync(req);
            return;
        }

        // Email: SNS requiere un Topic con suscripción de email confirmada
        if (channel.Equals("email", StringComparison.OrdinalIgnoreCase))
        {
            if (string.IsNullOrWhiteSpace(_topicArn))
                throw new InvalidOperationException("Email requiere Notifications:TopicArn con suscripción de correo confirmada en SNS.");

            await _sns.PublishAsync(new PublishRequest
            {
                TopicArn = _topicArn,
                Message = message,
                Subject = "Notificación de fondos",
            });
            return;
        }

        throw new ArgumentException($"Canal de notificación no soportado: {channel}");
    }
}
