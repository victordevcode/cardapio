import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './Login';
import ListagemCardapio from './ListagemCardapio';
import CadastroCardapio from './CadastroCardapio';
import QuadroKanbanPedidos from './QuadroKanbanPedidos';
import CardapioCliente from './CardapioCliente';
import GestaoTaxas from './GestaoTaxas';
import RelatorioGeral from './RelatorioGeral';
import ContaBancaria from './ContaBancaria';

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Rota pública do cliente - abre direto sem pedir login */}
        <Route path="/cardapio" element={<CardapioCliente />} />
        
        {/* Raiz redirecionando para o cardápio do cliente */}
        <Route path="/" element={<Navigate to="/cardapio" replace />} />

        {/* Rotas administrativas protegidas */}
        <Route path="/admin" element={<PainelAdminRoute />} />
      </Routes>
    </Router>
  );
}

// Componente para verificar a autenticação antes de abrir o painel do admin
function PainelAdminRoute() {
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      setAutenticado(true);
    }
  }, []);

  if (!autenticado) {
    return <Login aoLogar={() => setAutenticado(true)} />;
  }

  return <PainelAdminContainer />;
}

// Seu painel administrativo completo que você já usava
function PainelAdminContainer() {
  const [telaAtual, setTelaAtual] = useState('listagem');
  // eslint-disable-next-line no-unused-vars
  const [menuVisivel, setMenuVisivel] = useState(true);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    window.location.reload(); // Recarrega para voltar à tela de login
  };

  return (
    <div className="min-h-screen bg-gray-50 text-stone-900 p-4 font-sans flex flex-col justify-between">
      <div className="max-w-6xl mx-auto space-y-4 w-full">

        {/* ================= 1. CABEÇALHO FIXO COM A LOGO ================= */}
        <header className="bg-gradient-to-r from-neutral-900 via-red-950 to-neutral-900 rounded-2xl text-white p-4 shadow-md border border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div 
              onClick={() => setMenuVisivel(!menuVisivel)}
              className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-400 shadow-md cursor-pointer hover:scale-105 transition-transform shrink-0"
              title="Clique para alternar o menu"
            >
              <img 
                src="https://kibexqwtcypwaldgsnba.supabase.co/storage/v1/object/public/Produtos/logo_ju.png" 
                alt="Lanches da Jú" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="text-center sm:text-left">
              <h1 className="text-2xl font-extrabold tracking-tight flex items-center justify-center sm:justify-start gap-2 text-amber-400">
                🍔 Lanches da Jú
              </h1>
              <p className="text-stone-300 text-xs font-medium">
                Painel Administrativo &amp; Gestão de Pedidos
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 text-xs font-bold bg-red-500/15 hover:bg-red-600 text-red-200 hover:text-white rounded-xl transition-all border border-red-400/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
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
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'listagem'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                📋 Produtos
              </button>

              <button
                onClick={() => setTelaAtual('cadastro')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'cadastro'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                ➕ Novo
              </button>

              <button
                onClick={() => setTelaAtual('kanban')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'kanban'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                📊 Cozinha
              </button>

              <button
                onClick={() => setTelaAtual('taxas')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'taxas'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                🛵 Taxas
              </button>

              <button
                onClick={() => setTelaAtual('relatorios')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'relatorios'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                📊 Relatórios
              </button>

              <button
                onClick={() => setTelaAtual('conta_bancaria')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all cursor-pointer active:scale-95 ${
                  telaAtual === 'conta_bancaria'
                    ? 'bg-red-600 text-amber-300 shadow-sm'
                    : 'bg-gray-50 text-stone-700 hover:bg-amber-50 hover:text-stone-900 border border-gray-200/70'
                }`}
              >
                💳 Configurações de Pagamentos
              </button>
            </div>

            <button
              onClick={() => window.open('/cardapio', '_blank')}
              className="px-4 py-2 text-sm font-extrabold rounded-lg transition-all cursor-pointer active:scale-95 bg-amber-100 text-red-800 hover:bg-amber-200 border border-amber-300"
            >
              📱 Ver Cardápio (Cliente)
            </button>
          </nav>
        )}

        {/* ================= 3. CONTEÚDO DA TELA ATIVA ================= */}
        <main className="pt-2">
          {telaAtual === 'listagem' && <ListagemCardapio />}
          {telaAtual === 'cadastro' && <CadastroCardapio />}
          {telaAtual === 'kanban' && <QuadroKanbanPedidos />}
          {telaAtual === 'taxas' && <GestaoTaxas />}
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
    <footer className="w-full py-4 text-center text-xs text-gray-500 border-t border-gray-200 mt-8 bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-4 max-w-6xl mx-auto px-4">
        <span>Desenvolvido por <strong className="text-red-700">Victor Hugo</strong></span>
        <span className="hidden sm:inline">•</span>
        <span className="bg-amber-50 text-red-800 px-2.5 py-0.5 rounded-md font-mono text-[11px] font-semibold border border-amber-200">
          v1.0.0 — Produção
        </span>
      </div>
    </footer>
  );
}