import { useEffect, useState } from 'react';
import './index.css';
import QuizGame from './components/QuizGame';
import LandingPage from './components/LandingPage';

export function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [transitionClass, setTransitionClass] = useState('');

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Orbitron:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);

  const handleStartGame = () => {
    setTransitionClass('animate-fadeOut');
    setTimeout(() => {
      setGameStarted(true);
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-[#0a1929]">
      {gameStarted ? (
        <div className="animate-fadeIn">
          <QuizGame />
        </div>
      ) : (
        <div className={transitionClass}>
          <LandingPage onStartGame={handleStartGame} />
        </div>
      )}
    </div>
  );
}

export default App;
