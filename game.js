const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayScore = document.getElementById('overlayScore');
const restartBtn = document.getElementById('restartBtn');

canvas.width = 800;
canvas.height = 450;

// ---- 定数 ----
const GRAVITY = 0.5;
const JUMP_FORCE = -11;
const PLAYER_SPEED = 4;
const WORLD_WIDTH = 4000;

// 星（決定論的配置）
const stars = [];
for (let i = 0; i < 220; i++) {
  stars.push({
    x: (i * 2731 + 500) % WORLD_WIDTH,
    y: (i * 1019 + 80)  % 290,
    r: (i % 5) * 0.28 + 0.4,
  });
}

// ---- サイバーパンク都市ビル（決定論的配置）----
const FAR_TILE = 900;
const MID_TILE = 780;

const farBuildings = [];
{ let bx = 0; for (let i = 0; bx < FAR_TILE + 80; i++) {
    const w = 35 + (i * 53) % 65, h = 90 + (i * 71) % 140;
    farBuildings.push({x: bx, w, h, accent: i % 3});
    bx += w + 3 + (i * 13) % 18;
}}

const midBuildings = [];
{ let bx = 0; for (let i = 0; bx < MID_TILE + 60; i++) {
    const w = 24 + (i * 41) % 54, h = 55 + (i * 61) % 88;
    midBuildings.push({x: bx, w, h, accent: i % 4});
    bx += w + 2 + (i * 11) % 14;
}}

let neonTime = 0; // ネオンアニメ用カウンタ

// ---- キー入力 ----
const keys = {};
window.addEventListener('keydown', e => { keys[e.code] = true; });
window.addEventListener('keyup',   e => { keys[e.code] = false; });

// ---- ゲーム状態 ----
let score, lives, cameraX, gameState, animFrame;

// ---- プレイヤー ----
const player = {
  w: 32, h: 40,
  reset() {
    this.x = 100; this.y = 200;
    this.vx = 0; this.vy = 0;
    this.onGround = false;
    this.jumping = false;
    this.facingRight = true;
    this.frame = 0; this.frameTimer = 0;
    this.invincible = 0;
  },
  update() {
    // 横移動
    if (keys['ArrowLeft']  || keys['KeyA']) { this.vx = -PLAYER_SPEED; this.facingRight = false; }
    else if (keys['ArrowRight'] || keys['KeyD']) { this.vx = PLAYER_SPEED;  this.facingRight = true; }
    else this.vx = 0;

    // ジャンプ
    if ((keys['ArrowUp'] || keys['KeyW'] || keys['Space']) && this.onGround && !this.jumping) {
      this.vy = JUMP_FORCE;
      this.onGround = false;
      this.jumping = true;
    }
    if (!(keys['ArrowUp'] || keys['KeyW'] || keys['Space'])) this.jumping = false;

    this.vy += GRAVITY;
    this.x += this.vx;
    this.y += this.vy;

    // 地面（フォールバック）
    if (this.y + this.h > WORLD_WIDTH) this.y = WORLD_WIDTH - this.h;

    // プラットフォーム衝突
    this.onGround = false;
    for (const p of platforms) {
      if (collideRect(this, p)) {
        // 上から乗る
        if (this.vy >= 0 && this.y + this.h - this.vy <= p.y + 1) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
        }
        // 下から頭突き
        else if (this.vy < 0 && this.y - this.vy >= p.y + p.h - 1) {
          this.y = p.y + p.h;
          this.vy = 0;
        }
        // 横
        else if (this.vx > 0) { this.x = p.x - this.w; }
        else if (this.vx < 0) { this.x = p.x + p.w; }
      }
    }

    // 左端制限
    if (this.x < 0) this.x = 0;

    if (this.invincible > 0) this.invincible--;

    // アニメーションフレーム
    if (this.vx !== 0 && this.onGround) {
      this.frameTimer++;
      if (this.frameTimer > 8) { this.frame = (this.frame + 1) % 4; this.frameTimer = 0; }
    } else if (!this.onGround) { this.frame = 2; }
    else { this.frame = 0; }
  },
  draw() {
    if (this.invincible > 0 && Math.floor(this.invincible / 5) % 2 === 0) return;
    const sx = this.x - cameraX;
    const cx = sx + this.w / 2;   // キャラ中心X
    const top = this.y;

    ctx.save();
    if (!this.facingRight) {
      ctx.translate(cx * 2, 0);
      ctx.scale(-1, 1);
    }

    const legOffset = [0, 5, 0, -5][this.frame] ?? 0;
    const bobY = this.onGround && this.vx !== 0 ? Math.abs(legOffset) * 0.3 : 0;

    // --- 左脚 ---
    ctx.fillStyle = '#0d0d20';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 26 + bobY, 10, 16 + legOffset, 3);
    ctx.fill();
    // 左靴
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.roundRect(cx - 15, top + 40 + bobY + legOffset, 13, 7, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- 右脚 ---
    ctx.fillStyle = '#0d0d20';
    ctx.beginPath();
    ctx.roundRect(cx + 3, top + 26 + bobY, 10, 16 - legOffset, 3);
    ctx.fill();
    // 右靴
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.roundRect(cx + 1, top + 40 + bobY - legOffset, 13, 7, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- 胴体（ダークジャケット） ---
    ctx.fillStyle = '#1a0028';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 14 + bobY, 26, 18, 5);
    ctx.fill();
    // マゼンタネオンジッパーライン
    ctx.strokeStyle = '#ff00cc';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, top + 14 + bobY);
    ctx.lineTo(cx, top + 32 + bobY);
    ctx.stroke();
    // ショルダーライン
    ctx.strokeStyle = 'rgba(255,0,200,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 13, top + 16 + bobY);
    ctx.lineTo(cx + 13, top + 16 + bobY);
    ctx.stroke();

    // --- 左腕 ---
    const armSwing = this.onGround ? legOffset * 0.6 : 0;
    ctx.fillStyle = '#ffc5a1';
    ctx.save();
    ctx.translate(cx - 14, top + 17 + bobY);
    ctx.rotate((armSwing * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 13, 3);
    ctx.fill();
    ctx.restore();

    // --- 右腕 ---
    ctx.fillStyle = '#ffc5a1';
    ctx.save();
    ctx.translate(cx + 14, top + 17 + bobY);
    ctx.rotate((-armSwing * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 13, 3);
    ctx.fill();
    ctx.restore();

    // --- 頭 ---
    ctx.fillStyle = '#ffc5a1';
    ctx.beginPath();
    ctx.arc(cx, top + 9, 13, 0, Math.PI * 2);
    ctx.fill();

    // --- 髪 (お団子ツインテール) ---
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 6;
    ctx.fillStyle = '#00e5ff';
    // 左お団子
    ctx.beginPath();
    ctx.arc(cx - 10, top, 6, 0, Math.PI * 2);
    ctx.fill();
    // 右お団子
    ctx.beginPath();
    ctx.arc(cx + 10, top, 6, 0, Math.PI * 2);
    ctx.fill();
    // 前髪
    ctx.beginPath();
    ctx.ellipse(cx, top + 2, 12, 7, 0, Math.PI, 0);
    ctx.fill();
    ctx.shadowBlur = 0;

    // --- 目（大きなキラキラ目） ---
    // 白目
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx - 5, top + 9, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 5, top + 9, 4, 4.5, 0, 0, Math.PI * 2); ctx.fill();
    // 黒目
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(cx - 5, top + 9, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 5, top + 9, 2.8, 0, Math.PI * 2); ctx.fill();
    // キラキラ
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(cx - 4, top + 8, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + 6, top + 8, 1, 0, Math.PI * 2); ctx.fill();

    // --- ほっぺ ---
    ctx.fillStyle = 'rgba(0, 200, 255, 0.28)';
    ctx.beginPath(); ctx.ellipse(cx - 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // --- 口（笑顔） ---
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, top + 13, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }
};

// ---- 矩形衝突 ----
function collideRect(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ---- 六角形パス（ホログラムコイン用）----
function drawHexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    if (i === 0) ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a));
    else         ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

// ---- ステージ生成 ----
let platforms, coins, enemies;

function generateLevel() {
  platforms = [];
  coins = [];
  enemies = [];

  // 地面ブロック（ギャップあり）
  const groundSegments = [
    {x: 0,    w: 600},
    {x: 700,  w: 400},
    {x: 1200, w: 500},
    {x: 1800, w: 300},
    {x: 2200, w: 600},
    {x: 2900, w: 400},
    {x: 3400, w: 600},
  ];
  for (const s of groundSegments) {
    platforms.push({x: s.x, y: 420, w: s.w, h: 30, color: '#27ae60'});
  }

  // 空中プラットフォーム
  const airPlatforms = [
    {x: 250, y: 320, w: 120}, {x: 450, y: 260, w: 100},
    {x: 650, y: 300, w: 130}, {x: 850, y: 240, w: 110},
    {x: 1050,y: 310, w: 120}, {x: 1250,y: 250, w: 100},
    {x: 1500,y: 290, w: 130}, {x: 1700,y: 220, w: 120},
    {x: 1900,y: 300, w: 110}, {x: 2100,y: 260, w: 100},
    {x: 2400,y: 310, w: 130}, {x: 2600,y: 240, w: 120},
    {x: 2800,y: 290, w: 110}, {x: 3050,y: 260, w: 130},
    {x: 3250,y: 310, w: 100}, {x: 3500,y: 250, w: 120},
    {x: 3700,y: 300, w: 130}, {x: 3900,y: 220, w: 100},
  ];
  for (const p of airPlatforms) {
    platforms.push({x: p.x, y: p.y, w: p.w, h: 16, color: '#8e44ad'});
    // コインをプラットフォーム上に配置
    for (let cx = p.x + 20; cx < p.x + p.w - 20; cx += 40) {
      coins.push({x: cx, y: p.y - 24, w: 16, h: 16, collected: false, anim: 0});
    }
  }

  // 地面上コイン
  for (const s of groundSegments) {
    for (let cx = s.x + 60; cx < s.x + s.w - 60; cx += 80) {
      coins.push({x: cx, y: 390, w: 16, h: 16, collected: false, anim: 0});
    }
  }

  // 敵
  const enemySpots = [
    400, 750, 1050, 1450, 1700, 2000, 2300, 2600, 2900, 3200, 3600
  ];
  for (const ex of enemySpots) {
    enemies.push({
      x: ex, y: 390, w: 36, h: 30,
      startX: ex, range: 120, vx: 1.2,
      color: '#e67e22'
    });
  }
}

// ---- ゴールフラグ ----
const goal = {x: WORLD_WIDTH - 80, y: 300, w: 20, h: 120};

// ---- カメラ ----
function updateCamera() {
  const target = player.x - canvas.width / 3;
  cameraX = Math.max(0, Math.min(target, WORLD_WIDTH - canvas.width));
}

// ---- 背景描画 ----
function drawBackground() {
  // 漆黒の夜
  ctx.fillStyle = '#000510';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 薄い星（都市の光害で暗め）
  for (const s of stars) {
    const sx = ((s.x - cameraX * 0.02) % canvas.width + canvas.width) % canvas.width;
    ctx.fillStyle = `rgba(160,210,255,${(0.08 + s.r * 0.1).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, s.y * 0.5, s.r * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }

  // 遠景ビル（0.1x 視差）
  const farOff = (cameraX * 0.1) % FAR_TILE;
  for (const b of farBuildings) {
    for (const shift of [0, FAR_TILE]) {
      const bx = b.x - farOff + shift;
      if (bx + b.w < -2 || bx > canvas.width + 2) continue;
      ctx.fillStyle = '#070714';
      ctx.fillRect(bx, canvas.height - b.h, b.w, b.h);
      const wCol = b.accent === 0 ? 'rgba(0,230,255,0.18)' : 'rgba(255,180,0,0.12)';
      for (let wy = canvas.height - b.h + 8; wy < canvas.height - 5; wy += 16) {
        for (let wx = bx + 5; wx < bx + b.w - 3; wx += 11) {
          if (((wx - bx) / 11 + (canvas.height - wy) / 16 + b.x) % 4 !== 0) {
            ctx.fillStyle = wCol;
            ctx.fillRect(wx, wy, 5, 7);
          }
        }
      }
      if (b.accent === 1) {
        ctx.strokeStyle = `rgba(255,0,200,${0.22 + Math.sin(neonTime * 0.05 + b.x) * 0.1})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, canvas.height - b.h);
        ctx.lineTo(bx + b.w, canvas.height - b.h);
        ctx.stroke();
      }
    }
  }

  // 中景ビル（0.25x 視差）
  const midOff = (cameraX * 0.25) % MID_TILE;
  for (const b of midBuildings) {
    for (const shift of [0, MID_TILE]) {
      const bx = b.x - midOff + shift;
      if (bx + b.w < -2 || bx > canvas.width + 2) continue;
      ctx.fillStyle = '#0d0d22';
      ctx.fillRect(bx, canvas.height - b.h, b.w, b.h);
      if (b.accent === 0) {
        ctx.strokeStyle = `rgba(0,255,200,${0.18 + Math.sin(neonTime * 0.04 + b.x * 0.1) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, canvas.height - b.h + 0.5, b.w - 1, b.h - 1);
      } else if (b.accent === 2) {
        ctx.strokeStyle = `rgba(255,0,180,${0.18 + Math.cos(neonTime * 0.03 + b.x * 0.1) * 0.08})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(bx + 0.5, canvas.height - b.h + 0.5, b.w - 1, b.h - 1);
      }
      for (let wy = canvas.height - b.h + 5; wy < canvas.height - 3; wy += 12) {
        for (let wx = bx + 4; wx < bx + b.w - 2; wx += 9) {
          if (((wx - bx) / 9 + (canvas.height - wy) / 12 + b.x) % 3 !== 0) {
            ctx.fillStyle = b.accent === 0 ? 'rgba(0,255,200,0.14)' : 'rgba(255,80,200,0.11)';
            ctx.fillRect(wx, wy, 4, 5);
          }
        }
      }
    }
  }

  // 地面のネオン反射
  const groundGlow = ctx.createLinearGradient(0, canvas.height - 70, 0, canvas.height);
  groundGlow.addColorStop(0, 'rgba(0,0,0,0)');
  groundGlow.addColorStop(1, 'rgba(0,30,60,0.45)');
  ctx.fillStyle = groundGlow;
  ctx.fillRect(0, canvas.height - 70, canvas.width, 70);
  ctx.lineWidth = 1;
}

// ---- メインループ ----
function gameLoop() {
  if (gameState !== 'playing') return;

  update();
  render();
  animFrame = requestAnimationFrame(gameLoop);
}

function update() {
  neonTime++;
  player.update();
  updateCamera();

  // コイン収集
  for (const c of coins) {
    if (!c.collected && collideRect(player, c)) {
      c.collected = true;
      score += 10;
      scoreEl.textContent = score;
    }
    c.anim += 0.05;
  }

  // 敵の移動 & 衝突
  for (const e of enemies) {
    e.x += e.vx;
    if (e.x > e.startX + e.range || e.x < e.startX) e.vx *= -1;

    if (player.invincible === 0 && collideRect(player, e)) {
      lives--;
      livesEl.textContent = lives;
      player.invincible = 90;
      if (lives <= 0) { endGame(false); return; }
    }
  }

  // 落下死
  if (player.y > canvas.height + 60) {
    lives--;
    livesEl.textContent = lives;
    if (lives <= 0) { endGame(false); return; }
    player.reset();
  }

  // ゴール
  if (collideRect(player, goal)) {
    score += 200;
    scoreEl.textContent = score;
    endGame(true);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();

  ctx.save();
  ctx.translate(-cameraX, 0);

  // プラットフォーム
  for (const p of platforms) {
    if (p.h > 20) {
      // 地面 — アスファルト
      ctx.fillStyle = '#0e0e1c';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#15152a';
      ctx.fillRect(p.x, p.y, p.w, 4);
      // 黄色いレーンライン
      ctx.fillStyle = '#FFD600';
      for (let lx = p.x + 16; lx < p.x + p.w - 16; lx += 44) {
        ctx.fillRect(lx, p.y + 12, 22, 3);
      }
      // 上端シアングロー
      ctx.fillStyle = 'rgba(0,230,255,0.18)';
      ctx.fillRect(p.x, p.y, p.w, 2);
    } else {
      // 空中プラットフォーム — ダークグリッド＋ネオン縁取り
      ctx.fillStyle = '#080818';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(0,200,255,0.12)';
      ctx.lineWidth = 1;
      for (let gx = p.x + 16; gx < p.x + p.w; gx += 16) {
        ctx.beginPath(); ctx.moveTo(gx, p.y); ctx.lineTo(gx, p.y + p.h); ctx.stroke();
      }
      const isCyan = Math.floor(p.x * 0.01) % 2 === 0;
      const neonAlpha = 0.6 + Math.sin(neonTime * 0.06 + p.x * 0.008) * 0.2;
      ctx.strokeStyle = isCyan ? `rgba(0,230,255,${neonAlpha})` : `rgba(255,0,200,${neonAlpha})`;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(p.x + 0.75, p.y + 0.75, p.w - 1.5, p.h - 1.5);
      const col = isCyan ? '0,230,255' : '255,0,200';
      const eg = ctx.createLinearGradient(0, p.y - 5, 0, p.y + 5);
      eg.addColorStop(0, `rgba(${col},0)`);
      eg.addColorStop(0.5, `rgba(${col},0.25)`);
      eg.addColorStop(1, `rgba(${col},0)`);
      ctx.fillStyle = eg;
      ctx.fillRect(p.x - 2, p.y - 5, p.w + 4, 10);
    }
  }
  ctx.lineWidth = 1;

  // コイン（ホログラム六角形）
  for (const c of coins) {
    if (c.collected) continue;
    const bounce = Math.sin(c.anim) * 3;
    const ccx = c.x + c.w / 2;
    const ccy = c.y + c.h / 2 + bounce;
    const cr  = c.w / 2;
    const glow = ctx.createRadialGradient(ccx, ccy, 0, ccx, ccy, cr * 2.6);
    glow.addColorStop(0, 'rgba(0,255,255,0.32)');
    glow.addColorStop(1, 'rgba(0,100,200,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(ccx, ccy, cr * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(ccx, ccy);
    ctx.rotate(c.anim * 0.5);
    ctx.fillStyle = '#001830';
    drawHexPath(0, 0, cr);
    ctx.fill();
    ctx.fillStyle = '#003355';
    drawHexPath(0, 0, cr - 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    drawHexPath(0, 0, cr - 4);
    ctx.fill();
    const hexAlpha = 0.75 + Math.sin(c.anim * 2) * 0.25;
    ctx.strokeStyle = `rgba(0,255,255,${hexAlpha})`;
    ctx.lineWidth = 1.5;
    drawHexPath(0, 0, cr);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath(); ctx.arc(ccx - 1, ccy - 2, 1.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.lineWidth = 1;

  // 敵（サイバーロボット）
  for (const e of enemies) {
    const ex = e.x, ey = e.y, ew = e.w, eh = e.h;
    ctx.fillStyle = 'rgba(255,0,80,0.12)';
    ctx.beginPath();
    ctx.ellipse(ex + ew / 2, ey + eh + 3, ew / 2, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ex + ew / 2, ey + 4);
    ctx.lineTo(ex + ew / 2, ey - 9);
    ctx.stroke();
    const antAlpha = 0.5 + Math.sin(neonTime * 0.18) * 0.5;
    ctx.fillStyle = `rgba(255,0,80,${antAlpha})`;
    ctx.beginPath(); ctx.arc(ex + ew / 2, ey - 10, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#12122a';
    ctx.fillRect(ex + 4, ey + 2, ew - 8, 14);
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 4, ey + 2, ew - 8, 14);
    const eyeAlpha = 0.7 + Math.sin(neonTime * 0.15) * 0.3;
    ctx.fillStyle = `rgba(255,0,80,${eyeAlpha})`;
    ctx.fillRect(ex + 7,       ey + 7, 8, 4);
    ctx.fillRect(ex + ew - 15, ey + 7, 8, 4);
    ctx.fillStyle = `rgba(255,80,80,${eyeAlpha * 0.6})`;
    ctx.fillRect(ex + 6,       ey + 6, 10, 6);
    ctx.fillRect(ex + ew - 16, ey + 6, 10, 6);
    ctx.fillStyle = '#111128';
    ctx.fillRect(ex + 2, ey + 16, ew - 4, 12);
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 1;
    ctx.strokeRect(ex + 2, ey + 16, ew - 4, 12);
    ctx.beginPath();
    ctx.moveTo(ex + ew / 2, ey + 16);
    ctx.lineTo(ex + ew / 2, ey + 28);
    ctx.stroke();
    const chestAlpha = 0.5 + Math.sin(neonTime * 0.2) * 0.5;
    ctx.fillStyle = `rgba(255,0,80,${chestAlpha})`;
    ctx.beginPath(); ctx.arc(ex + ew / 2, ey + 22, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#12122a';
    ctx.fillRect(ex + 4,       ey + 28, 10, 8);
    ctx.fillRect(ex + ew - 14, ey + 28, 10, 8);
    ctx.fillStyle = '#cc0044';
    ctx.fillRect(ex + 2,       ey + 34, 14, 4);
    ctx.fillRect(ex + ew - 16, ey + 34, 14, 4);
  }
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';

  // ゴール — EXIT ネオンサイン
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(goal.x + 2, goal.y, 5, goal.h);
  ctx.fillStyle = 'rgba(100,100,180,0.4)';
  ctx.fillRect(goal.x + 3, goal.y, 2, goal.h);
  const signW = 72, signH = 38;
  const signX = goal.x - 12, signY = goal.y + 8;
  ctx.fillStyle = '#04041a';
  ctx.fillRect(signX, signY, signW, signH);
  const exitF = 0.65 + Math.sin(neonTime * 0.13) * 0.35;
  ctx.strokeStyle = `rgba(255,0,200,${exitF})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(signX + 1, signY + 1, signW - 2, signH - 2);
  ctx.strokeStyle = `rgba(0,230,255,${exitF * 0.5})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(signX + 4, signY + 4, signW - 8, signH - 8);
  ctx.save();
  ctx.fillStyle = `rgba(255,0,220,${exitF})`;
  ctx.font = 'bold 18px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#ff00cc';
  ctx.shadowBlur = 12 + Math.sin(neonTime * 0.13) * 6;
  ctx.fillText('EXIT', signX + signW / 2, signY + signH / 2 + 7);
  ctx.restore();
  const arrowX = signX + signW + 4;
  const arrowY = signY + signH / 2;
  const arrowA = 0.55 + Math.cos(neonTime * 0.1) * 0.3;
  ctx.strokeStyle = `rgba(0,230,255,${arrowA})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(arrowX,      arrowY);
  ctx.lineTo(arrowX + 12, arrowY);
  ctx.moveTo(arrowX + 6,  arrowY - 5);
  ctx.lineTo(arrowX + 12, arrowY);
  ctx.lineTo(arrowX + 6,  arrowY + 5);
  ctx.stroke();
  ctx.lineWidth = 1;
  ctx.lineCap = 'butt';

  ctx.restore();

  // プレイヤー（カメラ外で描画）
  ctx.save();
  player.draw();
  ctx.restore();
}

// ---- ゲーム開始 / 終了 ----
function startGame() {
  score = 0; lives = 3; cameraX = 0;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  gameState = 'playing';
  overlay.classList.add('hidden');
  generateLevel();
  player.reset();
  if (animFrame) cancelAnimationFrame(animFrame);
  gameLoop();
}

function endGame(won) {
  gameState = 'over';
  cancelAnimationFrame(animFrame);
  overlay.classList.toggle('won',  won);
  overlay.classList.toggle('lost', !won);
  overlayTitle.textContent = won ? '🎉 クリア！' : 'GAME OVER';
  overlayScore.textContent = `スコア: ${score} 点`;
  overlay.classList.remove('hidden');
}

restartBtn.addEventListener('click', startGame);

startGame();
