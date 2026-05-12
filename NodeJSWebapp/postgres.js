const { Pool } = require('pg');

const dbConfig  = {
  host: 'db',
  user: 'admin',
  password: 'admin',
  database: 'web_app',
  port: 5432
};

const pool = new Pool(dbConfig);

async function queryCore(sql, params = []) {
  let completeSql = sql;
  for (let i = 0; i < params.length; i++) {
    let param = params[i];
    let value;
    if (param === null || param === undefined) {
      value = 'NULL';
    } else if (typeof param === 'number') {
      value = param;
    } else if (Array.isArray(param)) {
      value = `ARRAY[${param.map(p => (typeof p === 'number' ? p : `'${p}'`)).join(',')}]`;
    } else {
      value = `'${param}'`;
    }
    completeSql = completeSql.replace(`$${i+1}`, value);
  }
  const res = await pool.query(completeSql);
  const rows = res.rows || [];
  const affectedRows = res.rowCount || 0;
  const insertId = rows.length && rows[0].id != null ? rows[0].id : undefined;
  return { rows, affectedRows, insertId };
}

async function queryDb(sql, params = []) {
  const { rows } = await queryCore(sql, params);
  return rows;
}

async function insertUser(username, firstname, lastname, email, hashedPassword, avatarPath, isAdmin = 0) {
  const q = `
    INSERT INTO users (username, firstname, lastname, email, password, avatar, is_admin)
    VALUES ($1,$2,$3,$4,$5,$6,$7)
    RETURNING id
  `;
  const { insertId } = await queryCore(q, [username, firstname, lastname, email, hashedPassword, avatarPath, !!isAdmin]);
  return { insertId };
}

async function getUserByUsername(username) {
  const q = `SELECT * FROM users WHERE username = $1`;
  const { rows } = await queryCore(q, [username]);
  return rows;
}

async function getUserById(id) {
  const q = `SELECT id, username, firstname, lastname, email, avatar FROM users WHERE id = $1`;
  const { rows } = await queryCore(q, [id]);
  return rows;
}

async function updateUserProfile(userId, { firstName, lastName, email, newHashedPassword, avatarPath }) {
  const sets = [];
  const vals = [];
  if (firstName != null) { sets.push(`firstname = $${sets.length + 1}`); vals.push(firstName); }
  if (lastName  != null) { sets.push(`lastname  = $${sets.length + 1}`); vals.push(lastName); }
  if (email     != null) { sets.push(`email     = $${sets.length + 1}`); vals.push(email); }
  if (newHashedPassword) { sets.push(`password  = $${sets.length + 1}`); vals.push(newHashedPassword); }
  if (avatarPath)        { sets.push(`avatar    = $${sets.length + 1}`); vals.push(avatarPath); }
  vals.push(userId);
  const q = `UPDATE users SET ${sets.join(', ')} WHERE id = $${sets.length + 1}`;
  const { affectedRows } = await queryCore(q, vals);
  return { affectedRows };
}

async function listUsers() {
  const q = `SELECT id, username, email, is_admin FROM users`;
  const { rows } = await queryCore(q);
  return rows;
}

async function toggleAdmin(id) {
  const q = `UPDATE users SET is_admin = NOT is_admin WHERE id = $1`;
  const { affectedRows } = await queryCore(q, [id]);
  return { affectedRows };
}

async function deleteUser(id) {
  const q = `DELETE FROM users WHERE id = $1`;
  const { affectedRows } = await queryCore(q, [id]);
  return { affectedRows };
}

async function listAllBlogs() {
  const q = `SELECT * FROM blogs`;
  const { rows } = await queryCore(q);
  return rows;
}

async function listPublicBlogs() {
  const q = `SELECT * FROM blogs WHERE is_private = false`;
  const { rows } = await queryCore(q);
  return rows;
}

async function getBlogById(id) {
  const q = `SELECT * FROM blogs WHERE id = $1`;
  const { rows } = await queryCore(q, [id]);
  return rows;
}

async function createBlog({ title, content, authorName, url, is_private }) {
  const q = `
    INSERT INTO blogs (title, content, author, url, is_private)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING id
  `;
  const { insertId } = await queryCore(q, [title, content, authorName || 'anonimo', url, !!is_private]);
  return { insertId };
}

async function insertComment(blogId, writer, comment) {
  const q = `
    INSERT INTO comments (blog_id, writer, comment)
    VALUES ($1,$2,$3)
    RETURNING id
  `;
  const { insertId } = await queryCore(q, [blogId, writer, comment]);
  return { insertId };
}

async function insertCommentFiles(commentId, filePaths) {
  if (!filePaths || !filePaths.length) return { affectedRows: 0 };
  let valuesArray = filePaths.map(fp => (typeof fp === 'number' ? fp : `'${fp}'`)).join(',');
  const q = `
    INSERT INTO comment_files (comment_id, file_path)
    SELECT ${commentId}, unnest(ARRAY[${valuesArray}])
  `;
  const { affectedRows } = await queryCore(q);
  return { affectedRows };
}

async function listCommentsByBlogId(blogId) {
  const q = `SELECT * FROM comments WHERE blog_id = $1`;
  const { rows } = await queryCore(q, [blogId]);
  return rows;
}

async function listFilesByCommentId(commentId) {
  const q = `SELECT * FROM comment_files WHERE comment_id = $1`;
  const { rows } = await queryCore(q, [commentId]);
  return rows;
}

async function getUserNameById(userId) {
  const q = `SELECT firstname, lastname FROM users WHERE id = $1`;
  const { rows } = await queryCore(q, [userId]);
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