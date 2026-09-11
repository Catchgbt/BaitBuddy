// Echogramm-Rendering fuer den Device Hub (castable Echolote).
// Aus src/components/devices/DeviceHub.jsx extrahiert: der Renderer haengt
// nur an einem Canvas-2D-Kontext, nicht an React — dadurch getrennt
// testbar (siehe echogram.test.js) und aus der Komponente heraushaltbar.

// Maximal dargestellte Wassertiefe in Metern (Skala der Y-Achse).
export const DEPTH_MAX_METERS = 50;

// Echogram Canvas Renderer
export class EchogramRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });
    this.width = canvas.width;
    this.height = canvas.height;
    this.columnIndex = 0;
    this.depthMaxMeters = DEPTH_MAX_METERS;
    this.palette = this.generatePalette();
  }

  generatePalette() {
    const palette = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) {
      let r = 0, g = 0, b = 0;
      const t = i / 255;
      
      if (t < 0.2) {
        b = Math.round(255 * (t / 0.2));
      } else if (t < 0.4) {
        b = 255;
        g = Math.round(255 * ((t - 0.2) / 0.2));
      } else if (t < 0.6) {
        g = 255;
        b = Math.round(255 * (1 - (t - 0.4) / 0.2));
      } else if (t < 0.8) {
        g = 255;
        r = Math.round(255 * ((t - 0.6) / 0.2));
      } else {
        r = 255;
        g = Math.round(255 * (1 - (t - 0.8) / 0.2));
      }
      
      palette[i * 4] = r;
      palette[i * 4 + 1] = g;
      palette[i * 4 + 2] = b;
      palette[i * 4 + 3] = 255;
    }
    return palette;
  }

  pushPing({ intensities, depth_m, temp_c }) {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;
    const column = new Uint8Array(this.height);

    if (Array.isArray(intensities) && intensities.length > 0) {
      for (let y = 0; y < this.height; y++) {
        const idx = Math.floor((y * intensities.length) / this.height);
        column[y] = intensities[idx] & 0xff;
      }
    } else {
      const depthPixel = depth_m 
        ? Math.min(this.height - 1, Math.max(0, Math.round((depth_m / this.depthMaxMeters) * this.height)))
        : Math.round(this.height * 0.6);
      
      for (let y = 0; y < this.height; y++) {
        const distance = Math.abs(y - depthPixel);
        column[y] = Math.max(0, 255 - distance * 12);
      }
    }

    for (let y = 0; y < this.height; y++) {
      const pixelIndex = (y * this.width + this.columnIndex) * 4;
      const colorValue = column[y];
      data[pixelIndex] = this.palette[colorValue * 4];
      data[pixelIndex + 1] = this.palette[colorValue * 4 + 1];
      data[pixelIndex + 2] = this.palette[colorValue * 4 + 2];
      data[pixelIndex + 3] = 255;
    }

    this.columnIndex = (this.columnIndex + 1) % this.width;
    this.ctx.putImageData(imageData, 0, 0);
    
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    this.ctx.fillRect(this.columnIndex, 0, 1, this.height);

    return { depth_m, temp_c };
  }
}

export function synthesizeIntensities(height, depth_m) {
  const intensities = new Array(height);
  const depthPixel = depth_m 
    ? Math.min(height - 1, Math.max(0, Math.round((depth_m / DEPTH_MAX_METERS) * height)))
    : Math.round(height * 0.6);
  
  for (let y = 0; y < height; y++) {
    const distance = Math.abs(y - depthPixel);
    let value = 255 - distance * 10;
    if (value < 0) value = 0;
    if (value > 255) value = 255;
    intensities[y] = value;
  }
  return intensities;
}
