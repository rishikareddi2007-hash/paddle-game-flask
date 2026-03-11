(async function(){
  const res = await fetch('/api/me');
  if(!res.ok){ window.location.href = '/'; return; }
  const data = await res.json();
  const unlocked = data.unlocked_levels || [1];
  const grid = document.getElementById('levelsGrid');

  const LEVEL_COUNT = 20;
  for(let i=1;i<=LEVEL_COUNT;i++){
    const card = document.createElement('div');
    card.className = 'level-card';
    if(!unlocked.includes(i)) card.classList.add('level-locked');

    const num = document.createElement('div'); num.className='level-number'; num.textContent=`LEVEL ${i}`;
    const preview = document.createElement('div'); preview.className='preview';

    const patternSeed = i * 13 + 7;
    const bricks = Math.min(6, 2 + Math.floor(i/3));
    const colors = ['#2dd4bf','#60a5fa','#f59e0b','#ef4444','#a78bfa'];
    for(let b=0;b<bricks;b++){
      const brick = document.createElement('div');
      brick.className='brick';
      brick.style.background = colors[(patternSeed + b) % colors.length];
      preview.appendChild(brick);
    }

    const btn = document.createElement('button');
    btn.textContent = unlocked.includes(i) ? 'Play' : 'Locked';
    btn.className = 'neon-btn';
    btn.style.marginTop = '10px';
    if(unlocked.includes(i)){
      btn.onclick = ()=> location.href = `/game?level=${i}`;
    } else {
      btn.disabled = true;
    }

    card.appendChild(num);
    card.appendChild(preview);
    card.appendChild(btn);
    grid.appendChild(card);
  }
})();