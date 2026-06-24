self.onmessage = function(event) {
  const { command, payload } = event.data;

  switch (command) {
    case 'processFrame':
      processFrame(payload);
      break;
    case 'init':
      init(payload);
      break;
    default:
      console.warn('Unknown worker command:', command);
  }
};

let state = {
  prev: null,
  n: 0,
  mean: 0,
  M2: 0,
  above: 0
};

const STRIDE = 4;

function init(config) {
  if (config.reset) {
    state = {
      prev: null,
      n: 0,
      mean: 0,
      M2: 0,
      above: 0
    };
  }
}

function welfordPush(st, x) {
  st.n++;
  const d = x - st.mean;
  st.mean += d / st.n;
  const d2 = x - st.mean;
  st.M2 += d * d2;
}

function welfordStd(st) {
  return st.n > 1 ? Math.sqrt(Math.max(0, st.M2 / (st.n - 1))) : 0;
}

function processFrame(payload) {
  const { imageData, rect, procWidth, procHeight } = payload;
  
  if (!rect || !imageData) {
    self.postMessage({
      type: 'frameProcessed',
      result: { e: 0, z: 0 }
    });
    return;
  }

  const data = new Uint8ClampedArray(imageData);
  
  const sx = procWidth / (rect.overlayWidth || 1);
  const sy = procHeight / (rect.overlayHeight || 1);
  
  const r = {
    x: Math.max(0, Math.floor(rect.x * sx)),
    y: Math.max(0, Math.floor(rect.y * sy)),
    w: Math.max(1, Math.floor(rect.w * sx)),
    h: Math.max(1, Math.floor(rect.h * sy))
  };

  let sum = 0;
  let count = 0;

  if (!state.prev || state.prev.length !== data.length) {
    state.prev = new Uint8ClampedArray(data.length);
  }

  for (let i = 0; i < data.length; i += 4 * STRIDE) {
    const y = data[i];
    const py = state.prev[i];
    sum += Math.abs(y - py);
    state.prev[i] = y;
    count++;
  }

  const e = sum / Math.max(1, count);
  const s = welfordStd(state);
  const z = s > 1e-6 ? (e - state.mean) / s : 0;

  welfordPush(state, e * 0.05 + state.mean * 0.95);

  self.postMessage({
    type: 'frameProcessed',
    result: { e, z, mean: state.mean, stdDev: s }
  });
}

self.postMessage({ type: 'ready' });
