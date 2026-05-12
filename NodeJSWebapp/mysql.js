const mysql = require('mysql2/promise');

const dbConfig = {
  host: 'db',
  user: 'app_user',
  password: 'app_password',
  database: 'web_app'
};

async function connectDb() {
  try {
    const connection = await mysql.createConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error('Error de conexión:', error);
    return null;
  }
}

async function exec(sql, params = []) {
  let CompleteSQL = sql;
  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    let value;
    if (param === null || param === undefined) {
      value = 'NULL';
    } else if (typeof param === 'number') {
      value = param;
    } else {
      value = `'${param}'`;
    }
    CompleteSQL = CompleteSQL.replace('?', value);
  }
  const [rows] = await connection.query(CompleteSQL);
}

async function queryDb(query, params = []) {
  const { rows } = await exec(query, params);
  return rows;
}

async function insertUser(username, firstname, lastname, email, password, avatar, isAdmin = 0) {
  const sql = `
    INSERT INTO users (username, firstname, lastname, email, password, avatar, is_admin)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const { insertId } = await exec(sql, [username, firstname, lastname, email, password, avatar, isAdmin ? 1 : 0]);
  return { insertId };
}

async function getUserByUsername(username) {
  const sql = `SELECT * FROM users WHERE username = ?`;
  const rows = await queryDb(sql, [username]);
  return rows;
}

async function getUserById(id) {
  const sql = `SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = ?`;
  const rows = await queryDb(sql, [id]);
  return rows;
}

async function updateUserProfile(userId, { firstName, lastName, email, newHashedPassword, avatarPath }) {
  const sets = [];
  const vals = [];
  if (firstName != null) { sets.push('firstname = ?'); vals.push(firstName); }
  if (lastName  != null) { sets.push('lastname  = ?'); vals.push(lastName);  }
  if (email     != null) { sets.push('email     = ?'); vals.push(email);     }
  if (newHashedPassword) { sets.push('password  = ?'); vals.push(newHashedPassword); }
  if (avatarPath)        { sets.push('avatar    = ?'); vals.push(avatarPath); }

  if (sets.length === 0) return { affectedRows: 0 };

  vals.push(userId);
  const sql = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
  const { affectedRows } = await exec(sql, vals);
  return { affectedRows };
}

async function listUsers() {
  const sql = `SELECT id, username, email, is_admin FROM users`;
  const rows = await queryDb(sql);
  return rows;
}

async function toggleAdmin(id) {
  const sql = `UPDATE users SET is_admin = NOT is_admin WHERE id = ?`;
  const { affectedRows } = await exec(sql, [id]);
  return { affectedRows };
}

async function deleteUser(id) {
  const sql = `DELETE FROM users WHERE id = ?`;
  const { affectedRows } = await exec(sql, [id]);
  return { affectedRows };
}

/* ------------------------- Repositorio: BLOGS ------------------------- */

async function listAllBlogs() {
  const sql = `SELECT * FROM blogs`;
  const rows = await queryDb(sql);
  return rows;
}

async function listPublicBlogs() {
  // En MySQL, FALSE equivale a 0; también puedes usar `is_private = 0`
  const sql = `SELECT * FROM blogs WHERE is_private = FALSE`;
  const rows = await queryDb(sql);
  return rows;
}

async function getBlogById(id) {
  const sql = `SELECT * FROM blogs WHERE id = ?`;
  const rows = await queryDb(sql, [id]);
  return rows;
}

async function createBlog({ title, content, authorName, url, is_private }) {
  const sql = `
    INSERT INTO blogs (title, content, author, url, is_private)
    VALUES (?, ?, ?, ?, ?)
  `;
  const author = (authorName && authorName.trim()) ? authorName : 'anonimo';
  const { insertId } = await exec(sql, [title, content, author, url, is_private ? 1 : 0]);
  return { insertId };
}

/* ----------------------- Repositorio: COMMENTS ------------------------ */

async function insertComment(blogId, writer, comment) {
  const sql = `
    INSERT INTO comments (blog_id, writer, comment)
    VALUES (?, ?, ?)
  `;
  const { insertId } = await exec(sql, [blogId, writer, comment]);
  return { insertId };
}

async function insertCommentFiles(commentId, filePaths) {
  if (!filePaths || !filePaths.length) return { affectedRows: 0 };
  const values = filePaths.map(fp => [commentId, fp]);

  const connection = await connectDb();
  if (!connection) return { affectedRows: 0 };

  try {
    const [result] = await connection.query(
      'INSERT INTO comment_files (comment_id, file_path) VALUES ?',
      [values]
    );
    const affectedRows = result?.affectedRows ?? 0;
    return { affectedRows };
  } catch (error) {
    console.error('Error en bulk insert de comment_files:', error);
    return { affectedRows: 0 };
  } finally {
    try { await connection.end(); } catch {}
  }
}

async function listCommentsByBlogId(blogId) {
  const sql = `SELECT * FROM comments WHERE blog_id = ?`;
  const rows = await queryDb(sql, [blogId]);
  return rows;
}

async function listFilesByCommentId(commentId) {
  const sql = `SELECT * FROM comment_files WHERE comment_id = ?`;
  const rows = await queryDb(sql, [commentId]);
  return rows;
}

async function getUserNameById(userId) {
  const sql = `SELECT firstname, lastname FROM users WHERE id = ?`;
  const rows = await queryDb(sql, [userId]);
  if (!rows || !rows.length) return null;
  const { firstname, lastname } = rows[0];
  return `${firstname || ''} ${lastname || ''}`.trim();
}

module.exports = {
  queryDb,
  insertUser,
  getUserByUsername,
  getUserById,
  updateUserProfile,
  listUsers,
  toggleAdmin,
  deleteUser,
  listAllBlogs,
  listPublicBlogs,
  getBlogById,
  createBlog,
  insertComment,
  insertCommentFiles,
  listCommentsByBlogId,
  listFilesByCommentId,
  getUserNameById
};