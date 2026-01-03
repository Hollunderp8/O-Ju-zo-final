
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { GameStatus, GameState, CharacterId, DeviceType, User } from './types';
import { HUD } from './components/UI/HUD';
import { GameEngine } from './components/GameEngine';
import { AuthScreen } from './components/UI/AuthScreen';
import { authService } from './services/authService';
import { getChapterIntro } from './services/geminiService';
import { CHAPTERS, CHARACTERS } from './constants';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [status, setStatus] = useState<GameStatus>(GameStatus.AUTH);
  const [gameState, setGameState] = useState<GameState>(authService.getInitialState());

  const [introText, setIntroText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('Carregando...');
  const [narrationDuration, setNarrationDuration] = useState<number>(80); 
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const storyText = `Finalmente o apocalipse que estava na bíblia aconteceu, porem de um jeito bem diferente, achávamos que as pessoas iriam ser arrebatadas e que os pecadores iriam permanecer na terra sofrem, mas oque não sabíamos que cada igreja que foi construída habitavam anjos nos quais se fortaleciam de acordo com a fé das pessoas que frequentavam essas igrejas, e isso vale para qualquer religião. Ninguém imaginava que estávamos criando esses monstros para nossa própria extinção.

O ano era 2050, no dia do juízo final, era um dia comum, mas de repente vimos seres alados descendo do céu, e ficaram parados por mais de duas horas no céu, após esse tempo eles começaram a carregar um poder, uma bola de energia amarelada, e então eles liberaram esses poderes, pelo que percebi, havia um desses em cada grande aglomerado de pessoas, cidades, a explosão desses poderes foi tão grande que devastou essas cidades, ficando apenas ruinas, tudo destruído, não havia muitos sobreviventes.

Os únicos que sobreviveram foram os que estavam fora de cidades, em zona rural, por sorte eu estava em uma viagem, então consegui sobreviver, mas o inferno só estava começando. Depois dessas explosões, os anjos que ficaram adormecidos nas igrejas, começaram a sair e ir atras dos sobreviventes, foi difícil fugir, ele eram brutais e sanguinários, velozes, mas graças ao meu bom Deus eu consegui me esconder, bom, se é que agora eu posso mesmo chamar ele de bom, seria isso um teste para ver se somos mesmo fieis após tanto caos e destruição, eu não sei mais, perdi tudo, família e amigos, então já perdi as esperanças e a o principal, a fé.`;

  useEffect(() => {
    const user = authService.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      const savedState = authService.loadGame(user.username);
      if (savedState) setGameState(savedState);
      setStatus(GameStatus.DEVICE_SELECTION);
    }
  }, []);

  const handleAuthSuccess = (user: User) => {
    setLoading(true);
    setLoadingMessage("Sincronizando Alma...");
    setTimeout(() => {
      setCurrentUser(user);
      const savedState = authService.loadGame(user.username);
      if (savedState) setGameState(savedState);
      setStatus(GameStatus.DEVICE_SELECTION);
      setLoading(false);
    }, 1000);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const prepareAndStartStory = async () => {
    setLoading(true);
    setLoadingMessage("Invocando Relatos...");
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Narre este texto em português do Brasil de forma ULTRA RÁPIDA, rítmica, sem pausas dramáticas, ritmo frenético de fuga: ${storyText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        setAudioReady(buffer);
        // SINCRONIZAÇÃO: O tempo da animação agora é o tempo do áudio + um pequeno respiro
        setNarrationDuration(buffer.duration + 5); 
        setLoading(false);
        setStatus(GameStatus.STORY_LETTER);
      }
    } catch (e) {
      setLoading(false);
      setStatus(GameStatus.STORY_LETTER);
    }
  };

  useEffect(() => {
    if (status === GameStatus.STORY_LETTER && audioReady && audioContextRef.current) {
      const ctx = audioContextRef.current;
      const source = ctx.createBufferSource();
      source.buffer = audioReady;
      source.connect(ctx.destination);
      source.onended = () => setIsNarrating(false);
      source.start();
      setIsNarrating(true);
    }
  }, [status, audioReady]);

  const startChapter = async (chapterIdx: number) => {
    setLoading(true);
    setLoadingMessage("Gerando Purgatório...");
    setGameState(prev => ({ ...prev, currentChapter: chapterIdx }));
    const chapter = CHAPTERS[chapterIdx];
    const character = CHARACTERS[gameState.selectedCharacter];
    try {
      const intro = await getChapterIntro(chapter.name, character.name);
      setIntroText(intro);
      setStatus(GameStatus.CUTSCENE);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckpoint = (x: number) => {
    if (currentUser) {
      const newState = { ...gameState, lastCheckpointX: x };
      setGameState(newState);
      authService.saveGame(currentUser.username, newState);
    }
  };

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {loading && (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center animate-fade-in">
           <div className="w-12 h-12 border-4 border-amber-900 border-t-amber-500 animate-spin mb-4"></div>
           <p className="text-amber-500 font-medieval uppercase tracking-[0.2em] text-[10px]">{loadingMessage}</p>
        </div>
      )}
      
      {status === GameStatus.AUTH && <AuthScreen onAuthSuccess={handleAuthSuccess} />}
      
      {status === GameStatus.DEVICE_SELECTION && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6">
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900 border-2 border-zinc-800 p-1 px-3">
             <span className="text-zinc-500 font-medieval text-[8px] uppercase">{currentUser?.username}</span>
             <img src={currentUser?.profilePic} className="w-6 h-6 border border-amber-900" alt="Profile" />
          </div>
          <h2 className="text-3xl font-cinzel text-amber-700 mb-12 uppercase tracking-widest">Portal de Fé</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[DeviceType.DESKTOP, DeviceType.MOBILE, DeviceType.TABLET].map(d => (
              <button 
                key={d} 
                onClick={() => { setGameState(p => ({...p, device: d})); setStatus(GameStatus.START_SCREEN); }} 
                className="p-6 bg-zinc-900 border-2 border-zinc-800 hover:border-amber-600 text-amber-600 font-cinzel uppercase text-xs"
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {status === GameStatus.START_SCREEN && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black relative animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-cinzel text-amber-600 mb-12 tracking-widest text-center px-4">O JUÍZO DOS CÉUS</h1>
          <button 
            onClick={prepareAndStartStory} 
            className="px-12 py-4 bg-zinc-900 border-4 border-amber-900 text-amber-600 font-cinzel text-lg hover:bg-amber-900 hover:text-white transition-all shadow-[8px_8px_0_rgba(120,53,15,0.3)]"
          >
            {gameState.lastCheckpointX > 100 ? 'CONTINUAR PENITÊNCIA' : 'INICIAR PENITÊNCIA'}
          </button>
        </div>
      )}

      {status === GameStatus.STORY_LETTER && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-black px-6 overflow-hidden">
           <div className="max-w-4xl text-center letter-scroll-animation" style={{ '--narration-duration': `${narrationDuration}s` } as any}>
              <div className="text-zinc-300 font-spectral text-lg md:text-2xl italic leading-relaxed space-y-12 pb-[100vh]">
                {storyText.split('\n\n').map((para, i) => <p key={i}>{para}</p>)}
              </div>
           </div>
           {!isNarrating && (
             <button onClick={() => setStatus(GameStatus.MENU)} className="fixed bottom-12 px-12 py-3 bg-zinc-900 border-2 border-amber-600 text-amber-600 font-cinzel uppercase hover:bg-amber-600 hover:text-black z-50">Prosseguir</button>
           )}
        </div>
      )}

      {status === GameStatus.MENU && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 animate-fade-in">
          <h2 className="text-2xl font-cinzel text-amber-600 mb-8 uppercase tracking-[0.2em]">Seleção de Alma</h2>
          
          <div className="flex flex-col md:flex-row gap-12 max-w-6xl w-full items-start">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 flex-1">
              {Object.values(CHARACTERS).map(char => (
                <button 
                  key={char.id} 
                  onClick={() => setGameState(p => ({...p, selectedCharacter: char.id, hp: char.stats.hp, maxHp: char.stats.hp}))}
                  className={`p-4 border-4 transition-all ${gameState.selectedCharacter === char.id ? 'border-amber-500 bg-amber-950/40' : 'border-zinc-900 bg-zinc-900/40 hover:border-zinc-700'}`}
                >
                  <div className="w-12 h-12 bg-zinc-800 flex items-center justify-center mb-2 mx-auto overflow-hidden">
                     <img src={`https://api.dicebear.com/7.x/identicon/svg?seed=${char.id}`} className="w-8 h-8 opacity-70" alt={char.name} />
                  </div>
                  <span className="text-[10px] text-zinc-400 font-cinzel block uppercase text-center">{char.name}</span>
                </button>
              ))}
            </div>

            <div className="w-full md:w-80 bg-zinc-900 border-4 border-amber-900 p-6 animate-fade-in" key={gameState.selectedCharacter}>
               <h3 className="text-amber-500 font-cinzel text-xl mb-2 uppercase">{CHARACTERS[gameState.selectedCharacter].name}</h3>
               <div className="space-y-4 text-[10px] font-medieval uppercase tracking-widest text-zinc-400">
                  <p><span className="text-amber-700">Origem:</span> {CHARACTERS[gameState.selectedCharacter].country}</p>
                  <p><span className="text-amber-700">Arma:</span> {CHARACTERS[gameState.selectedCharacter].weapon}</p>
                  <p><span className="text-amber-700">Habilidade:</span> {CHARACTERS[gameState.selectedCharacter].specialAbility}</p>
                  <div className="h-px bg-zinc-800 my-4"></div>
                  <p className="normal-case font-spectral italic text-xs leading-relaxed">"{CHARACTERS[gameState.selectedCharacter].description}"</p>
               </div>
               <div className="mt-6 flex justify-between gap-2">
                 <div className="flex-1 bg-zinc-950 p-2 border border-zinc-800 text-center">
                    <span className="block text-red-700">HP</span>
                    <span className="text-sm">{CHARACTERS[gameState.selectedCharacter].stats.hp}</span>
                 </div>
                 <div className="flex-1 bg-zinc-950 p-2 border border-zinc-800 text-center">
                    <span className="block text-amber-700">ATK</span>
                    <span className="text-sm">{CHARACTERS[gameState.selectedCharacter].stats.attack}</span>
                 </div>
               </div>
            </div>
          </div>

          <button 
            onClick={() => startChapter(gameState.currentChapter)} 
            className="mt-12 px-20 py-5 bg-amber-600 text-black font-cinzel text-xl hover:bg-amber-500 shadow-[8px_8px_0_rgba(0,0,0,1)]"
          >
            CONFIRMAR PENITENTE
          </button>
        </div>
      )}

      {(status === GameStatus.PLAYING || status === GameStatus.BOSS_FIGHT) && (
        <>
          <HUD 
            hp={gameState.hp} maxHp={gameState.maxHp} currency={gameState.feFragmentada} 
            characterName={CHARACTERS[gameState.selectedCharacter].name} specialReady={true}
            profilePic={currentUser?.profilePic}
          />
          <GameEngine 
            key={gameState.currentChapter}
            character={CHARACTERS[gameState.selectedCharacter]} status={status} device={gameState.device}
            onGameOver={() => setStatus(GameStatus.GAME_OVER)} onVictory={() => setStatus(GameStatus.VICTORY)}
            onCollectCurrency={(amt) => setGameState(p => ({...p, feFragmentada: p.feFragmentada + amt}))}
            chapterIndex={gameState.currentChapter} playerHp={gameState.hp} setPlayerHp={(hp) => setGameState(p => ({...p, hp}))}
            initialX={gameState.lastCheckpointX}
            onCheckpoint={handleCheckpoint}
          />
        </>
      )}

      {status === GameStatus.GAME_OVER && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-[80] animate-fade-in">
           <h2 className="text-6xl font-cinzel text-red-950 mb-12 uppercase">FINADO</h2>
           <button onClick={() => { setGameState(prev => ({ ...prev, hp: prev.maxHp })); setStatus(GameStatus.MENU); }} className="px-12 py-3 border-2 border-zinc-800 text-zinc-500 font-cinzel uppercase">Renascer</button>
        </div>
      )}
      <div className="scanlines"></div>
    </div>
  );
};

export default App;
