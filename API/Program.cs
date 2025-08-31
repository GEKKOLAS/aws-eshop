using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers().AddJsonOptions(o =>
{
    o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
// CORS for local Next.js dev
builder.Services.AddCors(options =>
{
    options.AddPolicy("LocalDev", policy =>
        policy.WithOrigins(
                  "http://localhost:3000",
                  "https://localhost:3000",
                  "http://localhost:3001",
                  "https://localhost:3001"
              )
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// App services and AWS deps
var awsRegion = builder.Configuration["AWS:Region"] ?? "us-east-1";
var ddbConfig = new Amazon.DynamoDBv2.AmazonDynamoDBConfig
{
    RegionEndpoint = Amazon.RegionEndpoint.GetBySystemName(awsRegion)
};
builder.Services.AddSingleton<Amazon.DynamoDBv2.IAmazonDynamoDB>(_ => new Amazon.DynamoDBv2.AmazonDynamoDBClient(ddbConfig));
builder.Services.AddSingleton(typeof(Amazon.SimpleNotificationService.IAmazonSimpleNotificationService), (sp) => new Amazon.SimpleNotificationService.AmazonSimpleNotificationServiceClient(Amazon.RegionEndpoint.GetBySystemName(awsRegion)));
builder.Services.AddSingleton(typeof(Amazon.SimpleEmail.IAmazonSimpleEmailService), (sp) => new Amazon.SimpleEmail.AmazonSimpleEmailServiceClient(Amazon.RegionEndpoint.GetBySystemName(awsRegion)));
// Repositories: default to DynamoDB in production, allow in-memory via config
var useInMemoryFunds = builder.Configuration.GetValue("UseInMemoryFunds", false);
if (useInMemoryFunds)
    builder.Services.AddSingleton<Infrastructure.Repositories.IFundRepository, Infrastructure.Repositories.InMemoryFundRepository>();
else
    builder.Services.AddSingleton<Infrastructure.Repositories.IFundRepository, Infrastructure.Repositories.DynamoFundRepository>();

var useInMemory = builder.Configuration.GetValue("UseInMemoryTransactions", false);
if (useInMemory)
{
    builder.Services.AddSingleton<Infrastructure.Repositories.ITransactionRepository, Infrastructure.Repositories.InMemoryTransactionRepository>();
}
else
{
    builder.Services.AddSingleton<Infrastructure.Repositories.ITransactionRepository, Infrastructure.Repositories.DynamoTransactionRepository>();
}
// notification sender (optional; enabled with Notifications:Enabled)
var notificationsEnabled = builder.Configuration.GetValue("Notifications:Enabled", false);
var provider = builder.Configuration["Notifications:Provider"]?.ToLowerInvariant() ?? "sns";
if (notificationsEnabled)
{
    if (provider == "ses")
        builder.Services.AddSingleton<Infrastructure.Services.INotificationSender, Infrastructure.Services.SESEmailSender>();
    else
        builder.Services.AddSingleton<Infrastructure.Services.INotificationSender, Infrastructure.Services.SNSNotificationSender>();
}
builder.Services.AddSingleton<Infrastructure.Services.IFundsService, Infrastructure.Services.FundsService>();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

// Global exception handling
app.UseMiddleware<API.Middlewares.ExceptionHandlingMiddleware>();

app.UseCors("LocalDev");

app.UseAuthorization();

app.MapControllers();

// Ensure DynamoDB tables and seed on startup (best-effort)
try
{
    var ddb = app.Services.GetRequiredService<Amazon.DynamoDBv2.IAmazonDynamoDB>();
    await Infrastructure.Startup.DynamoBootstrapper.EnsureTablesAndSeedAsync(ddb);
}
catch (Exception ex)
{
    Console.WriteLine($"Dynamo bootstrap skipped: {ex.Message}");
}

app.Run();
