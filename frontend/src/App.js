import React, { useState, useEffect } from 'react';
import Login from './Login';
import ListagemCardapio from './ListagemCardapio';
import CadastroCardapio from './CadastroCardapio';
import QuadroKanbanPedidos from './QuadroKanbanPedidos';
import CardapioCliente from './CardapioCliente';

export default function App() {
  const [autenticado, setAutenticado] = useState(false);
  const [telaAtual, setTelaAtual] = useState('listagem');

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

  if (!autenticado) {
    return <Login aoLogar={handleLoginSucesso} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* ================= 1. CABEÇALHO FIXO COM A LOGO ================= */}
        <header className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white p-4 shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img 
              src="logo_ju.PNG" 
              alt="Logo do Lanche" 
              onError={(e) => { e.target.src = 'https://via.placeholder.com/100'; }} 
              className="w-16 h-16 object-cover rounded-full border-2 border-rose-500 shadow-md flex-shrink-0"
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
            className="px-3 py-1.5 text-xs font-bold bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all border border-red-500/20 flex items-center gap-1.5"
          >
            Sair🚪
          </button>
        </header>

        {/* ================= 2. BOTÕES DE NAVEGAÇÃO (ABAIXO DO BANNER) ================= */}
        <nav className="bg-white p-2.5 rounded-xl shadow-sm border border-gray-200/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTelaAtual('listagem')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                telaAtual === 'listagem'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              📋 Produtos
            </button>

            <button
              onClick={() => setTelaAtual('cadastro')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                telaAtual === 'cadastro'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              ➕ Novo
            </button>

            <button
              onClick={() => setTelaAtual('kanban')}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                telaAtual === 'kanban'
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200/60'
              }`}
            >
              📊 Cozinha
            </button>
          </div>

          {/* Botão de abrir/ver o cardápio */}
          <button
            onClick={() => setTelaAtual('cardapio')}
            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${
              telaAtual === 'cardapio'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            📱 
          </button>
        </nav>

        {/* ================= 3. CONTEÚDO DA TELA ATIVA ================= */}
        <main className="pt-2">
          {telaAtual === 'listagem' && <ListagemCardapio />}
          {telaAtual === 'cadastro' && <CadastroCardapio />}
          {telaAtual === 'kanban' && <QuadroKanbanPedidos />}
          {telaAtual === 'cardapio' && (
            <CardapioCliente aoVoltar={() => setTelaAtual('listagem')} />
          )}
        </main>

      </div>
    </div>
  );
}