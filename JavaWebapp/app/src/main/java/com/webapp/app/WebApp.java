package com.webapp.app;
import java.io.IOException;
import java.io.StringReader;
import java.io.StringWriter;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Base64;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.io.File;
import org.springframework.security.crypto.bcrypt.BCrypt;


import java.util.Scanner;
import org.w3c.dom.*;
import com.fasterxml.jackson.core.type.TypeReference;

import java.io.ByteArrayInputStream;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.util.Base64Utils;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.xml.sax.InputSource;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.thymeleaf.spring6.SpringTemplateEngine;
import org.thymeleaf.spring6.templateresolver.SpringResourceTemplateResolver;
import org.thymeleaf.context.Context;

import freemarker.template.Configuration;
import freemarker.template.Template;
import freemarker.template.TemplateException;

@SpringBootApplication
@RestController
public class WebApp {

    public static void main(String[] args) {
        SpringApplication.run(WebApp.class, args);
    }

    private static final String UPLOAD_FOLDER = "public/images/avatars";
    private static final String UPLOAD_FOLDER2 = "public/uploads";

    @GetMapping("/")
    public ResponseEntity<byte[]> index() throws IOException {
        return serveStatic("public/index.html");
    }

    @GetMapping("/admin")
    public ResponseEntity<byte[]> adminPage() throws IOException {
        return serveStatic("public/admin.html");
    }

    @GetMapping("/login")
    public ResponseEntity<byte[]> loginPage() throws IOException {
        return serveStatic("public/login.html");
    }

    @GetMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        Cookie cookie = new Cookie("session", "");
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        response.setHeader("Location", "/");
        response.setStatus(302);
        return ResponseEntity.status(302).build();
    }

    @GetMapping("/register")
    public ResponseEntity<byte[]> registerPage() throws IOException {
        return serveStatic("public/register.html");
    }

    @GetMapping("/blog")
    public ResponseEntity<byte[]> blogPage() throws IOException {
        return serveStatic("public/blog.html");
    }

    @GetMapping("/blog/{id}")
    public ResponseEntity<byte[]> blogDetailsPage(@PathVariable int id) throws IOException {
        return serveStatic("public/blog-details.html");
    }

    @GetMapping("/profile")
    public ResponseEntity<byte[]> profilePage() throws IOException {
        return serveStatic("public/profile.html");
    }

    @GetMapping("/{path:^(?!api).*$}/**")
    public ResponseEntity<byte[]> staticFiles(HttpServletRequest request) throws IOException {
        String path = request.getRequestURI().substring(1);
        String filePath = "public/" + path;

        return serveStatic(filePath);
    }

    private ResponseEntity<byte[]> staticFiles(String filePath) throws IOException {
        Path path = Paths.get(filePath);
        if (!Files.exists(path)) {
            return ResponseEntity.notFound().build();
        }
        byte[] content = Files.readAllBytes(path);
        return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(content);
    }
    private ResponseEntity<byte[]> serveStatic(String filePath) throws IOException {
        File file = new File(filePath);
    
        if (!file.exists() || !file.isFile()) {
            return ResponseEntity.status(404).body(null);
        }
    
        String contentType = Files.probeContentType(file.toPath());
        if (contentType == null) {
            if (filePath.endsWith(".css")) {
                contentType = "text/css";
            } else if (filePath.endsWith(".js")) {
                contentType = "application/javascript";
            } else if (filePath.endsWith(".png")) {
                contentType = "image/png";
            } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
                contentType = "image/jpeg";
            } else if (filePath.endsWith(".html")) {
                contentType = "text/html";
            } else {
                contentType = "application/octet-stream";
            }
        }
    
        byte[] content = Files.readAllBytes(file.toPath());
    
        return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .body(content);
    }

    @PostMapping("/api/v1/register")
    public ResponseEntity<Map<String, String>> register(@RequestParam Map<String, String> form,
                                                        @RequestParam("avatar") MultipartFile avatar) {
        String username = form.get("username");
        String firstname = form.get("firstname");
        String lastname = form.get("lastname");
        String email = form.get("email");
        String password = form.get("password");

        String filename = avatar.getOriginalFilename();
        Path avatarPath = Paths.get(UPLOAD_FOLDER, filename);
        try {
            Files.createDirectories(avatarPath.getParent());
            avatar.transferTo(avatarPath);

            String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt());
            
            String avatarUrl = "/images/avatars/" + filename;

            String query = "INSERT INTO users (username, firstname, lastname, email, password, avatar) VALUES ('"
                    + username + "', '" + firstname + "', '" + lastname + "', '" + email + "', '"
                    + hashedPassword + "', '" + avatarUrl + "')";

            DatabaseConnector.execute(query);
            return ResponseEntity.status(201).body(Collections.singletonMap("message", "Usuario registrado exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Collections.singletonMap("message", "Error interno en el servidor"));
        }
    }

    @PostMapping("/api/v1/login")
    public ResponseEntity<Map<String, Object>> login(@RequestParam String username,
                                                     @RequestParam String password,
                                                     HttpServletResponse response) {
        String query = "SELECT * FROM users WHERE username = '" + username + "'";
        List<Map<String, Object>> userList = DatabaseConnector.query(query);
        if (userList.isEmpty()) {
            return ResponseEntity.status(401).body(Collections.singletonMap("message", "Usuario no encontrado"));
        }
        Map<String, Object> user = userList.get(0);
        String storedPassword = (String) user.get("password");
        if (BCrypt.checkpw(password, storedPassword)) {
            try {
                Map<String, Object> userData = new HashMap<>();
                userData.put("id", user.get("id"));
                userData.put("username", user.get("username"));
                userData.put("is_admin", user.getOrDefault("is_admin", false));
                ObjectMapper mapper = new ObjectMapper();
                String json = mapper.writeValueAsString(userData);
                String encoded = Base64.getEncoder().encodeToString(json.getBytes(StandardCharsets.UTF_8));
                Cookie cookie = new Cookie("session", encoded);
                cookie.setMaxAge(3600);
                cookie.setHttpOnly(false);
                cookie.setPath("/");
                response.addCookie(cookie);
                return ResponseEntity.ok(Map.of("message", "Login exitoso", "user", userData));
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Collections.singletonMap("message", "Error interno en el servidor"));
            }   
        } else {
            return ResponseEntity.status(401).body(Collections.singletonMap("message", "Usuario o contraseña incorrectos"));
        }
    }

    @GetMapping("/api/v1/user/me")
    public ResponseEntity<?> userMe(@CookieValue(value = "session", required = false) String session) {
        if (session == null || session.isEmpty()) return ResponseEntity.status(401).body(Map.of("message", "No autenticado"));
        try {
            String decoded = new String(Base64.getDecoder().decode(session), StandardCharsets.UTF_8); 
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> userData = objectMapper.readValue(decoded, new TypeReference<Map<String, Object>>() {});
            String id = String.valueOf(userData.get("id"));
            List<Map<String, Object>> users = DatabaseConnector.query("SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = " + id);
            if (!users.isEmpty()) return ResponseEntity.ok(users.get(0));
            return ResponseEntity.status(404).body(Map.of("message", "Usuario no encontrado"));
        } catch (Exception e) {
            System.out.println("Error al decodificar la sesión: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of("message", "Sesión inválida"));
        }
    }

    @PostMapping("/api/v1/update-profile")
    public ResponseEntity<?> updateProfile(@CookieValue(value = "session", required = false) String session,
                                           @RequestParam Map<String, String> form) {
        if (session == null) return ResponseEntity.status(401).body(Map.of("message", "No autenticado"));
        try {
            String decoded = new String(Base64.getDecoder().decode(session), StandardCharsets.UTF_8); 
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> userData = objectMapper.readValue(decoded, new TypeReference<Map<String, Object>>() {});
            String userId = String.valueOf(userData.get("id"));

            String firstName = form.get("firstName");
            String lastName = form.get("lastName");
            String email = form.get("email");
            String newPassword = form.get("newPassword");

            if (firstName == null || lastName == null || email == null) {
                return ResponseEntity.badRequest().body(Map.of("message", "Nombre, Apellidos y Correo son obligatorios."));
            }

            StringBuilder query = new StringBuilder("UPDATE users SET firstname = '")
                    .append(firstName).append("', lastname = '").append(lastName)
                    .append("', email = '").append(email).append("'");

            if (newPassword != null && !newPassword.isEmpty()) {
                String hashed = Base64.getEncoder().encodeToString(newPassword.getBytes());
                query.append(", password = '").append(hashed).append("'");
            }

            query.append(" WHERE id = ").append(userId);
            DatabaseConnector.execute(query.toString());

            return ResponseEntity.ok(Map.of("message", "Perfil actualizado con éxito"));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Sesión inválida"));
        }
    }
    @GetMapping("/api/v1/users")
    public ResponseEntity<?> listUsers(@CookieValue(value = "session", required = false) String session) {
        if (session == null || session.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "No autenticado"));
        }

        try {
            String decoded = new String(Base64.getDecoder().decode(session), StandardCharsets.UTF_8); 
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> userData = objectMapper.readValue(decoded, new TypeReference<Map<String, Object>>() {});
            String userId = String.valueOf(userData.get("id"));

            List<Map<String, Object>> result = DatabaseConnector.query("SELECT is_admin FROM users WHERE id = " + userId);
            if (result.isEmpty() || !"true".equalsIgnoreCase(String.valueOf(result.get(0).get("is_admin")))) {
                return ResponseEntity.status(403).body(Map.of("message", "No autorizado"));
            }

            List<Map<String, Object>> users = DatabaseConnector.query("SELECT id, username, email, is_admin FROM users");
            return ResponseEntity.ok(users);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error interno del servidor"));
        }
    }

    @GetMapping("/api/v1/users/{userId}/toggle-admin")
    public ResponseEntity<?> toggleAdmin(@PathVariable int userId) {
        String query = "UPDATE users SET is_admin = NOT is_admin WHERE id = " + userId;
        int rows = DatabaseConnector.execute(query);
        if (rows == 0) {
            return ResponseEntity.status(404).body(Map.of("message", "Usuario no encontrado"));
        }
        return ResponseEntity.ok(Map.of("message", "Rol de admin actualizado correctamente"));
    }

    @DeleteMapping("/api/v1/users/{userId}")
    public ResponseEntity<?> deleteUser(@PathVariable int userId,
                                        @CookieValue(value = "session", required = false) String session) {
        if (session == null || session.isEmpty()) {
            return ResponseEntity.status(401).body(Map.of("message", "No autenticado"));
        }

        try {
            String decoded = new String(Base64.getDecoder().decode(session), StandardCharsets.UTF_8); 
            ObjectMapper objectMapper = new ObjectMapper();
            Map<String, Object> userData = objectMapper.readValue(decoded, new TypeReference<Map<String, Object>>() {});
            String isAdmin = String.valueOf(userData.get("is_admin"));
            if ("true".equalsIgnoreCase(isAdmin)) {
                DatabaseConnector.execute("DELETE FROM users WHERE id = " + userId);
                return ResponseEntity.ok(Map.of("message", "Usuario eliminado"));
            } else {
                return ResponseEntity.status(403).body(Map.of("message", "No autorizado"));
            }

        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Sesión inválida"));
        }
    }
    @PostMapping("/api/v1/users/import")
    public ResponseEntity<?> importUsers(@RequestBody Map<String, String> body) {
        String url = body.get("url");
        System.out.println("Importando usuarios desde: " + url);

        String responseBody = "";

        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .build();
            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            responseBody = response.body();

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> usersData = mapper.readValue(response.body(), new TypeReference<>() {});

            for (Map<String, Object> user : usersData) {
                System.out.println("Importando usuario: " + user);
                DatabaseConnector.execute(
                    "INSERT INTO users (username, firstname, lastname, email, password, is_admin) VALUES (?, ?, ?, ?, ?, ?)",
                    user.get("username"), user.get("firstname"), user.get("lastname"),
                    user.get("email"), user.get("password"), user.get("is_admin")
                );
            }

            return ResponseEntity.ok(Map.of("message", "Usuarios importados exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error en la solicitud: " + e.getMessage(),"response", responseBody));
        }
    }

    @PostMapping("/api/v1/users/import-xml")
    public ResponseEntity<?> importUsersXml(@RequestBody Map<String, String> body) {
        String xmlData = body.get("xml").strip();
        System.out.println("XML recibido: " + xmlData);

        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            DocumentBuilder db = dbf.newDocumentBuilder();
            InputSource is = new InputSource(new StringReader(xmlData));
            Document doc = db.parse(is);

            NodeList users = doc.getElementsByTagName("user");

            for (int i = 0; i < users.getLength(); i++) {
                Element user = (Element) users.item(i);
                String username = user.getElementsByTagName("username").item(0).getTextContent();
                String firstname = user.getElementsByTagName("firstname").item(0).getTextContent();
                String lastname = user.getElementsByTagName("lastname").item(0).getTextContent();
                String email = user.getElementsByTagName("email").item(0).getTextContent();
                String password = user.getElementsByTagName("password").item(0).getTextContent();

                DatabaseConnector.execute(
                    "INSERT INTO users (username, firstname, lastname, email, password) VALUES (?, ?, ?, ?, ?)",
                    username, firstname, lastname, email, password
                );
            }

            return ResponseEntity.ok(Map.of("message", "Usuarios importados desde XML exitosamente"));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("message", "Error al procesar el XML: " + e.getMessage()));
        }
    }
    @PostMapping("/api/v1/ping")
    public ResponseEntity<?> ping(@RequestParam String host) {
        try {
            System.out.println("Realizando ping a: " + host);
            String os = System.getProperty("os.name").toLowerCase();
            String command;

            if (os.contains("win")) {
                command = "ping -n 2 " + host;
            } else {
                command = "ping -c 2 " + host;
            }
            Process process = Runtime.getRuntime().exec(command);
            process.waitFor();
            String output;
            try (Scanner scanner = new Scanner(process.getInputStream()).useDelimiter("\\A")) {
                output = scanner.hasNext() ? scanner.next() : "";
            }

            return ResponseEntity.ok(Map.of(
                    "output", output
            ));
        } catch (IOException | InterruptedException e) {
            return ResponseEntity.status(500).body(Map.of("message", "Error al hacer ping: " + e.getMessage()));
        }
    }
    @RestController
    @RequestMapping("/api/v1")
    public class BlogController {

        @GetMapping("/blogs")
        public List<Map<String, Object>> getBlogs(@CookieValue(value = "session", required = false) String session) {
            try {
                String query = "SELECT * FROM blogs";
                if (session == null || session.isEmpty()) {
                    query = "SELECT * FROM blogs WHERE is_private = false";
                }
                return DatabaseConnector.query(query);
            } catch (Exception e) {
                e.printStackTrace();
                return List.of(Map.of("message", "Error inesperado"));
            }
        }

        @GetMapping("/blog/{blog_id}")
        public Map<String, Object> getBlogById(@PathVariable int blog_id) {
            try {
                String query = "SELECT * FROM blogs WHERE id = " + blog_id;
                List<Map<String, Object>> blog = DatabaseConnector.query(query);
                if (blog.isEmpty()) return Map.of("error", "Blog no encontrado");
                return blog.get(0);
            } catch (Exception e) {
                e.printStackTrace();
                return Map.of("error", "Error interno del servidor");
            }
        }

        @PostMapping("/blog/{blog_id}/comments")
        public Map<String, Object> addComment(
                @PathVariable int blog_id,
                @RequestParam(value = "content", defaultValue = "") String content,
                @RequestParam(value = "files", required = false) List<MultipartFile> files,
                HttpServletRequest request
        ) {
            String username = "Anónimo";
            try {
                String sessionCookie = Arrays.stream(request.getCookies())
                        .filter(c -> c.getName().equals("session"))
                        .findFirst()
                        .map(Cookie::getValue)
                        .orElse(null);

                if (sessionCookie != null) {
                    String json = new String(Base64.getDecoder().decode(sessionCookie));
                    Map<String, Object> userData = new ObjectMapper().readValue(json, Map.class);
                    int userId = (int) userData.get("id");
                    List<Map<String, Object>> user = DatabaseConnector.query("SELECT username FROM users WHERE id = " + userId);
                    if (!user.isEmpty()) username = (String) user.get(0).get("username");
                }

                String insert = "INSERT INTO comments (blog_id, writer, comment) VALUES (" + blog_id + ", '" + username + "', '" + content + "')";
                DatabaseConnector.query(insert);

                List<Map<String, Object>> commentIdList = DatabaseConnector.query("SELECT MAX(id) FROM comments WHERE blog_id = " + blog_id);
                int commentId = ((Number) commentIdList.get(0).get("MAX(id)")).intValue();

                List<Map<String, Object>> fileEntries = new ArrayList<>();
                if (files != null) {
                    for (MultipartFile file : files) {
                        String filePath = "/uploads/" + file.getOriginalFilename();
                        Path uploadsPath = Paths.get(UPLOAD_FOLDER2, file.getOriginalFilename());
                        try {
                            Files.createDirectories(uploadsPath.getParent());
                            file.transferTo(uploadsPath);
                            String q = "INSERT INTO comment_files (comment_id, file_path) VALUES (" + commentId + ", '" + filePath + "')";
                            DatabaseConnector.query(q);
                            fileEntries.add(Map.of("comment_id", commentId, "file_path", filePath));
                        } catch (IOException e) {
                            e.printStackTrace();
                        }
                    }
                }

                return Map.of(
                        "message", "Comentario agregado con éxito",
                        "comment", Map.of(
                                "id", commentId,
                                "content", content,
                                "author", username,
                                "files", fileEntries
                        )
                );

            } catch (Exception e) {
                e.printStackTrace();
                return Map.of("message", "Error interno del servidor");
            }
        }

        @GetMapping("/blog/{blog_id}/comments")
        public Map<String, Object> getComments(@PathVariable int blog_id) {
            try {
                String query = "SELECT * FROM comments WHERE blog_id = " + blog_id;
                List<Map<String, Object>> comments = DatabaseConnector.query(query);

                List<Map<String, Object>> enriched = new ArrayList<>();
                for (Map<String, Object> comment : comments) {
                    int commentId = (int) comment.get("id");
                    List<Map<String, Object>> files = DatabaseConnector.query("SELECT * FROM comment_files WHERE comment_id = " + commentId);
                    comment.put("files", files);
                    enriched.add(comment);
                }

                return Map.of("comments", enriched);
            } catch (Exception e) {
                e.printStackTrace();
                return Map.of("message", "Error interno del servidor");
            }
        }

        @PostMapping("/blog")
        public Map<String, Object> createBlog(@RequestBody Map<String, Object> data, HttpSession session) {
            try {
                String title = (String) data.get("title");
                String content = (String) data.get("content");
                String author = (String) data.getOrDefault("author", "Anónimo");
                String url = (String) data.get("url");
                String isPrivate = String.valueOf(data.getOrDefault("is_private", "0"));

                if (title == null || content == null) {
                    return Map.of("message", "El título y el contenido son obligatorios.");
                }

                if (session.getAttribute("user_id") != null) {
                    int userId = (int) session.getAttribute("user_id");
                    List<Map<String, Object>> user = DatabaseConnector.query("SELECT firstname, lastname FROM users WHERE id = " + userId);
                    if (!user.isEmpty()) {
                        author = user.get(0).get("firstname") + " " + user.get(0).get("lastname");
                    }
                }

                String query = "INSERT INTO blogs (title, content, author, url, is_private) VALUES ('" + title + "', '" + content + "', '" + author + "', '" + url + "', " + isPrivate + ")";
                DatabaseConnector.query(query);

                return Map.of("message", "Blog creado con éxito");
            } catch (Exception e) {
                e.printStackTrace();
                return Map.of("message", "Error interno del servidor");
            }
        }
    }

    @Autowired
    private Configuration freemarkerConfig;

    @GetMapping("/api/v1/update-welcome")
    @ResponseBody
    public String updateWelcome(@RequestParam(required = false, defaultValue = "Guest") String username) throws IOException, TemplateException {
        String templateString = "Bienvenido ${username}!";
        StringWriter stringWriter = new StringWriter();
        
        Template template = new Template("welcome", templateString, freemarkerConfig);
        template.process(java.util.Collections.singletonMap("username", username), stringWriter);
        return stringWriter.toString();
    }

}

