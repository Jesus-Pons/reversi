import React from 'react';

interface StatusBannerProps {
  winner: 'black' | 'white' | 'draw' | null;
  message: string | null;
  onRestart?: () => void;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({ winner, message, onRestart }) => {
  if (!winner && !message) return null;

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg px-4 pointer-events-none flex flex-col items-center gap-4">
      
      {/* Banner de Ganador */}
      {winner && (
        <div className="bg-amber-500 text-white p-8 rounded-2xl shadow-2xl text-center border-4 border-amber-300 pointer-events-auto animate-bounce">
          <h2 className="text-4xl font-black uppercase tracking-widest drop-shadow-md mb-2">
            {winner === 'draw' ? '¡Empate!' : `¡Ganan las ${winner === 'black' ? 'Negras' : 'Blancas'}!`}
          </h2>
          <p className="text-amber-100 font-semibold text-lg">Juego terminado</p>
          {onRestart && (
            <button 
              onClick={onRestart}
              className="mt-6 px-6 py-2 bg-white text-amber-600 font-bold rounded-full hover:bg-amber-50 transition-colors shadow-md"
            >
              Jugar de nuevo
            </button>
          )}
        </div>
      )}

      {/* Mensaje de Estado (ej: Pasar turno) */}
      {!winner && message && (
        <div className="bg-blue-600/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-lg text-center border border-blue-400 pointer-events-auto animate-pulse">
          <p className="text-xl font-bold tracking-wide">{message}</p>
        </div>
      )}
    </div>
  );
};