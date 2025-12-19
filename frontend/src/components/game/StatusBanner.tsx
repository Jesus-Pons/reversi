import React from 'react';

interface StatusBannerProps {
  winner: 'black' | 'white' | 'draw' | null;
  onRestart?: () => void;
  // Ya no usamos 'message' aquí
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ winner, onRestart }) => {
  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-500">
      <div className="bg-white text-gray-900 p-8 rounded-3xl shadow-2xl text-center border-4 border-amber-400 max-w-md w-full animate-in zoom-in-95 duration-300">
        <h2 className="text-5xl font-black uppercase tracking-widest mb-2 text-amber-500 drop-shadow-sm">
          {winner === 'draw' ? '¡Empate!' : `¡${winner === 'black' ? 'Negras' : 'Blancas'}!`}
        </h2>
        <h3 className="text-2xl font-bold text-gray-800 mb-6 uppercase">Ganan la partida</h3>
        
        {onRestart && (
          <button 
            onClick={onRestart}
            className="w-full px-6 py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-gray-800 transition-all active:scale-95 shadow-xl text-lg flex items-center justify-center gap-2"
          >
            Jugar de nuevo
          </button>
        )}
      </div>
    </div>
  );
};