var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ListenAnyIP(80);
});

builder.Services.AddControllers(); 

var app = builder.Build();

app.Use(async (context, next) =>
{
    var path = context.Request.Path.Value?.ToLower();

    var staticRoutes = new[] { "/tickets", "/ticket"};

     if (path == "/")
    {
        context.Response.Redirect("/tickets.html");
        return;
    }

    if (staticRoutes.Contains(path))
    {
        context.Response.Redirect($"{path}.html");
        return;
    }

    if (path != null && path.StartsWith("/ticket/"))
    {
        context.Request.Path = "/ticket-details.html";
    }

    await next();
});

app.UseStaticFiles(new StaticFileOptions
{
    ServeUnknownFileTypes = true,
    DefaultContentType = "application/octet-stream"
});


app.MapControllers();

app.Run();
