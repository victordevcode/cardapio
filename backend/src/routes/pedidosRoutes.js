const express = require('express');
const router = express.Router();
const pedidosController = require('../controllers/pedidosController');
const authMiddleware = require('../middlewares/authMiddleware'); // Exemplo de middleware

// Se todas as rotas aqui forem apenas para administradores logados:
router.use(authMiddleware);

router.post('/', pedidosController.criarPedido);
router.get('/', pedidosController.listarPedidos);
router.patch('/:id/status', pedidosController.atualizarStatusPedido);
