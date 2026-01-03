
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { GameStatus, GameState, CharacterId, DeviceType } from './types';
import { HUD } from './components/UI/HUD';
import { GameEngine } from './components/GameEngine';
import { getChapterIntro } from './services/geminiService';
import { CHAPTERS, CHARACTERS } from './constants';

const App: React.FC = () => {
  const [status, setStatus] = useState<GameStatus>(GameStatus.DEVICE_SELECTION);
  const [gameState, setGameState] = useState<GameState>({
    device: DeviceType.DESKTOP,
    currentChapter: 0,
    unlockedChapters: 1,
    feFragmentada: 0,
    selectedCharacter: CharacterId.AZIEL,
    inventory: [],
    hp: CHARACTERS[CharacterId.AZIEL].stats.hp,
    maxHp: CHARACTERS[CharacterId.AZIEL].stats.hp,
    upgrades: {
      attack: 0,
      health: 0,
      specialDuration: 0,
    }
  });

  const [introText, setIntroText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [narrationDuration, setNarrationDuration] = useState<number>(100);
  const [isNarrating, setIsNarrating] = useState<boolean>(false);
  const [audioReady, setAudioReady] = useState<AudioBuffer | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const storyText = `Finalmente o apocalipse que estava na bíblia aconteceu, porem de um jeito bem diferente, achávamos que as pessoas iriam ser arrebatadas e que os pecadores iriam permanecer na terra sofrem, mas oque não sabíamos que cada igreja que foi construída habitavam anjos nos quais se fortaleciam de acordo com a fé das pessoas que frequentavam essas igrejas, e isso vale para qualquer religião. Ninguém imaginava que estávamos criando esses monstros para nossa própria extinção.
O ano era 2050, no dia do juízo final, era um dia comum, mas de repente vimos seres alados descendo do céu, e ficaram parados por mais de duas horas no céu, após esse tempo eles começaram a carregar um poder, uma bola de energia amarelada, e então eles liberaram esses poderes, pelo que percebi, havia um desses em cada grande aglomerado de pessoas, cidades, a explosão desses poderes foi tão grande que devastou essas cidades, ficando apenas ruinas, tudo destruído, não havia muitos sobreviventes.
Os únicos que sobreviveram foram os que estavam fora de cidades, em zona rural, por sorte eu estava em uma viagem, então consegui sobreviver, mas o inferno só estava começando. Depois dessas explosões, os anjos que ficaram adormecidos nas igrejas, começaram a sair e ir atras dos sobreviventes, foi difícil fugir, ele eram brutais e sanguinários, velozes, mas graças ao meu bom Deus eu consegui me esconder, bom, se é que agora eu posso mesmo chamar ele de bom, seria isso um teste para ver se somos mesmo fieis após tanto caos e destruição, eu não sei mais, perdi tudo, família e amigos, então já perdi as esperanças e a o principal, a fé.`;

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
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

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Narre este texto em português do Brasil de forma extremamente sombria, pausada e melancólica: ${storyText}` }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Charon' },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const buffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
        setAudioReady(buffer);
        // Precisely set the duration for CSS sync
        setNarrationDuration(buffer.duration); 
        setLoading(false);
        setStatus(GameStatus.STORY_LETTER);
      } else {
        throw new Error("No audio data");
      }
    } catch (e) {
      console.error("TTS failed:", e);
      setLoading(false);
      // Fallback to story without audio if needed, but here we prioritize the experience
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
    setGameState(prev => ({ ...prev, currentChapter: chapterIdx }));
    setStatus(GameStatus.CUTSCENE);
    setLoading(true);
    const chapter = CHAPTERS[chapterIdx];
    const character = CHARACTERS[gameState.selectedCharacter];
    const intro = await getChapterIntro(chapter.name, character.name);
    setIntroText(intro);
    setLoading(false);
  };

  const selectDevice = (device: DeviceType) => {
    setGameState(prev => ({ ...prev, device }));
    setStatus(GameStatus.START_SCREEN);
  };

  const renderDeviceSelection = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(60,60,60,0.1)_0%,rgba(0,0,0,1)_80%)]"></div>
      
      <div className="relative z-10 text-center max-w-4xl">
        <h2 className="text-4xl md:text-5xl font-cinzel text-amber-700 mb-4 tracking-[0.2em] uppercase">Como enfrentará o Juízo?</h2>
        <p className="text-zinc-500 font-medieval text-xs uppercase tracking-[0.4em] mb-16">Seu instrumento determinará sua sobrevivência</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { id: DeviceType.DESKTOP, label: 'Altar de Vidro', desc: 'Computador (Teclado)', icon: '⌨️' },
            { id: DeviceType.MOBILE, label: 'Selo de Mão', desc: 'Celular (Toque)', icon: '📱' },
            { id: DeviceType.TABLET, label: 'Tábua de Fé', desc: 'Tablet (Toque)', icon: '📖' }
          ].map(d => (
            <button
              key={d.id}
              onClick={() => selectDevice(d.id)}
              className="group p-8 bg-zinc-950/50 border border-zinc-900 hover:border-amber-900 transition-all duration-500 flex flex-col items-center gap-6"
            >
              <span className="text-4xl grayscale group-hover:grayscale-0 transition-all duration-500 group-hover:scale-110">{d.icon}</span>
              <div className="flex flex-col gap-2">
                <span className="text-amber-600 font-cinzel text-xl uppercase tracking-widest">{d.label}</span>
                <span className="text-zinc-600 font-medieval text-[10px] uppercase tracking-wider">{d.desc}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStartScreen = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1519810755548-39cd217da494?auto=format&fit=crop&q=80&w=2000')] bg-cover bg-center opacity-30 mix-blend-overlay scale-110 animate-pulse"></div>
      
      <div className="relative z-10 text-center px-6">
        <h1 className="text-6xl md:text-9xl font-cinzel text-amber-600 mb-4 tracking-tighter drop-shadow-[0_0_30px_rgba(217,119,6,0.6)]">
          O JUÍZO DOS CÉUS
        </h1>
        <p className="text-zinc-400 font-medieval uppercase tracking-[0.6em] mb-16 text-xs md:text-base">
          A Revelação Começou no Outono da Civilização
        </p>
        
        <div className="flex flex-col gap-6 items-center">
          {loading ? (
            <div className="flex flex-col items-center gap-4 bg-black/60 p-8 rounded border border-amber-900/30 backdrop-blur-md">
              <div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-amber-600 font-medieval uppercase tracking-widest text-xs animate-pulse">Invocando Lembranças Sombrias...</p>
            </div>
          ) : (
            <>
              <button 
                onClick={prepareAndStartStory}
                className="group relative px-12 md:px-16 py-4 md:py-5 bg-zinc-950 border border-amber-600/50 text-amber-500 font-cinzel text-xl md:text-2xl hover:bg-amber-600 hover:text-black transition-all duration-500 tracking-[0.3em] overflow-hidden"
              >
                <span className="relative z-10">INICIAR PENITÊNCIA</span>
                <div className="absolute inset-0 bg-amber-500 -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out"></div>
              </button>
              <button 
                onClick={() => setStatus(GameStatus.DEVICE_SELECTION)}
                className="text-zinc-700 font-medieval text-[10px] uppercase tracking-widest hover:text-amber-900 transition-colors"
              >
                Trocar Aparelho ({gameState.device.toUpperCase()})
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  const renderStoryLetter = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050505] relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-40"></div>
      
      <div 
        className="max-w-4xl w-full relative z-10 text-center letter-scroll-animation"
        style={{ '--narration-duration': `${narrationDuration}s` } as React.CSSProperties}
      >
        <div className="mb-10 flex flex-col items-center border-b border-amber-900/30 pb-10">
          <span className="text-amber-700 font-medieval uppercase tracking-[0.5em] text-sm mb-4">Relato do Sobrevivente</span>
          <span className="text-zinc-600 font-medieval text-sm italic">Ano do Juízo - Outono de 2050</span>
          <span className="text-amber-600 font-cinzel text-4xl mt-8">✧</span>
        </div>
        
        <div className="text-zinc-300 font-spectral text-xl md:text-4xl leading-relaxed space-y-16 md:space-y-24 italic text-justify px-4 md:px-8">
          <p>{storyText.split('\n')[0]}</p>
          <p>{storyText.split('\n')[1]}</p>
          <p>{storyText.split('\n')[2]}</p>
        </div>
      </div>

      <div className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4 w-full px-6">
        {!isNarrating && (
           <button 
             onClick={() => {
               if (audioContextRef.current) audioContextRef.current.close();
               audioContextRef.current = null;
               setStatus(GameStatus.MENU);
             }}
             className="w-full max-w-md py-4 bg-zinc-950 border border-amber-600/50 text-amber-500 font-cinzel text-lg md:text-xl hover:bg-amber-600 hover:text-black transition-all duration-500 tracking-[0.3em] shadow-2xl animate-fade-in"
           >
             PROSEGUIR
           </button>
        )}
        
        <button 
          onClick={() => {
            if (audioContextRef.current) audioContextRef.current.close();
            audioContextRef.current = null;
            setStatus(GameStatus.MENU);
          }}
          className="text-zinc-600 font-medieval text-[10px] uppercase tracking-widest hover:text-zinc-400 transition-colors opacity-50 hover:opacity-100"
        >
          [ Pular Relato ]
        </button>
      </div>
    </div>
  );

  const renderCharacterMenu = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-950 p-6 md:p-10 animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none"></div>
      
      <h2 className="text-3xl md:text-4xl font-cinzel text-amber-600 mb-2 tracking-[0.2em] relative z-10 text-center uppercase">ESCOLHA SEU REDENTOR</h2>
      <p className="text-zinc-500 font-medieval text-[10px] uppercase tracking-widest mb-10 md:mb-16 relative z-10 text-center">Cada alma carrega seu próprio fardo</p>
      
      <div className="grid grid-cols-3 md:grid-cols-6 gap-4 md:gap-6 mb-10 md:mb-16 w-full max-w-7xl relative z-10">
        {Object.values(CHARACTERS).map((char) => (
          <button
            key={char.id}
            onClick={() => setGameState(prev => ({ 
              ...prev, 
              selectedCharacter: char.id, 
              hp: char.stats.hp, 
              maxHp: char.stats.hp 
            }))}
            className={`group relative p-4 md:p-6 border-2 transition-all duration-500 ${
              gameState.selectedCharacter === char.id 
              ? 'border-amber-500 bg-amber-950/20 scale-105 md:scale-110 shadow-[0_0_30px_rgba(245,158,11,0.2)]' 
              : 'border-zinc-800 bg-zinc-900/30 hover:border-zinc-700'
            }`}
          >
            <div className="text-center">
               <div className={`w-12 h-12 md:w-20 md:h-20 mx-auto rounded-full mb-2 md:mb-4 flex items-center justify-center border-2 transition-all duration-500 ${
                 gameState.selectedCharacter === char.id ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800'
               }`}>
                  <span className={`text-xl md:text-3xl font-cinzel ${gameState.selectedCharacter === char.id ? 'text-amber-500' : 'text-zinc-500'}`}>
                    {char.name[0]}
                  </span>
               </div>
               <span className="hidden md:block text-[10px] text-zinc-500 uppercase font-medieval mb-1">{char.country}</span>
               <span className="block text-[10px] md:text-sm font-cinzel text-zinc-200 tracking-wider truncate">{char.name.split(' ')[1]}</span>
            </div>
          </button>
        ))}
      </div>

      <div className="text-center max-w-3xl mb-10 md:mb-16 animate-fade-in bg-zinc-900/40 p-6 md:p-8 border border-zinc-800/50 backdrop-blur-sm relative z-10" key={gameState.selectedCharacter}>
          <h3 className="text-2xl md:text-3xl font-cinzel text-amber-500 mb-4 uppercase tracking-wider">{CHARACTERS[gameState.selectedCharacter].name}</h3>
          <p className="text-zinc-300 font-spectral leading-relaxed italic mb-8 text-sm md:text-lg px-2 md:px-6">
            "{CHARACTERS[gameState.selectedCharacter].description}"
          </p>
          <div className="flex justify-center gap-6 md:gap-12 text-[10px] font-medieval text-zinc-500 uppercase tracking-widest border-t border-zinc-800 pt-6">
            <div className="flex flex-col gap-1">
              <span className="text-amber-700/60">Vitalidade</span>
              <span className="text-zinc-200 text-lg">{CHARACTERS[gameState.selectedCharacter].stats.hp}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-amber-700/60">Poder</span>
              <span className="text-zinc-200 text-lg">{CHARACTERS[gameState.selectedCharacter].stats.attack}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-amber-700/60">Agilidade</span>
              <span className="text-zinc-200 text-lg">{CHARACTERS[gameState.selectedCharacter].stats.speed}</span>
            </div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 relative z-10 w-full max-w-md justify-center">
        <button 
          onClick={() => setStatus(GameStatus.START_SCREEN)}
          className="px-8 py-3 border border-zinc-700 text-zinc-500 font-medieval hover:text-zinc-300 transition-colors uppercase tracking-widest text-xs"
        >
          Voltar
        </button>
        <button 
          onClick={() => startChapter(0)}
          className="px-16 py-4 bg-amber-600 text-black font-cinzel text-xl hover:bg-amber-400 transition-all duration-300 tracking-[0.2em] shadow-lg shadow-amber-900/20"
        >
          CONFIRMAR
        </button>
      </div>
    </div>
  );

  const renderCutscene = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black relative overflow-hidden px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(60,60,60,0.1)_0%,rgba(0,0,0,1)_80%)]"></div>
      
      <div className="relative z-10 text-center max-w-2xl">
        {loading ? (
          <div className="flex flex-col items-center gap-6 animate-pulse">
            <div className="w-16 h-16 border-4 border-amber-900 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-amber-700 font-medieval uppercase tracking-[0.5em] text-sm">Invocando Revelações...</p>
          </div>
        ) : (
          <div className="animate-fade-in flex flex-col items-center">
            <span className="text-amber-700 font-medieval uppercase tracking-[0.5em] text-sm mb-12">Capítulo {gameState.currentChapter + 1}</span>
            <h2 className="text-3xl md:text-5xl font-cinzel text-amber-500 mb-8 uppercase tracking-widest">{CHAPTERS[gameState.currentChapter].location}</h2>
            <div className="mb-12">
              <span className="text-amber-600 font-cinzel text-2xl">✧</span>
            </div>
            <p className="text-zinc-300 font-spectral text-xl md:text-2xl leading-relaxed italic mb-16 px-4">
              "{introText}"
            </p>
            <button 
              onClick={() => setStatus(GameStatus.PLAYING)}
              className="px-16 py-4 bg-zinc-950 border border-amber-600/50 text-amber-500 font-cinzel text-xl hover:bg-amber-600 hover:text-black transition-all duration-500 tracking-[0.3em]"
            >
              ENTRAR NO PURGATÓRIO
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      {status === GameStatus.DEVICE_SELECTION && renderDeviceSelection()}
      {status === GameStatus.START_SCREEN && renderStartScreen()}
      {status === GameStatus.STORY_LETTER && renderStoryLetter()}
      {status === GameStatus.MENU && renderCharacterMenu()}
      
      {(status === GameStatus.PLAYING || status === GameStatus.BOSS_FIGHT) && (
        <>
          <HUD 
            hp={gameState.hp} 
            maxHp={gameState.maxHp} 
            currency={gameState.feFragmentada} 
            characterName={CHARACTERS[gameState.selectedCharacter].name}
            specialReady={true}
            bossHp={status === GameStatus.BOSS_FIGHT ? 1200 : undefined}
            bossMaxHp={status === GameStatus.BOSS_FIGHT ? 1200 : undefined}
            bossName={CHAPTERS[gameState.currentChapter].boss}
          />
          <GameEngine 
            character={CHARACTERS[gameState.selectedCharacter]} 
            status={status}
            device={gameState.device}
            onGameOver={() => setStatus(GameStatus.GAME_OVER)}
            onVictory={() => setStatus(GameStatus.VICTORY)}
            onCollectCurrency={(amt) => setGameState(p => ({...p, feFragmentada: p.feFragmentada + amt}))}
            chapterIndex={gameState.currentChapter}
            playerHp={gameState.hp}
            setPlayerHp={(hp) => setGameState(p => ({...p, hp}))}
          />
        </>
      )}

      {status === GameStatus.CUTSCENE && renderCutscene()}

      {status === GameStatus.GAME_OVER && (
        <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 animate-fade-in px-6">
           <div className="absolute inset-0 bg-[radial-gradient(circle,rgba(127,29,29,0.2)_0%,rgba(0,0,0,1)_70%)]"></div>
           <h2 className="text-5xl md:text-9xl font-cinzel text-red-950 mb-6 tracking-tighter opacity-90 relative z-10 drop-shadow-[0_0_20px_rgba(0,0,0,1)] text-center">
             PECADO CONSUMADO
           </h2>
           <button 
             onClick={() => {
               setGameState(prev => ({ ...prev, hp: prev.maxHp }));
               setStatus(GameStatus.MENU);
             }}
             className="relative z-10 px-16 py-4 bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-white hover:border-white transition-all duration-500 font-cinzel tracking-widest text-xl"
           >
             RECOMEÇAR
           </button>
        </div>
      )}

      {status === GameStatus.VICTORY && (
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 animate-fade-in px-6">
           <div className="bg-zinc-900/20 p-12 md:p-24 border border-amber-900/30 text-center shadow-[0_0_150px_rgba(217,119,6,0.15)] backdrop-blur-md">
             <h2 className="text-4xl md:text-8xl font-cinzel text-amber-500 mb-6 tracking-[0.3em]">GLÓRIA</h2>
             <button 
               onClick={() => setStatus(GameStatus.MENU)}
               className="px-14 py-5 bg-amber-600 text-black font-cinzel text-xl hover:bg-amber-400 transition-all duration-300 shadow-xl shadow-amber-900/40"
             >
               AVANÇAR
             </button>
           </div>
        </div>
      )}

      <div className="scanlines"></div>
    </div>
  );
};

export default App;
