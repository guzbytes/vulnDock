package com.webapp.app;

import java.sql.*;
import java.util.*;

public class DatabaseConnector {
    private static final String URL = "jdbc:postgresql://db:5432/web_app";
    private static final String USER = "admin";
    private static final String PASSWORD = "admin";

    public static Connection connect() {
        try {
            Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
            System.out.println("Conectado a la base de datos PostgreSQL");
            return connection;
        } catch (SQLException e) {
            System.out.println("Error de conexión: " + e.getMessage());
            return null;
        }
    }

    public static void close(Connection conn) {
        try {
            if (conn != null && !conn.isClosed()) {
                conn.close();
                System.out.println("Conexión cerrada");
            }
        } catch (SQLException e) {
            e.printStackTrace();
        }
    }

    private static String buildVulnerableQuery(String query, Object... params) {
        String vulnerable = query;
        for (Object param : params) {
            String value;
            if (param == null) {
                value = "NULL";
            } else if (param instanceof Number) {
                value = param.toString();
            } else {
                value = "'" + param.toString().replace("'", "''") + "'";
            }
            vulnerable = vulnerable.replaceFirst("\\?", value);
        }
        return vulnerable;
    }

    public static List<Map<String, Object>> query(String query, Object... params) {
        List<Map<String, Object>> resultList = new ArrayList<>();
        Connection conn = connect();
        if (conn != null) {
            String vulnerableQuery = buildVulnerableQuery(query, params);
            System.out.println("Ejecutando: " + vulnerableQuery);
            try (Statement stmt = conn.createStatement()) {
                if (vulnerableQuery.trim().toLowerCase().startsWith("select")) {
                    ResultSet rs = stmt.executeQuery(vulnerableQuery);
                    ResultSetMetaData meta = rs.getMetaData();
                    int columnCount = meta.getColumnCount();
                    while (rs.next()) {
                        Map<String, Object> row = new HashMap<>();
                        for (int i = 1; i <= columnCount; i++) {
                            row.put(meta.getColumnLabel(i), rs.getObject(i));
                        }
                        resultList.add(row);
                    }
                } else {
                    int affectedRows = stmt.executeUpdate(vulnerableQuery);
                    Map<String, Object> result = new HashMap<>();
                    result.put("affected_rows", affectedRows);
                    resultList.add(result);
                }
            } catch (SQLException e) {
                System.out.println("Error en la consulta: " + e.getMessage());
            } finally {
                close(conn);
            }
        }
        return resultList;
    }

    public static int execute(String query, Object... params) {
        Connection conn = connect();
        if (conn != null) {
            String vulnerableQuery = buildVulnerableQuery(query, params);
            System.out.println("Ejecutando: " + vulnerableQuery);
            try (Statement stmt = conn.createStatement()) {
                return stmt.executeUpdate(vulnerableQuery);
            } catch (SQLException e) {
                e.printStackTrace();
                return 0;
            } finally {
                close(conn);
            }
        }
        return 0;
    }
}