import React, { useState, useEffect } from 'react';

export function CheckoutModal({ carrinho, total, onClose, onPedidoConcluido }) {
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [complemento, setComplemento] = useState('');
  const [loading, setLoading] = useState(false);

  // 1. Carrega dados prévios do localStorage
  useEffect(() => {
    const clienteSalvo = localStorage.getItem('lanches_ju_cliente');
    if (clienteSalvo) {
      try {
        const dados = JSON.parse(clienteSalvo);
        setTelefone(dados.telefone || '');
        setNome(dados.nome || '');
        setEndereco(dados.endereco || '');
        setBairro(dados.bairro || '');
        setComplemento(dados.complemento || '');
      } catch (e) {
        console.error("Erro ao ler dados salvos:", e);
      }
    }
  }, []);

  // 2. Busca cadastro no seu backend Node ao digitar o telefone
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

  // 3. Salva pedido e envia para o WhatsApp
  const handleFinalizarPedido = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const telefoneLimpo = telefone.replace(/\D/g, '');
      const clienteData = { telefone: telefoneLimpo, nome, endereco, bairro, complemento };

      // Salva no localStorage para a próxima compra
      localStorage.setItem('lanches_ju_cliente', JSON.stringify(clienteData));

      // Envia pedido para o backend Node.js
      await fetch('http://localhost:3000/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente: clienteData,
          itens: carrinho,
          total: total,
        }),
      });

      // Envia mensagem para o WhatsApp
      enviarWhatsApp(clienteData, carrinho, total);

      if (onPedidoConcluido) onPedidoConcluido();
    } catch (err) {
      alert('Erro ao processar pedido: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const enviarWhatsApp = (cliente, itens, totalPedido) => {
    const numeroLanchonete = '5512999999999'; // Insira o número real da Lanchonete
    let mensagem = `*NOVO PEDIDO - LANCHES DA JÚ*\n\n`;
    mensagem += `👤 *Cliente:* ${cliente.nome}\n`;
    mensagem += `📞 *Telefone:* ${cliente.telefone}\n`;
    mensagem += `📍 *Endereço:* ${cliente.endereco}, ${cliente.bairro}\n`;
    if (cliente.complemento) mensagem += `🏠 *Comp:* ${cliente.complemento}\n`;
    mensagem += `\n🛒 *ITENS:* \n`;

    itens.forEach((item) => {
      mensagem += `- ${item.quantidade || 1}x ${item.nome} (R$ ${(Number(item.preco) * (item.quantidade || 1)).toFixed(2)})\n`;
      if (item.observacao) mensagem += `   ↳ _Obs: ${item.observacao}_\n`;
    });

    mensagem += `\n💰 *TOTAL:* R$ ${Number(totalPedido).toFixed(2)}`;

    const url = `https://wa.me/${numeroLanchonete}?text=${encodeURIComponent(mensagem)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100">
        <div className="flex justify-between items-center mb-4 pb-2 border-b">
          <h2 className="text-xl font-bold text-gray-800">Finalizar Pedido 🛵</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl font-bold">&times;</button>
        </div>

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

          <div className="pt-4 border-t mt-4">
            <div className="flex justify-between text-lg font-extrabold mb-4 text-gray-800">
              <span>Total:</span>
              <span className="text-rose-600">R$ {Number(total).toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 transition shadow-md active:scale-[0.98]"
            >
              {loading ? 'Processando...' : 'Confirmar e Enviar Pedido 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}