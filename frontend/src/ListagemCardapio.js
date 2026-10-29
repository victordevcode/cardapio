import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabase'; // Caminho correto baseado no seu projeto

export default function ListagemCardapio() {
  // resto do código permanece igual
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const carregarDados = async () => {
      try {
        setCarregando(true);

        // Busca categorias e produtos disponíveis em paralelo
        const [resCategorias, resProdutos] = await Promise.all([
          supabase.from('categorias').select('*'),
          supabase.from('produtos').select('*').eq('disponivel', true)
        ]);

        if (resCategorias.error) throw resCategorias.error;
        if (resProdutos.error) throw resProdutos.error;

        setCategorias(resCategorias.data || []);
        setProdutos(resProdutos.data || []);
      } catch (err) {
        console.error('Erro ao buscar cardápio no Supabase:', err.message);
      } finally {
        setCarregando(false);
      }
    };

    carregarDados();
  }, []);

  if (carregando) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-gray-200 text-center text-xs text-gray-400">
        Carregando produtos...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm space-y-6">
        <h2 className="text-xl font-bold text-gray-900 border-b pb-3 flex items-center gap-2">
          📋 Produtos Disponíveis
        </h2>

        {produtos.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            Nenhum produto disponível no momento.
          </p>
        ) : (
          categorias.map((cat) => {
            const produtosDaCategoria = produtos.filter(
              (p) => String(p.categoria_id) === String(cat.id) || p.categoria === cat.nome
            );

            if (produtosDaCategoria.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-3">
                <h3 className="font-extrabold text-base text-slate-800 border-b pb-1">
                  {cat.nome}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {produtosDaCategoria.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.imagem_url || item.imagem || 'https://via.placeholder.com/60'}
                          alt={item.nome}
                          className="w-12 h-12 object-cover rounded-lg border border-gray-200 flex-shrink-0"
                        />
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{item.nome}</p>
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {item.descricao || 'Sem descrição'}
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-emerald-600 text-sm flex-shrink-0 ml-2">
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
    </div>
  );
}