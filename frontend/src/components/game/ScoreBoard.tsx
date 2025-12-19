import React from 'react';
import { Disc } from './Disc';

interface ScoreBoardProps {
  scoreBlack: number;
  scoreWhite: number;
  currentTurn: 'black' | 'white';
}

export const ScoreBoard: React.FC<ScoreBoardProps> = ({
  scoreBlack,
  scoreWhite,
  currentTurn,
}) => {
  return (
    <div className="flex items-center justify-center gap-8 mb-8">
      {/* Tarjeta Jugador Negro */}
      <div
        className={`flex flex-col items-center p-4 rounded-xl shadow-xl transition-all duration-300 w-32 border-2 ${
          currentTurn === 'black'
            ? 'bg-gray-900 border-yellow-400 scale-110 ring-4 ring-yellow-400/50 z-10'
            : 'bg-gray-800 border-gray-700 opacity-70 scale-95'
        }`}
      >
        <div className="mb-2"><Disc color="black" /></div>
        <span className="text-gray-200 font-bold text-lg uppercase tracking-wider">Negras</span>
        <span className="text-white text-4xl font-black mt-1">{scoreBlack}</span>
      </div>

      {/* Tarjeta Jugador Blanco */}
      <div
        className={`flex flex-col items-center p-4 rounded-xl shadow-xl transition-all duration-300 w-32 border-2 ${
          currentTurn === 'white'
            ? 'bg-white border-yellow-400 scale-110 ring-4 ring-yellow-400/50 z-10'
            : 'bg-gray-100 border-gray-300 opacity-70 scale-95'
        }`}
      >
        <div className="mb-2"><Disc color="white" /></div>
        <span className="text-gray-600 font-bold text-lg uppercase tracking-wider">Blancas</span>
        <span className="text-gray-900 text-4xl font-black mt-1">{scoreWhite}</span>
      </div>
    </div>
  );
};