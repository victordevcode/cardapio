import React, { useState } from 'react';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();

    // Validação simples (pode alterar conforme suas credenciais desejadas)
    if (email === 'admin@restaurante.com' && senha === '123456') {
      localStorage.setItem('admin_logado', 'true');
      setErro('');
      
      // Verifica se a função existe antes de chamar
      if (typeof onLoginSuccess === 'function') {
        onLoginSuccess();
      }
    } else {
      setErro('E-mail ou senha incorretos.');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '80px auto', padding: '24px', backgroundColor: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontFamily: 'sans-serif' }}>
      <h2 style={{ textAlign: 'center', marginBottom: '20px' }}>🔒 Acesso Administrativo</h2>
      
      {erro && (
        <div style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>
          {erro}
        </div>
      )}

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>E-mail</label>
          <input 
            type="email" 
            required 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@restaurante.com"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Senha</label>
          <input 
            type="password" 
            required 
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="******"
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
        </div>

        <button 
          type="submit" 
          style={{ backgroundColor: '#2563eb', color: '#fff', padding: '12px', border: 'none', borderRadius: '6px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}
        >
          Entrar no Painel
        </button>
      </form>
    </div>
  );
}

export default Login;