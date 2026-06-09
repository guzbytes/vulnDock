using Microsoft.AspNetCore.Mvc;

namespace MyProject.Controllers
{
    public class HomeController : Controller
    {
        public IActionResult Index()
        {
            ViewBag.Message = "¡Hola mundo desde ASP.NET Core MVC!";
            return View();
        }
    }
}
