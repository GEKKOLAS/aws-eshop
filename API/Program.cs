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
builder.Services.AddSingleton<Infrastructure.Repositories.IFundRepository, Infrastructure.Repositories.InMemoryFundRepository>();

var useInMemory = builder.Configuration.GetValue("UseInMemoryTransactions", true);
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
if (notificationsEnabled)
{
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
app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
