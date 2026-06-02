const CHAVE_PIX = "e87306f1-8148-422b-a199-b2deb63fa194";
const LS_SALDO   = 'foco_saldo';
const LS_REWARDS = 'foco_rewards';
const MAX_REWARDS = 3;

// ── BALANCE ──
function getSaldo() { return parseInt(localStorage.getItem(LS_SALDO)||'0')||0; }
function setSaldo(v) { localStorage.setItem(LS_SALDO, String(Math.max(0,v))); updateAllBalances(); }

function floatPoints(amount) {
  const page = document.querySelector('.page.active');
  if (!page) return;
  const floatEl = page.querySelector('.pts-float');
  if (!floatEl) return;
  floatEl.textContent = (amount > 0 ? '+' : '') + amount + ' pts';
  floatEl.classList.remove('pop');
  void floatEl.offsetWidth;
  floatEl.classList.add('pop');
  setTimeout(() => floatEl.classList.remove('pop'), 950);
}

function updateAllBalances() {
  const s = getSaldo();
  ['home-pts','pomo-pts','timer-pts','rwd-pts'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = s;
  });
}

// ── NAVIGATION ──
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0,0);
  if (id === 'pg-rewards') renderRewards();
  updateAllBalances();
}

// ── TOAST ──
let _tt;
function showToast(msg, dur=2200) {
  const t = document.getElementById('global-toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => t.classList.remove('show'), dur);
}

// ── MODAL ──
function openModal(title, body, cb) {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = body;
  document.getElementById('modal-confirm').onclick = () => { closeModal(); cb(); };
  document.getElementById('modal-overlay').classList.add('open');
}
function closeModal() { document.getElementById('modal-overlay').classList.remove('open'); }

// ── REWARDS ──
function getRewards() {
  try { return JSON.parse(localStorage.getItem(LS_REWARDS)||'[]'); }
  catch { return []; }
}
function saveRewards(list) { localStorage.setItem(LS_REWARDS, JSON.stringify(list)); }

function toggleAddForm() {
  const rewards = getRewards();
  if (rewards.length >= MAX_REWARDS) {
    showToast('Limite de 3 recompensas atingido');
    return;
  }
  const f = document.getElementById('add-form');
  f.classList.toggle('open');
  if (f.classList.contains('open')) {
    document.getElementById('rwd-name').value='';
    document.getElementById('rwd-cost').value='';
    document.getElementById('rwd-name').focus();
  }
}

function addReward() {
  const name = document.getElementById('rwd-name').value.trim();
  const cost = parseInt(document.getElementById('rwd-cost').value);
  const rewards = getRewards();
  if (!name)           { showToast('Digite o nome da recompensa'); return; }
  if (!cost||cost<1)   { showToast('Digite um custo valido'); return; }
  if (rewards.length >= MAX_REWARDS) { showToast('Limite de 3 recompensas atingido'); return; }
  rewards.push({ id: Date.now(), name, cost });
  saveRewards(rewards);
  document.getElementById('add-form').classList.remove('open');
  renderRewards();
  showToast('Recompensa salva');
}

function deleteReward(id) {
  const r = getRewards().find(x=>x.id===id);
  if (!r) return;
  openModal('Excluir', `Excluir <strong>"${r.name}"</strong>?`, () => {
    saveRewards(getRewards().filter(x=>x.id!==id));
    renderRewards();
    showToast('Recompensa excluida');
  });
}

function redeemReward(id) {
  const rewards = getRewards();
  const r = rewards.find(x=>x.id===id);
  if (!r) return;
  const saldo = getSaldo();
  if (saldo < r.cost) { showToast('Saldo insuficiente (faltam '+(r.cost-saldo)+' pts)'); return; }
  openModal(
    'Resgatar',
    `Resgatar <strong>"${r.name}"</strong> por <strong>${r.cost} pts</strong>?`,
    () => {
      setSaldo(saldo - r.cost);
      floatPoints(-r.cost);
      saveRewards(getRewards().filter(x=>x.id!==id));
      renderRewards();
      showToast('"'+r.name+'" resgatada!', 2800);
    }
  );
}

function renderRewards() {
  const list = document.getElementById('rewards-list');
  const rewards = getRewards();
  const count = rewards.length;
  document.getElementById('rwd-count').textContent = count + ' / ' + MAX_REWARDS;

  const addBtn = document.getElementById('add-btn');
  if (count >= MAX_REWARDS) {
    addBtn.classList.add('disabled');
    document.getElementById('limit-note').textContent = 'Limite maximo atingido. Resgate ou exclua uma recompensa para adicionar outra.';
  } else {
    addBtn.classList.remove('disabled');
    document.getElementById('limit-note').textContent = '';
  }

  if (!count) {
    list.innerHTML = '<div class="empty-rewards"><span class="big">Nenhuma ainda.</span>Clique em <strong>+ Nova</strong> para criar sua primeira recompensa.</div>';
    return;
  }
  list.innerHTML = rewards.map(r => `
    <div class="reward-item" id="ri-${r.id}">
      <div class="reward-icon">
        <svg viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
      </div>
      <div class="reward-info">
        <div class="reward-name">${esc(r.name)}</div>
        <div class="reward-cost">${r.cost} pontos</div>
      </div>
      <div class="reward-actions">
        <button class="r-btn del" onclick="deleteReward(${r.id})" title="Excluir">
          <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <button class="r-btn buy" onclick="redeemReward(${r.id})" title="Resgatar">
          <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

// ── POMODORO ──
const pomo = { work:25, rest:5, remaining:0, total:0, isWork:true, running:false, interval:null };

function startPomodoro(w, r) {
  Object.assign(pomo, { work:w, rest:r, remaining:w*60, total:w*60, isWork:true, running:false });
  clearInterval(pomo.interval); pomo.interval=null;
  goPage('pg-timer');
  updateTimerUI();
  resumeTimer();
}

function toggleTimer() { pomo.running ? pauseTimer() : resumeTimer(); }

function resumeTimer() {
  if (pomo.running) return;
  pomo.running = true;
  const ic = document.getElementById('pause-icon');
  ic.innerHTML = '<rect x="6" y="4" width="4" height="16" fill="rgba(255,255,255,0.85)" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="rgba(255,255,255,0.85)" stroke="none"/>';
  pomo.interval = setInterval(tick, 1000);
}

function pauseTimer() {
  pomo.running = false;
  clearInterval(pomo.interval); pomo.interval=null;
  const ic = document.getElementById('pause-icon');
  ic.innerHTML = '<polygon points="5 3 19 12 5 21 5 3" fill="rgba(255,255,255,0.85)" stroke="none"/>';
}

function tick() {
  if (pomo.remaining <= 0) { cycleDone(); return; }
  pomo.remaining--;
  if (pomo.isWork && pomo.remaining > 0 && pomo.remaining % 60 === 0) {
    setSaldo(getSaldo()+1);
    floatPoints(1);
  }
  updateTimerUI();
}

function cycleDone() {
  clearInterval(pomo.interval); pomo.interval=null; pomo.running=false;
  if (pomo.isWork) { setSaldo(getSaldo()+1); floatPoints(1); }
  pomo.isWork = !pomo.isWork;
  pomo.remaining = (pomo.isWork ? pomo.work : pomo.rest)*60;
  pomo.total = pomo.remaining;
  updateTimerUI();
  resumeTimer();
}

function updateTimerUI() {
  const m = Math.floor(pomo.remaining/60);
  const s = pomo.remaining%60;
  document.getElementById('timer-clock').textContent = m+':'+(s<10?'0':'')+s;
  document.getElementById('timer-phase').textContent = pomo.isWork ? 'TEMPO DE TRABALHO' : 'TEMPO DE DESCANSO';
  document.getElementById('timer-sub').textContent   = pomo.isWork ? pomo.work+' min de foco' : pomo.rest+' min de descanso';
  document.getElementById('timer-clock').className   = 'timer-clock'+(pomo.isWork?'':' rest');
  const circum = 2*Math.PI*46;
  const pct = 1-(pomo.remaining/pomo.total);
  const ring = document.getElementById('ring-progress');
  ring.style.strokeDashoffset = circum-(pct*circum);
  ring.style.stroke = pomo.isWork ? 'rgba(34,192,100,0.9)' : 'rgba(255,255,255,0.25)';
}

function confirmLeaveTimer() {
  openModal('Sair do Timer', 'O progresso da sessao atual sera perdido. Seus pontos ja ganhos foram salvos.', () => {
    clearInterval(pomo.interval); pomo.interval=null; pomo.running=false;
    goPage('pg-pomodoro');
  });
}

// ── SOBRE ──
let sobrePg=0, sobreTotal=3;
function changeSobrePg(dir) {
  document.getElementById('sobre-'+sobrePg).classList.remove('active');
  document.getElementById('dot-'+sobrePg).classList.remove('active');
  sobrePg = Math.max(0, Math.min(sobreTotal-1, sobrePg+dir));
  document.getElementById('sobre-'+sobrePg).classList.add('active');
  document.getElementById('dot-'+sobrePg).classList.add('active');
  document.getElementById('prev-pg').disabled = sobrePg===0;
  document.getElementById('next-pg').disabled = sobrePg===sobreTotal-1;
}

// ── PIX ──
function copiarPix() {
  navigator.clipboard.writeText(CHAVE_PIX).then(()=>showToast('Chave PIX copiada')).catch(()=>{
    const ta=document.createElement('textarea');
    ta.value=CHAVE_PIX;ta.style.cssText='position:fixed;opacity:0';
    document.body.appendChild(ta);ta.select();document.execCommand('copy');
    document.body.removeChild(ta);showToast('Chave PIX copiada');
  });
}
function assistirAD() { window.open('https://www.youtube.com/watch?v=xvFZjo5PgG0','_blank'); }

// ── STARS BACKGROUND ──
function initStars() {
  const overlay = document.getElementById('stars-overlay');
  if (!overlay || overlay.dataset.ready) return;
  overlay.dataset.ready = '1';

  // Small dot stars
  for (let i = 0; i < 90; i++) {
    const s = document.createElement('div');
    s.className = 'star-dot';
    const size  = Math.random() * 2.2 + 0.6;
    const opac  = (Math.random() * 0.5 + 0.3).toFixed(2);
    const dur   = (Math.random() * 2.5 + 1.5).toFixed(1);
    const delay = (Math.random() * 4).toFixed(1);
    s.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `top:${(Math.random()*100).toFixed(2)}%`,
      `left:${(Math.random()*100).toFixed(2)}%`,
      `--so:${opac}`, `--sd:${dur}s`, `--sl:${delay}s`
    ].join(';');
    overlay.appendChild(s);
  }

  // Sparkle stars (cross shape, a few bigger)
  for (let i = 0; i < 10; i++) {
    const s = document.createElement('div');
    s.className = 'star-dot sparkle';
    const size  = Math.random() * 2 + 2;
    const opac  = (Math.random() * 0.3 + 0.5).toFixed(2);
    const dur   = (Math.random() * 3 + 2).toFixed(1);
    const delay = (Math.random() * 5).toFixed(1);
    s.style.cssText = [
      `width:${size}px`, `height:${size}px`,
      `top:${(Math.random()*90).toFixed(2)}%`,
      `left:${(Math.random()*90).toFixed(2)}%`,
      `--so:${opac}`, `--sd:${dur}s`, `--sl:${delay}s`
    ].join(';');
    overlay.appendChild(s);
  }
}

// ── THEME TOGGLE ──
function toggleTheme() {
  initStars();
  const isDark = document.body.classList.toggle('dark');
  localStorage.setItem('foco_theme', isDark ? 'dark' : 'light');
}

// Restore saved theme on load
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('pix-key-display').textContent = CHAVE_PIX;
  updateAllBalances();
  renderRewards();
  if (localStorage.getItem('foco_theme') === 'dark') {
    initStars();
    document.body.classList.add('dark');
  }
});
