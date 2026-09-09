import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';

const COLUNAS = [
  { id: 'pendente', titulo: '📥 Novos Pedidos', corHeader: 'bg-amber-500', bgColuna: 'bg-amber-50/30' },
  { id: 'em_preparo', titulo: '👨‍🍳 Em Preparo', corHeader: 'bg-blue-500', bgColuna: 'bg-blue-50/30' },
  { id: 'pronto', titulo: '✅ Prontos', corHeader: 'bg-emerald-500', bgColuna: 'bg-emerald-50/30' },
  { id: 'entregue', titulo: '🚀 Entregues / Finalizados', corHeader: 'bg-gray-400', bgColuna: 'bg-gray-50/30' },
];

export default function QuadroKanbanPedidos({ aoAbrirCardapio }) {
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [pedidoArrastadoId, setPedidoArrastadoId] = useState(null);


  //------Buscado de Pedidos--------//

const buscarPedidos = useCallback(async () => {
    try {
      // 1. Busca os pedidos
      const { data: dadosPedidos, error: errPedidos } = await supabase
        .from('pedidos')
        .select('*')
        .order('id', { ascending: false });

      if (errPedidos) throw errPedidos;

      // 2. Busca os itens da tabela 'pedido_itens'
      const { data: dadosItens, error: errItens } = await supabase
        .from('pedido_itens')
        .select('*');

      if (errItens) console.error('Erro ao buscar itens:', errItens.message);

      console.log('📌 Pedidos:', dadosPedidos);
      console.log('📌 Itens:', dadosItens);

      // 3. Junta os dados independente do tipo do ID
      const pedidosComItens = (dadosPedidos || []).map((pedido) => {
        const itensDoPedido = (dadosItens || []).filter(
          (item) => String(item.pedido_id || item.id_pedido) === String(pedido.id)
        );
        return {
          ...pedido,
          pedido_itens: itensDoPedido,
        };
      });

      setPedidos(pedidosComItens);
      setErro('');
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err.message);
      setErro('Falha ao carregar pedidos: ' + err.message);
    } finally {
      setCarregando(false);
    }
  }, []);
  
  useEffect(() => {
    buscarPedidos();

    const channel = supabase
      .channel('pedidos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        () => buscarPedidos()
      )
      .subscribe();

    const interval = setInterval(buscarPedidos, 10000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [buscarPedidos]);

  const moverStatus = async (pedidoId, novoStatus) => {
    setPedidos((prev) =>
      prev.map((p) => (p.id === pedidoId ? { ...p, status: novoStatus } : p))
    );

    try {
      const { error } = await supabase
        .from('pedidos')
        .update({ status: novoStatus })
        .eq('id', pedidoId);

      if (error) {
        console.error('Erro ao mover status:', error.message);
        buscarPedidos();
        alert('Não foi possível atualizar o status no banco de dados.');
      }
    } catch (err) {
      console.error(err);
      buscarPedidos();
    }
  };

  // Funções Drag and Drop
  const handleDragStart = (e, pedidoId) => {
    setPedidoArrastadoId(pedidoId);
    e.dataTransfer.setData('text/plain', pedidoId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e, statusColunaDestino) => {
    e.preventDefault();
    if (!pedidoArrastadoId) return;

    moverStatus(pedidoArrastadoId, statusColunaDestino);
    setPedidoArrastadoId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🍳 Cozinha - Gestão de Pedidos</h1>
          <p className="text-sm text-gray-500">Mova os cards usando os botões ou arrastando-os</p>
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

      {carregando ? (
        <p className="text-gray-500 text-center py-10">Carregando quadro de pedidos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {COLUNAS.map((col, colIndex) => {
            const pedidosDaColuna = pedidos.filter(
              (p) => (p.status ? p.status.toLowerCase() : 'pendente') === col.id
            );

            return (
              <div
                key={col.id}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`rounded-2xl border border-dashed border-gray-300 ${col.bgColuna} p-3 min-h-[550px] flex flex-col transition-colors hover:border-indigo-300`}
              >
                <div className={`${col.corHeader} text-white px-4 py-2.5 rounded-xl font-bold text-sm flex justify-between items-center mb-4 shadow-sm`}>
                  <span>{col.titulo}</span>
                  <span className="bg-white/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                    {pedidosDaColuna.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1 overflow-y-auto">
                  {pedidosDaColuna.length === 0 ? (
                    <div className="text-center py-12 text-xs text-gray-400 font-medium border border-dashed border-gray-200 rounded-xl bg-white/50">
                      Nenhum pedido aqui
                    </div>
                  ) : (
                    pedidosDaColuna.map((ped) => {
                      const proximaColuna = COLUNAS[colIndex + 1];
                      const colunaAnterior = COLUNAS[colIndex - 1];
                      const listaItens = ped.pedido_itens || ped.itens_pedido || [];

                      return (
                        <div
                          key={ped.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ped.id)}
                          className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-grab active:cursor-grabbing select-none ${
                            pedidoArrastadoId === ped.id ? 'opacity-40 scale-95' : 'opacity-100'
                          }`}
                        >
                          {/* Número do pedido e Cliente */}
                          <div className="flex items-baseline justify-between mb-1">
                            <span className="font-extrabold text-gray-900 text-base">
                              #{ped.id}
                            </span>
                            <span className="text-xs text-gray-600 font-medium truncate max-w-[150px]">
                              👤 {ped.cliente_nome || 'Balcão'}
                            </span>
                          </div>

                          {ped.cliente_telefone && (
                            <p className="text-[11px] text-gray-400 mb-2">
                              📞 {ped.cliente_telefone}
                            </p>
                          )}

                          {/* 🛒 EXIBIÇÃO DETALHADA DOS ITENS DO PEDIDO */}
                          <div className="my-2 p-2.5 bg-gray-50 rounded-lg border border-gray-100 space-y-2">
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                              Itens ({listaItens.length})
                            </p>

                            {listaItens.length > 0 ? (
                              listaItens.map((item, idx) => {
                                const textoDescricao =
                                  item.descricao_item ||
                                  item.descricao ||
                                  item.nome_produto ||
                                  item.nome ||
                                  `Item #${item.produto_id || idx + 1}`;

                                const textoObs = item.observacao || item.observacao_item;

                                return (
                                  <div 
                                    key={item.id || idx} 
                                    className="border-b border-gray-200/60 pb-2 last:border-0 last:pb-0"
                                  >
                                    {/* Quantidade e Descrição */}
                                    <div className="flex items-start gap-1.5 text-sm font-semibold text-gray-800">
                                      <span className="inline-flex items-center justify-center bg-indigo-100 text-indigo-700 font-extrabold px-1.5 py-0.5 rounded text-xs min-w-[24px]">
                                        {item.quantidade || 1}x
                                      </span>
                                      <span className="flex-1 leading-tight text-gray-800">
                                        {textoDescricao}
                                      </span>
                                    </div>

                                    {/* Observação individual do Item */}
                                    {textoObs && (
                                      <div className="mt-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200/70 font-medium flex items-start gap-1">
                                        <span>✏️</span>
                                        <span><strong>Obs:</strong> {textoObs}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-xs text-gray-400 italic text-center">
                                Sem itens detalhados
                              </p>
                            )}
                          </div>

                          {/* Forma de Pagamento e Valor Total */}
                          <div className="flex items-center gap-2 mb-2">
                            {ped.forma_pagamento && (
                              <span className="text-[11px] font-medium bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md">
                                💳 {ped.forma_pagamento.toLowerCase()}
                              </span>
                            )}
                            <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md ml-auto">
                              R$ {Number(ped.valor_total || 0).toFixed(2)}
                            </span>
                          </div>

                          {/* Endereço */}
                          {ped.endereco_entrega && (
                            <p className="text-xs text-gray-600 font-medium mb-2">
                              📍 {ped.endereco_entrega}
                            </p>
                          )}

                          {/* Observação Geral do Pedido */}
                          {ped.observacoes && (
                            <div className="text-xs text-amber-900 bg-amber-50 p-2 rounded-lg border border-amber-200 mb-2">
                              📌 <strong>Obs Geral:</strong> {ped.observacoes}
                            </div>
                          )}

                          {/* Botões de Ação para avançar ou voltar colunas */}
                          <div className="pt-2 flex gap-2 justify-between items-center border-t border-gray-100 mt-2">
                            {colunaAnterior ? (
                              <button
                                onClick={() => moverStatus(ped.id, colunaAnterior.id)}
                                className="px-2.5 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                                title="Voltar etapa"
                              >
                                ⬅ Voltar
                              </button>
                            ) : (
                              <div />
                            )}

                            {proximaColuna && (
                              <button
                                onClick={() => moverStatus(ped.id, proximaColuna.id)}
                                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors ml-auto"
                                title="Avançar etapa"
                              >
                                Avançar ➡
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
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