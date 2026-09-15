import { SnippetDefinition } from '../extensionTypes'

export const dotnetSnippets: SnippetDefinition[] = [
  // --- Modern C# & .NET 8 / 9 Core ---
  {
    label: 'program-top-level',
    detail: 'C# / .NET: Top-Level WebApplication Bootstrap',
    documentation: 'Bootstrap an ASP.NET Core .NET 8/9 application using top-level statements',
    insertText: 'var builder = WebApplication.CreateBuilder(args);\n\n// Register services with DI container\nbuilder.Services.AddEndpointsApiExplorer();\nbuilder.Services.AddSwaggerGen();\n\nvar app = builder.Build();\n\nif (app.Environment.IsDevelopment())\n{\n    app.UseSwagger();\n    app.UseSwaggerUI();\n}\n\napp.UseHttpsRedirection();\n\napp.MapGet("/api/health", () => Results.Ok(new { status = "Healthy", engine = "IndoctrinatedEdit .NET Runtime" }))\n   .WithName("GetHealth")\n   .WithOpenApi();\n\napp.Run();\n',
  },
  {
    label: 'primary-ctor',
    detail: 'C# 12+: Primary Constructor Service & DI',
    documentation: 'Class definition using modern C# 12 primary constructors for dependency injection',
    insertText: 'namespace Indoctrinated.Services;\n\npublic class ${1:OrderService}(\n    ILogger<${1:OrderService}> logger,\n    IConfiguration configuration)\n{\n    public async Task<string> ProcessOrderAsync(string orderId, CancellationToken ct = default)\n    {\n        logger.LogInformation("Processing order {OrderId}", orderId);\n        await Task.Delay(100, ct);\n        return $"Processed order {orderId}";\n    }\n}\n$0',
  },
  {
    label: 'record-class',
    detail: 'C# Positional Record with Immutable Semantics',
    documentation: 'Positional record with non-destructive mutation and value equality',
    insertText: 'namespace Indoctrinated.Models;\n\npublic record class ${1:UserDto}(\n    Guid Id,\n    string Username,\n    string Email,\n    IReadOnlyList<string> Roles\n);\n$0',
  },
  {
    label: 'pattern-matching',
    detail: 'C#: Switch Expression & Property Patterns',
    documentation: 'Exhaustive pattern matching with relational, type, and property patterns',
    insertText: 'public static string ${1:EvaluateMetric}(object input) => input switch\n{\n    int n when n > 100 => $"High integer value: {n}",\n    int n => $"Standard integer: {n}",\n    string s when !string.IsNullOrWhiteSpace(s) => $"Non-empty string: {s}",\n    { } nonNull => $"Generic non-null object: {nonNull.GetType().Name}",\n    null => "Null input supplied",\n};\n$0',
  },
  {
    label: 'async-enumerable',
    detail: 'C#: IAsyncEnumerable<T> Streaming Yield',
    documentation: 'Asynchronous streaming generator with CancellationToken cancellation',
    insertText: 'using System.Runtime.CompilerServices;\n\npublic static async IAsyncEnumerable<int> ${1:GenerateStreamAsync}(\n    int count,\n    [EnumeratorCancellation] CancellationToken ct = default)\n{\n    for (int i = 0; i < count; i++)\n    {\n        ct.ThrowIfCancellationRequested();\n        await Task.Delay(50, ct);\n        yield return i * 2;\n    }\n}\n$0',
  },

  // --- ASP.NET Core & Web APIs ---
  {
    label: 'minimal-api',
    detail: 'ASP.NET Core: TypedResults Minimal API Group',
    documentation: 'MapGroup endpoint collection with TypedResults response types',
    insertText: 'public static class ${1:ProductEndpoints}\n{\n    public static RouteGroupBuilder MapProductEndpoints(this RouteGroupBuilder group)\n    {\n        group.MapGet("/", async (CancellationToken ct) =>\n        {\n            var products = new[] { new { Id = 1, Name = "Liquid Glass Shader" } };\n            return TypedResults.Ok(products);\n        });\n\n        group.MapPost("/", async (${2:ProductDto} dto, CancellationToken ct) =>\n        {\n            return TypedResults.Created($"/api/products/{dto.Id}", dto);\n        });\n\n        return group;\n    }\n}\n$0',
  },
  {
    label: 'controller-api',
    detail: 'ASP.NET Core: ApiController with Async Actions',
    documentation: 'Standard MVC/WebAPI Controller with ActionResult and dependency injection',
    insertText: 'using Microsoft.AspNetCore.Mvc;\n\nnamespace Indoctrinated.Controllers;\n\n[ApiController]\n[Route("api/v1/[controller]")]\npublic class ${1:AssetsController}(ILogger<${1:AssetsController}> logger) : ControllerBase\n{\n    [HttpGet]\n    public IActionResult GetAll()\n    {\n        logger.LogInformation("Retrieving assets");\n        return Ok(new[] { "Asset1", "Asset2" });\n    }\n\n    [HttpGet("{id:guid}")]\n    public IActionResult GetById(Guid id)\n    {\n        return Ok(new { Id = id, Name = "Specular Accent" });\n    }\n}\n$0',
  },
  {
    label: 'middleware',
    detail: 'ASP.NET Core: Custom Performance / Logging Middleware',
    documentation: 'Request delegate middleware with timing and error interception',
    insertText: 'namespace Indoctrinated.Middleware;\n\npublic class ${1:RequestLoggingMiddleware}(\n    RequestDelegate next,\n    ILogger<${1:RequestLoggingMiddleware}> logger)\n{\n    public async Task InvokeAsync(HttpContext context)\n    {\n        var sw = System.Diagnostics.Stopwatch.StartNew();\n        await next(context);\n        sw.Stop();\n\n        logger.LogInformation(\n            "HTTP {Method} {Path} responded {StatusCode} in {Elapsed}ms",\n            context.Request.Method,\n            context.Request.Path,\n            context.Response.StatusCode,\n            sw.ElapsedMilliseconds);\n    }\n}\n$0',
  },

  // --- Entity Framework Core & Data ---
  {
    label: 'efcore-dbcontext',
    detail: 'EF Core: DbContext with Fluent Model Configuration',
    documentation: 'Entity Framework Core Database Context with DbSet and OnModelCreating overrides',
    insertText: 'using Microsoft.EntityFrameworkCore;\n\nnamespace Indoctrinated.Data;\n\npublic class ${1:AppDbContext}(DbContextOptions<${1:AppDbContext}> options) : DbContext(options)\n{\n    public DbSet<${2:UserEntity}> Users => Set<${2:UserEntity}>();\n\n    protected override void OnModelCreating(ModelBuilder modelBuilder)\n    {\n        base.OnModelCreating(modelBuilder);\n        modelBuilder.Entity<${2:UserEntity}>(entity =>\n        {\n            entity.HasKey(e => e.Id);\n            entity.Property(e => e.Email).IsRequired().HasMaxLength(256);\n            entity.HasIndex(e => e.Email).IsUnique();\n        });\n    }\n}\n$0',
  },
  {
    label: 'efcore-entity',
    detail: 'EF Core: Entity Class with Audit Timestamps',
    documentation: 'ORM model with strongly-typed IDs and auditing metadata',
    insertText: 'namespace Indoctrinated.Data.Entities;\n\npublic class ${1:UserEntity}\n{\n    public Guid Id { get; set; } = Guid.NewGuid();\n    public required string Username { get; set; }\n    public required string Email { get; set; }\n    public bool IsActive { get; set; } = true;\n    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;\n    public DateTimeOffset? UpdatedAt { get; set; }\n}\n$0',
  },

  // --- Event-Driven & Microservices (MassTransit) ---
  {
    label: 'masstransit-consumer',
    detail: 'MassTransit: Message Consumer for Microservices',
    documentation: 'Asynchronous event consumer with retry policy context',
    insertText: 'using MassTransit;\n\nnamespace Indoctrinated.Consumers;\n\npublic record class ${1:UserCreatedEvent}(Guid UserId, string Email);\n\npublic class ${2:UserCreatedConsumer}(ILogger<${2:UserCreatedConsumer}> logger) : IConsumer<${1:UserCreatedEvent}>\n{\n    public async Task Consume(ConsumeContext<${1:UserCreatedEvent}> context)\n    {\n        logger.LogInformation("Processing event for User {UserId} ({Email})", context.Message.UserId, context.Message.Email);\n        await Task.Yield();\n    }\n}\n$0',
  },

  // --- Desktop / Cross-Platform MVVM (CommunityToolkit) ---
  {
    label: 'mvvm-viewmodel',
    detail: 'CommunityToolkit.Mvvm: ObservableObject & RelayCommand',
    documentation: 'Source-generated MVVM ViewModel for .NET MAUI / WPF / Avalonia',
    insertText: 'using CommunityToolkit.Mvvm.ComponentModel;\nusing CommunityToolkit.Mvvm.Input;\n\nnamespace Indoctrinated.ViewModels;\n\npublic partial class ${1:DashboardViewModel} : ObservableObject\n{\n    [ObservableProperty]\n    private string _statusMessage = "Ready";\n\n    [ObservableProperty]\n    private bool _isBusy;\n\n    [RelayCommand]\n    private async Task RefreshAsync()\n    {\n        IsBusy = true;\n        StatusMessage = "Syncing with cloud...";\n        await Task.Delay(500);\n        StatusMessage = "Synchronized";\n        IsBusy = false;\n    }\n}\n$0',
  },

  // --- Testing & Project Config (xUnit / Csproj) ---
  {
    label: 'xunit-test',
    detail: 'xUnit: Unit Test Suite with Theories & InlineData',
    documentation: 'xUnit test class with Facts, Theories, and FluentAssertions',
    insertText: 'using Xunit;\n\nnamespace Indoctrinated.Tests;\n\npublic class ${1:CalculatorTests}\n{\n    [Fact]\n    public void Should_Initialize_Correctly()\n    {\n        var state = true;\n        Assert.True(state);\n    }\n\n    [Theory]\n    [InlineData(2, 3, 5)]\n    [InlineData(10, -5, 5)]\n    [InlineData(0, 0, 0)]\n    public void Should_Add_Numbers_Correctly(int a, int b, int expected)\n    {\n        var result = a + b;\n        Assert.Equal(expected, result);\n    }\n}\n$0',
  },
  {
    label: 'csproj-modern',
    detail: 'MSBuild: Modern SDK-Style .csproj (net8.0 / net9.0)',
    documentation: 'Modern .NET project file with Nullable reference types and ImplicitUsings enabled',
    insertText: '<Project Sdk="Microsoft.NET.Sdk.Web">\n\n  <PropertyGroup>\n    <TargetFramework>net8.0</TargetFramework>\n    <Nullable>enable</Nullable>\n    <ImplicitUsings>enable</ImplicitUsings>\n    <TreatWarningsAsErrors>true</TreatWarningsAsErrors>\n  </PropertyGroup>\n\n  <ItemGroup>\n    <PackageReference Include="Microsoft.AspNetCore.OpenApi" Version="8.0.*" />\n    <PackageReference Include="Swashbuckle.AspNetCore" Version="6.5.*" />\n  </ItemGroup>\n\n</Project>\n',
  },
]
