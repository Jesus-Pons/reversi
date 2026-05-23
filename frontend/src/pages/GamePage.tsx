import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { GameBoard } from '../components/game/GameBoard';
import { ScoreBoard } from '../components/game/ScoreBoard';
import { StatusBanner } from '../components/game/StatusBanner';
import { GamesService } from '../client/sdk.gen'; 
import type { Game, Winner } from '../client/types.gen';
import useAuth from '../hooks/useAuth';

interface GamePageProps {
  gameId: string;
}

export const GamePage: React.FC<GamePageProps> = ({ gameId }) => {
  const [game, setGame] = useState<Game | null>(null);
  const [validMoves, setValidMoves] = useState<number[][]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    const intervalId = setInterval(fetchGame, 1000); 
    return () => clearInterval(intervalId);
  }, [fetchGame]);

  const isGameOver = !!game?.winner;

  const isBotTurn = game && !isGameOver && (
    (game.current_turn === 'black' && !game.player_black_id) || 
    (game.current_turn === 'white' && !game.player_white_id)
  );

  const isMyTurn = !!game && !isGameOver && !!user?.id && (
    (game.current_turn === 'black' && game.player_black_id === user.id) ||
    (game.current_turn === 'white' && game.player_white_id === user.id)
  );

  useEffect(() => {
    if (!game || isGameOver || isBotTurn || !isMyTurn || !gameId) {
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
  }, [game?.current_turn, gameId, isBotTurn, isGameOver, isMyTurn]); 

  useEffect(() => {
    if (!game || isGameOver || !isBotTurn || isProcessing || !gameId) return;

    const triggerBotMove = async () => {
      setIsProcessing(true);
      setMessage(`Pensando (${game.current_turn === 'black' ? 'Negras' : 'Blancas'})...`);
      
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        
        await GamesService.makeBotMove({ gameId });
        
        await fetchGame(); 
        setMessage(null);
      } catch (error) {
        console.error('Error triggering bot move:', error);
      } finally {
        setIsProcessing(false);
      }
    };

    triggerBotMove();
  }, [game, isBotTurn, gameId, fetchGame, isGameOver, isProcessing]);

  const handleCellClick = async (row: number, col: number) => {
    if (!game || isBotTurn || isGameOver || !isMyTurn || !gameId) return;

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
  const displayMessage = message || (isGameOver ? null : isBotTurn ? 'Esperando a la IA...' : isMyTurn ? 'Tu turno' : 'Esperando al otro jugador');

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
          disabled={!!isBotTurn || !isMyTurn || isGameOver}
        />
        
        <StatusBanner 
          winner={game.winner as Winner | null} 
          onRestart={() => navigate({to: '/games/new'})}
        />
      </div>
    </div>
  );
};
