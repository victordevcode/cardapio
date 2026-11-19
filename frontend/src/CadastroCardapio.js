import React, { useState, useEffect, useCallback } from 'react';

export default function CadastroCardapio() {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [categorias, setCategorias] = useState([]);
  const [produtos, setProdutos] = useState([]);

  // Estado para armazenar os sabores de suco no admin
  const [saboresSuco, setSaboresSuco] = useState([]);

  // Estado para busca por nome do produto
  const [busca, setBusca] = useState('');

  // Estado para exibir/ocultar o formulário
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

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
      const res = await fetch('/api/categorias');
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
      const res = await fetch('/api/produtos');
      if (!res.ok) throw new Error('Erro ao buscar produtos');
      const dados = await res.json();
      setProdutos(dados);
    } catch (err) {
      console.error('Erro ao buscar produtos:', err);
    } finally {
      setCarregandoLista(false);
    }
  }, []);

  // 3. Buscar sabores de suco para o Admin gerenciar
  const buscarSaboresSuco = useCallback(async () => {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch('/api/sabores-suco-admin', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar sabores de suco');
      const dados = await res.json();
      setSaboresSuco(dados);
    } catch (err) {
      console.error('Erro ao buscar sabores de suco:', err);
    }
  }, []);

  useEffect(() => {
    buscarCategorias();
    buscarProdutos();
    buscarSaboresSuco();
  }, [buscarCategorias, buscarProdutos, buscarSaboresSuco]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArquivoImagem(file);
      setPrevia(URL.createObjectURL(file));
    }
  };

  const limparFormulario = () => {
    setNome('');
    setDescricao('');
    setPreco('');
    setImagemUrl('');
    setArquivoImagem(null);
    setPrevia('');
    setProdutoEditandoId(null);
    setMostrarFormulario(false);
  };

  const abrirFormularioNovo = () => {
    if (mostrarFormulario && !produtoEditandoId) {
      limparFormulario();
    } else {
      setNome('');
      setDescricao('');
      setPreco('');
      setImagemUrl('');
      setArquivoImagem(null);
      setPrevia('');
      setProdutoEditandoId(null);
      if (categorias.length > 0) setCategoriaId(categorias[0].id);
      setMostrarFormulario(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleDisponibilidade = async (prod) => {
    const statusAtual = prod.disponivel !== false && prod.disponivel !== 0;
    const novaSituacao = !statusAtual;

    setProdutos((prev) =>
      prev.map((p) => (p.id === prod.id ? { ...p, disponivel: novaSituacao } : p))
    );

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/produtos/${prod.id}/disponibilidade`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ disponivel: novaSituacao }),
      });

      if (!res.ok) throw new Error('Falha ao atualizar no servidor');
    } catch (err) {
      console.error('Erro ao alterar disponibilidade:', err);
      setProdutos((prev) =>
        prev.map((p) => (p.id === prod.id ? { ...p, disponivel: statusAtual } : p))
      );
      alert('Não foi possível alterar a disponibilidade no servidor.');
    }
  };

  const toggleStatusSabor = async (saborObj) => {
    const statusAtual = saborObj.ativo;
    const novoStatus = !statusAtual;

    setSaboresSuco((prev) =>
      prev.map((s) => (s.id === saborObj.id ? { ...s, ativo: novoStatus } : s))
    );

    try {
      const res = await fetch(`/api/sabores-suco/${saborObj.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: novoStatus }),
      });

      if (!res.ok) throw new Error('Falha ao atualizar status do sabor');
    } catch (err) {
      console.error('Erro ao alterar status do sabor:', err);
      setSaboresSuco((prev) =>
        prev.map((s) => (s.id === saborObj.id ? { ...s, ativo: statusAtual } : s))
      );
      alert('Não foi possível alterar o status do sabor no servidor.');
    }
  };

  const excluirProduto = async (id, nomeProduto) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${nomeProduto}"?`)) return;

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/produtos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir produto');

      alert('🗑️ Produto excluído com sucesso!');
      buscarProdutos();
    } catch (err) {
      console.error('Erro ao excluir:', err);
      alert('❌ Não foi possível excluir o produto.');
    }
  };

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
        ? `/api/produtos/${produtoEditandoId}`
        : '/api/produtos';

      const method = produtoEditandoId ? 'PUT' : 'POST';
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error('Erro ao salvar produto');

      alert(produtoEditandoId ? '✏️ Produto atualizado com sucesso!' : '✅ Produto cadastrado com sucesso!');
      limparFormulario();
      buscarProdutos();
    } catch (err) {
      console.error(err);
      alert(`❌ ${err.message || 'Ocorreu um erro ao salvar o produto.'}`);
    } finally {
      setEnviando(false);
    }
  };

  const produtosFiltrados = produtos.filter((prod) =>
    (prod.nome || '').toLowerCase().includes(busca.toLowerCase()) ||
    (prod.descricao || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto font-sans space-y-6 pb-12">
      
      {/* BARRA SUPERIOR COM BOTÃO E INPUT DE BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-900 p-4 rounded-2xl border border-stone-800 shadow-md">
        <button
          type="button"
          onClick={abrirFormularioNovo}
          className="bg-red-600 hover:bg-red-700 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
        >
          {mostrarFormulario ? '✕ Fechar Formulário' : '➕ Novo Produto'}
        </button>

        {/* Campo de Busca por Nome */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="🔍 Buscar produto pelo nome..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm border border-stone-700 rounded-xl bg-neutral-950 text-white placeholder-stone-400 focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-inner"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FORMULÁRIO DE CADASTRO / EDIÇÃO */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl border-2 border-stone-200 shadow-xl transition-all">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-stone-100">
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              {produtoEditandoId ? '✏️ Editar Produto' : '➕ Cadastrar Novo Produto'}
            </h2>

            <button
              type="button"
              onClick={limparFormulario}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              ✕ Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-stone-700 mb-1 uppercase tracking-wide">Nome do Produto*</label>
              <input
                type="text"
                required
                placeholder="Ex: X-Salada Especial"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none bg-stone-50"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-stone-700 mb-1 uppercase tracking-wide">Categoria*</label>
                <select
                  value={categoriaId}
                  onChange={(e) => setCategoriaId(e.target.value)}
                  className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none bg-stone-50"
                >
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-700 mb-1 uppercase tracking-wide">Preço (R$)*</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none bg-stone-50 font-bold text-emerald-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-stone-700 mb-1 uppercase tracking-wide">Descrição</label>
              <textarea
                rows="2"
                placeholder="Ingredientes e detalhes do produto..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none bg-stone-50"
              />
            </div>

            <div className="border border-stone-200 p-4 rounded-xl bg-stone-50/50 space-y-3">
              <label className="block text-xs font-black text-stone-700 uppercase tracking-wide">Imagem do Produto</label>

              <div className="flex gap-6 text-xs font-bold text-stone-700">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoImagem"
                    checked={tipoImagem === 'arquivo'}
                    onChange={() => setTipoImagem('arquivo')}
                    className="accent-red-600"
                  />
                  Enviar Arquivo
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="tipoImagem"
                    checked={tipoImagem === 'url'}
                    onChange={() => setTipoImagem('url')}
                    className="accent-red-600"
                  />
                  Link da Internet (URL)
                </label>
              </div>

              {tipoImagem === 'arquivo' ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-stone-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 cursor-pointer bg-white border border-stone-200 rounded-xl p-1"
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
                  className="w-full p-3 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-600 focus:outline-none bg-white"
                />
              )}

              {previa && (
                <div className="pt-2 flex items-center gap-3">
                  <img src={previa} alt="Prévia" className="w-14 h-14 object-cover rounded-xl border border-stone-300 shadow-xs" />
                  <span className="text-xs text-stone-500 font-medium">Prévia da imagem selecionada</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={enviando}
              className={`w-full font-black py-3.5 rounded-xl shadow-md transition-all text-sm text-white cursor-pointer active:scale-98 ${
                produtoEditandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {enviando ? 'Salvando...' : produtoEditandoId ? 'Salvar Alterações do Produto' : 'Salvar Novo Produto'}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE PRODUTOS FILTRADOS */}
      <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-md">
        <h3 className="text-base font-black text-stone-900 mb-5 flex items-center justify-between pb-3 border-b border-stone-100">
          <span className="flex items-center gap-2">🛠️ Gestão de Itens do Cardápio</span>
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-black">
            {produtosFiltrados.length} de {produtos.length} {produtos.length === 1 ? 'item' : 'itens'}
          </span>
        </h3>

        {carregandoLista ? (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs text-stone-400 font-medium">Carregando lista...</p>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-8 font-medium">
            {busca ? `Nenhum produto encontrado para "${busca}".` : 'Nenhum produto cadastrado ainda.'}
          </p>
        ) : (
          <div className="space-y-3.5">
            {produtosFiltrados.map((prod) => {
              const estaDisponivel = prod.disponivel !== false && prod.disponivel !== 0;
              const isSuco = (prod.nome || '').toLowerCase().includes('suco');

              return (
                <div
                  key={prod.id}
                  className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                    estaDisponivel 
                      ? 'bg-stone-50/60 border-stone-200 hover:bg-white hover:border-red-200 hover:shadow-sm' 
                      : 'bg-stone-100 border-stone-300 opacity-75'
                  }`}
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5 flex-1 min-w-0">
                      <img
                        src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/80'}
                        alt={prod.nome}
                        className="w-14 h-14 object-cover rounded-xl border border-stone-300 shadow-2xs flex-shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h4 className="font-extrabold text-stone-900 text-sm truncate">{prod.nome}</h4>
                          <button
                            type="button"
                            onClick={() => toggleDisponibilidade(prod)}
                            className={`text-xs font-black px-3 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                              estaDisponivel 
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200' 
                                : 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200'
                            }`}
                          >
                            {estaDisponivel ? '🟢 Disponível' : '🔴 Indisponível'}
                          </button>
                        </div>
                        <p className="text-xs text-stone-500 truncate max-w-md mt-1">
                          {prod.descricao || 'Sem descrição'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-2.5 w-full md:w-auto pt-2.5 md:pt-0 border-t md:border-t-0 border-stone-200 flex-shrink-0">
                      <strong className="text-emerald-700 text-base font-black mr-2">
                        R$ {Number(prod.preco).toFixed(2)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => iniciarEdicao(prod)}
                        className="text-xs bg-stone-100 hover:bg-amber-100 text-amber-900 border border-stone-300 font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => excluirProduto(prod.id, prod.nome)}
                        className="text-xs bg-stone-100 hover:bg-red-100 text-red-700 border border-stone-300 font-extrabold px-3 py-2 rounded-xl transition-all cursor-pointer active:scale-95"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>

                  {/* SE FOR SUCO, EXIBE OS SABORES DIRETAMENTE NO CARD */}
                  {isSuco && saboresSuco.length > 0 && (
                    <div className="pt-2.5 border-t border-stone-200/80 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black text-stone-500 mr-1 uppercase">Sabores:</span>
                      {saboresSuco.map((saborObj) => (
                        <button
                          key={saborObj.id}
                          type="button"
                          onClick={() => toggleStatusSabor(saborObj)}
                          className={`text-xs font-extrabold px-3 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95 ${
                            saborObj.ativo
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
                          }`}
                        >
                          <span>{saborObj.sabor}</span>
                          <span className={`w-2 h-2 rounded-full ${saborObj.ativo ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}