import React, { useState, useEffect, useCallback } from 'react';

export default function CadastroCardapio({ aoVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de Edição (null se for novo produto, ou ID se for edição)
  const [idEdicao, setIdEdicao] = useState(null);

  // Estados dos campos do formulário
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [imagem, setImagem] = useState('');
  const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });

  // 1. Buscar produtos do banco (GET)
  const buscarProdutos = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/produtos');
      if (!res.ok) throw new Error('Erro ao buscar produtos');
      const dados = await res.json();
      setProdutos(dados);
    } catch (err) {
      console.error('Erro na requisição GET (produtos):', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  // 2. Buscar categorias do banco (GET)
  const buscarCategorias = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/categorias');
      if (!res.ok) throw new Error('Erro ao buscar categorias');
      const dados = await res.json();
      setCategorias(dados);

      if (dados.length > 0 && !categoriaId) {
        setCategoriaId(dados[0].id);
      }
    } catch (err) {
      console.error('Erro na requisição GET (categorias):', err);
    }
  }, [categoriaId]);

  useEffect(() => {
    buscarProdutos();
    buscarCategorias();
  }, [buscarProdutos, buscarCategorias]);

  // Limpar formulário e resetar estado de edição
  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setPreco('');
    setImagem('');
    setIdEdicao(null);
    if (categorias.length > 0) setCategoriaId(categorias[0].id);
  };

  // Preenche o formulário para edição
  const handleEditar = (prod) => {
    setIdEdicao(prod.id);
    setNome(prod.nome || '');
    setDescricao(prod.descricao || '');
    setPreco(prod.preco || '');
    setCategoriaId(prod.categoria_id || (categorias[0] ? categorias[0].id : ''));
    setImagem(prod.imagem_url || prod.imagem || '');
    setMensagem({ tipo: 'info', texto: `✏️ Editando produto ID #${prod.id}` });
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola até o topo
  };

  // Função para ALTERNAR STATUS (Disponível / Pausado)
  const handleAlternarStatus = async (id, statusAtual) => {
    const novoStatus = !statusAtual;
    const token = localStorage.getItem('token'); // 🔑 Pega o token salvo no login

    try {
      const res = await fetch(`http://localhost:3000/api/produtos/${id}/status`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 🔑 Envia autorização
        },
        body: JSON.stringify({ disponivel: novoStatus }),
      });

      if (res.ok) {
        setMensagem({
          tipo: 'sucesso',
          texto: novoStatus ? '🟢 Produto ativado no cardápio!' : '🟡 Produto pausado/esgotado!',
        });
        buscarProdutos();
      } else {
        setMensagem({ tipo: 'erro', texto: '❌ Sessão expirada ou sem permissão. Faça login novamente.' });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: '❌ Não foi possível conectar ao servidor.' });
    }
  };

  // Função para EXCLUIR um produto (DELETE)
  const handleExcluir = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;

    const token = localStorage.getItem('token'); // 🔑 Pega o token

    try {
      const res = await fetch(`http://localhost:3000/api/produtos/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}` // 🔑 Envia autorização
        }
      });

      if (res.ok) {
        setMensagem({ tipo: 'sucesso', texto: '🗑️ Produto excluído com sucesso!' });
        if (idEdicao === id) limparFormulario();
        buscarProdutos();
      } else {
        const erroBody = await res.json();
        setMensagem({ tipo: 'erro', texto: `❌ Falha ao excluir: ${erroBody.mensagem || erroBody.erro}` });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: '❌ Não foi possível conectar ao servidor.' });
    }
  };

  // 3. Salvar (POST) ou Atualizar (PUT)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensagem({ tipo: 'info', texto: 'Processando...' });

    if (!categoriaId) {
      setMensagem({ tipo: 'erro', texto: '❌ Selecione uma categoria válida!' });
      return;
    }

    const token = localStorage.getItem('token'); // 🔑 Pega o token
    const produtoExistente = produtos.find((p) => p.id === idEdicao);

    // Trata o preço permitindo digitar com vírgula ou ponto (ex: "22,00" vira 22.00)
    const precoFormatado = parseFloat(String(preco).replace(',', '.'));

    const novoProduto = {
      nome,
      descricao,
      preco: precoFormatado,
      categoria_id: parseInt(categoriaId, 10),
      imagem_url: imagem,
      disponivel: produtoExistente ? produtoExistente.disponivel !== false : true,
    };

    const url = idEdicao
      ? `http://localhost:3000/api/produtos/${idEdicao}`
      : 'http://localhost:3000/api/produtos';

    const method = idEdicao ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` // 🔑 Envia autorização
        },
        body: JSON.stringify(novoProduto),
      });

      if (res.ok) {
        setMensagem({
          tipo: 'sucesso',
          texto: idEdicao ? '✅ Produto atualizado com sucesso!' : '✅ Produto cadastrado com sucesso!',
        });

        limparFormulario();
        buscarProdutos();
      } else {
        const erroBody = await res.json();
        setMensagem({ tipo: 'erro', texto: `❌ Falha: ${erroBody.mensagem || erroBody.erro || 'Erro no servidor'}` });
      }
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: '❌ Erro de conexão com o servidor.' });
    }
  };

  return (
    <div lang="pt-BR" style={{ padding: '24px', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      <button
        onClick={aoVoltar}
        style={{ marginBottom: '20px', padding: '8px 16px', cursor: 'pointer', borderRadius: '6px', border: '1px solid #ccc' }}
      >
        ← Voltar ao Quadro de Pedidos
      </button>

      <h2>🍔 Gestão do Cardápio</h2>

      {/* Mensagem de Feedback */}
      {mensagem.texto && (
        <div
          style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '16px',
            fontWeight: 'bold',
            backgroundColor: mensagem.tipo === 'sucesso' ? '#d1fae5' : mensagem.tipo === 'erro' ? '#fee2e2' : '#e0f2fe',
            color: mensagem.tipo === 'sucesso' ? '#065f46' : mensagem.tipo === 'erro' ? '#991b1b' : '#075985',
          }}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Formulário de Cadastro / Edição */}
      <form onSubmit={handleSubmit} style={{ background: '#f9fafb', padding: '20px', borderRadius: '8px', border: '1px solid #e5e7eb', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0 }}>{idEdicao ? `Editar Item #${idEdicao}` : 'Cadastrar Novo Item'}</h3>

        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: '1fr 1fr' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Nome do Produto*</label>
            <input
              type="text"
              required
              placeholder="Ex: X-Salada Especial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Preço (R$)*</label>
            <input
              type="number"
              step="0.01"
              required
              placeholder="Ex: 25.50"
              value={preco}
              onChange={(e) => setPreco(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Categoria*</label>
            <select
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              required
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            >
              {categorias.length === 0 ? (
                <option value="">Carregando categorias...</option>
              ) : (
                categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>URL da Imagem</label>
            <input
              type="text"
              placeholder="https://exemplo.com/foto.jpg"
              value={imagem}
              onChange={(e) => setImagem(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px' }}>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '4px' }}>Descrição</label>
          <textarea
            rows="3"
            placeholder="Ingredientes e detalhes do prato..."
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
          <button
            type="submit"
            style={{
              backgroundColor: idEdicao ? '#3b82f6' : '#10b981',
              color: '#fff',
              border: 'none',
              padding: '10px 24px',
              borderRadius: '6px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '15px',
            }}
          >
            {idEdicao ? 'Atualizar Produto' : 'Salvar no Banco de Dados'}
          </button>

          {idEdicao && (
            <button
              type="button"
              onClick={limparFormulario}
              style={{ backgroundColor: '#6b7280', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '6px', cursor: 'pointer' }}
            >
              Cancelar Edição
            </button>
          )}
        </div>
      </form>

      {/* Lista de Produtos */}
      <h3>Produtos Cadastrados ({produtos.length})</h3>

      {carregando ? (
        <p>Carregando cardápio do banco de dados...</p>
      ) : produtos.length === 0 ? (
        <p style={{ color: '#6b7280' }}>Nenhum produto cadastrado no banco ainda.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '16px' }}>
          {produtos.map((prod) => {
            const estaDisponivel = prod.disponivel !== false;

            return (
              <div
                key={prod.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  display: 'flex',
                  flexDirection: 'column',
                  justify: 'space-between',
                  opacity: estaDisponivel ? 1 : 0.55,
                }}
              >
                <div>
                  <img
                    src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/150'}
                    alt={prod.nome}
                    style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '6px' }}
                  />
                  <h4 style={{ margin: '8px 0 4px 0' }}>
                    {prod.nome} {!estaDisponivel && <span style={{ color: '#dc2626', fontSize: '11px' }}>[PAUSADO]</span>}
                  </h4>
                  <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 8px 0' }}>{prod.descricao}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontSize: '11px', background: '#f3f4f6', padding: '3px 8px', borderRadius: '4px', color: '#374151', fontWeight: 'bold' }}>
                      ID #{prod.id}
                    </span>
                    <strong style={{ color: '#059669' }}>R$ {Number(prod.preco).toFixed(2)}</strong>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                  <button
                    onClick={() => handleAlternarStatus(prod.id, estaDisponivel)}
                    style={{
                      width: '100%',
                      padding: '6px',
                      backgroundColor: estaDisponivel ? '#dcfce7' : '#fef3c7',
                      color: estaDisponivel ? '#166534' : '#92400e',
                      border: '1px solid ' + (estaDisponivel ? '#86efac' : '#fde047'),
                      borderRadius: '4px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    {estaDisponivel ? '🟢 Disponível' : '🟡 Pausado'}
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleEditar(prod)}
                      style={{ flex: 1, padding: '6px', backgroundColor: '#e0f2fe', color: '#0369a1', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleExcluir(prod.id)}
                      style={{ flex: 1, padding: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}