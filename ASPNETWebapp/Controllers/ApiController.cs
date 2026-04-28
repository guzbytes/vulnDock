using Microsoft.AspNetCore.Mvc;
using MyProject.Services;
using System.Text;
using System.Text.Json;
using BCrypt.Net;
using System.Xml;
using System.Runtime.InteropServices;
using System.Diagnostics;
using RazorLight;
using RazorEngine;
using RazorEngine.Templating;
using HandlebarsDotNet;



namespace MyProject.Controllers
{
    public class WelcomeModel
    {
        public string Username { get; set; }
    }
    [ApiController]
    [Route("api/v1")]
    public class ApiController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly string UploadPath;
        private const string UPLOAD_FOLDER = "wwwroot/uploads";

        public ApiController(IWebHostEnvironment env)
        {
            _env = env;
            UploadPath = Path.Combine(_env.WebRootPath, "images", "avatars");
        }

        [HttpPost("register")]
        public IActionResult Register([FromForm] Dictionary<string, string> form, [FromForm] IFormFile avatar)
        {
            try
            {
                string username = form["username"];
                string firstname = form["firstname"];
                string lastname = form["lastname"];
                string email = form["email"];
                string password = form["password"];

                Directory.CreateDirectory(UploadPath);
                var filename = Path.GetFileName(avatar.FileName);
                var path = Path.Combine(UploadPath, filename);

                using (var stream = new FileStream(path, FileMode.Create))
                {
                    avatar.CopyTo(stream);
                }

                var hashedPassword = BCrypt.Net.BCrypt.HashPassword(password);
                var avatarUrl = $"/images/avatars/{filename}";

                DatabaseConnector.InsertUser(
                    username,
                    firstname,
                    lastname,
                    email,
                    hashedPassword,
                    avatarUrl,
                    false
                );

                return StatusCode(201, new { message = "Usuario registrado exitosamente" });
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
                return StatusCode(500, new { message = "Error interno en el servidor" });
            }
        }

        [HttpPost("login")]
        public IActionResult Login([FromForm] string username, [FromForm] string password)
        {
            var users = DatabaseConnector.GetUserByUsername(username);
            var user = users.FirstOrDefault();
            if (user == null)
                return Unauthorized(new { message = "Usuario no encontrado" });

            if (BCrypt.Net.BCrypt.Verify(password, (string)user["password"]))
            {
                var userData = new
                {
                    id = user["id"],
                    username = user["username"],
                    is_admin = Convert.ToBoolean(user["is_admin"])
                };

                var json = JsonSerializer.Serialize(userData);
                var encoded = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(json));

                Response.Cookies.Append("session", encoded, new CookieOptions
                {
                    HttpOnly = false,
                    MaxAge = TimeSpan.FromHours(1),
                    Path = "/",
                    SameSite = SameSiteMode.Lax,
                    Secure = false,
                });

                return Ok(new { message = "Login exitoso", user = userData });
            }
            else
            {
                return Unauthorized(new { message = "Usuario o contraseña incorrectos" });
            }
        }

        [HttpGet("user/me")]
        public IActionResult UserMe()
        {
            if (!Request.Cookies.TryGetValue("session", out var session) || string.IsNullOrEmpty(session))
            {
                return Unauthorized(new { message = "No autenticado" });
            }

            try
            {
                var decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(session));
                var userData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(decoded);

                if (userData == null || !userData.TryGetValue("id", out var idValue) || idValue.ValueKind == JsonValueKind.Null)
                    return Unauthorized(new { message = "Sesión inválida" });

                int id = idValue.GetInt32();

                var user = DatabaseConnector.GetUserById(id).FirstOrDefault();

                if (user != null)
                    return Ok(new
                    {
                        id = user["id"],
                        username = user["username"],
                        firstname = user["firstname"],
                        lastname = user["lastname"],
                        email = user["email"],
                        avatar = user["avatar"]?.ToString()
                    });

                return NotFound(new { message = "Usuario no encontrado" });
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error al decodificar la sesión: " + ex.Message);
                return Unauthorized(new { message = "Sesión inválida" });
            }
        }
        [HttpPost("update-profile")]
        public IActionResult UpdateProfile([FromForm] Dictionary<string, string> form)
        {
            string session = Request.Cookies["session"] ?? string.Empty;
            if (string.IsNullOrEmpty(session))
                return Unauthorized(new { message = "No autenticado" });

            try
            {
                string decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(session));
                var userData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(decoded);
                if (!userData.TryGetValue("id", out var idValue))
                    throw new InvalidOperationException("User ID is null.");
                int userId = idValue.GetInt32();

                string firstName = form.GetValueOrDefault("firstName");
                string lastName = form.GetValueOrDefault("lastName");
                string email = form.GetValueOrDefault("email");
                string newPassword = form.GetValueOrDefault("newPassword");


                if (firstName == null || lastName == null || email == null)
                    return BadRequest(new { message = "Nombre, Apellidos y Correo son obligatorios." });


                string hashedPassword = null;
                if (!string.IsNullOrEmpty(newPassword))
                {
                    hashedPassword = BCrypt.Net.BCrypt.HashPassword(newPassword);
                }

                DatabaseConnector.UpdateUserProfile(
                    userId,
                    firstName,
                    lastName,
                    email,
                    hashedPassword,
                    null
                );

                return Ok(new { message = "Perfil actualizado con éxito" });
            }
            catch
            {
                return Unauthorized(new { message = "Sesión inválida" });
            }
        }

        [HttpGet("users")]
        public IActionResult ListUsers()
        {
            string session = Request.Cookies["session"] ?? string.Empty;
            if (string.IsNullOrEmpty(session))
                return Unauthorized(new { message = "No autenticado" });

            try
            {
                string decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(session));
                var userData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(decoded);

                if (userData == null || !userData.TryGetValue("id", out var idValue))
                    return Unauthorized(new { message = "Sesión inválida" });

                int userId = idValue.GetInt32();

                Console.WriteLine("User ID from session: " + userId);

                var user = DatabaseConnector.GetUserById(userId).FirstOrDefault();
                Console.WriteLine("User data from DB: " + JsonSerializer.Serialize(user));
                if (!Convert.ToBoolean(user["is_admin"])) return Forbid();

                Console.WriteLine("Usuario admin: " + user["is_admin"]);

                var users = DatabaseConnector.ListUsers();
                Console.WriteLine("Usuarios obtenidos: " + JsonSerializer.Serialize(users));
                return Ok(users);
            }
            catch
            {
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("users/{userId}/toggle-admin")]
        public IActionResult ToggleAdmin(int userId)
        {
            dynamic result = DatabaseConnector.ToggleAdmin(userId);

            if (result.affectedRows == 0)
                return NotFound(new { message = "Usuario no encontrado" });

            return Ok(new { message = "Rol de admin actualizado correctamente" });
        }
        [HttpDelete("users/{userId}")]
        public IActionResult DeleteUser(int userId)
        {
            var session = HttpContext.Request.Cookies["session"];
            if (string.IsNullOrEmpty(session))
                return Unauthorized(new { message = "No autenticado" });

            try
            {
                string decoded = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(session));
                var userData = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(decoded);
                string isAdmin = userData["is_admin"].ToString();

                if (isAdmin.Equals("true", StringComparison.OrdinalIgnoreCase))
                {
                    DatabaseConnector.DeleteUser(userId);;
                    return Ok(new { message = "Usuario eliminado" });
                }
                else
                {
                    return StatusCode(403, new { message = "No autorizado" });
                }
            }
            catch
            {
                return Unauthorized(new { message = "Sesión inválida" });
            }
        }

        [HttpPost("users/import")]
        public async Task<IActionResult> ImportUsers([FromBody] Dictionary<string, string> body)
        {
            string url = body.GetValueOrDefault("url");
            Console.WriteLine("Importando usuarios desde: " + url);

            string responseBody = "";

            try
            {
                using var client = new HttpClient();
                var response = await client.GetAsync(url); // ← SSRF vulnerable
                responseBody = await response.Content.ReadAsStringAsync();

                var usersData = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(responseBody);

                foreach (var user in usersData)
                {
                    DatabaseConnector.InsertUser(
                        user["username"].ToString(),
                        user["firstname"].ToString(),
                        user["lastname"].ToString(),
                        user["email"].ToString(),
                        user["password"].ToString(),
                        null,
                        Convert.ToBoolean(user["is_admin"])
                    );
                }

                return Ok(new { message = "Usuarios importados exitosamente" });
            }
            catch (Exception e)
            {
                return StatusCode(500, new { message = "Error en la solicitud: " + e.Message, response = responseBody });
            }
        }

        [HttpPost("users/import-xml")]
        public IActionResult ImportUsersXml([FromBody] Dictionary<string, string> body)
        {
            string xmlData = body.GetValueOrDefault("xml")?.Trim();
            Console.WriteLine("XML recibido: " + xmlData);

            try
            {
                var xmlDoc = new XmlDocument();
                // Vulnerabilidad XXE: no se deshabilitan DTDs
                xmlDoc.LoadXml(xmlData);

                var users = xmlDoc.GetElementsByTagName("user");

                foreach (XmlNode user in users)
                {
                    string username = user["username"].InnerText;
                    string firstname = user["firstname"].InnerText;
                    string lastname = user["lastname"].InnerText;
                    string email = user["email"].InnerText;
                    string password = user["password"].InnerText;

                   DatabaseConnector.InsertUser(
                        username,
                        firstname,
                        lastname,
                        email,
                        password,
                        null,
                        false
                    );
                }

                return Ok(new { message = "Usuarios importados desde XML exitosamente" });
            }
            catch (Exception e)
            {
                return BadRequest(new { message = "Error al procesar el XML: " + e.Message });
            }
        }

        [HttpPost("ping")]
        public IActionResult PingHost([FromForm] string host)
        {
            try
            {
                string os = Environment.OSVersion.Platform.ToString();
                string command;
                string arguments;

                if (os.Contains("Win"))
                {
                    // En Windows usamos el parámetro "-n" para definir el número de pings
                    command = "cmd";
                    arguments = $"/c ping -n 2 {host}";
                }
                else
                {
                    // En sistemas basados en UNIX (Linux, macOS), usamos "-c"
                    command = "bash";
                    arguments = $"ping -c 2 {host}";
                }

                Process process = new Process();
                process.StartInfo = new ProcessStartInfo
                {
                    FileName = command,       // Usamos directamente "ping" en ambos casos
                    Arguments = arguments,    // Los argumentos del comando
                    RedirectStandardOutput = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                process.Start();
                string output = process.StandardOutput.ReadToEnd();
                process.WaitForExit();

                return Ok(new { output });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Error al hacer ping: {ex.Message}" });
            }
        }
         [HttpGet("blogs")]
        public IActionResult GetBlogs()
        {
            try
            {
                List<Dictionary<string, object>> blogs;
                string session = Request.Cookies["session"];
                
                if (string.IsNullOrEmpty(session))
                {
                    blogs = DatabaseConnector.ListPublicBlogs();
                }
                else
                {
                    blogs = DatabaseConnector.ListAllBlogs();
                }
                return Ok(blogs);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error inesperado" });
            }
        }


        [HttpGet("blog/{blog_id}")]
        public IActionResult GetBlogById(int blog_id)
        {
            try
            {
                string query = "SELECT * FROM blogs WHERE id = " + blog_id;
                var blog = DatabaseConnector.GetBlogById(blog_id);
                if (blog.Count == 0) return NotFound(new { error = "Blog no encontrado" });
                return Ok(blog[0]);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { error = "Error interno del servidor" });
            }
        }

        [HttpPost("blog/{blog_id}/comments")]
        public IActionResult AddComment(
            int blog_id,
            [FromForm] string content,
            [FromForm] List<IFormFile> files)
        {
            string username = "Anónimo";
            try
            {
                // Obtener el valor de la cookie 'session'
                string sessionCookie = Request.Cookies["session"];
                
                if (sessionCookie != null)
                {
                    try
                    {
                        string json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(sessionCookie));

                        var userData = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                        int userId = Convert.ToInt32(userData["id"]);

                        var user = DatabaseConnector.GetUserNameById(userId);
                        if (!string.IsNullOrEmpty(user))
                        {
                            username = user;
                        }
                    }
                    catch (FormatException)
                    {
                        Console.WriteLine("Error al procesar la cookie de sesión.");
                    }
                    catch (JsonException)
                    {
                        Console.WriteLine("Error al deserializar la cookie de sesión.");
                    }
                }

                dynamic result = DatabaseConnector.InsertComment(blog_id, username, content);
                int commentId = Convert.ToInt32(result.insertId);
                
                
                var fileEntries = new List<Dictionary<string, object>>();
                if (files != null)
                {
                    foreach (var file in files)
                    {
                        string filePath = "/uploads/" + file.FileName;
                        string uploadsPath = Path.Combine(UPLOAD_FOLDER, file.FileName);
                        try
                        {
                            Directory.CreateDirectory(Path.GetDirectoryName(uploadsPath));
                            using (var fileStream = new FileStream(uploadsPath, FileMode.Create))
                            {
                                file.CopyTo(fileStream);
                            }
                            DatabaseConnector.InsertCommentFiles(commentId, new List<string> { filePath });
                            fileEntries.Add(new Dictionary<string, object> { { "comment_id", commentId }, { "file_path", filePath } });
                        }
                        catch (IOException e)
                        {
                            Console.WriteLine(e);
                        }
                    }
                }

                // Devolver respuesta con éxito
                return Ok(new
                {
                    message = "Comentario agregado con éxito",
                    comment = new
                    {
                        id = commentId,
                        content,
                        author = username,
                        files = fileEntries
                    }
                });
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

        [HttpGet("blog/{blog_id}/comments")]
        public async Task<IActionResult> GetComments(int blog_id)
        {
            try
            {
                var comments = DatabaseConnector.ListCommentsByBlogId(blog_id);;

                Console.WriteLine("Comentarios obtenidos: " + JsonSerializer.Serialize(comments));

                var enriched = new List<Dictionary<string, object>>();
                foreach (var comment in comments)
                {
                    int commentId = Convert.ToInt32(((IDictionary<string, object>)comment)["id"]);

                    var files = DatabaseConnector.ListFilesByCommentId(commentId);

                    var fileEntries = files.Select(file => new Dictionary<string, object>
                    {
                        { "file_path", ((IDictionary<string, object>)file)["file_path"] }
                    }).ToList();

                    // Convertir el comentario a diccionario
                    var dict = new Dictionary<string, object>();
                    foreach (var pair in (IDictionary<string, object>)comment)
                    {
                        dict[pair.Key] = pair.Value;
                    }

                    dict["files"] = fileEntries;
                    enriched.Add(dict);
                }

                // 7. Devolver la respuesta con los comentarios enriquecidos (con archivos)
                return Ok(new { comments = enriched });
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
        [HttpPost("blog")]
        public IActionResult CreateBlog([FromBody] Dictionary<string, object> data)
        {
            try
            {
                string title = data.ContainsKey("title") ? data["title"]?.ToString() : null;
                string content = data.ContainsKey("content") ? data["content"]?.ToString() : null;
                string author = data.ContainsKey("author") ? data["author"]?.ToString() : "Anónimo";
                string url = data.ContainsKey("url") ? data["url"]?.ToString() : "";
                string isPrivate = data.ContainsKey("is_private") ? data["is_private"]?.ToString() : "0";

                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(content))
                {
                    return BadRequest(new { message = "El título y el contenido son obligatorios." });
                }

                if (Request.Cookies.TryGetValue("session", out var sessionCookie))
                {
                    try
                    {
                        var json = System.Text.Encoding.UTF8.GetString(Convert.FromBase64String(sessionCookie));
                        var userData = JsonSerializer.Deserialize<Dictionary<string, object>>(json);
                        int userId = Convert.ToInt32(userData["id"]);
                        var user = DatabaseConnector.GetUserById(userId);
                        if (user.Count() > 0)
                        {
                            var userRecord = user.FirstOrDefault();
                            if (userRecord != null)
                            {
                                author = userRecord["firstname"] + " " + userRecord["lastname"];
                            }
                        }
                    }
                    catch { /* intentionally silent */ }
                }

                DatabaseConnector.CreateBlog(title, content, author, url, isPrivate == "1");

                return Ok(new { message = "Blog creado con éxito" });
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }
        [HttpGet("update-welcome")]
        public async Task<IActionResult> UpdateWelcome([FromQuery] string username = "Guest")
        {
            try
            {
                /// Plantilla vulnerable a SSTI
                string template = "Bienvenido {{Username}}!";  // Sintaxis de Handlebars

                // Creamos el modelo con el valor del 'username'
                var model = new { Username = username };

                // Compilamos y procesamos la plantilla utilizando Handlebars
                var compiledTemplate = Handlebars.Compile(template);

                // Ejecutamos la plantilla con el modelo
                string result = compiledTemplate(model);

                // Retornamos el resultado generado por la plantilla
                return Content(result, "text/html");

            }
            catch (Exception ex)
            {
                Console.WriteLine(ex);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

    }
}
