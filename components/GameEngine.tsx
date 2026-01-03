
import React, { useEffect, useRef, useCallback } from 'react';
import { Character, GameStatus, Enemy, Projectile } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, GRAVITY, FRICTION } from '../constants';

interface GameEngineProps {
  character: Character;
  status: GameStatus;
  onGameOver: () => void;
  onVictory: () => void;
  onCollectCurrency: (amount: number) => void;
  chapterIndex: number;
  playerHp: number;
  setPlayerHp: (hp: number) => void;
}

export const GameEngine: React.FC<GameEngineProps> = ({ 
  character, 
  status, 
  onGameOver, 
  onVictory, 
  onCollectCurrency,
  chapterIndex,
  playerHp,
  setPlayerHp
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);
  
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
    invulnerable: 0,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const particlesRef = useRef<any[]>([]);
  const platformsRef = useRef<any[]>([]);
  const keysPressed = useRef<Record<string, boolean>>({});

  const initLevel = useCallback(() => {
    platformsRef.current = [
      { x: 0, y: 550, width: CANVAS_WIDTH * 10, height: 50 },
      { x: 400, y: 400, width: 250, height: 20 },
      { x: 800, y: 300, width: 250, height: 20 },
      { x: 1300, y: 450, width: 300, height: 20 },
      { x: 1800, y: 350, width: 300, height: 20 },
    ];

    const enemies: Enemy[] = [];
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
        attackCooldown: 1200 + Math.random() * 800
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
      attackCooldown: 1500
    });

    enemiesRef.current = enemies;
    projectilesRef.current = [];
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

  const update = (time: number) => {
    if (status !== GameStatus.PLAYING && status !== GameStatus.BOSS_FIGHT) {
      requestRef.current = requestAnimationFrame(update);
      return;
    }

    const player = playerRef.current;

    // Direct movement input handling for maximum responsiveness
    let moveDir = 0;
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) {
      moveDir -= 1;
      player.direction = -1;
    }
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) {
      moveDir += 1;
      player.direction = 1;
    }
    
    // Apply acceleration
    if (moveDir !== 0) {
        player.vx += moveDir * character.stats.speed * 0.1;
        // Clamp speed
        const maxS = character.stats.speed;
        if (Math.abs(player.vx) > maxS) player.vx = Math.sign(player.vx) * maxS;
    } else {
        player.vx *= FRICTION;
        if (Math.abs(player.vx) < 0.1) player.vx = 0;
    }

    // Jump
    if ((keysPressed.current['Space'] || keysPressed.current['KeyW']) && !player.isJumping) {
      player.vy = -character.stats.jumpPower;
      player.isJumping = true;
    }

    // Physics
    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Collisions
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
    if (keysPressed.current['KeyF'] || keysPressed.current['KeyJ']) {
      if (time - player.lastAttack > 300) {
        player.isAttacking = true;
        player.lastAttack = time;
        const attackBox = {
          x: player.direction === 1 ? player.x + player.width : player.x - 100,
          y: player.y - 20,
          w: 100,
          h: player.height + 40
        };
        enemiesRef.current.forEach(enemy => {
          if (enemy.state === 'dead') return;
          if (attackBox.x < enemy.x + enemy.width &&
              attackBox.x + attackBox.w > enemy.x &&
              attackBox.y < enemy.y + enemy.height &&
              attackBox.y + attackBox.h > enemy.y) {
            enemy.hp -= character.stats.attack;
            spawnParticle(enemy.x + enemy.width/2, enemy.y + enemy.height/2, '#fff', 12);
            if (enemy.hp <= 0) {
              enemy.state = 'dead';
              onCollectCurrency(enemy.id === 'boss' ? 1000 : 50);
              if (enemy.id === 'boss') onVictory();
            }
          }
        });
        setTimeout(() => { player.isAttacking = false; }, 150);
      }
    }

    // AI and Projectiles
    projectilesRef.current.forEach((proj, idx) => {
      proj.x += proj.vx;
      proj.y += proj.vy;
      const d = Math.hypot(proj.x - (player.x + player.width/2), proj.y - (player.y + player.height/2));
      if (d < proj.radius + 20 && player.invulnerable <= 0) {
        setPlayerHp(Math.max(0, playerHp - 20));
        player.invulnerable = 60;
        spawnParticle(player.x, player.y, '#f00', 15);
        projectilesRef.current.splice(idx, 1);
      }
      if (Math.abs(proj.x - player.x) > 1500) projectilesRef.current.splice(idx, 1);
    });

    enemiesRef.current.forEach(enemy => {
      if (enemy.state === 'dead') return;
      const distToPlayer = Math.abs(player.x - enemy.x);
      if (enemy.id === 'boss') {
        if (distToPlayer < 1000) {
          enemy.direction = player.x < enemy.x ? -1 : 1;
          if (distToPlayer > 120) enemy.x += enemy.direction * enemy.speed;
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
          enemy.x += enemy.direction * enemy.speed;
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
        spawnParticle(player.x, player.y, '#f00', 10);
      }
    });

    if (player.invulnerable > 0) player.invulnerable--;
    particlesRef.current.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy; p.life -= 0.02;
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    });

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
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(-offsetX, 0);

    // Render floor segments
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 550, CANVAS_WIDTH * 10, 50);

    platformsRef.current.forEach(p => {
      ctx.fillStyle = '#111';
      ctx.fillRect(p.x, p.y, p.width, p.height);
      ctx.strokeStyle = '#222';
      ctx.strokeRect(p.x, p.y, p.width, p.height);
    });

    projectilesRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill();
    });

    enemiesRef.current.forEach(e => {
      if (e.state === 'dead') return;
      ctx.fillStyle = e.id === 'boss' ? '#fbbf24' : (e.type === 'ANGEL' ? '#fff' : '#7f1d1d');
      ctx.fillRect(e.x, e.y, e.width, e.height);
      ctx.fillStyle = '#000'; ctx.fillRect(e.x, e.y - 12, e.width, 5);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(e.x, e.y - 12, (e.hp/e.maxHp) * e.width, 5);
    });

    if (player.invulnerable % 10 > 5) ctx.globalAlpha = 0.4;
    ctx.fillStyle = character.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    if (player.isAttacking) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      const hitX = player.direction === 1 ? player.x + player.width : player.x - 100;
      ctx.fillRect(hitX, player.y - 10, 100, player.height + 20);
    }
    ctx.globalAlpha = 1.0;

    particlesRef.current.forEach(p => {
      ctx.fillStyle = p.color; ctx.globalAlpha = p.life; ctx.fillRect(p.x, p.y, 4, 4);
    });

    ctx.restore();
  };

  useEffect(() => {
    initLevel();
    requestRef.current = requestAnimationFrame(update);
    return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, [initLevel, status]);

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center">
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="shadow-[0_0_100px_rgba(0,0,0,1)] border-y border-zinc-900"/>
    </div>
  );
};
