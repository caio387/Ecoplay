// ECOPLAY 3.0 client (online) - bilingual PT/EN, mixed gameplay, badges and confetti, server save
const API = {
  saveSession: (entry)=> fetch('/api/session',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry)}),
  getSessions: (auth)=> fetch('/api/sessions',{headers:{'Authorization':auth}}),
  clearSessions: (auth)=> fetch('/api/sessions',{method:'DELETE',headers:{'Authorization':auth}})
};

// UI refs
const studentLogin = document.getElementById('studentLogin');
const profLogin = document.getElementById('profLogin');
const menu = document.getElementById('menu');
const hero = document.getElementById('hero');
const studentNameInput = document.getElementById('studentName');
const studentClassInput = document.getElementById('studentClass');
const whoName = document.getElementById('whoName');
const whoClass = document.getElementById('whoClass');
const badgesRow = document.getElementById('badgesRow');
const badgePopup = document.getElementById('badgePopup');
const confettiCanvas = document.getElementById('confettiCanvas');
const langBtn = document.getElementById('langBtn');

let state = { lang:'pt', currentUser:null, badges: {} };

// SFX (WebAudio)
const SFX = (()=>{
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  function tone(freq, time=0.12, type='sine', gain=0.12){
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=gain;
    o.connect(g); g.connect(ctx.destination); o.start(); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+time); o.stop(ctx.currentTime+time+0.02);
  }
  return {coin:()=>tone(880,0.06,'square',0.08), click:()=>tone(600,0.06,'sine',0.06), win:()=>{tone(880,0.12,'sawtooth',0.12); setTimeout(()=>tone(660,0.14,'sine',0.08),120)}, ctx};
})();

// Confetti basic
function fireConfetti(){
  const c = confettiCanvas; const ctx = c.getContext('2d');
  c.width = window.innerWidth; c.height = window.innerHeight; c.classList.remove('hidden');
  let particles = [];
  for(let i=0;i<80;i++) particles.push({x:Math.random()*c.width,y:-10,vx:(Math.random()-0.5)*6,vy:Math.random()*6+2,color:['#f6c',' #6f9','#ffcc66','#66ccff'][Math.floor(Math.random()*4)]});
  let t=0;
  function frame(){
    ctx.clearRect(0,0,c.width,c.height);
    particles.forEach(p=>{ p.x+=p.vx; p.y+=p.vy; p.vy+=0.12; ctx.fillStyle=p.color; ctx.fillRect(p.x,p.y,6,10); });
    t++; if(t<160) requestAnimationFrame(frame); else { ctx.clearRect(0,0,c.width,c.height); c.classList.add('hidden'); }
  }
  frame();
}

// badges definitions
const BADGES = {
  econ: {id:'econ',icon:'ð°',name_pt:'Economista JÃºnior',name_en:'Economist Junior',msg_pt:'ParabÃ©ns, {name}! VocÃª virou um Economista JÃºnior ð°!', msg_en:'Congrats, {name}! You became an Economist Junior ð°!'},
  invest: {id:'invest',icon:'ð¦',name_pt:'Investidor Esperto',name_en:'Smart Investor',msg_pt:'ParabÃ©ns, {name}! VocÃª virou um Investidor Esperto ð¦!', msg_en:'Congrats, {name}! You became a Smart Investor ð¦!'},
  planner: {id:'planner',icon:'ð§ ',name_pt:'Planejador Mestre',name_en:'Master Planner',msg_pt:'ParabÃ©ns, {name}! VocÃª conquistou Planejador Mestre ð§ !', msg_en:'Congrats, {name}! You got Master Planner ð§ !'},
  star: {id:'star',icon:'ð',name_pt:'Super Aluno',name_en:'Super Student',msg_pt:'ParabÃ©ns, {name}! VocÃª Ã© um Super Aluno ð!', msg_en:'Congrats, {name}! You are a Super Student ð!'}
};

// helpers
function t(key,en){ return state.lang==='pt' ? key : en; }
function show(el){ el.classList.remove('hidden'); }
function hide(el){ el.classList.add('hidden'); }

// initial wiring
document.getElementById('playBtn').addEventListener('click', ()=>{ hide(hero); show(studentLogin); });
document.getElementById('profBtn').addEventListener('click', ()=>{ hide(hero); show(profLogin); });
document.getElementById('studentBack').addEventListener('click', ()=>{ show(hero); hide(studentLogin); });
document.getElementById('profBack').addEventListener('click', ()=>{ show(hero); hide(profLogin); });

document.getElementById('studentEnter').addEventListener('click', ()=>{
  const name = studentNameInput.value.trim(); const cls = studentClassInput.value.trim()||'NoClass';
  if(!name){ alert('Digite seu nome / Enter your name'); return; }
  state.currentUser = {type:'student', name, class:cls, key:${name}___${cls}};
  whoName.textContent = name; whoClass.textContent = cls;
  loadBadgesFromServerOrLocal();
  hide(studentLogin); show(menu);
});

document.getElementById('profEnter').addEventListener('click', async ()=>{
  const user = document.getElementById('profUser').value.trim(); const pass = document.getElementById('profPass').value;
  if(!user || !pass){ alert('Informe usuÃ¡rio e senha'); return; }
  // attempt to fetch sessions with Basic auth to validate
  const auth = 'Basic '+btoa(user+':'+pass);
  const res = await API.getSessions(auth);
  if(!res.ok){ alert('Credenciais invÃ¡lidas'); return; }
  const data = await res.json();
  state.currentUser = {type:'teacher', user}; show(profArea); hide(hero); hide(profLogin); renderTeacherReport(data); window.profAuth = auth;
});

document.getElementById('logoutBtn').addEventListener('click', ()=> location.reload());

// game buttons
document.querySelectorAll('.game-btn').forEach(b=> b.addEventListener('click', ()=> startGame(b.dataset.game)));

// game implementations (mixed: saving, investing, planning mechanics)
function startGame(game){
  if(!state.currentUser || state.currentUser.type!=='student'){ alert('Entre como aluno'); return; }
  hide(menu); show(document.getElementById('gameArea'));
  document.getElementById('score').textContent = '0';
  if(game==='saveSpend') playSaveSpend();
  if(game==='invest') playInvest();
}

function playSaveSpend(){
  document.getElementById('gameTitle').textContent = t('Poupar vs Gastar','Save vs Spend');
  let score=0; const scenarios = [
    {desc:'VocÃª recebeu R$20. O que faz?','options':[ {t:'Guardar R$15',p:10},{t:'Gastar com besteira',p:0} ]},
    {desc:'Precisa de material escolar. O que faz?','options':[ {t:'Comparar preÃ§os e poupar',p:10},{t:'Comprar a primeira opÃ§Ã£o',p:0} ]},
    {desc:'Quer um videogame caro. O que faz?','options':[ {t:'Criar plano de poupanÃ§a',p:10},{t:'Parcelar sem pensar',p:0} ]},
  ]; let i=0; render();
  function render(){ const s=scenarios[i]; const gc=document.getElementById('gameContent'); gc.innerHTML=<p>${s.desc}</p>; const cont=document.createElement('div'); cont.className='choice'; s.options.forEach(o=>{ const d=document.createElement('div'); d.className='card-option'; d.innerHTML=<div>${o.t}</div>; d.addEventListener('click', ()=>{ SFX.click(); if(o.p>0){ score+=o.p; SFX.coin(); } else score-=2; document.getElementById('score').textContent=score; i++; if(i<scenarios.length) setTimeout(render,300); else finish('Poupar vs Gastar',score); }); cont.appendChild(d); }); gc.appendChild(cont); }
}

function playInvest(){
  document.getElementById('gameTitle').textContent = t('Investimento Simples','Simple Investment');
  let score=0; const gc=document.getElementById('gameContent'); gc.innerHTML=''; const prompt=document.createElement('div'); prompt.innerHTML=<p>VocÃª tem R$100. Escolha onde aplicar:</p>; const opts=document.createElement('div'); opts.className='choice';
  const choices=[{t:'PoupanÃ§a (1%)',m:1.01},{t:'CDB (5%)',m:1.05},{t:'AÃ§Ãµes (variÃ¡vel)',m:1.10}];
  choices.forEach(ch=>{ const d=document.createElement('div'); d.className='card-option'; d.innerHTML=<div>${ch.t}</div>; d.addEventListener('click', ()=>{ SFX.click(); let res=100*ch.m; if(ch.t.includes('AÃ§Ãµes')){ const rnd=(Math.random()0.3)-0.05; res=Math.round(res(1+rnd)); } const gain=Math.round(res-100); gc.innerHTML=<p>Resultado em 1 ano: R$${res} (+R$${gain})</p><button id="okBtn">Continuar</button>; if(gain>0){ score+=Math.round(gain/2); SFX.coin(); } else score-=5; document.getElementById('score').textContent=score; document.getElementById('okBtn').addEventListener('click', ()=> finish('Investimento Simples',score)); }); opts.appendChild(d); }); gc.appendChild(prompt); gc.appendChild(opts);
}

async function finish(name, score){
  SFX.win(); // show popup and check badges
  // determine badges earned by this play
  const earned = [];
  // econ: completing saveSpend
  if(name==='Poupar vs Gastar') earned.push('econ');
  if(name==='Investimento Simples') earned.push('invest');
  if(score>=25) earned.push('planner');
  // super student if has completed both at least once
  // fetch current saved sessions for this student from server? We'll use local cached badges in state.badges
  // mark earned badges and save session to server
  const entry = {name: state.currentUser.name, class: state.currentUser.class, game: name, score, date: new Date().toISOString(), badges: earned};
  try{
    await API.saveSession(entry);
  }catch(e){ console.warn('Save failed',e); }
  // update local badge state: persist in localStorage for quick UI
  const current = JSON.parse(localStorage.getItem('ecoplay_badges')||'{}');
  if(!current[state.currentUser.key]) current[state.currentUser.key] = {name:state.currentUser.name,class:state.currentUser.class,badges:[]};
  earned.forEach(b=>{ if(!current[state.currentUser.key].badges.includes(b)) current[state.currentUser.key].badges.push(b); });
  // check super student (both econ and invest)
  const have = current[state.currentUser.key].badges;
  if(have.includes('econ') && have.includes('invest') && !have.includes('star')) have.push('star');
  localStorage.setItem('ecoplay_badges', JSON.stringify(current));
  state.badges = current[state.currentUser.key].badges.reduce((acc,id)=>{ acc[id]=true; return acc; },{});
  showBadgePopup(earned);
  // return to menu after short delay
  setTimeout(()=>{ hide(document.getElementById('gameArea')); show(menu); renderBadges(); }, 1400);
}

function showBadgePopup(ids){
  if(!ids || ids.length===0) return;
  ids.forEach(id=>{
    const b = BADGES[id];
    const msg = (state.lang==='pt'? b.msg_pt : b.msg_en).replace('{name}', state.currentUser.name);
    badgePopup.innerHTML = <div style="font-size:34px">${b.icon}</div><div style="margin-top:8px">${msg}</div>;
    show(badgePopup); fireConfetti(); SFX.win();
    setTimeout(()=> hide(badgePopup), 2500);
  });
}

// load badges from local storage and render
function loadBadgesFromServerOrLocal(){
  const all = JSON.parse(localStorage.getItem('ecoplay_badges')||'{}');
  const user = all[state.currentUser.key] || {badges:[]};
  state.badges = (user.badges||[]).reduce((acc,id)=>{ acc[id]=true; return acc; },{});
  renderBadges();
}

function renderBadges(){
  badgesRow.innerHTML='';
  Object.keys(BADGES).forEach(k=>{
    const b = BADGES[k]; const unlocked = !!state.badges[k];
    const el = document.createElement('div'); el.className='badge'; el.textContent = ${b.icon} ${state.lang==='pt'?b.name_pt:b.name_en} + (unlocked? ' â':'');
    badgesRow.appendChild(el);
  });
}

// Professor report rendering
async function renderTeacherReport(data){
  // data is array of sessions; group by student and class and count badges
  const rows = {};
  data.forEach(s=>{
    const key = s.name+'_'+s.class;
    if(!rows[key]) rows[key] = {name:s.name,class:s.class,sessions:[],badges:new Set()};
    rows[key].sessions.push(s);
    (s.badges||[]).forEach(b=> rows[key].badges.add(b));
  });
  // build HTML table and averages per class, and counts per badge
  let html = '<table><thead><tr><th>Aluno</th><th>Turma</th><th>Jogo</th><th>PontuaÃ§Ã£o</th><th>Data</th><th>Badges</th></tr></thead><tbody>';
  const badgeCounts = {econ:0,invest:0,planner:0,star:0};
  const classScores = {};
  Object.values(rows).forEach(r=>{
    r.sessions.forEach(s=>{
      html += <tr><td>${r.name}</td><td>${r.class}</td><td>${s.game}</td><td>${s.score}</td><td>${new Date(s.date).toLocaleString()}</td><td>${(s.badges||[]).map(b=>BADGES[b].icon).join(' ')}</td></tr>;
      classScores[r.class] = classScores[r.class]||[]; classScores[r.class].push(Number(s.score));
    });
    r.badges.forEach(b=> badgeCounts[b] = (badgeCounts[b]||0)+1);
  });
  html += '</tbody></table>';
  // averages
  const parts = Object.keys(classScores).map(cl=> ${cl}: ${Math.round((classScores[cl].reduce((a,b)=>a+b,0)/classScores[cl].length)*10)/10});
  html += <div style="margin-top:12px"><strong>MÃ©dia por turma:</strong> ${parts.join(' | ')}</div>;
  html += <div style="margin-top:8px"><strong>Medalhas por turma:</strong> ${Object.keys(badgeCounts).map(k=> BADGES[k].icon + ' ' + (badgeCounts[k]||0)).join(' | ')}</div>;
  document.getElementById('report').innerHTML = html;
}

// professor area controls
document.getElementById('refreshBtn').addEventListener('click', async ()=>{
  if(!window.profAuth) return alert('Professor nÃ£o autenticado');
  const res = await API.getSessions(window.profAuth);
  const data = await res.json();
  renderTeacherReport(data);
});
document.getElementById('exportBtn').addEventListener('click', async ()=>{
  if(!window.profAuth) return alert('Professor nÃ£o authenticated');
  const res = await API.getSessions(window.profAuth);
  const data = await res.json();
  const rows = [['Aluno','Turma','Jogo','PontuaÃ§Ã£o','Data']];
  data.forEach(s=> rows.push([s.name,s.class,s.game,s.score,s.date]));
  const csv = rows.map(r=> r.map(c=>"${String(c).replace(/"/g,'""')}").join(',')).join('\\n');
  const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='ecoplay_sessions.csv'; a.click();
});
document.getElementById('clearBtn').addEventListener('click', async ()=>{
  if(!window.profAuth) return alert('Professor nÃ£o authenticated');
  if(!confirm('Confirma limpar todos os dados no servidor?')) return;
  await API.clearSessions(window.profAuth);
  document.getElementById('report').innerHTML = '<em>Dados limpos.</em>';
});

// language toggle
langBtn.addEventListener('click', ()=>{ state.lang = state.lang==='pt'?'en':'pt'; langBtn.textContent = state.lang==='pt'?'EN':'PT'; document.getElementById('slogan').textContent = state.lang==='pt'?'Aprenda jogando. Invista brincando.':'Learn by playing. Invest by having fun.'; });

// basic enable audio on gesture
document.body.addEventListener('click', ()=>{ if(SFX.ctx.state==='suspended') SFX.ctx.resume(); }, {once:true});
