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
    ctx.fillStyle = '#5b3fa0';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 26 + bobY, 10, 16 + legOffset, 3);
    ctx.fill();
    // 左靴
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(cx - 15, top + 40 + bobY + legOffset, 13, 7, 3);
    ctx.fill();

    // --- 右脚 ---
    ctx.fillStyle = '#5b3fa0';
    ctx.beginPath();
    ctx.roundRect(cx + 3, top + 26 + bobY, 10, 16 - legOffset, 3);
    ctx.fill();
    // 右靴
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.roundRect(cx + 1, top + 40 + bobY - legOffset, 13, 7, 3);
    ctx.fill();

    // --- 胴体（ワンピース風） ---
    ctx.fillStyle = '#ff85a2';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 14 + bobY, 26, 18, 5);
    ctx.fill();
    // 襟
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, top + 15 + bobY, 5, Math.PI, 0);
    ctx.fill();

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
    ctx.fillStyle = '#c0392b';
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
    ctx.fillStyle = 'rgba(255, 150, 150, 0.5)';
    ctx.beginPath(); ctx.ellipse(cx - 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // --- 口（笑顔） ---
    ctx.strokeStyle = '#c0392b';
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
  // 宇宙紫グラデーション
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0,    '#090420');
  grad.addColorStop(0.55, '#1a0a4e');
  grad.addColorStop(1,    '#2a0d60');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 星（超低速視差）
  for (const s of stars) {
    const sx = ((s.x - cameraX * 0.05) % canvas.width + canvas.width) % canvas.width;
    ctx.fillStyle = `rgba(255,255,255,${(0.35 + s.r * 0.3).toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(sx, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 遠景の丘（0.15x視差）
  ctx.fillStyle = '#1a0845';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 12) {
    const wx = x + cameraX * 0.15;
    ctx.lineTo(x, 318 + Math.sin(wx * 0.003) * 55 + Math.sin(wx * 0.007) * 28);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // 中景の丘（0.25x視差）
  ctx.fillStyle = '#230e58';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 12) {
    const wx = x + cameraX * 0.25;
    ctx.lineTo(x, 352 + Math.sin(wx * 0.005 + 1.5) * 38 + Math.sin(wx * 0.011) * 18);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // 雲（ネビュラ風・0.3x視差）
  const cloudDefs = [
    {x: 150, y: 55, w: 180, h: 55}, {x: 480, y: 38, w: 220, h: 65},
    {x: 780, y: 70, w: 160, h: 50}, {x: 1100, y: 45, w: 200, h: 58},
    {x: 1450, y: 60, w: 170, h: 52},
  ];
  for (const c of cloudDefs) {
    const cx = ((c.x - cameraX * 0.3) % (canvas.width + c.w) + canvas.width + c.w) % (canvas.width + c.w) - c.w / 2;
    ctx.fillStyle = 'rgba(140,80,255,0.12)';
    ctx.beginPath(); ctx.ellipse(cx, c.y, c.w / 2, c.h / 2, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(200,160,255,0.08)';
    ctx.beginPath(); ctx.ellipse(cx - c.w * 0.22, c.y + c.h * 0.1, c.w * 0.38, c.h * 0.48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + c.w * 0.22, c.y + c.h * 0.1, c.w * 0.38, c.h * 0.48, 0, 0, Math.PI * 2); ctx.fill();
  }
}

// ---- メインループ ----
function gameLoop() {
  if (gameState !== 'playing') return;

  update();
  render();
  animFrame = requestAnimationFrame(gameLoop);
}

function update() {
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
      // 地面 — 土ボディ
      ctx.fillStyle = '#4a2c0a';
      ctx.fillRect(p.x, p.y + 9, p.w, p.h - 9);
      ctx.fillStyle = '#6b3d12';
      ctx.fillRect(p.x, p.y + 9, p.w, 4);
      // 草の層
      ctx.fillStyle = '#2e7d32';
      ctx.fillRect(p.x, p.y, p.w, 10);
      ctx.fillStyle = '#66bb6a';
      ctx.fillRect(p.x, p.y, p.w, 4);
      // 草の葉
      ctx.fillStyle = '#43a047';
      for (let gx = p.x + 6; gx < p.x + p.w - 4; gx += 14) {
        ctx.beginPath();
        ctx.moveTo(gx, p.y);
        ctx.lineTo(gx - 3, p.y - 6);
        ctx.lineTo(gx + 3, p.y - 6);
        ctx.closePath();
        ctx.fill();
      }
    } else {
      // 空中ブロック — グラデーション紫
      const pg = ctx.createLinearGradient(p.x, p.y, p.x, p.y + p.h);
      pg.addColorStop(0,   '#ce93d8');
      pg.addColorStop(0.4, '#9c27b0');
      pg.addColorStop(1,   '#6a0080');
      ctx.fillStyle = pg;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // 上端ハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(p.x, p.y, p.w, 3);
      // 下端シャドウ
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x, p.y + p.h - 2, p.w, 2);
      // ブロック区切り線
      ctx.strokeStyle = 'rgba(0,0,0,0.25)';
      ctx.lineWidth = 1;
      for (let bx = p.x + 30; bx < p.x + p.w; bx += 30) {
        ctx.beginPath(); ctx.moveTo(bx, p.y + 1); ctx.lineTo(bx, p.y + p.h - 1); ctx.stroke();
      }
    }
  }

  // コイン
  for (const c of coins) {
    if (c.collected) continue;
    const bounce = Math.sin(c.anim) * 3;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(c.x + c.w/2, c.y + c.h/2 + bounce, c.w/2, 0, Math.PI*2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', c.x + c.w/2, c.y + c.h/2 + 4 + bounce);
  }

  // 敵
  for (const e of enemies) {
    ctx.fillStyle = e.color;
    ctx.fillRect(e.x, e.y, e.w, e.h);
    // 目
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(e.x + 6,  e.y + 6,  8, 8);
    ctx.fillRect(e.x + 22, e.y + 6,  8, 8);
    ctx.fillStyle = '#fff';
    ctx.fillRect(e.x + 8,  e.y + 8,  4, 4);
    ctx.fillRect(e.x + 24, e.y + 8,  4, 4);
  }

  // ゴールフラグ
  ctx.fillStyle = '#e74c3c';
  ctx.fillRect(goal.x, goal.y, 6, goal.h);
  ctx.fillStyle = '#e74c3c';
  ctx.beginPath();
  ctx.moveTo(goal.x + 6, goal.y);
  ctx.lineTo(goal.x + 40, goal.y + 15);
  ctx.lineTo(goal.x + 6,  goal.y + 30);
  ctx.fill();
  ctx.fillStyle = '#f1c40f';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('GOAL', goal.x + 10, goal.y + 18);

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
  overlayTitle.textContent = won ? '🎉 クリア！' : 'ゲームオーバー';
  overlayScore.textContent = `スコア: ${score} 点`;
  overlay.classList.remove('hidden');
}

restartBtn.addEventListener('click', startGame);

startGame();
