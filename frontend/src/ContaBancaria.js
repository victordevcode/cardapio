import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TelaConfiguracaoPagamento() {
  const [tokenAcesso, setTokenAcesso] = useState('');
  const [chavePublica, setChavePublica] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    async function carregarConfiguracoes() {
      try {
        const token = sessionStorage.getItem('token');
        console.log('Token recuperado no sessionStorage:', token); // Log para depuração

        const resposta = await axios.get('http://localhost:3000/api/configuracoes/pagamento', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (resposta.data) {
          setTokenAcesso(resposta.data.token_acesso || '');
          setChavePublica(resposta.data.chave_publica || '');
        }
      } catch (erro) {
        console.error('Erro ao carregar configurações:', erro.response?.data || erro.message);
      }
    }
    carregarConfiguracoes();
  }, []);

  const handleSalvar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');

    try {
      const token = sessionStorage.getItem('token');
      console.log('Enviando token para salvar:', token); // Log para depuração

      await axios.post('http://localhost:3000/api/configuracoes/pagamento', {
        token_acesso: tokenAcesso,
        chave_publica: chavePublica,
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMensagem('Configurações salvas com sucesso!');
    } catch (erro) {
      console.error('Erro detalhado ao salvar:', erro.response?.data || erro.message);
      setMensagem('Erro ao salvar as configurações: ' + (erro.response?.data?.mensagem || erro.message));
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        Configurações do Mercado Pago
      </h2>

      {mensagem && (
        <div className={`mb-4 p-3 rounded ${mensagem.includes('sucesso') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {mensagem}
        </div>
      )}

      <form onSubmit={handleSalvar} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Token de Acesso (Access Token)
          </label>
          <input
            type="password"
            value={tokenAcesso}
            onChange={(e) => setTokenAcesso(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="APP_USR-..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Chave Pública (Public Key - Opcional)
          </label>
          <input
            type="text"
            value={chavePublica}
            onChange={(e) => setChavePublica(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
            placeholder="TEST-..."
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          className="w-full bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 transition"
        >
          {carregando ? 'A salvar...' : 'Salvar Configurações'}
        </button>
      </form>
    </div>
  );
}