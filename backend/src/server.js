const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Configuração da Conexão com o PostgreSQL
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'cardapio',
  password: 'wildfire',
  port: 5433,
});

pool.connect((err) => {
  if (err) {
    console.error('❌ Erro ao conectar ao PostgreSQL:', err.stack);
  } else {
    console.log('✅ Conectado com sucesso ao PostgreSQL!');
  }
});

// 2. Rota GET: Procurar todos os produtos para o Cardápio
app.get('/api/produtos', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM produtos ORDER BY id DESC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('Erro ao procurar produtos:', error);
    res.status(500).json({ erro: 'Erro interno ao procurar produtos.' });
  }
});

// 2.1. Rota GET: Buscar a lista de categorias diretamente do banco
app.get('/api/categorias', async (req, res) => {
  try {
    // Certifique-se de que o nome da tabela no seu PostgreSQL é 'categorias'
    const resultado = await pool.query('SELECT id, nome FROM categorias ORDER BY nome ASC');
    res.json(resultado.rows);
  } catch (error) {
    console.error('❌ Erro ao buscar categorias:', error);
    res.status(500).json({ erro: 'Erro interno ao buscar categorias.' });
  }
});

// 3. Rota POST: Salvar novo produto cadastrado no PostgreSQL
app.post('/api/produtos', async (req, res) => {
  const { nome, descricao, preco, categoria_id, imagem_url, disponivel } = req.body;

  if (!nome || !preco || !categoria_id) {
    return res.status(400).json({ erro: 'Nome, preço e categoria são obrigatórios.' });
  }

  try {
    const querySQL = `
      INSERT INTO produtos (categoria_id, nome, descricao, preco, imagem_url, disponivel)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;

    const precoTratado = parseFloat(String(preco).replace(',', '.'));

    const valores = [
      parseInt(categoria_id, 10), // Garante que vai como número inteiro
      nome,
      descricao || '',
      precoTratado,
      imagem_url || 'https://via.placeholder.com/150',
      disponivel !== undefined ? disponivel : true
    ];

    const resultado = await pool.query(querySQL, valores);

    console.log('✅ Produto salvo no PostgreSQL:', resultado.rows[0]);
    return res.status(201).json(resultado.rows[0]);

  } catch (error) {
    console.error('❌ Erro ao inserir produto no PostgreSQL:', error);
    return res.status(500).json({ erro: 'Erro interno ao salvar produto no banco de dados.' });
  }
});

// Rota de teste
app.get('/', (req, res) => {
  res.send('🚀 Backend do Cardápio funcionando com sucesso!');
});

// 4. Inicialização do Servidor na Porta 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});

// 4. Rota PUT: Atualizar um produto existente
app.put('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, preco, categoria_id, imagem_url } = req.body;

  if (!nome || !preco || !categoria_id) {
    return res.status(400).json({ erro: 'Nome, preço e categoria são obrigatórios.' });
  }

  try {
    const querySQL = `
      UPDATE produtos 
      SET nome = $1, descricao = $2, preco = $3, categoria_id = $4, imagem_url = $5
      WHERE id = $6
      RETURNING *;
    `;

    const precoTratado = parseFloat(String(preco).replace(',', '.'));
    const valores = [
      nome,
      descricao || '',
      precoTratado,
      parseInt(categoria_id, 10),
      imagem_url || 'https://via.placeholder.com/150',
      id
    ];

    const resultado = await pool.query(querySQL, valores);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    console.log('✏️ Produto atualizado:', resultado.rows[0]);
    return res.json(resultado.rows[0]);
  } catch (error) {
    console.error('❌ Erro ao atualizar produto:', error);
    return res.status(500).json({ erro: 'Erro interno ao atualizar produto.' });
  }
});

// 5. Rota DELETE: Excluir um produto do banco
app.delete('/api/produtos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const resultado = await pool.query('DELETE FROM produtos WHERE id = $1 RETURNING *', [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    console.log('🗑️ Produto excluído ID:', id);
    return res.json({ mensagem: 'Produto excluído com sucesso!' });
  } catch (error) {
    console.error('❌ Erro ao excluir produto:', error);
    return res.status(500).json({ erro: 'Erro interno ao excluir produto.' });
  }
});