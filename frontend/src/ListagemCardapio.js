import React, { useState, useEffect } from 'react';

export default function ListagemCardapio() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');

  // Função para garantir que a URL da imagem venha completa e válida
  const formatarUrlImagem = (url) => {
    if (!url) return 'https://via.placeholder.com/150?text=Sem+Foto';
    
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    const caminhoLimpo = url.startsWith('/') ? url : `/${url}`;
    return `http://localhost:3000${caminhoLimpo}`;
  };

  // Buscar produtos do backend
  const buscarProdutos = async () => {
    try {
      const resposta = await fetch('http://localhost:3000/api/produtos');
      if (!resposta.ok) throw new Error('Erro ao buscar produtos');
      const dados = await resposta.json();
      setProdutos(dados);
    } catch (erro) {
      console.error('Erro na requisição GET:', erro);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    buscarProdutos();
  }, []);

  // Filtragem simples por termo de busca
  const produtosFiltrados = produtos.filter((prod) =>
    prod.nome.toLowerCase().includes(termoBusca.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm font-sans space-y-6">
      
      {/* ================= BARRA DE PESQUISA ================= */}
      <div className="max-w-md">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
            🔍
          </span>
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all bg-gray-50/50"
          />
        </div>
      </div>

      {/* ================= LISTAGEM DE PRODUTOS ================= */}
      {carregando ? (
        <p className="text-center py-10 text-gray-500">Carregando lista de produtos...</p>
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          Nenhum produto encontrado.
        </div>
      ) : (
        <div className="border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
          
          {/* Faixa Superior / Cabeçalho do Bloco */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
            <span className="font-bold text-sm tracking-wide flex items-center gap-2">
              📋 Cardápio Disponível
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 font-semibold px-2.5 py-1 rounded-full border border-slate-700">
              {produtosFiltrados.length} {produtosFiltrados.length === 1 ? 'item' : 'itens'}
            </span>
          </div>

          {/* Tabela/Lista de Produtos */}
          <div className="divide-y divide-gray-100 bg-white">
            {produtosFiltrados.map((prod) => (
              <div 
                key={prod.id} 
                className="p-4 flex items-center justify-between hover:bg-gray-50/80 transition-colors gap-4"
              >
                {/* Imagem + Informações do Produto */}
                <div className="flex items-center gap-4 max-w-xl min-w-0">
                  <img
                    src={formatarUrlImagem(prod.imagem_url || prod.imagem)}
                    alt={prod.nome}
                    className="w-14 h-14 object-cover rounded-xl border border-gray-200 flex-shrink-0 bg-gray-50"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://via.placeholder.com/150?text=Sem+Foto';
                    }}
                  />

                  <div className="space-y-1 min-w-0">
                    <h4 className="font-bold text-gray-900 text-base leading-tight truncate">
                      {prod.nome}
                    </h4>
                    {prod.descricao && (
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                        {prod.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {/* Preço */}
                <div className="flex-shrink-0">
                  <span className="text-emerald-600 font-extrabold text-base">
                    R$ {Number(prod.preco).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

    </div>
  );
}