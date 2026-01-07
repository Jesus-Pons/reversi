import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { GameBoard } from '../components/game/GameBoard';
import { ScoreBoard } from '../components/game/ScoreBoard';
import { StatusBanner } from '../components/game/StatusBanner';
// Importamos el SDK y los Tipos generados
import { GamesService } from '../client/sdk.gen'; 
import type { Game, Winner } from '../client/types.gen';

interface GamePageProps {
  gameId: string;
}

export const GamePage: React.FC<GamePageProps> = ({ gameId }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [validMoves, setValidMoves] = useState<number[][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

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
    // Reducimos un poco el polling para que se sienta más vivo (1s en vez de 2s)
    const intervalId = setInterval(fetchGame, 1000); 
    return () => clearInterval(intervalId);
  }, [fetchGame]);

  // Helper para saber si hay ganador
  const isGameOver = !!game?.winner;

  // Helper para saber si es turno de Bot
  const isBotTurn = game && !isGameOver && (
    (game.current_turn === 'black' && !game.player_black_id) || 
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
        setValidMoves(response.valid_moves);
      } catch (error) {
        console.error('Error fetching valid moves:', error);
      }
    };

    fetchValidMoves();
  }, [game?.current_turn, gameId, isBotTurn, isGameOver]); 
  // Nota: Aquí está bien dejar current_turn, solo queremos recalcular valid moves si cambia el turno

  // 3. Efecto para Bot (CORREGIDO)
  useEffect(() => {
    // Si no hay juego, o terminó, o NO es turno del bot, o YA está pensando... paramos.
    if (!game || isGameOver || !isBotTurn || isProcessing || !gameId) return;

    const triggerBotMove = async () => {
      setIsProcessing(true);
      setMessage(`Pensando (${game.current_turn === 'black' ? 'Negras' : 'Blancas'})...`);
      
      try {
        // Pequeño delay para que el usuario vea qué pasó antes de que el bot mueva de nuevo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        await GamesService.makeBotMove({ gameId });
        
        // Inmediatamente pedimos el estado nuevo tras el movimiento
        await fetchGame(); 
        setMessage(null);
      } catch (error) {
        console.error('Error triggering bot move:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    triggerBotMove();

  // CAMBIO CLAVE AQUÍ ABAJO:
  // Antes tenías: [game?.current_turn, ...] 
  // Ahora usamos: [game, ...] (o game.board_state)
  // Esto asegura que si el tablero cambia pero el turno sigue siendo el mismo (pase), el bot vuelve a activarse.
  }, [game, isBotTurn, gameId, fetchGame, isGameOver, isProcessing]);

  // 4. Manejar click humano
  const handleCellClick = async (row: number, col: number) => {
    if (!game || isBotTurn || isGameOver || !gameId) return;

    try {
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

  if (!game) return <div className="text-white text-center mt-10 animate-pulse">Cargando partida...</div>;

  const boardMatrix = (game.board_state as number[][]) || [];
  const currentTurn = (game.current_turn as 'black' | 'white') || 'black';
  const displayMessage = message || (isGameOver ? null : isBotTurn ? 'Esperando a la IA...' : 'Tu turno');

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center py-6 sm:py-10 relative">
      
      <ScoreBoard 
        scoreBlack={game.score_black || 0} 
        scoreWhite={game.score_white || 0} 
        currentTurn={currentTurn}
        message={displayMessage} 
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
          onRestart={() => navigate({to: '/games/new'})}
        />
      </div>
    </div>
  );
};