const container = document.getElementById("unit-container");

let units = []; // 由学生数据文件提供

async function loadScript(src) {
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function initApp() {
  const params = new URLSearchParams(location.search);
  const student = params.get("student") || "Chrystel";

  // 如果你文件夹就叫这个（不推荐括号，但先按你现状写）
  const src = `./Student/${encodeURIComponent(student)}.js`;

  await loadScript(src);

  // 你的学生数据文件里必须是：window.UNITS = [...]
  if (!Array.isArray(window.UNITS)) {
    throw new Error("window.UNITS not found in " + src);
  }

  units = window.UNITS;
  showUnitSelection();
}

initApp().catch((e) => {
  container.innerHTML = `<h2>Data load failed</h2><div>${e.message}</div>`;
});

let currentUnit = null;
let currentIndex = 0;
let wrongWords = [];

let showPinyin = false;
let showMeaning = false;

// Listen mode 播放状态
let isPlaying = false;
let isLoop = false;
let playTimer = null;
let playRate = 1.0;

// =====================
// 主界面
// =====================
function showUnitSelection() {
  stopListening();
  container.innerHTML = "";

  const reviewTitle = document.createElement("h2");
  reviewTitle.innerText = "Review Words";
  container.appendChild(reviewTitle);

  units.forEach((unit) => {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    btn.innerText = unit.name;
    btn.onclick = () => startReview(unit);
    container.appendChild(btn);
  });

  const listenTitle = document.createElement("h2");
  listenTitle.style.marginTop = "40px";
  listenTitle.innerText = "Listen Words";
  container.appendChild(listenTitle);

  units.forEach((unit) => {
    const btn = document.createElement("button");
    btn.className = "unit-btn";
    btn.innerText = unit.name;
    btn.onclick = () => startListen(unit);
    container.appendChild(btn);
  });
}

// =====================
// Review Mode
// =====================
function startReview(unit, list = null) {
  stopListening();

  currentUnit = list
    ? { name: unit.name + " (Wrong Words)", words: list }
    : unit;

  currentIndex = 0;
  wrongWords = [];
  showPinyin = false;
  showMeaning = false;

  renderReviewUI();
  showCurrentWord();
}

// =====================
// Listen Mode
// =====================
function startListen(unit) {
  stopListening();

  currentUnit = unit;
  currentIndex = 0;
  showPinyin = false;
  showMeaning = false;

  renderListenUI();
  showCurrentWord();
}

// =====================
// Review UI
// =====================
function renderReviewUI() {
  container.innerHTML = "";

  addCommonHeader();
  addWordBox();
  addPinyinMeaningButtons();

  // 🔊 Speak once（黄色按钮）
  const speakOnceBtn = document.createElement("button");
  speakOnceBtn.className = "unit-btn speak-once-btn";
  speakOnceBtn.innerText = "🔊 Speak";
  speakOnceBtn.onclick = () => speak(currentUnit.words[currentIndex]);
  container.appendChild(speakOnceBtn);

  const judge = document.createElement("div");
  judge.id = "judge-buttons";

  const ok = document.createElement("button");
  ok.className = "unit-btn big-btn";
  ok.innerText = "✅ Correct";
  ok.onclick = nextWord;

  const bad = document.createElement("button");
  bad.className = "unit-btn big-btn";
  bad.innerText = "❌ Wrong";
  bad.onclick = () => {
    wrongWords.push(currentUnit.words[currentIndex]);
    nextWord();
  };

  judge.appendChild(ok);
  judge.appendChild(bad);
  container.appendChild(judge);
}

// =====================
// Listen UI
// =====================
function renderListenUI() {
  container.innerHTML = "";

  addCommonHeader();
  addWordBox();
  addPinyinMeaningButtons();

  // 🔊 Listen 控制区
  const listenBox = document.createElement("div");
  listenBox.id = "listen-box";

  const playBtn = document.createElement("button");
  playBtn.className = "unit-btn speak-once-btn";
  playBtn.innerText = "▶ Start Listening";
  playBtn.onclick = startListening;

  const pauseBtn = document.createElement("button");
  pauseBtn.className = "unit-btn";
  pauseBtn.innerText = "⏸ Pause";
  pauseBtn.onclick = pauseListening;

  const loopBtn = document.createElement("button");
  loopBtn.className = "unit-btn";
  loopBtn.innerText = "🔁 Loop: OFF";
  loopBtn.onclick = () => {
    isLoop = !isLoop;
    loopBtn.innerText = isLoop ? "🔁 Loop: ON" : "🔁 Loop: OFF";
  };

  const speedSelect = document.createElement("select");
  [0.5, 0.8, 1.0, 1.5, 2.0, 3.0].forEach((v) => {
    const opt = document.createElement("option");
    opt.value = v;
    opt.innerText = `×${v}`;
    if (v === playRate) opt.selected = true;
    speedSelect.appendChild(opt);
  });
  speedSelect.onchange = () => (playRate = parseFloat(speedSelect.value));

  listenBox.appendChild(playBtn);
  listenBox.appendChild(pauseBtn);
  listenBox.appendChild(loopBtn);
  listenBox.appendChild(speedSelect);

  container.appendChild(listenBox);
}

// =====================
// 公共组件
// =====================
function addCommonHeader() {
  const title = document.createElement("h2");
  title.innerText = currentUnit.name;
  container.appendChild(title);

  const progress = document.createElement("div");
  progress.id = "progress-box";
  container.appendChild(progress);

  const back = document.createElement("button");
  back.className = "unit-btn";
  back.innerText = "⬅ Back";
  back.onclick = showUnitSelection;
  container.appendChild(back);
}

function addWordBox() {
  const wordBox = document.createElement("div");
  wordBox.id = "word-box";
  container.appendChild(wordBox);

  const pinyin = document.createElement("div");
  pinyin.id = "pinyin-box";
  container.appendChild(pinyin);

  const meaning = document.createElement("div");
  meaning.id = "meaning-box";
  container.appendChild(meaning);
}

function addPinyinMeaningButtons() {
  const pBtn = document.createElement("button");
  pBtn.className = "unit-btn";
  pBtn.innerText = "Show Pinyin";
  pBtn.onclick = () => {
    showPinyin = !showPinyin;
    pBtn.innerText = showPinyin ? "Hide Pinyin" : "Show Pinyin";
    updateExtra();
  };

  const mBtn = document.createElement("button");
  mBtn.className = "unit-btn";
  mBtn.innerText = "Show Meaning";
  mBtn.onclick = () => {
    showMeaning = !showMeaning;
    mBtn.innerText = showMeaning ? "Hide Meaning" : "Show Meaning";
    updateExtra();
  };

  container.appendChild(pBtn);
  container.appendChild(mBtn);
}

// =====================
// 显示逻辑
// =====================
function showCurrentWord() {
  document.getElementById("progress-box").innerText = `Progress: ${
    currentIndex + 1
  } / ${currentUnit.words.length}`;

  document.getElementById("word-box").innerText =
    currentUnit.words[currentIndex].hanzi;

  updateExtra();
}

function updateExtra() {
  const w = currentUnit.words[currentIndex];
  document.getElementById("pinyin-box").innerText = showPinyin ? w.pinyin : "";
  document.getElementById("meaning-box").innerText = showMeaning ? w.meaning : "";
}

// =====================
// Review 流程（✅不再自动朗读）
// =====================
function nextWord() {
  currentIndex++;

  if (currentIndex >= currentUnit.words.length) {
    showSummary();
  } else {
    showCurrentWord();
  }
}

// =====================
// Listen 播放
// =====================
function startListening() {
  isPlaying = true;
  playLoop();
}

function playLoop() {
  if (!isPlaying) return;

  // 显示“正在朗读”的词
  showCurrentWord();

  // 朗读当前词
  speak(currentUnit.words[currentIndex], playRate);

  // delay 跟随倍速变化
  const baseDelay = 1800;
  const delay = Math.min(4000, Math.max(600, baseDelay / playRate));

  // 下一轮
  currentIndex++;

  if (currentIndex >= currentUnit.words.length) {
    if (isLoop) currentIndex = 0;
    else {
      isPlaying = false;
      return;
    }
  }

  playTimer = setTimeout(playLoop, delay);
}

function pauseListening() {
  isPlaying = false;
  clearTimeout(playTimer);
  speechSynthesis.cancel();
}

function stopListening() {
  isPlaying = false;
  clearTimeout(playTimer);
  speechSynthesis.cancel();
}

// =====================
// Summary
// =====================
function showSummary() {
  container.innerHTML = "<h2>End of this round</h2>";

  if (wrongWords.length > 0) {
    const tip = document.createElement("div");
    tip.innerText =
      "Words you got wrong in this round (click to hear pronunciation)";
    container.appendChild(tip);

    wrongWords.forEach((w) => {
      const d = document.createElement("div");
      d.className = "wrong-word";
      d.innerText = w.hanzi;
      d.onclick = () => speak(w);
      container.appendChild(d);
    });

    const retry = document.createElement("button");
    retry.className = "unit-btn";
    retry.innerText = "Review Wrong Words";
    retry.onclick = () => startReview(currentUnit, [...wrongWords]);
    container.appendChild(retry);
  }

  const back = document.createElement("button");
  back.className = "unit-btn";
  back.innerText = "Back to main screen";
  back.onclick = showUnitSelection;
  container.appendChild(back);
}

// =====================
function speak(word, rate = 0.9) {
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word.hanzi);
  u.lang = "zh-CN";
  u.rate = rate;
  speechSynthesis.speak(u);
}

// =====================
// showUnitSelection();