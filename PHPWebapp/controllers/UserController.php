<?php
class UserController {
    public function register() {
        require_once './helpers/response.php';
        require_once './services/DatabaseConnector.php';

        if (!isset($_POST['username'], $_POST['firstname'], $_POST['lastname'], $_POST['email'], $_POST['password'])) {
            return jsonResponse(['message' => 'Todos los campos son obligatorios.'], 400);
        }

        if (!isset($_FILES['avatar'])) {
            return jsonResponse(['message' => 'Debe subir un avatar.'], 400);
        }

        $username = $_POST['username'];
        $firstname = $_POST['firstname'];
        $lastname = $_POST['lastname'];
        $email = $_POST['email'];
        $password = $_POST['password'];

        $hashedPassword = password_hash($password, PASSWORD_DEFAULT); 

        $filename = basename($_FILES['avatar']['name']);
        $targetPath = "./images/avatars/$filename";
        move_uploaded_file($_FILES['avatar']['tmp_name'], $targetPath); 

        $avatarPath = "/images/avatars/$filename";

        $db = new DatabaseConnector();
        $sql = "INSERT INTO users (username, firstname, lastname, email, password, avatar)
                VALUES ('$username', '$firstname', '$lastname', '$email', '$hashedPassword', '$avatarPath')";

        try {
            $db->exec($sql);
            $id = $db->lastInsertId();
            jsonResponse([
                "message" => "Usuario registrado exitosamente.",
                "user" => [
                    "id" => $id,
                    "username" => $username,
                    "firstname" => $firstname,
                    "lastname" => $lastname,
                    "email" => $email,
                    "avatar" => $avatarPath
                ]
            ], 201);
        } catch (Exception $e) {
            jsonResponse(["message" => "Error al registrar el usuario."], 500);
        }
    }

    public function login() {
        require_once './helpers/response.php';
        require_once './services/DatabaseConnector.php';

        $username = $_POST['username'] ?? '';
        $password = $_POST['password'] ?? '';

        if (!$username || !$password) {
            return jsonResponse(["message" => "Ingrese usuario y contraseña"], 400);
        }

        $db = new DatabaseConnector();
        $sql = "SELECT * FROM users WHERE username = '$username' AND password = '$password'"; 
        $users = $db->query($sql);

        if (count($users) === 0) {
            return jsonResponse(["message" => "Usuario o contraseña incorrectos"], 401);
        }

        $user = $users[0];

        $userData = base64_encode(json_encode([
            "id" => $user['id'],
            "username" => $user['username'],
            "is_admin" => $user['is_admin']
        ]));

        setcookie("session", $userData, time() + 3600, "/", "", false, false); 

        jsonResponse(["message" => "Login exitoso", "user" => $user]);
    }

    public function getMe($user) {
        require_once './helpers/response.php';
        require_once './services/DatabaseConnector.php';

        if (!$user) return jsonResponse(["message" => "No autenticado"], 401);

        $db = new DatabaseConnector();
        $id = $user['id'];
        $sql = "SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = '$id'";
        $users = $db->query($sql);

        if (count($users) === 0) {
            return jsonResponse(["message" => "Usuario no encontrado"], 404);
        }
        jsonResponse($users[0]);
    }
    
    public function updateProfile($data, $files) {
        $db = new DatabaseConnector();

        $firstName = $data['firstName'] ?? null;
        $lastName = $data['lastName'] ?? null;
        $email = $data['email'] ?? null;
        $newPassword = $data['newPassword'] ?? null;
        $user = $GLOBALS['user']; 
        $userId = $user['id'];

        if (!$firstName || !$lastName || !$email) {
            return jsonResponse(['message' => 'Nombre, Apellidos y Correo son obligatorios.'], 400);
        }

        $avatarPath = null;
        if (isset($files['avatar']) && $files['avatar']['error'] === UPLOAD_ERR_OK) {
            $filename = basename($files['avatar']['name']);
            $targetPath = __DIR__ . '/../images/avatars/' . $filename;
            move_uploaded_file($files['avatar']['tmp_name'], $targetPath);
            $avatarPath = '/images/avatars/' . $filename;
        }

        $query = "UPDATE users SET firstname = ?, lastname = ?, email = ?";
        $params = [$firstName, $lastName, $email];

        if ($newPassword) {
            $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT);
            $query .= ", password = ?";
            $params[] = $hashedPassword;
        }

        if ($avatarPath) {
            $query .= ", avatar = ?";
            $params[] = $avatarPath;
        }

        $query .= " WHERE id = ?";
        try {
            $db->exec($query, ...$params);
            jsonResponse(['message' => 'Perfil actualizado con éxito']);
        } catch (Exception $e) {
            jsonResponse(['message' => 'Error al actualizar el perfil.'], 500);
        }

    }

    public function listUsers(array $params, array $user) {
        if (empty($user['is_admin'])) {
            return jsonResponse(['message' => 'No autorizado'], 403);
        }

        try {
            $db      = new DatabaseConnector();
            $results = $db->query('SELECT id, username, email, is_admin FROM users');

            foreach ($results as &$u) {
                $u['is_admin'] = (bool) $u['is_admin'];
            }

            return jsonResponse($results, 200);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al obtener usuarios'], 500);
        }
    }

    public function deleteUser(array $params, array $user) {
        if (empty($user['is_admin'])) {
            return jsonResponse(['message' => 'No autorizado'], 403);
        }

        $id = (int) $params['id'];
        try {
            $db   = new DatabaseConnector();
            $stmt = $db->exec("DELETE FROM users WHERE id = $id");

            if ($stmt === false) {
                return jsonResponse(['message' => 'Usuario no encontrado'], 404);
            }

            return jsonResponse(['message' => 'Usuario eliminado'], 200);
        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al eliminar usuario'], 500);
        }
    }

    public function toggleAdmin(array $params, array $user) {
        $id = (int) $params['id'];
        $db = new DatabaseConnector();

        try {
            $db->exec(
                "UPDATE users
                   SET is_admin = NOT is_admin
                 WHERE id = $id"
            );

            return jsonResponse(['message' => 'Rol de admin actualizado correctamente'], 200);

        } catch (PDOException $e) {
            return jsonResponse(['message' => 'Error al actualizar el rol de admin'], 500);
        }
    }
}
