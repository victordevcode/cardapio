import React, { useState } from 'react';
import Login from './Login';
import Admin from './Admin';
import CadastroCardapio from './CadastroCardapio';

function App() {
  const [logado, setLogado] = useState(localStorage.getItem('admin_logado') === 'true');
  const [abaAtiva, setAbaAtiva] = useState('kanban'); // 'kanban' ou 'cadastro'

  const handleLogout = () => {
    localStorage.removeItem('admin_logado');
    setLogado(false);
  };

  // Se não estiver logado, exibe a tela de Login
  if (!logado) {
    return <Login onLoginSuccess={() => setLogado(true)} />;
  }

  return (
    <div>
      {/* Barra Superior Administrativa */}
      <header style={{ backgroundColor: '#1f2937', color: '#fff', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <h1 style={{ fontSize: '20px', margin: 0 }}>⚙️ Painel de Gestão</h1>
          <nav style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => setAbaAtiva('kanban')}
              style={{ backgroundColor: abaAtiva === 'kanban' ? '#374151' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              📋 Quadro de Pedidos
            </button>
            <button 
              onClick={() => setAbaAtiva('cadastro')}
              style={{ backgroundColor: abaAtiva === 'cadastro' ? '#374151' : 'transparent', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              🍔 Cadastrar Cardápio
            </button>
          </nav>
        </div>

        <button 
          onClick={handleLogout}
          style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Sair 🚪
        </button>
      </header>

      {/* Conteúdo da Tela Selecionada */}
      <main>
        {abaAtiva === 'kanban' && <Admin />}
        {abaAtiva === 'cadastro' && <CadastroCardapio aoVoltar={() => setAbaAtiva('kanban')} />}
      </main>
    </div>
  );
}

export default App;