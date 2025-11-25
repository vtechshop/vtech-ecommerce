import React from 'react';
import Spinner from './Spinner';

const Loading = ({ size = 'lg', message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] py-8 animate-fade-in">
      <Spinner size={size} />
      <p className="mt-4 text-gray-700 text-sm">{message}</p>
    </div>
  );
};

export default Loading;
