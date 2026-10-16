/* Romantic background music + interactive sound effects
   Everything is generated with WebAudio (no mp3 needed).
   API: bgm.start(), bgm.toggleMute(), bgm.setVolume(0..1), bgm.duck(bool), bgm.sfx(name)
   sfx names: tap, type, whoosh, paper, leaf, vinyl, blow, sparkle */
const bgm = (function () {
  const BPM = 64;
  const STEP = 60 / BPM / 2; // eighth note
  const LOOKAHEAD = 1.0; // schedule far ahead so busy phones/animations cannot starve the music
  const DEFAULT_VOL = 0.5;
  const KEY = "bgm-settings-v2";

  // one chord per bar: bass, arpeggio tones, pad tones
  const chords = [
    { b: "C3", a: ["E4", "G4", "B4", "C5"], p: ["C4", "E4", "G4", "B4"] },   // Cmaj7
    { b: "A2", a: ["C4", "E4", "G4", "A4"], p: ["A3", "C4", "E4", "G4"] },   // Am7
    { b: "F2", a: ["C4", "E4", "A4", "C5"], p: ["F3", "A3", "C4", "E4"] },   // Fmaj7
    { b: "G2", a: ["B3", "D4", "E4", "G4"], p: ["G3", "B3", "D4", "E4"] },   // G6
    { b: "E2", a: ["G4", "B4", "D5", "E5"], p: ["E3", "G3", "B3", "D4"] },   // Em7
    { b: "A2", a: ["E4", "G4", "B4", "C5"], p: ["A3", "C4", "E4", "B4"] },   // Am9
    { b: "D3", a: ["F4", "A4", "C5", "D5"], p: ["D3", "F3", "A3", "C4"] },   // Dm7
    { b: "G2", a: ["B3", "D4", "F4", "G4"], p: ["G3", "B3", "D4", "F4"] }    // G7
  ];
  const arpPattern = [0, 1, 2, 3, 2, 1, 2, 1];
  const melody = [
    "G5 . . . E5 . G5 .", "A5 . . . G5 . E5 .", "C6 . . . A5 . C6 .", "B5 . . D6 . B5 . G5",
    "G5 . . . B5 . D6 .", "E6 . . D6 . C6 . B5", "A5 . . . C6 . D6 .", "B5 . . . D6 . . ."
  ].map((b) => b.split(" "));

  let ctx = null, bus = null, master = null, duckG = null, sfxBus = null;
  let timer = null, nextTime = 0, step = 0, noiseBuf = null;
  let volume = DEFAULT_VOL, muted = false, ducked = false, started = false;

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
    const semi = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] ? 1 : 0);
    return 12 * (parseInt(m[3], 10) + 1) + semi;
  }
  const freq = (n) => 440 * Math.pow(2, (midi(n) - 69) / 12);

  /* ---------- music voices ---------- */
  // soft plucked bell / music-box / electric piano
  function pluck(f, t, vol, decay) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(bus);
    [[1, 1], [2, 0.22]].forEach(([mul, amp]) => {
      const o = ctx.createOscillator(), a = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(f * mul, t);
      a.gain.value = amp;
      o.connect(a); a.connect(g);
      o.start(t); o.stop(t + decay + 0.05);
    });
  }
  // warm pad: two slightly detuned triangles through a lowpass
  function pad(f, t, dur, vol) {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 1000; lp.Q.value = 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 1.1);
    g.gain.setValueAtTime(vol, t + dur - 1.3);
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    lp.connect(g); g.connect(bus);
    const o = ctx.createOscillator();
    o.type = "triangle"; o.frequency.setValueAtTime(f, t);
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
  function bass(f, t, dur, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function schedule(t) {
    const bar = Math.floor(step / 8) % chords.length;
    const i = step % 8;
    const c = chords[bar];
    if (i === 0) {
      bass(freq(c.b), t, STEP * 7, 0.34);
      c.p.forEach((n) => pad(freq(n), t, STEP * 8 + 1.2, 0.03));
    }
    if (i === 4) bass(freq(c.b) * 1.5, t, STEP * 3, 0.16);
    // gentle arpeggio, slightly humanised
    pluck(freq(c.a[arpPattern[i]]), t + Math.random() * 0.012, i % 4 === 0 ? 0.075 : 0.05, 1.5);
    const m = melody[bar][i];
    if (m && m !== ".") pluck(freq(m), t + 0.01, 0.1, 2.6);
    step++;
  }
  function tick() {
    if (!ctx || ctx.state !== "running") return;
    // if the timer was starved for a long time, skip ahead instead of dumping old notes at once
    if (nextTime < ctx.currentTime - 0.1) nextTime = ctx.currentTime + 0.05;
    while (nextTime < ctx.currentTime + LOOKAHEAD) { schedule(nextTime); nextTime += STEP; }
  }

  /* ---------- sound effects ---------- */
  function noise(t, dur, type, f, q, vol, env) {
    const s = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    flt.type = type; flt.frequency.setValueAtTime(f, t); flt.Q.value = q;
    const a = env && env.a !== undefined ? env.a : 0.004;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(flt); flt.connect(g); g.connect(sfxBus);
    s.start(t, Math.random() * 1.5, dur + 0.05);
    return flt;
  }
  function blip(f, t, vol, decay) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); g.connect(sfxBus);
    o.start(t); o.stop(t + decay + 0.05);
  }
  const r = (a, b) => a + Math.random() * (b - a);
  let lastType = 0;

  const sfxLib = {
    tap(t) { blip(660, t, 0.13, 0.12); blip(990, t + 0.04, 0.06, 0.14); },
    whoosh(t) {
      const f = noise(t, 0.5, "bandpass", 700, 0.6, 0.12, { a: 0.18 });
      f.frequency.exponentialRampToValueAtTime(2200, t + 0.45);
    },
    // paper envelope: dry crinkles + a slide
    paper(t) {
      noise(t, 0.28, "bandpass", 1400, 0.7, 0.12, { a: 0.05 }).frequency.exponentialRampToValueAtTime(900, t + 0.25);
      for (let k = 0; k < 7; k++) {
        const at = t + 0.03 + k * r(0.04, 0.07);
        noise(at, r(0.03, 0.08), "bandpass", r(2500, 5200), 0.9, r(0.14, 0.3), { a: 0.002 });
        if (k % 2) noise(at + 0.01, 0.02, "highpass", 6500, 0.5, 0.1, { a: 0.001 });
      }
      noise(t + 0.38, 0.22, "bandpass", 1800, 0.8, 0.11, { a: 0.08 });
    },
    // leaves rustling: airy swell with soft flutters
    leaf(t) {
      noise(t, 1.0, "bandpass", 3600, 0.5, 0.11, { a: 0.35 });
      noise(t, 1.0, "highpass", 5200, 0.4, 0.05, { a: 0.4 });
      for (let k = 0; k < 13; k++) {
        noise(t + 0.05 + k * r(0.05, 0.08), r(0.025, 0.07), "bandpass", r(3800, 7500), 1.6, r(0.06, 0.16), { a: 0.006 });
      }
    },
    vinyl(t) {
      blip(70, t, 0.18, 0.18);
      for (let k = 0; k < 14; k++) noise(t + 0.08 + k * r(0.02, 0.06), 0.012, "highpass", 3000, 0.5, r(0.04, 0.12), { a: 0.001 });
      noise(t + 0.1, 0.7, "highpass", 4500, 0.4, 0.02, { a: 0.2 });
    },
    // blowing out a candle: breath, then a faint puff
    blow(t) {
      const f = noise(t, 0.9, "bandpass", 900, 0.7, 0.42, { a: 0.07 });
      f.frequency.exponentialRampToValueAtTime(380, t + 0.8);
      noise(t, 0.8, "lowpass", 1600, 0.4, 0.2, { a: 0.09 });
      noise(t + 0.55, 0.12, "highpass", 4000, 0.5, 0.07, { a: 0.003 });
    },
    // pixel typing blip (square wave, random pitch from a pentatonic set)
    type(t) {
      if (t - lastType < 0.045) return;
      lastType = t;
      const notes = [523.25, 587.33, 659.25, 783.99, 880, 987.77];
      const f = notes[Math.floor(Math.random() * notes.length)];
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = "square"; o.frequency.setValueAtTime(f, t);
      lp.type = "lowpass"; lp.frequency.value = 2600;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.045, t + 0.003);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
      o.connect(lp); lp.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + 0.07);
    },
    sparkle(t) {
      ["E6", "G6", "B6", "E7", "G7"].forEach((n, k) => blip(freq(n), t + k * 0.075, 0.07, 0.7));
    }
  };

  function sfx(name) {
    if (!started) start();
    if (!ctx || !sfxLib[name]) return;
    if (ctx.state === "suspended") ctx.resume();
    sfxLib[name](ctx.currentTime + 0.01);
  }

  /* ---------- engine ---------- */
  function applyGain() {
    if (!master) return;
    const off = muted || volume === 0;
    master.gain.setTargetAtTime(off ? 0 : 0.9 * Math.pow(volume, 1.5), ctx.currentTime, 0.05);
    duckG.gain.setTargetAtTime(ducked ? 0 : 1, ctx.currentTime, 0.3);
    sfxBus.gain.setTargetAtTime(off ? 0 : 0.35 + 0.65 * volume, ctx.currentTime, 0.03);
  }
  function makeReverb() {
    const len = Math.floor(ctx.sampleRate * 2.2);
    const ir = ctx.createBuffer(1, len, ctx.sampleRate);
    for (let ch = 0; ch < 1; ch++) {
      const d = ir.getChannelData(ch);
      for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 2.6);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  function start() {
    if (started) { if (ctx && ctx.state === "suspended") ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    started = true;
    ctx = new AC();
    duckG = ctx.createGain();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    bus = ctx.createGain();
    const rev = makeReverb(), wet = ctx.createGain();
    wet.gain.value = 0.5;
    bus.connect(master);
    bus.connect(rev); rev.connect(wet); wet.connect(master);
    master.connect(duckG); duckG.connect(ctx.destination);
    sfxBus.connect(ctx.destination);
    master.gain.value = 0; sfxBus.gain.value = 0;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
    applyGain();
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(tick, 100);
    if (ctx.state === "suspended") ctx.resume();
    ctx.onstatechange = () => console.info("[bgm] audio state:", ctx.state);
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
    btn.setAttribute("aria-label", off ? "Nyalakan suara" : "Matikan suara");
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
    if (!muted) sfx("tap");
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
    // browsers block audio until a real user gesture (on phones only touchend/click
    // count), so keep retrying on every gesture until the audio is actually running
    const evs = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
    const unlock = () => {
      start();
      if (ctx && ctx.state === "suspended") ctx.resume();
      if (ctx && ctx.state === "running") evs.forEach((e) => document.removeEventListener(e, unlock, true));
    };
    evs.forEach((e) => document.addEventListener(e, unlock, true));
    updateUI();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();

  return { start, toggleMute, setVolume, duck, sfx };
})();
