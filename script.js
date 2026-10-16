const sfx = (n) => { if (typeof bgm !== "undefined") bgm.sfx(n); };
function goTo(pageId) {
  const current = document.querySelector(".page.active");
  const target = document.getElementById(pageId);
  if (!current || !target || current === target) return;
  sfx("whoosh");
  if (pageId === "page2" && typeof resetGift === "function") resetGift();
  current.classList.remove("active");
  setTimeout(() => {
    target.classList.add("active");
    if (pageId === "page3") playPage3Entrance(current.id === "page2" ? 450 : 120);
    if (pageId === "page2" && typeof renderParagraph === "function") {
      setTimeout(() => renderParagraph(), 450);
    }
  }, 60);
}
let p3EntAnims = [];
function playPage3Entrance(base) {
  p3EntAnims.forEach((a) => a.cancel());
  p3EntAnims = [];
  if (reduceMotion) return;
  const p3 = document.getElementById("page3");
  if (!p3 || !p3.animate) return;
  const EASE = "cubic-bezier(.34,1.56,.64,1)";
  const pop = (el, delay, dur) => {
    if (!el || !el.animate) return null;
    const a = el.animate(
      [{ scale: "0" }, { scale: "1" }],
      { duration: dur || 560, delay: base + delay, easing: EASE, fill: "backwards" }
    );
    p3EntAnims.push(a);
    return a;
  };
  const scene = [...p3.querySelectorAll(".p3-scene > *")].filter((el) => !el.classList.contains("p3-float"));
  scene.forEach((el, i) => pop(el, i * 45, 520));
  const t = scene.length * 45;
  pop(p3.querySelector(".memories-title"), t * 0.35, 620);
  pop(p3.querySelector(".p3-back"), t * 0.5, 520);
  p3.querySelectorAll(".memory-card").forEach((el, i) => pop(el, t * 0.6 + 150 + i * 150, 640));
  const btn = p3.querySelector(".to-final-btn");
  const cake = pop(btn, t * 0.6 + 150 + 3 * 150 + 80, 640);
  if (cake) {
    btn.style.pointerEvents = "none";
    const free = () => {
      btn.style.pointerEvents = "";
    };
    cake.onfinish = free;
    cake.oncancel = free;
  }
}
document.getElementById("page1").addEventListener("click", () => goTo("page2"));
const paragraphs = [
  "Hawo cantikkk, selamat ulang tahun ya :>.. ",
  "mmm jadi aku ngebuat ini buat ngerayain ultah kamu HEHE",
  "first of all, hope u re feeling well and happy as you open this. ",
  "little guide, just click click and dont forget the cake :3",
  "To: Valenza"
];
let currentParagraph = 0;
let typingTimer = null;
let typingDone = true;
let charEls = [];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function onTypingDone() {
  typingDone = true;
  const isLast = currentParagraph === paragraphs.length - 1;
  document.getElementById("toMemoriesBtn").classList.toggle("gift-hide", !isLast);
}
function finishTyping() {
  clearTimeout(typingTimer);
  charEls.forEach((el) => {
    el.classList.add("on");
    el.classList.remove("cur");
  });
  if (charEls.length) charEls[charEls.length - 1].classList.add("cur");
  onTypingDone();
}
function typeParagraph(text, instant) {
  clearTimeout(typingTimer);
  const p = document.getElementById("letterParagraph");
  p.innerHTML = "";
  charEls = [];
  typingDone = false;
  text.split(/(\s+)/).forEach((tok) => {
    if (!tok) return;
    if (/^\s+$/.test(tok)) {
      p.appendChild(document.createTextNode(" "));
      return;
    }
    const w = document.createElement("span");
    w.className = "w";
    [...tok].forEach((c) => {
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.textContent = c;
      w.appendChild(ch);
      charEls.push(ch);
    });
    p.appendChild(w);
  });
  if (instant || reduceMotion) {
    finishTyping();
    return;
  }
  let i = 0;
  (function step() {
    if (i > 0) charEls[i - 1].classList.remove("cur");
    if (i >= charEls.length) {
      charEls[charEls.length - 1].classList.add("cur");
      onTypingDone();
      return;
    }
    const el = charEls[i++];
    el.classList.add("on", "cur");
    const pause = /[.,!?:>]/.test(el.textContent);
    typingTimer = setTimeout(step, pause ? 190 : 38 + Math.random() * 26);
  })();
}
function renderParagraph(instant) {
  const dotsWrap = document.getElementById("dots");
  dotsWrap.innerHTML = "";
  paragraphs.forEach((_, i) => {
    const d = document.createElement("div");
    d.className = "dot" + (i === currentParagraph ? " active" : "");
    dotsWrap.appendChild(d);
  });
  document.getElementById("prevBtn").disabled = currentParagraph === 0;
  const isLast = currentParagraph === paragraphs.length - 1;
  document.getElementById("nextBtnArrow").style.visibility = isLast ? "hidden" : "visible";
  resetGift();
  typeParagraph(paragraphs[currentParagraph], instant);
}
function nextParagraph() {
  sfx("tap");
  if (!typingDone) {
    finishTyping();
    return;
  }
  if (currentParagraph < paragraphs.length - 1) {
    currentParagraph++;
    renderParagraph();
  }
}
function prevParagraph() {
  sfx("tap");
  if (currentParagraph > 0) {
    currentParagraph--;
    renderParagraph();
  }
}
const GIFT_FRAMES = 5;
let giftBusy = false;
const giftTimers = [];
function giftFrame(i) {
  document.getElementById("giftSprite").style.backgroundPosition = i * 100 / (GIFT_FRAMES - 1) + "% 0";
}
function resetGift() {
  giftTimers.splice(0).forEach(clearTimeout);
  giftBusy = false;
  const btn = document.getElementById("toMemoriesBtn");
  btn.classList.remove("opening", "shake");
  btn.classList.add("gift-hide");
  document.getElementById("page2").classList.remove("gift-opening");
  const wipe = document.getElementById("giftWipe");
  wipe.classList.remove("grow", "fade");
  giftFrame(0);
}
function openGift() {
  if (giftBusy) return;
  giftBusy = true;
  sfx("sparkle");
  const btn = document.getElementById("toMemoriesBtn");
  const at = (ms, fn) => giftTimers.push(setTimeout(fn, ms));
  if (reduceMotion) {
    giftFrame(4);
    at(250, () => goTo("page3"));
    return;
  }
  const r = btn.getBoundingClientRect();
  const wipe = document.getElementById("giftWipe");
  wipe.style.setProperty("--cx", r.left + r.width / 2 + "px");
  wipe.style.setProperty("--cy", r.top + r.height * 0.4 + "px");
  btn.classList.add("opening");
  document.getElementById("page2").classList.add("gift-opening");
  giftFrame(1);
  btn.classList.add("shake");
  at(450, () => {
    btn.classList.remove("shake");
    giftFrame(2);
  });
  at(700, () => giftFrame(3));
  at(1e3, () => giftFrame(4));
  at(1750, () => wipe.classList.add("grow"));
  at(2450, () => goTo("page3"));
  at(3e3, () => {
    wipe.classList.add("fade");
  });
  at(3700, () => {
    wipe.classList.remove("grow", "fade");
  });
}
renderParagraph(true);
const CANVA_LETTER_URL = "https://www.canva.com/design/DAHXQXKBcW8/YP3cNH7vCLYOPr-ljrpTFg/view?embed";
const CANVA_LETTER_LINK = "https://www.canva.com/design/DAHXQXKBcW8/YP3cNH7vCLYOPr-ljrpTFg/view";
const modalData = {
  songs: {
    title: "Songs that remind me of you",
    titleHtml: () => `
      <span class="mp-ttl"><span>${MPI.note}Songs that${MPI.note}</span></span>
      <span class="mp-ttl mp-ttl-heart"><span>${MPI.heartP}remind me of you${MPI.heartP}</span></span>`,
    theme: "theme-music",
    music: true,
    html: () => `
      <div class="mp" id="mpRoot">
        
        <img class="mp-bow" src="assets/mp2/bow.png" alt="">
        <span class="mp-top st-l" aria-hidden="true">${MPI.star}</span>
        <span class="mp-top st-r" aria-hidden="true">${MPI.star}</span>
        <span class="mp-top sp-l" aria-hidden="true">${MPI.sparkleW}</span>
        <span class="mp-top sp-r" aria-hidden="true">${MPI.sparkleW}</span>

        <div class="mp-rail" aria-hidden="true"></div>

        <div class="mp-panel">
          <img class="mp-deco mp-cloud l" src="assets/mp2/cloud.png" alt="">
          <img class="mp-deco mp-cloud r" src="assets/mp2/cloud.png" alt="">
          <img class="mp-deco mp-moon tl" src="assets/mp2/moon.png" alt="">
          <span class="mp-deco mp-pstar" aria-hidden="true">${MPI.star}</span>
          <img class="mp-deco mp-moon ml" src="assets/mp2/moon.png" alt="">
          <img class="mp-deco mp-moon mr" src="assets/mp2/moon.png" alt="">

          <div class="mp-discwrap">
            <span class="mp-spark s1" aria-hidden="true">${MPI.sparkle}</span>
            <span class="mp-spark s2" aria-hidden="true">${MPI.sparkle}</span>
            <span class="mp-spark s3" aria-hidden="true">${MPI.sparkle}</span>
            <span class="mp-spark s4" aria-hidden="true">${MPI.sparkle}</span>
            <img class="mp-disc" src="assets/mp2/planet.png" alt="">
          </div>
          <div class="mp-count" id="mpCount"></div>
          <div class="mp-title" id="mpTitle"></div>
          <div class="mp-artist" id="mpArtist"></div>
          <div class="mp-bar" id="mpBar" role="slider" tabindex="0" aria-label="Posisi lagu" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="mp-fill" id="mpFill"></div>
            <span class="mp-knob" id="mpKnob"><img src="assets/mp2/wingheart.png" alt=""></span>
          </div>
          <div class="mp-note" id="mpNote"></div>
        </div>

        <div class="mp-controls">
          <button class="mp-btn" id="mpPrev" onclick="prevSong()" aria-label="Lagu sebelumnya">${MPI.prev}</button>
          <button class="mp-btn pp" id="mpPlay" onclick="togglePlay()" aria-label="Play">${MPI.pp}</button>
          <button class="mp-btn" id="mpNext" onclick="nextSong()" aria-label="Lagu berikutnya">${MPI.next}</button>
          <button class="mp-btn shuf" id="mpShuf" onclick="shuffleSong()" aria-label="Lagu acak">
            ${MPI.noteBig}
            <img class="mp-h h1" src="assets/mp/heart_a.png" alt="">
            <img class="mp-h h2" src="assets/mp/heart_b.png" alt="">
            <img class="mp-h h3" src="assets/mp/heart_c.png" alt="">
            <img class="mp-h h4" src="assets/mp/heart_a.png" alt="">
          </button>
        </div>
        <div class="mp-dots">${songs.map(() => '<div class="mp-dot"></div>').join("")}</div>

        <img class="mp-bunny l" src="assets/mp2/witch.png" alt="">
        <img class="mp-bunny r" src="assets/mp2/astro.png" alt="">
      </div>
    `
  },
  flower: {
    title: "Flower",
    theme: "theme-flower",
    html: () => `
      <div class="fl" id="flRoot">
        <img class="fl-bouquet" src="assets/bouquet1.png" alt="Bouquet bunga">
        <button class="fl-env" onclick="openFlowerLetter()" aria-label="Buka surat">
          <img src="assets/envelope_anim.png" alt="">
          <span class="fl-hint">klik suratnya :3</span>
        </button>
        <div class="fl-paper" aria-live="polite">
          <span class="px-heart"></span>
          <div class="fl-text" id="flText"></div>
          <button class="fl-back" onclick="closeFlowerLetter()">tutup</button>
        </div>
      </div>
    `
  },
  notes: {
    title: "A Letter",
    theme: "theme-letter",
    fullscreen: true,
    html: () => `
      <div class="letter-paper">
        <img class="letter-seal" src="assets/letter2.png" alt="">
        ${CANVA_LETTER_URL ? `<iframe class="letter-embed" src="${CANVA_LETTER_URL}" allowfullscreen loading="lazy" allow="fullscreen"></iframe>
             <a class="letter-open" href="${CANVA_LETTER_LINK}" target="_blank" rel="noopener">kalau suratnya gak muncul, klik di sini :3</a>` : `<div class="letter-placeholder">
               <img src="assets/letterclosed.png" alt="">
               <div>isi surat dari Canva<br>bakal muncul di sini :3</div>
             </div>`}
      </div>
    `
  }
};
const songs = [
  { title: "Magnolia", artist: "Magnolia Celebration", src: "assets/music/01-magnolia.mp3" },
  { title: "Anything You Want", artist: "Reality Club", src: "assets/music/02-anything-you-want.mp3" },
  { title: "If I Had A Gun", artist: "Noel Gallagher", src: "assets/music/03-if-i-had-a-gun.mp3" },
  { title: "Secret Door", artist: "Arctic Monkeys", src: "assets/music/04-secret-door.mp3" },
  { title: "Separuh Aku", artist: "Noah", src: "assets/music/05-separuh-aku.mp3" }
];
function pxSvg(rows, map) {
  const h = rows.length, w = rows[0].length;
  let r = "";
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      const ch = row[x];
      if (ch === "." || !map[ch]) {
        x++;
        continue;
      }
      let e = x;
      while (e < w && row[e] === ch) e++;
      r += `<rect x="${x}" y="${y}" width="${e - x}" height="1" style="fill:${map[ch]}"/>`;
      x = e;
    }
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true">${r}</svg>`;
}
const _triR = ["X....", "XX...", "XXX..", "XXXX.", "XXXXX", "XXXX.", "XXX..", "XX...", "X...."];
const _triL = ["....X", "...XX", "..XXX", ".XXXX", "XXXXX", ".XXXX", "..XXX", "...XX", "....X"];
const _PLUM = "#5C3A42";
const MPI = {
  prev: pxSvg(_triL.map((r, i) => r + "." + r), { X: _PLUM }),
  next: pxSvg(_triR.map((r, i) => r + "." + r), { X: _PLUM }),
  pp: pxSvg(
    Array.from({ length: 9 }, (_, i) => "AA.AA..." + ["...B", "...B", "..B.", "..B.", ".B..", ".B..", "B...", "B...", "B..."][i].replace(/B/g, "S") + "..." + _triR[i].replace(/X/g, "P")),
    { A: "var(--pp-pause)", S: _PLUM, P: "var(--pp-play)" }
  ),
  note: pxSvg([
    "...XXXXXXXX",
    "...XXXXXXXX",
    "...XX....XX",
    "...XX....XX",
    "...XX....XX",
    "...XX....XX",
    ".XXXX..XXXX",
    "XXXXX.XXXXX",
    "XXXXX.XXXXX",
    ".XXX...XXX."
  ], { X: _PLUM }),
  noteBig: pxSvg([
    "...XXXXXXXX",
    "...XXXXXXXX",
    "...XX....XX",
    "...XX....XX",
    "...XX....XX",
    "...XX....XX",
    ".XXXX..XXXX",
    "XXXXX.XXXXX",
    "XXXXX.XXXXX",
    ".XXX...XXX."
  ], { X: "#E0708F" }),
  heartP: pxSvg([
    ".PP.PP.",
    "PWPPPPP",
    "PPPPPPP",
    ".PPPPP.",
    "..PPP..",
    "...P..."
  ], { P: "#EE7E9C", W: "#FFC6D4" }),
  knob: pxSvg(
    [
      "..DD.DD..",
      ".DPPDPPD.",
      "DPWPPPPPD",
      "DPPPPPPPD",
      ".DPPPPPD.",
      "..DPPPD..",
      "...DPD...",
      "....D...."
    ],
    { D: "#A8405E", P: "#F2829F", W: "#FFD0DC" }
  ),
  star: pxSvg(
    [
      "....O....",
      "...OYO...",
      "...OYO...",
      "OOOOYOOOO",
      ".OYYYYYO.",
      "..OYYYO..",
      "..OYYYO..",
      ".OYYOYYO.",
      ".OOO.OOO."
    ],
    { O: "#E8A41E", Y: "#FFD84A" }
  ),
  sparkle: pxSvg(
    [
      "...X...",
      "...X...",
      "..XYX..",
      "XXYYYXX",
      "..XYX..",
      "...X...",
      "...X..."
    ],
    { X: "#FFD24D", Y: "#FFF4B8" }
  ),
  sparkleW: pxSvg(
    [
      "...X...",
      "...X...",
      "..XYX..",
      "XXYYYXX",
      "..XYX..",
      "...X...",
      "...X..."
    ],
    { X: "#FFFFFF", Y: "#FFFFFF" }
  )
};
let songIdx = 0;
let songAudio = null;
let songPlaying = false;
function mpEl(id) {
  return document.getElementById(id);
}
function setProgress(pct) {
  pct = Math.max(0, Math.min(100, pct));
  const f = mpEl("mpFill"), k = mpEl("mpKnob"), b = mpEl("mpBar");
  if (f) f.style.width = pct + "%";
  if (k) k.style.left = pct + "%";
  if (b) b.setAttribute("aria-valuenow", Math.round(pct));
}
function renderSong() {
  const sg = songs[songIdx];
  mpEl("mpCount").textContent = "Song " + (songIdx + 1) + " / " + songs.length;
  mpEl("mpTitle").textContent = sg.title;
  mpEl("mpArtist").textContent = sg.artist;
  mpEl("mpNote").textContent = "";
  setProgress(0);
  document.querySelectorAll(".mp-dot").forEach((d, i) => d.classList.toggle("active", i === songIdx));
}
function setPlayingUI(on) {
  songPlaying = on;
  if (typeof bgm !== "undefined") bgm.duck(on);
  const root = mpEl("mpRoot");
  if (!root) return;
  root.classList.toggle("playing", on);
  mpEl("mpPlay").setAttribute("aria-label", on ? "Pause" : "Play");
}
function loadSong(autoplay) {
  renderSong();
  if (!songAudio) {
    songAudio = new Audio();
    songAudio.preload = "auto";
    songAudio.addEventListener("timeupdate", () => {
      if (songAudio.duration && !mpDragging) setProgress(songAudio.currentTime / songAudio.duration * 100);
    });
    songAudio.addEventListener("ended", () => nextSong(true));
    songAudio.addEventListener("error", () => {
      setPlayingUI(false);
      const n = mpEl("mpNote");
      if (n) n.textContent = "(file audio belum dipasang)";
    });
  }
  songAudio.src = songs[songIdx].src;
  if (autoplay) {
    songAudio.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
  } else {
    setPlayingUI(false);
  }
}
function nextSong(autoplay) {
  songIdx = (songIdx + 1) % songs.length;
  loadSong(autoplay === void 0 || typeof autoplay !== "boolean" ? songPlaying : autoplay);
}
function prevSong() {
  if (songAudio && songAudio.currentTime > 3) {
    songAudio.currentTime = 0;
    setProgress(0);
    return;
  }
  songIdx = (songIdx - 1 + songs.length) % songs.length;
  loadSong(songPlaying);
}
function shuffleSong() {
  if (songs.length < 2) return;
  let n;
  do {
    n = Math.floor(Math.random() * songs.length);
  } while (n === songIdx);
  songIdx = n;
  loadSong(true);
}
function togglePlay() {
  if (!songAudio) return;
  if (songAudio.paused) {
    songAudio.play().then(() => setPlayingUI(true)).catch(() => setPlayingUI(false));
  } else {
    songAudio.pause();
    setPlayingUI(false);
  }
}
let mpDragging = false;
function seekFromEvent(e) {
  const bar = mpEl("mpBar");
  if (!bar || !songAudio || !songAudio.duration) return;
  const r = bar.getBoundingClientRect();
  const p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  setProgress(p * 100);
  songAudio.currentTime = p * songAudio.duration;
}
function bindSeekBar() {
  const bar = mpEl("mpBar");
  if (!bar) return;
  bar.addEventListener("pointerdown", (e) => {
    mpDragging = true;
    bar.setPointerCapture(e.pointerId);
    seekFromEvent(e);
  });
  bar.addEventListener("pointermove", (e) => {
    if (mpDragging) seekFromEvent(e);
  });
  const end = () => {
    mpDragging = false;
  };
  bar.addEventListener("pointerup", end);
  bar.addEventListener("pointercancel", end);
  bar.addEventListener("keydown", (e) => {
    if (!songAudio || !songAudio.duration) return;
    if (e.key === "ArrowRight") {
      songAudio.currentTime = Math.min(songAudio.duration, songAudio.currentTime + 5);
      e.preventDefault();
    }
    if (e.key === "ArrowLeft") {
      songAudio.currentTime = Math.max(0, songAudio.currentTime - 5);
      e.preventDefault();
    }
  });
}
function stopMusic() {
  if (songAudio) {
    songAudio.pause();
    songAudio.removeAttribute("src");
    songAudio.load();
  }
  songPlaying = false;
  if (typeof bgm !== "undefined") bgm.duck(false);
}
function initMusicPlayer() {
  songIdx = 0;
  mpDragging = false;
  bindSeekBar();
  loadSong(true);
}
const FLOWER_LETTER_TEXT = "kamu bauk :p";
let flTimer = null;
function openFlowerLetter() {
  const root = document.getElementById("flRoot");
  if (!root || root.classList.contains("open") || root.classList.contains("shake")) return;
  root.classList.add("shake");
  sfx("leaf");
  flTimer = setTimeout(() => {
    root.classList.remove("shake");
    root.classList.add("open");
    flTimer = setTimeout(typeFlowerLetter, 450);
  }, 520);
}
function typeFlowerLetter() {
  const el = document.getElementById("flText");
  if (!el) return;
  el.innerHTML = "";
  const chars = [];
  FLOWER_LETTER_TEXT.split(/(\s+)/).forEach((tok) => {
    if (!tok) return;
    if (/^\s+$/.test(tok)) {
      el.appendChild(document.createTextNode(" "));
      return;
    }
    const w = document.createElement("span");
    w.className = "w";
    [...tok].forEach((c) => {
      const ch = document.createElement("span");
      ch.className = "ch";
      ch.textContent = c;
      w.appendChild(ch);
      chars.push(ch);
    });
    el.appendChild(w);
  });
  if (reduceMotion) {
    chars.forEach((c) => c.classList.add("on"));
    return;
  }
  let i = 0;
  (function step() {
    if (i >= chars.length) return;
    chars[i++].classList.add("on");
    flTimer = setTimeout(step, 110);
  })();
}
function closeFlowerLetter() {
  clearTimeout(flTimer);
  const root = document.getElementById("flRoot");
  if (root) root.classList.remove("open", "shake");
}
function openModal(key) {
  const data = modalData[key];
  if (!data) return;
  if (data.titleHtml) document.getElementById("modalTitle").innerHTML = typeof data.titleHtml === "function" ? data.titleHtml() : data.titleHtml;
  else document.getElementById("modalTitle").textContent = data.title;
  document.getElementById("modalContent").innerHTML = typeof data.html === "function" ? data.html() : data.html;
  const box = document.querySelector(".modal-box");
  box.className = "modal-box" + (data.theme ? " " + data.theme : "");
  document.getElementById("modalOverlay").classList.toggle("letter-full", !!data.fullscreen);
  document.getElementById("modalOverlay").classList.toggle("music-full", !!data.music);
  document.getElementById("modalOverlay").classList.add("show");
  if (data.music) initMusicPlayer();
}
let openEnvelopeCard = null;
function openEnvelope(cardEl, key) {
  if (cardEl.classList.contains("opening")) return;
  cardEl.classList.add("opening");
  sfx(key === "notes" ? "paper" : key === "flower" ? "leaf" : "vinyl");
  openEnvelopeCard = cardEl;
  setTimeout(() => openModal(key), 620);
}
let mpClosing = false;
function closeModal() {
  sfx("tap");
  stopMusic();
  clearTimeout(flTimer);
  const ov = document.getElementById("modalOverlay");
  if (ov.classList.contains("music-full") && ov.classList.contains("show")) {
    if (mpClosing) return;
    mpClosing = true;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    ov.classList.add("mp-leaving");
    setTimeout(() => {
      ov.classList.remove("show", "mp-leaving");
      mpClosing = false;
    }, reduce ? 0 : 430);
  } else {
    ov.classList.remove("show");
  }
  if (openEnvelopeCard) {
    const cardToReset = openEnvelopeCard;
    openEnvelopeCard = null;
    setTimeout(() => cardToReset.classList.remove("opening"), 250);
  }
}
function closeModalOnOverlay(e) {
  if (e.target.id === "modalOverlay") closeModal();
}
let candleBlown = false;
let cakeFlying = false;
function goToFinal() {
  if (cakeFlying) return;
  const btn = document.querySelector("#page3 .to-final-btn");
  const srcEl = btn && btn.querySelector(".cb-cake");
  const wrap = document.getElementById("cakeWrap");
  const lit = document.getElementById("cakeLit");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!srcEl || !wrap || !lit || reduce) {
    goTo("page4");
    return;
  }
  if (candleBlown) {
    candleBlown = false;
    wrap.classList.remove("blown");
    document.getElementById("finalCard").classList.remove("show");
    document.getElementById("candleHint").style.opacity = "";
  }
  cakeFlying = true;
  document.getElementById("page3").classList.add("p3-leaving");
  const from = srcEl.getBoundingClientRect();
  wrap.classList.add("waiting");
  const to = lit.getBoundingClientRect();
  const fly = document.createElement("span");
  fly.className = "cake-fly";
  fly.style.width = from.width + "px";
  fly.style.height = from.height + "px";
  document.body.appendChild(fly);
  btn.classList.add("flying");
  const k = to.width / from.width;
  const dx = to.left - from.left, dy = to.top - from.top;
  const anim = fly.animate([
    { transform: `translate(${from.left}px, ${from.top}px) scale(1)` },
    { transform: `translate(${from.left + dx * 0.5}px, ${from.top + dy * 0.5 - Math.min(60, window.innerHeight * 0.08)}px) scale(${1 + (k - 1) * 0.5})`, offset: 0.5 },
    { transform: `translate(${to.left}px, ${to.top}px) scale(${k})` }
  ], { duration: 1e3, easing: "cubic-bezier(.45,.05,.25,1)", fill: "forwards" });
  goTo("page4");
  const done = () => {
    wrap.classList.remove("waiting");
    fly.remove();
    btn.classList.remove("flying");
    const p3 = document.getElementById("page3");
    p3.classList.add("p3-reset");
    p3.classList.remove("p3-leaving");
    void p3.offsetWidth;
    p3.classList.remove("p3-reset");
    cakeFlying = false;
  };
  anim.onfinish = () => requestAnimationFrame(done);
  anim.oncancel = done;
}
function blowCandle() {
  if (candleBlown) return;
  candleBlown = true;
  sfx("blow");
  document.getElementById("cakeWrap").classList.add("blown");
  document.getElementById("candleHint").style.opacity = "0";
  setTimeout(() => { sfx("sparkle"); launchConfetti(); }, 700);
  setTimeout(() => {
    document.getElementById("finalCard").classList.add("show");
  }, 1300);
}
const canvas = document.getElementById("confetti-canvas");
const ctx = canvas.getContext("2d");
let confettiParticles = [];
let confettiAnimId = null;
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();
const confettiColors = ["#E88CA6", "#F1C6A3", "#FBD8E3", "#D9748A", "#FFFFFF", "#FFD966"];
function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * canvas.height * 0.4,
    size: 6 + Math.random() * 6,
    color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
    speedY: 2 + Math.random() * 3.5,
    speedX: (Math.random() - 0.5) * 3,
    rotation: Math.random() * 360,
    rotSpeed: (Math.random() - 0.5) * 10,
    shape: Math.random() > 0.5 ? "rect" : "circle",
    life: 0,
    maxLife: 260 + Math.random() * 100
  };
}
function launchConfetti() {
  confettiParticles = [];
  for (let i = 0; i < 150; i++) {
    confettiParticles.push(createParticle());
  }
  if (!confettiAnimId) animateConfetti();
}
function animateConfetti() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  confettiParticles.forEach((p) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.rotation += p.rotSpeed;
    p.life++;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation * Math.PI / 180);
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.maxLife);
    if (p.shape === "rect") {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  });
  confettiParticles = confettiParticles.filter(
    (p) => p.life < p.maxLife && p.y < canvas.height + 40
  );
  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    confettiAnimId = null;
  }
}
(function spawnHearts() {
  const wrap = document.getElementById("bgDecor");
  const svg = (w, h, rows, color) => {
    let r = "";
    rows.forEach((row, y) => [...row].forEach((c, x) => {
      if (c === "X") r += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
    }));
    const markup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" fill="${color}">${r}</svg>`;
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(markup)}")`;
  };
  const sprites = [
    svg(7, 6, [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], "#E88CA6"),
    svg(7, 6, [".XX.XX.", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."], "#D9748A"),
    svg(5, 5, ["..X..", "..X..", "XXXXX", "..X..", "..X.."], "#F1C6A3"),
    svg(3, 3, [".X.", "XXX", ".X."], "#FBD8E3")
  ];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const el = document.createElement("span");
    el.style.backgroundImage = sprites[Math.floor(Math.random() * sprites.length)];
    el.style.left = Math.random() * 100 + "%";
    const size = 3 + Math.floor(Math.random() * 3);
    el.style.width = size * 7 + "px";
    el.style.height = size * 7 + "px";
    el.style.animationDuration = 10 + Math.random() * 14 + "s";
    el.style.animationDelay = Math.random() * 12 + "s";
    wrap.appendChild(el);
  }
})();
(function spawnPage3Float() {
  const wrap = document.getElementById("p3Float");
  if (!wrap) return;
  const hearts = ["hp_big", "hp_med", "hp_small", "hp_light1", "hp_light2"].map((n) => `assets/p3/${n}.png`);
  const sparks = ["spark_cluster", "spark_burst", "spark_hollow"].map((n) => `assets/p3/${n}.png`);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const rnd = (a, b) => a + Math.random() * (b - a);
  const count = window.innerWidth < 700 ? 20 : 30;
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const type = r < 0.62 ? "heart" : "spark";
    const el = document.createElement("span");
    const b = document.createElement("b");
    el.className = "pf pf-" + type;
    const dur = rnd(14, 28);
    el.style.setProperty("--x", rnd(2, 96).toFixed(1) + "%");
    el.style.setProperty("--dur", dur.toFixed(1) + "s");
    el.style.setProperty("--delay", (-Math.random() * dur).toFixed(1) + "s");
    el.style.setProperty("--sdur", rnd(3, 6).toFixed(1) + "s");
    el.style.setProperty("--sway", rnd(8, 26).toFixed(0) + "px");
    el.style.setProperty("--tw", (-Math.random() * 1.2).toFixed(2) + "s");
    if (type === "heart") {
      b.style.backgroundImage = `url('${pick(hearts)}')`;
      el.style.setProperty("--s", Math.round(rnd(16, 40)) + "px");
      el.style.setProperty("--o", rnd(0.55, 0.85).toFixed(2));
    } else if (type === "spark") {
      b.style.backgroundImage = `url('${pick(sparks)}')`;
      el.style.setProperty("--s", Math.round(rnd(24, 44)) + "px");
      el.style.setProperty("--o", rnd(0.8, 1).toFixed(2));
    }
    el.appendChild(b);
    wrap.appendChild(el);
  }
})();
