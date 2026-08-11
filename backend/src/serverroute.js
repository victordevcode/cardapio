import React, { useState, useMemo } from 'react';

// Dados de exemplo (Simulando resposta da API)
const ITENS_INICIAIS = [
  {
    id: 1,
    nome: 'X-Burger Artesanal Bacon',
    categoria: 'burgers',
    descricao: 'Pão brioche, blend 180g, queijo cheddar, bacon crocante e molho da casa.',
    precoVenda: 35.0,
    precoPromocional: 29.9,
    status: 'ativo',
    imagem: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 2,
    nome: 'Batata Frita Rústica',
    categoria: 'entradas',
    descricao: 'Acompanha maionese temperada e alecrim.',
    precoVenda: 22.0,
    precoPromocional: null,
    status: 'ativo',
    imagem: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 3,
    nome: 'Suco Natural de Laranja 500ml',
    categoria: 'bebidas',
    descricao: '100% fruta, sem adição de açúcar.',
    precoVenda: 12.0,
    precoPromocional: null,
    status: 'pausado',
    imagem: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 4,
    nome: 'Petit Gâteau de Chocolate',
    categoria: 'sobremesas',
    descricao: 'Acompanha uma bola de sorvete de baunilha.',
    precoVenda: 26.0,
    precoPromocional: null,
    status: 'inativo',
    imagem: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=150&auto=format&fit=crop&q=80',
  },
];

export default function ListagemCardapio({ onNovoItemClick }) {
  const [itens, setItens] = useState(ITENS_INICIAIS);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState('todos');

  // Alterna o status do item diretamente na lista
  const handleToggleStatus = (id) => {
    setItens((prevItens) =>
      prevItens.map((item) => {
        if (item.id === id) {
          // Ciclo: ativo -> pausado -> inativo -> ativo
          const proximoStatus =
            item.status === 'ativo'
              ? 'pausado'
              : item.status === 'pausado'
              ? 'inativo'
              : 'ativo';
          return { ...item, status: proximoStatus };
        }
        return item;
      })
    );
  };

  // Exclui um item
  const handleExcluir = (id) => {
    if (confirm('Tem certeza que deseja remover este item do cardápio?')) {
      setItens((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Filtragem dinâmica dos itens
  const itensFiltrados = useMemo(() => {
    return itens.filter((item) => {
      const atendeBusca =
        item.nome.toLowerCase().includes(busca.toLowerCase()) ||
        item.descricao.toLowerCase().includes(busca.toLowerCase());

      const atendeCategoria =
        categoriaFiltro === 'todas' || item.categoria === categoriaFiltro;

      const atendeStatus =
        statusFiltro === 'todos' || item.status === statusFiltro;

      return atendeBusca && atendeCategoria && atendeStatus;
    });
  }, [itens, busca, categoriaFiltro, statusFiltro]);

  // Contadores para os Cards no topo
  const contadores = useMemo(() => {
    return {
      total: itens.length,
      ativos: itens.filter((i) => i.status === 'ativo').length,
      pausados: itens.filter((i) => i.status === 'pausado').length,
    };
  }, [itens]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Cardápio</h1>
          <p className="text-sm text-gray-500">Gerencie todos os produtos do seu restaurante</p>
        </div>
        <button
          onClick={onNovoItemClick}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
        >
          <span>+ Novo Item</span>
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Total de Itens</p>
            <p className="text-2xl font-bold text-gray-800">{contadores.total}</p>
          </div>
          <span className="p-3 bg-gray-100 text-gray-600 rounded-lg text-lg">📦</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Itens Ativos</p>
            <p className="text-2xl font-bold text-emerald-600">{contadores.ativos}</p>
          </div>
          <span className="p-3 bg-emerald-50 text-emerald-600 rounded-lg text-lg">🟢</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase">Pausados / Esgotados</p>
            <p className="text-2xl font-bold text-amber-600">{contadores.pausados}</p>
          </div>
          <span className="p-3 bg-amber-50 text-amber-600 rounded-lg text-lg">🟡</span>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        {/* Input de Busca */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Buscar por nome ou ingrediente..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
        </div>

        {/* Filtro por Categoria */}
        <div className="w-full sm:w-48">
          <select
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todas">Todas as Categorias</option>
            <option value="entradas">Entradas</option>
            <option value="principais">Pratos Principais</option>
            <option value="burgers">Hambúrgueres</option>
            <option value="bebidas">Bebidas</option>
            <option value="sobremesas">Sobremesas</option>
          </select>
        </div>

        {/* Filtro por Status */}
        <div className="w-full sm:w-44">
          <select
            value={statusFiltro}
            onChange={(e) => setStatusFiltro(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="ativo">🟢 Ativo</option>
            <option value="pausado">🟡 Esgotado</option>
            <option value="inativo">🔴 Inativo</option>
          </select>
        </div>
      </div>

      {/* Tabela de Itens */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {itensFiltrados.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            Nenhum item encontrado com os filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Item</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4">Preço</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                {itensFiltrados.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Item (Imagem + Nome + Descrição) */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                        />
                        <div>
                          <p className="font-semibold text-gray-800">{item.nome}</p>
                          <p className="text-xs text-gray-500 line-clamp-1 max-w-xs">
                            {item.descricao}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Categoria */}
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium capitalize">
                        {item.categoria}
                      </span>
                    </td>

                    {/* Preço */}
                    <td className="py-3 px-4 font-medium">
                      {item.precoPromocional ? (
                        <div>
                          <span className="text-emerald-600 font-bold">
                            R$ {item.precoPromocional.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-xs text-gray-400 line-through block">
                            R$ {item.precoVenda.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ) : (
                        <span>R$ {item.precoVenda.toFixed(2).replace('.', ',')}</span>
                      )}
                    </td>

                    {/* Status e Ação Rápida de Alteração */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleStatus(item.id)}
                        title="Clique para alternar o status"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer transition-all ${
                          item.status === 'ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : item.status === 'pausado'
                            ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                            : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full bg-current"></span>
                        <span className="capitalize">
                          {item.status === 'ativo'
                            ? 'Ativo'
                            : item.status === 'pausado'
                            ? 'Esgotado'
                            : 'Inativo'}
                        </span>
                      </button>
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        className="text-gray-500 hover:text-indigo-600 font-medium text-xs p-1"
                        title="Editar Item"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(item.id)}
                        className="text-gray-400 hover:text-red-600 font-medium text-xs p-1"
                        title="Excluir Item"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}