import React, { useState, useEffect } from 'react';

export default function ListagemCardapio({ onNovoItemClick }) {
  const [itens, setItens] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Busca os produtos do backend
  const carregarCardapio = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/produtos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const dados = await res.json();
        setItens(dados);
      }
    } catch (err) {
      console.error("Erro ao buscar cardápio:", err);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarCardapio();
  }, []);

  // Exclusão de Item
  const handleExcluir = async (id) => {
    if (window.confirm('Tem certeza que deseja remover este item do cardápio?')) {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`http://localhost:3000/api/produtos/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          setItens(itens.filter(item => item.id !== id));
        }
      } catch (err) {
        alert("Erro ao excluir o produto.");
      }
    }
  };

  // 1. Filtra os itens pela busca
  const itensFiltrados = itens.filter(item =>
    item.nome.toLowerCase().includes(busca.toLowerCase())
  );

  // 2. Agrupa os itens filtrados por Categoria
  const itensAgrupados = itensFiltrados.reduce((acc, item) => {
    const categoria = item.categoria || 'Outros';
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(item);
    return acc;
  }, {});

  const categorias = Object.keys(itensAgrupados);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Cabeçalho da Tela */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">📋 Cardápio do Restaurante</h2>
          <p className="text-sm text-gray-500">Produtos organizados por categoria</p>
        </div>

        <button
          onClick={onNovoItemClick}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2 rounded-lg shadow transition-all flex items-center gap-2"
        >
          <span>➕</span> Novo Produto
        </button>
      </div>

      {/* Barra de Busca */}
      <div className="mb-8">
        <input
          type="text"
          placeholder="🔍 Buscar produto por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full sm:w-96 p-2.5 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
        />
      </div>

      {/* Estado de Carregamento */}
      {carregando ? (
        <p className="text-center py-8 text-gray-500">Carregando cardápio...</p>
      ) : categorias.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
          <p className="text-gray-500">Nenhum produto encontrado.</p>
        </div>
      ) : (
        /* Seções de Categorias */
        <div className="space-y-8">
          {categorias.map((categoria) => (
            <div key={categoria} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              
              {/* Título da Categoria */}
              <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                <h3 className="text-lg font-bold tracking-wide uppercase flex items-center gap-2">
                  <span>🏷️</span> {categoria}
                </h3>
                <span className="bg-gray-700 text-gray-200 text-xs px-2.5 py-1 rounded-full font-medium">
                  {itensAgrupados[categoria].length} {itensAgrupados[categoria].length === 1 ? 'item' : 'itens'}
                </span>
              </div>

              {/* Grid / Tabela de Produtos da Categoria */}
              <div className="divide-y divide-gray-100">
                {itensAgrupados[categoria].map((item) => (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center hover:bg-gray-50 transition-colors gap-3"
                  >
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-gray-900">{item.nome}</h4>
                      {item.descricao && (
                        <p className="text-sm text-gray-500 mt-0.5">{item.descricao}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-6">
                      <span className="text-lg font-extrabold text-emerald-600">
                        R$ {Number(item.preco).toFixed(2)}
                      </span>

                      <button
                        onClick={() => handleExcluir(item.id)}
                        className="text-red-500 hover:text-red-700 font-medium text-xs px-3 py-1.5 rounded hover:bg-red-50 transition-colors border border-red-200"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
}