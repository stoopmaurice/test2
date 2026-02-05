
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Theme, Player, Message, GameResponse } from './types';
import { startNewGame, processAction } from './services/geminiService';
import { 
  Heart, 
  Shield, 
  Zap, 
  Package, 
  Send, 
  RotateCcw, 
  Skull, 
  Trophy,
  Terminal,
  ChevronRight
} from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [player, setPlayer] = useState<Player>({
    name: '',
    health: 100,
    level: 1,
    xp: 0,
    inventory: ['Rations', 'Water Bottle'],
    theme: Theme.CYBERPUNK
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentNarrative, setCurrentNarrative] = useState<GameResponse | null>(null);
  const [customAction, setCustomAction] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentNarrative]);

  const handleStartGame = async () => {
    if (!player.name) return;
    setGameState(GameState.LOADING);
    try {
      const initial = await startNewGame(player);
      setCurrentNarrative(initial);
      setMessages([{
        role: 'ai',
        content: initial.narrative,
        timestamp: Date.now()
      }]);
      setGameState(GameState.PLAYING);
    } catch (error) {
      console.error(error);
      alert("Failed to start game. Check your API Key or try again.");
      setGameState(GameState.START);
    }
  };

  const handleAction = async (actionText: string) => {
    if (gameState !== GameState.PLAYING) return;
    
    const userMessage: Message = {
      role: 'user',
      content: actionText,
      timestamp: Date.now()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setGameState(GameState.LOADING);
    setHistory(prev => [...prev.slice(-5), actionText]);

    try {
      const response = await processAction(player, actionText, history);
      
      // Update player state
      setPlayer(prev => {
        let newHealth = Math.min(100, prev.health + response.healthChange);
        let newXp = prev.xp + response.xpReward;
        let newLevel = prev.level;
        
        // Level up logic
        if (newXp >= prev.level * 100) {
          newXp -= prev.level * 100;
          newLevel += 1;
        }

        // Inventory logic
        let newInventory = [...prev.inventory];
        response.inventoryUpdate.add.forEach(item => newInventory.push(item));
        response.inventoryUpdate.remove.forEach(item => {
          const index = newInventory.indexOf(item);
          if (index > -1) newInventory.splice(index, 1);
        });

        return {
          ...prev,
          health: newHealth,
          xp: newXp,
          level: newLevel,
          inventory: newInventory
        };
      });

      setCurrentNarrative(response);
      setMessages(prev => [...prev, {
        role: 'ai',
        content: response.narrative,
        timestamp: Date.now()
      }]);

      if (response.isGameOver || player.health + response.healthChange <= 0) {
        setGameState(GameState.GAMEOVER);
      } else {
        setGameState(GameState.PLAYING);
      }
    } catch (error) {
      console.error(error);
      setGameState(GameState.PLAYING);
    }
  };

  const resetGame = () => {
    setGameState(GameState.START);
    setPlayer({
      name: '',
      health: 100,
      level: 1,
      xp: 0,
      inventory: ['Rations', 'Water Bottle'],
      theme: Theme.CYBERPUNK
    });
    setMessages([]);
    setCurrentNarrative(null);
    setHistory([]);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
      <div className="scanline-effect"></div>
      
      {/* Background Decor */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900 to-black pointer-events-none"></div>

      {gameState === GameState.START && (
        <div className="max-w-md w-full bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 p-8 rounded-3xl shadow-2xl z-10 animate-in fade-in zoom-in duration-500">
          <div className="flex flex-col items-center mb-8">
            <div className="p-4 bg-indigo-600 rounded-2xl mb-4 shadow-lg shadow-indigo-500/40">
              <Terminal className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-center tracking-tight text-white mb-2">GEMINI QUEST</h1>
            <p className="text-slate-400 text-center text-sm">A procedurally generated AI Odyssey</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">Hero Name</label>
              <input 
                type="text" 
                value={player.name}
                onChange={(e) => setPlayer({...player, name: e.target.value})}
                placeholder="Enter your name..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-400 mb-2">Choose Universe</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.values(Theme).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => setPlayer({...player, theme})}
                    className={`px-3 py-4 rounded-xl text-xs font-bold border transition-all ${
                      player.theme === theme 
                        ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg shadow-indigo-500/20' 
                        : 'bg-slate-950 border-slate-700 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    {theme}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              disabled={!player.name}
              className="w-full bg-white text-slate-900 font-bold py-4 rounded-xl hover:bg-indigo-50 transition-colors shadow-xl disabled:opacity-50 flex items-center justify-center gap-2 group"
            >
              INITIALIZE ADVENTURE
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      )}

      {(gameState === GameState.PLAYING || gameState === GameState.LOADING || gameState === GameState.GAMEOVER) && (
        <div className="flex flex-col md:flex-row w-full max-w-6xl h-[90vh] gap-6 z-10 animate-in fade-in slide-in-from-bottom-10 duration-700">
          
          {/* Left Sidebar: Stats */}
          <div className="w-full md:w-80 flex flex-col gap-4">
            <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700 p-6 rounded-3xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">
                  {player.name[0]?.toUpperCase()}
                </div>
                <div>
                  <h2 className="font-bold text-lg">{player.name}</h2>
                  <p className="text-xs text-indigo-400 font-semibold">LEVEL {player.level} HERO</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1 text-red-400"><Heart className="w-3 h-3" /> HP</span>
                    <span>{player.health}/100</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div 
                      className={`h-full transition-all duration-500 ${player.health < 30 ? 'bg-red-500' : 'bg-green-500'}`} 
                      style={{width: `${player.health}%`}}
                    ></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="flex items-center gap-1 text-blue-400"><Zap className="w-3 h-3" /> XP</span>
                    <span>{player.xp}/{player.level * 100}</span>
                  </div>
                  <div className="h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div className="h-full bg-blue-500 transition-all duration-500" style={{width: `${(player.xp / (player.level * 100)) * 100}%`}}></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/80 backdrop-blur-lg border border-slate-700 p-6 rounded-3xl flex-1 overflow-hidden flex flex-col">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" /> Inventory
              </h3>
              <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
                <div className="grid grid-cols-1 gap-2">
                  {player.inventory.length > 0 ? player.inventory.map((item, i) => (
                    <div key={i} className="bg-slate-950 border border-slate-800 px-3 py-2 rounded-xl text-xs text-slate-300 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-indigo-400" />
                      {item}
                    </div>
                  )) : (
                    <p className="text-xs text-slate-600 italic">Inventory is empty...</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Main Game Console */}
          <div className="flex-1 flex flex-col bg-slate-900/60 backdrop-blur-xl border border-slate-700 rounded-3xl overflow-hidden shadow-2xl relative">
            
            {/* Console Header */}
            <div className="bg-slate-800/50 border-b border-slate-700 p-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[10px] font-mono text-green-500 font-bold uppercase tracking-widest">System Online // {player.theme}</span>
              </div>
              <button 
                onClick={resetGame}
                className="text-slate-400 hover:text-white transition-colors p-1"
                title="Restart Game"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Narrative Feed */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar scroll-smooth"
            >
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-4`}
                >
                  <div className={`max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white p-4 rounded-2xl rounded-tr-none shadow-lg' 
                      : 'text-slate-200 leading-relaxed font-mono text-sm md:text-base border-l-2 border-indigo-500/50 pl-4 py-1'
                    }`}
                  >
                    {msg.role === 'ai' && <div className="text-[10px] text-indigo-400 font-bold mb-2 uppercase">Narrator:</div>}
                    {msg.content}
                  </div>
                </div>
              ))}
              
              {gameState === GameState.LOADING && (
                <div className="flex justify-start animate-pulse">
                  <div className="text-slate-500 font-mono text-sm italic">Gemini is thinking...</div>
                </div>
              )}

              {gameState === GameState.GAMEOVER && (
                <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl flex flex-col items-center text-center animate-in zoom-in">
                  {player.health <= 0 ? (
                    <Skull className="w-16 h-16 text-red-500 mb-4" />
                  ) : (
                    <Trophy className="w-16 h-16 text-yellow-500 mb-4" />
                  )}
                  <h2 className="text-3xl font-bold mb-2">{player.health <= 0 ? 'DEATH' : 'ADVENTURE COMPLETE'}</h2>
                  <p className="text-slate-400 mb-6">{currentNarrative?.gameOverReason || "The story ends here."}</p>
                  <button 
                    onClick={resetGame}
                    className="bg-white text-black font-bold px-8 py-3 rounded-xl hover:bg-slate-200 transition-colors"
                  >
                    RETURN TO MENU
                  </button>
                </div>
              )}
            </div>

            {/* Interaction Area */}
            {gameState === GameState.PLAYING && currentNarrative && (
              <div className="p-6 bg-slate-950/80 border-t border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                  {currentNarrative.choices.map((choice, i) => (
                    <button
                      key={i}
                      onClick={() => handleAction(choice)}
                      className="text-left bg-slate-900 border border-slate-800 hover:border-indigo-500 hover:bg-indigo-900/20 px-4 py-3 rounded-xl text-sm transition-all group flex items-center gap-3"
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-800 group-hover:bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-white transition-colors">{i+1}</span>
                      {choice}
                    </button>
                  ))}
                </div>

                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customAction.trim()) {
                      handleAction(customAction);
                      setCustomAction('');
                    }
                  }}
                  className="relative"
                >
                  <input 
                    type="text"
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    placeholder="Type a custom action..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-5 py-4 pr-16 focus:ring-2 focus:ring-indigo-500 outline-none text-white placeholder:text-slate-600"
                  />
                  <button 
                    type="submit"
                    className="absolute right-3 top-1/2 -translate-y-1/2 bg-indigo-600 p-2 rounded-xl text-white hover:bg-indigo-500 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
