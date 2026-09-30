const express = require('express');
const patentesRoutes = require('./routes/patentes.routes');

const app = express();

// Middlewares
app.use(express.json()); // Permite recibir body en formato JSON

// Rutas (Se recomienda solo usar sustantivo y en plural)
app.use('/api/patentes', patentesRoutes);

// Middleware básico para rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

module.exports = app;