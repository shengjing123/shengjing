/* ===========================================================
   声境 · 应用逻辑
   - 三级导航：封面 → 列表 → 播放
   - 每种模式 = 多音轨分层混播（lo-fi 渐入，呵护敏感耳朵）
   - 呼吸光晕：播放脉动 / 暂停静止
   - 封面：日期 + 农历；天气柔和一条；4 套主题可切换
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
  let instances = {};
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

  function rampUp(list, ms) {
    clearInterval(rampInterval);
    const froms = list.map((o) => o.audio.volume);
    const tos = list.map((o) => targetVol(o.gain));
    const steps = 26, stepMs = Math.max(8, ms / steps);
    let i = 0;
    rampInterval = setInterval(() => {
      i++;
      const k = i / steps;
      list.forEach((o, idx) => { o.audio.volume = froms[idx] + (tos[idx] - froms[idx]) * k; });
      if (i >= steps) clearInterval(rampInterval);
    }, stepMs);
  }

  function rampDownAndPause(list, ms) {
    clearInterval(silenceInterval);
    const froms = list.map((o) => o.audio.volume);
    const steps = 14, stepMs = Math.max(8, ms / steps);
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

  function fadeOutAndPause(ms, onDone) {
    if (!currentId || !instances[currentId]) { if (onDone) onDone(); return; }
    rampDownAndPause(instances[currentId], ms);
    playing = false;
    if (onDone) setTimeout(onDone, ms + 40);
  }

  return {
    play, pause, setMaster, fadeOutAndPause,
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
  updateMediaSession();
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
  updateMediaSession();
}
els.enterBtn.addEventListener("click", () => showView("list"));
els.backBtn.addEventListener("click", () => { showView("list"); refreshListMarkers(); });
els.orbBtn.addEventListener("click", togglePlay);
els.vol.addEventListener("input", (e) => AudioEngine.setMaster(parseFloat(e.target.value)));

document.addEventListener("keydown", (e) => {
  if (e.code === "Space" && els.player.classList.contains("is-active") && activeMode) {
    e.preventDefault();
    togglePlay();
  }
});

/* ---------- 农历算法（1900–2100，自包含，无需联网） ---------- */
const Lunar = (() => {
  const lunarInfo = [
    0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
    0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
    0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
    0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
    0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
    0x06ca0,0x0b550,0x15355,0x04da0,0x0a5b0,0x14573,0x052b0,0x0a9a8,0x0e950,0x06aa0,
    0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
    0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b6a0,0x195a6,
    0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
    0x04af2,0x04970,0x064b0,0x074a7,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
    0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
    0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
    0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
    0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
    0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
    0x14b63,0x09370,0x049f8,0x04970,0x064b0,0x168a6,0x0ea50,0x06b20,0x1a6c4,0x0aae0,
    0x0a2e0,0x0d2e3,0x0c960,0x0d557,0x0d4a0,0x0da50,0x05d55,0x056a0,0x0a6d0,0x055d4,
    0x052d0,0x0a9b8,0x0a950,0x0b4a0,0x0b6a6,0x0ad50,0x055a0,0x0aba4,0x0a5b0,0x052b0,
    0x0b273,0x06930,0x07337,0x06aa0,0x0ad50,0x14b55,0x04b60,0x0a570,0x054e4,0x0d160,
    0x0e968,0x0d520,0x0daa0,0x16aa6,0x056d0,0x04ae0,0x0a9d4,0x0a2d0,0x0d150,0x0f250,
  ];
  const Gan = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
  const Zhi = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
  const Animals = ["鼠","牛","虎","兔","龙","蛇","马","羊","猴","鸡","狗","猪"];
  const monthCN = ["正","二","三","四","五","六","七","八","九","十","冬","腊"];
  const dayCN = ["初一","初二","初三","初四","初五","初六","初七","初八","初九","初十",
    "十一","十二","十三","十四","十五","十六","十七","十八","十九","二十",
    "廿一","廿二","廿三","廿四","廿五","廿六","廿七","廿八","廿九","三十"];

  const lYearDays = (y) => { let s = 348; for (let i = 0x8000; i > 0x8; i >>= 1) s += (lunarInfo[y - 1900] & i) ? 1 : 0; return s + leapDays(y); };
  const leapDays = (y) => { return leapMonth(y) ? ((lunarInfo[y - 1900] & 0x10000) ? 30 : 29) : 0; };
  const leapMonth = (y) => { return lunarInfo[y - 1900] & 0xf; };
  const monthDays = (y, m) => { return ((lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29); };

  function solar2lunar(y, m, d) {
    let offset = Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
    let i, temp = 0;
    for (i = 1900; i < 2101 && offset > 0; i++) { temp = lYearDays(i); offset -= temp; }
    if (offset < 0) { offset += temp; i--; }
    const year = i;
    const lm = leapMonth(year);
    let isLeap = false, month;
    for (i = 1; i < 13 && offset > 0; i++) {
      if (lm > 0 && i === lm + 1 && !isLeap) { --i; isLeap = true; temp = leapDays(year); }
      else { temp = monthDays(year, i); }
      if (isLeap && i === lm + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && lm > 0 && i === lm + 1) {
      if (isLeap) { isLeap = false; } else { isLeap = true; --i; }
    }
    if (offset < 0) { offset += temp; --i; }
    month = i;
    const day = offset + 1;
    return { year, month, day, isLeap };
  }

  function format(y, m, d) {
    const L = solar2lunar(y, m, d);
    const gz = Gan[(L.year - 4) % 10] + Zhi[(L.year - 4) % 12];
    const animal = Animals[(L.year - 4) % 12];
    const mName = (L.isLeap ? "闰" : "") + monthCN[L.month - 1] + "月";
    const dName = dayCN[L.day - 1];
    return { gz, animal, mName, dName, text: `农历 ${gz}${animal}年 ${mName}${dName}` };
  }

  return { format };
})();

/* ---------- 封面日期 + 农历 ---------- */
const CoverDate = (() => {
  const el = document.getElementById("coverDate");
  const weekCN = ["日", "一", "二", "三", "四", "五", "六"];
  function render() {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth() + 1, d = now.getDate();
    const w = weekCN[now.getDay()];
    const lunar = Lunar.format(y, m, d);
    el.textContent = `${y}年${m}月${d}日 周${w} · ${lunar.text}`;
  }
  return { render };
})();

/* ---------- 天气预报（Open-Meteo，免 key、国内可访问） ---------- */
const Weather = (() => {
  const box = document.getElementById("weather");
  const main = document.getElementById("weatherMain");
  const icon = document.getElementById("wxIcon");
  const cond = document.getElementById("wxCond");
  const temp = document.getElementById("wxTemp");
  const suggest = document.getElementById("wxSuggest");
  const forecast = document.getElementById("weatherForecast");

  const CODE = {
    0:["晴","☀","morning"], 1:["晴间多云","🌤","morning"], 2:["多云","⛅","forest"], 3:["阴","☁","meditate"],
    45:["雾","🌫","fireplace"], 48:["雾凇","🌫","fireplace"],
    51:["毛毛雨","🌦","rain"], 53:["毛毛雨","🌦","rain"], 55:["毛毛雨","🌦","rain"],
    56:["冻毛雨","🌧","rain"], 57:["冻毛雨","🌧","rain"],
    61:["小雨","🌧","rain"], 63:["中雨","🌧","rain"], 65:["大雨","🌧","rain"],
    66:["冻雨","🌧","rain"], 67:["冻雨","🌧","rain"],
    71:["小雪","🌨","white"], 73:["中雪","🌨","white"], 75:["大雪","🌨","white"], 77:["雪粒","🌨","white"],
    80:["阵雨","🌦","rain"], 81:["阵雨","🌦","rain"], 82:["强阵雨","⛈","rain"],
    85:["阵雪","🌨","white"], 86:["强阵雪","🌨","white"],
    95:["雷阵雨","⛈","rain"], 96:["雷阵雨伴雹","⛈","rain"], 99:["强雷暴","⛈","rain"],
  };
  const pick = (c) => CODE[c] || ["未知", "·", "white"];
  const suggestName = (id) => { const m = MODES.find((x) => x.id === id); return m ? m.name : ""; };
  const DAYS = ["今天", "明天", "后天"];

  function timeSuggest() {
    const h = new Date().getHours();
    if (h < 6) return "night";
    if (h < 11) return "morning";
    if (h < 14) return "forest";
    if (h < 18) return "stream";
    if (h < 22) return "fireplace";
    return "night";
  }

  function render(data) {
    const cur = data.current;
    const info = pick(cur.weather_code);
    icon.textContent = info[1];
    cond.textContent = info[0];
    temp.textContent = Math.round(cur.temperature_2m) + "°";
    const sn = suggestName(info[2]);
    suggest.textContent = sn ? "· 适合听「" + sn + "」" : "";
    const dl = data.daily;
    let html = "";
    for (let i = 0; i < 3 && i < dl.time.length; i++) {
      const p = pick(dl.weather_code[i]);
      html += '<div class="wf-item"><span class="wf-day">' + DAYS[i] + '</span>' +
        '<span class="wf-icon">' + p[1] + '</span>' +
        '<span class="wf-temp">' + Math.round(dl.temperature_2m_min[i]) + "° / " + Math.round(dl.temperature_2m_max[i]) + "°</span></div>";
    }
    forecast.innerHTML = html;
    box.classList.add("is-ready");
  }

  function renderFallback() {
    const sn = suggestName(timeSuggest());
    icon.textContent = "🌗";
    cond.textContent = "此刻";
    temp.textContent = "";
    suggest.textContent = sn ? "· 适合听「" + sn + "」" : "";
    forecast.innerHTML = "";
    box.classList.add("is-ready");
  }

  function load(lat, lon) {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon +
      "&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_min,temperature_2m_max" +
      "&timezone=auto&forecast_days=3";
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 9000);
    fetch(url, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { clearTimeout(timer); render(data); })
      .catch(() => { clearTimeout(timer); renderFallback(); });
  }

  function init() {
    main.addEventListener("click", () => box.classList.toggle("is-open"));
    load(39.9042, 116.4074); // 立即用默认城市（北京），进入封面即可见
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => load(pos.coords.latitude, pos.coords.longitude),
        () => {},
        { timeout: 6000, maximumAge: 600000 }
      );
    }
  }

  return { init };
})();

/* ---------- 睡眠定时 ---------- */
const Sleep = (() => {
  const btn = document.getElementById("sleepBtn");
  const label = document.getElementById("sleepLabel");
  const menu = document.getElementById("sleepMenu");
  let timer = null, tick = null, deadline = 0;

  function fmt(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  }
  function syncLabel() {
    label.textContent = deadline ? "剩 " + fmt(deadline - Date.now()) : "定时";
  }
  function closeMenu() { btn.classList.remove("is-menu-open"); }
  function clear() {
    if (timer) { clearTimeout(timer); timer = null; }
    if (tick) { clearInterval(tick); tick = null; }
    deadline = 0;
    label.textContent = "定时";
    btn.classList.remove("is-on");
  }
  function set(min) {
    clear();
    if (!min) return;
    deadline = Date.now() + min * 60000;
    btn.classList.add("is-on");
    syncLabel();
    tick = setInterval(syncLabel, 1000);
    timer = setTimeout(() => {
      if (tick) { clearInterval(tick); tick = null; }
      if (activeMode && AudioEngine.isPlaying() && AudioEngine.current() === activeMode.id) {
        AudioEngine.fadeOutAndPause(6000, () => {
          els.player.classList.remove("is-playing");
          refreshListMarkers();
          updateMediaSession();
        });
      }
      deadline = 0;
      label.textContent = "定时";
      btn.classList.remove("is-on");
    }, min * 60000);
  }

  btn.addEventListener("click", (e) => {
    if (e.target.closest(".sleep-menu")) return;
    btn.classList.toggle("is-menu-open");
  });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-min]");
    if (b) { set(parseInt(b.dataset.min, 10)); closeMenu(); }
  });
  document.addEventListener("click", (e) => { if (!e.target.closest("#sleepWrap")) closeMenu(); });

  return {};
})();

/* ---------- 外观主题切换（4 套配色） ---------- */
const Theme = (() => {
  const btn = document.getElementById("themeBtn");
  const menu = document.getElementById("themeMenu");
  const KEY = "shengjing-theme";
  const THEMES = ["dark", "warm", "dawn", "dusk"];

  function apply(name) {
    document.documentElement.setAttribute("data-theme", name);
    try { localStorage.setItem(KEY, name); } catch (e) {}
    menu.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.theme === name);
    });
  }
  function sync() {
    let cur = document.documentElement.getAttribute("data-theme") || "warm";
    if (!THEMES.includes(cur)) cur = "warm";
    menu.querySelectorAll("button").forEach((b) => {
      b.classList.toggle("active", b.dataset.theme === cur);
    });
  }

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.classList.toggle("is-open");
  });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-theme]");
    if (b) { apply(b.dataset.theme); menu.classList.remove("is-open"); }
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#themeMenu") && e.target !== btn) menu.classList.remove("is-open");
  });

  return { sync };
})();

/* ---------- 锁屏播放控制（Media Session API） ---------- */
function updateMediaSession() {
  if (!("mediaSession" in navigator) || !activeMode) return;
  const isActive = AudioEngine.isPlaying() && AudioEngine.current() === activeMode.id;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: activeMode.name,
      artist: "声境",
      album: "为敏感的灵魂留一片声音",
      artwork: [{ src: "assets/icon.svg", sizes: "any", type: "image/svg+xml" }],
    });
    navigator.mediaSession.playbackState = isActive ? "playing" : "paused";
    const doPlay = () => { if (!(AudioEngine.isPlaying() && AudioEngine.current() === activeMode.id)) togglePlay(); };
    const doPause = () => { if (AudioEngine.isPlaying() && AudioEngine.current() === activeMode.id) togglePlay(); };
    navigator.mediaSession.setActionHandler("play", doPlay);
    navigator.mediaSession.setActionHandler("pause", doPause);
    navigator.mediaSession.setActionHandler("previoustrack", null);
    navigator.mediaSession.setActionHandler("nexttrack", null);
  } catch (e) {}
}

/* ---------- PWA：Service Worker（网络优先，更新即刷新） ---------- */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
}

/* ---------- 初始化 ---------- */
renderList();
CoverDate.render();
Theme.sync();
Weather.init();
