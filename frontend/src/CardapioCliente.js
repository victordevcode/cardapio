import React, { useState, useEffect, useCallback } from 'react';

export default function CardapioCliente() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  // Modal e Observação Individual do Item
  const [produtoModal, setProdutoModal] = useState(null);
  const [obsModal, setObsModal] = useState('');
  const [qtdModal, setQtdModal] = useState(1);

  // ID das categorias que estão EXPANDIDAS
  const [categoriasExpandidas, setCategoriasExpandidas] = useState({});

  // Estados do Formulário de Entrega e Pagamento
  const [nomeCliente, setNomeCliente] = useState('');
  const [endereco, setEndereco] = useState('');
  const [formaPagamento, setFormaPagamento] = useState('Pix');
  const [trocoPara, setTrocoPara] = useState('');
  const [bandeiraCartao, setBandeiraCartao] = useState('Mastercard/Visa');
  const [observacoesGerais, setObservacoesGerais] = useState('');

  // Configurações do Estabelecimento
  const CHAVE_PIX = '12.345.678/0001-90';

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

      const ordemDesejada = ['lanches', 'porções', 'porcoes', 'bebidas'];

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

  const toggleExpandir = (categoriaId) => {
    setCategoriasExpandidas((prev) => ({
      ...prev,
      [categoriaId]: !prev[categoriaId],
    }));
  };

  const abrirModalProduto = (produto) => {
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
      preco: produtoModal.preco,
      quantidade: qtdModal,
      observacao: obsModal.trim()
    };

    setCarrinho((prev) => [...prev, novoItem]);
    setProdutoModal(null);
  };

  const getQtdNoCarrinho = (produtoId) => {
    return carrinho
      .filter((item) => item.produtoId === produtoId && !item.observacao)
      .reduce((acc, item) => acc + item.quantidade, 0);
  };

  const adicionarRapidoAoCarrinho = (produto) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find(
        (item) => item.produtoId === produto.id && !item.observacao
      );

      if (itemExistente) {
        return prev.map((item) =>
          item.cartId === itemExistente.cartId
            ? { ...item, quantidade: item.quantidade + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          cartId: `${produto.id}-${Date.now()}`,
          produtoId: produto.id,
          nome: produto.nome,
          preco: produto.preco,
          quantidade: 1,
          observacao: ''
        }
      ];
    });
  };

  const diminuirRapidoDoCarrinho = (produtoId) => {
    setCarrinho((prev) => {
      const itemExistente = prev.find(
        (item) => item.produtoId === produtoId && !item.observacao
      );

      if (!itemExistente) return prev;

      if (itemExistente.quantidade === 1) {
        return prev.filter((item) => item.cartId !== itemExistente.cartId);
      }

      return prev.map((item) =>
        item.cartId === itemExistente.cartId
          ? { ...item, quantidade: item.quantidade - 1 }
          : item
      );
    });
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

  const copiarChavePix = () => {
    navigator.clipboard.writeText(CHAVE_PIX);
    alert('Chave Pix copiada com sucesso!');
  };

  // Finalizar, Salvar no Banco/Kanban e Enviar para o WhatsApp
  const finalizarPedido = async (e) => {
    e.preventDefault();

    if (carrinho.length === 0) {
      alert('Seu carrinho está vazio!');
      return;
    }

    const totalPedido = calcularTotal();

    // Validação de Troco
    if (formaPagamento === 'Dinheiro' && trocoPara) {
      const valorTroco = parseFloat(trocoPara.replace(',', '.'));
      if (isNaN(valorTroco) || valorTroco < totalPedido) {
        alert(`O valor para troco (R$ ${trocoPara}) deve ser maior que o total do pedido (R$ ${totalPedido.toFixed(2)})!`);
        return;
      }
    }

    setEnviando(true);

    try {
      // 1. Montar payload do pedido para salvar no Banco de Dados (Kanban)
      const payloadPedido = {
        cliente_nome: nomeCliente,
        endereco: endereco,
        forma_pagamento: formaPagamento,
        troco_para: formaPagamento === 'Dinheiro' ? trocoPara : null,
        bandeira_cartao: (formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') ? bandeiraCartao : null,
        observacoes_gerais: observacoesGerais,
        total: totalPedido,
        status: 'pendente', // Inicialmente entra na coluna "Pendente" do Kanban
        itens: carrinho.map((item) => ({
          produto_id: item.produtoId,
          nome: item.nome,
          quantidade: item.quantidade,
          preco_unitario: Number(item.preco),
          observacao: item.observacao
        }))
      };

      // 2. Enviar POST para salvar no backend
      const res = await fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadPedido)
      });

      if (!res.ok) {
        throw new Error('Erro ao registrar o pedido no sistema.');
      }

      const resultado = await res.json();
      const pedidoId = resultado.id || resultado.pedidoId || 'N/A';

      // 3. Montar mensagem formatada para WhatsApp (com número do pedido gerado)
      const numeroWhatsApp = '5511999999999';

      let texto = `*🍔 NOVO PEDIDO #${pedidoId}*\n\n`;
      texto += `*Cliente:* ${nomeCliente}\n`;
      texto += `*Endereço:* ${endereco}\n`;
      
      texto += `*Forma de Pagamento:* ${formaPagamento}\n`;
      if (formaPagamento === 'Dinheiro') {
        if (trocoPara) {
          const trocoCalculado = (parseFloat(trocoPara.replace(',', '.')) - totalPedido).toFixed(2);
          texto += `↳ *Troco para:* R$ ${trocoPara} (Troco: R$ ${trocoCalculado})\n`;
        } else {
          texto += `↳ *Troco:* Não precisa de troco\n`;
        }
      } else if (formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') {
        texto += `↳ *Bandeira/Opção:* ${bandeiraCartao} (Levar maquininha)\n`;
      } else if (formaPagamento === 'Pix') {
        texto += `↳ _Comprovante será enviado a seguir_\n`;
      }

      if (observacoesGerais) texto += `*Obs. Geral:* ${observacoesGerais}\n`;

      texto += `\n*ITENS DO PEDIDO:*\n`;
      carrinho.forEach((item) => {
        const subtotal = (Number(item.preco) * item.quantidade).toFixed(2);
        texto += `- ${item.quantidade}x ${item.nome} (R$ ${subtotal})\n`;
        if (item.observacao) {
          texto += `   ↳ _Obs: ${item.observacao}_\n`;
        }
      });

      texto += `\n*TOTAL: R$ ${totalPedido.toFixed(2)}*`;

      // 4. Abrir o WhatsApp em uma nova aba
      const url = `https://wa.me/${numeroWhatsApp}?text=${encodeURIComponent(texto)}`;
      window.open(url, '_blank');

      // 5. Limpar formulário e carrinho
      setCarrinho([]);
      setNomeCliente('');
      setEndereco('');
      setTrocoPara('');
      setObservacoesGerais('');

    } catch (err) {
      console.error('Erro ao finalizar pedido:', err);
      alert('Ocorreu um erro ao registrar seu pedido. Por favor, tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  const LIMITE_INICIAL = 4;

  return (
    <div className="font-sans relative">
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
                (p) => String(p.categoria_id) === String(cat.id)
              );

              const estaExpandido = !!categoriasExpandidas[cat.id];
              const produtosExibidos = estaExpandido
                ? prodsDaCategoria
                : prodsDaCategoria.slice(0, LIMITE_INICIAL);
              const temMaisItens = prodsDaCategoria.length > LIMITE_INICIAL;

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

                  {prodsDaCategoria.length === 0 ? (
                    <p className="text-xs text-gray-400 italic py-2">Sem produtos disponíveis nesta categoria.</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {produtosExibidos.map((prod) => {
                          const qtdNoCarrinho = getQtdNoCarrinho(prod.id);

                          return (
                            <div
                              key={prod.id}
                              className="bg-gray-50/70 p-3 rounded-xl border border-gray-200/60 shadow-2xs flex flex-col justify-between hover:bg-white hover:shadow-sm transition-all group"
                            >
                              <div
                                onClick={() => abrirModalProduto(prod)}
                                className="flex gap-3 cursor-pointer"
                                title="Clique para ver detalhes e ingredientes"
                              >
                                <img
                                  src={prod.imagem_url || prod.imagem || 'https://via.placeholder.com/100'}
                                  alt={prod.nome}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200/60 flex-shrink-0 group-hover:scale-105 transition-transform"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-gray-900 text-sm leading-tight mb-0.5 truncate group-hover:text-rose-600 transition-colors">
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

                                {qtdNoCarrinho === 0 ? (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      adicionarRapidoAoCarrinho(prod);
                                    }}
                                    className="bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-2xs flex items-center gap-1"
                                  >
                                    + Adicionar
                                  </button>
                                ) : (
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg border border-gray-200"
                                  >
                                    <button
                                      onClick={() => diminuirRapidoDoCarrinho(prod.id)}
                                      className="w-7 h-7 bg-white rounded-md font-bold text-xs text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 flex items-center justify-center"
                                    >
                                      -
                                    </button>
                                    <span className="font-extrabold text-xs px-1.5 text-gray-800">
                                      {qtdNoCarrinho}
                                    </span>
                                    <button
                                      onClick={() => adicionarRapidoAoCarrinho(prod)}
                                      className="w-7 h-7 bg-white rounded-md font-bold text-xs text-gray-700 shadow-2xs hover:bg-gray-50 active:scale-95 flex items-center justify-center"
                                    >
                                      +
                                    </button>
                                  </div>
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

              <form onSubmit={finalizarPedido} className="space-y-4">
                <div className="space-y-3">
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
                </div>

                <div className="border border-gray-200 p-3.5 rounded-xl bg-gray-50/50 space-y-3">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Forma de Pagamento
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    {['Pix', 'Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'].map((opcao) => (
                      <button
                        key={opcao}
                        type="button"
                        onClick={() => setFormaPagamento(opcao)}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                          formaPagamento === opcao
                            ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
                            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {opcao === 'Pix' && '⚡ '}
                        {opcao === 'Dinheiro' && '💵 '}
                        {(opcao.includes('Cartão')) && '💳 '}
                        {opcao}
                      </button>
                    ))}
                  </div>

                  {formaPagamento === 'Dinheiro' && (
                    <div className="pt-2 border-t border-gray-200/60 space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Precisa de troco? Para quanto?
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: 50,00 ou deixe em branco se não precisar"
                        value={trocoPara}
                        onChange={(e) => setTrocoPara(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      />
                    </div>
                  )}

                  {formaPagamento === 'Pix' && (
                    <div className="pt-2 border-t border-gray-200/60 text-xs text-gray-600 space-y-2">
                      <div className="flex items-center justify-between bg-white p-2 rounded-lg border border-gray-200">
                        <span className="font-mono text-gray-800 text-[11px] truncate mr-2">{CHAVE_PIX}</span>
                        <button
                          type="button"
                          onClick={copiarChavePix}
                          className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-2 py-1 rounded text-[11px] border border-gray-300 active:scale-95 transition-all"
                        >
                          Copiar
                        </button>
                      </div>
                      <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                        💡 Você pode fazer o Pix agora ou enviar o comprovante após enviar o pedido pelo WhatsApp.
                      </p>
                    </div>
                  )}

                  {(formaPagamento === 'Cartão de Crédito' || formaPagamento === 'Cartão de Débito') && (
                    <div className="pt-2 border-t border-gray-200/60 space-y-1">
                      <label className="block text-xs font-semibold text-gray-600">
                        Bandeira / Observação do Cartão:
                      </label>
                      <select
                        value={bandeiraCartao}
                        onChange={(e) => setBandeiraCartao(e.target.value)}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                      >
                        <option value="Mastercard/Visa">Mastercard / Visa</option>
                        <option value="Elo">Elo</option>
                        <option value="Hipercard">Hipercard</option>
                        <option value="Alelo/Sodexo/VR">Vale Refeição (VR/Alelo/Sodexo)</option>
                      </select>
                    </div>
                  )}
                </div>

                <textarea
                  placeholder="Observações gerais da entrega (ex: ponto de referência, campainha...)"
                  rows="2"
                  value={observacoesGerais}
                  onChange={(e) => setObservacoesGerais(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />

                <button
                  type="submit"
                  disabled={enviando}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span>📲</span> {enviando ? 'Registrando Pedido...' : 'Enviar Pedido no WhatsApp'}
                </button>
              </form>
            </>
          )}
        </div>

      </div>

      {/* MODAL DE DETALHES + OBSERVAÇÃO INDIVIDUAL */}
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
                  Ingredientes & Descrição
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
                  placeholder="Ex: Sem cebola, molho à parte, pão bem passado..."
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

    </div>
  );
}