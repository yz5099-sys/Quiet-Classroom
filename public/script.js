'use strict';
const $ = (id) => document.getElementById(id);
const state = {
  phase: 'idle',
  generation: 0,
  score: 0,
  quietSeconds: 0,
  streak: 0,
  longest: 0,
  events: 0,
  volume: 0,
  endAt: null,
  startAt: null,
  audioContext: null,
  stream: null,
  source: null,
  analyser: null,
  frame: null,
  watchdog: null,
  lastFrame: null,
  overSince: null,
  quietSince: null,
  noisy: false,
  demo: false,
  demoNoiseUntil: 0,
};
const controls = ['mode', 'duration', 'startTime', 'endTime'];
let previousFocus;
function formatTime(seconds) {
  const n = Math.max(0, Math.ceil(seconds || 0));
  return `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;
}
function formatSeconds(seconds) {
  const n = Math.floor(seconds || 0);
  return n < 60 ? `${n}s` : `${Math.floor(n / 60)}m ${n % 60}s`;
}
function setStatus(message, noisy = false) {
  if ($('statusText').textContent !== message)
    $('statusText').textContent = message;
  $('statusPill').classList.toggle('noisy', noisy);
}
function updateControls() {
  const busy = state.phase !== 'idle';
  $('startBtn').disabled = busy;
  $('startBtn').textContent =
    state.phase === 'requesting' ? '正在连接麦克风…' : '开始自习';
  $('stopBtn').disabled = !busy;
  $('stopBtn').textContent = ['scheduled', 'requesting'].includes(state.phase)
    ? '取消'
    : '结束';
  controls.forEach((id) => ($(id).disabled = busy));
  $('demoBtn').disabled = busy && !state.demo;
  $('demoBtn').textContent =
    state.demo && busy ? '模拟一次声音 ↗' : '先体验一下演示 ↗';
}
function updateVolume(value) {
  $('volumeText').textContent = `${value}%`;
  $('volumeBar').style.width = `${value}%`;
  $('volumeMeter').setAttribute('aria-valuenow', value);
}
function setFish(awake) {
  $('fish').classList.toggle('awake', awake);
  $('zzz').classList.toggle('hide', awake);
  $('noiseAlert').classList.toggle('show', awake);
  $('sceneCaption').textContent = awake
    ? '轻一点，小鱼听见我们的声音了。'
    : state.phase === 'running'
      ? '做得很好，小鱼正安心地做梦。'
      : '小鱼正在休息，准备好就开始吧。';
}
function renderStats() {
  $('score').textContent = Math.floor(state.score);
  $('quietTime').textContent = formatSeconds(state.quietSeconds);
  $('longestQuiet').textContent = formatSeconds(state.longest);
  $('noiseEvents').textContent = state.events;
  $('timeLeft').textContent =
    state.phase === 'scheduled'
      ? `${formatTime((state.startAt - Date.now()) / 1000)} 后开始`
      : state.phase === 'running'
        ? state.endAt
          ? formatTime((state.endAt - Date.now()) / 1000)
          : '手动模式'
        : '--:--';
}
function applyTimeTheme() {
  const now = new Date(),
    hour = now.getHours();
  document.body.classList.remove('morning', 'afternoon', 'night');
  document.body.classList.add(
    hour >= 6 && hour < 12
      ? 'morning'
      : hour < 18 && hour >= 12
        ? 'afternoon'
        : 'night',
  );
  $('localClock').textContent = now.toLocaleTimeString('zh-CN', {
    hour12: false,
  });
}
function todayAt(value, now) {
  if (!/^\d{2}:\d{2}$/.test(value))
    throw new Error('请设置完整的开始和结束时间。');
  const [h, m] = value.split(':').map(Number);
  const date = new Date(now);
  date.setHours(h, m, 0, 0);
  return date.getTime();
}
function sessionPlan(now = Date.now()) {
  if ($('mode').value === 'manual') return { start: now, end: null };
  if ($('mode').value === 'duration') {
    const minutes = Number($('duration').value);
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 1440)
      throw new Error('请填写 1 到 1440 分钟的有效时长。');
    return { start: now, end: now + minutes * 60000 };
  }
  if ($('startTime').value === $('endTime').value)
    throw new Error('开始与结束时间不能相同。');
  let start = todayAt($('startTime').value, now),
    end = todayAt($('endTime').value, now);
  const crossesMidnight = end < start;
  if (crossesMidnight) {
    if (now < end) {
      const d = new Date(start);
      d.setDate(d.getDate() - 1);
      start = d.getTime();
    } else {
      const d = new Date(end);
      d.setDate(d.getDate() + 1);
      end = d.getTime();
    }
  } else if (now >= end) {
    throw new Error('今天的预约时段已经结束，请选择稍后的时间。');
  }
  return { start: Math.max(start, now), end };
}
function clearData() {
  Object.assign(state, {
    score: 0,
    quietSeconds: 0,
    streak: 0,
    longest: 0,
    events: 0,
    volume: 0,
    overSince: null,
    quietSince: null,
    noisy: false,
    demoNoiseUntil: 0,
  });
}
function releaseAudio() {
  const stream = state.stream,
    context = state.audioContext;
  state.stream = state.audioContext = state.source = state.analyser = null;
  if (stream) stream.getTracks().forEach((track) => track.stop());
  if (context && context.state !== 'closed') context.close().catch(() => {});
}
async function setupAudio(token) {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
    throw new Error('麦克风需要 HTTPS 或 localhost。你也可以先体验演示。');
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
  });
  if (token !== state.generation) {
    stream.getTracks().forEach((t) => t.stop());
    return false;
  }
  state.stream = stream;
  const Audio = window.AudioContext || window.webkitAudioContext;
  if (!Audio) throw new Error('当前浏览器不支持声音分析，请使用新版浏览器。');
  const context = new Audio();
  state.audioContext = context;
  if (context.state === 'suspended') await context.resume();
  if (token !== state.generation) return false;
  state.analyser = context.createAnalyser();
  state.analyser.fftSize = 1024;
  state.source = context.createMediaStreamSource(stream);
  state.source.connect(state.analyser);
  stream.getAudioTracks().forEach((track) =>
    track.addEventListener('ended', () => {
      if (state.stream === stream && state.phase !== 'idle') {
        stopSession(false);
        setStatus('麦克风已断开，请重新开始。', true);
      }
    }),
  );
  return true;
}
async function startSession(demo = false) {
  if (state.phase !== 'idle') return;
  let plan;
  try {
    plan = sessionPlan();
  } catch (error) {
    setStatus(error.message, true);
    return;
  }
  const token = ++state.generation;
  state.phase = 'requesting';
  state.demo = demo;
  updateControls();
  setStatus(demo ? '正在准备演示…' : '请允许麦克风访问…');
  try {
    if (!demo && !(await setupAudio(token))) return;
    if (token !== state.generation) return;
    // Duration sessions start after permission, not while the permission dialog is open.
    if ($('mode').value === 'duration') plan = sessionPlan();
    if (plan.end && plan.end <= Date.now())
      throw new Error('预约时段已经结束，请重新设置。');
    clearData();
    state.endAt = plan.end;
    state.startAt = plan.start;
    if (plan.start > Date.now()) {
      state.phase = 'scheduled';
      state.stream?.getTracks().forEach((track) => (track.enabled = false));
      setStatus('预约已就绪，请保持页面打开');
      $('sceneState').textContent = '已预约';
    } else activateSession();
    state.watchdog = setInterval(() => {
      if (token !== state.generation) return;
      if (state.endAt && Date.now() >= state.endAt) {
        stopSession(true);
        return;
      }
      if (state.phase === 'scheduled' && Date.now() >= state.startAt)
        activateSession();
      renderStats();
    }, 250);
    updateControls();
    renderStats();
  } catch (error) {
    if (token !== state.generation) return;
    stopSession(false);
    const message =
      error.name === 'NotAllowedError'
        ? '麦克风未授权。请允许访问，或点击下方演示。'
        : error.name === 'NotFoundError'
          ? '未找到麦克风。请连接设备，或体验演示。'
          : error.message;
    setStatus(message, true);
  }
}
function activateSession() {
  state.phase = 'running';
  state.lastFrame = null;
  state.stream?.getTracks().forEach((track) => (track.enabled = true));
  $('sceneState').textContent = state.demo ? '演示 · 不计分' : '正在守护';
  setStatus(state.demo ? '演示模式 · 模拟音量 · 不计分' : '安静守护中');
  setFish(false);
  updateControls();
  startAudioLoop();
}
function checkNoise(volume, now) {
  const threshold = Number($('threshold').value);
  if (volume >= threshold) {
    state.quietSince = null;
    state.streak = 0;
    if (state.overSince === null) state.overSince = now;
    if (now - state.overSince >= 300 && !state.noisy) {
      state.noisy = true;
      if (!state.demo) {
        state.events++;
        state.score = Math.max(0, state.score - 25);
      }
      setFish(true);
    }
    setStatus(
      state.demo ? '演示 · 小鱼被模拟声音唤醒' : '声音有点大，小鱼醒来了',
      true,
    );
  } else {
    state.overSince = null;
    if (volume < threshold * 0.9) {
      if (state.quietSince === null) state.quietSince = now;
      if (state.noisy && now - state.quietSince >= 1400) {
        state.noisy = false;
        setFish(false);
      }
    } else state.quietSince = null;
    setStatus(
      state.demo
        ? '演示模式 · 模拟音量 · 不计分'
        : state.noisy
          ? '正在恢复安静…'
          : '安静守护中',
      state.noisy,
    );
  }
}
function startAudioLoop() {
  const token = state.generation;
  const buffer = state.analyser ? new Uint8Array(state.analyser.fftSize) : null;
  function loop(now) {
    if (token !== state.generation || state.phase !== 'running') return;
    if (state.endAt && Date.now() >= state.endAt) {
      stopSession(true);
      return;
    }
    // Never award an unobserved interval after a background tab resumes.
    const elapsed =
      state.lastFrame === null
        ? 0
        : Math.min(0.25, (now - state.lastFrame) / 1000);
    state.lastFrame = now;
    if (!state.demo && state.audioContext?.state !== 'running') {
      state.streak = 0;
      state.overSince = state.quietSince = null;
      updateVolume(0);
      setStatus('声音检测已暂停，请点击页面恢复');
      state.frame = requestAnimationFrame(loop);
      return;
    }
    if (state.demo)
      state.volume =
        Date.now() < state.demoNoiseUntil
          ? 96
          : Math.round(8 + Math.sin(now / 900) * 3);
    else {
      state.analyser.getByteTimeDomainData(buffer);
      let sum = 0;
      for (const sample of buffer) sum += ((sample - 128) / 128) ** 2;
      state.volume = Math.min(
        100,
        Math.round(Math.sqrt(sum / buffer.length) * 520),
      );
    }
    updateVolume(state.volume);
    checkNoise(state.volume, now);
    if (
      !state.demo &&
      !document.hidden &&
      !state.stream.getAudioTracks().some((t) => t.muted || !t.enabled) &&
      state.volume < Number($('threshold').value) * 0.9
    ) {
      state.quietSeconds += elapsed;
      state.streak += elapsed;
      state.longest = Math.max(state.longest, state.streak);
      state.score += (1 + Math.min(8, (state.streak / 20) ** 1.35)) * elapsed;
    }
    renderStats();
    state.frame = requestAnimationFrame(loop);
  }
  state.frame = requestAnimationFrame(loop);
}
function stopSession(show = true) {
  const wasRunning = state.phase === 'running';
  ++state.generation;
  clearInterval(state.watchdog);
  state.watchdog = null;
  cancelAnimationFrame(state.frame);
  state.frame = null;
  state.phase = 'idle';
  state.endAt = state.startAt = state.lastFrame = null;
  state.overSince = state.quietSince = null;
  state.noisy = false;
  releaseAudio();
  setFish(false);
  updateControls();
  updateVolume(0);
  renderStats();
  $('sceneState').textContent = '准备就绪';
  setStatus('已结束 · 麦克风已释放');
  if (show && wasRunning) showResult();
}
function resetAll() {
  closeResult();
  stopSession(false);
  clearData();
  renderStats();
  setStatus('等待开始');
}
function showResult() {
  $('finalScore').textContent = Math.floor(state.score);
  $('finalQuiet').textContent = formatSeconds(state.quietSeconds);
  $('finalLongest').textContent = formatSeconds(state.longest);
  $('finalNoise').textContent = state.events;
  $('titleBadge').textContent = state.demo
    ? '演示结束 · 不计入成绩'
    : state.score >= 800 && state.events <= 1
      ? '静音之神'
      : state.score >= 500
        ? '自习大师'
        : state.score >= 220
          ? '安静守护者'
          : state.score >= 80
            ? '安静小队'
            : '每一刻安静都值得';
  previousFocus = document.activeElement;
  document.querySelector('.app').inert = true;
  $('resultModal').inert = false;
  $('resultModal').classList.add('show');
  $('closeModalBtn').focus();
}
function closeResult() {
  const open = $('resultModal').classList.contains('show');
  document.querySelector('.app').inert = false;
  $('resultModal').classList.remove('show');
  $('resultModal').inert = true;
  if (open)
    (previousFocus?.disabled
      ? $('startBtn')
      : previousFocus || $('startBtn')
    ).focus();
}
function updateMode() {
  $('durationField').hidden = $('mode').value !== 'duration';
  $('durationField').style.display =
    $('mode').value === 'duration' ? 'block' : 'none';
  $('scheduleFields').style.display =
    $('mode').value === 'scheduled' ? 'block' : 'none';
}
$('mode').addEventListener('change', updateMode);
$('threshold').addEventListener(
  'input',
  () => ($('thresholdText').textContent = $('threshold').value),
);
$('duration').max = '1440';
$('startBtn').addEventListener('click', () => startSession(false));
$('stopBtn').addEventListener('click', () => stopSession(true));
$('resetBtn').addEventListener('click', resetAll);
$('demoBtn').addEventListener('click', () => {
  if (state.phase === 'running' && state.demo)
    state.demoNoiseUntil = Date.now() + 2000;
  else startSession(true);
});
$('closeModalBtn').addEventListener('click', closeResult);
$('resultModal').addEventListener('click', (event) => {
  if (event.target === $('resultModal')) closeResult();
});
document.addEventListener('keydown', (event) => {
  if (!$('resultModal').classList.contains('show')) return;
  if (event.key === 'Escape') closeResult();
  if (event.key === 'Tab') {
    event.preventDefault();
    $('closeModalBtn').focus();
  }
});
document.addEventListener('visibilitychange', () => {
  state.lastFrame = null;
  state.streak = 0;
  state.overSince = state.quietSince = null;
});
document.addEventListener('pointerdown', () => {
  if (state.phase === 'running' && state.audioContext?.state === 'suspended')
    state.audioContext.resume().catch(() => {});
});
window.addEventListener('pagehide', () => stopSession(false));
applyTimeTheme();
setInterval(applyTimeTheme, 1000);
updateMode();
updateControls();
renderStats();
