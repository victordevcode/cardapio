import React, { useState, useEffect, useCallback } from 'react';

// Mapeamento visual das colunas do Kanban
const COLUNAS = [
  { id: 'pendente', titulo: '📥 Novos Pedidos', corHeader: 'bg-amber-500', bgColuna: 'bg-amber-50/50' },
  { id: 'em_preparo', titulo: '👨‍🍳 Em Preparo', corHeader: 'bg-blue-500', bgColuna: 'bg-blue-50/50' },
  { id: 'pronto', titulo: '✅ Prontos', corHeader: 'bg-emerald-500', bgColuna: 'bg-emerald-50/50' },
  { id: 'entregue', titulo: '🚀 Entregues / Finalizados', corHeader: 'bg-gray-400', bgColuna: 'bg-gray-50/50' },
];

export default function QuadroKanbanPedidos({ aoAbrirCardapio }) {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  // 1. Buscar Pedidos da API
  const buscarPedidos = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:3000/api/pedidos', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erro ao carregar pedidos.');
      const dados = await res.json();
      setPedidos(dados);
      setErro('');
    } catch (err) {
      console.error(err);
      setErro('Falha ao conectar com o servidor da cozinha.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Polling: Atualiza a lista automaticamente a cada 10 segundos
  useEffect(() => {
    buscarPedidos();
    const interval = setInterval(buscarPedidos, 10000);
    return () => clearInterval(interval);
  }, [buscarPedidos]);

  // 2. Atualizar Status do Pedido (Avançar / Voltar)
  const moverStatus = async (pedidoId, novoStatus) => {
    const token = localStorage.getItem('token');

    // Atualização Otimista no Front-end (Fica instantâneo na tela)
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
    );

    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: novoStatus }),
      });

      if (!res.ok) {
        buscarPedidos(); // Recarrega do banco se falhar
        alert('Não foi possível atualizar o status do pedido.');
      }
    } catch (err) {
      console.error(err);
      buscarPedidos();
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen">
      {/* Cabeçalho do Kanban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🍳 Cozinha - Gestão de Pedidos</h1>
          <p className="text-sm text-gray-500">Acompanhe o preparo dos pedidos em tempo real</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={buscarPedidos}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
          >
            🔄 Atualizar
          </button>
          
          {aoAbrirCardapio && (
            <button
              onClick={aoAbrirCardapio}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              🍔 Ir ao Cardápio
            </button>
          )}
        </div>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm font-semibold">
          {erro}
        </div>
      )}

      {/* Colunas do Kanban */}
      {carregando ? (
        <p className="text-gray-500 text-center py-10">Carregando quadro de pedidos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUNAS.map((col) => {
            const pedidosDaColuna = pedidos.filter((p) => p.status === col.id);

            return (
              <div key={col.id} className={`rounded-xl border border-gray-200 ${col.bgColuna} p-3 min-h-[500px] flex flex-col`}>
                {/* Header da Coluna */}
                <div className={`${col.corHeader} text-white px-3 py-2 rounded-lg font-bold text-sm flex justify-between items-center mb-3 shadow-sm`}>
                  <span>{col.titulo}</span>
                  <span className="bg-white/30 px-2 py-0.5 rounded-full text-xs">
                    {pedidosDaColuna.length}
                  </span>
                </div>

                {/* Cards de Pedidos */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {pedidosDaColuna.length === 0 ? (
                    <div className="text-center py-8 text-xs text-gray-400 font-medium">
                      Nenhum pedido aqui
                    </div>
                  ) : (
                    pedidosDaColuna.map((ped) => (
                      <div
                        key={ped.id}
                        className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          {/* Topo do Card */}
                          <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                            <div>
                              <span className="font-bold text-gray-800 text-base">Pedido #{ped.id}</span>
                              <p className="text-xs text-gray-500">Mesa / Cliente: {ped.cliente || ped.mesa || 'Balcão'}</p>
                            </div>
                            <span className="text-[10px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {ped.hora || 'Agora'}
                            </span>
                          </div>

                          {/* Lista de Itens do Pedido */}
                          <div className="space-y-1.5 my-3">
                            {ped.itens && ped.itens.map((item, idx) => (
                              <div key={idx} className="text-xs text-gray-700 flex justify-between">
                                <span><strong className="text-indigo-600">{item.quantidade}x</strong> {item.nome}</span>
                                {item.observacao && (
                                  <p className="text-[10px] text-amber-600 italic">Obs: {item.observacao}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Botões de Ação de Mudança de Status */}
                        <div className="pt-3 border-t border-gray-100 flex gap-2 justify-between">
                          {col.id === 'pendente' && (
                            <button
                              onClick={() => moverStatus(ped.id, 'em_preparo')}
                              className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded transition-colors"
                            >
                              👨‍🍳 Iniciar Preparo
                            </button>
                          )}

                          {col.id === 'em_preparo' && (
                            <>
                              <button
                                onClick={() => moverStatus(ped.id, 'pendente')}
                                className="px-2 py-1.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded hover:bg-gray-300"
                              >
                                ↩
                              </button>
                              <button
                                onClick={() => moverStatus(ped.id, 'pronto')}
                                className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors"
                              >
                                ✅ Concluir Pedido
                              </button>
                            </>
                          )}

                          {col.id === 'pronto' && (
                            <>
                              <button
                                onClick={() => moverStatus(ped.id, 'em_preparo')}
                                className="px-2 py-1.5 bg-gray-200 text-gray-600 text-xs font-semibold rounded hover:bg-gray-300"
                              >
                                ↩
                              </button>
                              <button
                                onClick={() => moverStatus(ped.id, 'entregue')}
                                className="flex-1 py-1.5 bg-gray-800 hover:bg-gray-900 text-white text-xs font-bold rounded transition-colors"
                              >
                                🚀 Marcar Entregue
                              </button>
                            </>
                          )}

                          {col.id === 'entregue' && (
                            <span className="text-[11px] text-emerald-600 font-bold text-center w-full block">
                              ✓ Finalizado
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}