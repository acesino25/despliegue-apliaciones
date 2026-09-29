const { getPatentes } = require('../controllers/patente.controllers');
const patenteModel = require('../models/patente.model');

const getPatentes = async () => {
  return await patenteModel.findAll();
};

const createPatente = async (dominio, descripcion) => {
  // 1. Validaciones de negocio
  if (!dominio || !descripcion) {
    throw new Error('El nombre y el email son obligatorios');
  }

  // 2. Aquí podrías verificar si el email ya existe en la BD
  // const userExists = await userModel.findByEmail(email);
  // if (userExists) throw new Error('El email ya está registrado');

  // 3. Crear el usuario delegando al modelo
  return await patenteModel.create(dominio, descripcion);
};

module.exports = {
  getPatentes,
  createPatente,
};