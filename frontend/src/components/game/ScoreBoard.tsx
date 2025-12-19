import React from 'react';
import { Loader2, Swords } from 'lucide-react'; // Importamos iconos
import { Disc } from './Disc';

interface ScoreBoardProps {
  scoreBlack: number;
  scoreWhite: number;
  currentTurn: 'black' | 'white';
  message: string | null; // <--- Nueva prop
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scoreBlack,
  scoreWhite,
  currentTurn,
  message,
}) => {
  return (
    <div className="flex items-center justify-center gap-4 sm:gap-8 mb-6 w-full max-w-2xl px-4">
      
      {/* --- JUGADOR NEGRO --- */}
      <div
        className={`flex flex-col items-center p-3 sm:p-4 rounded-xl shadow-xl transition-all duration-300 w-28 sm:w-32 border-2 ${
          currentTurn === 'black'
            ? 'bg-gray-900 border-yellow-400 scale-105 ring-4 ring-yellow-400/30 z-10'
            : 'bg-gray-800 border-gray-700 opacity-80 scale-95'
        }`}
      >
        <div className="mb-2 w-8 h-8 sm:w-10 sm:h-10"><Disc color="black" /></div>
        <span className="text-gray-200 font-bold text-xs sm:text-sm uppercase tracking-wider">Negras</span>
        <span className="text-white text-3xl sm:text-4xl font-black mt-1">{scoreBlack}</span>
      </div>

      {/* --- ZONA CENTRAL (MENSAJES) --- */}
      <div className="flex-1 flex flex-col items-center justify-center min-w-[120px] h-20">
        {message ? (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            {message.includes('Pensando') ? (
              <Loader2 className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400 animate-spin mb-1" />
            ) : (
              <Swords className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400 mb-1" />
            )}
            <span className="text-xs sm:text-sm font-bold text-center text-gray-300 leading-tight">
              {message}
            </span>
          </div>
        ) : (
          /* Estado "Idle" (VS) cuando no hay mensaje específico */
          <div className="text-gray-600 font-black text-2xl opacity-20 select-none">
            VS
          </div>
        )}
      </div>

      {/* --- JUGADOR BLANCO --- */}
      <div
        className={`flex flex-col items-center p-3 sm:p-4 rounded-xl shadow-xl transition-all duration-300 w-28 sm:w-32 border-2 ${
          currentTurn === 'white'
            ? 'bg-white border-yellow-400 scale-105 ring-4 ring-yellow-400/30 z-10'
            : 'bg-gray-200 border-gray-300 opacity-80 scale-95'
        }`}
      >
        <div className="mb-2 w-8 h-8 sm:w-10 sm:h-10"><Disc color="white" /></div>
        <span className="text-gray-600 font-bold text-xs sm:text-sm uppercase tracking-wider">Blancas</span>
        <span className="text-gray-900 text-3xl sm:text-4xl font-black mt-1">{scoreWhite}</span>
      </div>

    </div>
  );
};