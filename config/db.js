import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config();

const base = {
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432
};

if (process.env.PGPASSWORD && process.env.PGPASSWORD.length > 0) {
  base.password = process.env.PGPASSWORD;
}

const pool = new Pool(base);

pool.on('error', (err) => console.error('Postgres Pool error:', err.message));

export default pool;
