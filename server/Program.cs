using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

// Parse command-line arguments for web content path
// Usage: dotnet run -- --path=../web
// Or:    dotnet run -- ../web
string webPath = "web";

foreach (var arg in args)
{
    if (arg.StartsWith("--path="))
    {
        webPath = arg.Substring("--path=".Length);
        break;
    }
    else if (!arg.StartsWith("-") && !arg.StartsWith("/"))
    {
        webPath = arg;
        break;
    }
}

// Resolve to absolute path
webPath = Path.GetFullPath(webPath);

if (!Directory.Exists(webPath))
{
    Console.WriteLine($"Error: Web content directory not found: {webPath}");
    Console.WriteLine("Usage: dotnet run -- --path=<path-to-web-directory>");
    Console.WriteLine("       dotnet run -- ../web");
    return 1;
}

Console.WriteLine($"Serving static files from: {webPath}");

var app = builder.Build();

// Serve static files from the specified directory
app.UseDefaultFiles(new DefaultFilesOptions
{
    FileProvider = new PhysicalFileProvider(webPath)
});

app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(webPath),
    ServeUnknownFileTypes = false
});

// Fallback to index.html for SPA routing
app.MapFallback(async context =>
{
    var indexPath = Path.Combine(webPath, "index.html");
    if (File.Exists(indexPath))
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(indexPath);
    }
    else
    {
        context.Response.StatusCode = 404;
        await context.Response.WriteAsync("index.html not found");
    }
});

var url = "http://localhost:5000";
Console.WriteLine($"Server running at {url}");
Console.WriteLine("Press Ctrl+C to stop.");

app.Run(url);

return 0;
