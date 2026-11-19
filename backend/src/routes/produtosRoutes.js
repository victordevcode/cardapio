const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');
const authMiddleware = require('../middlewares/authMiddleware');

// Rota pública para o cliente visualizar o cardápio
router.get('/', produtosController.listarCardapio);

// Rotas protegidas apenas para o administrador
router.post('/', authMiddleware, produtosController.criarProduto);
router.put('/:id', authMiddleware, produtosController.atualizarProduto);

module.exports = router;