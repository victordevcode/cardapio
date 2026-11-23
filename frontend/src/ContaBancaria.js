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
  const [ativo, setAtivo] = useState(false);
  const [editandoToken, setEditandoToken] = useState(false);

  const [carregando, setCarregando] = useState(false);
  const [atualizandoId, setAtualizandoId] = useState(null);
  const [mensagem, setMensagem] = useState('');

  const carregarContas = async () => {
    try {
      const resposta = await axios.get('/api/configuracoes/pagamento');
      setContas(resposta.data);
    } catch (erro) {
      console.error('Erro ao carregar contas:', erro);
      setMensagem('Erro ao carregar contas de pagamento.');
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
    setAtivo(contas.length === 0);
    setEditandoToken(true);
    setMensagem('');
    setTela('formulario');
  };

  const abrirEditar = async (id) => {
    try {
      setMensagem('');
      const resposta = await axios.get(`/api/configuracoes/pagamento/${id}`);
      setIdEdicao(resposta.data.id);
      setDescricao(resposta.data.descricao || '');
      setTokenAcesso(resposta.data.token_acesso || '');
      setChavePublica(resposta.data.chave_publica || '');
      setAtivo(Boolean(resposta.data.ativo));
      setEditandoToken(false);
      setTela('formulario');
    } catch (erro) {
      console.error('Erro ao carregar detalhes:', erro);
      setMensagem('Erro ao carregar detalhes da conta.');
    }
  };

  // Alterna o checkbox direto na lista e persiste no banco
  const handleToggleAtivo = async (conta, novoValorAtivo) => {
    setAtualizandoId(conta.id);
    setMensagem('');

    // Atualização otimista na tela
    setContas((prev) =>
      prev.map((item) =>
        item.id === conta.id ? { ...item, ativo: novoValorAtivo } : item
      )
    );

    try {
      await axios.patch(`/api/configuracoes/pagamento/${conta.id}/ativo`, {
        ativo: novoValorAtivo,
      });
      await carregarContas();
      setMensagem(
        novoValorAtivo
          ? `Conta "${conta.descricao || `#${conta.id}`}" marcada como Ativa (SIM) para Pix e Crédito/Débito.`
          : `Conta "${conta.descricao || `#${conta.id}`}" marcada como Inativa (NÃO).`
      );
    } catch (erro) {
      console.error('Erro ao atualizar status ativo:', erro);
      await carregarContas(); // Reverte em caso de falha
      setMensagem('Erro ao atualizar o status Ativo no banco de dados.');
    } finally {
      setAtualizandoId(null);
    }
  };

  const handleSalvar = async (e) => {
    e.preventDefault();
    setCarregando(true);
    setMensagem('');

    try {
      await axios.post('/api/configuracoes/pagamento', {
        id: idEdicao,
        token_acesso: tokenAcesso,
        chave_publica: chavePublica,
        descricao: descricao,
        ativo: ativo,
      });
      setMensagem('Configurações salvas com sucesso!');
      await carregarContas();
      setTimeout(() => {
        setMensagem('');
        setTela('lista');
      }, 900);
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
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                Formas de Pagamento (Mercado Pago)
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Marque o checkbox nas contas usadas para cobrança no Pix e Crédito/Débito (Ativo = SIM).
              </p>
            </div>
            <button
              type="button"
              onClick={abrirNovo}
              className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition font-medium cursor-pointer"
            >
              + Nova Conta
            </button>
          </div>

          {mensagem && (
            <div className="mb-4 p-3 rounded bg-emerald-100 text-emerald-800 text-sm">
              {mensagem}
            </div>
          )}

          {contas.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Nenhuma conta cadastrada ainda.</p>
          ) : (
            <div className="space-y-3">
              {contas.map((conta) => {
                const isAtiva = Boolean(conta.ativo);
                const estaSalvando = atualizandoId === conta.id;

                return (
                  <div
                    key={conta.id}
                    className={`flex justify-between items-center p-4 border rounded-lg transition ${
                      isAtiva
                        ? 'bg-emerald-50/70 border-emerald-300'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        id={`ativo-conta-${conta.id}`}
                        type="checkbox"
                        checked={isAtiva}
                        disabled={estaSalvando}
                        onChange={(e) => handleToggleAtivo(conta, e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
                      />
                      <div>
                        <label
                          htmlFor={`ativo-conta-${conta.id}`}
                          className="flex items-center gap-2 cursor-pointer"
                        >
                          <h3 className="font-semibold text-gray-800 text-lg">
                            {conta.descricao || `Conta Mercado Pago #${conta.id}`}
                          </h3>
                          <span
                            className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                              isAtiva
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            Ativo: {isAtiva ? 'SIM' : 'NÃO'}
                          </span>
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Cobrança Pix e Crédito/Débito • Provedor: {conta.provedor || 'MERCADO_PAGO'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => abrirEditar(conta.id)}
                      className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition text-sm font-medium cursor-pointer"
                    >
                      Editar
                    </button>
                  </div>
                );
              })}
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
              type="button"
              onClick={() => setTela('lista')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium cursor-pointer"
            >
              ← Voltar para a lista
            </button>
          </div>

          {mensagem && (
            <div
              className={`mb-4 p-3 rounded ${
                mensagem.includes('sucesso')
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
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
                type={editandoToken ? 'text' : 'password'}
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

            <div className="flex items-start gap-3 p-3 rounded-md border bg-gray-50">
              <input
                id="conta-ativa-form"
                type="checkbox"
                checked={ativo}
                onChange={(e) => setAtivo(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="conta-ativa-form" className="text-sm cursor-pointer">
                <span className="font-medium text-gray-800 block">
                  Ativo para cobrança no Pix e Crédito/Débito ({ativo ? 'SIM' : 'NÃO'})
                </span>
                <span className="text-xs text-gray-500">
                  Apenas contas com Ativo = SIM serão utilizadas para gerar cobranças.
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-orange-600 text-white p-2 rounded-md hover:bg-orange-700 transition font-medium cursor-pointer"
            >
              {carregando ? 'Salvando...' : 'Salvar Configuração'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}