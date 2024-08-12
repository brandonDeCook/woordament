using Api.Game;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.Azure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Text.Json.Serialization;

var host = new HostBuilder()
    .ConfigureFunctionsWebApplication()
    .ConfigureServices((context, services) =>
    {
        services.AddApplicationInsightsTelemetryWorkerService();
        services.ConfigureFunctionsApplicationInsights();
        services.AddControllers()
            .AddJsonOptions(options => options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()));
        services.AddAzureClients(azureBuilder =>
        {
            azureBuilder.AddBlobServiceClient(context.Configuration["DataStorageAccount"]);
        });
        services.AddMemoryCache();
        services.AddSingleton<BoardManager>();
        services.AddSingleton<GameManager>();
    })
    .Build();

await host.RunAsync();