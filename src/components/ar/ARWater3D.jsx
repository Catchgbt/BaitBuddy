import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { motion } from 'framer-motion'; // Added motion import
import ARTutorial from './ARTutorial'; // Added ARTutorial import

// Simplified OrbitControls (inline implementation)
class SimpleOrbitControls {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3();
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.maxDistance = 1000;
    
    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.0;
    
    this._state = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    this._currentState = this._state.NONE;
    
    this._rotateStart = new THREE.Vector2();
    this._rotateEnd = new THREE.Vector2();
    this._rotateDelta = new THREE.Vector2();
    
    this._zoomStart = new THREE.Vector2();
    this._zoomEnd = new THREE.Vector2();
    this._zoomDelta = new THREE.Vector2();
    
    this._spherical = new THREE.Spherical();
    this._sphericalDelta = new THREE.Spherical();
    
    this._scale = 1;
    this._offset = new THREE.Vector3();
    
    this._bindEvents();
  }
  
  _bindEvents() {
    this.domElement.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    this.domElement.addEventListener('pointermove', (e) => this._onPointerMove(e));
    this.domElement.addEventListener('pointerup', () => this._onPointerUp());
    this.domElement.addEventListener('wheel', (e) => this._onWheel(e));
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  
  _onPointerDown(e) {
    if (!this.enabled) return;
    
    if (e.pointerType === 'touch' && e.touches && e.touches.length > 1) {
      this._currentState = this._state.ZOOM;
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      this._zoomStart.set(0, Math.sqrt(dx * dx + dy * dy));
    } else {
      this._currentState = this._state.ROTATE;
      this._rotateStart.set(e.clientX, e.clientY);
    }
  }
  
  _onPointerMove(e) {
    if (!this.enabled || this._currentState === this._state.NONE) return;
    
    if (this._currentState === this._state.ROTATE) {
      this._rotateEnd.set(e.clientX, e.clientY);
      this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);
      
      this._sphericalDelta.theta -= 2 * Math.PI * this._rotateDelta.x / this.domElement.clientHeight;
      this._sphericalDelta.phi -= 2 * Math.PI * this._rotateDelta.y / this.domElement.clientHeight;
      
      this._rotateStart.copy(this._rotateEnd);
    } else if (this._currentState === this._state.ZOOM && e.touches && e.touches.length > 1) {
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      this._zoomEnd.set(0, Math.sqrt(dx * dx + dy * dy));
      this._zoomDelta.set(0, Math.pow(this._zoomEnd.y / this._zoomStart.y, this.zoomSpeed));
      this._scale /= this._zoomDelta.y;
      this._zoomStart.copy(this._zoomEnd);
    }
  }
  
  _onPointerUp() {
    this._currentState = this._state.NONE;
  }
  
  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();
    
    if (e.deltaY < 0) {
      this._scale /= 0.95;
    } else if (e.deltaY > 0) {
      this._scale *= 0.95;
    }
  }
  
  update() {
    if (!this.enabled) return;
    
    this._offset.copy(this.camera.position).sub(this.target);
    this._spherical.setFromVector3(this._offset);
    
    if (this.enableDamping) {
      this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor;
      this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor;
      this._sphericalDelta.theta *= (1 - this.dampingFactor);
      this._sphericalDelta.phi *= (1 - this.dampingFactor);
    } else {
      this._spherical.theta += this._sphericalDelta.theta;
      this._spherical.phi += this._sphericalDelta.phi;
      this._sphericalDelta.set(0, 0, 0);
    }
    
    this._spherical.radius *= this._scale;
    this._spherical.radius = Math.max(10, Math.min(this.maxDistance, this._spherical.radius));
    
    if (this.enableDamping) {
      this._scale = 1 + (this._scale - 1) * (1 - this.dampingFactor);
    } else {
      this._scale = 1;
    }
    
    this._spherical.makeSafe();
    this._offset.setFromSpherical(this._spherical);
    this.camera.position.copy(this.target).add(this._offset);
    this.camera.lookAt(this.target);
  }
  
  dispose() {
    this.enabled = false;
  }
}

// ========== SENSOR-FUSION ==========
class SensorFusion {
  constructor() {
    this.pos = { lat: 0, lon: 0, alt: 0 };
    this.orientation = { alpha: 0, beta: 0, gamma: 0 };
    this.heading = 0;
    this.onUpdate = null;
    this.alpha = 0.15;
    this.headingFilter = 0.1;
    this._geoWatchId = null;
    this._boundOrientation = this._onOrientation.bind(this);
  }

  start() {
    if ('geolocation' in navigator) {
      this._geoWatchId = navigator.geolocation.watchPosition(
        (p) => {
          const nlat = p.coords.latitude;
          const nlon = p.coords.longitude;
          const nalt = p.coords.altitude || 0;
          this.pos.lat = this.pos.lat === 0 ? nlat : this.pos.lat + (nlat - this.pos.lat) * this.alpha;
          this.pos.lon = this.pos.lon === 0 ? nlon : this.pos.lon + (nlon - this.pos.lon) * this.alpha;
          this.pos.alt = this.pos.alt === 0 ? nalt : this.pos.alt + (nalt - this.pos.alt) * this.alpha;
          this._emit();
        },
        (err) => console.warn('geo watch error', err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    const evtName = 'deviceorientationabsolute' in window ? 'deviceorientationabsolute' : 'deviceorientation';
    window.addEventListener(evtName, this._boundOrientation, true);
  }

  stop() {
    if (this._geoWatchId !== null) navigator.geolocation.clearWatch(this._geoWatchId);
    window.removeEventListener('deviceorientation', this._boundOrientation);
  }

  _onOrientation(e) {
    if (e.absolute === true || e.alpha !== null) {
      const a = e.alpha || 0;
      const b = e.beta || 0;
      const g = e.gamma || 0;
      this.orientation.alpha = this.orientation.alpha + (a - this.orientation.alpha) * this.headingFilter;
      this.orientation.beta = this.orientation.beta + (b - this.orientation.beta) * this.headingFilter;
      this.orientation.gamma = this.orientation.gamma + (g - this.orientation.gamma) * this.headingFilter;
      this.heading = this.heading === 0 ? a : this.heading + (a - this.heading) * this.headingFilter;
      this._emit();
    }
  }

  _emit() {
    if (this.onUpdate) {
      this.onUpdate({
        pos: { ...this.pos },
        orientation: { ...this.orientation },
        heading: this.heading
      });
    }
  }
}

// ========== TILE UTILITIES ==========
function latLonToTile(lat, lon, zoom) {
  const latRad = (lat * Math.PI) / 180;
  const n = Math.pow(2, zoom);
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y };
}

async function fetchTileImage(url) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = (e) => rej(e);
    img.src = url;
  });
}

async function tileToHeightGrid(img, size = 256, decodeFn = null) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const d = ctx.getImageData(0, 0, size, size).data;
  const grid = new Float32Array(size * size);
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      let val = 0;
      if (decodeFn) val = decodeFn(r, g, b);
      else val = (r + g + b) / (3 * 255) * 100;
      grid[y * size + x] = val;
    }
  }
  return { grid, size };
}

async function stitchTiles(centerX, centerY, zoom, radius, decodeFn, proxyFn) {
  const tileSize = 256;
  const gridSize = (2 * radius + 1);
  const stitchedSize = gridSize * tileSize;
  const stitchedGrid = new Float32Array(stitchedSize * stitchedSize);
  
  let loadedCount = 0;
  const totalTiles = gridSize * gridSize;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const tx = centerX + dx;
      const ty = centerY + dy;
      
      try {
        const tileUrl = await proxyFn(zoom, tx, ty);
        const img = await fetchTileImage(tileUrl);
        const { grid } = await tileToHeightGrid(img, tileSize, decodeFn);
        
        const offsetX = (dx + radius) * tileSize;
        const offsetY = (dy + radius) * tileSize;
        
        for (let y = 0; y < tileSize; y++) {
          for (let x = 0; x < tileSize; x++) {
            const srcIdx = y * tileSize + x;
            const dstIdx = (offsetY + y) * stitchedSize + (offsetX + x);
            stitchedGrid[dstIdx] = grid[srcIdx];
          }
        }
        
        loadedCount++;
      } catch (error) {
        console.warn(`Failed to load tile ${tx},${ty}:`, error);
        const offsetX = (dx + radius) * tileSize;
        const offsetY = (dy + radius) * tileSize;
        for (let y = 0; y < tileSize; y++) {
          for (let x = 0; x < tileSize; x++) {
            const dstIdx = (offsetY + y) * stitchedSize + (offsetX + x);
            stitchedGrid[dstIdx] = 0;
          }
        }
      }
    }
  }

  return {
    grid: stitchedGrid,
    size: stitchedSize,
    loadedCount,
    totalTiles
  };
}

function gridToPlaneGeometry(gridObj, widthMeters, heightMeters, heightScale = 1.0) {
  const { grid, size } = gridObj;
  const geom = new THREE.PlaneGeometry(widthMeters, heightMeters, size - 1, size - 1);
  const pos = geom.attributes.position;
  
  const depths = new Float32Array(pos.count);
  
  for (let i = 0; i < pos.count; i++) {
    const gx = i % size;
    const gy = Math.floor(i / size);
    const h = grid[gy * size + gx];
    pos.setZ(i, -h * heightScale);
    depths[i] = h;
  }
  
  geom.setAttribute('depth', new THREE.BufferAttribute(depths, 1));
  pos.needsUpdate = true;
  geom.computeVertexNormals();
  return geom;
}

// ========== SHADER HEATMAP ==========
const depthHeatmapShader = {
  uniforms: {
    u_time: { value: 0 },
    u_minDepth: { value: 0 },
    u_maxDepth: { value: 100 },
    u_opacity: { value: 0.8 }
  },
  vertexShader: `
    attribute float depth;
    varying float vDepth;
    varying vec3 vNormal;
    
    void main() {
      vDepth = depth;
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float u_time;
    uniform float u_minDepth;
    uniform float u_maxDepth;
    uniform float u_opacity;
    
    varying float vDepth;
    varying vec3 vNormal;
    
    vec3 hueToRgb(float h) {
      float r = abs(h * 6.0 - 3.0) - 1.0;
      float g = 2.0 - abs(h * 6.0 - 2.0);
      float b = 2.0 - abs(h * 6.0 - 4.0);
      return clamp(vec3(r, g, b), 0.0, 1.0);
    }
    
    void main() {
      float normalizedDepth = (vDepth - u_minDepth) / (u_maxDepth - u_minDepth);
      normalizedDepth = clamp(normalizedDepth, 0.0, 1.0);
      
      float hue = normalizedDepth * 0.7 + sin(u_time * 0.5 + normalizedDepth * 3.14) * 0.05;
      vec3 color = hueToRgb(hue);
      
      vec3 lightDir = normalize(vec3(0.5, 1.0, 0.3));
      float diff = max(dot(vNormal, lightDir), 0.3);
      color *= diff;
      
      color *= (1.0 - normalizedDepth * 0.3);
      
      gl_FragColor = vec4(color, u_opacity);
    }
  `
};

// ========== TILE LOD MANAGER ==========
class TileLODManager {
  constructor(scene, proxyFn, decodeFn) {
    this.scene = scene;
    this.proxyFn = proxyFn;
    this.decodeFn = decodeFn;
    this.meshes = { near: null, mid: null, far: null };
    this.currentPos = { lat: 0, lon: 0 };
    this.zoomNear = 14;
    this.zoomMid = 12;
    this.zoomFar = 10;
    this.radiusNear = 1;
    this.radiusMid = 2;
    this.radiusFar = 3;
    this.heightScale = 0.5;
    this.isLoading = false;
  }

  async updateForLatLon(lat, lon, onProgress) {
    if (this.isLoading) return;
    
    const distMoved = Math.sqrt(
      Math.pow(lat - this.currentPos.lat, 2) + 
      Math.pow(lon - this.currentPos.lon, 2)
    );
    
    if (distMoved < 0.001 && this.meshes.near) return;
    
    this.currentPos = { lat, lon };
    this.isLoading = true;
    
    try {
      Object.values(this.meshes).forEach(m => {
        if (m) this.scene.remove(m);
      });
      
      if (onProgress) onProgress('Lade hohe Auflösung...');
      const { x: xNear, y: yNear } = latLonToTile(lat, lon, this.zoomNear);
      const nearGrid = await stitchTiles(
        xNear, yNear, this.zoomNear, this.radiusNear, this.decodeFn, this.proxyFn
      );
      
      const nearMeters = this._approxMetersPerTile(lat, this.zoomNear) * (2 * this.radiusNear + 1);
      const nearGeom = gridToPlaneGeometry(nearGrid, nearMeters, nearMeters, this.heightScale);
      nearGeom.rotateX(-Math.PI / 2);
      
      const nearMat = new THREE.ShaderMaterial({
        ...depthHeatmapShader,
        transparent: true,
        side: THREE.DoubleSide
      });
      nearMat.uniforms.u_maxDepth.value = 100;
      
      this.meshes.near = new THREE.Mesh(nearGeom, nearMat);
      this.meshes.near.position.y = -5;
      this.scene.add(this.meshes.near);
      
      if (onProgress) onProgress('Lade mittlere Auflösung...');
      const { x: xMid, y: yMid } = latLonToTile(lat, lon, this.zoomMid);
      const midGrid = await stitchTiles(
        xMid, yMid, this.zoomMid, this.radiusMid, this.decodeFn, this.proxyFn
      );
      
      const midMeters = this._approxMetersPerTile(lat, this.zoomMid) * (2 * this.radiusMid + 1);
      const midGeom = gridToPlaneGeometry(midGrid, midMeters, midMeters, this.heightScale * 0.8);
      midGeom.rotateX(-Math.PI / 2);
      
      const midMat = new THREE.ShaderMaterial({
        ...depthHeatmapShader,
        transparent: true,
        side: THREE.DoubleSide
      });
      midMat.uniforms.u_maxDepth.value = 100;
      midMat.uniforms.u_opacity.value = 0.5;
      
      this.meshes.mid = new THREE.Mesh(midGeom, midMat);
      this.meshes.mid.position.y = -10;
      this.scene.add(this.meshes.mid);
      
      if (onProgress) onProgress('Lade Übersicht...');
      const { x: xFar, y: yFar } = latLonToTile(lat, lon, this.zoomFar);
      const farGrid = await stitchTiles(
        xFar, yFar, this.zoomFar, this.radiusFar, this.decodeFn, this.proxyFn
      );
      
      const farMeters = this._approxMetersPerTile(lat, this.zoomFar) * (2 * this.radiusFar + 1);
      const farGeom = gridToPlaneGeometry(farGrid, farMeters, farMeters, this.heightScale * 0.6);
      farGeom.rotateX(-Math.PI / 2);
      
      const farMat = new THREE.ShaderMaterial({
        ...depthHeatmapShader,
        transparent: true,
        side: THREE.DoubleSide
      });
      farMat.uniforms.u_maxDepth.value = 100;
      farMat.uniforms.u_opacity.value = 0.3;
      
      this.meshes.far = new THREE.Mesh(farGeom, farMat);
      this.meshes.far.position.y = -15;
      this.scene.add(this.meshes.far);
      
      if (onProgress) onProgress('Bathymetrie geladen!');
    } catch (error) {
      console.error('LOD loading error:', error);
      if (onProgress) onProgress('Fehler: ' + error.message);
    } finally {
      this.isLoading = false;
    }
  }

  updateShaderTime(time) {
    Object.values(this.meshes).forEach(m => {
      if (m && m.material.uniforms) {
        m.material.uniforms.u_time.value = time;
      }
    });
  }

  setHeightScale(scale) {
    this.heightScale = scale;
  }

  _approxMetersPerTile(lat, zoom) {
    const earthCircumference = 40075000;
    const latRad = (lat * Math.PI) / 180;
    return (earthCircumference * Math.cos(latRad)) / Math.pow(2, zoom);
  }

  dispose() {
    Object.values(this.meshes).forEach(m => {
      if (m) {
        this.scene.remove(m);
        if (m.geometry) m.geometry.dispose();
        if (m.material) m.material.dispose();
      }
    });
  }
}

// ========== MAIN COMPONENT ==========
export default function ARWater3D() {
  const mountRef = useRef(null);
  const [status, setStatus] = useState('Initialisiere...');
  const [cameraActive, setCameraActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [heightScale, setHeightScale] = useState(0.5);
  const [showControls, setShowControls] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false); // Added showTutorial state
  const sensorRef = useRef(null);
  const sceneRef = useRef(null);
  const lodManagerRef = useRef(null);
  const clockRef = useRef(null);

  useEffect(() => {
    let renderer, scene, camera, controls, animationId;
    let video, videoTexture, videoPlane;
    let sensor, lodManager, clock;

    const init = async () => {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      mountRef.current.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      sceneRef.current = scene;
      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 5000);
      camera.position.set(0, 50, 100);

      controls = new SimpleOrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxDistance = 1000;

      clock = new THREE.Clock();
      clockRef.current = clock;

      const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
      scene.add(hemi);
      const dir = new THREE.DirectionalLight(0xffffff, 0.8);
      dir.position.set(100, 100, 50);
      scene.add(dir);

      const ambient = new THREE.AmbientLight(0x404040, 0.5);
      scene.add(ambient);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }
        });
        video = document.createElement('video');
        video.autoplay = true;
        video.playsInline = true;
        video.srcObject = stream;
        await video.play();
        
        videoTexture = new THREE.VideoTexture(video);
        const geom = new THREE.PlaneGeometry(16, 9);
        const mat = new THREE.MeshBasicMaterial({ map: videoTexture, opacity: 0.3, transparent: true });
        videoPlane = new THREE.Mesh(geom, mat);
        videoPlane.position.set(0, 0, -50);
        const aspect = window.innerWidth / window.innerHeight;
        videoPlane.scale.set(aspect * 20, 20, 1);
        scene.add(videoPlane);
        
        setCameraActive(true);
        setStatus('Kamera aktiv - GPS aktivieren...');
      } catch (e) {
        console.error('Kamera-Fehler:', e);
        setStatus('Kamera nicht verfügbar (optional)');
      }

      sensor = new SensorFusion();
      sensorRef.current = sensor;
      sensor.onUpdate = (pose) => {
        const headingRad = (pose.heading || 0) * Math.PI / 180;
        scene.rotation.y = -headingRad;
        
        const betaRad = ((pose.orientation.beta || 0) - 90) * Math.PI / 180;
        camera.rotation.x = betaRad * 0.3;
        
        setStatus(`📍 ${pose.pos.lat.toFixed(5)}, ${pose.pos.lon.toFixed(5)} | 🧭 ${pose.heading.toFixed(0)}°`);
      };
      sensor.start();

      const proxyFn = async (z, x, y) => {
        const response = await base44.functions.invoke('bathymetryProxy', {}, {
          params: { provider: 'gebco', z, x, y }
        });
        return response.config.url;
      };

      const decodeFn = (r, g, b) => {
        const gray = (r + g + b) / 3;
        return (gray / 255) * 100;
      };

      lodManager = new TileLODManager(scene, proxyFn, decodeFn);
      lodManagerRef.current = lodManager;

      addMockBathymetry(scene);

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener('resize', onResize);

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        controls.update();
        
        if (videoTexture) videoTexture.needsUpdate = true;
        if (lodManager) lodManager.updateShaderTime(clock.getElapsedTime());
        
        renderer.render(scene, camera);
      };
      animate();

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);
        controls.dispose();
        renderer.dispose();
        sensor.stop();
        if (lodManager) lodManager.dispose();
      };
    };

    init();
  }, []);

  const addMockBathymetry = (scene) => {
    const radii = [10, 20, 40, 60, 80];
    const colors = [0x00ffff, 0x00ccff, 0x0099ff, 0x0066ff, 0x0033ff];
    
    radii.forEach((r, idx) => {
      const pts = [];
      const seg = 64;
      for (let i = 0; i <= seg; i++) {
        const theta = (i / seg) * Math.PI * 2;
        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = -idx * 5;
        pts.push(new THREE.Vector3(x, y, z));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ 
        color: colors[idx],
        opacity: 0.7 - idx * 0.1,
        transparent: true
      });
      const line = new THREE.Line(g, mat);
      scene.add(line);
    });
  };

  const loadRealBathymetry = async () => {
    if (!sensorRef.current || !sceneRef.current || !lodManagerRef.current) {
      setStatus('⏳ Warte auf Initialisierung...');
      return;
    }

    const { lat, lon } = sensorRef.current.pos;
    if (lat === 0 || lon === 0) {
      setStatus('⚠️ GPS-Position noch nicht verfügbar');
      return;
    }

    setLoading(true);
    
    try {
      await lodManagerRef.current.updateForLatLon(lat, lon, (msg) => {
        setStatus(msg);
      });
    } catch (error) {
      console.error('Fehler beim Laden:', error);
      setStatus('❌ Fehler: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleHeightScaleChange = (value) => {
    const scale = value[0];
    setHeightScale(scale);
    if (lodManagerRef.current) {
      lodManagerRef.current.setHeightScale(scale);
    }
  };

  return (
    <div 
      className="relative w-screen h-screen bg-black overflow-hidden px-4 md:px-6 lg:px-8" 
      role="application" 
      aria-label="AR 3D Bathymetrie Visualisierung mit Sensor-Fusion und interaktiven 3D-Bedienelementem"
    >
      <div 
        ref={mountRef} 
        className="w-full h-full" 
        role="img" 
        aria-label="3D interaktive Wassertiefenkarte - zum Rotieren ziehen, zum Zoomen pinchen"
      />
      
      {/* Tutorial Modal */}
      <ARTutorial isOpen={showTutorial} onClose={() => setShowTutorial(false)} />

      {/* Info Button - Top Right */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        onClick={() => setShowTutorial(true)}
        aria-label="AR 3D Bathymetrie Bedienungsanleitung oeffnen"
        className="absolute top-4 right-4 z-20 min-h-[44px] min-w-[44px] rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 active:scale-95 active:from-cyan-600 active:to-blue-700 shadow-lg flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2"
      >
        <span className="text-white text-xl font-bold" aria-hidden="true">!</span>
      </motion.button>
      
      {/* Status Bar */}
      <div className="absolute top-4 left-4 right-20 sm:left-6 sm:right-24 lg:left-8 lg:right-28 z-10">
        <Card className="glass-morphism p-3 border-cyan-500/30">
          <div className="text-xs text-cyan-400 font-mono">
            {status}
          </div>
        </Card>
      </div>

      {/* Controls */}
      <div className="absolute top-20 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 z-10 space-y-2">
        <Button
          onClick={() => setShowControls(!showControls)}
          size="sm"
          variant="outline"
          className="w-full active:scale-95 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
          aria-expanded={showControls}
          aria-controls="ar-controls-panel"
          aria-label={showControls ? 'AR Steuerelemente ausblenden' : 'AR Steuerelemente anzeigen'}
        >
          {showControls ? 'Steuerung verbergen' : 'Steuerung anzeigen'}
        </Button>

        {showControls && (
          <Card 
            id="ar-controls-panel"
            className="glass-morphism p-4 space-y-4 border-gray-700" 
            role="region" 
            aria-label="AR Steuerelemente"
          >
            <div>
              <Button
                onClick={loadRealBathymetry}
                disabled={loading || !sensorRef.current}
                className="w-full bg-cyan-600 active:scale-95 active:bg-cyan-700 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:opacity-50"
                aria-label={loading ? 'Bathymetrie-Daten werden geladen' : 'Aktuelle Bathymetrie-Daten fuer aktuelle GPS-Position laden'}
              >
                {loading ? 'Lädt...' : 'Bathymetrie laden'}
              </Button>
            </div>

            <div className="space-y-2">
              <label htmlFor="height-scale" className="text-xs text-gray-300">
                Höhen-Skalierung: {heightScale.toFixed(2)}x
              </label>
              <Slider
                id="height-scale"
                value={[heightScale]}
                onValueChange={handleHeightScaleChange}
                min={0.1}
                max={2.0}
                step={0.1}
                className="w-full"
                aria-valuemin={0.1}
                aria-valuemax={2.0}
                aria-valuenow={heightScale}
                aria-label="Hoehen-Skalierung der Bathymetrie-Visualisierung anpassen (0.1 bis 2.0x)"
              />
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <div>🔵 Blau = Flach (0-20m)</div>
              <div>🟢 Grün = Mittel (20-50m)</div>
              <div>🟡 Gelb = Tief (50-70m)</div>
              <div>🔴 Rot = Sehr tief (70m+)</div>
            </div>
          </Card>
        )}
      </div>

      {/* Bottom Help */}
      <div className="absolute bottom-4 left-4 right-4 sm:left-6 sm:right-6 lg:left-8 lg:right-8 z-10" role="region" aria-label="Bedienungshinweise fuer AR-Visualisierung" aria-live="polite">
        <Card className="glass-morphism p-2 border-gray-700">
          <div className="text-xs text-gray-400 text-center">
            Geraet drehen zum Rotieren. Zwei Finger zusammen zum Zoomen. Drag-Geste zum Rotieren der Szene.
          </div>
        </Card>
      </div>

      <style>{`
        .glass-morphism {
          background: rgba(15, 23, 42, 0.7);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(51, 65, 85, 0.3);
        }
      `}</style>
    </div>
  );
}