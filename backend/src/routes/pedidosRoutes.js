const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');

router.post('/', pedidosController.criarPedido);
router.get('/', pedidosController.listarPedidos);
router.patch('/:id/status', pedidosController.atualizarStatusPedido);

module.exports = router;