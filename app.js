(function(){
  const $ = (id)=>document.getElementById(id);

  function getSeedFromURL() {
    const q = new URLSearchParams(window.location.search);
    if (q.has('seed')) return Number(q.get('seed'));
    const seed = Math.floor(Math.random() * 1e9);
    q.set('seed', seed);
    window.history.replaceState(null, '', window.location.pathname + '?' + q.toString());
    return seed;
  }
  let galaxySeed = getSeedFromURL();
  const galaxiesRange = $("galaxiesRange"), galaxies = $("galaxies");
  const avgStarsRange = $("avgStarsRange"), avgStars = $("avgStars");
  const muRange = $("muRange"), mu = $("mu");
  const fpRange = $("fpRange"), fp = $("fp");
  const fhabRange = $("fhabRange"), fhab = $("fhab");
  const fbioDropdown = $("fbioDropdown"), fbio = $("fbio");

  // Outputs
  const starsOut = $("starsOut"), starsOutWords=$("starsOutWords");
  const planetsOut = $("planetsOut"), planetsOutWords=$("planetsOutWords");
  const systemsOut = $("systemsOut"), systemsOutWords=$("systemsOutWords");
  const mOut = $("mOut");
  const lifeOut = $("lifeOut"), lifeOutWords=$("lifeOutWords");

  const btnReset = $("btnReset"), btnShare=$("btnShare");
  const copyFallback = $("copyFallback"), copyInput=$("copyInput");
  const testBtn=$("runTests"), testLog=$("testLog");

  const presetButtons=[...document.querySelectorAll('[data-preset]')];

  // Helpers
  function parseNum(v){
    if(typeof v!=="string") return Number(v);
    v=v.trim(); if(!v) return NaN;
    v=v.replace(/,/g,''); // allow commas
    return Number(v);     // supports scientific notation
  }

  function words(n){
    if(!isFinite(n)) return '';
    const names=[
      {t:1e24, n:'septillion'}, {t:1e21, n:'sextillion'}, {t:1e18, n:'quintillion'},
      {t:1e15, n:'quadrillion'}, {t:1e12, n:'trillion'}, {t:1e9, n:'billion'},
      {t:1e6, n:'million'}, {t:1e3, n:'thousand'}
    ];
    for(const w of names){ if(Math.abs(n)>=w.t) return `${(n/w.t).toFixed(2)} ${w.n}`; }
    return n.toLocaleString('en-US');
  }

  function fmt(n){
    if(!isFinite(n)) return '—';
    const abs=Math.abs(n);
    if(abs>=1e6) return n.toExponential(3).replace(/e\+?(-?\d+)/,'×10^$1');
    return n.toLocaleString('en-US',{maximumFractionDigits:3});
  }

  function sync(range,input){
    range.addEventListener('input',()=>{ input.value = range.value; computeAndRender(); });
    input.addEventListener('change',()=>{ const val=parseNum(input.value); if(isFinite(val)){ range.value = val; } computeAndRender(); });
  }

  function compute(){
    const G = parseNum(galaxies.value);
    const Sg = parseNum(avgStars.value);
    const MU = parseNum(mu.value);
    const FP = parseNum(fp.value);
    const FH = parseNum(fhab.value);
    const FB = parseNum(fbioDropdown.value);
    if (fbio) fbio.value = fbioDropdown.value;

    const stars = G * Sg;
    const planets = MU * stars;
    const systems = FP * stars;
    const m = FP>0 ? MU / FP : Infinity;
    const life = planets * FH * FB;

    return {stars, planets, systems, m, life};
  }

  function computeAndRender(){
    const {stars, planets, systems, m, life} = compute();
    starsOut.textContent = fmt(stars);
    planetsOut.textContent = fmt(planets);
    systemsOut.textContent = fmt(systems);
    mOut.textContent = isFinite(m)? m.toFixed(3): '—';

    starsOutWords.textContent = words(stars);
    planetsOutWords.textContent = words(planets);
    systemsOutWords.textContent = words(systems);
    lifeOut.textContent = fmt(life);
    lifeOutWords.textContent = words(life);

    // Estimated habitable planets
    const FH = parseNum(fhab.value);
    const habitable = planets * FH;
    const habOut = document.getElementById('habOut');
    const habOutWords = document.getElementById('habOutWords');
    if(habOut) habOut.textContent = fmt(habitable);
    if(habOutWords) habOutWords.textContent = words(habitable);

    updateURL();
  }

  function setValues(v){
    galaxies.value = v.G; galaxiesRange.value = v.G;
    avgStars.value = v.Sg; avgStarsRange.value = v.Sg;
    mu.value = v.MU; muRange.value = v.MU;
    fp.value = v.FP; fpRange.value = v.FP;
    fhab.value = v.FH; fhabRange.value = v.FH;
    if (fbioDropdown) fbioDropdown.value = v.FB;
    if (fbio) fbio.value = v.FB;
    computeAndRender();
  }

  function updateURL(){
    try{
      const params = new URLSearchParams({
        G: galaxies.value, Sg: avgStars.value, MU: mu.value, FP: fp.value, FH: fhab.value, FB: fbioDropdown.value, seed: galaxySeed
      });
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);
    }catch(e){ /* sandboxed envs may block history; ignore */ }
  }

  function readURL(){
    const q = new URLSearchParams(location.search);
    const getOr = (def,k)=> (q.get(k) ?? def);
    return {
      G: getOr('2e11','G'), Sg:getOr('1e9','Sg'),
      MU:getOr('1.5','MU'), FP:getOr('0.9','FP'),
      FH:getOr('0.05','FH'), FB:getOr('1e-10','FB')
    };
  }

  // Clipboard support
  function copySupportMethod(){
    if(navigator.clipboard && window.isSecureContext) return 'clipboard';
    if(document.queryCommandSupported && document.queryCommandSupported('copy')) return 'execCommand';
    return 'prompt';
  }
  async function tryCopyText(text){
    const method = copySupportMethod();
    if(method==='clipboard'){
      try{ await navigator.clipboard.writeText(text); return {ok:true, method}; }catch{}
    }
    if(method==='execCommand'){
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly','');
      ta.style.position='fixed'; ta.style.top='-1000px'; ta.style.opacity='0';
      document.body.appendChild(ta); ta.select();
      try{ const ok = document.execCommand('copy'); document.body.removeChild(ta); if(ok) return {ok:true, method}; }catch{ document.body.removeChild(ta); }
    }
    try{ window.prompt('Copy link:', text); return {ok:true, method:'prompt'}; }catch(e){ return {ok:false, method:'none', error:e}; }
  }

  sync(galaxiesRange, galaxies); sync(avgStarsRange, avgStars);
  sync(muRange, mu); sync(fpRange, fp);
  sync(fhabRange, fhab);
  if (fbioDropdown) {
    fbioDropdown.addEventListener('change', () => {
      if (fbio) fbio.value = fbioDropdown.value;
      computeAndRender();
    });
    if (fbio) fbio.value = fbioDropdown.value;
  }

  btnReset.addEventListener('click',()=> setValues(readURL()));

  btnShare.addEventListener('click', async()=>{
    const url = location.href;
    copyFallback.classList.remove('show');
    const res = await tryCopyText(url);
    if(res.ok){
      btnShare.textContent = (res.method==='prompt') ? 'Link shown!' : 'Link copied!';
      setTimeout(()=>btnShare.textContent='Share link',1200);
      if(res.method==='prompt'){
        copyInput.value=url; copyFallback.classList.add('show'); copyInput.focus(); copyInput.select();
      }
    }else{
      copyInput.value=url; copyFallback.classList.add('show'); copyInput.focus(); copyInput.select();
    }
  });

  presetButtons.forEach(b=> b.addEventListener('click',()=>{
    const p=b.dataset.preset;
    const presets={
      conservative:{G:'2e11',Sg:'1e11',MU:'1.2',FP:'0.8',FH:'0.02',FB:'1e-12'},
      moderate:{G:'5e11',Sg:'5e9',MU:'1.5',FP:'0.9',FH:'0.05',FB:'1e-10'},
      optimistic:{G:'2e12',Sg:'1e10',MU:'2.0',FP:'0.98',FH:'0.2',FB:'1e-6'},
      rare:{G:'2e11',Sg:'1e9',MU:'1.0',FP:'0.8',FH:'0.01',FB:'1e-15'}
    };
    setValues(presets[p]);
  }));

  // Initialize
  setValues(readURL());

  // === Self Tests ===
  const log = (msg, ok=true)=>{
    const li=document.createElement('li');
    li.innerHTML = ok ? `<span class="testpass">✓</span> ${msg}` : `<span class="testfail">✗</span> ${msg}`;
    testLog.appendChild(li);
  };
  const approx=(a,b,tol=1e-9)=> Math.abs(a-b) <= tol*Math.max(1, Math.abs(a), Math.abs(b));
  function runTests(){
    testLog.innerHTML='';
    const saved = { G:galaxies.value, Sg:avgStars.value, MU:mu.value, FP:fp.value, FH:fhab.value, FB:fbio.value };
    const tc = {G:'2e11', Sg:'1e9', MU:'1.5', FP:'0.9', FH:'0.05', FB:'1e-10'};
    setValues(tc);
    const {stars, planets, systems, m, life} = compute();
    const E = {stars:2e20, planets:3e20, systems:1.8e20, m:1.5/0.9, life:1.5e9};
    log(`Stars expected 2e20, got ${stars}` , approx(stars,E.stars,1e-12));
    log(`Planets expected 3e20, got ${planets}` , approx(planets,E.planets,1e-12));
    log(`Systems expected 1.8e20, got ${systems}` , approx(systems,E.systems,1e-12));
    log(`m expected ~${E.m}, got ${m}` , approx(m,E.m,1e-12));
    log(`Life expected 1.5e9, got ${life}` , approx(life,E.life,1e-12));
    const p1 = parseNum('1,234.5'); log(`parseNum handles commas (1234.5): ${p1}`, approx(p1,1234.5,1e-12));
    const p2 = parseNum('2e11');    log(`parseNum handles scientific notation (2e11): ${p2}`, approx(p2,2e11,1e-12));
    const method = (navigator.clipboard && window.isSecureContext) ? 'clipboard' : 'fallback'; log(`Clipboard method available: ${method}`, true);
    setValues(saved);
  }
  testBtn.addEventListener('click', runTests);
})();

// === Galaxy Visualization (multi-arm + life overlay) ===
(function(){
  const canvas = document.getElementById('galaxy');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const animateChk = document.getElementById('vizAnimate');
  const qualitySel = document.getElementById('vizQuality');
  const paletteSel = document.getElementById('vizPalette');
  const regenBtn = document.getElementById('vizRegen');
  const downloadBtn = document.getElementById('vizDownload');

  const armsSel = document.getElementById('vizArms');     // optional
  const spinSel = document.getElementById('vizSpin');     // optional
  const lifeToggle = document.getElementById('vizLifeEnable'); // optional
  const lifeBoostSel = document.getElementById('vizLifeBoost'); // optional

  let off, offCtx, offLife, offLifeCtx, stars=[], t=0, running=true, rafId=null;
  let cfg = {arms:3, points:4000, spin:0.000045, spinDir:-1};

  // Zoom and pan state
  let zoom = 1.0;
  let panX = 0, panY = 0;
  let isDragging = false, dragStartX = 0, dragStartY = 0, panStartX = 0, panStartY = 0;

  const resetView = () => {
    zoom = 1.0;
    panX = 0;
    panY = 0;
  };
  let lifeStarIndices = new Set();

  // Tooltip logic
  const tooltip = document.getElementById('starTooltip');
  const galaxyRect = ()=>canvas.getBoundingClientRect();
  let hoveredStar = null;

  // Seeded RNG for consistent star stats
  function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
  }

  function genStarStats(seed, MU, FH, FB) {
    const rand = mulberry32(seed);
    const planets = Math.max(1, Math.round(rand()*MU + rand()*MU));
    let planetStats = [];
    let supportsLife = false;
    for(let i=0;i<planets;i++){
      const dist = +(0.2 + rand()*29.8).toFixed(2); // AU, 0.2–30 AU
      const moons = Math.round(rand()*4);
      const hab = rand()<FH;
      const bio = hab && (rand()<FB);
      if(bio) supportsLife = true;
      planetStats.push({dist, moons, hab, bio});
    }
    return {planets, planetStats, supportsLife};
  }

  // Palettes
  function lerp(a,b,t){ return a+(b-a)*t; }
  function hexToRgb(h){ h=h.replace('#',''); if(h.length===3) h=h.split('').map(c=>c+c).join(''); const n=parseInt(h,16); return {r:(n>>16)&255,g:(n>>8)&255,b:n&255}; }
  function rgba({r,g,b},a){ return `rgba(${r},${g},${b},${a})`; }
  function makeGradient(stops, samples=7, alpha=0.95){
    const cols=[];
    for(let i=0;i<samples;i++){
      const t=i/(samples-1);
      const idx=Math.min(stops.length-2, Math.floor(t*(stops.length-1)));
      const lt=(t*(stops.length-1))-idx;
      const A=hexToRgb(stops[idx]), B=hexToRgb(stops[idx+1]);
      const rgb={r:Math.round(lerp(A.r,B.r,lt)), g:Math.round(lerp(A.g,B.g,lt)), b:Math.round(lerp(A.b,B.b,lt))};
      cols.push(rgba(rgb, 0.9*(0.85+0.15*Math.random())));
    }
    return cols;
  }
  function pickPalette(name){
    const sets={
      ice:    makeGradient(['#e6fbff','#b6ecff','#7ad7ff','#cfc9ff','#ffffff']),
      sunset: makeGradient(['#fff2ae','#ffd37a','#ff9e7a','#ff6e9a','#9a7bff']),
      violet: makeGradient(['#e7d9ff','#c3b7ff','#9a7bff','#7a7aff','#50e3ff']),
      aurora: makeGradient(['#a1fff4','#50e3ff','#9a7bff','#ff66c4','#ffd166']),
      nebula: makeGradient(['#2e0854','#7a7bff','#ff66c4','#ffd166','#ffffff']),
      gold: makeGradient(['#fffbe6','#ffe066','#ffd700','#ffae00','#cfa600']),
      emerald: makeGradient(['#e6fff2','#7affc9','#55e6a5','#1bc47d','#0f7c4a']),
      ruby: makeGradient(['#ffe6e6','#ff7a7a','#ff3b3b','#c70039','#900c3f']),
      ocean: makeGradient(['#e6f7ff','#7ad7ff','#50e3ff','#0077be','#003f5c']),
      mono: makeGradient(['#ffffff','#e0e0e0','#b0b0b0','#707070','#222222'])
    };
    return sets[name] || sets.ice;
  }

  function setQuality(q){
    if(q==='low') cfg.points=2000;
    else if(q==='high') cfg.points=15000;
    else cfg.points=4000;
  }
  function makeOffscreen(){
    off = document.createElement('canvas'); off.width = canvas.width; off.height = canvas.height; offCtx = off.getContext('2d');
    offLife = document.createElement('canvas'); offLife.width = canvas.width; offLife.height = canvas.height; offLifeCtx = offLife.getContext('2d');
  }
  function gaussian(){ let u=0,v=0; while(u===0)u=Math.random(); while(v===0)v=Math.random(); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); }

function generate(){
  const W=canvas.width, H=canvas.height; const cx=W/2, cy=H/2;
  stars = [];
  // Scale galaxy size to fill canvas
  const arms = cfg.arms, tight=0.23, maxTheta=Math.PI*5.5;
  // k controls galaxy size, scale with canvas size
  const k = Math.min(W, H) / 150;

  // outward-bias settings
  const radialBiasPow = 2.0; // >1 favors outer radii, 1.0 = no bias
  const radialWidth   = 50.0; // arm thickness in pixels
  const normJitter    = 2; // small extra gaussian noise

  let rMax = 0;


  const MU = Number(document.getElementById('mu')?.value || '1');
  const FH = Number(document.getElementById('fhab')?.value || '0');
  const FB = Number(document.getElementById('fbio')?.value || '0');

  for(let i=0;i<cfg.points;i++){
    const arm = i % arms;
    const baseTheta = Math.random()*maxTheta;
    const armOffset = (2*Math.PI/arms)*arm;
    const perp = (Math.random()-0.5)*0.28;
    const theta = baseTheta + armOffset + perp;
    const rc = k * Math.exp(tight * baseTheta);
    const u = Math.pow(Math.random(), 1 / radialBiasPow);
    const skew = (u * 2 - 1);
    const r = Math.max(0,
      rc + skew * radialWidth + gaussian() * normJitter
    );
    const x = cx + r*Math.cos(theta);
    const y = cy + r*Math.sin(theta)*0.62;
    const sz = (Math.random()*1.2 + 0.18) * 1.7;
    const rVis = Math.hypot(x-cx, (y-cy)/0.62);
    if(rVis>rMax) rMax = rVis;
    // Seed for star: use i for consistency
    const stats = genStarStats(i, MU, FH, FB);
    stars.push({x,y,sz,rVis, seed:i, stats});
  }

  cfg.rMax = rMax;

  // draw cached starfield with a radius-based alpha falloff
  const pal = pickPalette(paletteSel && paletteSel.value);
  offCtx.clearRect(0,0,off.width,off.height);
  offCtx.globalCompositeOperation='lighter';
  for(const s of stars){
    const rn = rMax>0 ? Math.min(1, s.rVis / rMax) : 0;
    offCtx.globalAlpha = 0.55 + 0.45*rn;
    const col = pal[Math.min(pal.length-1, Math.floor(rn*(pal.length-1)))];
    offCtx.fillStyle = col;
    offCtx.beginPath();
    offCtx.arc(s.x, s.y, s.sz, 0, Math.PI*2);
    offCtx.fill();
  }
  offCtx.globalAlpha = 1;
  offCtx.globalCompositeOperation='source-over';

  // Life overlay reset
  offLifeCtx.clearRect(0,0,offLife.width,offLife.height);
}


  function markLife(){
    offLifeCtx.clearRect(0,0,offLife.width,offLife.height);
    const MU = Number(document.getElementById('mu')?.value || '1');
    const FH = Number(document.getElementById('fhab')?.value || '0');
    const FB = Number(document.getElementById('fbio')?.value || '0');
    const p = Math.max(0, MU*FH*FB);
    let n = Math.round(stars.length * p * 1e6);
    if(p>0 && n<1) n=1;
    n = Math.min(n, Math.floor(stars.length*0.1));

    lifeStarIndices.clear();
    offLifeCtx.globalCompositeOperation='lighter';
    for(let i=0;i<n;i++){
      const s = pickOuterBiasedStar(2.5);
      lifeStarIndices.add(s.seed);
      const glow = offLifeCtx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.sz*3);
      glow.addColorStop(0,'rgba(255,255,200,0.5)');
      glow.addColorStop(1,'rgba(255,255,200,0)');
      offLifeCtx.fillStyle = glow;
      offLifeCtx.beginPath(); offLifeCtx.arc(s.x, s.y, s.sz*2, 0, Math.PI*2); offLifeCtx.fill();
      offLifeCtx.fillStyle='rgba(255,255,255,0.6)';
      offLifeCtx.beginPath(); offLifeCtx.arc(s.x, s.y, s.sz*1.05, 0, Math.PI*2); offLifeCtx.fill();
    }
    offLifeCtx.globalCompositeOperation='source-over';
  }

  function pickOuterBiasedStar(biasPow = 2){
    // Favor outer stars: weight = (radius / rMax)^biasPow
    for(let tries=0; tries<10; tries++){
        const s = stars[(Math.random()*stars.length)|0];
        const w = Math.pow((s.rVis || 0) / (cfg.rMax || 1), biasPow);
        if (Math.random() < w) return s; // accept biased by radius
    }
    // Fallback if rejection-sampling fails
    return stars[(Math.random()*stars.length)|0];
  }

  function render(dt){
    const W=canvas.width, H=canvas.height; const cx=W/2, cy=H/2;
    ctx.clearRect(0,0,W,H);
    ctx.fillStyle = '#000'; ctx.fillRect(0,0,W,H);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t*cfg.spin*cfg.spinDir);
    ctx.scale(zoom, zoom);
    ctx.translate(panX/zoom, panY/zoom);
    ctx.translate(-cx, -cy);
    ctx.drawImage(off,0,0);
    ctx.globalCompositeOperation='lighter';
    ctx.drawImage(offLife,0,0);
    ctx.globalCompositeOperation='source-over';
    ctx.restore();
    if(animateChk && animateChk.checked){ t += (dt||16); }
  }
  // Mouse wheel for zoom
  canvas.addEventListener('wheel', function(e){
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mx = (e.clientX - rect.left) * (canvas.width/rect.width);
  const my = (e.clientY - rect.top) * (canvas.height/rect.height);
  const cx = canvas.width/2, cy = canvas.height/2;
  // Convert mouse to galaxy coords
  const mouseX = (mx - cx - panX)/zoom;
  const mouseY = (my - cy - panY)/zoom;
  // Zoom factor
  const factor = e.deltaY < 0 ? 1.15 : 0.87;
  const newZoom = Math.max(0.3, Math.min(zoom * factor, 8));
  // Adjust pan so zoom centers on mouse
  panX += mouseX * (zoom - newZoom);
  panY += mouseY * (zoom - newZoom);
  zoom = newZoom;
  if(!(animateChk && animateChk.checked)) render();
  }, {passive:false});

  // Mouse drag for pan
  canvas.addEventListener('mousedown', function(e){
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    panStartX = panX;
    panStartY = panY;
    canvas.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', function(e){
    if(isDragging){
      panX = panStartX + (e.clientX - dragStartX);
      panY = panStartY + (e.clientY - dragStartY);
      if(!(animateChk && animateChk.checked)) render();
    }
    // Track last mouse event for tooltip updates
    window._lastMouseEvent = e;
    if(!(animateChk && animateChk.checked)) t = 0;
  });
  window.addEventListener('mouseup', function(){
    if(isDragging){
      isDragging = false;
      canvas.style.cursor = '';
    }
  });

  // Reset view button
  document.getElementById('vizResetView')?.addEventListener('click', function(){
  resetView();
  if(!(animateChk && animateChk.checked)) render();
  });

  let last=performance.now();
  function loop(now){
    if(!running){ rafId=null; return; }
    const dt = now-last; last=now;
    if(animateChk && animateChk.checked){
      t += dt;
    }
    render(dt);
    // Only show/update tooltips when animation is off
    if(!(animateChk && animateChk.checked)) {
      if(window._lastMouseEvent){
        const e = window._lastMouseEvent;
        const rect = galaxyRect();
        const mx = (e.clientX - rect.left) * (canvas.width/rect.width);
        const my = (e.clientY - rect.top) * (canvas.height/rect.height);
        const cx = canvas.width/2, cy = canvas.height/2;
        let gx = (mx - cx - panX)/zoom;
        let gy = (my - cy - panY)/zoom;
        const angle = -(t*cfg.spin*cfg.spinDir);
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        let rx = gx * cosA - gy * sinA;
        let ry = gx * sinA + gy * cosA;
        gx = rx + cx;
        gy = ry + cy;
        let minDist = Infinity;
        let closest = null;
        const baseRadius = 12;
        for(const s of stars){
          const radius = s.sz * baseRadius / zoom;
          const dist = Math.hypot(gx-s.x, gy-s.y);
          if(dist < radius && dist < minDist){
            minDist = dist;
            closest = s;
          }
        }
        if(closest){
          hoveredStar = closest;
          showStarTooltip(closest, e.clientX, e.clientY);
        }else{
          hoveredStar = null;
          hideStarTooltip();
        }
      }
    } else {
      hideStarTooltip();
    }
    rafId = requestAnimationFrame(loop);
  }

  function restart(){
    running=false; if(rafId) cancelAnimationFrame(rafId);
    if(armsSel) cfg.arms = parseInt(armsSel.value,10) || cfg.arms;
    if(spinSel) cfg.spinDir = (spinSel.value==='cw') ? 1 : -1;
    makeOffscreen();
    generate();
    markLife();
    running=true; last=performance.now(); rafId=requestAnimationFrame(loop);
  }

  if(animateChk){ animateChk.addEventListener('change',()=>{ if(animateChk.checked && !running){ running=true; rafId=requestAnimationFrame(loop); } if(!animateChk.checked && running){ running=false; } }); }
  if(animateChk){
    animateChk.addEventListener('change',()=>{
      if(animateChk.checked && !running){
        running=true;
        last=performance.now();
        rafId=requestAnimationFrame(loop);
      }
      if(!animateChk.checked && running){
        running=false;
      }
    });
  }
  if(qualitySel){ qualitySel.addEventListener('change',()=>{ setQuality(qualitySel.value); restart(); }); }
  if(paletteSel){ paletteSel.addEventListener('change',()=> restart()); }
  if(regenBtn){ regenBtn.addEventListener('click',()=> restart()); }
  if(downloadBtn){ downloadBtn.addEventListener('click',()=> {const link = document.createElement('a');link.download = 'galaxy.png';link.href = canvas.toDataURL('image/png');link.click();}); }
  if(armsSel){ armsSel.addEventListener('change',()=> restart()); }
  if(spinSel){ spinSel.addEventListener('change',()=>{ cfg.spinDir = (spinSel.value==='cw') ? 1 : -1; }); }
  if(lifeToggle){ lifeToggle.addEventListener('change', markLife); }
  if(lifeBoostSel){ lifeBoostSel.addEventListener('change', markLife); }
  ['mu','fhab','fbio'].forEach(id=>{ const el=document.getElementById(id); if(el){ el.addEventListener('input', markLife); el.addEventListener('change', markLife); }});

  const ro = new ResizeObserver(()=>{
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio||1, 2);
    let hiRes = 4; // default to 4x scaling (new 1x)
    const hiResSel = document.getElementById('vizHiRes');
    if(hiResSel) hiRes = parseInt(hiResSel.value, 10) || 4;
    let w = Math.max(600, Math.floor(rect.width*dpr));
    let h = Math.max(280, Math.floor(rect.height*dpr));
    w = Math.min(w*hiRes, 4000);
    h = Math.min(h*hiRes, 4000);
    if(canvas.width!==w || canvas.height!==h){ canvas.width=w; canvas.height=h; restart(); }
    // Listen for hi-res dropdown changes
    document.getElementById('vizHiRes')?.addEventListener('change', ()=>{
      ro.disconnect();
      ro.observe(canvas);
      restart();
    });
  });
  ro.observe(canvas);

  setQuality(qualitySel ? qualitySel.value : 'med');
  restart();

  // Mouse hover logic for tooltips
  canvas.addEventListener('mousemove', function(e){
    // If not animating, update t to 0 so rotation is correct
    if(!(animateChk && animateChk.checked)) t = 0;
    const rect = galaxyRect();
    const mx = (e.clientX - rect.left) * (canvas.width/rect.width);
    const my = (e.clientY - rect.top) * (canvas.height/rect.height);
    const cx = canvas.width/2, cy = canvas.height/2;
    // Undo pan and zoom
    let gx = (mx - cx - panX)/zoom;
    let gy = (my - cy - panY)/zoom;
    // Undo rotation
    const angle = -(t*cfg.spin*cfg.spinDir);
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    let rx = gx * cosA - gy * sinA;
    let ry = gx * sinA + gy * cosA;
    // Move back to galaxy coords
    gx = rx + cx;
    gy = ry + cy;
    let minDist = Infinity;
    let closest = null;
    const baseRadius = 12;
    for(const s of stars){
      // Scale detection radius with zoom (smaller radius when zoomed in)
      const radius = s.sz * baseRadius / zoom;
      const dist = Math.hypot(gx-s.x, gy-s.y);
      if(dist < radius && dist < minDist){
        minDist = dist;
        closest = s;
      }
    }
    if(closest){
      hoveredStar = closest;
      showStarTooltip(closest, e.clientX, e.clientY);
    }else{
      hoveredStar = null;
      hideStarTooltip();
    }
  });
  canvas.addEventListener('mouseleave', hideStarTooltip);

  function showStarTooltip(star, px, py){
    if(!tooltip) return;
    let {planets, planetStats, supportsLife} = star.stats;
    if(lifeStarIndices.has(star.seed)) {
      supportsLife = true;
      let foundBio = false;
      for(let p of planetStats) {
        if(p.bio) { foundBio = true; break; }
      }
      if(!foundBio && planetStats.length>0) planetStats[0].bio = true;
    }
    let html = `<b>Star #${star.seed+1}</b><br>`;
    html += `Planets: <b>${planets}</b><br>`;
    html += `Moons: <b>${planetStats.reduce((a,p)=>a+p.moons,0)}</b><br>`;
    html += `Life possible: <span class="${supportsLife?'hl':'warn'}">${supportsLife?'Yes':'No'}</span>`;
    if(lifeStarIndices.has(star.seed)) html += ' <span class="hl">(Marked for life)</span>';
    html += `<br><hr style="border:0;border-top:1px solid var(--accent);margin:4px 0">`;
    html += `<b>Planets:</b><br>`;
    planetStats.slice(0,5).forEach((p,i)=>{
      let statusClass = p.bio ? 'hl' : (p.hab ? 'warn' : 'muted');
      let statusLabel = p.bio ? 'Life' : (p.hab ? 'Habitable' : 'Uninhabitable');
      html += `#${i+1}: ${p.dist} AU, ${p.moons} moon${p.moons!==1?'s':''}, <span class="${statusClass}">${statusLabel}</span><br>`;
    });
    if(planetStats.length>5) html += `...and ${planetStats.length-5} more`;
    tooltip.innerHTML = html;
    tooltip.style.display = 'block';
    tooltip.style.left = (px+18)+'px';
    tooltip.style.top = (py+12)+'px';
  }
  function hideStarTooltip(){
    if(tooltip) tooltip.style.display = 'none';
  }
})();
