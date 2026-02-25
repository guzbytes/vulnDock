const sql = require('mssql');

const dbConfig = {
  user: 'sa',
  password: 'YourStrong!Passw0rd',
  server: 'db',
  database: 'web_app',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function connectDb() {
  try {
    const pool = await sql.connect(dbConfig);
    return pool;
  } catch (error) {
    console.error('Error de conexión MSSQL:', error);
    return null;
  }
}

function toNamedQuery(query) {
  let i = 0;
  return query.replace(/\?/g, () => `@p${++i}`);
}

async function exec(query, params = []) {
  const pool = await connectDb();
  if (!pool) return { rows: null, affectedRows: 0, insertId: undefined };

  try {
    const request = pool.request();
    params.forEach((param, i) => request.input(`p${i + 1}`, param));
    const namedQuery = toNamedQuery(query);
    const result = await request.query(namedQuery);

    const rows = result.recordset || [];
    const affectedRows = Array.isArray(result.rowsAffected)
      ? result.rowsAffected.reduce((a, b) => a + b, 0)
      : 0;
    const insertId = rows.length && rows[0].id != null ? rows[0].id : undefined;

    return { rows, affectedRows, insertId };
  } catch (error) {
    console.error('Error en consulta MSSQL:', error);
    return { rows: null, affectedRows: 0, insertId: undefined };
  } finally {
    try { await pool.close(); } catch {}
  }
}

async function queryDb(query, params = []) {
  const { rows } = await exec(query, params);
  return rows;
}

/* ------------------------- Repositorio: USERS ------------------------- */

async function insertUser(username, firstname, lastname, email, password, avatar, isAdmin = 0) {
  const q = `
    INSERT INTO users (username, firstname, lastname, email, password, avatar, is_admin)
    OUTPUT INSERTED.id AS id
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  const { insertId } = await exec(q, [username, firstname, lastname, email, password, avatar, isAdmin ? 1 : 0]);
  return { insertId };
}

async function getUserByUsername(username) {
  const q = `SELECT * FROM users WHERE username = ?`;
  const rows = await queryDb(q, [username]);
  return rows;
}

async function getUserById(id) {
  const q = `SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = ?`;
  const rows = await queryDb(q, [id]);
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
  const q = `UPDATE users SET ${sets.join(', ')} WHERE id = ?`;
  const { affectedRows } = await exec(q, vals);
  return { affectedRows };
}

async function listUsers() {
  const q = `SELECT id, username, email, is_admin FROM users`;
  const rows = await queryDb(q);
  return rows;
}

async function toggleAdmin(id) {
  const q = `UPDATE users SET is_admin = CASE WHEN is_admin = 1 THEN 0 ELSE 1 END WHERE id = ?`;
  const { affectedRows } = await exec(q, [id]);
  return { affectedRows };
}

async function deleteUser(id) {
  const q = `DELETE FROM users WHERE id = ?`;
  const { affectedRows } = await exec(q, [id]);
  return { affectedRows };
}

/* ------------------------- Repositorio: BLOGS ------------------------- */

async function listAllBlogs() {
  const q = `SELECT * FROM blogs`;
  const rows = await queryDb(q);
  return rows;
}

async function listPublicBlogs() {
  const q = `SELECT * FROM blogs WHERE is_private = 0`;
  const rows = await queryDb(q);
  return rows;
}

async function getBlogById(id) {
  const q = `SELECT * FROM blogs WHERE id = ?`;
  const rows = await queryDb(q, [id]);
  return rows;
}

async function createBlog({ title, content, authorName, url, is_private }) {
  const q = `
    INSERT INTO blogs (title, content, author, url, is_private)
    OUTPUT INSERTED.id AS id
    VALUES (?, ?, ?, ?, ?)
  `;
  const author = (authorName && authorName.trim()) ? authorName : 'anonimo';
  const { insertId } = await exec(q, [title, content, author, url, is_private ? 1 : 0]);
  return { insertId };
}

/* ----------------------- Repositorio: COMMENTS ------------------------ */

async function insertComment(blogId, writer, comment) {
  const q = `
    INSERT INTO comments (blog_id, writer, comment)
    OUTPUT INSERTED.id AS id
    VALUES (?, ?, ?)
  `;
  const { insertId } = await exec(q, [blogId, writer, comment]);
  return { insertId };
}

async function insertCommentFiles(commentId, filePaths) {
  if (!filePaths || !filePaths.length) return { affectedRows: 0 };

  let total = 0;
  for (const fp of filePaths) {
    const q = `INSERT INTO comment_files (comment_id, file_path) VALUES (?, ?)`;
    const { affectedRows } = await exec(q, [commentId, fp]);
    total += affectedRows;
  }
  return { affectedRows: total };
}

async function listCommentsByBlogId(blogId) {
  const q = `SELECT * FROM comments WHERE blog_id = ?`;
  const rows = await queryDb(q, [blogId]);
  return rows;
}

async function listFilesByCommentId(commentId) {
  const q = `SELECT * FROM comment_files WHERE comment_id = ?`;
  const rows = await queryDb(q, [commentId]);
  return rows;
}

async function getUserNameById(userId) {
  const q = `SELECT firstname, lastname FROM users WHERE id = ?`;
  const rows = await queryDb(q, [userId]);
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