import { useEffect, useState } from 'react';

const Confetti = ({ active, onComplete }) => {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    if (active) {
      // Generate random confetti pieces
      const newPieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'][Math.floor(Math.random() * 6)],
        left: Math.random() * 100,
        animationDelay: Math.random() * 0.5,
        size: Math.random() * 10 + 5,
      }));

      setPieces(newPieces);

      // Clear confetti after animation
      const timer = setTimeout(() => {
        setPieces([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [active, onComplete]);

  if (!active || pieces.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="confetti absolute"
          style={{
            left: `${piece.left}%`,
            top: 0,
            backgroundColor: piece.color,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            animationDelay: `${piece.animationDelay}s`,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
