const db = require('../config/db');

const findAll = async () => {
  const result = await db.query('SELECT id, dominio, descripcion, created_at FROM patentes ORDER BY created_at DESC');
  return result.rows;
};

const create = async (dominio, descripcion) => {
  // Uso de consultas parametrizadas ($1, $2) para evitar SQL Injection
  const text = 'INSERT INTO patentes(dominio, descripcion) VALUES($1, $2) RETURNING id, domino, descripcion, created_at';
  const values = [dominio, descripcion];
  
  const result = await db.query(text, values);
  return result.rows[0];
};

module.exports = {
  findAll,
  create,
};