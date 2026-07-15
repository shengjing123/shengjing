/* ===========================================================
   声境 · 应用逻辑
   - 三级导航：封面 → 列表 → 播放
   - 每种模式 = 多音轨分层混播（lo-fi 渐入，呵护敏感耳朵）
   - 呼吸光晕：播放脉动 / 暂停静止
   =========================================================== */

/* ---------- 9 种模式配置 ---------- */
const MODES = [
  {
    id: "morning", name: "晨起", tagline: "慢慢醒来", desc: "温和唤醒，从安静到明亮",
    tracks: [
      { file: "audio/晨起鸟鸣明亮版.mp3", gain: 0.6, label: "晨起鸟鸣明亮版" },
      { file: "audio/晨起微风.mp3",       gain: 0.5, label: "晨起微风" },
    ],
  },
  {
    id: "rain", name: "雨天", tagline: "被包裹的安全感", desc: "雨声包裹，安心入睡",
    tracks: [
      { file: "audio/细雨敲窗.mp3", gain: 0.5, label: "细雨敲窗" },
      { file: "audio/雷雨交加.mp3", gain: 0.3, label: "雷雨交加" },
      { file: "audio/雨声助眠.mp3", gain: 0.6, label: "雨声助眠" },
    ],
  },
  {
    id: "wave", name: "海浪", tagline: "低频的包裹感", desc: "海浪持续拍岸，稳定而放松",
    tracks: [
      { file: "audio/海浪1.mp3",   gain: 0.6, label: "海浪1" },
      { file: "audio/潮汐声1.mp3", gain: 0.5, label: "潮汐声1" },
    ],
  },
  {
    id: "forest", name: "森林", tagline: "呼吸变慢的沉浸", desc: "虫鸣鸟叫，被大自然包围",
    tracks: [
      { file: "audio/森林1.mp3", gain: 0.5, label: "森林1" },
      { file: "audio/森林2.mp3", gain: 0.4, label: "森林2" },
      { file: "audio/森林3.mp3", gain: 0.45, label: "森林3" },
    ],
  },
  {
    id: "stream", name: "溪流", tagline: "持续的流动感", desc: "流水声持续流淌，带走杂念",
    tracks: [
      { file: "audio/山间溪水.mp3", gain: 0.5,  label: "山间溪水" },
      { file: "audio/山谷溪水.mp3", gain: 0.45, label: "山谷溪水" },
      { file: "audio/林间溪流.mp3", gain: 0.5,  label: "林间溪流" },
    ],
  },
  {
    id: "night", name: "深夜", tagline: "极低音量的陪伴", desc: "安静城市的底噪，像在深夜窗口",
    tracks: [
      { file: "audio/城市底噪1.mp3", gain: 0.45, label: "城市底噪1" },
      { file: "audio/滴水声.mp3",     gain: 0.35, label: "滴水声" },
    ],
  },
  {
    id: "meditate", name: "冥想", tagline: "音波疗愈", desc: "水晶钵和颂钵的空灵振动",
    tracks: [
      { file: "audio/冥想1.mp3", gain: 0.6,  label: "冥想1" },
      { file: "audio/冥想2.mp3", gain: 0.5,  label: "冥想2" },
      { file: "audio/冥想3.mp3", gain: 0.55, label: "冥想3" },
    ],
  },
  {
    id: "fireplace", name: "壁炉", tagline: "温暖的安定感", desc: "木头燃烧的噼啪声，温暖安心",
    tracks: [
      { file: "audio/壁炉1.mp3",    gain: 0.5,  label: "壁炉1" },
      { file: "audio/柴火燃烧.mp3", gain: 0.55, label: "柴火燃烧" },
    ],
  },
  {
    id: "white", name: "白噪音", tagline: "不打扰的背景", desc: "持续的平稳白噪音，适合阅读或工作",
    tracks: [
      { file: "audio/网球场.mp3", gain: 0.4,  label: "网球场" },
      { file: "audio/键盘.mp3",   gain: 0.45, label: "键盘" },
    ],
  },
];

/* ---------- 音频引擎 ---------- */
const AudioEngine = (() => {
  let instances = {};      // modeId -> [{ audio, gain, label }]
  let currentId = null;
  let playing = false;
  let master = 0.7;
  let rampInterval = null;
  let silenceInterval = null;

  const targetVol = (gain) => Math.max(0, Math.min(1, gain * master));

  function build(mode) {
    if (instances[mode.id]) return instances[mode.id];
    const list = mode.tracks.map((t) => {
      const a = new Audio();
      a.src = t.file;
      a.loop = true;
      a.preload = "auto";
      a.volume = 0;
      return { audio: a, gain: t.gain, label: t.label };
    });
    instances[mode.id] = list;
    return list;
  }

  // 渐入到目标音量（呵护敏感耳朵，避免突然响起）
  function rampUp(list, ms) {
    clearInterval(rampInterval);
    const froms = list.map((o) => o.audio.volume);
    const tos = list.map((o) => targetVol(o.gain));
    const steps = 26, stepMs = ms / steps;
    let i = 0;
    rampInterval = setInterval(() => {
      i++;
      const k = i / steps;
      list.forEach((o, idx) => { o.audio.volume = froms[idx] + (tos[idx] - froms[idx]) * k; });
      if (i >= steps) clearInterval(rampInterval);
    }, stepMs);
  }

  // 渐出并暂停（传出模式用，避免爆音）
  function rampDownAndPause(list, ms) {
    clearInterval(silenceInterval);
    const froms = list.map((o) => o.audio.volume);
    const steps = 14, stepMs = ms / steps;
    let i = 0;
    silenceInterval = setInterval(() => {
      i++;
      const k = i / steps;
      list.forEach((o, idx) => { o.audio.volume = froms[idx] * (1 - k); });
      if (i >= steps) {
        clearInterval(silenceInterval);
        list.forEach((o) => o.audio.pause());
      }
    }, stepMs);
  }

  function play(mode) {
    if (currentId && currentId !== mode.id && instances[currentId]) {
      rampDownAndPause(instances[currentId], 320);
    }
    currentId = mode.id;
    const list = build(mode);
    list.forEach((o) => {
      o.audio.volume = 0;
      const p = o.audio.play();
      if (p && p.catch) p.catch(() => {});
    });
    rampUp(list, 850);
    playing = true;
  }

  function pause() {
    if (!currentId || !instances[currentId]) return;
    rampDownAndPause(instances[currentId], 380);
    playing = false;
  }

  function setMaster(v) {
    master = v;
    if (currentId && playing && instances[currentId]) rampUp(instances[currentId], 280);
  }

  return {
    play, pause, setMaster,
    isPlaying: () => playing,
    current: () => currentId,
  };
})();

/* ---------- UI 控制 ---------- */
const els = {
  cover: document.getElementById("view-cover"),
  list: document.getElementById("view-list"),
  player: document.getElementById("view-player"),
  modeList: document.getElementById("modeList"),
  enterBtn: document.getElementById("enterBtn"),
  backBtn: document.getElementById("backBtn"),
  orbBtn: document.getElementById("orbBtn"),
  playerName: document.getElementById("playerName"),
  playerDesc: document.getElementById("playerDesc"),
  nowSound: document.getElementById("nowSound"),
  vol: document.getElementById("vol"),
};

let activeMode = null;

function showView(name) {
  [els.cover, els.list, els.player].forEach((v) => v.classList.remove("is-active"));
  ({ cover: els.cover, list: els.list, player: els.player })[name].classList.add("is-active");
}

function renderList() {
  els.modeList.innerHTML = "";
  MODES.forEach((m) => {
    const li = document.createElement("li");
    li.className = "mode-card";
    li.dataset.id = m.id;
    li.tabIndex = 0;
    li.innerHTML =
      `<span class="mc-name">${m.name}</span>` +
      `<span class="mc-desc">${m.tagline}</span>`;
    li.addEventListener("click", () => openPlayer(m));
    li.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openPlayer(m); }
    });
    els.modeList.appendChild(li);
  });
}

function refreshListMarkers() {
  const onId = AudioEngine.current();
  const on = AudioEngine.isPlaying();
  document.querySelectorAll(".mode-card").forEach((c) => {
    c.classList.toggle("is-playing", on && c.dataset.id === onId);
  });
}

function openPlayer(m) {
  activeMode = m;
  els.playerName.textContent = m.name;
  els.playerDesc.textContent = m.desc;
  els.nowSound.textContent = m.tracks.map((t) => t.label).join(" · ");
  const isPlaying = AudioEngine.current() === m.id && AudioEngine.isPlaying();
  els.player.classList.toggle("is-playing", isPlaying);
  showView("player");
}

function togglePlay() {
  if (!activeMode) return;
  const isPlaying = AudioEngine.current() === activeMode.id && AudioEngine.isPlaying();
  if (isPlaying) {
    AudioEngine.pause();
    els.player.classList.remove("is-playing");
  } else {
    AudioEngine.play(activeMode);
    els.player.classList.add("is-playing");
  }
  refreshListMarkers();
}

/* ---------- 事件绑定 ---------- */
els.enterBtn.addEventListener("click", () => showView("list"));
els.backBtn.addEventListener("click", () => { showView("list"); refreshListMarkers(); });
els.orbBtn.addEventListener("click", togglePlay);
els.vol.addEventListener("input", (e) => AudioEngine.setMaster(parseFloat(e.target.value)));

/* 空格键在播放页快速播放/暂停 */
document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && els.player.classList.contains("is-active") && activeMode) {
    e.preventDefault();
    togglePlay();
  }
});

/* ---------- PWA：Service Worker（离线可用，优雅降级） ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

/* ---------- 初始化 ---------- */
renderList();
