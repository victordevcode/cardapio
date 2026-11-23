import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';

const INTERVALO_ATUALIZACAO_MS = 30000; // 30 segundos

export default function ListagemCardapio() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [itemDetalhes, setItemDetalhes] = useState(null);

  const carregarDados = useCallback(async ({ silencioso = false } = {}) => {
    try {
      if (!silencioso) {
        setCarregando(true);
      }

      const [resCategorias, resProdutos] = await Promise.all([
        supabase.from('categorias').select('*'),
        supabase.from('produtos').select('*').eq('disponivel', true)
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
      if (!silencioso) {
        setCarregando(false);
      }
    }
  }, []);

  useEffect(() => {
    carregarDados({ silencioso: false });

    const intervalo = setInterval(() => {
      if (document.visibilityState === 'visible') {
        carregarDados({ silencioso: true });
      }
    }, INTERVALO_ATUALIZACAO_MS);

    const aoVoltarParaAba = () => {
      if (document.visibilityState === 'visible') {
        carregarDados({ silencioso: true });
      }
    };

    window.addEventListener('focus', aoVoltarParaAba);
    document.addEventListener('visibilitychange', aoVoltarParaAba);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('focus', aoVoltarParaAba);
      document.removeEventListener('visibilitychange', aoVoltarParaAba);
    };
  }, [carregarDados]);

  return (
    <div className="min-h-screen bg-stone-100/80 font-sans pb-10">
      {/* Cabeçalho da Lanchonete (Modo Consulta / QR Code) */}
      <div className="bg-gradient-to-br from-neutral-950 via-stone-900 to-red-950 text-white shadow-xl border-b-4 border-amber-400">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-red-600 to-amber-300 shadow-lg flex-shrink-0">
              <img
                src="https://kibexqwtcypwaldgsnba.supabase.co/storage/v1/object/public/Produtos/logo_ju.png"
                alt="Lanches da Jú"
                className="w-full h-full object-cover rounded-full border-2 border-neutral-900"
              />
            </div>
            <div>
              <span className="bg-amber-400 text-neutral-950 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
                Cardápio Digital • Consulta na Loja
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Lanches da Jú
              </h1>
              <p className="text-stone-300 text-xs mt-0.5">
                Escolha seu lanche e faça seu pedido diretamente no balcão ou com nossa equipe!
              </p>
            </div>
          </div>

          <div className="text-center sm:text-right text-xs text-stone-300 bg-neutral-900/80 border border-stone-700/80 px-4 py-2.5 rounded-xl">
            <p className="font-bold text-amber-300">🕒 Terça a Sábado</p>
            <p className="text-stone-400">19:30h às 23:00h</p>
          </div>
        </div>
      </div>

      {/* Lista de Produtos Disponíveis */}
      <div className="max-w-5xl mx-auto px-4 pt-6 space-y-6">
        {carregando ? (
          <div className="bg-white p-10 rounded-2xl border border-stone-200 text-center space-y-2">
            <div className="w-7 h-7 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-stone-500 text-sm font-medium">Carregando cardápio...</p>
          </div>
        ) : produtos.length === 0 ? (
          <div className="bg-white p-8 rounded-2xl border border-stone-200 text-center text-sm text-stone-500">
            Nenhum produto disponível no momento.
          </div>
        ) : (
          categorias.map((cat) => {
            const produtosDaCategoria = produtos.filter(
              (p) => String(p.categoria_id) === String(cat.id) || p.categoria === cat.nome
            );

            if (produtosDaCategoria.length === 0) return null;

            return (
              <div
                key={cat.id}
                className="bg-white p-5 rounded-2xl border border-stone-200/90 shadow-sm space-y-4"
              >
                <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                  <h2 className="font-extrabold text-lg text-stone-900 uppercase tracking-tight">
                    {cat.nome}
                  </h2>
                  <span className="text-xs text-stone-400 font-medium">
                    {produtosDaCategoria.length} {produtosDaCategoria.length === 1 ? 'opção' : 'opções'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {produtosDaCategoria.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setItemDetalhes(item)}
                      className="p-3.5 bg-stone-50/70 hover:bg-white rounded-xl border border-stone-200/80 hover:border-red-200 hover:shadow-sm transition-all flex items-center justify-between gap-3 cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={
                            item.imagem_url ||
                            item.imagem ||
                            'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80'
                          }
                          alt={item.nome}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src =
                              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=150&auto=format&fit=crop&q=80';
                          }}
                          className="w-16 h-16 object-cover rounded-xl border border-stone-200 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-extrabold text-stone-900 text-sm truncate">
                            {item.nome}
                          </p>
                          <p className="text-xs text-stone-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {item.descricao || 'Preparado na hora com ingredientes selecionados.'}
                          </p>
                        </div>
                      </div>
                      <span className="font-black text-emerald-700 text-base flex-shrink-0">
                        R$ {Number(item.preco).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal simples para ler ingredientes completos ao tocar no item */}
      {itemDetalhes && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setItemDetalhes(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-52 bg-stone-100">
              <img
                src={
                  itemDetalhes.imagem_url ||
                  itemDetalhes.imagem ||
                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&auto=format&fit=crop&q=80'
                }
                alt={itemDetalhes.nome}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => setItemDetalhes(null)}
                className="absolute top-3 right-3 bg-black/70 text-white w-8 h-8 rounded-full font-bold text-sm flex items-center justify-center cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <h3 className="text-lg font-black text-stone-900">{itemDetalhes.nome}</h3>
                <span className="text-lg font-black text-emerald-600 whitespace-nowrap">
                  R$ {Number(itemDetalhes.preco).toFixed(2)}
                </span>
              </div>
              <p className="text-sm text-stone-600 leading-relaxed whitespace-pre-line bg-stone-50 p-3 rounded-xl border border-stone-200/70">
                {itemDetalhes.descricao || 'Nenhuma descrição informada.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}