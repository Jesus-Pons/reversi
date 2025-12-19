import React, { useState, useEffect } from 'react';
// Importamos tipos del SDK si es necesario, o los definimos localmente alineados
import type { AIHeuristic } from '../../client/types.gen';

// Usamos strings literales que coincidan con el backend
export type AlgorithmType = 'random' | 'alphabeta' | 'montecarlo' | 'qlearning';

export interface AIConfigInput {
  algorithm: AlgorithmType;
  heuristic?: AIHeuristic; // Usamos el tipo del SDK
  // Parametros sueltos que luego se agruparán
  depth?: number;
  iterations?: number;
  epsilon?: number;
}

interface AIParamsSelectorProps {
  onChange: (config: AIConfigInput) => void;
}

export const AIParamsSelector: React.FC<AIParamsSelectorProps> = ({ onChange }) => {
  // Por defecto alphabeta
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('alphabeta');
  const [heuristic, setHeuristic] = useState<AIHeuristic>('static_weights');
  
  // Parámetros
  const [depth, setDepth] = useState<number>(4);
  const [iterations, setIterations] = useState<number>(1000);
  const [epsilon, setEpsilon] = useState<number>(0.1);

  useEffect(() => {
    // Construimos el objeto base
    const config: AIConfigInput = {
      algorithm,
      heuristic: algorithm !== 'random' ? heuristic : 'none',
    };

    // Asignamos solo las props relevantes según el algoritmo
    if (algorithm === 'alphabeta') {
      config.depth = depth;
    } else if (algorithm === 'montecarlo') {
      config.iterations = iterations;
    } else if (algorithm === 'qlearning') {
      config.epsilon = epsilon;
    }

    onChange(config);
  }, [algorithm, heuristic, depth, iterations, epsilon, onChange]);

  return (
    <div className="flex flex-col gap-4 p-5 bg-gray-800 rounded-xl border border-gray-700 shadow-lg text-white w-full max-w-md">
      <h3 className="text-lg font-bold text-amber-400 border-b border-gray-700 pb-2 mb-1">
        Configuración del Bot
      </h3>
      
      {/* Selector de Algoritmo - VALUES CORREGIDOS */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Algoritmo</label>
        <select
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value as AlgorithmType)}
          className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
        >
          <option value="random">Aleatorio (Random)</option>
          <option value="alphabeta">Alpha-Beta (Minimax)</option>
          <option value="montecarlo">Monte Carlo (MCTS)</option>
          <option value="qlearning">Q-Learning</option>
        </select>
      </div>

      {/* Selector de Heurística - VALUES CORREGIDOS según types.gen.ts */}
      {algorithm !== 'random' && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-300">Heurística</label>
          <select
            value={heuristic}
            onChange={(e) => setHeuristic(e.target.value as AIHeuristic)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          >
            <option value="static_weights">Pesos Estáticos</option>
            <option value="mobility_based">Basada en Movilidad</option>
            <option value="hybrid">Híbrida</option>
            <option value="greedy_rollout">Greedy Rollout (MCTS)</option>
            <option value="random_rollout">Random Rollout (MCTS)</option>
          </select>
        </div>
      )}

      {/* ... (Los inputs numéricos estaban bien, se mantienen igual) ... */}
      {algorithm === 'alphabeta' && (
        <div className="flex flex-col gap-1.5 animate-fade-in">
          <label className="text-sm font-medium text-gray-300">Profundidad (Depth)</label>
          <input
            type="number"
            min="1"
            max="8"
            value={depth}
            onChange={(e) => setDepth(Math.max(1, parseInt(e.target.value) || 1))}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      )}
      
      {/* (Mantén el resto de inputs para montecarlo y qlearning igual que antes) */}
    </div>
  );
};