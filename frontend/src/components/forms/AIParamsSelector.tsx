import React, { useState, useEffect } from 'react';
import type { AIHeuristic } from '../../client/types.gen';

export type AlgorithmType = 'random' | 'alphabeta' | 'montecarlo' | 'qlearning';

export interface AIConfigInput {
  algorithm: AlgorithmType;
  heuristic?: AIHeuristic | 'none'; // Permitimos 'none' explícitamente en el tipo local
  depth?: number;
  iterations?: number;
  time_limit?: number;
  epsilon?: number;
}

interface AIParamsSelectorProps {
  onChange: (config: AIConfigInput) => void;
}

export const AIParamsSelector: React.FC<AIParamsSelectorProps> = ({ onChange }) => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('alphabeta');
  // Usamos un estado intermedio que permita 'none'
  const [heuristic, setHeuristic] = useState<string>('static_weights');
  
  const [depth, setDepth] = useState<number>(4);
  const [iterations, setIterations] = useState<number>(1000);
  const [timeLimit, setTimeLimit] = useState<number>(4.5);
  const [epsilon, setEpsilon] = useState<number>(0.1);

  // --- LÓGICA DE CORRECCIÓN AUTOMÁTICA ---
  const handleAlgorithmChange = (newAlgo: AlgorithmType) => {
    setAlgorithm(newAlgo);

    // Si cambiamos a AlphaBeta y teníamos "none", forzamos una válida
    if (newAlgo === 'alphabeta' && heuristic === 'none') {
      setHeuristic('static_weights');
    }
    // Si cambiamos a Random, la heurística da igual (se ignora)
  };

  useEffect(() => {
    // Construir objeto de configuración
    const config: AIConfigInput = {
      algorithm,
      // Si es random, mandamos 'none'. Si no, lo que haya en el estado.
      heuristic: algorithm === 'random' ? 'none' : (heuristic as AIHeuristic),
    };

    if (algorithm === 'alphabeta') {
      config.depth = depth;
    } else if (algorithm === 'montecarlo') {
      config.iterations = iterations;
      config.time_limit = timeLimit;
    } else if (algorithm === 'qlearning') {
      config.epsilon = epsilon;
    }

    onChange(config);
  }, [algorithm, heuristic, depth, iterations, timeLimit, epsilon, onChange]);

  return (
    <div className="flex flex-col gap-4 p-5 bg-gray-800 rounded-xl border border-gray-700 shadow-lg text-white w-full max-w-md">
      
      {/* SELECCIÓN DE ALGORITMO */}
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
          <option value="qlearning">Q-Learning</option>
        </select>
      </div>

      {/* SELECCIÓN DE HEURÍSTICA (Oculto para Random) */}
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
            {/* OPCIÓN ESPECIAL: SOLO PARA MONTE CARLO */}
            {algorithm === 'montecarlo' && (
              <option value="none" className="text-amber-300">
                Aleatoria (Random Rollout) - Rápida
              </option>
            )}

            {/* OPCIONES COMUNES (Válidas para AlphaBeta y MCTS Guiado) */}
            <option value="static_weights">Mapa de Calor (Posicional)</option>
            <option value="mobility_based">Movilidad (Libertad)</option>
            <option value="hybrid">Híbrida (Posición + Movilidad)</option>
          </select>

          {/* MENSAJES DE AYUDA CONTEXTUALES */}
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

      {/* PARÁMETROS ESPECÍFICOS */}
      
      {/* Alpha Beta Params */}
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
      
      {/* Monte Carlo Params */}
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

      {/* Q-Learning Params */}
      {algorithm === 'qlearning' && (
        <div className="flex flex-col gap-1.5 animate-in fade-in">
          <label className="text-sm font-medium text-gray-300">Epsilon</label>
          <input
            type="number"
            min="0" max="1" step="0.05"
            value={epsilon}
            onChange={(e) => setEpsilon(parseFloat(e.target.value))}
            className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2"
          />
        </div>
      )}
    </div>
  );
};