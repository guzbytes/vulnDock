<?php

class DatabaseConnector {
    private $pdo;

    public function __construct() {
        $host = 'db';
        $db   = 'web_app';
        $user = 'sa';
        $pass = 'YourStrong!Passw0rd';
        $dsn = "sqlsrv:Server=$host;Database=$db";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ];
        $this->pdo = new PDO($dsn, $user, $pass, $options);
    }

    private function buildVulnerableQuery($sql, $params) {
        foreach ($params as $param) {
            if ($param === null) {
                $value = 'NULL';
            } elseif (is_numeric($param)) {
                $value = $param;
            } else {
                $value = "'" . str_replace("'", "''", $param) . "'";
            }
            $sql = preg_replace('/\?/', $value, $sql, 1);
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