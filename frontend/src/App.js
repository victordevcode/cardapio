import React, { useState, useEffect } from 'react';
import Login from './Login';
import ListagemCardapio from './ListagemCardapio';
import CadastroCardapio from './CadastroCardapio';
import QuadroKanbanPedidos from './QuadroKanbanPedidos';
import CardapioCliente from './CardapioCliente';
import GestaoTaxas from './GestaoTaxas';
import RelatorioGeral from './RelatorioGeral';
import ContaBancaria from './ContaBancaria';

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [telaAtual, setTelaAtual] = useState('listagem');
  const [menuVisivel, setMenuVisivel] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      setAutenticado(true);
    }
  }, []);

  const handleLoginSucesso = () => {
    setAutenticado(true);
    setTelaAtual('listagem');
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    setAutenticado(false);
  };

  // Se não estiver autenticado, exibe a tela de Login em qualquer ambiente (local ou Render)
  if (!autenticado) {
    return <Login aoLogar={handleLoginSucesso} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans flex flex-col justify-between">
      <div className="max-w-6xl mx-auto space-y-4 w-full">

        {/* ================= 1. CABEÇALHO FIXO COM A LOGO ================= */}
        <header className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src="logo_ju.PNG"
              alt="Logo do Lanche"
              onClick={() => setMenuVisivel(!menuVisivel)}
              onError={(e) => { e.target.src = 'https://via.placeholder.com/100'; }}
              className="w-16 h-16 object-cover rounded-full border-2 border-rose-500 shadow-md flex-shrink-0 cursor-pointer hover:opacity-85 active:scale-95 transition-all"
              title="Clique para abrir/fechar o menu"
            />
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center justify-center sm:justify-start gap-2">
                🍔 Lanches da Jú
              </h1>
              <p className="text-slate-400 text-xs font-medium">
                Painel Administrativo & Gestão de Pedidos
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-1.5 text-xs font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/20 flex items-center gap-1.5 cursor-pointer"
          >
            Sair 🚪
          </button>
        </header>

       {/* ================= 2. BOTÕES DE NAVEGAÇÃO ================= */}
        {menuVisivel && (
          <nav className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200/80 flex flex-wrap items-center justify-between gap-2 animate-fade-in">
            <div className="flex flex-wrap gap-2 items-center">
              <button
                onClick={() => setTelaAtual('listagem')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'listagem'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                📋 Produtos
              </button>

              <button
                onClick={() => setTelaAtual('cadastro')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'cadastro'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                ➕ Novo
              </button>

              <button
                onClick={() => setTelaAtual('kanban')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'kanban'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                📊 Cozinha
              </button>

              <button
                onClick={() => setTelaAtual('taxas')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'taxas'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                🛵 Taxas
              </button>

              <button
                onClick={() => setTelaAtual('relatorios')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'relatorios'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                📊 Relatórios
              </button>

              <button
                onClick={() => setTelaAtual('conta_bancaria')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                  telaAtual === 'conta_bancaria'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
                }`}
              >
                💳 Configurações de Pagamentos
              </button>
            </div>

            <button
              onClick={() => setTelaAtual('cardapio')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer ${
                telaAtual === 'cardapio'
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              📱 Cardápio Cliente
            </button>
          </nav>
        )}

        {/* ================= 3. CONTEÚDO DA TELA ATIVA ================= */}
        <main className="pt-2">
          {telaAtual === 'listagem' && <ListagemCardapio />}
          {telaAtual === 'cadastro' && <CadastroCardapio />}
          {telaAtual === 'kanban' && <QuadroKanbanPedidos />}
          {telaAtual === 'taxas' && <GestaoTaxas />}
          {telaAtual === 'cardapio' && (
            <CardapioCliente aoVoltar={() => setTelaAtual('listagem')} />
          )}
          {telaAtual === 'relatorios' && <RelatorioGeral />}
          {telaAtual === 'conta_bancaria' && <ContaBancaria />}
        </main>

      </div>

      <RodapéVersao />
    </div>
  );
}

export function RodapéVersao() {
  return (
    <footer className="w-full py-4 text-center text-xs text-gray-400 border-t border-gray-200 mt-8 bg-white/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 max-w-6xl mx-auto px-4">
        <span>Desenvolvido por <strong>Victor Hugo</strong></span>
        <span className="hidden sm:inline">•</span>
        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border border-gray-200">
          v1.0.0 — Produção
        </span>
      </div>
    </footer>
  );
}s