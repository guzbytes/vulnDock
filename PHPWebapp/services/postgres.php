<?php

class DatabaseConnector {
    private $pdo;

    public function __construct() {
        $host = 'db';
        $db   = 'web_app';
        $user = 'admin';
        $pass = 'admin';
        $dsn = "pgsql:host=$host;dbname=$db";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        $this->pdo = new PDO($dsn, $user, $pass, $options);
    }

    private function buildVulnerableQuery($sql, $params) {
        foreach ($params as $idx => $param) {
            if ($param === null) {
                $value = 'NULL';
            } elseif (is_numeric($param)) {
                $value = $param;
            } else {
                $value = "'" . str_replace("'", "''", $param) . "'";
            }
            $placeholder = '$' . ($idx + 1);
            $sql = str_replace($placeholder, $value, $sql);
        }
        return $sql;
    }

    public function query($sql, ...$params) {
        $vulnSql = $this->buildVulnerableQuery($sql, $params);
        $stmt = $this->pdo->query($vulnSql);
        return $stmt->fetchAll();
    }

    public function exec($sql, ...$params) {
        $vulnSql = $this->buildVulnerableQuery($sql, $params);
        return $this->pdo->exec($vulnSql);
    }

    public function lastInsertId() {
        return $this->pdo->lastInsertId();
    }
}