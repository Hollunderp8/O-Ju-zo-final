
import React from 'react';

interface HUDProps {
  hp: number;
  maxHp: number;
  currency: number;
  characterName: string;
  specialReady: boolean;
  bossHp?: number;
  bossMaxHp?: number;
  bossName?: string;
}

export const HUD: React.FC<HUDProps> = ({ 
  hp, maxHp, currency, characterName, specialReady, bossHp, bossMaxHp, bossName 
}) => {
  const hpPercent = (hp / maxHp) * 100;
  
  return (
    <div className="fixed top-0 left-0 w-full p-6 pointer-events-none z-40">
      <div className="flex justify-between items-start">
        {/* Player Stats */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-zinc-900 border-2 border-amber-600 rounded-full flex items-center justify-center overflow-hidden">
               <span className="text-xl font-cinzel text-amber-500">{characterName[0]}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs uppercase tracking-widest text-zinc-400 font-medieval">{characterName}</span>
              <div className="w-64 h-4 bg-zinc-900 border border-zinc-700 relative overflow-hidden">
                <div 
                  className="h-full bg-red-700 transition-all duration-300 shadow-[0_0_10px_rgba(185,28,28,0.5)]" 
                  style={{ width: `${Math.max(0, hpPercent)}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 ml-14">
            <div className="flex items-center gap-2">
               <div className={`w-3 h-3 rounded-full ${specialReady ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_#fbbf24]' : 'bg-zinc-700'}`} />
               <span className="text-[10px] uppercase font-medieval text-zinc-400">Habilidade</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-amber-500 text-sm font-cinzel">✧</span>
               <span className="text-xs font-medieval text-zinc-300">{currency} FÉ</span>
            </div>
          </div>
        </div>

        {/* Boss Bar */}
        {bossHp !== undefined && bossMaxHp !== undefined && (
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-full max-w-2xl px-10 animate-fade-in">
            <div className="flex flex-col items-center">
                <span className="text-lg font-cinzel text-amber-100 mb-2 uppercase tracking-[0.3em]">{bossName}</span>
                <div className="w-full h-2 bg-zinc-900/80 border border-amber-900/50 relative overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-900 via-amber-600 to-amber-900 transition-all duration-500"
                      style={{ width: `${(bossHp / bossMaxHp) * 100}%` }}
                    />
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
