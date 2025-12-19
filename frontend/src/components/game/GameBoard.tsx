import React from 'react';
import { BoardCell } from './BoardCell';

interface GameBoardProps {
  boardState: number[][];
  validMoves: number[][];
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  boardState,
  validMoves,
  onCellClick,
  disabled,
}) => {
  return (
    <div className="inline-block p-3 bg-amber-800 rounded-lg shadow-2xl border-4 border-amber-950">
      <div className="grid grid-cols-8 gap-0.5 bg-green-900 border-2 border-green-900">
        {boardState.map((row, rowIndex) =>
          row.map((cellValue, colIndex) => {
            const isValid = validMoves.some(
              ([r, c]) => r === rowIndex && c === colIndex
            );

            return (
              <div key={`${rowIndex}-${colIndex}`} className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 lg:w-14 lg:h-14">
                <BoardCell
                  row={rowIndex}
                  col={colIndex}
                  value={cellValue as 0 | 1 | 2}
                  isValidMove={isValid && !disabled}
                  onClick={() => {
                    if (!disabled) {
                      onCellClick(rowIndex, colIndex);
                    }
                  }}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};