using Microsoft.Data.SqlClient;
using System.Data;

namespace MyProject.Services
{
    public static class DatabaseConnector
    {
        private const string ConnectionString =
            "Server=db;Database=web_app;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true;Encrypt=true";

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

        public static object InsertUser(
            string username,
            string firstname,
            string lastname,
            string email,
            string password,
            string avatar,
            bool isAdmin = false)
        {
            string sql = "INSERT INTO users (username, firstname, lastname, email, password, avatar, is_admin) VALUES ('" +
                        username + "', '" +
                        firstname + "', '" +
                        lastname + "', '" +
                        email + "', '" +
                        password + "', '" +
                        avatar + "', " +
                        (isAdmin ? 1 : 0) + ")";

            var (_, id) = Exec(sql, returnIdentity: true);

            return new { insertId = id };
        }

        public static List<Dictionary<string, object>> GetUserByUsername(string username)
        {
            return Query(
                "SELECT * FROM users WHERE username = '" + username + "'"
            );
        }

        public static List<Dictionary<string, object>> GetUserById(int id)
        {
            return Query(
            "SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = " + id
        );
        }

        public static object UpdateUserProfile(
            int userId,
            string firstName = null,
            string lastName = null,
            string email = null,
            string newHashedPassword = null,
            string avatarPath = null)
        {
            var sets = new List<string>();

            if (firstName != null)
                sets.Add("firstname = '" + firstName + "'");

            if (lastName != null)
                sets.Add("lastname = '" + lastName + "'");

            if (email != null)
                sets.Add("email = '" + email + "'");

            if (newHashedPassword != null)
                sets.Add("password = '" + newHashedPassword + "'");

            if (avatarPath != null)
                sets.Add("avatar = '" + avatarPath + "'");

            if (sets.Count == 0)
                return new { affectedRows = 0 };

            string sql =
                "UPDATE users SET " +
                string.Join(", ", sets) +
                " WHERE id = " + userId;

            var (affected, _) = Exec(sql);

            return new { affectedRows = affected };
        }

        public static List<Dictionary<string, object>> ListUsers()
        {
            return Query("SELECT id, username, email, is_admin FROM users");
        }

        public static object ToggleAdmin(int id)
        {
            string sql =
                "UPDATE users " +
                "SET is_admin = CASE WHEN is_admin = 1 THEN 0 ELSE 1 END " +
                "WHERE id = " + id;

            var (affected, _) = Exec(sql);

            return new { affectedRows = affected };
        }

        public static object DeleteUser(int id)
        {
            var (affected, _) = Exec(
                "DELETE FROM users WHERE id = " + id
            );

            return new { affectedRows = affected };
        }

        public static List<Dictionary<string, object>> ListAllBlogs()
        {
            return Query("SELECT * FROM blogs");
        }

        public static List<Dictionary<string, object>> ListPublicBlogs()
        {
            return Query("SELECT * FROM blogs WHERE is_private = 0");
        }

        public static List<Dictionary<string, object>> GetBlogById(int id)
        {
            return Query(
                "SELECT * FROM blogs WHERE id = " + id
            );
        }

        public static object CreateBlog(
            string title,
            string content,
            string authorName,
            string url,
            bool isPrivate)
        {
            string sql =
                "INSERT INTO blogs (title, content, author, url, is_private) VALUES ('" +
                title + "', '" +
                content + "', '" +
                authorName + "', '" +
                url + "', " +
                (isPrivate ? 1 : 0) + ")";

            var (_, id) = Exec(sql, true);

            return new { insertId = id };
        }

        public static object InsertComment(int blogId, string writer, string comment)
        {
            string sql =
                "INSERT INTO comments (blog_id, writer, comment) VALUES (" +
                blogId + ", '" +
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

        public static List<Dictionary<string, object>> ListCommentsByBlogId(int blogId)
        {
            return Query(
                "SELECT * FROM comments WHERE blog_id = " + blogId
            );
        }

        public static List<Dictionary<string, object>> ListFilesByCommentId(int commentId)
        {
            return Query(
                "SELECT * FROM comment_files WHERE comment_id = " + commentId
            );
        }

        public static string GetUserNameById(int userId)
        {
            var rows = Query(
                "SELECT firstname, lastname FROM users WHERE id = " + userId
            );

            if (rows.Count == 0) return null;

            var row = rows[0];

            return $"{row["firstname"]} {row["lastname"]}".Trim();
        }
    }
}