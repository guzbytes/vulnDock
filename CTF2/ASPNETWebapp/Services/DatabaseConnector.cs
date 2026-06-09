using Microsoft.Data.SqlClient;
using System.Data;

namespace MyProject.Services
{
    public static class DatabaseConnector
    {
        private const string ConnectionString =
            "Server=db-mssql;Database=web_app;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true;Encrypt=true";

        private static SqlConnection Connect()
        {
            try
            {
                var conn = new SqlConnection(ConnectionString);
                conn.Open();
                return conn;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.Message);
                return null;
            }
        }

        private static List<Dictionary<string, object>> Query(string sql)
        {
            using var conn = Connect();
            if (conn == null) return new List<Dictionary<string, object>>();

            try
            {
                using var cmd = new SqlCommand(sql, conn);
                using var reader = cmd.ExecuteReader();

                var result = new List<Dictionary<string, object>>();

                while (reader.Read())
                {
                    var row = new Dictionary<string, object>();

                    for (int i = 0; i < reader.FieldCount; i++)
                    {
                        string columnName = reader.GetName(i);
                        if (reader.IsDBNull(i))
                        {
                            row[columnName] = "";
                        }
                        else
                        {
                            row[columnName] = reader.GetValue(i);
                        }
                    }
                    result.Add(row);
                }

                return result;
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error Query: " + ex.Message);
                return new List<Dictionary<string, object>>();
            }
        }

        private static (int affectedRows, object insertId) Exec(
            string sql,
            bool returnIdentity = false)
        {
            using var conn = Connect();
            if (conn == null) return (0, null);

            try
            {
                using var cmd = new SqlCommand(sql, conn);

                int affectedRows = cmd.ExecuteNonQuery();
                object insertId = null;

                if (returnIdentity)
                {
                    cmd.CommandText = "SELECT SCOPE_IDENTITY();";
                    insertId = cmd.ExecuteScalar();
                }

                return (affectedRows, insertId);
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error Exec: " + ex.Message);
                return (0, null);
            }
        }

        


        public static List<Dictionary<string, object>> ListAllTickets()
        {
            return Query("SELECT * FROM tickets");
        }

        public static List<Dictionary<string, object>> GetTicketById(int id)
        {
            return Query(
                "SELECT * FROM tickets WHERE id = " + id
            );
        }

        public static object CreateTicket(
            string title,
            string content,
            string author)
        {
            string sql =
                "INSERT INTO tickets (author, title, content) VALUES ('" +
                author + "', '" +
                title + "', '" +
                content + "')";

            var (_, id) = Exec(sql, true);

            return new { insertId = id };
        }

        public static object InsertComment(int ticketId, string writer, string comment)
        {
            string sql =
                "INSERT INTO comments (blog_id, writer, comment) VALUES (" +
                ticketId + ", '" +
                writer + "', '" +
                comment + "')";

            var (_, id) = Exec(sql, true);

            return new { insertId = id };
        }

        public static object InsertCommentFiles(int commentId, List<string> filePaths)
        {
            if (filePaths == null || filePaths.Count == 0)
                return new { affectedRows = 0 };

            using var conn = Connect();
            if (conn == null) return new { affectedRows = 0 };

            try
            {
                int affected = 0;

                foreach (var path in filePaths)
                {
                    string sql =
                        "INSERT INTO comment_files (comment_id, file_path) VALUES (" +
                        commentId + ", '" + path + "')";

                    using var cmd = new SqlCommand(sql, conn);

                    affected += cmd.ExecuteNonQuery();
                }

                return new { affectedRows = affected };
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error InsertCommentFiles: " + ex.Message);
                return new { affectedRows = 0 };
            }
        }

        public static List<Dictionary<string, object>> ListCommentsByTicketId(int ticketId)
        {
            return Query(
                "SELECT * FROM comments WHERE blog_id = " + ticketId
            );
        }

        public static List<Dictionary<string, object>> ListFilesByCommentId(int commentId)
        {
            return Query(
                "SELECT * FROM comment_files WHERE comment_id = " + commentId
            );
        }

    }
}