import React, { useState, useEffect, useCallback } from 'react';
import { CheckoutModal } from './CheckoutModal';
import { ModalSaborSuco } from './ModalSaborSuco';
import { supabase } from './services/supabase';

const INTERVALO_ATUALIZACAO_MS = 30000; // 30 segundos

export default function CardapioCliente({ aoVoltar }) {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [lojaAberta, setLojaAberta] = useState(false);

  // Modal e Observação Individual do Item (Lanches, Porções, etc.)
  const [produtoModal, setProdutoModal] = useState(null);
  const [obsModal, setObsModal] = useState('');
  const [qtdModal, setQtdModal] = useState(1);

  // Modal de Sabor de Suco
  const [modalSucoAberto, setModalSucoAberto] = useState(false);
  const [sucoSelecionado, setSucoSelecionado] = useState(null);

  // Modal de Checkout / Cadastro do Cliente
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false);

  // Guardamos o ID das categorias que estão EXPANDIDAS
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Verifica automaticamente o horário de funcionamento (Terça a Sábado, das 19:30 às 23:00)
  useEffect(() => {
    const verificarHorario = () => {
      const agora = new Date();
      const diaSemana = agora.getDay(); // 0 = Dom, 1 = Seg, 2 = Ter ... 6 = Sáb
      const horas = agora.getHours();
      const minutos = agora.getMinutes();
      const minutosTotais = horas * 60 + minutos;

      const ehDiaFuncionamento = diaSemana >= 2 && diaSemana <= 6; // Terça a Sábado
      const abertura = 19 * 60 + 30; // 19:30 (1170 min)
      const fechamento = 23 * 60; // 23:00 (1380 min)

      setLojaAberta(ehDiaFuncionamento && minutosTotais >= abertura && minutosTotais <= fechamento);
    };

    verificarHorario();
    const intervalo = setInterval(verificarHorario, 60000);
    return () => clearInterval(intervalo);
  }, []);

  // Carregar Categorias e TODOS os Produtos
  // `silencioso = true` atualiza em segundo plano sem mostrar tela de carregamento
  const carregarDados = useCallback(async ({ silencioso = false } = {}) => {
    try {
      if (!silencioso) {
        setCarregando(true);
      }

      const [resCategorias, resProdutos] = await Promise.all([
        supabase.from('categorias').select('*'),
        supabase.from('produtos').select('*')
      ]);

      if (resCategorias.error) throw resCategorias.error;
      if (resProdutos.error) throw resProdutos.error;

      const dadosCategorias = resCategorias.data || [];
      const dadosProdutos = resProdutos.data || [];
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
      setProdutos(dadosProdutos);

      // Remove da sacola itens que ficaram indisponíveis ou foram removidos
      setCarrinho((carrinhoAtual) => {
        if (carrinhoAtual.length === 0) return carrinhoAtual;

        return carrinhoAtual.filter((item) => {
          const prodAtual = dadosProdutos.find((p) => String(p.id) === String(item.produtoId));
          return prodAtual && prodAtual.disponivel !== false && prodAtual.disponivel !== 0;
        });
      });
    } catch (err) {
      console.error('Erro ao buscar cardápio no Supabase:', err.message);
    } finally {
      if (!silencioso) {
        setCarregando(false);
      }
    }
  }, []);

  // Carga inicial + polling automático + atualização ao voltar para a aba
  useEffect(() => {
    carregarDados({ silencioso: false });

    const intervaloAtualizacao = setInterval(() => {
      if (document.visibilityState === 'visible') {
        carregarDados({ silencioso: true });
      }
    }, INTERVALO_ATUALIZACAO_MS);

    const aoFocarJanela = () => {
      carregarDados({ silencioso: true });
    };

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        carregarDados({ silencioso: true });
      }
    };

    window.addEventListener('focus', aoFocarJanela);
    document.addEventListener('visibilitychange', aoMudarVisibilidade);

    return () => {
      clearInterval(intervaloAtualizacao);
      window.removeEventListener('focus', aoFocarJanela);
      document.removeEventListener('visibilitychange', aoMudarVisibilidade);
    };
  }, [carregarDados]);

  const toggleExpandir = (categoriaId) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  const abrirModalProduto = (produto) => {
    if (produto.disponivel === false || produto.disponivel === 0) return;

    const nomeLower = (produto.nome || '').toLowerCase();

    if (nomeLower.includes('suco')) {
      setSucoSelecionado(produto);
      setModalSucoAberto(true);
    } else {
      setProdutoModal(produto);
      setObsModal('');
      setQtdModal(1);
    }
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

  const totalItensCarrinho = carrinho.reduce((acc, item) => acc + item.quantidade, 0);

  const LIMITE_INICIAL = 4;

  return (
    <div className="min-h-screen bg-stone-100/80 font-sans pb-24 lg:pb-8">
      {aoVoltar && (
        <div className="max-w-6xl mx-auto pt-4 px-4">
          <button
            onClick={aoVoltar}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2"
          >
            ← Voltar ao Painel Admin
          </button>
        </div>
      )}

      {/* ================= VITRINE / HEADER DA MARCA ================= */}
      <div className="bg-gradient-to-br from-neutral-950 via-stone-900 to-red-950 text-white shadow-xl border-b-4 border-amber-400">
        <div className="max-w-6xl mx-auto px-4 py-7 sm:py-9">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">

            {/* Logo e Identidade */}
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-5">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-red-600 to-amber-300 shadow-lg flex-shrink-0">
                <img
                  src="https://kibexqwtcypwaldgsnba.supabase.co/storage/v1/object/public/Produtos/logo_ju.png"
                  alt="Lanches da Jú"
                  className="w-full h-full object-cover rounded-full border-2 border-neutral-900"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="bg-red-600/90 text-white text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-red-400/30">
                    O diferencial de Taubaté
                  </span>
                  <span className="bg-emerald-600/20 text-emerald-300 text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                    🌱 Tradicional • Vegetariano • Vegano
                  </span>
                </div>

                <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                  Lanches da Jú
                </h1>

                <p className="text-stone-300 text-xs sm:text-sm max-w-md">
                  Sabor caseiro, qualidade e atendimento direto na sua casa. Peça agora pelo nosso cardápio digital!
                </p>
              </div>
            </div>

            {/* Card de Status e Horário (Baseado nas artes de divulgação) */}
            <div className="bg-neutral-900/90 border border-stone-700/80 p-4 rounded-2xl flex flex-col items-center sm:items-end gap-2.5 min-w-[240px] shadow-inner">
              {lojaAberta ? (
                <div className="bg-amber-400 text-neutral-950 font-black text-xs sm:text-sm px-4 py-1.5 rounded-lg uppercase tracking-wide shadow-md flex items-center gap-2 animate-pulse">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                  Estamos Abertos!
                </div>
              ) : (
                <div className="bg-red-600/90 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-lg uppercase tracking-wide shadow-md flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-300"></span>
                  Fechado no momento
                </div>
              )}

              <div className="text-center sm:text-right text-xs text-stone-300 space-y-0.5">
                <p className="font-bold text-amber-300">🕒 Terça a Sábado</p>
                <p className="text-stone-400">Atendimento das 19:30h às 23:00h</p>
              </div>

              <a
                href="https://api.whatsapp.com/send?phone=5512991395"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300 underline underline-offset-2 flex items-center gap-1 pt-0.5"
              >
                💬 Fale conosco no WhatsApp
              </a>
            </div>

          </div>
        </div>
      </div>

      {/* ================= CONTEÚDO PRINCIPAL ================= */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Colunas de Produtos */}
          <div className="lg:col-span-2 space-y-6">
            {carregando ? (
              <div className="bg-white p-12 rounded-2xl border border-stone-200 text-center space-y-3">
                <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-stone-500 font-medium text-sm">Preparando o cardápio...</p>
              </div>
            ) : categorias.length === 0 ? (
              <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-stone-500">
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
                  <div key={cat.id} className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm transition-all">
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center text-red-600 text-lg flex-shrink-0">
                          🍔
                        </div>
                        <div>
                          <h3 className="font-extrabold text-stone-900 text-lg leading-none uppercase tracking-tight">
                            {cat.nome}
                          </h3>
                          <p className="text-xs text-stone-400 mt-1">
                            {prodsDaCategoria.length} {prodsDaCategoria.length === 1 ? 'opção disponível' : 'opções disponíveis'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {produtosExibidos.map((prod) => {
                        const estaDisponivel = prod.disponivel !== false && prod.disponivel !== 0;

                        return (
                          <div
                            key={prod.id}
                            className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all group relative ${
                              estaDisponivel
                                ? 'bg-stone-50/50 border-stone-200/80 hover:bg-white hover:border-red-200 hover:shadow-md'
                                : 'bg-stone-100 border-stone-200 opacity-70 grayscale'
                            }`}
                          >
                            <div
                              onClick={() => abrirModalProduto(prod)}
                              className={`flex gap-3.5 ${estaDisponivel ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                              title={estaDisponivel ? 'Clique para personalizar e adicionar' : 'Item esgotado'}
                            >
                              <div className="relative w-20 h-20 flex-shrink-0">
                                <img
                                  src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/100'}
                                  alt={prod.nome}
                                  className={`w-full h-full object-cover rounded-xl border border-stone-200 shadow-2xs ${
                                    estaDisponivel ? 'group-hover:scale-105 transition-transform duration-200' : ''
                                  }`}
                                />
                                {!estaDisponivel && (
                                  <span className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center text-[10px] font-black text-amber-300 tracking-wider uppercase">
                                    Esgotado
                                  </span>
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <h4 className={`font-extrabold text-sm leading-snug line-clamp-1 ${
                                  estaDisponivel ? 'text-stone-900 group-hover:text-red-600 transition-colors' : 'text-stone-500'
                                }`}>
                                  {prod.nome}
                                </h4>
                                <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mt-1">
                                  {prod.descricao || 'Preparado na hora com ingredientes selecionados.'}
                                </p>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mt-3.5 pt-2.5 border-t border-stone-200/60">
                              <strong className={estaDisponivel ? 'text-emerald-700 text-base font-black' : 'text-stone-400 text-sm font-bold'}>
                                R$ {Number(prod.preco).toFixed(2)}
                              </strong>

                              {estaDisponivel ? (
                                <button
                                  onClick={() => abrirModalProduto(prod)}
                                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all active:scale-95 shadow-xs flex items-center gap-1 cursor-pointer"
                                >
                                  <span>+</span> Adicionar
                                </button>
                              ) : (
                                <span className="bg-stone-200 text-stone-500 px-2.5 py-1 rounded-lg text-xs font-bold cursor-not-allowed select-none">
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
                          className="w-full sm:w-auto px-6 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full border border-amber-200 transition-all shadow-2xs active:scale-98 cursor-pointer"
                        >
                          {estaExpandido
                            ? 'Mostrar menos ▲'
                            : `Ver todas as opções (+${prodsDaCategoria.length - LIMITE_INICIAL}) ▼`
                          }
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Carrinho de Compras (Lateral Desktop / Rodapé Mobile) */}
          <div id="secao-carrinho" className="bg-white rounded-2xl border-2 border-stone-200 p-5 shadow-md h-fit sticky top-4">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
                🛒 Seu Pedido
              </h2>
              {totalItensCarrinho > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item' : 'itens'}
                </span>
              )}
            </div>

            {carrinho.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <span className="text-3xl block">🍔</span>
                <p className="text-stone-400 text-sm font-medium">
                  Sua sacola está vazia.<br />Escolha seu lanche ao lado!
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-3 mb-4 max-h-72 overflow-y-auto pr-1">
                  {carrinho.map((item) => (
                    <div key={item.cartId} className="bg-stone-50 p-3 rounded-xl border border-stone-200/70 text-sm">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="font-bold text-stone-800 leading-tight">{item.nome}</div>
                          {item.observacao && (
                            <span className="text-[11px] text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded mt-1 inline-block font-medium">
                              ✏️ {item.observacao}
                            </span>
                          )}
                        </div>
                        <span className="font-black text-stone-900 whitespace-nowrap">
                          R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-stone-200/50">
                        <span className="text-xs text-stone-500">R$ {Number(item.preco).toFixed(2)} un.</span>
                        <div className="flex items-center gap-2 bg-white px-1.5 py-0.5 rounded-lg border border-stone-200 shadow-2xs">
                          <button
                            onClick={() => removerDoCarrinho(item.cartId)}
                            className="w-6 h-6 bg-stone-100 rounded font-bold text-xs text-stone-700 hover:bg-red-100 hover:text-red-700 active:scale-95 flex items-center justify-center cursor-pointer"
                          >
                            -
                          </button>
                          <span className="font-extrabold text-xs px-1 text-stone-900">
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
                            className="w-6 h-6 bg-stone-100 rounded font-bold text-xs text-stone-700 hover:bg-emerald-100 hover:text-emerald-700 active:scale-95 flex items-center justify-center cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t-2 border-dashed border-stone-200 pt-3 mb-5 flex justify-between items-center text-lg font-black">
                  <span className="text-stone-800">Subtotal:</span>
                  <span className="text-emerald-600 text-xl">R$ {calcularTotal().toFixed(2)}</span>
                </div>

                <button
                  onClick={() => setModalCheckoutAberto(true)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3.5 rounded-xl font-black text-sm shadow-lg transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🚀</span> Avançar para Finalizar
                </button>
              </>
            )}
          </div>

        </div>
      </div>

      {/* BARRA FLUTUANTE INFERIOR PARA CELULAR (Quando há itens no carrinho) */}
      {carrinho.length > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-neutral-950 text-white p-3.5 shadow-2xl border-t-2 border-amber-400 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-stone-400 font-bold uppercase">
              {totalItensCarrinho} {totalItensCarrinho === 1 ? 'item na sacola' : 'itens na sacola'}
            </p>
            <p className="text-lg font-black text-amber-400">
              R$ {calcularTotal().toFixed(2)}
            </p>
          </div>
          <button
            onClick={() => setModalCheckoutAberto(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs px-5 py-3 rounded-xl shadow-md active:scale-95"
          >
            Finalizar Pedido →
          </button>
        </div>
      )}

      {/* MODAL DE DETALHES DO PRODUTO */}
      {produtoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setProdutoModal(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl transition-all scale-100 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-60 bg-stone-100 flex-shrink-0">
              <img
                src={produtoModal.imagem_url || produtoModal.imagem || 'https://via.placeholder.com/400'}
                alt={produtoModal.nome}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setProdutoModal(null)}
                className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-md cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-xl font-black text-stone-900">
                  {produtoModal.nome}
                </h2>
                <span className="inline-block mt-1 text-xl font-black text-emerald-600">
                  R$ {Number(produtoModal.preco).toFixed(2)}
                </span>
              </div>

              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/70">
                <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                  Ingredientes / Descrição
                </h4>
                <p className="text-sm text-stone-700 leading-relaxed whitespace-pre-line">
                  {produtoModal.descricao || 'Nenhuma descrição informada.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Alguma observação? (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Sem picles, molho à parte, pão bem passado..."
                  value={obsModal}
                  onChange={(e) => setObsModal(e.target.value)}
                  className="w-full p-2.5 text-sm border border-stone-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <div className="flex items-center gap-2 bg-stone-100 p-1 rounded-xl border border-stone-200">
                  <button
                    onClick={() => setQtdModal((q) => Math.max(1, q - 1))}
                    className="w-9 h-9 bg-white rounded-lg font-bold text-base text-stone-700 shadow-2xs hover:bg-stone-50 flex items-center justify-center cursor-pointer"
                  >
                    -
                  </button>
                  <span className="font-extrabold text-base px-2 text-stone-800">
                    {qtdModal}
                  </span>
                  <button
                    onClick={() => setQtdModal((q) => q + 1)}
                    className="w-9 h-9 bg-white rounded-lg font-bold text-base text-stone-700 shadow-2xs hover:bg-stone-50 flex items-center justify-center cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  onClick={adicionarDoModalAoCarrinho}
                  className="flex-1 py-3 text-sm font-black text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>🛒</span> Adicionar (R$ {(Number(produtoModal.preco) * qtdModal).toFixed(2)})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SABOR DE SUCO */}
      <ModalSaborSuco
        isOpen={modalSucoAberto}
        onClose={() => {
          setModalSucoAberto(false);
          setSucoSelecionado(null);
        }}
        produto={sucoSelecionado}
        onAdicionarAoCarrinho={(produtoComSabor) => {
          const novoItem = {
            cartId: `${produtoComSabor.id}-${Date.now()}`,
            produtoId: produtoComSabor.id,
            nome: produtoComSabor.nome,
            descricao: produtoComSabor.nome,
            descricao_item: produtoComSabor.nome,
            preco: produtoComSabor.preco,
            quantidade: produtoComSabor.quantidade || 1,
            observacao: produtoComSabor.observacao || ''
          };

          setCarrinho((prev) => [...prev, novoItem]);
          setModalSucoAberto(false);
          setSucoSelecionado(null);
        }}
      />

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