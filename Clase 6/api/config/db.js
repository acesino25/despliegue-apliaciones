const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PG_HOST || 'clase6_pg_db', // localhost o 'postgres-db' si Node también corre en Docker (y por tanto están en la misma red)
  port: process.env.PG_PORT || 5432,
  user: process.env.PG_USER || 'el_admin',
  password: process.env.PG_PASSWORD || 'admin_password',
  database: process.env.PG_DB || 'autos',
});

pool.on('connect', () => {
  console.log('Conexión exitosa a PostgreSQL');
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};