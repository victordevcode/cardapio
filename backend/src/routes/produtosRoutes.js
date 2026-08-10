const express = require('express');
const router = express.Router();
const produtosController = require('../controllers/produtosController');

router.get('/', produtosController.listarCardapio);
router.post('/', produtosController.criarProduto);
router.put('/:id', produtosController.atualizarProduto);

module.exports = router;