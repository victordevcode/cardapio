import React, { useState, useEffect } from 'react';

export function PedidoTimer({ createdAt }) {
  const [tempoDecorrido, setTempoDecorrido] = useState('');

  useEffect(() => {
    const calcularTempo = () => {
      if (!createdAt) return;
      
      const inicio = new Date(createdAt).getTime();
      const agora = new Date().getTime();
      const diferenca = Math.max(0, agora - inicio);

      const minutos = Math.floor((diferenca % (1000 * 60 * 60)) / (1000 * 60));
      const segundos = Math.floor((diferenca % (1000 * 60)) / 1000);

      const formatMin = String(minutos).padStart(2, '0');
      const formatSec = String(segundos).padStart(2, '0');

      setTempoDecorrido(`${formatMin}:${formatSec}`);
    };

    calcularTempo();
    const timerId = setInterval(calcularTempo, 1000);

    return () => clearInterval(timerId);
  }, [createdAt]);

  const [min] = tempoDecorrido ? tempoDecorrido.split(':').map(Number) : [0];
  const alerta = min >= 15;

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold shadow-sm ${
      alerta 
        ? 'bg-rose-100 text-rose-700' 
        : 'bg-gray-100 text-gray-700'
    }`}>
      ⏱️ {tempoDecorrido || '00:00'}
    </span>
  );
}