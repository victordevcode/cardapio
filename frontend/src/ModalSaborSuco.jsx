import React, { useState, useEffect } from 'react';

export function ModalSaborSuco({ isOpen, onClose, produto, onAdicionarAoCarrinho }) {
  const [sabores, setSabores] = useState([]);
  const [saborSelecionado, setSaborSelecionado] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);

  // Busca os sabores ativos no backend quando o modal é aberto
  useEffect(() => {
    if (isOpen) {
      setCarregando(true);
      fetch('/api/sabores-suco')
        .then((res) => res.json())
        .then((data) => {
          setSabores(data);
          setCarregando(false);
        })
        .catch((err) => {
          console.error('Erro ao buscar sabores de suco:', err);
          setCarregando(false);
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirmar = () => {
    if (!saborSelecionado) {
      setErro('Por favor, escolha um sabor.');
      return;
    }

    // Adiciona ao carrinho o produto base junto com o sabor escolhido
    onAdicionarAoCarrinho({
      ...produto,
      observacao: `Sabor: ${saborSelecionado}`
    });

    // Limpa e fecha o modal
    setSaborSelecionado('');
    setErro('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Escolha o sabor do {produto?.nome || 'Suco'}
        </h3>
        <p className="text-sm text-gray-600 mb-4">Selecione uma opção abaixo:</p>

        {carregando ? (
          <p className="text-sm text-gray-500 py-4 text-center">Carregando sabores...</p>
        ) : (
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {sabores.map((item) => (
              <label 
                key={item.id} 
                className="flex items-center space-x-3 p-2 rounded border hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="radio"
                  name="saborSuco"
                  value={item.sabor}
                  checked={saborSelecionado === item.sabor}
                  onChange={(e) => {
                    setSaborSelecionado(e.target.value);
                    setErro('');
                  }}
                  className="text-orange-600 focus:ring-orange-500"
                />
                <span className="text-gray-800 font-medium">{item.sabor}</span>
              </label>
            ))}
          </div>
        )}

        {erro && <p className="text-rose-600 text-sm mb-3">{erro}</p>}

        <div className="flex justify-end space-x-2">
          <button
            onClick={() => {
              setSaborSelecionado('');
              setErro('');
              onClose();
            }}
            className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100 font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={carregando}
            className="px-4 py-2 rounded bg-orange-600 text-white hover:bg-orange-700 font-medium disabled:opacity-50"
          >
            Adicionar ao Carrinho
          </button>
        </div>
      </div>
    </div>
  );
}