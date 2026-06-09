using Microsoft.AspNetCore.Mvc;
using MyProject.Services;
using System.Text.Json;

namespace MyProject.Controllers
{
    [ApiController]
    [Route("api/v1")]
    public class ApiController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;
        private readonly string UploadPath;
        public ApiController(IWebHostEnvironment env)
        {
            _env = env;
            UploadPath = Path.Combine(_env.WebRootPath, "uploads");
        }

         [HttpGet("tickets")]
        public IActionResult GetTickets()
        {
            try
            {
                List<Dictionary<string, object>> tickets;
                tickets = DatabaseConnector.ListAllTickets();
                return Ok(tickets);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error inesperado" });
            }
        }


        [HttpGet("ticket/{ticket_id}")]
        public IActionResult GetTicketById(int ticket_id)
        {
            try
            {
                string query = "SELECT * FROM tickets WHERE id = " + ticket_id;
                var ticket = DatabaseConnector.GetTicketById(ticket_id);
                if (ticket.Count == 0) return NotFound(new { error = "Ticket no encontrado" });
                return Ok(ticket[0]);
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { error = "Error interno del servidor" });
            }
        }

        [HttpPost("ticket/{ticket_id}/comments")]
        public IActionResult AddComment(
            int ticket_id,
            [FromForm] string content,
            [FromForm] string author,
            [FromForm] List<IFormFile> files)
        {
            try
            {
                dynamic result = DatabaseConnector.InsertComment(ticket_id, author, content);
                int commentId = Convert.ToInt32(result.insertId);
                
                
                var fileEntries = new List<Dictionary<string, object>>();
                if (files != null)
                {
                    foreach (var file in files)
                    {
                        string filePath = "/uploads/" + file.FileName;
                        string uploadsPath = Path.Combine(UploadPath, file.FileName);
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

                return Ok(new
                {
                    message = "Comentario agregado con éxito",
                    comment = new
                    {
                        id = commentId,
                        content,
                        author = author,
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

        [HttpGet("ticket/{ticket_id}/comments")]
        public async Task<IActionResult> GetComments(int ticket_id)
        {
            try
            {
                var comments = DatabaseConnector.ListCommentsByTicketId(ticket_id);;

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
        
        [HttpPost("ticket")]
        public IActionResult CreateTicket([FromBody] Dictionary<string, object> data)
        {
            try
            {
                string title = data.ContainsKey("title") ? data["title"]?.ToString() : null;
                string content = data.ContainsKey("content") ? data["content"]?.ToString() : null;
                string author = data.ContainsKey("author") ? data["author"]?.ToString() : "Anónimo";
                

                if (string.IsNullOrEmpty(title) || string.IsNullOrEmpty(content))
                {
                    return BadRequest(new { message = "El título y el contenido son obligatorios." });
                }

                DatabaseConnector.CreateTicket(title, content, author);

                return Ok(new { message = "Ticket creado con éxito" });
            }
            catch (Exception e)
            {
                Console.WriteLine(e);
                return StatusCode(500, new { message = "Error interno del servidor" });
            }
        }

    }
}
