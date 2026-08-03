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

// ---- レトロサウンド ----
let audioCtx = null;
function playBeep(freq, dur, vol = 0.08) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

let retroTime = 0;

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
      playBeep(440, 0.12);
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
    ctx.fillStyle = '#0000aa';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 26 + bobY, 10, 16 + legOffset, 3);
    ctx.fill();
    // 左靴
    ctx.fillStyle = '#5c1a00';
    ctx.beginPath();
    ctx.roundRect(cx - 15, top + 40 + bobY + legOffset, 13, 7, 3);
    ctx.fill();

    // --- 右脚 ---
    ctx.fillStyle = '#0000aa';
    ctx.beginPath();
    ctx.roundRect(cx + 3, top + 26 + bobY, 10, 16 - legOffset, 3);
    ctx.fill();
    // 右靴
    ctx.fillStyle = '#5c1a00';
    ctx.beginPath();
    ctx.roundRect(cx + 1, top + 40 + bobY - legOffset, 13, 7, 3);
    ctx.fill();

    // --- 胴体（赤シャツ）---
    ctx.fillStyle = '#cc2200';
    ctx.beginPath();
    ctx.roundRect(cx - 13, top + 14 + bobY, 26, 18, 3);
    ctx.fill();
    // オーバーオール（青）
    ctx.fillStyle = '#0000aa';
    ctx.beginPath();
    ctx.roundRect(cx - 10, top + 22 + bobY, 20, 10, 2);
    ctx.fill();
    // 襟（白）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, top + 15 + bobY, 5, Math.PI, 0);
    ctx.fill();

    // --- 左腕 ---
    const armSwing = this.onGround ? legOffset * 0.6 : 0;
    ctx.fillStyle = '#ffcc88';
    ctx.save();
    ctx.translate(cx - 14, top + 17 + bobY);
    ctx.rotate((armSwing * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 13, 3);
    ctx.fill();
    ctx.restore();

    // --- 右腕 ---
    ctx.fillStyle = '#ffcc88';
    ctx.save();
    ctx.translate(cx + 14, top + 17 + bobY);
    ctx.rotate((-armSwing * Math.PI) / 180);
    ctx.beginPath();
    ctx.roundRect(-4, 0, 8, 13, 3);
    ctx.fill();
    ctx.restore();

    // --- 頭 ---
    ctx.fillStyle = '#ffcc88';
    ctx.beginPath();
    ctx.arc(cx, top + 9, 13, 0, Math.PI * 2);
    ctx.fill();

    // --- 髪 (お団子ツインテール) ---
    ctx.fillStyle = '#5c1a00';
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
    ctx.fillStyle = 'rgba(255, 160, 100, 0.5)';
    ctx.beginPath(); ctx.ellipse(cx - 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + 8, top + 13, 3.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();

    // --- 口（笑顔） ---
    ctx.strokeStyle = '#aa2200';
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
  // 青空グラデーション
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0,   '#5c94fc');
  grad.addColorStop(0.6, '#70b8ff');
  grad.addColorStop(1,   '#a8d8ff');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 遠景の緑の丘（0.15x 視差）
  ctx.fillStyle = '#70b050';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 10) {
    const wx = x + cameraX * 0.15;
    ctx.lineTo(x, 340 + Math.sin(wx * 0.004) * 40 + Math.sin(wx * 0.009) * 20);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // 中景の丘（0.3x 視差）
  ctx.fillStyle = '#50a030';
  ctx.beginPath();
  ctx.moveTo(0, canvas.height);
  for (let x = 0; x <= canvas.width; x += 10) {
    const wx = x + cameraX * 0.3;
    ctx.lineTo(x, 370 + Math.sin(wx * 0.005 + 1) * 28 + Math.sin(wx * 0.011) * 14);
  }
  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();
  ctx.fill();

  // ピクセル雲（0.4x 視差）
  const cloudDefs = [
    {x: 120, y: 60,  s: 12}, {x: 380, y: 45,  s: 16},
    {x: 620, y: 70,  s: 10}, {x: 900, y: 50,  s: 14},
    {x: 1200,y: 65,  s: 12}, {x: 1500,y: 42,  s: 16},
  ];
  for (const c of cloudDefs) {
    const cx = ((c.x - cameraX * 0.4) % (canvas.width + c.s * 8) + canvas.width + c.s * 8) % (canvas.width + c.s * 8) - c.s * 4;
    const s = c.s;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx,          c.y + s,     s * 6, s * 2);
    ctx.fillRect(cx + s,      c.y,         s * 2, s * 2);
    ctx.fillRect(cx + s * 3,  c.y - s,     s * 2, s * 3);
    ctx.fillRect(cx + s * 2,  c.y,         s * 2, s * 2);
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
  retroTime++;
  player.update();
  updateCamera();

  // コイン収集
  for (const c of coins) {
    if (!c.collected && collideRect(player, c)) {
      c.collected = true;
      score += 10;
      scoreEl.textContent = String(score).padStart(6, '0');
      playBeep(880, 0.08);
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
    scoreEl.textContent = String(score).padStart(6, '0');
    playBeep(523, 0.5);
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
      // 地面 — 草ブロック＋土
      ctx.fillStyle = '#c8843c';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // 土の縦区切り
      ctx.fillStyle = '#a8662c';
      for (let tx = p.x + 16; tx < p.x + p.w; tx += 16) {
        ctx.fillRect(tx, p.y + 8, 2, p.h - 8);
      }
      // 土の横区切り
      ctx.fillRect(p.x, p.y + p.h / 2, p.w, 2);
      // 草の上面
      ctx.fillStyle = '#5ac54f';
      ctx.fillRect(p.x, p.y, p.w, 8);
      // 草の明るいハイライト
      ctx.fillStyle = '#70d860';
      ctx.fillRect(p.x, p.y, p.w, 3);
      // 草のブロック区切り
      ctx.fillStyle = '#48a840';
      for (let tx = p.x + 16; tx < p.x + p.w; tx += 16) {
        ctx.fillRect(tx, p.y, 2, 8);
      }
    } else {
      // 空中ブロック — レンガ
      ctx.fillStyle = '#c03a00';
      ctx.fillRect(p.x, p.y, p.w, p.h);
      // レンガの目地（明るい）
      ctx.fillStyle = '#e05010';
      ctx.fillRect(p.x, p.y, p.w, 4);
      ctx.fillRect(p.x, p.y, p.w, 2);
      // 縦の目地
      ctx.fillStyle = '#903000';
      for (let bx = p.x + 16; bx < p.x + p.w; bx += 16) {
        ctx.fillRect(bx, p.y, 2, p.h);
      }
      // 横の目地
      ctx.fillRect(p.x, p.y + p.h / 2, p.w, 2);
    }
  }

  // コイン（ピクセルコイン・点滅）
  for (const c of coins) {
    if (c.collected) continue;
    const bounce = Math.sin(c.anim) * 3;
    const ccx = c.x + c.w / 2;
    const ccy = c.y + c.h / 2 + bounce;
    // 点滅（retroTime で切り替え）
    const blink = Math.floor(retroTime / 8) % 4;
    const colors = ['#f8c800', '#ffe040', '#fff880', '#ffe040'];
    ctx.fillStyle = colors[blink];
    ctx.fillRect(ccx - 6, ccy - 6, 12, 12);
    ctx.fillStyle = '#fff8c0';
    ctx.fillRect(ccx - 4, ccy - 6, 4, 2);
    // 内側
    ctx.fillStyle = colors[(blink + 2) % 4];
    ctx.fillRect(ccx - 4, ccy - 4, 8, 8);
  }

  // 敵（グリーンスライム）
  for (const e of enemies) {
    const ex = e.x, ey = e.y, ew = e.w, eh = e.h;
    const cx = ex + ew / 2, cy = ey + eh * 0.52;
    const r  = ew / 2 - 1;
    // 影
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, ey + eh + 2, r - 2, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    // まんまる胴体
    const grad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
    grad.addColorStop(0, '#a8f0a8');
    grad.addColorStop(1, '#3db83d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    // ほっぺ（赤みのある丸）
    ctx.fillStyle = 'rgba(255,120,120,0.45)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.52, cy + r * 0.22, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.52, cy + r * 0.22, r * 0.22, 0, Math.PI * 2);
    ctx.fill();
    // 白目（大きめ丸）
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.32, cy - r * 0.12, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.32, cy - r * 0.12, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
    // 黒目
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(cx - r * 0.30, cy - r * 0.10, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.30, cy - r * 0.10, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
    // 瞳ハイライト
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - r * 0.24, cy - r * 0.17, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.36, cy - r * 0.17, r * 0.07, 0, Math.PI * 2);
    ctx.fill();
    // にっこり口
    ctx.strokeStyle = '#1a6e1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy + r * 0.22, r * 0.25, 0.2, Math.PI - 0.2);
    ctx.stroke();
    ctx.lineWidth = 1;
    // 小さな触角（頭のうえ）
    ctx.strokeStyle = '#2a8a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.18, cy - r * 0.95);
    ctx.quadraticCurveTo(cx - r * 0.35, cy - r * 1.4, cx - r * 0.28, cy - r * 1.55);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.18, cy - r * 0.95);
    ctx.quadraticCurveTo(cx + r * 0.35, cy - r * 1.4, cx + r * 0.28, cy - r * 1.55);
    ctx.stroke();
    ctx.fillStyle = '#3db83d';
    ctx.beginPath();
    ctx.arc(cx - r * 0.28, cy - r * 1.55, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + r * 0.28, cy - r * 1.55, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1;
  }

  // ゴール — 旗ポール（マリオ風）
  // ポール
  ctx.fillStyle = '#aaaaaa';
  ctx.fillRect(goal.x + 7, goal.y - 20, 6, goal.h + 20);
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(goal.x + 8, goal.y - 20, 2, goal.h + 20);
  // 旗（三角形）
  ctx.fillStyle = '#e8001c';
  ctx.beginPath();
  ctx.moveTo(goal.x + 13, goal.y - 18);
  ctx.lineTo(goal.x + 50, goal.y + 2);
  ctx.lineTo(goal.x + 13, goal.y + 22);
  ctx.closePath();
  ctx.fill();
  // 旗のハイライト
  ctx.fillStyle = '#ff4444';
  ctx.beginPath();
  ctx.moveTo(goal.x + 13, goal.y - 18);
  ctx.lineTo(goal.x + 50, goal.y + 2);
  ctx.lineTo(goal.x + 13, goal.y - 2);
  ctx.closePath();
  ctx.fill();
  // 頂点の球
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.arc(goal.x + 10, goal.y - 22, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffee88';
  ctx.beginPath();
  ctx.arc(goal.x + 8, goal.y - 24, 3, 0, Math.PI * 2);
  ctx.fill();
  // "GOAL" テキスト（ポール下）
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 11px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GOAL', goal.x + 10, goal.y + goal.h + 14);

  ctx.restore();

  // プレイヤー（カメラ外で描画）
  ctx.save();
  player.draw();
  ctx.restore();

  // CRTスキャンライン
  ctx.fillStyle = 'rgba(0,0,0,0.055)';
  for (let sy = 0; sy < canvas.height; sy += 2) {
    ctx.fillRect(0, sy, canvas.width, 1);
  }
}

// ---- ゲーム開始 / 終了 ----
function startGame() {
  score = 0; lives = 10; cameraX = 0;
  scoreEl.textContent = String(score).padStart(6, '0');
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
