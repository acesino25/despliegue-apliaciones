const { Router } = require('express');
const patenteController = require('../controllers/patente.controller');

const router = Router();

router.get('/', patenteController.getPatentes);
router.post('/', patenteController.createPatente);

module.exports = router;