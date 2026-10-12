const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const findByEmail = async (email) => (await query('select * from users where email = $1', [email.trim().toLowerCase()])).rows[0] || null;
const findById = async (id) => (await query('select * from users where id = $1', [id])).rows[0] || null;

async function createUser({ name, email, phone, password, role = 'buyer', mustChangePassword = false }, client = { query }) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await client.query(
    `insert into users (name, email, phone, password_hash, role, must_change_password)
     values ($1, $2, $3, $4, $5, $6) returning *`,
    [name, email.trim().toLowerCase(), phone, hash, role, mustChangePassword]
  );
  return rows[0];
}

module.exports = { findByEmail, findById, createUser };
