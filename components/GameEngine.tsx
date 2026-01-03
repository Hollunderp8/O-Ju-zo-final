
import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Character, GameStatus, Enemy, Projectile, DeviceType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, FRICTION } from '../constants';

interface GameEngineProps {
  character: Character;
  status: GameStatus;
  device: DeviceType;
  onGameOver: () => void;
  onVictory: () => void;
  onCollectCurrency: (amount: number) => void;
  chapterIndex: number;
  playerHp: number;
  setPlayerHp: (hp: number) => void;
}

interface DamageText {
  x: number;
  y: number;
  value: number;
  life: number;
  color: string;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  character, 
  status, 
  device,
  onGameOver, 
  onVictory, 
  onCollectCurrency,
  chapterIndex,
  playerHp,
  setPlayerHp
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  
  const playerRef = useRef({
    x: 100,
    y: 300,
    vx: 0,
    vy: 0,
    width: 40,
    height: 60,
    isJumping: false,
    lastAttack: 0,
    specialCooldown: 0,
    direction: 1,
    isAttacking: false,
    attackFrame: 0,
    invulnerable: 0,
  });

  const enemiesRef = useRef<(Enemy & { hitFlash: number, knockback: number })[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<any[]>([]);
  const damageTextsRef = useRef<DamageText[]>([]);
  const platformsRef = useRef<any[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const virtualButtons = useRef<Record<string, boolean>>({});
  const shakeRef = useRef(0);

  const handleResize = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
    const currentRatio = cw / ch;

    let finalScale = 1;
    if (currentRatio > targetRatio) {
      finalScale = ch / CANVAS_HEIGHT;
    } else {
      finalScale = cw / CANVAS_WIDTH;
    }
    setScale(finalScale);
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const initLevel = useCallback(() => {
    platformsRef.current = [
      { x: 0, y: 550, width: CANVAS_WIDTH * 10, height: 50 },
      { x: 400, y: 400, width: 250, height: 20 },
      { x: 800, y: 300, width: 250, height: 20 },
      { x: 1300, y: 450, width: 300, height: 20 },
      { x: 1800, y: 350, width: 300, height: 20 },
    ];

    const enemies: (Enemy & { hitFlash: number, knockback: number })[] = [];
    for (let i = 0; i < 12; i++) {
      enemies.push({
        id: `e-${i}`,
        type: i % 3 === 0 ? 'ANGEL' : 'CORRUPTED',
        x: 1200 + i * 500,
        y: 400,
        hp: 80,
        maxHp: 80,
        width: 45,
        height: 55,
        speed: i % 2 === 0 ? 3 : 2,
        state: 'patrol',
        direction: -1,
        lastAttack: 0,
        attackCooldown: 1200 + Math.random() * 800,
        hitFlash: 0,
        knockback: 0
      });
    }

    enemies.push({
      id: 'boss',
      type: 'BOSS',
      x: CANVAS_WIDTH * 4,
      y: 350,
      hp: 1200,
      maxHp: 1200,
      width: 140,
      height: 200,
      speed: 2.5,
      state: 'idle',
      direction: -1,
      lastAttack: 0,
      attackCooldown: 1500,
      hitFlash: 0,
      knockback: 0
    });

    enemiesRef.current = enemies;
    projectilesRef.current = [];
    damageTextsRef.current = [];
    playerRef.current.x = 100;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;
    setPlayerHp(character.stats.hp);
  }, [character, setPlayerHp]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const spawnParticle = (x: number, y: number, color: string, count: number = 8) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x, y,
        vx: (Math.random() - 0.5) * 12,
        vy: (Math.random() - 0.5) * 12,
        life: 1.0,
        color
      });
    }
  };

  const spawnDamageText = (x: number, y: number, value: number, color: string = '#fff') => {
    damageTextsRef.current.push({
      x, y, value, life: 1.0, color
    });
  };

  const update = (time: number) => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.BOSS_FIGHT) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const player = playerRef.current;

    // Movement logic - Combines physical and virtual
    let moveDir = 0;
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft'] || virtualButtons.current['left']) {
      moveDir -= 1;
      player.direction = -1;
    }
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight'] || virtualButtons.current['right']) {
      moveDir += 1;
      player.direction = 1;
    }
    
    if (moveDir !== 0) {
        player.vx += moveDir * character.stats.speed * 0.1;
        const maxS = character.stats.speed;
        if (Math.abs(player.vx) > maxS) player.vx = Math.sign(player.vx) * maxS;
    } else {
        player.vx *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    if ((keysPressed.current['Space'] || keysPressed.current['KeyW'] || virtualButtons.current['jump']) && !player.isJumping) {
      player.vy = -character.stats.jumpPower;
      player.isJumping = true;
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Boundary check
    if (player.x < 0) player.x = 0;

    platformsRef.current.forEach(p => {
      if (player.x + player.width > p.x && player.x < p.x + p.width) {
        if (player.y + player.height > p.y && player.y + player.height < p.y + p.height + player.vy) {
          player.y = p.y - player.height;
          player.vy = 0;
          player.isJumping = false;
        }
      }
    });

    // Attacks
    if (keysPressed.current['KeyF'] || keysPressed.current['KeyJ'] || virtualButtons.current['attack']) {
      if (time - player.lastAttack > 400) {
        player.isAttacking = true;
        player.lastAttack = time;
        player.attackFrame = 10;
        
        const attackBox = {
          x: player.direction === 1 ? player.x + player.width : player.x - 120,
          y: player.y - 30,
          w: 120,
          h: player.height + 60
        };

        let hitAnything = false;

        enemiesRef.current.forEach(enemy => {
          if (enemy.state === 'dead') return;
          if (attackBox.x < enemy.x + enemy.width &&
              attackBox.x + attackBox.w > enemy.x &&
              attackBox.y < enemy.y + enemy.height &&
              attackBox.y + attackBox.h > enemy.y) {
            
            const damage = character.stats.attack + Math.floor(Math.random() * 5);
            enemy.hp -= damage;
            enemy.hitFlash = 10;
            enemy.knockback = player.direction * 15;
            hitAnything = true;

            spawnDamageText(enemy.x + enemy.width / 2, enemy.y, damage, '#facc15');
            spawnParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, enemy.type === 'CORRUPTED' ? '#7f1d1d' : '#fff', 15);
            
            if (enemy.hp <= 0) {
              enemy.state = 'dead';
              shakeRef.current = 15;
              onCollectCurrency(enemy.id === 'boss' ? 1000 : 50);
              if (enemy.id === 'boss') onVictory();
            }
          }
        });

        if (hitAnything) shakeRef.current = 8;
        setTimeout(() => { player.isAttacking = false; }, 200);
      }
    }

    if (player.attackFrame > 0) player.attackFrame--;

    // Projectiles
    projectilesRef.current.forEach((proj, idx) => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      const d = Math.hypot(proj.x - (player.x + player.width/2), proj.y - (player.y + player.height/2));
      if (d < proj.radius + 20 && player.invulnerable <= 0) {
        setPlayerHp(Math.max(0, playerHp - 20));
        player.invulnerable = 60;
        shakeRef.current = 10;
        spawnParticle(player.x, player.y, '#f00', 15);
        projectilesRef.current.splice(idx, 1);
      }
      if (Math.abs(proj.x - player.x) > 1500) projectilesRef.current.splice(idx, 1);
    });

    // Enemies AI & React
    enemiesRef.current.forEach(enemy => {
      if (enemy.state === 'dead') return;
      
      if (Math.abs(enemy.knockback) > 0.5) {
        enemy.x += enemy.knockback;
        enemy.knockback *= 0.8;
      }

      if (enemy.hitFlash > 0) enemy.hitFlash--;

      const distToPlayer = Math.abs(player.x - enemy.x);
      if (enemy.id === 'boss') {
        if (distToPlayer < 1000) {
          enemy.direction = player.x < enemy.x ? -1 : 1;
          if (distToPlayer > 120 && enemy.hitFlash === 0) enemy.x += enemy.direction * enemy.speed;
          if (time - enemy.lastAttack > enemy.attackCooldown!) {
            enemy.lastAttack = time;
            for(let i=-2; i<=2; i++) {
              projectilesRef.current.push({
                x: enemy.x + enemy.width/2,
                y: enemy.y + enemy.height/2,
                vx: enemy.direction * 8, vy: i * 2.5, radius: 15, color: '#facc15', owner: 'enemy'
              });
            }
          }
        }
      } else {
        if (distToPlayer < 600) {
          enemy.direction = player.x < enemy.x ? -1 : 1;
          if (enemy.hitFlash === 0) enemy.x += enemy.direction * enemy.speed;
          
          if (enemy.type === 'ANGEL' && time - enemy.lastAttack > enemy.attackCooldown!) {
            enemy.lastAttack = time;
            projectilesRef.current.push({
              x: enemy.x, y: enemy.y + 10, vx: enemy.direction * 9, vy: (player.y - enemy.y) / 40,
              radius: 8, color: '#ffffff', owner: 'enemy'
            });
          }
        }
      }

      if (Math.abs(player.x - enemy.x) < 50 && Math.abs(player.y - enemy.y) < 60 && player.invulnerable <= 0) {
        setPlayerHp(Math.max(0, playerHp - 15));
        player.invulnerable = 60;
        shakeRef.current = 10;
        spawnParticle(player.x, player.y, '#f00', 10);
      }
    });

    if (player.invulnerable > 0) player.invulnerable--;
    if (playerHp <= 0) onGameOver();
    
    // Cleanup
    particlesRef.current.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    });

    damageTextsRef.current.forEach((dt, i) => {
      dt.y -= 1.5; dt.life -= 0.02;
      if (dt.life <= 0) damageTextsRef.current.splice(i, 1);
    });

    if (shakeRef.current > 0) shakeRef.current *= 0.9;
    if (shakeRef.current < 0.1) shakeRef.current = 0;

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const offsetX = player.x - CANVAS_WIDTH / 2;
    
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    if (shakeRef.current > 0) {
      ctx.translate((Math.random() - 0.5) * shakeRef.current, (Math.random() - 0.5) * shakeRef.current);
    }
    ctx.translate(-offsetX, 0);

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 550, CANVAS_WIDTH * 10, 50);

    platformsRef.current.forEach(p => {
      ctx.fillStyle = '#111';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#222';
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    projectilesRef.current.forEach(p => {
      ctx.shadowBlur = 15;
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    enemiesRef.current.forEach(e => {
      if (e.state === 'dead') return;
      ctx.save();
      if (e.hitFlash > 0) ctx.filter = 'brightness(3) contrast(2) grayscale(1)';
      ctx.fillStyle = e.id === 'boss' ? '#fbbf24' : (e.type === 'ANGEL' ? '#fff' : '#7f1d1d');
      ctx.fillRect(e.x, e.y, e.width, e.height);
      ctx.restore();
      ctx.fillStyle = '#000'; ctx.fillRect(e.x, e.y - 12, e.width, 5);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x, e.y - 12, (e.hp/e.maxHp) * e.width, 5);
    });

    if (player.invulnerable % 10 > 5) ctx.globalAlpha = 0.4;
    ctx.fillStyle = character.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    
    if (player.isAttacking || player.attackFrame > 0) {
      const alpha = player.attackFrame / 10;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.4})`;
      const hitX = player.direction === 1 ? player.x + player.width : player.x - 120;
      ctx.fillRect(hitX, player.y - 30, 120, player.height + 60);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (player.direction === 1) ctx.arc(player.x + player.width, player.y + player.height/2, 80, -Math.PI/2.5, Math.PI/2.5);
      else ctx.arc(player.x, player.y + player.height/2, 80, Math.PI - Math.PI/2.5, Math.PI + Math.PI/2.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, 4, 4);
    });

    damageTextsRef.current.forEach(dt => {
      ctx.fillStyle = dt.color; ctx.globalAlpha = dt.life;
      ctx.font = 'bold 20px MedievalSharp';
      ctx.fillText(dt.value.toString(), dt.x, dt.y);
    });

    ctx.restore();
  };

  useEffect(() => {
    initLevel();
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [initLevel, status]);

  const setBtn = (btn: string, active: boolean) => {
    virtualButtons.current[btn] = active;
  };

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div 
        style={{ transform: `scale(${scale})`, transformOrigin: 'center center', width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
        className="relative shadow-[0_0_100px_rgba(0,0,0,1)] bg-black"
      >
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-full"/>
      </div>

      {(device === DeviceType.MOBILE || device === DeviceType.TABLET) && (
        <div className="fixed inset-0 pointer-events-none z-50 flex flex-col justify-end p-8 md:p-12">
          <div className="flex justify-between items-end w-full">
            {/* Left Stick */}
            <div className="flex gap-4 pointer-events-auto">
              <button 
                onMouseDown={() => setBtn('left', true)} onMouseUp={() => setBtn('left', false)}
                onTouchStart={(e) => { e.preventDefault(); setBtn('left', true); }} onTouchEnd={(e) => { e.preventDefault(); setBtn('left', false); }}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-zinc-900/40 border-2 border-amber-900/30 flex items-center justify-center text-amber-700 active:bg-amber-900/40 active:border-amber-500"
              >
                <span className="text-2xl md:text-4xl">◀</span>
              </button>
              <button 
                onMouseDown={() => setBtn('right', true)} onMouseUp={() => setBtn('right', false)}
                onTouchStart={(e) => { e.preventDefault(); setBtn('right', true); }} onTouchEnd={(e) => { e.preventDefault(); setBtn('right', false); }}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-zinc-900/40 border-2 border-amber-900/30 flex items-center justify-center text-amber-700 active:bg-amber-900/40 active:border-amber-500"
              >
                <span className="text-2xl md:text-4xl">▶</span>
              </button>
            </div>

            {/* Right Buttons */}
            <div className="flex gap-4 pointer-events-auto">
              <button 
                onMouseDown={() => setBtn('attack', true)} onMouseUp={() => setBtn('attack', false)}
                onTouchStart={(e) => { e.preventDefault(); setBtn('attack', true); }} onTouchEnd={(e) => { e.preventDefault(); setBtn('attack', false); }}
                className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-red-950/40 border-2 border-red-900/30 flex flex-col items-center justify-center text-red-700 active:bg-red-800/40 active:border-red-500"
              >
                <span className="text-xs font-medieval uppercase mb-1">Golpe</span>
                <span className="text-2xl md:text-4xl">⚔️</span>
              </button>
              <button 
                onMouseDown={() => setBtn('jump', true)} onMouseUp={() => setBtn('jump', false)}
                onTouchStart={(e) => { e.preventDefault(); setBtn('jump', true); }} onTouchEnd={(e) => { e.preventDefault(); setBtn('jump', false); }}
                className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-amber-950/40 border-2 border-amber-900/30 flex flex-col items-center justify-center text-amber-700 active:bg-amber-800/40 active:border-amber-500"
              >
                <span className="text-[10px] font-medieval uppercase mb-1">Salto</span>
                <span className="text-xl md:text-2xl">▲</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
