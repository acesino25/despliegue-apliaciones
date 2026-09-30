const app = require('./app');
const patenteModel = require('./models/patente.models');

const PORT = process.env.PORT || 3000;

// La DB puede tardar en estar lista al levantar con docker compose: reintentamos
const initDb = async (intentos = 10) => {
  for (let i = 1; i <= intentos; i++) {
    try {
      await patenteModel.init();
      return;
    } catch (error) {
      console.error(`DB no disponible (intento ${i}/${intentos}): ${error.message}`);
      if (i === intentos) throw error;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
};

initDb()
  .then(() => app.listen(PORT, () => console.log(`Servidor corriendo en el puerto ${PORT}`)))
  .catch(() => process.exit(1));
