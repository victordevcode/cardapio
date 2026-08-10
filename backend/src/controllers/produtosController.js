const db = require('../config/db');

// GET /api/produtos - Listar categorias com seus produtos e adicionais
exports.listarCardapio = async (req, res) => {
  try {
    const query = `
      SELECT 
        c.id AS categoria_id, c.nome AS categoria_nome, c.ordem,
        p.id AS produto_id, p.nome AS produto_nome, p.descricao, p.preco, p.imagem_url, p.disponivel,
        a.id AS adicional_id, a.nome AS adicional_nome, a.preco_adicional, a.obrigatorio
      FROM categorias c
      LEFT JOIN produtos p ON p.categoria_id = c.id AND p.disponivel = true
      LEFT JOIN opcoes_adicionais a ON a.produto_id = p.id
      WHERE c.ativo = true
      ORDER BY c.ordem ASC, p.nome ASC;
    `;

    const { rows } = await db.query(query);

    // Formata o resultado em um JSON aninhado
    const cardapio = [];
    rows.forEach(row => {
      let categoria = cardapio.find(c => c.id === row.categoria_id);
      if (!categoria) {
        categoria = { id: row.categoria_id, nome: row.categoria_nome, ordem: row.ordem, produtos: [] };
        cardapio.push(categoria);
      }

      if (row.produto_id) {
        let produto = categoria.produtos.find(p => p.id === row.produto_id);
        if (!produto) {
          produto = {
            id: row.produto_id,
            nome: row.produto_nome,
            descricao: row.descricao,
            preco: parseFloat(row.preco),
            imagem_url: row.imagem_url,
            adicionais: []
          };
          categoria.produtos.push(produto);
        }

        if (row.adicional_id) {
          produto.adicionais.push({
            id: row.adicional_id,
            nome: row.adicional_nome,
            preco_adicional: parseFloat(row.preco_adicional),
            obrigatorio: row.obrigatorio
          });
        }
      }
    });

    return res.status(200).json(cardapio);
  } catch (error) {
    console.error('Erro ao buscar cardápio:', error);
    return res.status(500).json({ erro: 'Erro ao carregar o cardápio.' });
  }
};

// POST /api/produtos - Cadastrar novo produto
exports.criarProduto = async (req, res) => {
  const { categoria_id, nome, descricao, preco, imagem_url } = req.body;

  if (!categoria_id || !nome || preco === undefined) {
    return res.status(400).json({ erro: 'Campos categoria_id, nome e preco são obrigatórios.' });
  }

  try {
    const query = `
      INSERT INTO produtos (categoria_id, nome, descricao, preco, imagem_url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `;
    const values = [categoria_id, nome, descricao, preco, imagem_url];
    const { rows } = await db.query(query, values);

    return res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    return res.status(500).json({ erro: 'Erro ao cadastrar produto.' });
  }
};

// PUT /api/produtos/:id - Atualizar dados ou status de disponibilidade
exports.atualizarProduto = async (req, res) => {
  const { id } = req.params;
  const { categoria_id, nome, descricao, preco, imagem_url, disponivel } = req.body;

  try {
    const query = `
      UPDATE produtos
      SET categoria_id = COALESCE($1, categoria_id),
          nome = COALESCE($2, nome),
          descricao = COALESCE($3, descricao),
          preco = COALESCE($4, preco),
          imagem_url = COALESCE($5, imagem_url),
          disponivel = COALESCE($6, disponivel)
      WHERE id = $7
      RETURNING *;
    `;
    const values = [categoria_id, nome, descricao, preco, imagem_url, disponivel, id];
    const { rows } = await db.query(query, values);

    if (rows.length === 0) {
      return res.status(404).json({ erro: 'Produto não encontrado.' });
    }

    return res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    return res.status(500).json({ erro: 'Erro ao atualizar produto.' });
  }
};