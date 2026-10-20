import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function TelaConfiguracaoPagamento() {
  const [contas, setContas] = useState([]);
  const [tela, setTela] = useState('lista'); // 'lista' ou 'formulario'
  
  // Estados do formulário
  const [idEdicao, setIdEdicao] = useState(null);
  const [descricao, setDescricao] = useState('');
  const [tokenAcesso, setTokenAcesso] = useState('');
  const [chavePublica, setChavePublica] = useState('');
  const [editandoToken, setEditandoToken] = useState(false);
  
  const [carregando, setCarregando] = useState(false);
  const [mensagem, setMensagem] = useState('');

  // Carregar listagem ao abrir
  const carregarContas = async () => {
    try {
      const resposta = await axios.get('http://localhost:3000/api/configuracoes/pagamento');
      setContas(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar contas:', erro);
    }
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const abrirNovo = () => {
    setIdEdicao(null);
    setDescricao('');
    setTokenAcesso('');
    setChavePublica('');
    setEditandoToken(true); // Novo já abre visível para digitar
    setMensagem('');
    setTela('formulario');
  };

  const abrirEditar = async (id) => {
    try {
      setMensagem('');
      const resposta = await axios.get(`http://localhost:3000/api/configuracoes/pagamento/${id}`);
      setIdEdicao(resposta.data.id);
      setDescricao(resposta.data.descricao || '');
      setTokenAcesso(resposta.data.token_acesso || '');
      setChavePublica(resposta.data.chave_publica || '');
      setEditandoToken(false); // Começa oculto por segurança ao editar
      setTela('formulario');
    } catch (erro) {
      console.error('Erro ao carregar detalhes:', erro);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');

    try {
      await axios.post('http://localhost:3000/api/configuracoes/pagamento', {
        id: idEdicao,
        token_acesso: tokenAcesso,
        chave_publica: chavePublica,
        descricao: descricao,
      });
      setMensagem('Configurações salvas com sucesso!');
      await carregarContas();
      setTimeout(() => setTela('lista'), 1000); // Retorna à lista após 1 segundo
    } catch (erro) {
      setMensagem('Erro ao salvar as configurações.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white rounded-lg shadow-md">
      {tela === 'lista' ? (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Formas de Pagamento (Mercado Pago)
            </h2>
            <button
              onClick={abrirNovo}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition font-medium"
            >
              + Nova Conta
            </button>
          </div>

          {contas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma conta cadastrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {contas.map((conta) => (
                <div key={conta.id} className="flex justify-between items-center p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">
                      {conta.descricao || `Conta Mercado Pago #${conta.id}`}
                    </h3>
                    <p className="text-xs text-gray-500 uppercase tracking-wider">Provedor: {conta.provedor}</p>
                  </div>
                  <button
                    onClick={() => abrirEditar(conta.id)}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition text-sm font-medium"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">
              {idEdicao ? 'Editar Conta de Pagamento' : 'Nova Conta de Pagamento'}
            </h2>
            <button
              onClick={() => setTela('lista')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              ← Voltar para a lista
            </button>
          </div>

          {mensagem && (
            <div className={`mb-4 p-3 rounded ${mensagem.includes('sucesso') ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {mensagem}
            </div>
          )}

          <form onSubmit={handleSalvar} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descrição / Identificação da Conta
              </label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border"
                placeholder="Ex: Conta Principal - Caixa 1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Token de Acesso (Access Token)
              </label>
              <input
                type={editandoToken ? "text" : "password"}
                value={tokenAcesso}
                onChange={(e) => setTokenAcesso(e.target.value)}
                onFocus={() => setEditandoToken(true)}
                required={!idEdicao}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono text-sm"
                placeholder="APP_USR-..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Clique no campo para visualizar e editar o token com segurança.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Chave Pública (Public Key - Opcional)
              </label>
              <input
                type="text"
                value={chavePublica}
                onChange={(e) => setChavePublica(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border font-mono text-sm"
                placeholder="TEST-..."
              />
            </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 transition font-medium"
                >
                  {carregando ? 'A salvar...' : 'Salvar Configuração'}
                </button>
          </form>
        </div>
      )}
    </div>
  );
}