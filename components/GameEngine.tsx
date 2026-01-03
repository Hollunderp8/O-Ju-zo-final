
import React, { useEffect, useRef, useCallback, useState, useMemo } from 'react';
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
  initialX: number;
  onCheckpoint: (x: number) => void;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  character, status, device, onGameOver, onVictory, onCollectCurrency, 
  chapterIndex, playerHp, setPlayerHp, initialX, onCheckpoint 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const [scale, setScale] = useState(1);
  
  const playerRef = useRef({
    x: initialX,
    y: 300,
    vx: 0,
    vy: 0,
    width: 32,
    height: 48,
    isJumping: false,
    lastAttack: 0,
    direction: 1,
    isAttacking: false,
    attackFrame: 0,
    invulnerable: 0,
  });

  const lastSavedCheckpoint = useRef(initialX);
  const enemiesRef = useRef<any[]>([]);
  const damageTextsRef = useRef<any[]>([]);
  const platformsRef = useRef<any[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});
  const hasInitialized = useRef(false);

  // FUNDO DE RUÍNAS PIXEL ART DETALHADO
  const drawBackground = (ctx: CanvasRenderingContext2D, offsetX: number) => {
    ctx.fillStyle = '#05050a';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Prédios distantes (Silhuetas)
    ctx.fillStyle = '#0a0a15';
    for (let i = 0; i < 20; i++) {
        const x = (i * 180 - (offsetX * 0.1)) % (CANVAS_WIDTH + 400);
        const h = 120 + Math.sin(i * 3) * 60;
        ctx.fillRect(Math.floor(x), CANVAS_HEIGHT - h, 60, h);
    }

    // Prédios médios com janelas e detalhes
    ctx.fillStyle = '#0f0f1c';
    for (let i = 0; i < 12; i++) {
        const x = (i * 320 - (offsetX * 0.3)) % (CANVAS_WIDTH + 600);
        const h = 250 + Math.cos(i) * 100;
        ctx.fillRect(Math.floor(x), CANVAS_HEIGHT - h, 100, h);
        
        // Janelas e Dithering
        ctx.fillStyle = '#000';
        for (let j = 0; j < 6; j++) {
            ctx.fillRect(Math.floor(x + 15), CANVAS_HEIGHT - h + 40 + (j * 40), 15, 20);
            ctx.fillRect(Math.floor(x + 70), CANVAS_HEIGHT - h + 40 + (j * 40), 15, 20);
        }
        // Faixas de luz de fogo (Efeito pixel)
        if (i % 3 === 0) {
            ctx.fillStyle = '#441100';
            ctx.fillRect(Math.floor(x + 40), CANVAS_HEIGHT - h + 10, 20, 10);
        }
    }

    // Camada Próxima (Ruínas escuras)
    ctx.fillStyle = '#14141f';
    for (let i = 0; i < 8; i++) {
        const x = (i * 500 - (offsetX * 0.6)) % (CANVAS_WIDTH + 1000);
        const h = 350 + Math.sin(i) * 120;
        ctx.fillRect(Math.floor(x), CANVAS_HEIGHT - h, 150, h);
        // "Vigas" de aço expostas
        ctx.fillStyle = '#222233';
        ctx.fillRect(Math.floor(x + 10), CANVAS_HEIGHT - h - 20, 4, 30);
        ctx.fillRect(Math.floor(x + 130), CANVAS_HEIGHT - h - 15, 4, 25);
    }
  };

  const initLevel = useCallback(() => {
    if (hasInitialized.current) return;
    
    platformsRef.current = [
      { x: 0, y: 550, width: CANVAS_WIDTH * 50, height: 60 },
      { x: 400, y: 420, width: 220, height: 20 },
      { x: 850, y: 320, width: 220, height: 20 },
      { x: 1300, y: 450, width: 400, height: 20 },
      { x: 2000, y: 380, width: 300, height: 20 },
      { x: 2600, y: 440, width: 250, height: 20 },
    ];

    enemiesRef.current = Array.from({ length: 40 }).map((_, i) => ({
        id: `e-${i}`, 
        type: i % 4 === 0 ? 'ANGEL' : 'CORRUPTED',
        x: 1500 + i * 650, 
        y: 480, 
        hp: 60, maxHp: 60, width: 32, height: 48,
        speed: 1.5, state: 'patrol', direction: -1, 
        lastAttack: 0, attackCooldown: 1800, 
        isAttacking: false, hitFlash: 0, patrolRange: 150, startX: 1500 + i * 650
    }));

    hasInitialized.current = true;
  }, []);

  const update = useCallback((time: number) => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.BOSS_FIGHT) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const player = playerRef.current;
    let moveDir = 0;
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) moveDir -= 1;
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) moveDir += 1;
    
    if (moveDir !== 0) {
        player.vx += moveDir * 0.9;
        player.direction = Math.sign(moveDir);
        if (Math.abs(player.vx) > character.stats.speed) player.vx = player.direction * character.stats.speed;
    } else {
        player.vx *= FRICTION;
    }

    if ((keysPressed.current['Space'] || keysPressed.current['ArrowUp'] || keysPressed.current['KeyW']) && !player.isJumping) {
      player.vy = -character.stats.jumpPower;
      player.isJumping = true;
    }

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Colisão Plataformas
    platformsRef.current.forEach(p => {
      if (player.x + player.width > p.x && player.x < p.x + p.width) {
        if (player.y + player.height > p.y && player.y + player.height < p.y + p.height + player.vy) {
          player.y = p.y - player.height;
          player.vy = 0;
          player.isJumping = false;
        }
      }
    });

    // Filtro DEFINITIVO de inimigos (Garanti que eles não resetem ao re-renderizar)
    enemiesRef.current = enemiesRef.current.filter(e => e.hp > 0);

    enemiesRef.current.forEach(e => {
        const distToPlayer = Math.abs(player.x - e.x);
        const yDist = Math.abs(player.y - e.y);

        if (distToPlayer < 300 && yDist < 150) {
            e.state = 'aggro';
            e.direction = player.x < e.x ? -1 : 1;
            
            if (distToPlayer < 65 && time - e.lastAttack > e.attackCooldown) {
                e.isAttacking = true;
                e.lastAttack = time;
                setTimeout(() => { e.isAttacking = false; }, 400);
                
                if (Math.abs(player.x - e.x) < 70 && player.invulnerable <= 0) {
                    setPlayerHp(Math.max(0, playerHp - 18));
                    player.invulnerable = 60;
                }
            }
            if (!e.isAttacking) e.x += e.direction * e.speed * 1.6;
        } else {
            e.state = 'patrol';
            e.x += e.direction * e.speed;
            if (Math.abs(e.x - e.startX) > e.patrolRange) e.direction *= -1;
        }
        if (e.hitFlash > 0) e.hitFlash--;
    });

    // Ataque
    if ((keysPressed.current['KeyF'] || keysPressed.current['KeyJ'] || keysPressed.current['ControlLeft']) && time - player.lastAttack > 350) {
        player.isAttacking = true;
        player.lastAttack = time;
        player.attackFrame = 10;
        
        enemiesRef.current.forEach(enemy => {
          const dist = Math.abs(player.x + (player.direction * 40) - enemy.x);
          if (dist < 75 && Math.abs(player.y - enemy.y) < 70) {
            enemy.hp -= character.stats.attack;
            enemy.hitFlash = 10;
            if (enemy.hp <= 0) {
              onCollectCurrency(25);
              damageTextsRef.current.push({ x: enemy.x, y: enemy.y, value: '+25 FÉ', life: 1.5, color: '#fbbf24' });
            }
          }
        });
    }

    if (player.attackFrame > 0) player.attackFrame--;
    if (player.attackFrame === 0) player.isAttacking = false;
    if (player.invulnerable > 0) player.invulnerable--;
    if (playerHp <= 0) onGameOver();

    // Checkpoint
    const currentPoint = Math.floor(player.x / 3000) * 3000;
    if (currentPoint > lastSavedCheckpoint.current) {
      lastSavedCheckpoint.current = currentPoint;
      onCheckpoint(currentPoint);
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  }, [character, status, playerHp, onGameOver, onCollectCurrency, onCheckpoint, setPlayerHp]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const player = playerRef.current;
    const offsetX = Math.floor(player.x - CANVAS_WIDTH / 2);

    drawBackground(ctx, offsetX);
    
    ctx.save();
    ctx.translate(-offsetX, 0);

    // Plataformas
    platformsRef.current.forEach(p => {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.width, p.height);
      ctx.strokeStyle = '#2d2d50';
      ctx.lineWidth = 4;
      ctx.strokeRect(Math.floor(p.x), Math.floor(p.y), p.width, p.height);
    });

    // Inimigos
    enemiesRef.current.forEach(e => {
        const bodyColor = e.hitFlash > 0 ? '#fff' : (e.isAttacking ? '#ff3333' : (e.type === 'ANGEL' ? '#e2e2e2' : '#4a1111'));
        ctx.fillStyle = bodyColor;
        // Corpo Base
        ctx.fillRect(Math.floor(e.x), Math.floor(e.y), 32, 48);
        // Capuz/Cabeça
        ctx.fillStyle = '#000';
        ctx.fillRect(Math.floor(e.x + 4), Math.floor(e.y + 4), 24, 16);
        // Olho Brilhante
        ctx.fillStyle = e.type === 'ANGEL' ? '#00ffff' : '#ff0000';
        ctx.fillRect(Math.floor(e.x + (e.direction === 1 ? 20 : 6)), Math.floor(e.y + 10), 6, 6);
        // Asas
        ctx.fillStyle = e.type === 'ANGEL' ? 'rgba(255,255,255,0.2)' : 'rgba(120,0,0,0.2)';
        ctx.fillRect(Math.floor(e.x - 10), Math.floor(e.y + 8), 10, 30);
        ctx.fillRect(Math.floor(e.x + 32), Math.floor(e.y + 8), 10, 30);
    });

    // Player (Penitente Detalhado)
    if (player.invulnerable % 10 < 5) {
      // Manto
      ctx.fillStyle = character.color;
      ctx.fillRect(Math.floor(player.x), Math.floor(player.y), 32, 48);
      // Detalhe de cinto
      ctx.fillStyle = '#444';
      ctx.fillRect(Math.floor(player.x), Math.floor(player.y + 24), 32, 6);
      // Cabeça
      ctx.fillStyle = '#e5c09f';
      ctx.fillRect(Math.floor(player.x + 6), Math.floor(player.y - 6), 20, 18);
      // Cabelo/Capuz superior
      ctx.fillStyle = '#111';
      ctx.fillRect(Math.floor(player.x + 4), Math.floor(player.y - 8), 24, 6);
      // Olhos
      ctx.fillStyle = '#000';
      ctx.fillRect(Math.floor(player.x + (player.direction === 1 ? 20 : 6)), Math.floor(player.y + 2), 6, 6);
    }
    
    // Slash de Ataque
    if (player.isAttacking) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        const slashX = player.direction === 1 ? player.x + 32 : player.x - 48;
        ctx.fillRect(Math.floor(slashX), Math.floor(player.y + 8), 48, 32);
        ctx.fillStyle = '#fff';
        ctx.fillRect(Math.floor(slashX + (player.direction === 1 ? 0 : 44)), Math.floor(player.y + 8), 4, 32);
    }

    damageTextsRef.current.forEach((dt, i) => {
        ctx.fillStyle = dt.color;
        ctx.font = 'bold 12px MedievalSharp';
        ctx.fillText(dt.value, Math.floor(dt.x), Math.floor(dt.y));
        dt.y -= 0.6; dt.life -= 0.03;
        if (dt.life <= 0) damageTextsRef.current.splice(i, 1);
    });

    ctx.restore();
  }, [character, drawBackground]);

  useEffect(() => {
    initLevel();
    const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    requestRef.current = requestAnimationFrame(update);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [update, initLevel]);

  useEffect(() => {
    const handleResize = () => {
        if (!containerRef.current) return;
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        const targetRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        setScale(cw / ch > targetRatio ? ch / CANVAS_HEIGHT : cw / CANVAS_WIDTH);
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
      <div style={{ transform: `scale(${scale})`, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }} className="relative bg-black border-4 border-zinc-900 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)]">
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="block w-full h-full" style={{ imageRendering: 'pixelated' }}/>
      </div>
    </div>
  );
};
