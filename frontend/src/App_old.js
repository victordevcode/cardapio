import React, { useState, useEffect } from 'react';
import { ShoppingBag, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [produtos, setProdutos] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Busca produtos da API backend
  useEffect(() => {
    fetch('http://localhost:3000/api/produtos')
      .then((res) => res.json())
      .then((data) => {
        setProdutos(data);
        setCarregando(false);
      })
      .catch((err) => {
        console.error('Erro ao buscar produtos:', err);
        setCarregando(false);
      });
  }, []);

  const adicionarAoCarrinho = (produto) => {
    setCarrinho([...carrinho, produto]);
  };

  const removerDoCarrinho = (indexParaRemover) => {
    setCarrinho(carrinho.filter((_, index) => index !== indexParaRemover));
  };

  const valorTotal = carrinho.reduce((acc, item) => acc + Number(item.preco), 0);

  // Estilos
  const pageStyle = {
    fontFamily: 'sans-serif',
    backgroundColor: '#f8f9fa',
    minHeight: '100vh',
    padding: '20px'
  };

  const headerStyle = {
    backgroundColor: '#e63946',
    color: '#fff',
    padding: '20px',
    borderRadius: '12px',
    textAlign: 'center',
    marginBottom: '24px'
  };

  const asideStyle = {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    height: 'fit-content'
  };

  return (
    <div style={pageStyle}>
      {/* Cabeçalho */}
      <header style={headerStyle}>
        <h1 style={{ margin: 0, fontSize: '28px' }}>🍽️ Cardápio Digital</h1>
        <p style={{ margin: '8px 0 0', opacity: 0.9 }}>Escolha seus itens e faça seu pedido online</p>
      </header>

      {/* Conteúdo Principal */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Seção de Produtos */}
        <section>
          <h2 style={{ color: '#1d3557', borderBottom: '2px solid #e63946', paddingBottom: '8px' }}>Produtos</h2>
          
          {carregando ? (
            <p>Carregando produtos...</p>
          ) : produtos.length === 0 ? (
            <p style={{ color: '#6c757d' }}>Nenhum produto cadastrado no momento.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px', marginTop: '16px' }}>
              {produtos.map((produto) => (
                <div key={produto.id} style={{ backgroundColor: '#fff', padding: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ margin: '0 0 8px 0', color: '#1d3557' }}>{produto.nome}</h3>
                    <p style={{ color: '#6c757d', fontSize: '14px', margin: '0 0 16px 0' }}>{produto.descricao}</p>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#2a9d8f', fontSize: '18px' }}>
                      R$ {Number(produto.preco).toFixed(2)}
                    </span>
                    <button 
                      onClick={() => adicionarAoCarrinho(produto)}
                      style={{ backgroundColor: '#e63946', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={16} /> Adicionar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Resumo do Pedido / Carrinho */}
        <aside style={asideStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '16px' }}>
            <ShoppingBag color="#e63946" />
            <h2 style={{ margin: 0, fontSize: '20px', color: '#1d3557' }}>Seu Pedido</h2>
          </div>

          {carrinho.length === 0 ? (
            <p style={{ color: '#a8a29e', textAlign: 'center', margin: '24px 0' }}>Seu carrinho está vazio.</p>
          ) : (
            <div>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {carrinho.map((item, index) => (
                  <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: '14px' }}>{item.nome}</p>
                      <span style={{ fontSize: '12px', color: '#6c757d' }}>R$ {Number(item.preco).toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => removerDoCarrinho(index)}
                      style={{ background: 'none', border: 'none', color: '#e63946', cursor: 'pointer' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '2px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '18px', marginBottom: '16px' }}>
                  <span>Total:</span>
                  <span style={{ color: '#2a9d8f' }}>R$ {valorTotal.toFixed(2)}</span>
                </div>

                <button 
                  onClick={() => alert('Pedido enviado com sucesso!')}
                  style={{ width: '100%', backgroundColor: '#2a9d8f', color: '#fff', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <CheckCircle2 size={18} /> Finalizar Pedido
                </button>
              </div>
            </div>
          )}
        </aside>

      </div>
    </div>
  );
}