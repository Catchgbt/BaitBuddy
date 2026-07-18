import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SimpleOrbitControls } from '@/lib/three/SimpleOrbitControls';
import { LURE_MODEL_BUILDERS } from './lureModels';
import { LureAnimator } from './lureAnimator';
import { createUnderwaterEnvironment } from './underwaterEnvironment';

const SURFACE_Y = 0;
const FLOOR_Y = -2.5;

// Einzige Brücke zwischen React und three.js: baut Renderer, Szene und
// RAF-Loop einmalig auf; Köder-, Stil-, Tempo- und Pausen-Wechsel laufen
// über Refs ohne Szenen-Neuaufbau. Bei WebGL-Context-Verlust wird die
// Szene komplett neu aufgebaut (rebuildKey).
export default function LureScene({ modelKey, styleParams, speed, paused, resetCameraSignal, onPhaseChange }) {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const [webglFailed, setWebglFailed] = useState(false);
  const [rebuildKey, setRebuildKey] = useState(0);

  const speedRef = useRef(speed);
  const pausedRef = useRef(paused);
  const phaseCallbackRef = useRef(onPhaseChange);
  speedRef.current = speed;
  pausedRef.current = paused;
  phaseCallbackRef.current = onPhaseChange;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setWebglFailed(true);
      return undefined;
    }

    const lowMemory = typeof navigator !== 'undefined' && navigator.deviceMemory <= 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowMemory ? 1.5 : 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.05, 60);
    camera.position.set(1.7, -0.35, 2.3);

    // Environment-Lighting für die PBR-Materialien (Clearcoat, Metalness).
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmrem.dispose();

    const environment = createUnderwaterEnvironment(scene, { floorY: FLOOR_Y, surfaceY: SURFACE_Y });

    const controls = new SimpleOrbitControls(camera, renderer.domElement, {
      minDistance: 0.6,
      maxDistance: 8,
    });
    controls.target.set(0, -1, 0);

    const animator = new LureAnimator({ surfaceY: SURFACE_Y, floorY: FLOOR_Y });

    const state = {
      renderer,
      scene,
      camera,
      controls,
      animator,
      environment,
      model: null,
      lastPhase: null,
      hidden: false,
      resetCamera: () => {
        camera.position.set(1.7, -0.35, 2.3);
        controls.target.set(0, -1, 0);
      },
    };
    sceneRef.current = state;

    const clock = new THREE.Clock();
    let rafId = 0;
    const renderLoop = () => {
      rafId = requestAnimationFrame(renderLoop);
      const dt = Math.min(clock.getDelta(), 0.1);
      if (!pausedRef.current && state.model) {
        state.animator.setSpeed(speedRef.current);
        const pose = state.animator.update(dt);
        if (pose) {
          state.model.group.position.set(pose.x, pose.y, pose.z);
          state.model.group.rotation.set(pose.roll, pose.yaw, pose.pitch);
          if (state.model.parts.blade) state.model.parts.blade.rotation.x = pose.bladeAngle;
          if (state.model.parts.tail) state.model.parts.tail.rotation.y = pose.tailAngle;
          environment.update(dt, pose.forwardSpeed, pose.y);
          // Kamera-Ziel folgt der Lauftiefe weich, damit der Köder im Bild bleibt.
          controls.target.y += (pose.y - controls.target.y) * Math.min(1, dt * 2.5);
          if (pose.phase !== state.lastPhase) {
            state.lastPhase = pose.phase;
            phaseCallbackRef.current?.({ phase: pose.phase, behavior: pose.behavior });
          }
        }
      }
      controls.update();
      renderer.render(scene, camera);
    };

    const startLoop = () => {
      if (!rafId) {
        clock.getDelta();
        renderLoop();
      }
    };
    const stopLoop = () => {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
    startLoop();

    // Akku schonen: Loop komplett anhalten, wenn die App im Hintergrund ist.
    const onVisibilityChange = () => {
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    const resizeObserver = new ResizeObserver(() => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(mount);

    // Im Android-WebView geht der WebGL-Kontext beim Backgrounding gern
    // verloren — Szene dann vollständig neu aufbauen.
    const onContextLost = (e) => {
      e.preventDefault();
      stopLoop();
    };
    const onContextRestored = () => setRebuildKey((k) => k + 1);
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', onContextRestored);

    return () => {
      stopLoop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored);
      if (state.model) {
        scene.remove(state.model.group);
        state.model.dispose();
      }
      environment.dispose();
      controls.dispose();
      envTexture.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [rebuildKey]);

  // Köderwechsel: altes Modell restlos freigeben, neues bauen.
  useEffect(() => {
    const state = sceneRef.current;
    if (!state) return;
    if (state.model) {
      state.scene.remove(state.model.group);
      state.model.dispose();
      state.model = null;
    }
    const build = LURE_MODEL_BUILDERS[modelKey];
    if (!build) return;
    state.model = build();
    state.scene.add(state.model.group);
    state.lastPhase = null;
  }, [modelKey, rebuildKey]);

  useEffect(() => {
    const state = sceneRef.current;
    if (!state || !styleParams) return;
    state.animator.setStyle(modelKey, styleParams);
    state.lastPhase = null;
  }, [modelKey, styleParams, rebuildKey]);

  useEffect(() => {
    if (resetCameraSignal > 0) sceneRef.current?.resetCamera();
  }, [resetCameraSignal]);

  if (webglFailed) {
    return (
      <div
        className="flex h-full w-full items-center justify-center bg-gray-900 px-6 text-center text-sm text-gray-300"
        role="status"
      >
        3D-Ansicht ist auf diesem Gerät nicht verfügbar. Die Technik-Anleitungen
        unten funktionieren trotzdem vollständig.
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className="h-full w-full"
      style={{ touchAction: 'none' }}
      role="img"
      aria-label="3D-Animation des ausgewählten Kunstköders mit Laufverhalten"
    />
  );
}
