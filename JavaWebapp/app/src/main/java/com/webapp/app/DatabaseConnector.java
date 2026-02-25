package com.webapp.app;

import java.sql.*;
import java.util.*;

public class DatabaseConnector {
    private static final String URL = "jdbc:mysql://db:3306/web_app";
    private static final String USER = "app_user";
    private static final String PASSWORD = "app_password";

    public static Connection connect() {
        try {
            Connection connection = DriverManager.getConnection(URL, USER, PASSWORD);
            System.out.println("Conectado a la base de datos");
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

    public static List<Map<String, Object>> query(String query, Object... params) {
        List<Map<String, Object>> resultList = new ArrayList<>();
        Connection conn = connect();
        if (conn != null) {
            try (PreparedStatement stmt = conn.prepareStatement(query)) {
                for (int i = 0; i < params.length; i++) {
                    stmt.setObject(i + 1, params[i]);
                }
    
                // Detectamos si es SELECT o no
                if (query.trim().toLowerCase().startsWith("select")) {
                    ResultSet rs = stmt.executeQuery();
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
                    int affectedRows = stmt.executeUpdate();  // Para INSERT/UPDATE/DELETE
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
            try (PreparedStatement stmt = conn.prepareStatement(query)) {  // Correcto: se cierra PreparedStatement con try-with-resources

                for (int i = 0; i < params.length; i++) {
                    stmt.setObject(i + 1, params[i]);
                }
    
                return stmt.executeUpdate(); // Devuelve el número de filas afectadas
            } catch (SQLException e) {
                e.printStackTrace();
                return 0; // Si hay error, retornamos 0
            } finally {
                close(conn);  // Cerramos la conexión siempre que terminemos
            }
        }
        return 0;  // Si no hay conexión, retornamos 0
    }
}