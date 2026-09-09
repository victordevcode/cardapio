require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Garante que a pasta "uploads" existe
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir a pasta "uploads" como estática para exibir as fotos no navegador
app.use('/uploads', express.static(uploadDir));

// Configuração do Multer para salvar os arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const nomeArquivo = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, nomeArquivo);
  },
});

const upload = multer({ storage });

const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_super_segura_123';

// ==================== CONFIGURAÇÃO DO BANCO (SUPABASE) ====================
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

// Trata erros de conexão sem derrubar a aplicação
pool.on('error', (err) => {
  console.error('Erro de conexão no banco:', err.message);
});

// ==================== MIDDLEWARE DE AUTENTICAÇÃO ====================
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

app.post('/api/produtos', autenticarToken, upload.single('imagem_arquivo'), async (req, res) => {
  const { nome, preco, descricao, categoria_id, imagem_url } = req.body;
  try {
    let finalImagemUrl = imagem_url || '';

    if (req.file) {
      finalImagemUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    }

    const resultado = await pool.query(
      'INSERT INTO produtos (nome, preco, descricao, categoria_id, imagem_url, disponivel) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING *',
      [nome, preco, descricao, categoria_id, finalImagemUrl]
    );
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar produto:', err);
    res.status(500).json({ mensagem: 'Erro ao criar produto' });
  }
});

app.put('/api/produtos/:id', autenticarToken, upload.single('imagem_arquivo'), async (req, res) => {
  const { id } = req.params;
  const { nome, preco, descricao, categoria_id, imagem_url, disponivel } = req.body;

  try {
    const prodAtual = await pool.query('SELECT imagem_url, disponivel FROM produtos WHERE id = $1', [id]);
    let finalImagemUrl = prodAtual.rows[0]?.imagem_url || '';
    let isDisponivel = prodAtual.rows[0]?.disponivel ?? true;

    if (req.file) {
      finalImagemUrl = `http://localhost:3000/uploads/${req.file.filename}`;
    } else if (imagem_url) {
      finalImagemUrl = imagem_url;
    }

    if (disponivel !== undefined) {
      isDisponivel = disponivel === 'true' || disponivel === true;
    }

    const resultado = await pool.query(
      `UPDATE produtos
       SET nome = $1, preco = $2, descricao = $3, categoria_id = $4, imagem_url = $5, disponivel = $6
       WHERE id = $7 RETURNING *`,
      [nome, preco, descricao, categoria_id, finalImagemUrl, isDisponivel, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar produto:', err);
    res.status(500).json({ mensagem: 'Erro ao atualizar produto' });
  }
});

app.patch('/api/produtos/:id/disponibilidade', autenticarToken, async (req, res) => {
  const { id } = req.params;
  const { disponivel } = req.body;
  try {
    const resultado = await pool.query(
      'UPDATE produtos SET disponivel = $1 WHERE id = $2 RETURNING *',
      [disponivel, id]
    );
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao alterar disponibilidade do produto' });
  }
});

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

app.delete('/api/produtos/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM produtos WHERE id = $1', [id]);
    res.json({ mensagem: 'Produto excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao excluir produto' });
  }
});
// ==================== CLIENTES ====================

// Rota para buscar os dados do cliente pelo telefone ao digitar no CheckoutModal
app.get('/api/clientes/:telefone', async (req, res) => {
  const { telefone } = req.params;
  try {
    const resultado = await pool.query(
      'SELECT * FROM clientes WHERE telefone = $1',
      [telefone]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Cliente não encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar cliente:', err);
    res.status(500).json({ mensagem: 'Erro ao buscar cliente' });
  }
});
// ==================== PEDIDOS (PAINEL DA COZINHA) ====================

app.post('/api/pedidos', async (req, res) => {
  // Trata caso os dados venham em req.body.cliente ou diretamente em req.body
  const clienteData = req.body.cliente || {};

  const cliente_nome = req.body.cliente_nome || clienteData.nome || req.body.nome;
  const cliente_telefone = req.body.cliente_telefone || clienteData.telefone || req.body.telefone;
  
  // Monta o endereço de entrega completo
  const enderecoRaw = req.body.endereco_entrega || req.body.endereco || clienteData.endereco || '';
  const bairroRaw = req.body.bairro || clienteData.bairro || '';
  const complementoRaw = req.body.complemento || clienteData.complemento || '';
  
  const endereco_entrega = [enderecoRaw, bairroRaw, complementoRaw]
    .filter(Boolean)
    .join(', ');

  const tipo_entrega = req.body.tipo_entrega || 'delivery';
  const forma_pagamento = req.body.forma_pagamento || 'pix';
  const valor_total = req.body.valor_total || req.body.total || 0;
  const observacoes = req.body.observacoes || '';
  const cliente_id = req.body.cliente_id || clienteData.id || null;

  // Validação preventiva
  if (!cliente_nome || !cliente_nome.trim()) {
    return res.status(400).json({ mensagem: 'O campo cliente_nome é obrigatório.' });
  }

  try {
    // Insere o pedido usando a estrutura exata da sua tabela no banco
    const pedidoRes = await pool.query(
      `INSERT INTO pedidos (
        cliente_nome, 
        cliente_telefone, 
        endereco_entrega, 
        tipo_entrega, 
        forma_pagamento, 
        valor_total, 
        status, 
        observacoes, 
        cliente_id
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pendente', $7, $8) 
      RETURNING *`,
      [
        cliente_nome,
        cliente_telefone || '',
        endereco_entrega,
        tipo_entrega,
        forma_pagamento,
        valor_total,
        observacoes,
        cliente_id
      ]
    );

    const pedidoId = pedidoRes.rows[0].id;
    const itens = req.body.itens || [];

    // Insere os itens do pedido (se a tabela pedido_itens existir)
    if (Array.isArray(itens) && itens.length > 0) {
      for (const item of itens) {
        await pool.query(
          `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, descricao_item, observacao)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            pedidoId,
            item.produto_id || item.produtoId || item.id,
            item.quantidade || 1,
            item.preco_unitario || item.preco || 0,
            item.descricao_item || item.descricao || item.nome || '',
            item.observacao || ''
          ]
        ).catch(err => console.log('Aviso ao salvar item:', err.message));
      }
    }

    res.status(201).json({ 
      mensagem: 'Pedido criado com sucesso!', 
      pedido: pedidoRes.rows[0] 
    });

  } catch (err) {
    console.error('Erro ao criar pedido:', err);
    res.status(500).json({ mensagem: 'Erro interno ao criar pedido: ' + err.message });
  }
});
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