import React, { useState, useEffect, useCallback } from 'react';

export default function CardapioCliente() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Guardamos o ID das categorias que estão EXPANDIDAS (Mostrar mais)
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Estados do Formulário de Entrega
  const [nomeCliente, setNomeCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [observacoes, setObservacoes] = useState('');

  // 1. Buscar produtos do banco
  const buscarProdutos = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/produtos');
      if (!res.ok) throw new Error('Erro ao buscar produtos');
      const dados = await res.json();
      setProdutos(dados);
    } catch (err) {
      console.error('Erro na requisição GET (produtos):', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  // 2. Buscar categorias do banco e ordenar
  const buscarCategorias = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/api/categorias');
      if (!res.ok) throw new Error('Erro ao buscar categorias');
      const dados = await res.json();

      // Ordem desejada para exibição
      const ordemDesejada = ['lanches', 'porções', 'porcoes', 'bebidas'];

      // Aplica a ordenação nas categorias
      const categoriasOrdenadas = dados.sort((a, b) => {
        const indexA = ordemDesejada.indexOf(a.nome.toLowerCase().trim());
        const indexB = ordemDesejada.indexOf(b.nome.toLowerCase().trim());

        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.nome.localeCompare(b.nome);
      });

      setCategorias(categoriasOrdenadas);
    } catch (err) {
      console.error('Erro na requisição GET (categorias):', err);
    }
  }, []);

  useEffect(() => {
    buscarProdutos();
    buscarCategorias();
  }, [buscarProdutos, buscarCategorias]);

  // Alternar o botão "Mostrar mais" / "Mostrar menos" de cada categoria
  const toggleExpandir = (categoriaId) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  // Funções do Carrinho
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
  const finalizarPedido = (e) => {
    e.preventDefault();

    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio!');
      return;
    }

    const numeroWhatsApp = '5511999999999'; // Insira seu número com DDD aqui

    let texto = `*🍔 NOVO PEDIDO DO CARDÁPIO*\n\n`;
    texto += `*Cliente:* ${nomeCliente}\n`;
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
  };

  // Limite padrão de itens antes de expandir (altere se quiser ver mais ou menos no estado inicial)
  const LIMITE_INICIAL = 4;

  return (
    <div className="font-sans">
      
      {/* ================= GRID PRINCIPAL ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna 1 & 2: Categorias com Vitrine Interna de Produtos */}
        <div className="lg:col-span-2 space-y-6">
          
          {carregando ? (
            <p className="text-center py-10 text-gray-500">Carregando cardápio...</p>
          ) : categorias.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500">
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            categorias.map((cat) => {
              // Filtra os produtos pertencentes a esta categoria específica
              const prodsDaCategoria = produtos.filter(
                (p) => String(p.categoria_id) === String(cat.id)
              );

              const estaExpandido = !!categoriasExpandidas[cat.id];

              // Define se exibe todos os produtos ou só a lista reduzida
              const produtosExibidos = estaExpandido
                ? prodsDaCategoria
                : prodsDaCategoria.slice(0, LIMITE_INICIAL);

              const temMaisItens = prodsDaCategoria.length > LIMITE_INICIAL;

              return (
                <div 
                  key={cat.id} 
                  className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm transition-all"
                >
                  {/* Cabeçalho do Card da Categoria */}
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

                  {/* Lista de Produtos da Categoria */}
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

                      {/* Botão MOSTRAR MAIS / MOSTRAR MENOS */}
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

        {/* Coluna 3: Carrinho & Checkout (Fixo no canto direito) */}
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
              {/* Lista dos Itens */}
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

              {/* Totalizador */}
              <div className="border-t-2 border-dashed border-gray-200 pt-3 mb-5 flex justify-between items-center text-lg font-bold">
                <span className="text-gray-800">Total:</span>
                <span className="text-emerald-600 text-xl">R$ {calcularTotal().toFixed(2)}</span>
              </div>

              {/* Form de Entrega */}
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