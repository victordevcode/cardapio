import React, { useState, useEffect, useCallback } from 'react';
import { CheckoutModal } from './CheckoutModal';
import { supabase } from './services/supabase';

export default function CardapioCliente({ aoVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Modal e Observação Individual do Item
  const [produtoModal, setProdutoModal] = useState(null);
  const [obsModal, setObsModal] = useState('');
  const [qtdModal, setQtdModal] = useState(1);

  // Modal de Checkout / Cadastro do Cliente
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);

  // Guardamos o ID das categorias que estão EXPANDIDAS
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Carregar Categorias e TODOS os Produtos (para exibir os indisponíveis como esgotados)
  const carregarDados = useCallback(async () => {
    try {
      setCarregando(true);

      const [resCategorias, resProdutos] = await Promise.all([
        supabase.from('categorias').select('*'),
        supabase.from('produtos').select('*') // Removido o filtro .eq('disponivel', true)
      ]);

      if (resCategorias.error) throw resCategorias.error;
      if (resProdutos.error) throw resProdutos.error;

      const dadosCategorias = resCategorias.data || [];
      const ordemDesejada = ['lanches', 'porções', 'porcoes', 'bebidas'];

      const categoriasOrdenadas = dadosCategorias.sort((a, b) => {
        const indexA = ordemDesejada.indexOf((a.nome || '').toLowerCase().trim());
        const indexB = ordemDesejada.indexOf((b.nome || '').toLowerCase().trim());

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (a.nome || '').localeCompare(b.nome || '');
      });

      setCategorias(categoriasOrdenadas);
      setProdutos(resProdutos.data || []);
    } catch (err) {
      console.error('Erro ao buscar cardápio no Supabase:', err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const toggleExpandir = (categoriaId) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  const abrirModalProduto = (produto) => {
    // Bloqueia a abertura do modal caso o produto esteja indisponível
    if (produto.disponivel === false || produto.disponivel === 0) return;

    setProdutoModal(produto);
    setObsModal('');
    setQtdModal(1);
  };

  const adicionarDoModalAoCarrinho = () => {
    if (!produtoModal) return;

    const novoItem = {
      cartId: `${produtoModal.id}-${Date.now()}`,
      produtoId: produtoModal.id,
      nome: produtoModal.nome,
      descricao: produtoModal.nome,
      descricao_item: produtoModal.nome,
      preco: produtoModal.preco,
      quantidade: qtdModal,
      observacao: obsModal.trim()
    };

    setCarrinho((prev) => [...prev, novoItem]);
    setProdutoModal(null);
  };

  const removerDoCarrinho = (cartId) => {
    setCarrinho((prev) => {
      const item = prev.find((i) => i.cartId === cartId);
      if (!item) return prev;

      if (item.quantidade === 1) {
        return prev.filter((i) => i.cartId !== cartId);
      }

      return prev.map((i) =>
        i.cartId === cartId ? { ...i, quantidade: i.quantidade - 1 } : i
      );
    });
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);
  };

  const LIMITE_INICIAL = 4;

  return (
    <div className="font-sans relative">
      {aoVoltar && (
        <div className="mb-4">
          <button
            onClick={aoVoltar}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
          >
            ← Voltar ao Painel Admin
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colunas de Produtos */}
        <div className="lg:col-span-2 space-y-6">
          {carregando ? (
            <p className="text-center py-10 text-gray-500">Carregando cardápio...</p>
          ) : categorias.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            categorias.map((cat) => {
              const prodsDaCategoria = produtos.filter(
                (p) => String(p.categoria_id) === String(cat.id) || p.categoria === cat.nome
              );

              const estaExpandido = !!categoriasExpandidas[cat.id];
              const produtosExibidos = estaExpandido
                ? prodsDaCategoria
                : prodsDaCategoria.slice(0, LIMITE_INICIAL);
              const temMaisItens = prodsDaCategoria.length > LIMITE_INICIAL;

              if (prodsDaCategoria.length === 0) return null;

              return (
                <div key={cat.id} className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm transition-all">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-lg flex-shrink-0">
                      🍔
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-none">{cat.nome}</h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {prodsDaCategoria.length} {prodsDaCategoria.length === 1 ? 'opção' : 'opções'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {produtosExibidos.map((prod) => {
                      const estaDisponivel = prod.disponivel !== false && prod.disponivel !== 0;

                      return (
                        <div
                          key={prod.id}
                          className={`p-3 rounded-xl border flex flex-col justify-between transition-all group relative ${
                            estaDisponivel
                              ? 'bg-gray-50/70 border-gray-200/60 hover:bg-white hover:shadow-sm'
                              : 'bg-gray-100/80 border-gray-200 opacity-75 grayscale-30'
                          }`}
                        >
                          <div
                            onClick={() => abrirModalProduto(prod)}
                            className={`flex gap-3 ${estaDisponivel ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                            title={estaDisponivel ? 'Clique para ver os detalhes e personalizar' : 'Item esgotado'}
                          >
                            <div className="relative w-16 h-16 flex-shrink-0">
                              <img
                                src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/100'}
                                alt={prod.nome}
                                className={`w-full h-full object-cover rounded-lg border border-gray-200/60 ${
                                  estaDisponivel ? 'group-hover:scale-105 transition-transform' : 'filter blur-[0.5px]'
                                }`}
                              />
                              {!estaDisponivel && (
                                <span className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center text-[9px] font-black text-white tracking-wider uppercase">
                                  Esgotado
                                </span>
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 mb-0.5">
                                <h4 className={`font-bold text-sm leading-tight truncate ${
                                  estaDisponivel ? 'text-gray-900 group-hover:text-rose-600 transition-colors' : 'text-gray-500'
                                }`}>
                                  {prod.nome}
                                </h4>
                              </div>
                              <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                {prod.descricao || 'Sem descrição'}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/50">
                            <strong className={estaDisponivel ? 'text-emerald-600 text-sm font-extrabold' : 'text-gray-400 text-sm font-extrabold'}>
                              R$ {Number(prod.preco).toFixed(2)}
                            </strong>

                            {estaDisponivel ? (
                              <button
                                onClick={() => abrirModalProduto(prod)}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs"
                              >
                                + Opções / Adicionar
                              </button>
                            ) : (
                              <span className="bg-gray-200 text-gray-500 border border-gray-300 px-2.5 py-1 rounded-lg text-xs font-bold cursor-not-allowed select-none">
                                Indisponível
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {temMaisItens && (
                    <div className="mt-4 text-center pt-2">
                      <button
                        onClick={() => toggleExpandir(cat.id)}
                        className="w-full sm:w-auto px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-full border border-gray-300/80 transition-all shadow-2xs active:scale-98"
                      >
                        {estaExpandido
                          ? 'Mostrar menos ▲'
                          : `Mostrar mais (+${prodsDaCategoria.length - LIMITE_INICIAL}) ▼`
                        }
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Carrinho de Compras */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm h-fit sticky top-4">
          <h2 className="text-lg font-bold text-gray-900 pb-3 mb-4 border-b border-gray-100 flex items-center gap-2">
            🛒 Seu Pedido
          </h2>

          {carrinho.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Seu carrinho está vazio
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                {carrinho.map((item) => (
                  <div key={item.cartId} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-gray-800 leading-tight">{item.nome}</div>
                        {item.observacao && (
                          <span className="text-[11px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1 inline-block border border-amber-200/60">
                            ✏️ {item.observacao}
                          </span>
                        )}
                      </div>
                      <span className="font-extrabold text-gray-900">
                        R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-200/40">
                      <span className="text-xs text-gray-500">R$ {Number(item.preco).toFixed(2)} un.</span>
                      <div className="flex items-center gap-1.5 bg-white p-0.5 rounded-lg border border-gray-200">
                        <button
                          onClick={() => removerDoCarrinho(item.cartId)}
                          className="w-5 h-5 bg-gray-100 rounded border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-200 active:scale-95 flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="font-bold text-xs px-1 text-gray-800">
                          {item.quantidade}
                        </span>
                        <button
                          onClick={() => {
                            setCarrinho((prev) =>
                              prev.map((i) =>
                                i.cartId === item.cartId ? { ...i, quantidade: i.quantidade + 1 } : i
                              )
                            );
                          }}
                          className="w-5 h-5 bg-gray-100 rounded border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-200 active:scale-95 flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-gray-200 pt-3 mb-5 flex justify-between items-center text-lg font-bold">
                <span className="text-gray-800">Total:</span>
                <span className="text-emerald-600 text-xl">R$ {calcularTotal().toFixed(2)}</span>
              </div>

              <button
                onClick={() => setModalCheckoutAberto(true)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                <span>🚀</span> Avançar para Finalizar
              </button>
            </>
          )}
        </div>

      </div>

      {/* MODAL DE DETALHES DO PRODUTO */}
      {produtoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProdutoModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl transition-all scale-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-60 bg-gray-100 flex-shrink-0">
              <img
                src={produtoModal.imagem_url || produtoModal.imagem || 'https://via.placeholder.com/400'}
                alt={produtoModal.nome}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setProdutoModal(null)}
                className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-md"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">
                  {produtoModal.nome}
                </h2>
                <span className="inline-block mt-1 text-xl font-extrabold text-emerald-600">
                  R$ {Number(produtoModal.preco).toFixed(2)}
                </span>
              </div>

              <div className="bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                  Descrição
                </h4>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {produtoModal.descricao || 'Nenhuma descrição informada.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Observações para este item:
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sem picles, molho à parte, pão bem passado..."
                  value={obsModal}
                  onChange={(e) => setObsModal(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl border border-gray-200">
                  <button
                    onClick={() => setQtdModal((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 bg-white rounded-lg font-bold text-base text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-base px-2 text-gray-800">
                    {qtdModal}
                  </span>
                  <button
                    onClick={() => setQtdModal((q) => q + 1)}
                    className="w-9 h-9 bg-white rounded-lg font-bold text-base text-gray-700 shadow-2xs hover:bg-gray-50 flex items-center justify-center"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={adicionarDoModalAoCarrinho}
                  className="flex-1 py-3 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>🛒</span> Adicionar (R$ {(Number(produtoModal.preco) * qtdModal).toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT */}
      {modalCheckoutAberto && (
        <CheckoutModal
          carrinho={carrinho}
          total={calcularTotal()}
          onClose={() => setModalCheckoutAberto(false)}
          onPedidoConcluido={() => {
            setModalCheckoutAberto(false);
            setCarrinho([]);
            alert('Pedido realizado com sucesso!');
          }}
        />
      )}

    </div>
  );
}