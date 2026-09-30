const { Router } = require('express');
const patenteController = require('../controllers/patente.controllers');

const router = Router();

router.get('/', patenteController.getPatentes);
router.get('/:id', patenteController.getPatenteById);
router.post('/', patenteController.createPatente);

module.exports = router;
