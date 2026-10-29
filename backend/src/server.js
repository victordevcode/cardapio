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

pool.on('error', (err) => {
  console.error('Erro de conexão no banco:', err.message);
});

// ==================== FUNÇÃO DINÂMICA DO MERCADO PAGO ====================
const { MercadoPagoConfig, Payment, Preference } = require('mercadopago');

async function obterClienteMercadoPago() {
  try {
    const resultado = await pool.query('SELECT token_acesso FROM configuracoes_pagamento WHERE id = 1');
    const tokenBanco = resultado.rows[0]?.token_acesso;
    const tokenFinal = tokenBanco || process.env.MERCADOPAGO_ACCESS_TOKEN;

    return new MercadoPagoConfig({
      accessToken: tokenFinal
    });
  } catch (err) {
    console.error('Erro ao buscar token do Mercado Pago no banco, usando fallback do .env:', err.message);
    return new MercadoPagoConfig({
      accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN
    });
  }
}

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
      finalImagemUrl = `/uploads/${req.file.filename}`;
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
      finalImagemUrl = `/uploads/${req.file.filename}`;
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

// ==================== SABORES DE SUCO ====================
app.get('/api/sabores-suco', async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, sabor, ativo 
      FROM sabor_suco 
      WHERE ativo = true 
      ORDER BY id ASC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar sabores de suco:', err);
    res.status(500).json({ mensagem: 'Erro ao buscar sabores de suco' });
  }
});

app.patch('/api/sabores-suco/:id/status', async (req, res) => {
  const { id } = req.params;
  const { ativo } = req.body;

  try {
    const resultado = await pool.query(
      'UPDATE sabor_suco SET ativo = $1 WHERE id = $2 RETURNING *',
      [ativo, id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Sabor não encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('Erro ao alterar status do sabor:', err);
    res.status(500).json({ mensagem: 'Erro ao alterar status do sabor' });
  }
});

app.get('/api/sabores-suco-admin', autenticarToken, async (req, res) => {
  try {
    const resultado = await pool.query(`
      SELECT id, sabor, ativo 
      FROM sabor_suco 
      ORDER BY id ASC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('Erro ao buscar sabores de suco para o admin:', err);
    res.status(500).json({ mensagem: 'Erro ao buscar sabores de suco' });
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

// ==================== CONFIGURAÇÕES DE PAGAMENTO ====================
app.get('/api/configuracoes/pagamento', async (req, res) => {
  try {
    const resultado = await pool.query(
      'SELECT id, provedor, descricao, chave_publica, atualizado_em FROM configuracoes_pagamento ORDER BY id ASC'
    );
    return res.status(200).json(resultado.rows);
  } catch (error) {
    console.error('Erro ao listar configurações de pagamento:', error);
    return res.status(500).json({ erro: error.message });
  }
});

app.get('/api/configuracoes/pagamento/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const resultado = await pool.query('SELECT * FROM configuracoes_pagamento WHERE id = $1', [id]);
    
    if (resultado.rows.length === 0) {
      return res.status(404).json({ mensagem: 'Configuração não encontrada.' });
    }
    
    return res.status(200).json(resultado.rows[0]);
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return res.status(500).json({ erro: error.message });
  }
});

app.post('/api/configuracoes/pagamento', async (req, res) => {
  try {
    const { id, token_acesso, chave_publica, descricao } = req.body;

    let resultado;
    if (id) {
      resultado = await pool.query(
        `UPDATE configuracoes_pagamento 
         SET token_acesso = COALESCE(NULLIF($1, ''), token_acesso), 
             chave_publica = $2, 
             descricao = $3, 
             atualizado_em = NOW() 
         WHERE id = $4 RETURNING *`,
        [token_acesso, chave_publica, descricao, id]
      );
    } else {
      resultado = await pool.query(
        `INSERT INTO configuracoes_pagamento (provedor, token_acesso, chave_publica, descricao, atualizado_em)
         VALUES ('mercadopago', $1, $2, $3, NOW())
         RETURNING *`,
        [token_acesso, chave_publica, descricao]
      );
    }

    return res.status(200).json({ 
      mensagem: 'Configuração salva com sucesso!',
      configuracao: resultado.rows[0]
    });
  } catch (error) {
    console.error('Erro ao salvar configuração de pagamento:', error);
    return res.status(500).json({ erro: error.message });
  }
});

// ==================== MERCADO PAGO / PIX ====================
app.post('/api/pagamento/pix', async (req, res) => {
  try {
    const { pedido_id, total, valor_total, valor, cliente, cliente_nome, cliente_email, email } = req.body;

    const clienteData = cliente || {};
    const valorCobranca = Number(total || valor_total || valor || 0);
    
    let nomeCompleto = (cliente_nome || clienteData.nome || 'Cliente Teste').trim();
    let partesNome = nomeCompleto.split(' ');
    let firstName = partesNome[0] || 'Cliente';
    let lastName = partesNome.slice(1).join(' ') || 'Teste';

    let emailCliente = (cliente_email || email || clienteData.email || '').trim();
    if (!emailCliente || !emailCliente.includes('@') || emailCliente.includes('203309016')) {
      emailCliente = 'comprador_teste_pix@testuser.com';
    }

    if (valorCobranca <= 0) {
      return res.status(400).json({ mensagem: 'O valor do pagamento deve ser maior que zero.' });
    }

    const clientDinamico = await obterClienteMercadoPago();
    const payment = new Payment(clientDinamico);
    const idempotencyKey = `pix-${pedido_id || Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const response = await payment.create({
      body: {
        transaction_amount: Number(valorCobranca.toFixed(2)),
        description: `Pedido Lanches da Ju ${pedido_id ? `#${pedido_id}` : ''}`,
        payment_method_id: 'pix',
        payer: { email: emailCliente, first_name: firstName, last_name: lastName },
        external_reference: pedido_id ? String(pedido_id) : undefined
      },
      requestOptions: { idempotencyKey: idempotencyKey }
    });

    const paymentId = response.id;
    const pointOfInteraction = response.point_of_interaction?.transaction_data;

    if (pedido_id) {
      await pool.query(
        'UPDATE pedidos SET pagamento_id = $1 WHERE id = $2',
        [String(paymentId), pedido_id]
      ).catch(err => console.error('Aviso ao atualizar pagamento_id:', err.message));
    }

    return res.json({
      success: true,
      pagamentoId: paymentId,
      status: response.status,
      qrCodeBase64: pointOfInteraction?.qr_code_base64,
      pixCopiaECola: pointOfInteraction?.qr_code
    });
  } catch (err) {
    console.error('Erro ao gerar PIX:', err);
    res.status(500).json({ mensagem: 'Erro ao gerar pagamento PIX: ' + (err.message || 'Erro desconhecido') });
  }
});

// ==================== MERCADO PAGO / CARTÃO ====================
app.post('/api/pagamento/cartao-link', async (req, res) => {
  try {
    const { pedido_id, total, valor_total, valor, cliente, cliente_nome, cliente_email, email } = req.body;
    const clienteData = cliente || {};
    const valorCobranca = Number(total ?? valor_total ?? valor ?? 0);

    if (!Number.isFinite(valorCobranca) || valorCobranca <= 0) {
      return res.status(400).json({ success: false, mensagem: 'O valor deve ser maior que zero.' });
    }

    const nomeCompleto = String(cliente_nome || clienteData.nome || 'Cliente').trim();
    const partesNome = nomeCompleto.split(/\s+/);
    const firstName = partesNome[0] || 'Cliente';
    const lastName = partesNome.slice(1).join(' ') || 'Cliente';
    const emailCliente = String(cliente_email || email || clienteData.email || '').trim();

    if (!emailCliente || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailCliente)) {
      return res.status(400).json({ success: false, mensagem: 'E-mail inválido.' });
    }

    const clientDinamico = await obterClienteMercadoPago();
    const preference = new Preference(clientDinamico);

    const response = await preference.create({
      body: {
        items: [{
          id: pedido_id ? String(pedido_id) : 'lanches-da-ju',
          title: `Pedido Lanches da Ju #${pedido_id || ''}`,
          quantity: 1,
          unit_price: Number(valorCobranca.toFixed(2)),
          currency_id: 'BRL'
        }],
        payer: { email: emailCliente, name: firstName, surname: lastName },
        payment_methods: { excluded_payment_types: [{ id: 'ticket' }, { id: 'bank_transfer' }], installments: 12 },
        auto_return: 'approved',
        external_reference: pedido_id ? String(pedido_id) : undefined
      }
    });

    if (pedido_id) {
      await pool.query(`UPDATE pedidos SET pagamento_id = $1 WHERE id = $2`, [`preference:${response.id}`, pedido_id]);
    }

    return res.json({
      success: true,
      preferenceId: response.id,
      linkPagamento: response.init_point,
      linkSandbox: response.sandbox_init_point,
      pedidoId: pedido_id || null
    });
  } catch (err) {
    console.error('Erro ao gerar link de cartão:', err.message);
    return res.status(500).json({ success: false, mensagem: 'Não foi possível gerar o link.', erro: err.message });
  }
});

// ==================== WEBHOOK MERCADO PAGO ====================
app.post('/api/webhook/mercadopago', async (req, res) => {
  try {
    const data = req.body.data;
    if (data && data.id) {
      const paymentId = data.id;
      await pool.query(
        `UPDATE pedidos SET status = 'Pendente', pagamento_status = 'Aprovado' WHERE pagamento_id = $1`,
        [paymentId]
      );
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Erro no webhook:', err);
    return res.status(200).send('OK com avisos');
  }
});

// ==================== TAXAS DE ENTREGA ====================
app.get('/api/taxas-entrega', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM taxas_entrega ORDER BY bairro ASC');
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar taxas de entrega' });
  }
});

app.post('/api/taxas-entrega', autenticarToken, async (req, res) => {
  const { bairro, valor } = req.body;
  if (!bairro || valor === undefined) return res.status(400).json({ mensagem: 'Bairro e valor são obrigatórios.' });

  try {
    const resultado = await pool.query('INSERT INTO taxas_entrega (bairro, valor) VALUES ($1, $2) RETURNING *', [bairro.trim(), Number(valor)]);
    res.status(201).json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao cadastrar taxa' });
  }
});

app.put('/api/taxas-entrega/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  const { bairro, valor, ativo } = req.body;
  try {
    const resultado = await pool.query(`UPDATE taxas_entrega SET bairro = $1, valor = $2, ativo = $3 WHERE id = $4 RETURNING *`, [bairro, Number(valor), ativo ?? true, id]);
    res.json(resultado.rows[0]);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao atualizar taxa' });
  }
});

app.delete('/api/taxas-entrega/:id', autenticarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM taxas_entrega WHERE id = $1', [id]);
    res.json({ mensagem: 'Taxa excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao excluir taxa' });
  }
});

app.get('/api/taxas-entrega/publicas', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT id, bairro, valor FROM taxas_entrega WHERE ativo = true ORDER BY bairro ASC');
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao carregar bairros' });
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
  
  const endereco_entrega = [enderecoRaw, bairroRaw, complementoRaw].filter(Boolean).join(', ');
  const tipo_entrega = req.body.tipo_entrega || 'delivery';
  const forma_pagamento = req.body.formaPagamento || req.body.forma_pagamento || 'PIX';
  const valor_total = req.body.valor_total || req.body.total || 0;
  const observacoes = req.body.observacoes || '';
  const cliente_id = req.body.cliente_id || clienteData.id || null;

  if (!cliente_nome || !cliente_nome.trim()) {
    return res.status(400).json({ mensagem: 'O campo cliente_nome é obrigatório.' });
  }

  try {
    const pedidoRes = await pool.query(
      `INSERT INTO pedidos (cliente_nome, cliente_telefone, endereco_entrega, tipo_entrega, forma_pagamento, valor_total, status, observacoes, cliente_id, cliente_email) 
       VALUES ($1, $2, $3, $4, $5, $6, 'Pendente', $7, $8, $9) RETURNING *`,
      [cliente_nome, cliente_telefone || '', endereco_entrega, tipo_entrega, forma_pagamento, valor_total, observacoes, cliente_id, cliente_email || '']
    );

    const pedidoId = pedidoRes.rows[0].id;
    const itens = req.body.itens || [];

    if (Array.isArray(itens) && itens.length > 0) {
      for (const item of itens) {
        await pool.query(
          `INSERT INTO pedido_itens (pedido_id, produto_id, quantidade, preco_unitario, descricao_item, observacao) VALUES ($1, $2, $3, $4, $5, $6)`,
          [pedidoId, item.produto_id || item.produtoId || item.id, item.quantidade || 1, item.preco_unitario || item.preco || 0, item.descricao_item || item.descricao || item.nome || '', item.observacao || '']
        ).catch(err => console.log('Aviso ao salvar item:', err.message));
      }
    }

    res.status(201).json({ mensagem: 'Pedido criado com sucesso!', pedido: pedidoRes.rows[0] });
  } catch (err) {
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
    res.status(500).json({ mensagem: 'Erro ao atualizar status' });
  }
});

// ==================== PEDIDOS KANBAN ====================
app.get('/api/pedidos/kanban', async (req, res) => {
  try {
    const resultado = await pool.query(`SELECT * FROM pedidos WHERE status IS NULL OR status NOT IN ('Finalizado', 'Concluído', 'Cancelado') ORDER BY id ASC`);
    res.json(resultado.rows);
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao buscar pedidos do Kanban' });
  }
});

// ==================== RELATÓRIOS ====================
app.get('/api/relatorios', autenticarToken, async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM pedidos ORDER BY id DESC');
    const pedidos = resultado.rows;

    const totalPedidos = pedidos.length;
    const faturamentoTotal = pedidos.reduce((acc, p) => acc + Number(p.valor_total || p.total || 0), 0);
    const totalTaxasEntrega = pedidos.reduce((acc, p) => acc + Number(p.taxa_entrega || 0), 0);
    const faturamentoProdutos = faturamentoTotal - totalTaxasEntrega;
    const ticketMedio = totalPedidos > 0 ? faturamentoTotal / totalPedidos : 0;

    res.json({
      resumo: { totalPedidos, faturamentoProdutos, totalTaxasEntrega, faturamentoTotal, ticketMedio },
      pedidos
    });
  } catch (err) {
    res.status(500).json({ mensagem: 'Erro ao gerar relatório' });
  }
});

// ==================== SERVIR O FRONTEND COM CAMINHO SEGURO ====================
// Tenta localizar a pasta build em diferentes níveis de diretório automaticamente
const possiblePaths = [
  path.join(__dirname, '../../frontend/build'),
  path.join(__dirname, '../frontend/build'),
  path.join(__dirname, '../../build'),
  path.join(__dirname, '../build')
];

let frontendPath = possiblePaths.find(p => fs.existsSync(p));

if (frontendPath) {
  console.log(`✅ Pasta do frontend encontrada em: ${frontendPath}`);
  app.use(express.static(frontendPath));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(frontendPath, 'index.html'));
  });
} else {
  console.error('❌ ERRO CRÍTICO: Pasta de build do frontend não encontrada!');
}

// ==================== INICIALIZAÇÃO DO SERVIDOR ====================
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando na porta ${PORT}`);
});