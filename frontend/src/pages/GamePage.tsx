import React, { useEffect, useState, useCallback } from 'react';
import { GameBoard } from '../components/game/GameBoard';
import { ScoreBoard } from '../components/game/ScoreBoard';
import { StatusBanner } from '../components/game/StatusBanner';
// Importamos el SDK y los Tipos generados
import { GamesService } from '..//client/sdk.gen'; 
import type { Game, Turn, Winner } from '..//client/types.gen';

interface GamePageProps {
  gameId: string;
}

export const GamePage: React.FC<GamePageProps> = ({ gameId }) => {
  // Nota: Si usas TanStack Router, usa useParams(). Aquí mantenemos tu lógica simple por ahora.
  // const gameId = window.location.pathname.split('/').pop();
  const [game, setGame] = useState<Game | null>(null);
  const [validMoves, setValidMoves] = useState<number[][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Polling del estado usando el SDK
  const fetchGame = useCallback(async () => {
    if (!gameId) return;
    try {
      const data = await GamesService.getGameById({ gameId });
      setGame(data);
    } catch (error) {
      console.error('Error fetching game:', error);
    }
  }, [gameId]);

  useEffect(() => {
    fetchGame();
    const intervalId = setInterval(fetchGame, 2000);
    return () => clearInterval(intervalId);
  }, [fetchGame]);

  // Helper para saber si hay ganador (game.winner puede ser null)
  const isGameOver = !!game?.winner;

  // Helper para saber si es turno de Bot
  const isBotTurn = game && !isGameOver && (
    (game.current_turn === 'black' && !game.player_black_id) || // Si no hay ID de humano, es bot
    (game.current_turn === 'white' && !game.player_white_id)
  );

  // 2. Obtener movimientos válidos
  useEffect(() => {
    if (!game || isGameOver || isBotTurn || !gameId) {
      setValidMoves([]);
      return;
    }

    const fetchValidMoves = async () => {
      try {
        const response = await GamesService.getValidMoves({ gameId });
        // El SDK devuelve valid_moves como number[][]
        setValidMoves(response.valid_moves);
      } catch (error) {
        console.error('Error fetching valid moves:', error);
      }
    };

    fetchValidMoves();
  }, [game?.current_turn, gameId, isBotTurn, isGameOver]);

  // 3. Efecto para Bot
  useEffect(() => {
    if (!game || isGameOver || !isBotTurn || isProcessing || !gameId) return;

    const triggerBotMove = async () => {
      setIsProcessing(true);
      setMessage(`Pensando (${game.current_turn})...`);
      try {
        // Pequeño delay visual
        await new Promise(resolve => setTimeout(resolve, 800));
        
        await GamesService.makeBotMove({ gameId });
        
        setMessage(null);
        fetchGame(); 
      } catch (error) {
        console.error('Error triggering bot move:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    triggerBotMove();
  }, [game?.current_turn, isBotTurn, gameId, fetchGame, isGameOver]);

  // 4. Manejar click humano
  const handleCellClick = async (row: number, col: number) => {
    if (!game || isBotTurn || isGameOver || !gameId) return;

    try {
      // CORRECCIÓN IMPORTANTE: El payload debe ser { coordinate: [row, col] }
      await GamesService.humanMove({
        gameId,
        requestBody: {
          coordinate: [row, col]
        }
      });

      fetchGame();
      setValidMoves([]);
    } catch (error) {
      console.error('Error making move:', error);
    }
  };

  if (!game) return <div className="text-white text-center mt-10">Cargando partida...</div>;

  // Casteo seguro de tipos para los componentes visuales
  // El backend define board_state como Array<unknown>, nosotros sabemos que es number[][]
  const boardMatrix = (game.board_state as number[][]) || [];
  const currentTurn = (game.current_turn as 'black' | 'white') || 'black';

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-10 relative">
      <ScoreBoard 
        scoreBlack={game.score_black || 0} 
        scoreWhite={game.score_white || 0} 
        currentTurn={currentTurn} 
      />

      <div className="relative">
        <GameBoard
          boardState={boardMatrix}
          validMoves={validMoves}
          onCellClick={handleCellClick}
          disabled={!!isBotTurn || isGameOver}
        />
        
        <StatusBanner 
          winner={game.winner as Winner | null} 
          message={message || (isGameOver ? null : isBotTurn ? 'Turno de la IA' : 'Tu turno')}
          onRestart={() => window.location.reload()}
        />
      </div>

      <div className="mt-8 flex gap-4">
        <button 
          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold transition-colors"
          onClick={() => window.history.back()}
        >
          Salir
        </button>
      </div>
    </div>
  );
};