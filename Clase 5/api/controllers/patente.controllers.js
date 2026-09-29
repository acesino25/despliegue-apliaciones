const userService = require('../services/user.service');

const getPatentes = async (req, res) => {
  try {
    const patentes = await patentesService.getPatentes();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Error interno del servidor', details: error.message });
  }
};

const createPatente = async (req, res) => {
  try {
    const { dominio, descripcion } = req.body;
    
    // Delegamos la lógica al servicio
    const newPatente = await patenteService.createPatente(dominio, descripcion);
    
    res.status(201).json(newPatente);
  } catch (error) {
    // Si el servicio tira un error (ej. email duplicado o falta de datos), cae acá
    res.status(400).json({ error: error.message });
  }
};

module.exports = {
  getPatentes,
  createPatente,
};