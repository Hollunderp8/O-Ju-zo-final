
import React from 'react';

interface HUDProps {
  hp: number;
  maxHp: number;
  currency: number;
  characterName: string;
  specialReady: boolean;
  profilePic?: string;
}

export const HUD: React.FC<HUDProps> = ({ 
  hp, maxHp, currency, characterName, profilePic 
}) => {
  const hpPercent = (hp / maxHp) * 100;
  
  return (
    <div className="fixed top-0 left-0 w-full p-4 pointer-events-none z-40">
      <div className="flex items-center gap-4 bg-zinc-900/80 border-4 border-amber-900 p-2 max-w-fit shadow-[4px_4px_0_rgba(0,0,0,1)]">
        <div className="w-10 h-10 border-2 border-amber-600 bg-zinc-800 flex-shrink-0">
           <img src={profilePic} className="w-full h-full object-cover" alt="U" />
        </div>
        
        <div className="flex flex-col">
          <span className="text-[8px] font-medieval uppercase text-amber-500 mb-1">{characterName}</span>
          <div className="w-48 h-4 bg-zinc-950 border-2 border-zinc-800 relative">
            <div 
              className="h-full bg-red-700 transition-all duration-100" 
              style={{ width: `${Math.max(0, hpPercent)}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pl-4 border-l-2 border-zinc-800">
           <span className="text-[10px] font-cinzel text-amber-500">{currency}</span>
           <span className="text-[6px] font-medieval text-zinc-500 uppercase">FÉ</span>
        </div>
      </div>
    </div>
  );
};
