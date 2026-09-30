const db = require('../config/db');

const COLUMNS = 'id, dominio, descripcion, created_at';

// Crea la tabla si no existe (se llama al arrancar)
const init = async () => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS patentes (
      id SERIAL PRIMARY KEY,
      dominio VARCHAR(10) NOT NULL UNIQUE,
      descripcion TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
};

const findAll = async () => {
  const result = await db.query(`SELECT ${COLUMNS} FROM patentes ORDER BY created_at DESC, id DESC`);
  return result.rows;
};

const findById = async (id) => {
  const result = await db.query(`SELECT ${COLUMNS} FROM patentes WHERE id = $1`, [id]);
  return result.rows[0];
};

// dominios: array de strings ya normalizados
const findByDominios = async (dominios) => {
  const result = await db.query(
    `SELECT ${COLUMNS} FROM patentes WHERE dominio = ANY($1::text[]) ORDER BY dominio`,
    [dominios]
  );
  return result.rows;
};

// items: array de { dominio, descripcion }. Un solo INSERT => todo o nada.
const createMany = async (items) => {
  const values = [];
  const placeholders = items.map((item, i) => {
    values.push(item.dominio, item.descripcion);
    return `($${i * 2 + 1}, $${i * 2 + 2})`;
  });
  const result = await db.query(
    `INSERT INTO patentes(dominio, descripcion) VALUES ${placeholders.join(', ')} RETURNING ${COLUMNS}`,
    values
  );
  return result.rows;
};

module.exports = {
  init,
  findAll,
  findById,
  findByDominios,
  createMany,
};
