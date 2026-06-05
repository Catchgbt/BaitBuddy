/**
 * Optimized Bite Detector Web Worker
 * Ensures 60fps stability on low-end Android hardware
 * Minimal main-thread interaction, pure computational loop
 */

let state = {
  imageBuffer: null,
  prevBuffer: null,
  procWidth: 0,
  procHeight: 0,
  rect: null,
  roiStats: { n: 0, mean: 0, M2: 0 },
  lastUpdate: 0,
  frameCount: 0,
  dropCount: 0,
};

const STRIDE = 4;
const MIN_FRAME_INTERVAL = 16; // 60fps = 16.67ms

// Welford's algorithm for running statistics (low memory)
function welfordPush(stats, x) {
  stats.n++;
  const d = x - stats.mean;
  stats.mean += d / stats.n;
  const d2 = x - stats.mean;
  stats.M2 += d * d2;
}

function welfordStd(stats) {
  return stats.n > 1 ? Math.sqrt(Math.max(0, stats.M2 / (stats.n - 1))) : 0;
}

// Optimized ROI energy calculation
function computeROIEnergy(imageData, prevData, rect, procWidth, procHeight, roiStats) {
  if (!rect || rect.w < 2 || rect.h < 2) {
    return { energy: 0, zscore: 0 };
  }

  const sx = procWidth / (rect.overlayWidth || procWidth);
  const sy = procHeight / (rect.overlayHeight || procHeight);

  const x = Math.max(0, Math.floor(rect.x * sx));
  const y = Math.max(0, Math.floor(rect.y * sy));
  const w = Math.min(procWidth - x, Math.floor(rect.w * sx));
  const h = Math.min(procHeight - y, Math.floor(rect.h * sy));

  if (w < 2 || h < 2) {
    return { energy: 0, zscore: 0 };
  }

  let sum = 0;
  let count = 0;
  const stride = STRIDE;

  // Only scan ROI region, not entire image
  for (let row = y; row < y + h; row++) {
    for (let col = x; col < x + w; col += stride) {
      const idx = (row * procWidth + col) * 4;
      if (idx < imageData.length) {
        const currValue = imageData[idx]; // Red channel
        const prevValue = prevData[idx] || 0;
        sum += Math.abs(currValue - prevValue);
        prevData[idx] = currValue; // Update in-place
        count++;
      }
    }
  }

  const energy = count > 0 ? sum / count : 0;

  // Update running statistics
  welfordPush(roiStats, energy * 0.05 + roiStats.mean * 0.95);
  const std = welfordStd(roiStats);
  const zscore = std > 1e-6 ? (energy - roiStats.mean) / std : 0;

  return { energy, zscore };
}

// Main frame processor
function processFrame(imageDataBuffer, rect, procWidth, procHeight) {
  const now = performance.now();
  const timeSinceLastFrame = now - state.lastUpdate;

  // Throttle to target FPS (60 = 16.67ms)
  if (timeSinceLastFrame < MIN_FRAME_INTERVAL) {
    state.dropCount++;
    return null; // Drop frame, will process on next call
  }

  state.lastUpdate = now;
  state.frameCount++;

  try {
    const imageData = new Uint8ClampedArray(imageDataBuffer);

    if (!state.prevBuffer || state.prevBuffer.length !== imageData.length) {
      state.prevBuffer = new Uint8ClampedArray(imageData.length);
      state.procWidth = procWidth;
      state.procHeight = procHeight;
    }

    state.rect = rect;

    const { energy, zscore } = computeROIEnergy(
      imageData,
      state.prevBuffer,
      rect,
      procWidth,
      procHeight,
      state.roiStats
    );

    return {
      energy,
      z: zscore,
      mean: state.roiStats.mean.toFixed(2),
      std: welfordStd(state.roiStats).toFixed(2),
      frameCount: state.frameCount,
      droppedFrames: state.dropCount,
      fps: (1000 / Math.max(1, timeSinceLastFrame)).toFixed(1),
    };
  } catch (e) {
    console.error('[BiteWorker] Processing error:', e);
    return null;
  }
}

// Message handler
self.onmessage = (event) => {
  const { command, payload } = event.data;

  switch (command) {
    case 'init':
      // Reset state
      state = {
        imageBuffer: null,
        prevBuffer: null,
        procWidth: 0,
        procHeight: 0,
        rect: null,
        roiStats: { n: 0, mean: 0, M2: 0 },
        lastUpdate: 0,
        frameCount: 0,
        dropCount: 0,
      };
      self.postMessage({ type: 'initialized' });
      break;

    case 'processFrame':
      try {
        const result = processFrame(
          payload.imageData,
          payload.rect,
          payload.procWidth,
          payload.procHeight
        );

        if (result) {
          self.postMessage({
            type: 'frameProcessed',
            result,
            timestamp: performance.now(),
          });
        }
      } catch (e) {
        self.postMessage({
          type: 'error',
          error: e.message,
        });
      }
      break;

    case 'getStats':
      self.postMessage({
        type: 'stats',
        data: {
          frameCount: state.frameCount,
          droppedFrames: state.dropCount,
          mean: state.roiStats.mean.toFixed(2),
          std: welfordStd(state.roiStats).toFixed(2),
        },
      });
      break;

    default:
      console.warn('[BiteWorker] Unknown command:', command);
  }
};
