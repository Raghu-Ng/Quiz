import { useState, useEffect } from 'react';
import { moneyLadder, milestones } from '../data/questions';
import { Loader, Mic, Phone, Play, SkipForward, Users, Volume2 } from 'lucide-react';
import { Howl } from 'howler';
import { fetchQuestions, FormattedQuestion, getRandomFallbackQuestions } from '../services/questionService';

// Enhanced sound effects with more variety
const sounds = {
  // Game state sounds
  start: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-game-show-intro-943.mp3'] }),
  waiting: new Howl({ 
    src: ['https://assets.mixkit.co/sfx/preview/mixkit-suspense-waiting-drum-sound-574.mp3'],
    loop: true,
    volume: 0.5
  }),
  
  // Answer feedback sounds with multiple options for variety
  correct: [
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-winning-chimes-2015.mp3'] }),
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-correct-answer-tone-2870.mp3'] }),
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3'] })
  ],
  wrong: [
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-wrong-answer-fail-notification-946.mp3'] }),
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-negative-tone-interface-tap-2576.mp3'] }),
    new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-alert-quick-glitch-466.mp3'] })
  ],
  
  // Special event sounds
  milestone: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-achievement-bell-600.mp3'], volume: 0.8 }),
  bigWin: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-animated-small-group-applause-523.mp3'] }),
  gameOver: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-losing-piano-2024.mp3'] }),
  jackpot: new Howl({ src: ['https://assets.mixkit.co/sfx/preview/mixkit-cheering-crowd-loud-whistle-610.mp3'] }),
};

const QuizGame = () => {
  const [gameState, setGameState] = useState<'start' | 'loading' | 'playing' | 'result'>('start');
  const [questions, setQuestions] = useState<FormattedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerConfirmed, setIsAnswerConfirmed] = useState(false);
  const [earnedMoney, setEarnedMoney] = useState(0);
  const [isSoundOn, setIsSoundOn] = useState(true);
  const [lifelines, setLifelines] = useState({
    fifty: true,
    audience: true,
    phone: true
  });
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [audienceHelp, setAudienceHelp] = useState<number[] | null>(null);
  const [phoneAdvice, setPhoneAdvice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answerEffect, setAnswerEffect] = useState<'none' | 'correct' | 'wrong'>('none');

  const currentQuestion = questions[currentQuestionIndex];

  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
    
    return () => {
      Object.values(sounds).forEach(sound => {
        if (Array.isArray(sound)) {
          sound.forEach(s => s.stop());
        } else {
          sound.stop();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (gameState === 'playing') {
      if (isSoundOn) {
        sounds.waiting.play();
      }
      return () => {
        sounds.waiting.stop();
      };
    }
  }, [gameState, isSoundOn]);

  // Reset answer effect after animation completes
  useEffect(() => {
    if (answerEffect !== 'none') {
      const timer = setTimeout(() => {
        setAnswerEffect('none');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [answerEffect]);

  const loadQuestions = async () => {
    setGameState('loading');
    setError(null);
    
    try {
      // Show a loading message temporarily
      const loadingMessages = [
        "Gathering the toughest questions...",
        "Summoning quiz masters from around the world...",
        "Calibrating difficulty levels...",
        "Preparing your million-dollar challenge...",
        "Dusting off the most intriguing trivia..."
      ];
      
      // Pick a random loading message to display
      const randomMessage = loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
      setError(randomMessage);
      
      // Fetch questions with improved handling (will use cache or fallbacks automatically)
      // Now with improved reliability - can use up to 100 backup questions if API fails
      const fetchedQuestions = await fetchQuestions();
      
      // Clear any loading messages
      setError(null);
      
      // Validate that we have received all 15 questions
      if (fetchedQuestions.length !== 15) {
        console.warn(`Expected 15 questions but received ${fetchedQuestions.length}`);
        // This shouldn't happen with our improved fetchQuestions, but just in case
        // Now using randomized questions from our expanded pool of 100 questions
        const fallbackQuestions = getRandomFallbackQuestions(15);
        setQuestions(fallbackQuestions);
      } else {
        setQuestions(fetchedQuestions);
      }
      
      setGameState('playing');
      
      if (isSoundOn) {
        sounds.start.play();
      }
    } catch (err) {
      console.error('Unexpected error loading questions:', err);
      
      // Don't show technical error to user, just use randomized fallback questions
      // Using our expanded pool of 100 questions for better variety
      const fallbackQuestions = getRandomFallbackQuestions(15);
      setQuestions(fallbackQuestions);
      setGameState('playing');
      
      if (isSoundOn) {
        sounds.start.play();
      }
    }
  };

  const startGame = () => {
    // Reset all game state
    setGameState('loading');
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setIsAnswerConfirmed(false);
    setEarnedMoney(0);
    setLifelines({ fifty: true, audience: true, phone: true });
    setEliminatedOptions([]);
    setAudienceHelp(null);
    setPhoneAdvice(null);
    setError(null);
    setQuestions([]); // Clear any existing questions
    setAnswerEffect('none');
    
    // Stop any playing sounds
    Object.values(sounds).forEach(sound => {
      if (Array.isArray(sound)) {
        sound.forEach(s => s.stop());
      } else {
        sound.stop();
      }
    });
    
    // Load questions from API
    loadQuestions();
  };

  const handleAnswerSelect = (answerIndex: number) => {
    if (isAnswerConfirmed || eliminatedOptions.includes(answerIndex)) return;
    setSelectedAnswer(answerIndex);
  };

  // Play a random sound from a sound array
  const playRandomSound = (soundArray: Howl[]) => {
    if (!isSoundOn) return;
    const randomIndex = Math.floor(Math.random() * soundArray.length);
    soundArray[randomIndex].play();
  };

  const confirmAnswer = () => {
    if (selectedAnswer === null) return;
    
    setIsAnswerConfirmed(true);
    
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    // Stop waiting sound
    sounds.waiting.stop();
    
    if (isCorrect) {
      // Set visual effect
      setAnswerEffect('correct');
      
      // Play appropriate sound based on context
      if (isSoundOn) {
        // Check if this is a milestone
        const isNextQuestionMilestone = milestones.includes(currentQuestionIndex + 2); // +2 because index is 0-based and milestones are 1-based
        const isFinalQuestion = currentQuestionIndex === questions.length - 1;
        
        if (isFinalQuestion) {
          // Play jackpot sound for winning the million
          sounds.jackpot.play();
        } else if (isNextQuestionMilestone) {
          // Play milestone sound when reaching a safe haven
          sounds.milestone.play();
          setTimeout(() => playRandomSound(sounds.correct), 1000);
        } else {
          // Play a random correct answer sound
          playRandomSound(sounds.correct);
        }
      }
    } else {
      // Set visual effect for wrong answer
      setAnswerEffect('wrong');
      
      // Play wrong answer sound
      if (isSoundOn) {
        playRandomSound(sounds.wrong);
        // Also play game over sound after a delay
        setTimeout(() => sounds.gameOver.play(), 1000);
      }
    }
    
    setTimeout(() => {
      if (isCorrect) {
        const newEarnedMoney = moneyLadder[currentQuestionIndex];
        setEarnedMoney(newEarnedMoney);
        
        if (currentQuestionIndex === questions.length - 1) {
          // Won the game
          if (isSoundOn && !sounds.jackpot.playing()) sounds.bigWin.play();
          setGameState('result');
        } else {
          // Move to next question
          setCurrentQuestionIndex(prevIndex => prevIndex + 1);
          setSelectedAnswer(null);
          setIsAnswerConfirmed(false);
          setEliminatedOptions([]);
          setAudienceHelp(null);
          setPhoneAdvice(null);
        }
      } else {
        // Game over
        // Calculate the milestones
        let finalMoney = 0;
        for (let i = milestones.length - 1; i >= 0; i--) {
          if (currentQuestionIndex >= milestones[i] - 1) {
            finalMoney = moneyLadder[milestones[i]- 1 ];
            break;
          }
        }
        setEarnedMoney(finalMoney);
        setGameState('result');
      }
    }, 2000);
  };

  const useFiftyFifty = () => {
    if (!lifelines.fifty || isAnswerConfirmed) return;
    
    const correctAnswer = currentQuestion.correctAnswer;
    const wrongOptions = [0, 1, 2, 3].filter(idx => idx !== correctAnswer);
    
    // Randomly remove 2 wrong options
    const shuffledWrongOptions = wrongOptions.sort(() => Math.random() - 0.5);
    const toEliminate = shuffledWrongOptions.slice(0, 2);
    
    setEliminatedOptions(toEliminate);
    setLifelines(prev => ({ ...prev, fifty: false }));
  };

  const useAudienceHelp = () => {
    if (!lifelines.audience || isAnswerConfirmed) return;
    
    const correctAnswer = currentQuestion.correctAnswer;
    
    // Simulate audience vote with correct answer having highest percentage
    const audienceVotes = [10, 15, 20, 25].sort(() => Math.random() - 0.5);
    
    // Make sure correct answer gets highest percentage
    const maxPercentage = Math.max(...audienceVotes);
    const maxIndex = audienceVotes.indexOf(maxPercentage);
    
    if (maxIndex !== correctAnswer) {
      // Swap to ensure correct answer has highest percentage
      const temp = audienceVotes[maxIndex];
      audienceVotes[maxIndex] = audienceVotes[correctAnswer];
      audienceVotes[correctAnswer] = temp;
    }
    
    // Adjust to make eliminated options have 0%
    eliminatedOptions.forEach(optionIndex => {
      audienceVotes[optionIndex] = 0;
    });
    
    // Make sure total is 100%
    const total = audienceVotes.reduce((acc, val) => acc + val, 0);
    const normalizedVotes = audienceVotes.map(vote => Math.round((vote / total) * 100));
    
    setAudienceHelp(normalizedVotes);
    setLifelines(prev => ({ ...prev, audience: false }));
  };

  const usePhoneAFriend = () => {
    if (!lifelines.phone || isAnswerConfirmed) return;
    
    const correctAnswer = currentQuestion.correctAnswer;
    const letters = ['A', 'B', 'C', 'D'];
    
    // 80% chance the friend is correct
    const isCorrect = Math.random() < 0.8;
    
    let friendAnswer;
    if (isCorrect) {
      friendAnswer = correctAnswer;
    } else {
      // Pick a random wrong answer that's not eliminated
      const availableWrongAnswers = [0, 1, 2, 3].filter(idx => 
        idx !== correctAnswer && !eliminatedOptions.includes(idx)
      );
      
      friendAnswer = availableWrongAnswers[Math.floor(Math.random() * availableWrongAnswers.length)];
    }
    
    const confidence = isCorrect ? 
      ["I'm pretty sure", "I'm confident", "I definitely know"][Math.floor(Math.random() * 3)] :
      ["I think", "I'm not 100% sure, but", "If I had to guess"][Math.floor(Math.random() * 3)];
    
    setPhoneAdvice(`${confidence} it's ${letters[friendAnswer]}.`);
    setLifelines(prev => ({ ...prev, phone: false }));
  };

  const toggleSound = () => {
    setIsSoundOn(!isSoundOn);
    
    if (isSoundOn) {
      Object.values(sounds).forEach(sound => {
        if (Array.isArray(sound)) {
          sound.forEach(s => s.stop());
        } else {
          sound.stop();
        }
      });
    } else if (gameState === 'playing') {
      sounds.waiting.play();
    }
  };

  const getBackgroundColor = (optionIndex: number) => {
    if (!isAnswerConfirmed) {
      if (selectedAnswer === optionIndex) return 'bg-orange-500';
      if (eliminatedOptions.includes(optionIndex)) return 'bg-gray-500 opacity-40';
      return 'bg-blue-600 hover:bg-blue-700';
    } else {
      if (optionIndex === currentQuestion.correctAnswer) return 'bg-green-600';
      if (selectedAnswer === optionIndex) return 'bg-red-600';
      return 'bg-blue-600 opacity-40';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-black text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>
      <div className="absolute top-4 right-4 z-10">
        <button 
          onClick={toggleSound} 
          className="p-2 rounded-full bg-gray-800 hover:bg-gray-700 focus:outline-none"
        >
          <Volume2 size={20} className={isSoundOn ? 'text-green-500' : 'text-red-500'} />
        </button>
      </div>
      
      {gameState === 'start' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h1 className="text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-200">
            Who Wants to Be a Millionaire?
          </h1>
          <p className="text-xl mb-8 max-w-2xl">
            Test your knowledge and see if you can answer 15 increasingly difficult questions to win the million dollar prize!
          </p>
          <button 
            onClick={startGame}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-full text-xl font-semibold transform transition-transform hover:scale-105 shadow-lg"
          >
            <Play size={24} />
            Start Game
          </button>
        </div>
      )}
      
      {gameState === 'loading' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <div className="relative">
            <Loader size={64} className="animate-spin text-blue-400 mb-6" />
            <div className="absolute inset-0 bg-blue-500 blur-xl opacity-20 animate-pulse"></div>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Loading Questions...</h2>
          <p className="text-gray-300">Preparing your million-dollar challenge</p>
          {error && (
            <div className="mt-4 p-3 bg-blue-900 bg-opacity-50 rounded-lg max-w-md border border-blue-700 animate-pulse">
              <p className="text-blue-200">{error}</p>
            </div>
          )}
        </div>
      )}
      
      {gameState === 'playing' && currentQuestion && (
        <div className={`flex flex-col md:flex-row min-h-screen ${answerEffect !== 'none' ? answerEffect === 'correct' ? 'animate-pulse-green' : 'animate-pulse-red' : ''}`}>
          {/* Money ladder sidebar */}
          <div className="md:w-1/4 bg-black p-4 flex flex-col justify-center">
            <h3 className="text-center font-bold text-xl mb-4">Prize Ladder</h3>
            <div className="flex flex-col-reverse">
              {moneyLadder.map((prize, index) => (
                <div 
                  key={index}
                  className={`py-2 px-4 mb-1 rounded flex justify-between items-center ${
                    currentQuestionIndex === index 
                      ? 'bg-orange-500 text-white' 
                      : index < currentQuestionIndex 
                        ? 'bg-green-800 text-gray-300' 
                        : 'bg-gray-800 text-gray-400'
                  } ${milestones.includes(index + 1) ? 'border-l-4 border-yellow-400' : ''}`}
                >
                  <span>{index + 1}</span>
                  <span className="font-semibold">${prize.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Main game area */}
          <div className={`md:w-3/4 flex flex-col justify-between p-8 relative ${
            answerEffect === 'correct' ? 'animate-correct-pulse' : 
            answerEffect === 'wrong' ? 'animate-wrong-pulse' : ''
          }`}>
            {error && (
              <div className="mb-6 p-4 bg-red-900 bg-opacity-70 rounded-lg">
                <p className="text-yellow-200">{error}</p>
              </div>
            )}
          
            {/* Lifelines */}
            <div className="flex justify-center gap-6 mb-8">
              <button 
                onClick={useFiftyFifty}
                disabled={!lifelines.fifty || isAnswerConfirmed}
                className={`p-3 rounded-full ${lifelines.fifty ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700'} flex items-center justify-center`}
                title="50:50 - Remove two wrong answers"
              >
                <div className="font-bold text-lg">50:50</div>
              </button>
              
              <button 
                onClick={useAudienceHelp}
                disabled={!lifelines.audience || isAnswerConfirmed}
                className={`p-3 rounded-full ${lifelines.audience ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700'} flex items-center justify-center`}
                title="Ask the Audience"
              >
                <Users size={24} />
              </button>
              
              <button 
                onClick={usePhoneAFriend}
                disabled={!lifelines.phone || isAnswerConfirmed}
                className={`p-3 rounded-full ${lifelines.phone ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700'} flex items-center justify-center`}
                title="Phone a Friend"
              >
                <Phone size={24} />
              </button>
            </div>
            
            {/* Audience help display */}
            {audienceHelp && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <h4 className="text-center mb-2 font-semibold">Audience Results</h4>
                <div className="flex justify-between gap-4">
                  {audienceHelp.map((percentage, idx) => (
                    <div key={idx} className="flex flex-col items-center">
                      <div className="h-32 w-12 bg-gray-700 rounded-t-lg relative">
                        <div 
                          className="absolute bottom-0 w-full bg-blue-500 rounded-t-lg"
                          style={{ height: `${percentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-2">
                        <div className="bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center">
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <div className="text-center mt-1">{percentage}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phone a friend advice */}
            {phoneAdvice && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg flex items-center">
                <Mic size={24} className="mr-3 text-yellow-400" />
                <p className="italic">Your friend says: "{phoneAdvice}"</p>
              </div>
            )}
            
            {/* Question */}
            <div className="mb-8">
              <div className="mb-2 text-gray-300 flex justify-between">
                <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                <span>{currentQuestion.category} - ${currentQuestion.value.toLocaleString()}</span>
              </div>
              <div className="bg-blue-800 p-6 rounded-xl shadow-lg mb-8">
                <h2 className="text-2xl mb-4 text-center">{currentQuestion.question}</h2>
              </div>
              
              {/* Answer options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswerSelect(idx)}
                    disabled={isAnswerConfirmed}
                    className={`${getBackgroundColor(idx)} p-4 rounded-lg transition-all duration-200 flex items-center ${eliminatedOptions.includes(idx) ? 'cursor-not-allowed' : 'cursor-pointer'} ${
                      isAnswerConfirmed && idx === currentQuestion.correctAnswer ? 'animate-correct-option' :
                      isAnswerConfirmed && idx === selectedAnswer && idx !== currentQuestion.correctAnswer ? 'animate-wrong-option' : ''
                    }`}
                  >
                    <span className="inline-block w-8 h-8 rounded-full bg-white text-blue-800 flex items-center justify-center font-bold mr-3">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span>{option}</span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Confirm answer button */}
            {selectedAnswer !== null && !isAnswerConfirmed && (
              <div className="flex justify-center">
                <button
                  onClick={confirmAnswer}
                  className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 rounded-full font-semibold text-lg transition-transform transform hover:scale-105"
                >
                  Final Answer
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {gameState === 'result' && (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
          <h1 className="text-4xl font-bold mb-6">
            {earnedMoney === 1000000 
              ? "Congratulations! You're a Millionaire!" 
              : earnedMoney > 0 
                ? "Game Over!" 
                : "Better Luck Next Time!"}
          </h1>
          
          <div className="mb-8">
            {earnedMoney === 1000000 ? (
              <div className="animate-pulse">
                <div className="text-6xl font-bold text-yellow-400 mb-3">$1,000,000</div>
                <p className="text-2xl">You've reached the top of the money ladder!</p>
              </div>
            ) : (
              <>
                <p className="text-xl mb-2">You won:</p>
                <div className="text-4xl font-bold text-yellow-400 mb-6">${earnedMoney.toLocaleString()}</div>
                <p className="text-lg opacity-75">
                  {earnedMoney > 0 
                    ? "Not bad! But there's still more to aim for." 
                    : "Don't worry, knowledge is its own reward."}
                </p>
              </>
            )}
          </div>
          
          <button 
            onClick={startGame}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-full text-xl font-semibold transition-transform transform hover:scale-105 shadow-lg"
          >
            <SkipForward size={24} />
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizGame;
