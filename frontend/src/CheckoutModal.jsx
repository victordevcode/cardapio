import React, { useState, useEffect } from 'react';

export function CheckoutModal({ carrinho, total, onClose, onPedidoConcluido }) {
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [complemento, setComplemento] = useState('');

  // Estados para Bairros e Taxas
  const [bairros, setBairros] = useState([]);
  const [bairroSelecionadoId, setBairroSelecionadoId] = useState('');
  const [bairroNome, setBairroNome] = useState('');
  const [taxaEntrega, setTaxaEntrega] = useState(0);

  // Opções: 'pix', 'dinheiro', 'credito', 'debito'
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [trocoPara, setTrocoPara] = useState('');

  const [loading, setLoading] = useState(false);
  const [carregandoBairros, setCarregandoBairros] = useState(true);

  // Estados do PIX
  const [dadosPix, setDadosPix] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // Total Final (Itens + Entrega)
  const totalFinal = Number(total || 0) + Number(taxaEntrega || 0);

  // 1. Carregar Bairros do Backend
  useEffect(() => {
    async function carregarTaxas() {
      try {
        setCarregandoBairros(true);
        // Tenta rota pública primeiro, e se falhar tenta a rota padrão
        let res = await fetch('http://localhost:3000/api/taxas-entrega/publicas');
        if (!res.ok) {
          res = await fetch('http://localhost:3000/api/taxas-entrega');
        }
        
        if (res.ok) {
          const dados = await res.json();
          setBairros(dados);
        }
      } catch (e) {
        console.error('Erro ao carregar taxas de entrega:', e);
      } finally {
        setCarregandoBairros(false);
      }
    }

    carregarTaxas();

    // Restaurar dados salvos no localStorage
    const clienteSalvo = localStorage.getItem('lanches_ju_cliente');
    if (clienteSalvo) {
      try {
        const dados = JSON.parse(clienteSalvo);
        setTelefone(dados.telefone || '');
        setEmail(dados.email || '');
        setNome(dados.nome || '');
        setEndereco(dados.endereco || '');
        setComplemento(dados.complemento || '');
        if (dados.bairro) setBairroNome(dados.bairro);
      } catch (e) {
        console.error('Erro ao ler dados salvos:', e);
      }
    }
  }, []);

  // 2. Tratar Seleção do Bairro
  const handleBairroChange = (e) => {
    const id = e.target.value;
    setBairroSelecionadoId(id);

    const item = bairros.find((b) => String(b.id) === String(id));
    if (item) {
      setBairroNome(item.bairro);
      setTaxaEntrega(Number(item.valor || 0));
    } else {
      setBairroNome('');
      setTaxaEntrega(0);
    }
  };

  // 3. Busca rápida por telefone
  const handleTelefoneChange = async (e) => {
    const valor = e.target.value;
    setTelefone(valor);

    const numerosApenas = valor.replace(/\D/g, '');
    if (numerosApenas.length >= 10) {
      try {
        const res = await fetch(`http://localhost:3000/api/clientes/${numerosApenas}`);
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setEmail(data.email || '');
            setNome(data.nome || '');
            setEndereco(data.endereco || '');
            setComplemento(data.complemento || '');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
      }
    }
  };

  // 4. Submit do Pedido
  const handleFinalizarPedido = async (e) => {
    e.preventDefault();

    if (!bairroNome) {
      alert('Por favor, selecione ou informe o seu bairro.');
      return;
    }

    setLoading(true);

    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const clienteData = {
        telefone: telefoneLimpo,
        email,
        nome,
        endereco,
        bairro: bairroNome,
        taxa_entrega: taxaEntrega,
        complemento,
      };

      localStorage.setItem('lanches_ju_cliente', JSON.stringify(clienteData));

      if (formaPagamento === 'pix') {
        const resPix = await fetch('http://localhost:3000/api/pagamento/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total: totalFinal,
            email: email,
            nome: nome,
          }),
        });

        const dataPix = await resPix.json();

        if (!resPix.ok || !dataPix.success) {
          throw new Error(dataPix.mensagem || 'Falha ao gerar cobrança PIX.');
        }

        await fetch('http://localhost:3000/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: clienteData,
            itens: carrinho,
            subtotal: total,
            taxa_entrega: taxaEntrega,
            total: totalFinal,
            formaPagamento: 'PIX Online',
            pagamentoId: dataPix.pagamentoId,
            statusPagamento: dataPix.status || 'pending',
          }),
        });

        setDadosPix({
          qrCodeBase64: dataPix.qrCodeBase64,
          pixCopiaECola: dataPix.pixCopiaECola,
          clienteData,
        });

      } else if (formaPagamento === 'credito') {
        // 💳 CHAMA A ROTA DO SERVER.JS PARA GERAR O LINK DE CARTÃO (CHECKOUT PRO)
        const resCartao = await fetch('http://localhost:3000/api/pagamento/cartao-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total: totalFinal,
            email: email,
            cliente_nome: nome,
            cliente: clienteData,
          }),
        });

        const dataCartao = await resCartao.json();

        if (!resCartao.ok || !dataCartao.success) {
          throw new Error(dataCartao.mensagem || 'Falha ao gerar link de pagamento com cartão.');
        }

        // Salva o pedido no banco com o status pendente/aguardando
        await fetch('http://localhost:3000/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: clienteData,
            itens: carrinho,
            subtotal: total,
            taxa_entrega: taxaEntrega,
            total: totalFinal,
            formaPagamento: 'Cartão de Crédito Online',
            pagamentoId: dataCartao.preferenceId,
            statusPagamento: 'pending',
          }),
        });

        // Redireciona o cliente para a página segura do Mercado Pago
        window.location.href = dataCartao.linkPagamento;

      } else {
        let descricaoPagamento = '';
        if (formaPagamento === 'dinheiro') {
          descricaoPagamento = trocoPara
            ? `Dinheiro (Troco para R$ ${parseFloat(trocoPara).toFixed(2)})`
            : 'Dinheiro (Sem troco / Valor exato)';
        } else if (formaPagamento === 'debito') {
          descricaoPagamento = 'Cartão de Débito (Maquininha na entrega)';
        }

        await fetch('http://localhost:3000/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: clienteData,
            itens: carrinho,
            subtotal: total,
            taxa_entrega: taxaEntrega,
            total: totalFinal,
            formaPagamento: descricaoPagamento,
            statusPagamento: 'Aguardando Pagamento na Entrega',
          }),
        });

        enviarWhatsApp(clienteData, carrinho, totalFinal, descricaoPagamento);
        if (onPedidoConcluido) onPedidoConcluido();
      }
    } catch (err) {
      alert('Erro ao processar pedido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarPix = () => {
    if (dadosPix?.pixCopiaECola) {
      navigator.clipboard.writeText(dadosPix.pixCopiaECola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const handleConcluirEWhatsApp = () => {
    if (dadosPix?.clienteData) {
      enviarWhatsApp(dadosPix.clienteData, carrinho, totalFinal, 'PIX Online (Mercado Pago)');
    }
    if (onPedidoConcluido) onPedidoConcluido();
  };

  const enviarWhatsApp = (cliente, itens, totalPedido, formaPagamentoTxt) => {
    const numeroLanchonete = '5512999999999';
    let mensagem = `*NOVO PEDIDO - LANCHES DA JÚ*\n\n`;
    mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
    mensagem += `📞 *Telefone:* ${cliente.telefone}\n`;
    if (cliente.email) mensagem += `📧 *E-mail:* ${cliente.email}\n`;
    mensagem += `📍 *Endereço:* ${cliente.endereco}\n`;
    mensagem += `🛵 *Bairro:* ${cliente.bairro} (Taxa: R$ ${Number(taxaEntrega).toFixed(2)})\n`;
    if (cliente.complemento) mensagem += `🏠 *Comp:* ${cliente.complemento}\n`;
    mensagem += `\n🛒 *ITENS:* \n`;

    itens.forEach((item) => {
      mensagem += `- ${item.quantidade || 1}x ${item.nome} (R$ ${(Number(item.preco) * (item.quantidade || 1)).toFixed(2)})\n`;
      if (item.observacao) mensagem += `   ↳ _Obs: ${item.observacao}_\n`;
    });

    mensagem += `\n💵 *Subtotal:* R$ ${Number(total).toFixed(2)}`;
    mensagem += `\n🛵 *Taxa Entrega:* R$ ${Number(taxaEntrega).toFixed(2)}`;
    mensagem += `\n💰 *TOTAL FINAL:* R$ ${Number(totalPedido).toFixed(2)}\n`;
    mensagem += `💳 *Forma de Pagamento:* ${formaPagamentoTxt}`;

    const url = `https://wa.me/${numeroLanchonete}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        
        {/* CABEÇALHO */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-bold text-gray-800">
            {dadosPix ? 'Pagamento via PIX 📱' : 'Finalizar Pedido 🛵'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold cursor-pointer">&times;</button>
        </div>

        {!dadosPix ? (
          <form onSubmit={handleFinalizarPedido} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Telefone / WhatsApp</label>
              <input
                type="tel"
                required
                placeholder="(12) 99999-9999"
                value={telefone}
                onChange={handleTelefoneChange}
                className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Seu E-mail</label>
              <input
                type="email"
                required
                placeholder="seuemail@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Seu Nome</label>
              <input
                type="text"
                required
                placeholder="Digite seu nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Endereço e Número</label>
              <input
                type="text"
                required
                placeholder="Rua, Número"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* CAMPO DE SELEÇÃO DE BAIRRO COM TAXA */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bairro / Região*</label>
                {carregandoBairros ? (
                  <div className="p-3 border border-gray-200 rounded-xl text-xs text-gray-400 bg-gray-50">
                    Carregando bairros...
                  </div>
                ) : bairros.length > 0 ? (
                  <select
                    required
                    value={bairroSelecionadoId}
                    onChange={handleBairroChange}
                    className="w-full p-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 outline-none bg-white font-medium"
                  >
                    <option value="">Selecione seu bairro...</option>
                    {bairros.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bairro} — {Number(b.valor) === 0 ? 'Grátis' : `R$ ${Number(b.valor).toFixed(2)}`}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="Informe seu bairro"
                    value={bairroNome}
                    onChange={(e) => setBairroNome(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Complemento</label>
                <input
                  type="text"
                  placeholder="Apt, Bloco..."
                  value={complemento}
                  onChange={(e) => setComplemento(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            {/* FORMAS DE PAGAMENTO */}
            <div className="pt-2 border-t">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormaPagamento('pix')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formaPagamento === 'pix'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  📱 Pix Online
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('dinheiro')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formaPagamento === 'dinheiro'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💵 Dinheiro
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('credito')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formaPagamento === 'credito'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💳 Crédito Online
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('debito')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition cursor-pointer ${
                    formaPagamento === 'debito'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💳 Débito (Entrega)
                </button>
              </div>
            </div>

            {formaPagamento === 'dinheiro' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                  Troco para quanto? (Deixe em branco se for valor exato)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Ex: ${(Number(totalFinal) + 10).toFixed(2)}`}
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            {/* RESUMO DETALHADO DO VALOR COM TAXA */}
            <div className="pt-3 border-t mt-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200/70 space-y-1 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal dos Itens:</span>
                <span className="font-semibold">R$ {Number(total).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Taxa de Entrega ({bairroNome || 'não selecionado'}):</span>
                <span className="font-bold text-rose-600">
                  {bairroNome ? (taxaEntrega === 0 ? 'Grátis' : `R$ ${taxaEntrega.toFixed(2)}`) : 'Selecione o bairro'}
                </span>
              </div>
              <hr className="border-gray-200 my-1" />
              <div className="flex justify-between text-base font-extrabold text-gray-900">
                <span>Total Final:</span>
                <span className="text-emerald-600">R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition shadow-md active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {loading
                ? 'Processando...'
                : formaPagamento === 'pix'
                ? 'Gerar PIX e Continuar 🚀'
                : formaPagamento === 'credito'
                ? 'Ir para Pagamento com Cartão 💳'
                : 'Enviar Pedido para o WhatsApp 🚀'}
            </button>
          </form>
        ) : (
          /* TELA DE PIX */
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <p className="text-sm font-medium text-gray-600">
              Escaneie o QR Code abaixo no app do seu banco para pagar:
            </p>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner">
              <img
                src={`data:image/jpeg;base64,${dadosPix.qrCodeBase64}`}
                alt="QR Code PIX Mercado Pago"
                className="w-56 h-56 object-contain rounded-lg mx-auto"
              />
            </div>

            <div className="w-full pt-2">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Ou copie a chave abaixo:</p>
              <button
                type="button"
                onClick={handleCopiarPix}
                className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition flex items-center justify-center gap-2 active:scale-[0.98] cursor-pointer"
              >
                {copiado ? '✅ Chave PIX Copiada!' : '📋 Copiar Código Pix Copia e Cola'}
              </button>
            </div>

            <div className="w-full pt-4 border-t">
              <button
                type="button"
                onClick={handleConcluirEWhatsApp}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition shadow-md active:scale-[0.98] cursor-pointer"
              >
                Enviar Pedido para o WhatsApp 📲
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}