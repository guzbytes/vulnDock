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

    var staticRoutes = new[] { "/admin", "/blog", "/index", "/login", "/profile", "/register" };
    if (staticRoutes.Contains(path))
    {
        context.Response.Redirect($"{path}.html");
        return;
    }

    if (path != null && path.StartsWith("/blog/"))
    {
        context.Request.Path = "/blog-details.html";
    }

    await next();
});

app.UseDefaultFiles(); 
app.UseStaticFiles(); 
app.MapControllers();

app.Run();
