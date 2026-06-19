<?php

require_once __DIR__ . '/../services/DatabaseConnector.php';
require_once __DIR__ . '/../helpers/response.php';

class BlogController {

    public function listBlogs($user) {
        $db = new DatabaseConnector();
        try {
            $query = $user ? "SELECT * FROM blogs" : "SELECT * FROM blogs WHERE is_private = false";
            $blogs = $db->query($query);
            return jsonResponse($blogs);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al obtener los blogs.'], 500);
        }
    }

    public function getBlogById($data) {
        $db = new DatabaseConnector();
        $blog_id = urldecode($data['blog_id']);

        try {
            $query = "SELECT * FROM blogs WHERE id = $blog_id";
            $result = $db->query($query);
            if (count($result) === 0) {
                return jsonResponse(['message' => 'Blog no encontrado'], 404);
            }
            return jsonResponse($result[0]);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al obtener el blog.',
                                'error' => $e->getMessage(),
                                'query' => $query], 500);
        }
    }

    public function createBlog($data, $user) {
        $db = new DatabaseConnector();

        $title = addslashes($data['title'] ?? '');
        $content = addslashes($data['content'] ?? '');
        $url = addslashes($data['url'] ?? '');
        $is_private = isset($data['is_private']) ? (int)$data['is_private'] : 0;
        $author = addslashes($data['author'] ?? 'Anónimo');

        if (!$title || !$content) {
            return jsonResponse(['message' => 'El título y el contenido son obligatorios.'], 400);
        }

        if ($user) {
            $userId = $user['id'];
            $queryUser = "SELECT firstname, lastname FROM users WHERE id = $userId";
            $result = $db->query($queryUser);
            if (count($result) > 0) {
                $author = addslashes($result[0]['firstname'] . ' ' . $result[0]['lastname']);
            }
        }

        try {
            $sql = "INSERT INTO blogs (title, content, author, url, is_private)
                    VALUES ('$title', '$content', '$author', '$url', $is_private)";
            $db->exec($sql);
            $id = $db->lastInsertId();

            return jsonResponse(['message' => 'Blog creado con éxito', 'blogId' => $id], 201);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al crear el blog.'], 500);
        }
    }

    public function addComment($data, $files, $params, $user) {
        $db = new DatabaseConnector();
        $blog_id = (int) $params['blog_id'];
        $content = addslashes($data['content'] ?? '');
        $username = addslashes($user['username'] ?? 'Anónimo');

        if (!$content) {
            return jsonResponse(['message' => 'El comentario no puede estar vacío'], 400);
        }

        try {
            $sql = "INSERT INTO comments (blog_id, writer, comment) VALUES ($blog_id, '$username', '$content')";
            $db->exec($sql);
            $commentId = $db->lastInsertId();

            $savedFiles = [];
            
            echo "Existo ";
            if (!empty($files['files']['tmp_name'])) {
                $savedFiles = [];
                $uploaded = $files['files'] ?? null;

                if ($uploaded && (is_array($uploaded['tmp_name']))) {
                    $names     = $uploaded['name'];
                    $tmp_names = $uploaded['tmp_name'];
                } elseif ($uploaded && !empty($uploaded['tmp_name'])) {
                    $names     = [ $uploaded['name'] ];
                    $tmp_names = [ $uploaded['tmp_name'] ];
                } else {
                    $names     = [];
                    $tmp_names = [];
                }

                foreach ($tmp_names as $i => $tmpName) {
                    $filename   = basename($names[$i]);
                    $uploadPath = $_SERVER['DOCUMENT_ROOT'] . '/uploads/' . $filename;
                    error_log("Moviendo $tmpName → $uploadPath");
                    if (move_uploaded_file($tmpName, $uploadPath)) {
                        $file_path = addslashes('/uploads/' . $filename);
                        $db->exec("INSERT INTO comment_files (comment_id, file_path) VALUES ($commentId, '$file_path')");
                        $savedFiles[] = ['file_path' => $file_path];
                        error_log("Guardado: $file_path");
                    } else {
                        error_log("Error moviendo $tmpName");
                    }
                }
            
            } 

            return jsonResponse([
                'message' => 'Comentario agregado con éxito',
                'comment' => [
                    'id' => $commentId,
                    'content' => stripslashes($content),
                    'author' => stripslashes($username),
                    'files' => $savedFiles
                ]
            ], 201);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al insertar el comentario.'], 500);
        }
    }

    public function getComments($params) {
        $db = new DatabaseConnector();
        $blog_id = (int) $params['blog_id'];

        try {
            $comments = $db->query("SELECT * FROM comments WHERE blog_id = $blog_id");

            foreach ($comments as &$comment) {
                $comment_id = $comment['id'];
                $files = $db->query("SELECT * FROM comment_files WHERE comment_id = $comment_id");
                $comment['files'] = array_map(function ($file) {
                    return ['file_path' => $file['file_path']];
                }, $files);
            }

            return jsonResponse(['comments' => $comments]);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al obtener comentarios'], 500);
        }
    }
}
