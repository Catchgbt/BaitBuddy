// Web Worker for offloading photo analysis from main thread
// Handles image processing, feature extraction, and AI preparation without blocking UI

self.onmessage = async (event) => {
  const { command, payload } = event.data;

  switch (command) {
    case 'analyzeImage':
      await handleImageAnalysis(payload);
      break;
    case 'processFrame':
      await handleFrameProcessing(payload);
      break;
    case 'extractFeatures':
      await handleFeatureExtraction(payload);
      break;
    default:
      self.postMessage({ type: 'error', error: `Unknown command: ${command}` });
  }
};

async function handleImageAnalysis(payload) {
  const { imageData, width, height } = payload;

  try {
    // Convert imageData to canvas for processing
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const imageDataObj = new ImageData(imageData, width, height);
    ctx.putImageData(imageDataObj, 0, 0);

    // Extract image metadata without blocking main thread
    const metadata = {
      width,
      height,
      brightness: calculateBrightness(imageData),
      contrast: calculateContrast(imageData),
      sharpness: calculateSharpness(imageData),
      colorBalance: calculateColorBalance(imageData),
      histogram: generateHistogram(imageData)
    };

    // Apply basic filters for preprocessing
    const processed = canvas.convertToBlob().then(blob => {
      return { metadata, blobSize: blob.size };
    });

    const result = await processed;
    self.postMessage({
      type: 'analysisComplete',
      data: {
        metadata: result.metadata,
        blobSize: result.blobSize,
        ready: true
      }
    });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}

async function handleFrameProcessing(payload) {
  const { frameData, options } = payload;

  try {
    // Lightweight frame processing for real-time analysis
    const processed = {
      edges: detectEdges(frameData, options),
      motion: estimateMotion(frameData, options),
      focus: estimateFocusQuality(frameData, options)
    };

    self.postMessage({
      type: 'frameProcessed',
      data: processed
    });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}

async function handleFeatureExtraction(payload) {
  const { imageData, width, height, models } = payload;

  try {
    // Extract features for AI model input
    const features = {
      color: extractColorFeatures(imageData),
      texture: extractTextureFeatures(imageData, width, height),
      shape: extractShapeFeatures(imageData, width, height),
      spatial: extractSpatialFeatures(imageData, width, height)
    };

    self.postMessage({
      type: 'featuresExtracted',
      data: features
    });
  } catch (error) {
    self.postMessage({ type: 'error', error: error.message });
  }
}

// Utility functions for image processing

function calculateBrightness(imageData) {
  let sum = 0;
  const data = imageData;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    sum += (data[i] + data[i + 1] + data[i + 2]) / 3;
  }
  return sum / (data.length / stride);
}

function calculateContrast(imageData) {
  const brightness = calculateBrightness(imageData);
  let sumSquaredDiff = 0;
  const data = imageData;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    const pixelBrightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    sumSquaredDiff += Math.pow(pixelBrightness - brightness, 2);
  }

  return Math.sqrt(sumSquaredDiff / (data.length / stride));
}

function calculateSharpness(imageData) {
  const data = imageData;
  let edgeCount = 0;
  const stride = 4;
  const width = Math.sqrt(data.length / stride);

  for (let i = stride; i < data.length - stride; i += stride) {
    const current = data[i];
    const neighbor = data[i + stride];
    if (Math.abs(current - neighbor) > 30) {
      edgeCount++;
    }
  }

  return (edgeCount / (data.length / stride)) * 100;
}

function calculateColorBalance(imageData) {
  const data = imageData;
  let r = 0, g = 0, b = 0;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
  }

  const count = data.length / stride;
  return {
    red: r / count,
    green: g / count,
    blue: b / count
  };
}

function generateHistogram(imageData) {
  const histogram = new Array(256).fill(0);
  const data = imageData;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    const brightness = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
    histogram[brightness]++;
  }

  return histogram;
}

function detectEdges(frameData, options) {
  // Simplified Sobel operator for edge detection
  const { threshold = 50 } = options;
  let edgePixels = 0;

  // Sample-based edge detection to avoid main-thread blocking
  for (let i = 0; i < frameData.length; i += 100) {
    if (frameData[i] > threshold) {
      edgePixels++;
    }
  }

  return {
    detected: edgePixels > 0,
    intensity: edgePixels / (frameData.length / 100)
  };
}

function estimateMotion(frameData, options) {
  const { previousFrame, sensitivity = 20 } = options;

  if (!previousFrame) {
    return { detected: false, intensity: 0 };
  }

  let differences = 0;
  const sampleSize = frameData.length / 100;

  for (let i = 0; i < frameData.length; i += 100) {
    if (Math.abs(frameData[i] - previousFrame[i]) > sensitivity) {
      differences++;
    }
  }

  return {
    detected: differences > 5,
    intensity: differences / sampleSize
  };
}

function estimateFocusQuality(frameData, options) {
  // Calculate Laplacian variance for focus quality
  const sharpness = calculateSharpness(frameData);
  return {
    quality: Math.min(sharpness, 100),
    inFocus: sharpness > 10
  };
}

function extractColorFeatures(imageData) {
  const colors = new Map();
  const data = imageData;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride * 10) {
    const key = `${data[i]}_${data[i + 1]}_${data[i + 2]}`;
    colors.set(key, (colors.get(key) || 0) + 1);
  }

  const dominantColors = Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([color, count]) => ({ color, frequency: count }));

  return { dominantColors, distribution: Array.from(colors.values()) };
}

function extractTextureFeatures(imageData, width, height) {
  // Calculate texture descriptors
  let variance = 0;
  const data = imageData;
  const mean = calculateBrightness(imageData);
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    variance += Math.pow(brightness - mean, 2);
  }

  variance = Math.sqrt(variance / (data.length / stride));

  return {
    roughness: Math.min(variance / 128, 1),
    uniformity: 1 - Math.min(variance / 128, 1),
    patterns: detectPatterns(imageData, width, height)
  };
}

function extractShapeFeatures(imageData, width, height) {
  // Detect prominent shapes and contours
  const contours = detectContours(imageData, width, height);

  return {
    contourCount: contours.length,
    dominantShape: contours.length > 0 ? 'detected' : 'none',
    complexity: contours.length / (width * height) * 1000
  };
}

function extractSpatialFeatures(imageData, width, height) {
  // Analyze spatial distribution
  const quadrants = [0, 0, 0, 0];
  const data = imageData;
  const stride = 4;
  const centerX = width / 2;
  const centerY = height / 2;

  for (let i = 0; i < data.length; i += stride) {
    const pixelIndex = i / stride;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;

    const quadrant = (x < centerX ? 0 : 1) + (y < centerY ? 0 : 2);
    quadrants[quadrant] += brightness;
  }

  return {
    quadrants,
    centerMass: calculateCenterOfMass(imageData, width, height),
    distribution: 'uniform'
  };
}

function detectPatterns(imageData, width, height) {
  // Simple pattern detection based on local variation
  let patternIntensity = 0;
  const stride = 4;
  const blockSize = 16;

  for (let by = 0; by < height; by += blockSize) {
    for (let bx = 0; bx < width; bx += blockSize) {
      let variance = 0;
      for (let dy = 0; dy < blockSize; dy++) {
        for (let dx = 0; dx < blockSize; dx++) {
          const idx = ((by + dy) * width + (bx + dx)) * stride;
          const brightness = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
          variance += Math.pow(brightness, 2);
        }
      }
      if (variance > 1000) patternIntensity++;
    }
  }

  return patternIntensity / ((width / blockSize) * (height / blockSize));
}

function detectContours(imageData, width, height) {
  // Simplified contour detection
  const contours = [];
  const data = imageData;
  const stride = 4;

  for (let i = stride * width; i < data.length - stride * width; i += stride) {
    const current = data[i];
    const adjacent = Math.abs(data[i - stride] - current);
    if (adjacent > 50) {
      contours.push({ position: i / stride, intensity: adjacent });
    }
  }

  return contours;
}

function calculateCenterOfMass(imageData, width, height) {
  let sumX = 0, sumY = 0, totalBrightness = 0;
  const data = imageData;
  const stride = 4;

  for (let i = 0; i < data.length; i += stride) {
    const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
    const pixelIndex = i / stride;
    const x = pixelIndex % width;
    const y = Math.floor(pixelIndex / width);

    sumX += x * brightness;
    sumY += y * brightness;
    totalBrightness += brightness;
  }

  return {
    x: totalBrightness > 0 ? sumX / totalBrightness : width / 2,
    y: totalBrightness > 0 ? sumY / totalBrightness : height / 2
  };
}