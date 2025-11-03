import pool from '../config/db.js';

export const UserModel = {
  async createUser({ name, email, password, role = 3 }) {
    const result = await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, email, password, role]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0];
  },

  async findAll() {
    const result = await pool.query('SELECT id, name, email, role, created_at FROM users');
    return result.rows;
  },

  async delete(id) {
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
  },
};
