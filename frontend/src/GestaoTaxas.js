import React, { useState, useEffect, useCallback } from 'react';

export default function GestaoTaxas() {
  const [taxas, setTaxas] = useState([]);
  const [bairro, setBairro] = useState('');
  const [valor, setValor] = useState('');
  const [taxaEditandoId, setTaxaEditandoId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);

  // Estado para buscar pelo nome do bairro
  const [busca, setBusca] = useState('');

  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);

  const buscarTaxas = useCallback(async () => {
    try {
      const res = await fetch('/api/taxas-entrega');
      if (!res.ok) throw new Error('Erro ao buscar taxas');
      const dados = await res.json();
      setTaxas(Array.isArray(dados) ? dados : []);
    } catch (err) {
      console.error('Erro ao buscar taxas:', err);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    buscarTaxas();
  }, [buscarTaxas]);

  const limparFormulario = () => {
    setBairro('');
    setValor('');
    setTaxaEditandoId(null);
    setMostrarFormulario(false);
  };

  const abrirNovoCadastro = () => {
    if (mostrarFormulario && !taxaEditandoId) {
      limparFormulario();
    } else {
      setBairro('');
      setValor('');
      setTaxaEditandoId(null);
      setMostrarFormulario(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const iniciarEdicao = (taxa) => {
    const idAtual = taxa.id ?? taxa._id;
    setTaxaEditandoId(idAtual);
    setBairro(taxa.bairro || '');
    setValor(
      taxa.valor !== undefined && taxa.valor !== null
        ? String(taxa.valor)
        : ''
    );
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const bairroLimpo = bairro.trim();
    const valorNormalizado = Number(String(valor).replace(',', '.').trim());

    if (!bairroLimpo) {
      alert('⚠️ Informe o nome do bairro ou região.');
      return;
    }

    if (Number.isNaN(valorNormalizado) || valorNormalizado < 0) {
      alert('⚠️ Informe um valor válido (use 0 para entrega grátis).');
      return;
    }

    setEnviando(true);

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const url = taxaEditandoId
        ? `/api/taxas-entrega/${taxaEditandoId}`
        : '/api/taxas-entrega';

      const method = taxaEditandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          bairro: bairroLimpo,
          valor: valorNormalizado,
        }),
      });

      if (!res.ok) {
        const erroTexto = await res.text().catch(() => '');
        throw new Error(erroTexto || 'Erro ao salvar taxa');
      }

      alert(taxaEditandoId ? '✏️ Taxa atualizada!' : '✅ Taxa cadastrada!');
      limparFormulario();
      await buscarTaxas();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setEnviando(false);
    }
  };

  const excluirTaxa = async (id, nomeBairro) => {
    if (!window.confirm(`Excluir a taxa para "${nomeBairro}"?`)) return;

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const res = await fetch(`/api/taxas-entrega/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error('Erro ao excluir');

      alert('🗑️ Taxa removida com sucesso!');
      await buscarTaxas();
    } catch (err) {
      alert('❌ Não foi possível excluir a taxa.');
    }
  };

  // Filtra as taxas de acordo com o nome do bairro buscado
  const taxasFiltradas = taxas.filter((item) =>
    (item.bairro || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto font-sans space-y-6 pb-8">
      {/* BARRA SUPERIOR COM BOTÃO E INPUT DE BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm">
        <button
          type="button"
          onClick={abrirNovoCadastro}
          className="bg-red-600 hover:bg-red-700 text-amber-300 font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
        >
          {mostrarFormulario && !taxaEditandoId
            ? '✕ Fechar Formulário'
            : '🛵 Nova Taxa de Bairro'}
        </button>

        {/* Campo de Busca por Bairro */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="🔍 Buscar bairro..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-gray-50/70 text-stone-900 focus:ring-2 focus:ring-amber-400 focus:border-red-500 focus:outline-none shadow-2xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FORMULÁRIO RETRÁTIL */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl border-2 border-amber-300/70 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-6 pb-3 border-b border-gray-100">
            <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
              {taxaEditandoId
                ? '✏️ Editar Taxa de Entrega'
                : '🛵 Cadastrar Taxa por Bairro'}
            </h2>
            <button
              type="button"
              onClick={limparFormulario}
              className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
            >
              ✕ Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">
                  Nome do Bairro / Região*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Centro, Vila Nova, Zona Sul..."
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-red-500 focus:outline-none bg-gray-50/60 text-stone-900"
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-stone-700 mb-1">
                  Valor da Entrega (R$)*
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  placeholder="0.00 (0 para Grátis)"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-red-500 focus:outline-none bg-gray-50/60 text-stone-900"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className={`w-full font-extrabold py-3 rounded-xl shadow-sm transition-all text-sm cursor-pointer active:scale-99 ${
                taxaEditandoId
                  ? 'bg-amber-500 hover:bg-amber-600 text-stone-950'
                  : 'bg-red-600 hover:bg-red-700 text-amber-300'
              }`}
            >
              {enviando
                ? 'Salvando...'
                : taxaEditandoId
                ? 'Salvar Alterações'
                : 'Cadastrar Taxa'}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE TAXAS FILTRADAS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-black text-stone-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">
            📍 Taxas de Entrega Cadastradas
          </span>
          <span className="text-xs bg-amber-100 text-red-800 border border-amber-300 px-2.5 py-1 rounded-full font-bold">
            {taxasFiltradas.length} de {taxas.length}{' '}
            {taxas.length === 1 ? 'bairro' : 'bairros'}
          </span>
        </h3>

        {carregando ? (
          <p className="text-xs text-stone-400 text-center py-6">
            Carregando taxas...
          </p>
        ) : taxasFiltradas.length === 0 ? (
          <p className="text-xs text-stone-400 text-center py-6">
            {busca
              ? `Nenhum bairro encontrado para "${busca}".`
              : 'Nenhuma taxa cadastrada ainda.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {taxasFiltradas.map((item) => {
              const itemId = item.id ?? item._id;
              const valorNum = Number(item.valor);

              return (
                <div
                  key={itemId}
                  className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/60 hover:bg-amber-50/40 hover:border-amber-300/70 transition-all flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="font-extrabold text-stone-900 text-sm">
                      {item.bairro}
                    </h4>
                    <span className="text-xs text-emerald-700 font-extrabold">
                      {Number.isNaN(valorNum) || valorNum === 0
                        ? 'Grátis'
                        : `R$ ${valorNum.toFixed(2)}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => iniciarEdicao(item)}
                      title="Editar bairro ou valor"
                      className="text-xs bg-white hover:bg-amber-100 text-amber-800 border border-gray-200 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      ✏️
                    </button>

                    <button
                      type="button"
                      onClick={() => excluirTaxa(itemId, item.bairro)}
                      title="Excluir taxa"
                      className="text-xs bg-white hover:bg-red-50 text-red-700 border border-gray-200 font-bold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}