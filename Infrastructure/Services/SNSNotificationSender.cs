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

            // Intenta asegurar que el correo destino esté suscrito al tópico
            bool confirmedForDestination = false;
            try
            {
                var list = await _sns.ListSubscriptionsByTopicAsync(new ListSubscriptionsByTopicRequest
                {
                    TopicArn = _topicArn
                });
                var existing = list.Subscriptions.FirstOrDefault(s =>
                    s.Protocol.Equals("email", StringComparison.OrdinalIgnoreCase) &&
                    string.Equals(s.Endpoint, destination, StringComparison.OrdinalIgnoreCase));

                // Re-enviar confirmación si no existe o si sigue en PendingConfirmation
                if (existing == null || string.Equals(existing.SubscriptionArn, "PendingConfirmation", StringComparison.OrdinalIgnoreCase))
                {
                    await _sns.SubscribeAsync(new SubscribeRequest
                    {
                        TopicArn = _topicArn,
                        Protocol = "email",
                        Endpoint = destination,
                        ReturnSubscriptionArn = false
                    });
                    // Aún no confirmado; no publicar para evitar enviar a otros suscriptores
                    confirmedForDestination = false;
                }
                else
                {
                    confirmedForDestination = true;
                }

                // Asegura políticas de filtro por suscripción (solo recibe si 'to' coincide con su endpoint)
                foreach (var sub in list.Subscriptions)
                {
                    if (!sub.Protocol.Equals("email", StringComparison.OrdinalIgnoreCase)) continue;
                    if (string.Equals(sub.SubscriptionArn, "PendingConfirmation", StringComparison.OrdinalIgnoreCase)) continue;
                    try
                    {
                        var filter = $"{{\"to\":[\"{sub.Endpoint}\"]}}";
                        await _sns.SetSubscriptionAttributesAsync(new SetSubscriptionAttributesRequest
                        {
                            SubscriptionArn = sub.SubscriptionArn,
                            AttributeName = "FilterPolicy",
                            AttributeValue = filter
                        });
                    }
                    catch { /* best-effort */ }
                }
            }
            catch
            {
                // No bloquear la operación de negocio por fallos no críticos en la suscripción.
            }

            if (confirmedForDestination)
            {
                await _sns.PublishAsync(new PublishRequest
                {
                    TopicArn = _topicArn,
                    Message = message,
                    Subject = "Notificación de fondos",
                    MessageAttributes = new Dictionary<string, MessageAttributeValue>
                    {
                        ["to"] = new MessageAttributeValue { DataType = "String", StringValue = destination }
                    }
                });
            }
            // Si no está confirmado, ya reenviamos confirmación y salimos sin publicar
            return;
        }

        throw new ArgumentException($"Canal de notificación no soportado: {channel}");
    }
}
