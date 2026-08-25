import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from './services/supabase';

export default function CardapioCliente() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Guardamos o ID das categorias que estão EXPANDIDAS
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Estados do Formulário de Entrega
  const [nomeCliente, setNomeCliente] = useState('');
  const [telefoneCliente, setTelefoneCliente] = useState(''); // Declarado para evitar o erro
  const [endereco, setEndereco] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [observacoes, setObservacoes] = useState('');

  // 1. Buscar produtos do Supabase
  const buscarProdutos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('disponivel', true);

      if (error) throw error;
      setProdutos(data || []);
    } catch (err) {
      console.error('Erro ao buscar produtos no Supabase:', err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  // 2. Buscar categorias do Supabase e ordenar
  const buscarCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('categorias')
        .select('*')
        .eq('ativo', true);

      if (error) throw error;

      const ordemDesejada = ['lanches', 'porções', 'porcoes', 'bebidas'];

      const categoriasOrdenadas = (data || []).sort((a, b) => {
        const indexA = ordemDesejada.indexOf(a.nome.toLowerCase().trim());
        const indexB = ordemDesejada.indexOf(b.nome.toLowerCase().trim());

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setCategorias(categoriasOrdenadas);
    } catch (err) {
      console.error('Erro ao buscar categorias no Supabase:', err.message);
    }
  }, []);

  useEffect(() => {
    buscarProdutos();
    buscarCategorias();
  }, [buscarProdutos, buscarCategorias]);

  const toggleExpandir = (categoriaId) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  const adicionarAoCarrinho = (produto) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.id === produto.id);
      if (itemExistente) {
        return prev.map((item) =>
          item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item
        );
      }
      return [...prev, { ...produto, quantidade: 1 }];
    });
  };

  const removerDoCarrinho = (produtoId) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find((item) => item.id === produtoId);
      if (itemExistente.quantidade === 1) {
        return prev.filter((item) => item.id !== produtoId);
      }
      return prev.map((item) =>
        item.id === produtoId ? { ...item, quantidade: item.quantidade - 1 } : item
      );
    });
  };

  const calcularTotal = () => {
    return carrinho.reduce((total, item) => total + Number(item.preco) * item.quantidade, 0);
  };

  // Finalizar e Enviar para o WhatsApp
  const finalizarPedido = async (e) => {
    e.preventDefault();

    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio!');
      return;
    }

    try {
      console.log("1. Tentando salvar o pedido...");

      // Step A: Inserir pedido principal
      const { data: novoPedido, error: erroPedido } = await supabase
        .from('pedidos')
        .insert([
          {
            cliente_nome: nomeCliente,
            cliente_telefone: telefoneCliente || 'Não informado',
            endereco_entrega: endereco,
            tipo_entrega: 'Entrega',
            forma_pagamento: formaPagamento,
            valor_total: calcularTotal(),
            observacoes: observacoes,
            status: 'pendente'
          }
        ])
        .select()
        .single();

      if (erroPedido) {
        console.error("Erro ao inserir na tabela 'pedidos':", erroPedido);
        alert(`Erro no banco (pedidos): ${erroPedido.message}`);
        return;
      }

      console.log("2. Pedido criado com sucesso:", novoPedido);

      // Step B: Inserir os itens do pedido
      const itensFormatados = carrinho.map((item) => ({
        pedido_id: novoPedido.id,
        produto_id: item.id,
        preco_unitario: item.preco,
        quantidade: item.quantidade,
        subtotal: Number(item.preco) * item.quantidade,
        observacao_item: ''
      }));

      const { error: erroItens } = await supabase
        .from('itens_pedido')
        .insert(itensFormatados);

      if (erroItens) {
        console.error("Erro ao inserir na tabela 'itens_pedido':", erroItens);
        alert(`Erro no banco (itens_pedido): ${erroItens.message}`);
        return;
      }

      console.log("3. Itens inseridos com sucesso!");

      // Step C: Enviar mensagem para o WhatsApp
      const numeroWhatsApp = '5511999999999'; // Configure seu WhatsApp de atendimento aqui

      let texto = `*🍔 NOVO PEDIDO (#${novoPedido.id})*\n\n`;
      texto += `*Cliente:* ${nomeCliente}\n`;
      if (telefoneCliente) texto += `*Telefone:* ${telefoneCliente}\n`;
      texto += `*Endereço:* ${endereco}\n`;
      texto += `*Forma de Pagamento:* ${formaPagamento}\n`;
      if (observacoes) texto += `*Obs:* ${observacoes}\n`;
      
      texto += `\n*ITENS DO PEDIDO:*\n`;
      carrinho.forEach((item) => {
        const subtotal = (Number(item.preco) * item.quantidade).toFixed(2);
        texto += `- ${item.quantidade}x ${item.nome} (R$ ${subtotal})\n`;
      });

      texto += `\n*TOTAL: R$ ${calcularTotal().toFixed(2)}*`;

      const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');

      // Limpa formulário
      setCarrinho([]);
      setNomeCliente('');
      setTelefoneCliente('');
      setEndereco('');
      setObservacoes('');

    } catch (err) {
      console.error('Erro inesperado:', err);
      alert('Erro inesperado ao processar o pedido.');
    }
  };

  const LIMITE_INICIAL = 4;

  return (
    <div className="font-sans p-4 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna 1 & 2: Categorias e Produtos */}
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
                (p) => String(p.categoria_id) === String(cat.id)
              );

              const estaExpandido = !!categoriasExpandidas[cat.id];
              const produtosExibidos = estaExpandido
                ? prodsDaCategoria
                : prodsDaCategoria.slice(0, LIMITE_INICIAL);

              const temMaisItens = prodsDaCategoria.length > LIMITE_INICIAL;

              return (
                <div 
                  key={cat.id} 
                  className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm transition-all"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600 text-lg flex-shrink-0">
                      🍔
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg leading-none">
                        {cat.nome}
                      </h3>
                      <p className="text-xs text-gray-400 mt-1">
                        {prodsDaCategoria.length} {prodsDaCategoria.length === 1 ? 'opção' : 'opções'}
                      </p>
                    </div>
                  </div>

                  {prodsDaCategoria.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">
                      Sem produtos disponíveis nesta categoria.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {produtosExibidos.map((prod) => {
                          const itemNoCarrinho = carrinho.find((i) => i.id === prod.id);
                          return (
                            <div 
                              key={prod.id} 
                              className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/60 shadow-2xs flex flex-col justify-between hover:bg-white hover:shadow-sm transition-all"
                            >
                              <div className="flex gap-3">
                                <img 
                                  src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/100'} 
                                  alt={prod.nome} 
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200/60 flex-shrink-0"
                                />
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 text-sm leading-tight mb-0.5">
                                    {prod.nome}
                                  </h4>
                                  <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                                    {prod.descricao}
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200/50">
                                <strong className="text-emerald-600 text-sm font-extrabold">
                                  R$ {Number(prod.preco).toFixed(2)}
                                </strong>

                                {itemNoCarrinho ? (
                                  <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gray-200">
                                    <button 
                                      onClick={() => removerDoCarrinho(prod.id)} 
                                      className="w-6 h-6 bg-gray-100 rounded border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-200 active:scale-95 flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="font-bold text-xs px-1 text-gray-800">
                                      {itemNoCarrinho.quantidade}
                                    </span>
                                    <button 
                                      onClick={() => adicionarAoCarrinho(prod)} 
                                      className="w-6 h-6 bg-gray-100 rounded border border-gray-300 font-bold text-xs text-gray-700 hover:bg-gray-200 active:scale-95 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => adicionarAoCarrinho(prod)} 
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs"
                                  >
                                    + Adicionar
                                  </button>
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
                    </>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Coluna 3: Carrinho */}
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
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="bg-gray-100 text-gray-700 text-xs font-bold px-2 py-0.5 rounded">
                        {item.quantidade}x
                      </span>
                      <span className="font-medium text-gray-800">{item.nome}</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      R$ {(Number(item.preco) * item.quantidade).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-dashed border-gray-200 pt-3 mb-5 flex justify-between items-center text-lg font-bold">
                <span className="text-gray-800">Total:</span>
                <span className="text-emerald-600 text-xl">R$ {calcularTotal().toFixed(2)}</span>
              </div>

              <form onSubmit={finalizarPedido} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Seu Nome*" 
                  required 
                  value={nomeCliente} 
                  onChange={(e) => setNomeCliente(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <input 
                  type="tel" 
                  placeholder="Seu Telefone / WhatsApp" 
                  value={telefoneCliente} 
                  onChange={(e) => setTelefoneCliente(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <input 
                  type="text" 
                  placeholder="Endereço Completo*" 
                  required 
                  value={endereco} 
                  onChange={(e) => setEndereco(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <select 
                  value={formaPagamento} 
                  onChange={(e) => setFormaPagamento(e.target.value)} 
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                >
                  <option value="Pix">Pix</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
                <textarea 
                  placeholder="Observações (ex: sem cebola)" 
                  rows="2"
                  value={observacoes} 
                  onChange={(e) => setObservacoes(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />

                <button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>📲</span> Enviar Pedido no WhatsApp
                </button>
              </form>
            </>
          )}
        </div>

      </div>
    </div>
  );
}