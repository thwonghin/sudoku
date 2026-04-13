import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Lightbulb, 
  AlertCircle, 
  Timer, 
  ChevronLeft, 
  Play,
  CheckCircle2,
  XCircle,
  Pause,
  PlayCircle,
  Eraser,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  generateFullGrid, 
  createPuzzle, 
  Difficulty, 
  SudokuGrid 
} from './utils/sudoku';

// Types
interface GameState {
  puzzle: SudokuGrid;
  solution: number[][];
  initialPuzzle: SudokuGrid;
  mistakes: number;
  hintsUsed: number;
  timer: number;
  isGameOver: boolean;
  isWin: boolean;
  isPaused: boolean;
  selectedCell: [number, number] | null;
  difficulty: Difficulty;
}

interface BestTimes {
  [key: string]: number;
}

const DIFFICULTIES: { label: string; value: Difficulty; color: string }[] = [
  { label: '新手', value: 'Beginner', color: 'bg-emerald-500' },
  { label: '老手', value: 'Veteran', color: 'bg-blue-500' },
  { label: '專家', value: 'Expert', color: 'bg-amber-500' },
  { label: '瘋狂', value: 'Insane', color: 'bg-orange-500' },
  { label: '地獄', value: 'Hell', color: 'bg-rose-500' },
];

const STORAGE_KEY = 'sudoku_save_data';
const BEST_TIMES_KEY = 'sudoku_best_times';

export default function App() {
  const [game, setGame] = useState<GameState | null>(null);
  const [showMenu, setShowMenu] = useState(true);
  const [hasSavedGame, setHasSavedGame] = useState(false);
  const [bestTimes, setBestTimes] = useState<BestTimes>({});
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Sound Player
  const playSound = (type: 'select' | 'correct' | 'error' | 'delete' | 'win') => {
    if (isMuted) return;
    
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const ctx = audioContextRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'select':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'correct':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'delete':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'win':
        osc.type = 'sine';
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.setValueAtTime(freq, now + i * 0.1);
          g.gain.setValueAtTime(0.1, now + i * 0.1);
          g.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.3);
          o.connect(g);
          g.connect(ctx.destination);
          o.start(now + i * 0.1);
          o.stop(now + i * 0.1 + 0.3);
        });
        break;
    }
  };

  // Load initial data
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setHasSavedGame(true);

    const savedBest = localStorage.getItem(BEST_TIMES_KEY);
    if (savedBest) setBestTimes(JSON.parse(savedBest));
  }, []);

  // Save game state
  useEffect(() => {
    if (game && !game.isGameOver && !game.isWin) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
      setHasSavedGame(true);
    } else if (game?.isWin || game?.isGameOver) {
      localStorage.removeItem(STORAGE_KEY);
      setHasSavedGame(false);
    }
  }, [game]);

  const startNewGame = (difficulty: Difficulty) => {
    const solution = generateFullGrid();
    const puzzle = createPuzzle(solution, difficulty);
    const newState: GameState = {
      puzzle: puzzle.map(row => [...row]),
      solution,
      initialPuzzle: puzzle.map(row => [...row]),
      mistakes: 0,
      hintsUsed: 0,
      timer: 0,
      isGameOver: false,
      isWin: false,
      isPaused: false,
      selectedCell: null,
      difficulty,
    };
    setGame(newState);
    setShowMenu(false);
  };

  const resumeGame = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setGame(JSON.parse(saved));
      setShowMenu(false);
    }
  };

  const resetCurrentGame = () => {
    if (!game) return;
    setGame(prev => prev ? {
      ...prev,
      puzzle: prev.initialPuzzle.map(row => [...row]),
      mistakes: 0,
      hintsUsed: 0,
      timer: 0,
      isGameOver: false,
      isWin: false,
      isPaused: false,
      selectedCell: null,
    } : null);
  };

  const togglePause = () => {
    setGame(prev => prev ? { ...prev, isPaused: !prev.isPaused } : null);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!game || game.isGameOver || game.isWin || game.isPaused) return;
    playSound('select');
    setGame(prev => prev ? { ...prev, selectedCell: [row, col] } : null);
  };

  const handleDelete = useCallback(() => {
    if (!game || !game.selectedCell || game.isGameOver || game.isWin || game.isPaused) return;
    const [row, col] = game.selectedCell;
    if (game.initialPuzzle[row][col] !== null) return;

    playSound('delete');
    const newPuzzle = game.puzzle.map(r => [...r]);
    newPuzzle[row][col] = null;
    setGame(prev => prev ? { ...prev, puzzle: newPuzzle } : null);
  }, [game, isMuted]);

  const handleNumberInput = useCallback((num: number) => {
    if (!game || !game.selectedCell || game.isGameOver || game.isWin || game.isPaused) return;
    const [row, col] = game.selectedCell;

    if (game.initialPuzzle[row][col] !== null) return;
    
    const isCorrect = game.solution[row][col] === num;
    const newPuzzle = game.puzzle.map(r => [...r]);
    newPuzzle[row][col] = num;

    if (isCorrect) {
      playSound('correct');
      const isWin = newPuzzle.every((r, ri) => r.every((c, ci) => c === game.solution[ri][ci]));
      
      if (isWin) {
        playSound('win');
        const currentBest = bestTimes[game.difficulty] || Infinity;
        if (game.timer < currentBest) {
          const newBest = { ...bestTimes, [game.difficulty]: game.timer };
          setBestTimes(newBest);
          localStorage.setItem(BEST_TIMES_KEY, JSON.stringify(newBest));
        }
      }

      setGame(prev => prev ? { 
        ...prev, 
        puzzle: newPuzzle,
        isWin,
        isGameOver: isWin
      } : null);
    } else {
      playSound('error');
      const newMistakes = game.mistakes + 1;
      setGame(prev => prev ? { 
        ...prev, 
        puzzle: newPuzzle,
        mistakes: newMistakes,
        isGameOver: newMistakes >= 3
      } : null);
    }
  }, [game, bestTimes]);

  // Helper to check if a number is completed
  const getNumberCount = (num: number) => {
    if (!game) return 0;
    let count = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (game.puzzle[r][c] === num && game.solution[r][c] === num) {
          count++;
        }
      }
    }
    return count;
  };

  const useHint = () => {
    if (!game || game.hintsUsed >= 1 || !game.selectedCell || game.isGameOver || game.isWin || game.isPaused) return;
    const [row, col] = game.selectedCell;
    
    if (game.initialPuzzle[row][col] !== null) return;

    const newPuzzle = game.puzzle.map(r => [...r]);
    newPuzzle[row][col] = game.solution[row][col];

    setGame(prev => prev ? {
      ...prev,
      puzzle: newPuzzle,
      hintsUsed: 1,
      isWin: newPuzzle.every((r, ri) => r.every((c, ci) => c === game.solution[ri][ci])),
      isGameOver: newPuzzle.every((r, ri) => r.every((c, ci) => c === game.solution[ri][ci]))
    } : null);
  };

  // Timer logic
  useEffect(() => {
    if (game && !game.isGameOver && !game.isWin && !game.isPaused) {
      timerRef.current = setInterval(() => {
        setGame(prev => prev ? { ...prev, timer: prev.timer + 1 } : null);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.isGameOver, game?.isWin, game?.isPaused]);

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') {
        handleNumberInput(parseInt(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberInput, handleDelete]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (showMenu) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background Image with Blur */}
        <div className="absolute inset-0 opacity-40">
          <img 
            src="https://images.unsplash.com/photo-1518133910546-b6c2fb7d79e3?q=80&w=1920&auto=format&fit=crop" 
            alt="Background" 
            className="w-full h-full object-cover blur-sm"
            referrerPolicy="no-referrer"
          />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md bg-white/10 backdrop-blur-xl p-8 rounded-3xl border border-white/20 shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">SUDOKU</h1>
            <p className="text-white/60 font-medium">挑戰你的邏輯極限</p>
          </div>

          <div className="space-y-3">
            {hasSavedGame && (
              <button
                onClick={resumeGame}
                className="w-full group relative overflow-hidden p-4 rounded-2xl bg-blue-600 hover:bg-blue-500 border border-blue-400/30 transition-all duration-300 flex items-center justify-between mb-6 shadow-lg shadow-blue-600/20"
              >
                <div className="flex items-center gap-4">
                  <PlayCircle className="w-6 h-6 text-white" />
                  <div className="text-left">
                    <span className="block text-xl font-bold text-white">繼續上一局</span>
                    <span className="text-xs text-white/60">恢復你的進度</span>
                  </div>
                </div>
                <ChevronLeft className="w-5 h-5 text-white/40 group-hover:text-white rotate-180 transition-all" />
              </button>
            )}

            <div className="grid grid-cols-1 gap-3">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => startNewGame(diff.value)}
                  className="w-full group relative overflow-hidden p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${diff.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`} />
                    <div className="text-left">
                      <span className="text-xl font-bold text-white">{diff.label}</span>
                      {bestTimes[diff.value] && (
                        <span className="block text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          Best: {formatTime(bestTimes[diff.value])}
                        </span>
                      )}
                    </div>
                  </div>
                  <Play className="w-5 h-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Subtle Background */}
      <div className="absolute inset-0 opacity-10">
        <img 
          src={`https://picsum.photos/seed/${game?.difficulty}/1920/1080?blur=10`} 
          alt="Background" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header Stats */}
        <div className="flex items-center justify-between mb-6 bg-white p-3 sm:p-4 rounded-2xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button 
              onClick={() => setShowMenu(true)}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-800"
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button 
              onClick={togglePause}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-800"
            >
              {game?.isPaused ? <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6 text-blue-500" /> : <Pause className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
            <button 
              onClick={() => setIsMuted(!isMuted)}
              className="p-1.5 sm:p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-800"
            >
              {isMuted ? <VolumeX className="w-5 h-5 sm:w-6 sm:h-6 text-rose-500" /> : <Volume2 className="w-5 h-5 sm:w-6 sm:h-6 text-neutral-600" />}
            </button>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6 px-2">
            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Time</span>
              <div className="flex items-center gap-1 text-neutral-900 font-mono text-base sm:text-xl">
                <Timer className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500" />
                {formatTime(game?.timer || 0)}
              </div>
            </div>
            
            <div className="flex flex-col items-center">
              <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Mistakes</span>
              <div className="flex items-center gap-1 text-neutral-900 font-mono text-base sm:text-xl">
                <AlertCircle className={`w-3 h-3 sm:w-4 sm:h-4 ${game?.mistakes === 2 ? 'text-orange-500' : game?.mistakes === 3 ? 'text-red-500' : 'text-emerald-400'}`} />
                <span className={game?.mistakes >= 2 ? 'text-orange-400' : ''}>{game?.mistakes}/3</span>
              </div>
            </div>
          </div>

          <button 
            onClick={useHint}
            disabled={game?.hintsUsed === 1 || !game?.selectedCell || game?.isPaused}
            className={`flex flex-col items-center p-1.5 sm:p-2 rounded-xl transition-all shrink-0 ${game?.hintsUsed === 1 || game?.isPaused ? 'opacity-30 grayscale' : 'hover:bg-neutral-100 active:scale-95'}`}
          >
            <span className="text-[8px] sm:text-[10px] uppercase tracking-widest text-neutral-400 font-bold">Hint</span>
            <Lightbulb className="w-5 h-5 sm:w-6 sm:h-6 text-amber-500" />
          </button>
        </div>

        {/* Sudoku Grid - White Background Black Borders */}
        <div className="aspect-square w-full bg-white rounded-xl border-2 border-black shadow-xl relative overflow-hidden">
          {/* Pause Overlay */}
          <AnimatePresence>
            {game?.isPaused && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center"
              >
                <button 
                  onClick={togglePause}
                  className="group flex flex-col items-center gap-4"
                >
                  <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Play className="w-10 h-10 text-white fill-current" />
                  </div>
                  <span className="text-2xl font-black text-neutral-900 tracking-tight">遊戲暫停中</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-9 grid-rows-9 h-full w-full">
            {game?.puzzle.map((row, ri) => (
              row.map((val, ci) => {
                const isSelected = game.selectedCell?.[0] === ri && game.selectedCell?.[1] === ci;
                const isInitial = game.initialPuzzle[ri][ci] !== null;
                const isCorrect = val === null || val === game.solution[ri][ci];
                const isError = !isInitial && val !== null && !isCorrect;
                const isRelated = game.selectedCell && (game.selectedCell[0] === ri || game.selectedCell[1] === ci || (Math.floor(game.selectedCell[0]/3) === Math.floor(ri/3) && Math.floor(game.selectedCell[1]/3) === Math.floor(ci/3)));
                const isSameValue = game.selectedCell && val !== null && val === game.puzzle[game.selectedCell[0]][game.selectedCell[1]];

                return (
                  <button
                    key={`${ri}-${ci}`}
                    onClick={() => handleCellClick(ri, ci)}
                    className={`
                      relative flex items-center justify-center text-2xl sm:text-3xl font-bold transition-all duration-150
                      border-r border-b border-neutral-200
                      ${isSelected ? 'bg-blue-600 z-20 shadow-inner' : 
                        isError ? 'bg-blue-50/50' :
                        isSameValue ? 'bg-blue-100 text-neutral-900' :
                        isRelated ? 'bg-neutral-50 text-neutral-900' : 'bg-white text-neutral-900'}
                      ${isInitial ? 'text-black font-black' : 
                        isError ? 'text-red-500/80 font-bold' : 
                        isSelected ? 'text-white' : 'text-blue-600 font-medium'}
                      ${(ci + 1) % 3 === 0 && ci !== 8 ? 'border-r-2 border-r-black' : ''}
                      ${(ri + 1) % 3 === 0 && ri !== 8 ? 'border-b-2 border-b-black' : ''}
                    `}
                  >
                    {val}
                  </button>
                );
              })
            ))}
          </div>
        </div>

        {/* Number Pad */}
        <div className="mt-8 grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
            const isCompleted = getNumberCount(num) === 9;
            if (isCompleted) return <div key={num} className="aspect-square" />;
            
            return (
              <button
                key={num}
                onClick={() => handleNumberInput(num)}
                disabled={game?.isPaused}
                className="aspect-square flex items-center justify-center bg-white hover:bg-neutral-50 disabled:opacity-50 active:scale-90 text-neutral-900 text-2xl font-bold rounded-xl border border-neutral-200 shadow-sm transition-all"
              >
                {num}
              </button>
            );
          })}
          <button
            onClick={handleDelete}
            disabled={game?.isPaused || !game?.selectedCell}
            className="aspect-square flex flex-col items-center justify-center bg-white hover:bg-rose-50 disabled:opacity-50 active:scale-90 text-rose-500 rounded-xl border border-neutral-200 shadow-sm transition-all"
          >
            <Eraser className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Delete</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center">
          <button 
            onClick={resetCurrentGame}
            className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-neutral-50 text-neutral-900 rounded-2xl border border-neutral-200 shadow-sm transition-all font-bold"
          >
            <RotateCcw className="w-5 h-5" />
            重新開始本局
          </button>
        </div>
      </div>

      {/* Game Over / Win Modals */}
      <AnimatePresence>
        {game?.isGameOver && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-neutral-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl"
            >
              {game.isWin ? (
                <>
                  <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">太棒了！</h2>
                  <p className="text-white/60 mb-6 font-medium">你成功完成了 {DIFFICULTIES.find(d => d.value === game.difficulty)?.label} 難度</p>
                  <div className="bg-white/5 p-4 rounded-2xl mb-8 flex justify-around">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Time</p>
                      <p className="text-xl font-mono text-white">{formatTime(game.timer)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold mb-1">Mistakes</p>
                      <p className="text-xl font-mono text-white">{game.mistakes}/3</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <XCircle className="w-10 h-10 text-rose-500" />
                  </div>
                  <h2 className="text-3xl font-black text-white mb-2">遊戲結束</h2>
                  <p className="text-white/60 mb-8 font-medium">錯誤次數已達上限</p>
                </>
              )}
              
              <div className="space-y-3">
                <button 
                  onClick={() => startNewGame(game.difficulty)}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all shadow-lg shadow-blue-600/20"
                >
                  再試一次
                </button>
                <button 
                  onClick={() => setShowMenu(true)}
                  className="w-full py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/10"
                >
                  返回主選單
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
