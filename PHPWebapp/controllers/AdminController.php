<?php

require_once __DIR__ . '/../services/DatabaseConnector.php';
require_once __DIR__ . '/../helpers/response.php';

class AdminController {

    public function importUsers($data, $files) {
        $db = new DatabaseConnector();

        $rawInput = file_get_contents('php://input');
        $data = json_decode($rawInput, true);
        
        $url = $data['url'] ?? '';
        if (!$url) {
            return jsonResponse(['message' => 'URL no válida'], 400);
        }

        try {
            $json = @file_get_contents($url);
            if ($json === false) {
                $error = error_get_last();
                return jsonResponse([
                    'message' => 'Error al leer URL',
                    'url' => $url,
                    'content' => $json,
                    'error' => $error['message'] ?? 'Error desconocido',
                    'connection_status' => connection_status()
                ], 500);            
            }
            $users = json_decode($json, true);
            if (!is_array($users)) {
                    $error = error_get_last();
                return jsonResponse([
                    'message' => 'Error al leer URL',
                    'url' => $url,
                    'content' => $json,
                    'error' => $error['message'] ?? 'Error desconocido',
                    'connection_status' => connection_status()
                ], 500);
            }

            foreach ($users as $user) {
                $username  = addslashes($user['username']  ?? '');
                $email     = addslashes($user['email']     ?? '');
                $firstname = addslashes($user['firstname'] ?? '');
                $lastname  = addslashes($user['lastname']  ?? '');
                $password  = password_hash($user['password'] ?? '', PASSWORD_BCRYPT);
                $isAdmin   = !empty($user['is_admin']) ? 1 : 0;

                $query = "
                    INSERT INTO users
                      (username, email, firstname, lastname, password, is_admin)
                    VALUES
                      ('$username', '$email', '$firstname', '$lastname', '$password', $isAdmin)
                ";
                $db->exec($query);
            }

            return jsonResponse(['message' => 'Usuarios importados correctamente.'], 200);

        } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al importar usuarios: ' . $e->getMessage()], $json, 500);
        }
    }

    public function importUsersFromXML($data, $files) {
        $json = file_get_contents('php://input');
        $data = json_decode($json, true);        
        if (empty($data['xml'])) {
            return jsonResponse(['message' => 'XML vacío'], 400);
        }

        $xml = $data['xml'];


        libxml_disable_entity_loader(false);
        libxml_use_internal_errors(true); 
        $dom = new DOMDocument();
        $dom->loadXML($xml, LIBXML_NOENT | LIBXML_DTDLOAD | LIBXML_DTDATTR);
        $dom->validateOnParse = true;

        try {
            $xpath = new DOMXpath($dom);
            $users = $xpath->evaluate('//user');

            $db = new DatabaseConnector();
            $processed_users = [];

            foreach ($users as $user) {
                $username  = $user->getElementsByTagName('username')->item(0)->nodeValue ?? '';
                $email     = $user->getElementsByTagName('email')->item(0)->nodeValue ?? '';
                $firstname = $user->getElementsByTagName('firstname')->item(0)->nodeValue ?? '';
                $lastname  = $user->getElementsByTagName('lastname')->item(0)->nodeValue ?? '';
                $password  = $user->getElementsByTagName('password')->item(0)->nodeValue ?? '';
                $isAdmin   = $user->getElementsByTagName('is_admin')->item(0)->nodeValue === 'true' ? 1 : 0;

                $query = "INSERT INTO users (username, email, firstname, lastname, password, is_admin)
                        VALUES ('$username', '$email', '$firstname', '$lastname', '" . password_hash($password, PASSWORD_BCRYPT) . "', $isAdmin)";
                $db->exec($query);

                $processed_users[] = [
                    'username' => $username,
                    'email' => $email,
                    'is_admin' => $isAdmin
                ];
            }

            return jsonResponse([
                'message' => 'Usuarios importados desde XML',
                'processed_users' => $processed_users,
                'xml_processed' => $xml,
                'expanded_xml' => $dom->saveXML()
            ], 200);        
            } catch (Exception $e) {
            return jsonResponse(['message' => 'Error al procesar el XML: ' . $e->getMessage()], 500);
        } 
    }


    public function pingHost($data, $files) {
        $host = $data['host'] ?? '';

        if (empty($host)) {
            return jsonResponse(['message' => 'Host no proporcionado'], 400);
        }

        $isWindows = (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN');
        $pingCommand = $isWindows ? "ping -n 4 $host" : "ping -c 4 $host";

        exec($pingCommand . " 2>&1", $output, $status);

        if ($status !== 0) {
            return jsonResponse(['message' => 'Error al ejecutar el ping.', 'output' => $output], 500);
        }

        return jsonResponse(['output' => implode("\n", $output)], 200);
    }
}