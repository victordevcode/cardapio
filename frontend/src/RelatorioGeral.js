import React, { useState, useEffect, useCallback } from 'react';

export default function RelatorioGeral() {
  const [periodo, setPeriodo] = useState('mes'); // 'hoje', '7dias', 'mes', 'custom'
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  
  const [dadosRelatorio, setDadosRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(true);

  // Calcular datas do período selecionado
  const obterDatasFiltro = useCallback(() => {
    const hoje = new Date();
    const isoHoje = hoje.toISOString().split('T')[0];

    if (periodo === 'hoje') {
      return { inicio: isoHoje, fim: isoHoje };
    }
    if (periodo === '7dias') {
      const d7 = new Date();
      d7.setDate(hoje.getDate() - 7);
      return { inicio: d7.toISOString().split('T')[0], fim: isoHoje };
    }
    if (periodo === 'mes') {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      return { inicio: inicioMes.toISOString().split('T')[0], fim: isoHoje };
    }
    return { inicio: dataInicio, fim: dataFim };
  }, [periodo, dataInicio, dataFim]);

  const carregarRelatorio = useCallback(async () => {
    try {
      setCarregando(true);
      const { inicio, fim } = obterDatasFiltro();
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');

      let url = 'http://localhost:3000/api/relatorios?';
      if (inicio) url += `data_inicio=${inicio}&`;
      if (fim) url += `data_fim=${fim}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Erro ao buscar relatórios');
      const dados = await res.json();
      setDadosRelatorio(dados);
    } catch (err) {
      console.error(err);
    } finally {
      setCarregando(false);
    }
  }, [obterDatasFiltro]);

  useEffect(() => {
    carregarRelatorio();
  }, [carregarRelatorio]);

  const resumo = dadosRelatorio?.resumo || {};
  const porBairro = dadosRelatorio?.porBairro || {};
  const porFormaPagamento = dadosRelatorio?.porFormaPagamento || {};

  return (
    <div className="max-w-5xl mx-auto font-sans space-y-6">
      
      {/* 1. SELETOR DE PERÍODO */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            📊 Relatórios & Quantitativos
          </h2>
          <p className="text-xs text-gray-500">Resumo financeiro e operacional da lanchonete</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['hoje', '7dias', 'mes', 'custom'].map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                periodo === p
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {p === 'hoje' && 'Hoje'}
              {p === '7dias' && 'Últimos 7 dias'}
              {p === 'mes' && 'Mês Atual'}
              {p === 'custom' && 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {/* FILTRO PERSONALIZADO */}
      {periodo === 'custom' && (
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm flex items-center gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="p-2 text-xs border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="p-2 text-xs border border-gray-200 rounded-xl bg-gray-50"
            />
          </div>
          <button
            type="button"
            onClick={carregarRelatorio}
            className="mt-5 bg-rose-600 text-white font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
          >
            Filtrar
          </button>
        </div>
      )}

      {/* 2. CARDs DE INDICADORES (KPIs) */}
      {carregando ? (
        <p className="text-center py-8 text-xs text-gray-400">Gerando relatórios...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase">Total de Pedidos</span>
              <h3 className="text-2xl font-extrabold text-gray-900 mt-1">
                {resumo.totalPedidos || 0}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">pedidos efetuados</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase">Vendas (Lanches)</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">
                R$ {Number(resumo.faturamentoProdutos || 0).toFixed(2)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">sem contar entrega</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm">
              <span className="text-xs font-bold text-gray-400 uppercase">Taxas de Entrega</span>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-1">
                R$ {Number(resumo.totalTaxasEntrega || 0).toFixed(2)}
              </h3>
              <p className="text-[11px] text-gray-400 mt-1">repassado/arrecadado</p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm bg-rose-50/20 border-rose-100">
              <span className="text-xs font-bold text-rose-700 uppercase">Faturamento Geral</span>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-1">
                R$ {Number(resumo.faturamentoTotal || 0).toFixed(2)}
              </h3>
              <p className="text-[11px] text-rose-400 mt-1">
                Ticket Médio: R$ {Number(resumo.ticketMedio || 0).toFixed(2)}
              </p>
            </div>

          </div>

          {/* 3. TABELAS DETALHADAS POR BAIRRO E FORMA DE PAGAMENTO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* VENDAS E TAXAS POR BAIRRO */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                🛵 Quantitativo por Bairro
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase font-bold">
                      <th className="py-2">Bairro</th>
                      <th className="py-2 text-center">Pedidos</th>
                      <th className="py-2 text-right">Total Taxas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.keys(porBairro).length === 0 ? (
                      <tr>
                        <td colSpan="3" className="py-4 text-center text-gray-400">Nenhum dado encontrado.</td>
                      </tr>
                    ) : (
                      Object.entries(porBairro).map(([bairro, info]) => (
                        <tr key={bairro}>
                          <td className="py-2.5 font-bold text-gray-800">{bairro}</td>
                          <td className="py-2.5 text-center font-bold text-gray-600">{info.qtd}</td>
                          <td className="py-2.5 text-right font-extrabold text-emerald-600">
                            R$ {Number(info.totalTaxas).toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* VENDAS POR FORMA DE PAGAMENTO */}
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-3">
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                💳 Formas de Pagamento
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-400 uppercase font-bold">
                      <th className="py-2">Forma de Pagamento</th>
                      <th className="py-2 text-right">Qtd. Pedidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {Object.keys(porFormaPagamento).length === 0 ? (
                      <tr>
                        <td colSpan="2" className="py-4 text-center text-gray-400">Nenhum dado encontrado.</td>
                      </tr>
                    ) : (
                      Object.entries(porFormaPagamento).map(([forma, qtd]) => (
                        <tr key={forma}>
                          <td className="py-2.5 font-bold text-gray-800">{forma}</td>
                          <td className="py-2.5 text-right font-bold text-gray-600">{qtd}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </>
      )}

    </div>
  );
}