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

// Garante que a pasta "uploads" existe localmente
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Servir a pasta "uploads" como estática para exibir as fotos no navegador
app.use('/uploads', express.static(uploadDir));

// Configuração do Multer para salvar os arquivos de imagem localmente
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
  port: Number(process.env.DB_PORT) || 5432,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
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
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ mensagem: 'Erro ao registrar usuário.' });
  }
});

app.post('/api/login', async (req, res) => {
  const { email, senha, password } = req.body;
  const pass = senha || password;

  if (!email || !pass) {
    return res.status(400).json({ mensagem: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const usuarioRes = await pool.query('SELECT * FROM usuarios WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    
    if (usuarioRes.rows.length === 0) {
      return res.status(400).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const usuario = usuarioRes.rows[0];
    
    // Suporta hash bcrypt e comparação em texto simples
    let senhaValida = false;
    if (usuario.senha && usuario.senha.startsWith('$2')) {
      senhaValida = await bcrypt.compare(pass, usuario.senha);
    } else {
      senhaValida = pass === usuario.senha;
    }

    if (!senhaValida) {
      return res.status(400).json({ mensagem: 'E-mail ou senha incorretos.' });
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email, nome: usuario.nome },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email } });
  } catch (err) {
    console.error('Erro ao realizar login:', err);
    res.status(500).json({ mensagem: 'Erro no servidor ao realizar login.' });
  }
});

// ==================== CATEGORIAS ====================

app.get('/api/categorias', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM categorias ORDER BY nome ASC');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar categorias:', err);
    res.status(500).json({ mensagem: 'Erro ao buscar categorias' });
  }
});

app.post('/api/categorias', autenticarToken, async (req, res) => {
  const { nome } = req.body;
  try {
    const resultado = await pool.query('INSERT INTO categorias (nome) VALUES ($1) RETURNING *', [nome]);
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao criar categoria:', err);
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
    console.error('Erro ao buscar produtos:', err);
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

// ==================== MERCADO PAGO / PIX ====================

app.post('/api/pagamento/pix', async (req, res) => {
  try {
    const clienteData = req.body.cliente || {};
    const total = req.body.total || req.body.valor_total || req.body.valor || 0;
    const nome = req.body.nome || req.body.cliente_nome || clienteData.nome || 'Cliente';
    const email = req.body.email || req.body.cliente_email || clienteData.email;

    // Validação do e-mail exigido pelo Mercado Pago
    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        mensagem: 'O campo e-mail é obrigatório e precisa ser válido para gerar o PIX.' 
      });
    }

    // Retorno de Teste/Mock ajustado para o CheckoutModal.jsx
    console.log(`Recebida solicitação de PIX para ${nome} (${email}) no valor de R$ ${total}`);
    
    return res.json({
      success: true,
      pagamentoId: 123456789,
      status: 'pending',
      qrCodeBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      pixCopiaECola: '00020126580014BR.GOV.BCB.PIX0136123e4567-e89b-12d3-a456-426614174000520400005303986540533.005802BR5913Lanches da Ju6008SAO PAULO62070503***6304E2CA'
    });

  } catch (err) {
    console.error('Erro ao processar PIX:', err);
    res.status(500).json({ mensagem: 'Erro ao gerar pagamento PIX: ' + err.message });
  }
});

// ==================== WEBHOOK MERCADO PAGO ====================
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    const { action, data } = req.body;

    // A notificação pode vir com diferentes tipos de eventos
    if (action === 'payment.updated' || action === 'payment.created') {
      const paymentId = data.id;

      // Busca os detalhes do pagamento na API do Mercado Pago (opcional, mas recomendado)
      // Substitua com a chamada correta para o SDK
      // const payment = await new Payment(client).get(paymentId);
      // const paymentStatus = payment.status;

      // Simulando a aprovação para teste (remover em produção)
      const paymentStatus = 'approved'; 

      if (paymentStatus === 'approved') {
        // Atualiza o status do pagamento na tabela de pedidos do Supabase
        await pool.query(
          `UPDATE pedidos 
           SET status = 'Pendente', pagamento_status = 'Aprovado' 
           WHERE pagamento_id = $1`,
          [paymentId]
        );
        console.log(`Pagamento ${paymentId} aprovado e pedido atualizado!`);
      }
    }

    // Responde ao Mercado Pago para confirmar o recebimento da notificação
    res.status(200).send('Webhook recebido com sucesso');
  } catch (err) {
    console.error('Erro no webhook:', err);
    res.status(500).json({ mensagem: 'Erro interno ao processar webhook' });
  }
});

// ==================== PEDIDOS ====================

app.post('/api/pedidos', async (req, res) => {
  const clienteData = req.body.cliente || {};

  const cliente_nome = req.body.cliente_nome || clienteData.nome || req.body.nome;
  const cliente_telefone = req.body.cliente_telefone || clienteData.telefone || req.body.telefone;
  const cliente_email = req.body.cliente_email || clienteData.email || req.body.email;
  const enderecoRaw = req.body.endereco_entrega || req.body.endereco || clienteData.endereco || '';
  const bairroRaw = req.body.bairro || clienteData.bairro || '';
  const complementoRaw = req.body.complemento || clienteData.complemento || '';
  
  const endereco_entrega = [enderecoRaw, bairroRaw, complementoRaw]
    .filter(Boolean)
    .join(', ');

  const tipo_entrega = req.body.tipo_entrega || 'delivery';
  
  // Suporta tanto 'formaPagamento' (frontend camelCase) quanto 'forma_pagamento' (snake_case)
  const forma_pagamento = req.body.formaPagamento || req.body.forma_pagamento || 'PIX';
  
  const valor_total = req.body.valor_total || req.body.total || 0;
  const observacoes = req.body.observacoes || '';
  const cliente_id = req.body.cliente_id || clienteData.id || null;

  if (!cliente_nome || !cliente_nome.trim()) {
    return res.status(400).json({ mensagem: 'O campo cliente_nome é obrigatório.' });
  }

  try {
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
        cliente_id,
        cliente_email
      ) VALUES ($1, $2, $3, $4, $5, $6, 'Pendente', $7, $8, $9) 
      RETURNING *`,
      [
        cliente_nome,
        cliente_telefone || '',
        endereco_entrega,
        tipo_entrega,
        forma_pagamento,
        valor_total,
        observacoes,
        cliente_id,
        cliente_email || ''
      ]
    );

    const pedidoId = pedidoRes.rows[0].id;
    const itens = req.body.itens || [];

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor backend rodando na porta ${PORT}`);
});