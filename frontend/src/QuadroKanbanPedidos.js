import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';

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
  const [pedidoArrastadoId, setPedidoArrastadoId] = useState(null);

  // 1. Buscar Pedidos do Supabase
  const buscarPedidos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          itens_pedido (*)
        `)
        .order('id', { ascending: false });

      if (error) throw error;

      setPedidos(data || []);
      setErro('');
    } catch (err) {
      console.error('Erro ao buscar pedidos no Supabase:', err.message);
      setErro('Falha ao carregar pedidos do Supabase.');
    } finally {
      setCarregando(false);
    }
  }, []);

  // Escuta alterações em tempo real + Polling de segurança a cada 10s
  useEffect(() => {
    buscarPedidos();

    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => {
          buscarPedidos();
        }
      )
      .subscribe();

    const interval = setInterval(buscarPedidos, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [buscarPedidos]);

  // 2. Atualizar Status do Pedido no Supabase
  const moverStatus = async (pedidoId, novoStatus) => {
    // Atualização Otimista no React
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
    );

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', pedidoId);

      if (error) {
        console.error('Erro no Supabase:', error.message);
        buscarPedidos(); // Reverte em caso de erro
        alert('Não foi possível atualizar o status no banco de dados.');
      }
    } catch (err) {
      console.error(err);
      buscarPedidos();
    }
  };

  // --- FUNÇÕES DE DRAG AND DROP ---
  const handleDragStart = (e, pedidoId) => {
    setPedidoArrastadoId(pedidoId);
    e.dataTransfer.setData('text/plain', pedidoId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); // Necessário para permitir o "Drop"
  };

  const handleDrop = (e, statusColunaDestino) => {
    e.preventDefault();
    if (!pedidoArrastadoId) return;

    moverStatus(pedidoArrastadoId, statusColunaDestino);
    setPedidoArrastadoId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen">
      {/* Cabeçalho do Kanban */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🍳 Cozinha - Gestão de Pedidos</h1>
          <p className="text-sm text-gray-500">Arraste os cards para mudar o status do pedido</p>
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
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-xl border border-gray-200 ${col.bgColuna} p-3 min-h-[500px] flex flex-col transition-colors border-dashed hover:border-indigo-300`}
              >
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
                    <div className="text-center py-8 text-xs text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-lg">
                      Arraste um pedido para cá
                    </div>
                  ) : (
                    pedidosDaColuna.map((ped) => (
                      <div
                        key={ped.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, ped.id)}
                        className={`bg-white rounded-lg p-4 border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
                          pedidoArrastadoId === ped.id ? 'opacity-40 scale-95' : 'opacity-100'
                        }`}
                      >
                        <div>
                          {/* Topo do Card */}
                          <div className="flex justify-between items-start mb-2 border-b border-gray-100 pb-2">
                            <div>
                              <span className="font-bold text-gray-800 text-base">Pedido #{ped.id}</span>
                              <p className="text-xs text-gray-500">
                                Cliente: {ped.cliente_nome || 'Balcão'}
                              </p>
                              {ped.cliente_telefone && (
                                <p className="text-[11px] text-gray-400">Tel: {ped.cliente_telefone}</p>
                              )}
                            </div>
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                              R$ {Number(ped.valor_total || 0).toFixed(2)}
                            </span>
                          </div>

                          {ped.endereco_entrega && (
                            <p className="text-xs text-gray-600 mb-2 font-medium">
                              📍 {ped.endereco_entrega}
                            </p>
                          )}

                          {/* Lista de Itens do Pedido */}
                          <div className="space-y-1.5 my-3 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {ped.itens_pedido && ped.itens_pedido.length > 0 ? (
                              ped.itens_pedido.map((item, idx) => (
                                <div key={item.id || idx} className="text-xs text-gray-700 flex justify-between items-center">
                                  <span>
                                    <strong className="text-indigo-600">{item.quantidade}x</strong> {item.nome || `Produto #${item.produto_id}`}
                                  </span>
                                  {item.observacao_item && (
                                    <span className="text-[10px] text-amber-600 italic">Obs: {item.observacao_item}</span>
                                  )}
                                </div>
                              ))
                            ) : (
                              <p className="text-[11px] text-gray-400 italic">Sem itens detalhados</p>
                            )}
                          </div>

                          {ped.observacoes && (
                            <p className="text-xs text-amber-700 bg-amber-50 p-2 rounded mb-1 border border-amber-200">
                              <strong>Obs Geral:</strong> {ped.observacoes}
                            </p>
                          )}
                        </div>

                        {/* Dica visual para arrastar */}
                        <div className="pt-2 border-t border-gray-100 text-center">
                          <span className="text-[10px] text-gray-400 font-medium">
                            ≡ Segure e arraste para mudar
                          </span>
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