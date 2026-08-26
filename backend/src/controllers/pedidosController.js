const db = require('../config/db');

// POST /api/pedidos - Salva o pedido completo vindo do Cardápio
exports.criarPedido = async (req, res) => {
  const client = await db.getClient();

  try {
    const { 
      cliente_nome, 
      cliente_telefone, 
      endereco_entrega, 
      tipo_entrega, 
      forma_pagamento, 
      valor_total, 
      observacoes, 
      itens 
    } = req.body;

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ erro: 'O pedido deve conter pelo menos um item.' });
    }

    await client.query('BEGIN');

    // 1. Inserir na tabela 'pedidos' com todas as colunas reais do banco
    const queryPedido = `
      INSERT INTO pedidos (
        cliente_nome, 
        cliente_telefone, 
        endereco_entrega, 
        tipo_entrega, 
        forma_pagamento, 
        valor_total, 
        status, 
        observacoes, 
        criado_em
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendente', $7, NOW())
      RETURNING 
        id, 
        cliente_nome AS cliente, 
        status, 
        TO_CHAR(NOW(), 'HH24:MI') AS hora;
    `;

    const valuesPedido = [
      cliente_nome || 'Balcão',
      cliente_telefone || null,
      endereco_entrega || null,
      tipo_entrega || 'retirada',
      forma_pagamento || 'dinheiro',
      valor_total || 0,
      observacoes || ''
    ];

    const resPedido = await client.query(queryPedido, valuesPedido);
    const novoPedido = resPedido.rows[0];

    // 2. Inserir os itens do pedido na tabela 'itens_pedido'
    const queryItem = `
      INSERT INTO itens_pedido (pedido_id, nome, quantidade, observacao)
      VALUES ($1, $2, $3, $4);
    `;

    for (const item of itens) {
      await client.query(queryItem, [
        novoPedido.id,
        item.nome,
        item.quantidade,
        item.observacao || ''
      ]);
    }

    await client.query('COMMIT');

    novoPedido.itens = itens;
    return res.status(201).json(novoPedido);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Erro ao criar pedido no Supabase:', error);
    return res.status(500).json({ erro: 'Erro interno ao registrar pedido.' });
  } finally {
    client.release();
  }
};

// GET /api/pedidos - Mapeia as colunas do Supabase para a tela do Kanban
exports.listarPedidos = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.id, 
        COALESCE(p.cliente_nome, 'Balcão') AS cliente, 
        p.status, 
        TO_CHAR(COALESCE(p.criado_em, NOW()), 'HH24:MI') AS hora,
        COALESCE(
          json_agg(
            json_build_object(
              'nome', i.nome, 
              'quantidade', i.quantidade, 
              'observacao', i.observacao
            )
          ) FILTER (WHERE i.id IS NOT NULL), '[]'
        ) AS itens
      FROM pedidos p
      LEFT JOIN itens_pedido i ON i.pedido_id = p.id
      GROUP BY p.id
      ORDER BY p.id ASC;
    `;

    const { rows } = await db.query(query);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao listar pedidos do Supabase:', error);
    return res.status(500).json({ erro: 'Erro ao carregar lista de pedidos.' });
  }
};

// PATCH /api/pedidos/:id/status - Atualiza a coluna 'status' no Supabase
exports.atualizarStatusPedido = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const query = `
      UPDATE pedidos 
      SET status = $1 
      WHERE id = $2 
      RETURNING id, cliente_nome AS cliente, status;
    `;

    const { rows } = await db.query(query, [status, id]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    return res.status(500).json({ erro: 'Erro ao atualizar status do pedido.' });
  }
};