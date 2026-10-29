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
      const res = await fetch('http://localhost:3000/api/taxas-entrega');
      if (!res.ok) throw new Error('Erro ao buscar taxas');
      const dados = await res.json();
      setTaxas(dados);
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

  const iniciarEdicao = (taxa) => {
    setTaxaEditandoId(taxa.id);
    setBairro(taxa.bairro);
    setValor(taxa.valor);
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const url = taxaEditandoId
        ? `http://localhost:3000/api/taxas-entrega/${taxaEditandoId}`
        : 'http://localhost:3000/api/taxas-entrega';

      const method = taxaEditandoId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ bairro, valor })
      });

      if (!res.ok) throw new Error('Erro ao salvar taxa');

      alert(taxaEditandoId ? '✏️ Taxa atualizada!' : '✅ Taxa cadastrada!');
      limparFormulario();
      buscarTaxas();
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
      const res = await fetch(`http://localhost:3000/api/taxas-entrega/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao excluir');

      alert('🗑️ Taxa removida com sucesso!');
      buscarTaxas();
    } catch (err) {
      alert('❌ Não foi possível excluir a taxa.');
    }
  };

  // Filtra as taxas de acordo com o nome do bairro buscado
  const taxasFiltradas = taxas.filter((item) =>
    (item.bairro || '').toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto font-sans space-y-6">
      
      {/* BARRA SUPERIOR COM BOTÃO E INPUT DE BUSCA */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (mostrarFormulario) limparFormulario();
            else setMostrarFormulario(true);
          }}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2 text-sm cursor-pointer active:scale-95"
        >
          {mostrarFormulario ? '✕ Fechar Formulário' : '🛵 Nova Taxa de Bairro'}
        </button>

        {/* Campo de Busca por Bairro */}
        <div className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="🔍 Buscar bairro..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none shadow-xs"
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* FORMULÁRIO RETRÁTIL */}
      {mostrarFormulario && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm transition-all">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {taxaEditandoId ? '✏️ Editar Taxa de Entrega' : '🛵 Cadastrar Taxa por Bairro'}
            </h2>
            <button
              type="button"
              onClick={limparFormulario}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold px-3 py-1.5 rounded-lg transition-all"
            >
              ✕ Cancelar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nome do Bairro / Região*
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Centro, Vila Nova, Zona Sul..."
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Valor da Entrega (R$)*
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00 (0 para Grátis)"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="w-full p-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none bg-gray-50/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={enviando}
              className={`w-full font-bold py-3 rounded-xl shadow-sm transition-all text-sm text-white cursor-pointer ${
                taxaEditandoId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {enviando ? 'Salvando...' : taxaEditandoId ? 'Salvar Alterações' : 'Cadastrar Taxa'}
            </button>
          </form>
        </div>
      )}

      {/* LISTA DE TAXAS FILTRADAS */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2">📍 Taxas de Entrega Cadastradas</span>
          <span className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-semibold">
            {taxasFiltradas.length} de {taxas.length} {taxas.length === 1 ? 'bairro' : 'bairros'}
          </span>
        </h3>

        {carregando ? (
          <p className="text-xs text-gray-400 text-center py-6">Carregando taxas...</p>
        ) : taxasFiltradas.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-6">
            {busca ? `Nenhum bairro encontrado para "${busca}".` : 'Nenhuma taxa cadastrada ainda.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {taxasFiltradas.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-gray-200/80 bg-gray-50/50 flex items-center justify-between gap-3"
              >
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{item.bairro}</h4>
                  <span className="text-xs text-emerald-600 font-extrabold">
                    {Number(item.valor) === 0 ? 'Grátis' : `R$ ${Number(item.valor).toFixed(2)}`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => iniciarEdicao(item)}
                    className="text-xs bg-white hover:bg-amber-50 text-amber-700 border border-gray-200 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    ✏️
                  </button>

                  <button
                    type="button"
                    onClick={() => excluirTaxa(item.id, item.bairro)}
                    className="text-xs bg-white hover:bg-rose-50 text-rose-600 border border-gray-200 font-bold px-2 py-1 rounded-lg transition-all cursor-pointer"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}