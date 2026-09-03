import React, { useState } from 'react';

// Se a imagem estiver em assets, descomente a linha abaixo:
// import logoImg from '../assets/logo.png'; 

export default function Login({ aoLogar }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      const res = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await res.json();

      if (!res.ok) {
        throw new Error(dados.mensagem || 'Falha ao realizar login');
      }

      localStorage.setItem('token', dados.token);
      localStorage.setItem('usuario', JSON.stringify(dados.usuario));

      aoLogar(dados.usuario);
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      fontFamily: 'sans-serif'
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1e293b',
        padding: '32px',
        paddingTop: '60px', // Espaço extra no topo para acomodar a logo flutuante
        borderRadius: '16px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        color: '#fff',
        boxSizing: 'border-box',
        position: 'relative', // Permite posicionar a logo perfeitamente
        marginTop: '60px'    // Evita colisão com o topo da página
      }}>
        
        {/* LOGO ARREDONDADA E FLUTUANTE NO TOPO */}
        <div style={{
          position: 'absolute',
          top: '-150px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '210px',
          height: '210px',
          borderRadius: '50%',
          overflow: 'hidden',
          border: '4px solid #1e293b', // Borda da mesma cor do card
          boxShadow: '0 8px 16px rgba(0,0,0,0.4)',
          backgroundColor: '#0f172a'
        }}>
          <img 
            src="/logo_Ju.png" // Mude para logoImg se estiver importando o arquivo
            alt="Lanches da Jú" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>

        <h2 style={{ textAlign: 'center', marginTop: 0, color: '#e11d48' }}>🔒 Painel Admin</h2>
        <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '14px', marginBottom: '24px' }}>
          Digite suas credenciais para acessar
        </p>

        {erro && (
          <div style={{ background: '#ef444422', border: '1px solid #ef4444', color: '#f87171', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
            {erro}
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#cbd5e1' }}>E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@hamburgueria.com"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', color: '#cbd5e1' }}>Senha</label>
          <input
            type="password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="••••••••"
            style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: '#fff', boxSizing: 'border-box' }}
          />
        </div>

        <button
          type="submit"
          disabled={carregando}
          style={{ width: '100%', padding: '12px', background: '#e11d48', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}
        >
          {carregando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}