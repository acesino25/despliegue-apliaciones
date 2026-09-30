const patenteModel = require('../models/patente.models');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const normalizarDominio = (dominio) =>
  String(dominio).replace(/[\s-]/g, '').toUpperCase();

// Formato vigente (AB123CD) o anterior (ABC123)
const DOMINIO_REGEX = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;

const getPatentes = async (dominios) => {
  if (dominios && dominios.length) {
    return await patenteModel.findByDominios(dominios.map(normalizarDominio));
  }
  return await patenteModel.findAll();
};

const getPatenteById = async (id) => {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, 'El id debe ser un entero positivo');
  }
  const patente = await patenteModel.findById(id);
  if (!patente) throw new HttpError(404, 'Patente no encontrada');
  return patente;
};

// Acepta una patente ({dominio, descripcion}) o un array de ellas
const createPatentes = async (input) => {
  const lista = Array.isArray(input) ? input : [input];
  if (lista.length === 0) throw new HttpError(400, 'Se requiere al menos una patente');

  const items = lista.map((p, i) => {
    if (!p || typeof p !== 'object' || !p.dominio || !p.descripcion) {
      throw new HttpError(400, `Patente #${i + 1}: dominio y descripcion son obligatorios`);
    }
    const dominio = normalizarDominio(p.dominio);
    if (!DOMINIO_REGEX.test(dominio)) {
      throw new HttpError(400, `Patente #${i + 1}: dominio inválido (${p.dominio}). Formatos: ABC123 o AB123CD`);
    }
    return { dominio, descripcion: String(p.descripcion).trim() };
  });

  const repetidos = items.filter((it, i) => items.findIndex((o) => o.dominio === it.dominio) !== i);
  if (repetidos.length) {
    throw new HttpError(400, `Dominios repetidos en la carga: ${[...new Set(repetidos.map((r) => r.dominio))].join(', ')}`);
  }

  try {
    return await patenteModel.createMany(items);
  } catch (error) {
    if (error.code === '23505') {
      throw new HttpError(409, 'Alguno de los dominios ya está cargado');
    }
    throw error;
  }
};

module.exports = {
  HttpError,
  getPatentes,
  getPatenteById,
  createPatentes,
};
