import React, { useState, useEffect } from 'react';
import type { AIHeuristic } from '../../client/types.gen';

export type AlgorithmType = 'random' | 'alphabeta' | 'montecarlo';

export interface AIConfigInput {
  algorithm: AlgorithmType;
  heuristic?: AIHeuristic | 'none';
  depth?: number;
  iterations?: number;
  time_limit?: number;
}

interface AIParamsSelectorProps {
  onChange: (config: AIConfigInput) => void;
}

export const AIParamsSelector: React.FC<AIParamsSelectorProps> = ({ onChange }) => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('alphabeta');
  const [heuristic, setHeuristic] = useState<string>('static_weights');
  
  const [depth, setDepth] = useState<number>(4);
  const [iterations, setIterations] = useState<number>(1000);
  const [timeLimit, setTimeLimit] = useState<number>(4.5);

  const handleAlgorithmChange = (newAlgo: AlgorithmType) => {
    setAlgorithm(newAlgo);

    if (newAlgo === 'alphabeta' && heuristic === 'none') {
      setHeuristic('static_weights');
    }
  };

  useEffect(() => {
    const config: AIConfigInput = {
      algorithm,
      heuristic: algorithm === 'random' ? 'none' : (heuristic as AIHeuristic),
    };

    if (algorithm === 'alphabeta') {
      config.depth = depth;
    } else if (algorithm === 'montecarlo') {
      config.iterations = iterations;
      config.time_limit = timeLimit;
    }

    onChange(config);
  }, [algorithm, heuristic, depth, iterations, timeLimit, onChange]);

  return (
    <div className="flex flex-col gap-4 p-5 bg-gray-800 rounded-xl border border-gray-700 shadow-lg text-white w-full max-w-md">
      
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-gray-300">Algoritmo</label>
        <select
          value={algorithm}
          onChange={(e) => handleAlgorithmChange(e.target.value as AlgorithmType)}
          className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
        >
          <option value="random">Aleatorio (Random)</option>
          <option value="alphabeta">Alpha-Beta (Minimax)</option>
          <option value="montecarlo">Monte Carlo (MCTS)</option>
        </select>
      </div>

      {algorithm !== 'random' && (
        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-top-1">
          <label className="text-sm font-medium text-gray-300">
            {algorithm === 'montecarlo' ? 'Estrategia de Simulación' : 'Función de Evaluación'}
          </label>
          <select
            value={heuristic}
            onChange={(e) => setHeuristic(e.target.value)}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
          >
            {algorithm === 'montecarlo' && (
              <option value="none" className="text-amber-300">
                Aleatoria (Random Rollout) - Rápida
              </option>
            )}

            <option value="static_weights">Mapa de Calor (Posicional)</option>
            <option value="mobility_based">Movilidad (Libertad)</option>
            <option value="hybrid">Híbrida (Posición + Movilidad)</option>
          </select>

          {algorithm === 'montecarlo' && heuristic === 'none' && (
            <p className="text-xs text-amber-400/80 mt-1">
              Simula partidas jugando fichas al azar. Muy rápido, muchas iteraciones, pero no inteligente.
            </p>
          )}
          {algorithm === 'montecarlo' && heuristic !== 'none' && (
            <p className="text-xs text-blue-400/80 mt-1">
              Simula partidas eligiendo inteligentemente. Mejor calidad, más lento.
            </p>
          )}
        </div>
      )}

      {algorithm === 'alphabeta' && (
        <div className="flex flex-col gap-1.5 animate-in fade-in">
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
      
      {algorithm === 'montecarlo' && (
        <div className="grid grid-cols-2 gap-4 animate-in fade-in">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Iteraciones</label>
            <input
              type="number"
              min="100"
              step="100"
              value={iterations}
              onChange={(e) => setIterations(Math.max(10, parseInt(e.target.value) || 100))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-300">Tiempo (s)</label>
            <input
              type="number"
              min="0.1"
              max="30"
              step="0.5"
              value={timeLimit}
              onChange={(e) => setTimeLimit(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
              className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2"
            />
          </div>
        </div>
      )}

    </div>
  );
};
