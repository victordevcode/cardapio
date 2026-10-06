import React, { useState, useEffect } from 'react';

export function CheckoutModal({ carrinho, total, onClose, onPedidoConcluido }) {
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  
  // Opções: 'pix', 'dinheiro', 'credito', 'debito'
  const [formaPagamento, setFormaPagamento] = useState('pix');
  const [trocoPara, setTrocoPara] = useState('');

  const [loading, setLoading] = useState(false);

  // Estados para controlar a exibição do QR Code PIX
  const [dadosPix, setDadosPix] = useState(null);
  const [copiado, setCopiado] = useState(false);

  // 1. Carrega dados prévios do localStorage
  useEffect(() => {
    const clienteSalvo = localStorage.getItem('lanches_ju_cliente');
    if (clienteSalvo) {
      try {
        const dados = JSON.parse(clienteSalvo);
        setTelefone(dados.telefone || '');
        setEmail(dados.email || '');
        setNome(dados.nome || '');
        setEndereco(dados.endereco || '');
        setBairro(dados.bairro || '');
        setComplemento(dados.complemento || '');
      } catch (e) {
        console.error("Erro ao ler dados salvos:", e);
      }
    }
  }, []);

  // 2. Busca cadastro no backend ao digitar o telefone
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
            setBairro(data.bairro || '');
            setComplemento(data.complemento || '');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar cliente:', err);
      }
    }
  };

  // 3. Processa o pedido de acordo com a forma de pagamento escolhida
  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const clienteData = { telefone: telefoneLimpo, email, nome, endereco, bairro, complemento };

      // Salva dados no localStorage para facilitar na próxima compra
      localStorage.setItem('lanches_ju_cliente', JSON.stringify(clienteData));

      // FLUXO A: Pagamento via PIX (Gera cobrança no Mercado Pago)
      if (formaPagamento === 'pix') {
        const resPix = await fetch('http://localhost:3000/api/pagamento/pix', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            total: total,
            email: email,
            nome: nome,
          }),
        });

        const dataPix = await resPix.json();

        if (!resPix.ok || !dataPix.success) {
          throw new Error(dataPix.mensagem || 'Falha ao gerar cobrança PIX.');
        }

        // Salva o pedido informando id do pagamento
        await fetch('http://localhost:3000/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: clienteData,
            itens: carrinho,
            total: total,
            formaPagamento: 'PIX',
            pagamentoId: dataPix.pagamentoId,
            statusPagamento: dataPix.status || 'pending',
          }),
        });

        // Exibe a tela com o QR Code
        setDadosPix({
          qrCodeBase64: dataPix.qrCodeBase64,
          pixCopiaECola: dataPix.pixCopiaECola,
          clienteData,
        });

      } else {
        // FLUXO B: Dinheiro ou Maquininha de Cartão na entrega (Não gera Pix no MP)
        let descricaoPagamento = '';
        if (formaPagamento === 'dinheiro') {
          descricaoPagamento = trocoPara 
            ? `Dinheiro (Troco para R$ ${parseFloat(trocoPara).toFixed(2)})`
            : 'Dinheiro (Sem troco / Valor exato)';
        } else if (formaPagamento === 'credito') {
          descricaoPagamento = 'Cartão de Crédito (Maquininha na entrega)';
        } else if (formaPagamento === 'debito') {
          descricaoPagamento = 'Cartão de Débito (Maquininha na entrega)';
        }

        // Salva o pedido no BD local
        await fetch('http://localhost:3000/api/pedidos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cliente: clienteData,
            itens: carrinho,
            total: total,
            formaPagamento: descricaoPagamento,
            statusPagamento: 'Aguardando Pagamento na Entrega',
          }),
        });

        // Abre direto o WhatsApp do restaurante
        enviarWhatsApp(clienteData, carrinho, total, descricaoPagamento);
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
      enviarWhatsApp(dadosPix.clienteData, carrinho, total, 'PIX Mercado Pago');
    }
    if (onPedidoConcluido) onPedidoConcluido();
  };

  const enviarWhatsApp = (cliente, itens, totalPedido, formaPagamentoTxt) => {
    const numeroLanchonete = '5512999999999'; // Coloque o numero oficial da lanchonete
    let mensagem = `*NOVO PEDIDO - LANCHES DA JÚ*\n\n`;
    mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
    mensagem += `📞 *Telefone:* ${cliente.telefone}\n`;
    if (cliente.email) mensagem += `📧 *E-mail:* ${cliente.email}\n`;
    mensagem += `📍 *Endereço:* ${cliente.endereco}, ${cliente.bairro}\n`;
    if (cliente.complemento) mensagem += `🏠 *Comp:* ${cliente.complemento}\n`;
    mensagem += `\n🛒 *ITENS:* \n`;

    itens.forEach((item) => {
      mensagem += `- ${item.quantidade || 1}x ${item.nome} (R$ ${(Number(item.preco) * (item.quantidade || 1)).toFixed(2)})\n`;
      if (item.observacao) mensagem += `   ↳ _Obs: ${item.observacao}_\n`;
    });

    mensagem += `\n💰 *TOTAL:* R$ ${Number(totalPedido).toFixed(2)}\n`;
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

        {/* FLUXO 1: FORMULÁRIO DE CADASTRO E SELEÇÃO DE PAGAMENTO */}
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Bairro</label>
                <input
                  type="text"
                  required
                  placeholder="Seu bairro"
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-xl text-base focus:ring-2 focus:ring-rose-500 outline-none"
                />
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

            {/* OPÇÃO DE FORMA DE PAGAMENTO */}
            <div className="pt-2 border-t">
              <label className="block text-xs font-bold text-gray-600 uppercase mb-2">Forma de Pagamento</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormaPagamento('pix')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
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
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
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
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
                    formaPagamento === 'credito'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💳 Crédito
                </button>

                <button
                  type="button"
                  onClick={() => setFormaPagamento('debito')}
                  className={`p-3 rounded-xl font-bold text-sm border flex items-center justify-center gap-2 transition ${
                    formaPagamento === 'debito'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  💳 Débito
                </button>
              </div>
            </div>

            {/* CAMPO CONDICIONAL PARA TROCO */}
            {formaPagamento === 'dinheiro' && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl">
                <label className="block text-xs font-bold text-amber-800 uppercase mb-1">
                  Troco para quanto? (Deixe em branco se for valor exato)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder={`Ex: ${(Number(total) + 10).toFixed(2)}`}
                  value={trocoPara}
                  onChange={(e) => setTrocoPara(e.target.value)}
                  className="w-full p-2.5 bg-white border border-amber-300 rounded-lg text-base focus:ring-2 focus:ring-amber-500 outline-none"
                />
              </div>
            )}

            <div className="pt-4 border-t mt-4">
              <div className="flex justify-between text-lg font-extrabold mb-4 text-gray-800">
                <span>Total:</span>
                <span className="text-rose-600">R$ {Number(total).toFixed(2)}</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition shadow-md active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? 'Processando...'
                  : formaPagamento === 'pix'
                  ? 'Gerar PIX e Continuar 🚀'
                  : 'Enviar Pedido para o WhatsApp 🚀'}
              </button>
            </div>
          </form>
        ) : (
          /* FLUXO 2: TELA DO QR CODE PIX */
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <p className="text-sm font-medium text-gray-600">
              Escaneie o QR Code abaixo no app do seu banco para pagar:
            </p>

            <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl shadow-inner">
              <img
                src={`data:image/jpeg;base64,${dadosPix.qrCodeBase64}`}
                alt="QR Code PIX Mercado Pago"
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            <div className="w-full pt-2">
              <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Ou copie a chave abaixo:</p>
              <button
                type="button"
                onClick={handleCopiarPix}
                className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold text-sm hover:bg-slate-900 transition flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                {copiado ? '✅ Chave PIX Copiada!' : '📋 Copiar Código Pix Copia e Cola'}
              </button>
            </div>

            <div className="w-full pt-4 border-t">
              <button
                type="button"
                onClick={handleConcluirEWhatsApp}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition shadow-md active:scale-[0.98]"
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