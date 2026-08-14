const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = 'sua_chave_secreta_super_segura_123';

const pool = new Pool({
  user: 'postgres',
  host: '127.0.0.1',
  database: 'cardapio',
  password: 'wildfire',
  port: 5433,
});

// Middleware de Autenticação
const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ mensagem: 'Acesso negado. Token não fornecido.' });

  jwt.verify(token, JWT_SECRET, (err, usuario) => {
    if (err) return res.status(403).json({ mensagem: 'Token inválido ou expirado.' });
    req.usuario = usuario;
    next();
  });
};

// ==================== AUTENTICAÇÃO ====================

app.post('/api/registrar', async (req, res) => {
  const { nome, email, senha } = req.body;
  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const resultado = await pool.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES ($1, $2, $3) RETURNING id, nome, email',
      [nome, email, senhaCriptografada]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  try {
    const usuarioRes = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    if (usuarioRes.rows.length === 0) {
      return res.status(400).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const usuario = usuarioRes.rows[0];
    let senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida && senha === usuario.senha) senhaValida = true;

    if (!senhaValida) {
      return res.status(400).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign({ id: usuario.id, email: usuario.email, nome: usuario.nome }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro no servidor ao realizar login.' });
  }
});

// ==================== CATEGORIAS ====================

app.get('/api/categorias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categorias', autenticarToken, async (req, res) => {
  const { nome } = req.body;
  try {
    const resultado = await pool.query('INSERT INTO categorias (nome) VALUES ($1) RETURNING *', [nome]);
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao criar categoria' });
  }
});

// ==================== PRODUTOS ====================

// Listar todos os produtos (público)
app.get('/api/produtos', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT p.*, c.nome as categoria_nome 
      FROM produtos p 
      LEFT JOIN categorias c ON p.categoria_id = c.id 
      ORDER BY p.id DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar produtos' });
  }
});

// Criar produto
app.post('/api/produtos', autenticarToken, async (req, res) => {
  const { nome, preco, descricao, categoria_id, imagem_url } = req.body;
  try {
    const resultado = await pool.query(
      'INSERT INTO produtos (nome, preco, descricao, categoria_id, imagem_url, disponivel) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
      [nome, preco, descricao, categoria_id, imagem_url]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao criar produto' });
  }
});

// Editar produto completo
app.put('/api/produtos/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  const { nome, preco, descricao, categoria_id, imagem_url, disponivel } = req.body;
  try {
    const resultado = await pool.query(
      `UPDATE produtos 
       SET nome = $1, preco = $2, descricao = $3, categoria_id = $4, imagem_url = $5, disponivel = $6 
       WHERE id = $7 RETURNING *`,
      [nome, preco, descricao, categoria_id, imagem_url, disponivel, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao atualizar produto' });
  }
});

// Alternar rapidamente o status de disponível/pausado
app.patch('/api/produtos/:id/status', autenticarToken, async (req, res) => {
  const { id } = req.params;
  const { disponivel } = req.body;
  try {
    const resultado = await pool.query(
      'UPDATE produtos SET disponivel = $1 WHERE id = $2 RETURNING *',
      [disponivel, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao alterar status do produto' });
  }
});

// Excluir produto
app.delete('/api/produtos/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM produtos WHERE id = $1', [id]);
    res.json({ mensagem: 'Produto excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao excluir produto' });
  }
});

// ==================== PEDIDOS (PAINEL DA COZINHA) ====================

// Criar pedido (Cliente envia)
app.post('/api/pedidos', async (req, res) => {
  const { cliente_nome, cliente_telefone, endereco, bairro, forma_pagamento, troco_para, observacoes, total, itens } = req.body;
  try {
    // Insere o pedido
    const pedidoRes = await pool.query(
      `INSERT INTO pedidos (cliente_nome, cliente_telefone, endereco, bairro, forma_pagamento, troco_para, observacoes, total, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pendente') RETURNING *`,
      [cliente_nome, cliente_telefone, endereco, bairro, forma_pagamento, troco_para, observacoes, total]
    );
    const pedidoId = pedidoRes.rows[0].id;

    // Insere os itens
    for (const item of itens) {
      await pool.query(
        `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, observacao)
         VALUES ($1, $2, $3, $4, $5)`,
        [pedidoId, item.produto_id, item.quantidade, item.preco_unitario, item.observacao || '']
      );
    }

    res.status(201).json({ mensagem: 'Pedido criado com sucesso!', pedido_id: pedidoId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao criar pedido' });
  }
});

// Listar pedidos (Admin/Cozinha)
app.get('/api/pedidos', autenticarToken, async (req, res) => {
  try {
    const pedidos = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    
    // Busca os itens de cada pedido
    for (let pedido of pedidos.rows) {
      const itens = await pool.query(
        `SELECT pi.*, p.nome as produto_nome 
         FROM pedido_itens pi 
         JOIN produtos p ON pi.produto_id = p.id 
         WHERE pi.pedido_id = $1`,
        [pedido.id]
      );
      pedido.itens = itens.rows;
    }

    res.json(pedidos.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos' });
  }
});

// Atualizar status do pedido
app.patch('/api/pedidos/:id/status', autenticarToken, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const resultado = await pool.query('UPDATE pedidos SET status = $1 WHERE id = $2 RETURNING *', [status, id]);
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao atualizar status do pedido' });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});