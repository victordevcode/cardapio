import React, { useState, useEffect } from 'react';

function Admin() {
  // Lista de pedidos padrão (mock) para garantir que a tela nunca fique quebrada
  const [pedidos, setPedidos] = useState([
    { id: 1, cliente: "João Silva", mesa: "Mesa 04", itens: ["1x Burger Artesanal", "1x Coca-Cola"], total: 38.00, status: "pendente" },
    { id: 2, cliente: "Maria Oliveira", mesa: "Mesa 02", itens: ["1x Pizza Margherita"], total: 45.00, status: "em_preparo" },
    { id: 3, cliente: "Carlos Souza", mesa: "Mesa 10", itens: ["2x Suco de Laranja"], total: 18.00, status: "pronto" }
  ]);

  // Função para buscar pedidos reais do Backend na porta 3000
  const carregarPedidosDoBackend = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/pedidos');
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0) {
        // Normaliza a estrutura para garantir que os campos estejam sempre preenchidos
        const pedidosFormatados = data.map(p => ({
          id: p.id || p._id,
          cliente: p.cliente || p.cliente_nome || p.nomeCliente || "Cliente Sem Nome",
          mesa: p.mesa || p.mesa_numero || "Balcão",
          status: (p.status || "pendente").toLowerCase(),
          total: Number(p.total || p.valor_total || p.valor || 0),
          itens: Array.isArray(p.itens)
            ? p.itens.map(item => typeof item === 'string' ? item : `${item.quantidade || 1}x ${item.nome || item.produto_nome || 'Item'}`)
            : ["1x Pedido sem itens detalhados"]
        }));

        setPedidos(pedidosFormatados);
      }
    } catch (err) {
      console.warn("⚠️ Não foi possível conectar ao backend na porta 3000. Exibindo dados de teste.", err);
    }
  };

  useEffect(() => {
    carregarPedidosDoBackend();
  }, []);

  // Função para mover o pedido de status (Atualiza na tela e tenta atualizar no backend)
  const alterarStatus = async (id, novoStatus) => {
    // 1. Atualização imediata na tela (Interface rápida)
    setPedidos(prev => prev.map(ped => ped.id === id ? { ...ped, status: novoStatus } : ped));

    // 2. Envio da atualização para a API Backend
    try {
      await fetch(`http://localhost:3000/api/pedidos/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: novoStatus })
      });
    } catch (err) {
      console.error("Erro ao atualizar o status no servidor:", err);
    }
  };

  // Função drag and drop (arrastar card)
  const handleDragStart = (e, id) => {
    e.dataTransfer.setData('pedidoId', id.toString());
  };

  const handleDragOver = (e) => e.preventDefault();

  const handleDrop = (e, novoStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('pedidoId');
    if (id) {
      alterarStatus(Number(id) || id, novoStatus);
    }
  };

  const renderColuna = (titulo, statusFiltro, corHeader, proximoStatus, textoBotao) => {
    const pedidosFiltrados = pedidos.filter(p => p.status === statusFiltro);

    return (
      <div 
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, statusFiltro)}
        style={{ flex: 1, backgroundColor: '#f3f4f6', borderRadius: '8px', padding: '16px', minWidth: '280px', minHeight: '450px' }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: `4px solid ${corHeader}`, paddingBottom: '8px', marginBottom: '16px' }}>
          {titulo} ({pedidosFiltrados.length})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {pedidosFiltrados.map(pedido => (
            <div 
              key={pedido.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, pedido.id)}
              style={{ backgroundColor: '#fff', borderRadius: '6px', padding: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'grab' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                <span>Pedido #{pedido.id}</span>
                <span style={{ color: '#6b7280' }}>{pedido.mesa}</span>
              </div>
              
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#374151' }}>
                <strong>Cliente:</strong> {pedido.cliente}
              </p>
              
              <ul style={{ paddingLeft: '20px', margin: '8px 0', fontSize: '14px' }}>
                {pedido.itens.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #eee' }}>
                <span style={{ fontWeight: 'bold', color: '#059669' }}>
                  R$ {Number(pedido.total).toFixed(2)}
                </span>
                
                {proximoStatus && (
                  <button 
                    onClick={() => alterarStatus(pedido.id, proximoStatus)}
                    style={{ backgroundColor: corHeader, color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                  >
                    {textoBotao}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>👨‍🍳 Gestão de Pedidos - Cozinha</h1>
      
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {renderColuna("📥 Pendentes", "pendente", "#ef4444", "em_preparo", "Iniciar Preparo ➡️")}
        {renderColuna("🔥 Em Preparo", "em_preparo", "#f59e0b", "pronto", "Concluir Pedido ➡️")}
        {renderColuna("✅ Prontos", "pronto", "#10b981", null, null)}
      </div>
    </div>
  );
}

export default Admin;