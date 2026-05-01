const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'db-apache',
  user: 'app_user',
  password: 'app_password',
  database: 'web_app',
  charset: 'utf8mb4'
};

async function connectDb() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.query("SET NAMES utf8mb4");
    await connection.query("SET CHARACTER SET utf8mb4");
    await connection.query("SET character_set_connection = utf8mb4");
    return connection;
  } catch (error) {
    console.error('Error de conexión:', error);
    return null;
  }
}

async function exec(sql, params = []) {
  const connection = await connectDb();
  if (!connection) return { rows: null, affectedRows: 0, insertId: undefined };
  try {
    const [rows] = await connection.execute(sql, params);
    const isHeader = rows && typeof rows.affectedRows === 'number';
    const affectedRows = isHeader ? rows.affectedRows : 0;
    const insertId = isHeader && rows.insertId ? rows.insertId : undefined;
    const dataRows = Array.isArray(rows) ? rows : [];
    return { rows: dataRows, affectedRows, insertId };
  } catch (error) {
    console.error('Error en la consulta:', error);
    return { rows: null, affectedRows: 0, insertId: undefined };
  } finally {
    try { await connection.end(); } catch {}
  }
}

async function queryDb(query, params = []) {
  const { rows } = await exec(query, params);
  return rows;
}

/* ------------------------- Repositorio: BLOGS ------------------------- */

async function listAllBlogs() {
  const sql = `SELECT * FROM blogs`;
  const rows = await queryDb(sql);
  return rows;
}


async function getBlogById(id) {
  const sql = `SELECT * FROM blogs WHERE id = ${id}`;
  const result = await exec(sql);
  return result.rows;
}

module.exports = {
  queryDb,
  listAllBlogs,
  getBlogById,
};