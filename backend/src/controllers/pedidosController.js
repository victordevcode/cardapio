const db = require('../config/db');

// POST /api/pedidos - Criar um novo pedido (Transação SQL)
exports.criarPedido = async (req, res) => {
  const client = await db.pool.connect();

  try {
    const {
      cliente_nome,
      cliente_telefone,
      tipo_entrega,
      endereco_entrega,
      forma_pagamento,
      valor_total,
      observacoes,
      itens
    } = req.body;

    if (!itens || itens.length === 0) {
      return res.status(400).json({ erro: 'O pedido deve conter pelo menos um item.' });
    }

    await client.query('BEGIN'); // Início da transação

    // 1. Inserir Pedido
    const insertPedidoQuery = `
      INSERT INTO pedidos 
        (cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega, forma_pagamento, valor_total, observacoes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, status, criado_em;
    `;
    const pedidoValues = [cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega, forma_pagamento, valor_total, observacoes];
    const pedidoRes = await client.query(insertPedidoQuery, pedidoValues);
    const pedidoId = pedidoRes.rows[0].id;

    // 2. Inserir Itens do Pedido
    for (const item of itens) {
      const insertItemQuery = `
        INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario, subtotal, observacao_item)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id;
      `;
      const itemValues = [pedidoId, item.produto_id, item.quantidade, item.preco_unitario, item.subtotal, item.observacao_item];
      const itemRes = await client.query(insertItemQuery, itemValues);
      const itemPedidoId = itemRes.rows[0].id;

      // 3. Inserir Adicionais do Item (se houver)
      if (item.adicionais && item.adicionais.length > 0) {
        for (const adic of item.adicionais) {
          const insertAdicQuery = `
            INSERT INTO item_pedido_adicionais (item_pedido_id, opcao_adicional_id, preco_cobrado)
            VALUES ($1, $2, $3);
          `;
          await client.query(insertAdicQuery, [itemPedidoId, adic.opcao_adicional_id, adic.preco_cobrado]);
        }
      }
    }

    await client.query('COMMIT'); // Confirma as alterações

    return res.status(201).json({
      sucesso: true,
      mensagem: 'Pedido realizado com sucesso!',
      pedido: {
        id: pedidoId,
        status: pedidoRes.rows[0].status,
        criado_em: pedidoRes.rows[0].criado_em
      }
    });
  } catch (error) {
    await client.query('ROLLBACK'); // Desfaz alterações em caso de erro
    console.error('Erro ao processar pedido:', error);
    return res.status(500).json({ erro: 'Erro ao registrar o pedido.' });
  } finally {
    client.release();
  }
};

// GET /api/pedidos - Listar pedidos para o Painel Kanban
exports.listarPedidos = async (req, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT 
        p.id, p.cliente_nome, p.cliente_telefone, p.tipo_entrega, p.endereco_entrega,
        p.forma_pagamento, p.status, p.valor_total, p.observacoes, p.criado_em,
        json_agg(
          json_build_object(
            'item_id', ip.id,
            'produto_id', ip.produto_id,
            'quantidade', ip.quantidade,
            'preco_unitario', ip.preco_unitario,
            'subtotal', ip.subtotal,
            'observacao_item', ip.observacao_item
          )
        ) AS itens
      FROM pedidos p
      LEFT JOIN itens_pedido ip ON ip.pedido_id = p.id
    `;

    const queryParams = [];
    if (status) {
      query += ` WHERE p.status = $1`;
      queryParams.push(status);
    }

    query += ` GROUP BY p.id ORDER BY p.criado_em DESC;`;

    const { rows } = await db.query(query, queryParams);
    return res.status(200).json(rows);
  } catch (error) {
    console.error('Erro ao buscar pedidos:', error);
    return res.status(500).json({ erro: 'Erro ao carregar lista de pedidos.' });
  }
};

// PATCH /api/pedidos/:id/status - Atualizar status no Kanban
exports.atualizarStatusPedido = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const statusValidos = ['PENDENTE', 'EM_PREPARO', 'SAIU_PARA_ENTREGA', 'CONCLUIDO', 'CANCELADO'];
  if (!statusValidos.includes(status)) {
    return res.status(400).json({ erro: 'Status fornecido é inválido.' });
  }

  try {
    const query = `
      UPDATE pedidos
      SET status = $1
      WHERE id = $2
      RETURNING id, status, cliente_nome;
    `;
    const { rows } = await db.query(query, [status, id]);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Pedido não encontrado.' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar status do pedido:', error);
    return res.status(500).json({ erro: 'Erro ao atualizar o status.' });
  }
};