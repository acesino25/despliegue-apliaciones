const patenteService = require('../services/patente.services');

const handleError = (res, error) => {
  const status = error.status || 500;
  if (status === 500) console.error(error);
  res.status(status).json({
    error: status === 500 ? 'Error interno del servidor' : error.message,
  });
};

// GET /api/patentes            -> todas
// GET /api/patentes?dominio=ABC123,AB123CD -> una o más por dominio
const getPatentes = async (req, res) => {
  try {
    const { dominio } = req.query;
    const dominios = dominio ? String(dominio).split(',').map((d) => d.trim()).filter(Boolean) : [];
    const patentes = await patenteService.getPatentes(dominios);
    res.json(patentes);
  } catch (error) {
    handleError(res, error);
  }
};

// GET /api/patentes/:id
const getPatenteById = async (req, res) => {
  try {
    const patente = await patenteService.getPatenteById(Number(req.params.id));
    res.json(patente);
  } catch (error) {
    handleError(res, error);
  }
};

// POST /api/patentes  body: { dominio, descripcion } o [ { dominio, descripcion }, ... ]
const createPatente = async (req, res) => {
  try {
    const creadas = await patenteService.createPatentes(req.body);
    res.status(201).json(Array.isArray(req.body) ? creadas : creadas[0]);
  } catch (error) {
    handleError(res, error);
  }
};

module.exports = {
  getPatentes,
  getPatenteById,
  createPatente,
};
