(() => {
  if (window.__ckRadioBarMounted || location.pathname.startsWith("/radio")) return;
  if (localStorage.getItem("ck_radio_playing") !== "1") return;
  window.__ckRadioBarMounted = true;

  const chId = localStorage.getItem("ck_radio_ch") || "dub";
  let isPlaying = false;
  let audioCtx = null;
  let audio = null;

  function createCavernImpulse(ctx, duration = 6.2, decay = 2.2) {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * duration);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, decay);
        data[i] = (Math.random() * 2 - 1) * env;
      }
    }
    return buf;
  }

  function initAudio() {
    if (audioCtx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioCtx();
    audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "none";

    const src = audioCtx.createMediaElementSource(audio);
    const preDelay = audioCtx.createDelay(0.5);
    preDelay.delayTime.value = 0.068;

    const wetFilter = audioCtx.createBiquadFilter();
    wetFilter.type = "lowpass";
    wetFilter.frequency.value = 2800;

    const conv = audioCtx.createConvolver();
    conv.buffer = createCavernImpulse(audioCtx, 6.2, 2.2);

    const dry = audioCtx.createGain();
    const wet = audioCtx.createGain();
    dry.gain.value = 0.28;
    wet.gain.value = 0.92;

    src.connect(dry);
    src.connect(preDelay);
    preDelay.connect(conv);
    conv.connect(wetFilter);
    wetFilter.connect(wet);
    dry.connect(audioCtx.destination);
    wet.connect(audioCtx.destination);
  }

  const host = document.createElement("div");
  host.id = "ck-radio-bar-host";
  const shadow = host.attachShadow({ mode: "open" });
  shadow.innerHTML = `
    <style>
      :host {
        position: fixed;
        left: 50%;
        bottom: 20px;
        transform: translateX(-50%);
        z-index: 99990;
      }
      .bar {
        display: inline-flex;
        align-items: center;
        gap: 9px;
        height: 28px;
        padding: 0 11px;
        border-radius: 999px;
        background: rgba(6, 7, 5, .88);
        border: 1px solid rgba(187, 255, 41, .35);
        color: #bbff29;
        backdrop-filter: blur(8px);
      }
      .dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: rgba(187, 255, 41, .35);
      }
      .bar.is-live .dot {
        background: #bbff29;
        box-shadow: 0 0 8px #bbff29;
        animation: pulse 1.4s ease-in-out infinite;
      }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
      button {
        appearance: none;
        background: none;
        border: 0;
        color: inherit;
        font: 600 11px/1 ui-monospace, SFMono-Regular, Menlo, monospace;
        padding: 0;
        cursor: pointer;
        display: grid;
        place-items: center;
      }
    </style>
    <div class="bar" id="bar">
      <span class="dot" aria-hidden="true"></span>
      <button type="button" id="toggle" aria-label="Pause or play CIRKULAR Radio">⏸</button>
    </div>
  `;

  const bar = shadow.getElementById("bar");
  const toggleBtn = shadow.getElementById("toggle");

  function render() {
    toggleBtn.textContent = isPlaying ? "⏸" : "▶";
    bar.classList.toggle("is-live", isPlaying);
  }

  async function startStream() {
    initAudio();
    if (audioCtx.state === "suspended") await audioCtx.resume();
    audio.src = `/api/radio?ch=${encodeURIComponent(chId)}&t=${Date.now()}`;
    try {
      await audio.play();
      isPlaying = true;
      localStorage.setItem("ck_radio_playing", "1");
    } catch {
      isPlaying = false;
    }
    render();
  }

  function stopStream() {
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    isPlaying = false;
    localStorage.setItem("ck_radio_playing", "0");
    render();
  }

  toggleBtn.addEventListener("click", () => {
    if (isPlaying) stopStream();
    else startStream();
  });

  document.body.appendChild(host);
  startStream();
})();
