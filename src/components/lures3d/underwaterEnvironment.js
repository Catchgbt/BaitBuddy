import * as THREE from 'three';

// Unterwasser-Ambiente der 3D-Köderanimation: Wasseroberfläche (von unten
// gesehen), Gewässergrund, Schwebeteilchen, Nebel und Licht. Die Einhol-
// bewegung wird als "Laufband" dargestellt: Der Köder bleibt nahe dem
// Ursprung, Grundtextur und Teilchen scrollen entgegen der Zugrichtung (+X).

const WATER_COLOR = 0x0a3d4d;
const PARTICLE_COUNT = 160;
const PARTICLE_RANGE = { x: 7, yTop: 0, yBottom: -2.6, z: 5 };

function createSandTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#4a4436';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 500; i++) {
    const shade = 60 + Math.floor(Math.random() * 40);
    ctx.fillStyle = `rgb(${shade + 14}, ${shade + 6}, ${shade - 10})`;
    ctx.globalAlpha = 0.3 + Math.random() * 0.4;
    const r = 1 + Math.random() * 3;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 4);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const surfaceVertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(pos.x * 2.1 + uTime * 1.4) * 0.06
               + sin(pos.y * 3.3 - uTime * 1.1) * 0.045;
    pos.z += wave;
    vWave = wave;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const surfaceFragmentShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying float vWave;
  void main() {
    vec3 deep = vec3(0.03, 0.22, 0.28);
    vec3 bright = vec3(0.55, 0.85, 0.9);
    float shimmer = smoothstep(-0.06, 0.1, vWave);
    float streak = 0.5 + 0.5 * sin(vUv.x * 40.0 + uTime * 2.0 + vWave * 30.0);
    vec3 color = mix(deep, bright, shimmer * 0.7 + streak * 0.15);
    gl_FragColor = vec4(color, 0.85);
  }
`;

export function createUnderwaterEnvironment(scene, { floorY = -2.5, surfaceY = 0 } = {}) {
  const disposables = [];
  const root = new THREE.Group();

  scene.background = new THREE.Color(WATER_COLOR);
  scene.fog = new THREE.FogExp2(WATER_COLOR, 0.12);

  // Wasseroberfläche von unten: leicht wogende Shader-Plane.
  const surfaceMaterial = new THREE.ShaderMaterial({
    vertexShader: surfaceVertexShader,
    fragmentShader: surfaceFragmentShader,
    uniforms: { uTime: { value: 0 } },
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const surfaceGeometry = new THREE.PlaneGeometry(30, 24, 48, 32);
  const surface = new THREE.Mesh(surfaceGeometry, surfaceMaterial);
  surface.rotation.x = -Math.PI / 2;
  surface.position.y = surfaceY;
  root.add(surface);
  disposables.push(surfaceGeometry, surfaceMaterial);

  // Gewässergrund mit scrollender Sandtextur (Laufband-Effekt).
  const sandTexture = createSandTexture();
  const floorMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    roughness: 0.95,
    metalness: 0,
  });
  const floorGeometry = new THREE.PlaneGeometry(30, 24);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = floorY;
  root.add(floor);
  disposables.push(floorGeometry, floorMaterial, sandTexture);

  // Weicher Kontaktschatten unter dem Köder statt echter Shadow-Map.
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shadowCtx = shadowCanvas.getContext('2d');
  const shadowGradient = shadowCtx.createRadialGradient(64, 64, 8, 64, 64, 64);
  shadowGradient.addColorStop(0, 'rgba(0,0,0,0.45)');
  shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
  shadowCtx.fillStyle = shadowGradient;
  shadowCtx.fillRect(0, 0, 128, 128);
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
  });
  const shadowGeometry = new THREE.PlaneGeometry(1.6, 1.1);
  const contactShadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = floorY + 0.01;
  root.add(contactShadow);
  disposables.push(shadowGeometry, shadowMaterial, shadowTexture);

  // Schwebeteilchen, die entgegen der Zugrichtung driften.
  const particlePositions = new Float32Array(PARTICLE_COUNT * 3);
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particlePositions[i * 3] = (Math.random() - 0.5) * PARTICLE_RANGE.x * 2;
    particlePositions[i * 3 + 1] =
      PARTICLE_RANGE.yBottom + Math.random() * (PARTICLE_RANGE.yTop - PARTICLE_RANGE.yBottom);
    particlePositions[i * 3 + 2] = (Math.random() - 0.5) * PARTICLE_RANGE.z * 2;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: 0xbfdde6,
    size: 0.025,
    transparent: true,
    opacity: 0.55,
    sizeAttenuation: true,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  root.add(particles);
  disposables.push(particleGeometry, particleMaterial);

  // Licht: Himmelslicht durch die Oberfläche plus gerichtete Sonne.
  const hemiLight = new THREE.HemisphereLight(0x9fd8e8, 0x0c2a33, 0.9);
  const sunLight = new THREE.DirectionalLight(0xeaf6ff, 1.4);
  sunLight.position.set(3, 6, 2);
  root.add(hemiLight, sunLight);

  scene.add(root);

  let elapsed = 0;

  return {
    // dt in Sekunden, retrieveSpeed = aktuelle Einholgeschwindigkeit des
    // Köders (Szenen-Einheiten/s); lureY für den Kontaktschatten.
    update(dt, retrieveSpeed, lureY = 0) {
      elapsed += dt;
      surfaceMaterial.uniforms.uTime.value = elapsed;
      sandTexture.offset.x += (retrieveSpeed * dt) / 5;

      const pos = particleGeometry.attributes.position;
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        let x = pos.getX(i) - retrieveSpeed * dt;
        const y = pos.getY(i) + Math.sin(elapsed * 0.7 + i) * 0.0006;
        if (x < -PARTICLE_RANGE.x) x += PARTICLE_RANGE.x * 2;
        pos.setX(i, x);
        pos.setY(i, y);
      }
      pos.needsUpdate = true;

      // Schatten wird schwächer und kleiner, je höher der Köder steht.
      const heightAboveFloor = Math.max(lureY - floorY, 0.05);
      const fade = THREE.MathUtils.clamp(1.4 - heightAboveFloor * 0.45, 0.1, 1);
      shadowMaterial.opacity = fade;
      const spread = 1 + heightAboveFloor * 0.25;
      contactShadow.scale.set(spread, spread, 1);
    },
    dispose() {
      scene.remove(root);
      scene.fog = null;
      scene.background = null;
      disposables.forEach((d) => d.dispose && d.dispose());
    },
  };
}
