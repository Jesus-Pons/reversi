import React from 'react';

interface DiscProps {
  color: 'black' | 'white';
}

export const Disc: React.FC<DiscProps> = ({ color }) => {
  return (
    <div
      className={`
        w-[80%] h-[80%] rounded-full shadow-md transition-all duration-500 transform
        ${color === 'black' ? 'bg-gray-900' : 'bg-white border-2 border-gray-300'}
      `}
    />
  );
};
