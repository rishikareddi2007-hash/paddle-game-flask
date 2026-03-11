function getParam(name){ const url = new URL(window.location.href); return url.searchParams.get(name); }
const level = Math.max(1, Math.min(20, parseInt(getParam('level')) || 1));
document.getElementById('levelTitle').textContent = `Level ${level}`;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas(){ canvas.width = Math.min(1100, window.innerWidth*0.92); canvas.height = Math.min(760, window.innerHeight*0.6); paddleWidth = canvas.width * 0.14; paddleHeight = canvas.height * 0.03; }
window.addEventListener('resize', resizeCanvas);

let paddleWidth = 0, paddleHeight = 0;
let paddleX;
let ballRadius;
let x,y,dx,dy;
let score = 0;
let gameOver = false;
let audioCtx = null, osc = null, gainNode = null, musicOn = false;

async function initAudioIfNeeded(){
  const res = await fetch('/api/me'); if(!res.ok) return;
  const d = await res.json();
  if(d.settings && d.settings.music === 'on') startMusic(); else stopMusic();
}

function startMusic(){
  if(audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  gainNode = audioCtx.createGain(); gainNode.gain.value = 0.03;
  gainNode.connect(audioCtx.destination);
  osc = audioCtx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 220;
  const lfo = audioCtx.createOscillator();
  lfo.type = 'sine'; lfo.frequency.value = 0.5;
  const lfoGain = audioCtx.createGain(); lfoGain.gain.value = 40;
  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(gainNode);
  lfo.start(); osc.start();
  musicOn = true;
}
function stopMusic(){
  if(!audioCtx) return;
  try{ osc.stop(); }catch(e){} try{ audioCtx.close(); }catch(e){} audioCtx=null; osc=null; gainNode=null; musicOn=false;
}

function initGame(){
  resizeCanvas();
  paddleWidth = canvas.width * (0.14 - (level-1)*0.002);
  paddleHeight = canvas.height * 0.03;
  paddleX = (canvas.width - paddleWidth)/2;
  ballRadius = Math.max(8, Math.min(canvas.width, canvas.height)*0.015);
  x = canvas.width/2; y = canvas.height - 60;
  dx = canvas.width*(0.006 + level*0.0008);
  dy = -canvas.height*(0.005 + level*0.0007);
  score = 0; gameOver = false;
}

let bricks = [];
function buildBricks(){ bricks = []; const rows = Math.min(6, 1 + Math.floor(level/3)); const cols = Math.max(5, Math.min(9, 5 + Math.floor(level/5))); const brickW = (canvas.width - 80)/cols; const brickH = Math.max(16, canvas.height*0.04); for(let r=0;r<rows;r++){ bricks[r]=[]; for(let c=0;c<cols;c++){ const seed = (r+1)*(c+1) + level; const active = ((seed * 31) % 100) < 85 - Math.min(50, level*2); bricks[r][c] = { x: 40 + c*brickW, y: 60 + r*(brickH+8), w: brickW-10, h: brickH-6, active }; } } }

let rightPressed=false, leftPressed=false;
document.addEventListener('keydown', (e)=>{ if(e.key === 'ArrowRight') rightPressed = true; if(e.key === 'ArrowLeft') leftPressed = true; });
document.addEventListener('keyup', (e)=>{ if(e.key === 'ArrowRight') rightPressed = false; if(e.key === 'ArrowLeft') leftPressed = false; });

function drawBall(){ ctx.beginPath(); ctx.arc(x,y,ballRadius,0,Math.PI*2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.closePath(); }
function drawPaddle(){ ctx.beginPath(); ctx.rect(paddleX, canvas.height - paddleHeight - 10, paddleWidth, paddleHeight); ctx.fillStyle = '#00d4ff'; ctx.fill(); ctx.closePath(); }
function drawBricks(){ for(let r=0;r<bricks.length;r++){ for(let c=0;c<bricks[r].length;c++){ const b = bricks[r][c]; if(!b.active) continue; ctx.beginPath(); ctx.fillStyle = ['#2dd4bf','#60a5fa','#f59e0b','#ef4444','#a78bfa'][(r+c)%5]; ctx.fillRect(b.x, b.y, b.w, b.h); ctx.closePath(); } } }
function drawScore(){ ctx.font = "18px Arial"; ctx.fillStyle = '#fff'; ctx.fillText("Score: " + score, 12, 26); }

function collisionDetection(){ for(let r=0;r<bricks.length;r++){ for(let c=0;c<bricks[r].length;c++){ const b = bricks[r][c]; if(!b.active) continue; if(x > b.x && x < b.x + b.w && y - ballRadius > b.y && y - ballRadius < b.y + b.h){ dy = -dy; b.active = false; score += 10; } } } }

function showEndPrompt(title, message, onRestart){ const go = confirm(`${title}

${message}

Press OK to Restart, Cancel to go Home.`); if(go){ onRestart(); } else { window.location.href = '/home'; } }

async function levelComplete(){ const earnedCoins = Math.max(5, Math.floor(score/10) + Math.floor(level*1.5)); const extraLives = (score > 150) ? 1 : 0; await fetch('/api/complete_level', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({level, score, coins: earnedCoins, lives: extraLives}) }); showEndPrompt("LEVEL COMPLETE!", `Score: ${score}
Coins earned: ${earnedCoins}
Extra lives: ${extraLives}`, ()=>{ initGame(); buildBricks(); updateUi(); requestAnimationFrame(loop); }); }

function showGameOver(){ showEndPrompt("GAME OVER", `Final Score: ${score}`, ()=>{ initGame(); buildBricks(); updateUi(); requestAnimationFrame(loop); }); }

async function updateUi(){ const r = await fetch('/api/me'); if(!r.ok) { window.location.href = '/'; return; } const d = await r.json(); document.getElementById('gameCoins').textContent = d.coins || 0; document.getElementById('gameLives').textContent = d.lives || 0; document.getElementById('gameScore').textContent = score; }

function loop(){ if(gameOver) return; ctx.clearRect(0,0,canvas.width,canvas.height); drawBricks(); drawBall(); drawPaddle(); drawScore(); if(x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx; if(y + dy < ballRadius) dy = -dy; else if(y + dy > canvas.height - ballRadius - paddleHeight - 10){ if(x > paddleX && x < paddleX + paddleWidth){ dy = -dy; score += 1; } else { gameOver = true; fetch('/api/use_life', {method:'POST'}).then(async res=>{ if(res.ok){ await updateUi(); } showGameOver(); }); return; } } if(rightPressed && paddleX < canvas.width - paddleWidth) paddleX += canvas.width*0.015; else if(leftPressed && paddleX > 0) paddleX -= canvas.width*0.015; x += dx; y += dy; collisionDetection(); const anyLeft = bricks.some(row => row.some(b => b.active)); if(!anyLeft){ gameOver = true; levelComplete(); return; } updateUi(); requestAnimationFrame(loop); }

initGame(); buildBricks(); initAudioIfNeeded(); updateUi(); requestAnimationFrame(loop);