import { useEffect, useState } from 'react';

interface Props {
  exerciseName: string;
  weight: number;
  reps: number;
  estimated1RM: number;
  onClose: () => void;
}

export default function PRNotification({ exerciseName, weight, reps, estimated1RM, onClose }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 5000);
    if ('vibrate' in navigator) navigator.vibrate([100, 50, 100, 50, 200]);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-[400px] transition-all duration-300 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-4 shadow-lg relative">
        <button onClick={handleClose} className="absolute top-2 right-3 text-white/70 text-lg">&times;</button>
        <div className="text-center">
          <div className="text-2xl mb-1">🏆 새로운 PR!</div>
          <div className="font-bold text-white text-lg">{exerciseName}</div>
          <div className="text-white/90 text-sm mt-1">
            {weight}kg × {reps}회 (추정 1RM: {Math.round(estimated1RM)}kg)
          </div>
        </div>
      </div>
    </div>
  );
}
