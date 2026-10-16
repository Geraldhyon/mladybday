/* 8-bit / pixel background music (generated with WebAudio, no mp3 needed)
   API: bgm.start(), bgm.toggleMute(), bgm.setVolume(0..1), bgm.duck(true/false) */
const bgm = (function () {
  const BPM = 104;
  const STEP = 60 / BPM / 2; // eighth note
  const LOOKAHEAD = 0.18;
  const DEFAULT_VOL = 0.35;
  const KEY = "bgm-settings";

  // 8 steps per bar. note name | "." rest | "_" hold previous note
  const lead = [
    "E5 . G5 . C6 . G5 _", "C6 . A5 . E5 . A5 _", "A5 . C6 . F5 . A5 _", "D6 . B5 . G5 . _ _",
    "G5 E5 G5 C6 E6 . C6 _", "E6 . C6 . A5 . C6 _", "C6 A5 F5 A5 C6 . A5 _", "B5 . D6 . G5 _ . ."
  ].map((b) => b.split(" "));
  const bassRoots = ["C3", "A2", "F2", "G2", "C3", "A2", "F2", "G2"];
  const bassFifths = ["G3", "E3", "C3", "D3", "G3", "E3", "C3", "D3"];

  let ctx = null, master = null, duckG = null;
  let timer = null, nextTime = 0, step = 0;
  let volume = DEFAULT_VOL, muted = false, ducked = false, started = false;
  let pulseWave = null, noiseBuf = null;

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (typeof s.volume === "number") volume = Math.min(1, Math.max(0, s.volume));
      if (typeof s.muted === "boolean") muted = s.muted;
    } catch (e) {}
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ volume, muted })); } catch (e) {}
  }

  function midi(name) {
    const m = /^([A-G])(#?)(\d)$/.exec(name);
    if (!m) return null;
    const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return 12 * (parseInt(m[3], 10) + 1) + semi;
  }
  const freq = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

  function makePulse(duty) {
    const N = 32, real = new Float32Array(N), imag = new Float32Array(N);
    for (let n = 1; n < N; n++) real[n] = (2 * Math.sin(n * Math.PI * duty)) / (n * Math.PI);
    return ctx.createPeriodicWave(real, imag);
  }

  function tone(type, f, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    if (type === "pulse") o.setPeriodicWave(pulseWave); else o.type = type;
    o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function hat(t) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), hp = ctx.createBiquadFilter();
    s.buffer = noiseBuf; hp.type = "highpass"; hp.frequency.value = 7000;
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(hp); hp.connect(g); g.connect(master);
    s.start(t); s.stop(t + 0.05);
  }

  function holdLen(bar, i) {
    let n = 1;
    while (i + n < 8 && bar[i + n] === "_") n++;
    return n;
  }

  function schedule(t) {
    const barIdx = Math.floor(step / 8) % lead.length;
    const i = step % 8;
    const tok = lead[barIdx][i];
    if (tok && tok !== "." && tok !== "_") {
      tone("pulse", freq(tok), t, holdLen(lead[barIdx], i) * STEP * 0.92, 0.16);
    }
    if (i === 0 || i === 4) tone("triangle", freq(bassRoots[barIdx]), t, STEP * 3.6, 0.32);
    if (i === 2 || i === 6) tone("triangle", freq(bassFifths[barIdx]), t, STEP * 1.6, 0.2);
    if (i % 2 === 1) hat(t);
    step++;
  }

  function tick() {
    while (nextTime < ctx.currentTime + LOOKAHEAD) {
      schedule(nextTime);
      nextTime += STEP;
    }
  }

  function applyGain() {
    if (!master) return;
    const target = muted ? 0 : volume * volume; // squared curve feels more natural
    master.gain.setTargetAtTime(target, ctx.currentTime, 0.04);
    duckG.gain.setTargetAtTime(ducked ? 0 : 1, ctx.currentTime, 0.25);
  }

  function start() {
    if (started) { if (ctx && ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    started = true;
    ctx = new AC();
    duckG = ctx.createGain();
    master = ctx.createGain();
    master.connect(duckG); duckG.connect(ctx.destination);
    pulseWave = makePulse(0.25);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    master.gain.value = 0;
    applyGain();
    nextTime = ctx.currentTime + 0.05;
    timer = setInterval(tick, 25);
    if (ctx.state === "suspended") ctx.resume();
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else ctx.resume();
  });

  /* ---------- UI ---------- */
  function updateUI() {
    const root = document.getElementById("bgmCtl");
    if (!root) return;
    const slider = document.getElementById("bgmVol");
    const btn = document.getElementById("bgmMute");
    const off = muted || volume === 0;
    root.classList.toggle("is-muted", off);
    btn.setAttribute("aria-label", off ? "Nyalakan backsound" : "Matikan backsound");
    btn.setAttribute("aria-pressed", off ? "true" : "false");
    slider.value = Math.round(volume * 100);
    slider.style.setProperty("--p", slider.value + "%");
  }

  function setVolume(v) {
    volume = Math.min(1, Math.max(0, v));
    if (volume > 0 && muted) muted = false;
    save(); applyGain(); updateUI();
  }
  function toggleMute() {
    if (muted || volume === 0) { muted = false; if (volume === 0) volume = DEFAULT_VOL; }
    else muted = true;
    save(); applyGain(); updateUI();
  }
  function duck(on) { ducked = !!on; applyGain(); }

  function init() {
    load();
    const btn = document.getElementById("bgmMute");
    const slider = document.getElementById("bgmVol");
    if (btn) btn.addEventListener("click", (e) => { e.stopPropagation(); start(); toggleMute(); });
    if (slider) {
      ["click", "pointerdown"].forEach((ev) => slider.addEventListener(ev, (e) => e.stopPropagation()));
      slider.addEventListener("input", () => { start(); setVolume(slider.value / 100); });
    }
    // browsers block audio until the first interaction, so start on first tap/click
    const first = () => { start(); };
    document.addEventListener("pointerdown", first, { once: true });
    document.addEventListener("keydown", first, { once: true });
    updateUI();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { start, toggleMute, setVolume, duck };
})();
