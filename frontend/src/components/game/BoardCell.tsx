import React from 'react';
import { Disc } from './Disc';

interface BoardCellProps {
  row: number;
  col: number;
  value: 0 | 1 | 2;
  isValidMove: boolean;
  onClick: () => void;
}

export const BoardCell: React.FC<BoardCellProps> = ({
  value,
  isValidMove,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="w-full h-full bg-green-600 border border-green-800 flex items-center justify-center cursor-pointer relative"
    >
      {value === 1 && <Disc color="black" />}
      {value === 2 && <Disc color="white" />}
      {value === 0 && isValidMove && (
        <div className="w-3 h-3 bg-black/20 rounded-full" />
      )}
    </div>
  );
};
