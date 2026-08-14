import React, { useState, useEffect, useCallback } from 'react';

export default function CadastroCardapio() {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);

  // Estado para saber se estamos editando um produto existente
  const [produtoEditandoId, setProdutoEditandoId] = useState(null);

  // Mídia / Imagem
  const [tipoImagem, setTipoImagem] = useState('arquivo'); // 'arquivo' ou 'url'
  const [imagemUrl, setImagemUrl] = useState('');
  const [arquivoImagem, setArquivoImagem] = useState(null);
  const [previa, setPrevia] = useState('');

  const [enviando, setEnviando] = useState(false);
  const [carregandoLista, setCarregandoLista] = useState(true);

  // 1. Buscar categorias
  const buscarCategorias = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/categorias');
      if (!res.ok) throw new Error('Erro ao buscar categorias');
      const dados = await res.json();
      setCategorias(dados);
      if (dados.length > 0 && !categoriaId) setCategoriaId(dados[0].id);
    } catch (err) {
      console.error('Erro ao carregar categorias:', err);
    }
  }, [categoriaId]);

  // 2. Buscar produtos
  const buscarProdutos = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/produtos');
      if (!res.ok) throw new Error('Erro ao buscar produtos');
      const dados = await res.json();
      setProdutos(dados);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  useEffect(() => {
    buscarCategorias();
    buscarProdutos();
  }, [buscarCategorias, buscarProdutos]);

  // Tratar arquivo local
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArquivoImagem(file);
      setPrevia(URL.createObjectURL(file));
    }
  };

  // Limpar Formulário e cancelar edição
  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setPreco('');
    setImagemUrl('');
    setArquivoImagem(null);
    setPrevia('');
    setProdutoEditandoId(null);
  };

  // Iniciar Edição de um Produto
  const iniciarEdicao = (prod) => {
    setProdutoEditandoId(prod.id);
    setNome(prod.nome || '');
    setDescricao(prod.descricao || '');
    setPreco(prod.preco || '');
    setCategoriaId(prod.categoria_id || (categorias[0] ? categorias[0].id : ''));
    
    const urlImagem = prod.imagem_url || prod.imagem || '';
    setImagemUrl(urlImagem);
    setPrevia(urlImagem);
    setTipoImagem('url');
    setArquivoImagem(null);

    // Rola suavemente até o formulário no topo
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Alternar Disponibilidade ao clicar na badge de status
  const toggleDisponibilidade = async (prod) => {
    const novaSituacao = prod.disponivel === false || prod.disponivel === 0 ? true : false;
    try {
      const res = await fetch(`http://localhost:3000/api/produtos/${prod.id}/disponibilidade`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disponivel: novaSituacao }),
      });

      if (!res.ok) {
        // Fallback para atualização local
        setProdutos((prev) =>
          prev.map((p) => (p.id === prod.id ? { ...p, disponivel: novaSituacao } : p))
        );
      } else {
        buscarProdutos();
      }
    } catch (err) {
      console.error('Erro ao alterar disponibilidade:', err);
      // Atualização otimista
      setProdutos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, disponivel: novaSituacao } : p))
      );
    }
  };

  // Excluir Produto
  const excluirProduto = async (id, nomeProduto) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nomeProduto}"?`)) return;

    try {
      const res = await fetch(`http://localhost:3000/api/produtos/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erro ao excluir produto');

      alert('🗑️ Produto excluído com sucesso!');
      buscarProdutos();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('❌ Não foi possível excluir o produto.');
    }
  };

  // Cadastrar ou Atualizar (Submit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const formData = new FormData();
      formData.append('nome', nome);
      formData.append('descricao', descricao);
      formData.append('preco', preco);
      formData.append('categoria_id', categoriaId);

      if (tipoImagem === 'arquivo' && arquivoImagem) {
        formData.append('imagem_arquivo', arquivoImagem);
      } else if (tipoImagem === 'url' && imagemUrl) {
        formData.append('imagem_url', imagemUrl);
      }

      const url = produtoEditandoId
        ? `http://localhost:3000/api/produtos/${produtoEditandoId}`
        : 'http://localhost:3000/api/produtos';

      const method = produtoEditandoId ? 'PUT' : 'POST';

      // PEGA O TOKEN DO SESSIONSTORAGE (E LOCALSTORAGE COMO FALLBACK)
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      const res = await fetch(url, {
        method: method,
        headers: {
          // Envia o Token de Autenticação para liberar a requisição no Backend!
          'Authorization': `Bearer ${token}` 
        },
        body: formData, // Quando enviamos FormData, não colocamos 'Content-Type', o navegador define sozinho
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Sessão expirada ou não autorizada. Faça login novamente.');
        }
        throw new Error('Erro ao salvar produto');
      }

      alert(
        produtoEditandoId
          ? '✏️ Produto atualizado com sucesso!'
          : '✅ Produto cadastrado com sucesso!'
      );

      limparFormulario();
      buscarProdutos();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message || 'Ocorreu um erro ao salvar o produto.'}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto font-sans space-y-6">
      
      {/* ================= 1. FORMULÁRIO DE CADASTRO / EDIÇÃO ================= */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {produtoEditandoId ? '✏️ Editar Produto' : '➕ Cadastrar Novo Produto'}
          </h2>

          {produtoEditandoId && (
            <button
              type="button"
              onClick={limparFormulario}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg transition-all"
            >
              ✕ Cancelar Edição
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Nome do Produto*
            </label>
            <input
              type="text"
              required
              placeholder="Ex: X-Salada Especial"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
            />
          </div>

          {/* Categoria e Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Categoria*
              </label>
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Preço (R$)*
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={preco}
                onChange={(e) => setPreco(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
              />
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              rows="2"
              placeholder="Ingredientes e detalhes do produto..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
            />
          </div>

          {/* Mídia / Imagem */}
          <div className="border border-gray-200 p-4 rounded-xl bg-gray-50/30 space-y-3">
            <label className="block text-xs font-bold text-gray-700">
              Imagem do Produto
            </label>

            <div className="flex gap-4 text-xs font-semibold">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoImagem"
                  checked={tipoImagem === 'arquivo'}
                  onChange={() => setTipoImagem('arquivo')}
                  className="accent-rose-600"
                />
                Enviar Arquivo
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="tipoImagem"
                  checked={tipoImagem === 'url'}
                  onChange={() => setTipoImagem('url')}
                  className="accent-rose-600"
                />
                Link da Internet (URL)
              </label>
            </div>

            {tipoImagem === 'arquivo' ? (
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
              />
            ) : (
              <input
                type="url"
                placeholder="https://exemplo.com/imagem.jpg"
                value={imagemUrl}
                onChange={(e) => {
                  setImagemUrl(e.target.value);
                  setPrevia(e.target.value);
                }}
                className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
              />
            )}

            {previa && (
              <div className="pt-2 flex items-center gap-3">
                <img
                  src={previa}
                  alt="Prévia"
                  className="w-14 h-14 object-cover rounded-lg border border-gray-200"
                />
                <span className="text-xs text-gray-400">Prévia da imagem selecionada</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={enviando}
            className={`w-full font-bold py-3 rounded-xl shadow-sm transition-all active:scale-98 text-sm text-white ${
              produtoEditandoId 
                ? 'bg-amber-600 hover:bg-amber-700' 
                : 'bg-rose-600 hover:bg-rose-700'
            }`}
          >
            {enviando 
              ? 'Salvando...' 
              : produtoEditandoId 
                ? 'Salvar Alterações do Produto' 
                : 'Salvar Novo Produto'
            }
          </button>
        </form>
      </div>

      {/* ================= 2. PAINEL DE GESTÃO DE PRODUTOS ================= */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">🛠️ Gestão de Itens do Cardápio</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
          </span>
        </h3>

        {carregandoLista ? (
          <p className="text-xs text-gray-400 text-center py-6">Carregando lista...</p>
        ) : produtos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">Nenhum produto cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {produtos.map((prod) => {
              const estaDisponivel = prod.disponivel !== false && prod.disponivel !== 0;

              return (
                <div
                  key={prod.id}
                  className={`p-3.5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 transition-all ${
                    estaDisponivel 
                      ? 'bg-gray-50/80 border-gray-200/60 hover:bg-white hover:shadow-2xs' 
                      : 'bg-gray-100/50 border-gray-200/40 opacity-75'
                  }`}
                >
                  {/* Imagem + Detalhes */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/80'}
                      alt={prod.nome}
                      className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-gray-900 text-sm truncate">
                          {prod.nome}
                        </h4>
                        
                        {/* Status Clicável (Badge Interativa) */}
                        <button
                          type="button"
                          onClick={() => toggleDisponibilidade(prod)}
                          title="Clique para alterar a disponibilidade"
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                            estaDisponivel 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100'
                          }`}
                        >
                          {estaDisponivel ? '● Disponível' : '○ Indisponível'}
                        </button>
                      </div>

                      <p className="text-[11px] text-gray-500 truncate max-w-md">
                        {prod.descricao || 'Sem descrição'}
                      </p>
                    </div>
                  </div>

                  {/* Preço + Botões de Ação */}
                  <div className="flex items-center justify-between md:justify-end gap-2 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-gray-200/60 flex-shrink-0">
                    <strong className="text-emerald-600 text-sm font-extrabold mr-2">
                      R$ {Number(prod.preco).toFixed(2)}
                    </strong>

                    {/* Botão Editar */}
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(prod)}
                      className="text-xs bg-white hover:bg-amber-50 text-amber-700 border border-gray-200 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      ✏️ Editar
                    </button>

                    {/* Botão Excluir */}
                    <button
                      type="button"
                      onClick={() => excluirProduto(prod.id, prod.nome)}
                      className="text-xs bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 font-bold px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      🗑️ Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}