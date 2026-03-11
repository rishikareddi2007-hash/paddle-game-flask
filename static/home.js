(async function(){
  const res = await fetch('/api/me');
  if(!res.ok) { window.location.href = '/'; return; }
  const d = await res.json();
  document.getElementById('coins').textContent = d.coins || 0;
  document.getElementById('lives').textContent = d.lives || 0;
  if(d.settings && d.settings.music === 'on') document.body.classList.add('music-on');
})();

async function showHighScores(){ const res = await fetch('/api/me'); const d = await res.json(); const hs = (d.high_scores || []).slice(0,10).map((s,i)=> `${i+1}. L${s.level} - ${s.score}`).join('\n') || 'No scores yet'; alert("Top Scores:\n" + hs); }
function showSupport(){ alert("Support: dev@example.com"); }
async function logout(){ await fetch('/api/logout', {method:'POST'}); window.location.href = '/'; }