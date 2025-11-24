(() => {
  const jaElements = document.querySelectorAll('.lang-ja');
  const enElements = document.querySelectorAll('.lang-en');
  const langJpButton = document.getElementById('lang_jp_btn');
  const langEnButton = document.getElementById('lang_en_btn');

  const bpmText = document.getElementById('bpm-text');
  const countText = document.getElementById('count-txt');
  const logsEl = document.getElementById('logs');
  const tapButton = document.getElementById('tap');
  const resetButton = document.getElementById('reset');

  let firstTapTime = null;
  let tapCount = 0;
  let bpm = null;
  let logMessage = '';
  const tapTimes = [];
  const MIN_TAPS_FOR_ESTIMATE = 8;
  const MAX_INTERVAL_MS = 2000;
  const MIN_INTERVAL_MS = 150;
  const MAX_WINDOW = 64;

  const setLanguage = (lang) => {
    const isEnglish = lang === 'en';
    jaElements.forEach((el) => { el.style.display = isEnglish ? 'none' : 'inline-block'; });
    enElements.forEach((el) => { el.style.display = isEnglish ? 'inline-block' : 'none'; });
    document.documentElement.lang = isEnglish ? 'en' : 'ja';
    langEnButton.classList.toggle('active', isEnglish);
    langJpButton.classList.toggle('active', !isEnglish);
  };

  const formatBpm = (value) => {
    const [integer, fraction] = value.toFixed(2).split('.');
    return `${integer}<span class="fraction">.${fraction}</span>`;
  };

  const median = (values) => {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const regressSlope = (xs, ys, weights) => {
    const n = xs.length;
    if (n < 2) return 0;
    const weightSum = weights ? weights.reduce((sum, w) => sum + w, 0) : n;
    const meanX = xs.reduce((sum, v, idx) => sum + v * (weights ? weights[idx] : 1), 0) / weightSum;
    const meanY = ys.reduce((sum, v, idx) => sum + v * (weights ? weights[idx] : 1), 0) / weightSum;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i += 1) {
      const w = weights ? weights[i] : 1;
      const dx = xs[i] - meanX;
      num += w * dx * (ys[i] - meanY);
      den += w * dx * dx;
    }
    return den === 0 ? 0 : num / den;
  };

  const fitLine = (xs, ys) => {
    const initialSlope = regressSlope(xs, ys);
    if (initialSlope === 0) return { slope: 0, r2: 0 };
    const residuals = ys.map((y, idx) => y - (ys[0] + initialSlope * idx));
    const med = median(residuals);
    const mad = median(residuals.map((r) => Math.abs(r - med))) || 0;
    const threshold = mad ? 3 * mad : Infinity;
    const weights = residuals.map((r) => {
      const dist = Math.abs(r - med);
      if (dist > threshold) return 0;
      const scale = mad || 1;
      return 1 / (1 + (dist / (3 * scale)) ** 2);
    });
    const slope = regressSlope(xs, ys, weights) || initialSlope;

    const yMean = ys.reduce((sum, v) => sum + v, 0) / ys.length;
    let ssTot = 0;
    let ssRes = 0;
    for (let i = 0; i < ys.length; i += 1) {
      const yHat = ys[0] + slope * i;
      ssRes += (ys[i] - yHat) ** 2;
      ssTot += (ys[i] - yMean) ** 2;
    }
    const r2 = ssTot === 0 ? 0 : 1 - (ssRes / ssTot);
    return { slope, r2, mad };
  };

  const computeBpm = () => {
    const count = tapTimes.length;
    if (count < 2) return null;
    const windowedTimes = tapTimes.slice(-MAX_WINDOW);
    const xs = windowedTimes.map((_, idx) => idx);
    const { slope, r2, mad } = fitLine(xs, windowedTimes);
    if (!slope) return null;
    if (r2 < 0.9 && mad) {
      const residuals = windowedTimes.map((t, idx) => t - (windowedTimes[0] + slope * idx));
      const med = median(residuals);
      const strictXs = [];
      const strictYs = [];
      for (let i = 0; i < residuals.length; i += 1) {
        if (Math.abs(residuals[i] - med) <= 2 * mad) {
          strictXs.push(xs[i]);
          strictYs.push(windowedTimes[i]);
        }
      }
      const refinedSlope = regressSlope(strictXs, strictYs) || slope;
      return refinedSlope ? 60 / refinedSlope : 60 / slope;
    }
    return 60 / slope;
  };

  const handleTap = (event) => {
    event.preventDefault();
    const curTapTime = performance.now() / 1000;
    const lastTap = tapTimes[tapTimes.length - 1];
    if (lastTap) {
      const intervalMs = (curTapTime - lastTap) * 1000;
      if (intervalMs < MIN_INTERVAL_MS || intervalMs > MAX_INTERVAL_MS) {
        logMessage = 'Ignored tap (interval out of range)';
        logsEl.insertBefore(Object.assign(document.createElement('div'), { textContent: logMessage }), logsEl.firstChild);
        return;
      }
    }

    tapCount += 1;
    tapTimes.push(curTapTime);

    if (tapCount === 1) {
      firstTapTime = curTapTime;
      bpm = 0;
      logMessage = '### START ###';
    } else {
      bpm = computeBpm();
      const totalInterval = curTapTime - firstTapTime;
      const bpmText = bpm ? bpm.toFixed(10) : 'NaN';
      const provisional = tapCount < MIN_TAPS_FOR_ESTIMATE ? ' (provisional)' : '';
      logMessage = `BPM = ${bpmText}${provisional}, total time = ${totalInterval.toFixed(10)}`;
    }

    if (tapCount > 1 && bpm) {
      bpmText.innerHTML = formatBpm(bpm);
    } else {
      bpmText.textContent = '###';
    }
    countText.textContent = tapCount;

    const newLog = document.createElement('div');
    newLog.textContent = logMessage;
    logsEl.insertBefore(newLog, logsEl.firstChild);
  };

  const reset = () => {
    firstTapTime = null;
    tapCount = 0;
    bpm = null;
    logMessage = '';
    tapTimes.length = 0;
    bpmText.textContent = '###';
    countText.textContent = '###';
    logsEl.textContent = '';
  };

  const handleKeyPress = (event) => {
    const key = event.key.toLowerCase();
    if (event.key === ' ' || event.key === 'Enter') {
      handleTap(event);
    }
    if (key === 'c' || key === 'r' || event.key === 'Escape' || event.key === 'Backspace') {
      reset();
    }
  };

  langJpButton.addEventListener('click', () => setLanguage('ja'));
  langEnButton.addEventListener('click', () => setLanguage('en'));
  tapButton.addEventListener('click', handleTap);
  resetButton.addEventListener('click', reset);
  document.addEventListener('keydown', handleKeyPress);
})();
