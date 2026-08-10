const express = require('express');
const cors = require('cors');
require('dotenv').config();

const produtosRoutes = require('./routes/produtosRoutes');
const pedidosRoutes = require('./routes/pedidosRoutes');

const app = express();

// Middlewares Globais
app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/produtos', produtosRoutes);
app.use('/api/pedidos', pedidosRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});