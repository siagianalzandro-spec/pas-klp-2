import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { AudioMetrics, FocusTarget, SimMode, SimulationState } from '../types/paSystem';
import { createPaMaterials } from './materials';
import { buildCeilingSpeakerModel } from './models/buildCeilingSpeaker';
import { buildEnvironment } from './models/buildEnvironment';
import { buildMicrophoneModel } from './models/buildMicrophone';
import { buildPreAmpModel } from './models/buildPreAmp';
import { buildSensorsModel } from './models/buildSensors';
import { createProceduralTextures } from './proceduralTextures';

interface PaViewportProps {
  simState: SimulationState;
  metricsRef: React.MutableRefObject<AudioMetrics>;
  cameraResetToken: number;
  onSelectAnnotation: (annotationId: string | null) => void;
  onDirect3DAction: (action: string) => void;
}

interface CameraPreset {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _vecE = new THREE.Vector3();
const _vecF = new THREE.Vector3();

function getCameraPreset(mode: SimMode, focus: FocusTarget): CameraPreset {
  const isIntegrated = mode === 'integrated' || mode === 'troubleshooting';
  if (isIntegrated) {
    if (focus === 'microphone') {
      return { position: new THREE.Vector3(-3.8, 2.1, 2.7), target: new THREE.Vector3(-3.6, 0.75, 0) };
    }
    if (focus === 'preamp') {
      return { position: new THREE.Vector3(-1.1, 1.35, 2.65), target: new THREE.Vector3(-1.1, 0.42, 0) };
    }
    if (focus === 'speaker') {
      return { position: new THREE.Vector3(2.9, 1.4, 2.9), target: new THREE.Vector3(3.1, 2.35, 0) };
    }
    return { position: new THREE.Vector3(-0.3, 2.4, 7.6), target: new THREE.Vector3(-0.1, 0.75, 0) };
  }

  // Single-device inspection / cut-away presets
  if (focus === 'microphone') {
    return { position: new THREE.Vector3(2.2, 1.65, 2.5), target: new THREE.Vector3(0, 0.85, 0) };
  }
  if (focus === 'preamp') {
    return { position: new THREE.Vector3(1.8, 1.55, 2.55), target: new THREE.Vector3(0, 0.42, 0) };
  }
  if (focus === 'speaker') {
    return { position: new THREE.Vector3(2.15, 0.95, 2.35), target: new THREE.Vector3(0, 0.3, 0) };
  }
  return { position: new THREE.Vector3(0.2, 2.6, 6.2), target: new THREE.Vector3(0, 0.7, 0) };
}

export const PaViewport: React.FC<PaViewportProps> = ({
  simState,
  metricsRef,
  cameraResetToken,
  onSelectAnnotation,
  onDirect3DAction,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);

  // Store latest props in refs so WebGL scene never tears down on UI state changes
  const simStateRef = useRef(simState);
  simStateRef.current = simState;

  const onSelectRef = useRef(onSelectAnnotation);
  onSelectRef.current = onSelectAnnotation;

  const onActionRef = useRef(onDirect3DAction);
  onActionRef.current = onDirect3DAction;

  const cameraGoalRef = useRef<{ active: boolean; pos: THREE.Vector3; target: THREE.Vector3 }>({
    active: false,
    pos: new THREE.Vector3(2.2, 1.65, 2.5),
    target: new THREE.Vector3(0, 0.85, 0),
  });

  // Trigger smooth camera preset transition when mode, focusTarget, or reset changes
  useEffect(() => {
    const preset = getCameraPreset(simState.mode, simState.focusTarget);
    cameraGoalRef.current = {
      active: true,
      pos: preset.position.clone(),
      target: preset.target.clone(),
    };
  }, [simState.mode, simState.focusTarget, cameraResetToken]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software WebGL probe
    const isSoftwareGl = (() => {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const bgHex = 0x0b0f17;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.036);

    // 2. Mandatory Studio Environment Reflections (RoomEnvironment)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // 3. Camera & OrbitControls
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 80);
    const initialPreset = getCameraPreset(simStateRef.current.mode, simStateRef.current.focusTarget);
    camera.position.copy(initialPreset.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(initialPreset.target);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.07;
    controls.minDistance = 1.2;
    controls.maxDistance = 14.5;
    controls.maxPolarAngle = Math.PI * 0.85;
    controls.addEventListener('start', () => {
      cameraGoalRef.current.active = false;
    });

    // 4. Three-Point Warm/Cool Studio Lighting Rig (<= 3 shadow casters)
    const hemiLight = new THREE.HemisphereLight(0x93c5fd, 0x1e293b, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.2);
    keyLight.position.set(4.5, 7.5, 5.2);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    const d = 6.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.95);
    rimLight.position.set(-5, 4.5, -5.5);
    scene.add(rimLight);

    if (!isSoftwareGl) {
      RectAreaLightUniformsLib.init();
      const softbox = new THREE.RectAreaLight(0xffffff, 2.4, 5, 2.5);
      softbox.position.set(0, 5.2, 3.2);
      softbox.lookAt(0, 0.5, 0);
      scene.add(softbox);
    }

    // 5. Build Procedural Textures, Materials, Environment, & 3 PA Hardware Models
    const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
    const textures = createProceduralTextures(maxAnisotropy);
    const mats = createPaMaterials(textures, isSoftwareGl);

    const env = buildEnvironment(mats, textures);
    scene.add(env.studioFloor);
    scene.add(env.integratedRoom);
    scene.add(env.cablesGroup);
    scene.add(env.waveGroup);

    const micModel = buildMicrophoneModel(mats);
    const preampModel = buildPreAmpModel(mats);
    const speakerModel = buildCeilingSpeakerModel(mats);
    const sensorsModel = buildSensorsModel(mats, maxAnisotropy);

    preampModel.root.add(sensorsModel.preampSensorsRoot);
    speakerModel.root.add(sensorsModel.speakerSensorsRoot);
    scene.add(sensorsModel.splProbeRoot);

    scene.add(micModel.root);
    scene.add(preampModel.root);
    scene.add(speakerModel.root);

    const allClickables = [
      ...micModel.clickables,
      ...preampModel.clickables,
      ...speakerModel.clickables,
      ...sensorsModel.clickables,
    ];

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // 6. Layer-1 Raycasting for Inspection & Direct 3D Interaction
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };
    let lastHoverCheck = 0;

    const updatePointer = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const onPointerDown = (ev: PointerEvent) => {
      pointerDownPos = { x: ev.clientX, y: ev.clientY };
    };

    const onPointerMove = (ev: PointerEvent) => {
      const now = performance.now();
      if (now - lastHoverCheck < 50) return;
      lastHoverCheck = now;

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(allClickables, true).filter((h) => {
        let cur: THREE.Object3D | null = h.object;
        while (cur) {
          if (!cur.visible) return false;
          cur = cur.parent;
        }
        return true;
      });
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    const onPointerUp = (ev: PointerEvent) => {
      const dist = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
      if (dist > 6) return; // Ignore orbit drags

      updatePointer(ev);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(allClickables, true).filter((h) => {
        let cur: THREE.Object3D | null = h.object;
        while (cur) {
          if (!cur.visible) return false;
          cur = cur.parent;
        }
        return true;
      });

      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const annotationId = hitObj.userData.annotationId as string | undefined;
        const action = hitObj.userData.interactiveAction as string | undefined;
        if (annotationId) {
          onSelectRef.current(annotationId);
        }
        if (action) {
          onActionRef.current(action);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // 7. Resize Handling
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // 8. Animation & Software-WebGL Paced Render Loop
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const status = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (status === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const s = simStateRef.current;
      const m = metricsRef.current;

      const isIntegrated = s.mode === 'integrated' || s.mode === 'troubleshooting';
      const isCutAway = s.mode === 'cutaway' || s.cutAwayActive;
      const explodedVal = isIntegrated ? 0 : s.explodedProgress;

      // Position devices cleanly according to mode & focusTarget
      if (isIntegrated) {
        micModel.root.visible = true;
        preampModel.root.visible = true;
        speakerModel.root.visible = true;

        micModel.root.position.set(-3.6, 0, 0.15);
        micModel.root.rotation.set(0, 0.25, 0);

        preampModel.root.position.set(-1.15, 0, -0.1);
        preampModel.root.rotation.set(0, 0, 0);

        // Speaker mounted at terminal ceiling height (y = 2.6), lifted slightly if ceilingMountProgress < 1
        const unmountedDrop = (1 - s.ceilingMountProgress) * 0.48;
        speakerModel.root.position.set(3.1, 2.6 - unmountedDrop, 0);
        speakerModel.root.rotation.set(0, 0, 0);
      } else if (s.focusTarget === 'system') {
        micModel.root.visible = true;
        preampModel.root.visible = true;
        speakerModel.root.visible = true;

        micModel.root.position.set(-2.5, 0, 0);
        micModel.root.rotation.set(0, 0.2, 0);

        preampModel.root.position.set(0, 0, 0);
        preampModel.root.rotation.set(0, 0, 0);

        speakerModel.root.position.set(2.55, 0.85, 0);
        speakerModel.root.rotation.set(0.35, 0, 0);
      } else {
        micModel.root.visible = s.focusTarget === 'microphone';
        preampModel.root.visible = s.focusTarget === 'preamp';
        speakerModel.root.visible = s.focusTarget === 'speaker';

        micModel.root.position.set(0, 0, 0);
        micModel.root.rotation.set(0, 0.25, 0);

        preampModel.root.position.set(0, 0, 0);
        preampModel.root.rotation.set(0, 0, 0);

        speakerModel.root.position.set(0, 0.35, 0);
        speakerModel.root.rotation.set(0.28, 0, 0);
      }

      const audioNorm = Math.min(1, m.outputV / 1.8);
      const micAudioNorm = Math.min(1, m.inputMv / 18);

      micModel.update({
        dt,
        elapsed,
        exploded: explodedVal,
        cutAway: isCutAway,
        windshieldAttached: s.windshieldAttached,
        gooseneckAngleDeg: s.gooseneckAngle,
        pttActive: s.pttActive,
        audioLevel: micAudioNorm,
      });

      preampModel.update({
        dt,
        elapsed,
        exploded: explodedVal,
        cutAway: isCutAway,
        powerOn: s.preampPowerOn,
        gainPercent: s.preampGain,
        audioLevel: audioNorm,
        isClipping: m.isClipping,
      });

      speakerModel.update({
        dt,
        elapsed,
        exploded: explodedVal,
        cutAway: isCutAway,
        grilleRemoved: s.speakerGrilleRemoved,
        ceilingMountProgress: s.ceilingMountProgress,
        crossoverMode: s.crossoverMode,
        backCanDamping: s.backCanDamping,
        polarityReversed: s.speakerPolarityReversed,
        showCeilingBoard: isIntegrated || s.focusTarget === 'speaker',
        audioLevel: audioNorm,
        isSignalActive: m.isSignalActive,
      });

      // Update world matrices before reading cable anchors
      micModel.root.updateMatrixWorld(true);
      preampModel.root.updateMatrixWorld(true);
      speakerModel.root.updateMatrixWorld(true);

      micModel.xlrAnchor.getWorldPosition(_vecA);
      preampModel.bncInAnchor.getWorldPosition(_vecB);
      preampModel.bncOutAnchor.getWorldPosition(_vecC);
      speakerModel.terminalAnchor.getWorldPosition(_vecD);
      speakerModel.grilleWorldDir.getWorldPosition(_vecE);
      micModel.capsuleAnchor.getWorldPosition(_vecF);

      const showSplProbe =
        s.showSensorProbes &&
        (isIntegrated ||
          s.focusTarget === 'microphone' ||
          s.focusTarget === 'speaker' ||
          s.focusTarget === 'system');

      const effectiveSplLoc =
        !isIntegrated && s.focusTarget === 'microphone'
          ? 'mic-gooseneck'
          : !isIntegrated && s.focusTarget === 'speaker'
          ? 'room-lounge'
          : s.splProbeLocation;

      sensorsModel.update({
        dt,
        elapsed,
        visible: s.showSensorProbes,
        isIntegrated,
        splProbeLocation: effectiveSplLoc,
        splListenerDistanceM: s.splListenerDistanceM,
        micCapsuleWorld: _vecF,
        spkGrilleWorld: _vecE,
        tempPreampC: m.temp_preamp_c,
        tempSpeakerC: m.temp_speaker_c,
        currentPreampMa: m.current_preamp_ma,
        currentSpeakerMa: m.current_speaker_ma,
        isOvercurrent: m.isOvercurrent,
        isClipping: m.isClipping,
        preampExploded: explodedVal,
        speakerExploded: explodedVal,
      });
      sensorsModel.splProbeRoot.visible = showSplProbe;

      env.updateCablesAndWaves({
        dt,
        elapsed,
        isIntegrated,
        micCable: s.cableMicToPreamp,
        spkCable: s.cablePreampToSpeaker,
        micXlrWorld: _vecA,
        preampInWorld: _vecB,
        preampOutWorld: _vecC,
        spkTermWorld: _vecD,
        spkGrilleWorld: _vecE,
        isSignalActive: m.isSignalActive,
        isMicSignalReady: s.audioPlaying && s.pttActive,
        isClipping: m.isClipping,
        isHumPresent: m.isHumPresent,
        audioLevel: audioNorm,
        splDb: m.splDb,
      });

      // Smooth damped camera preset transitions
      if (cameraGoalRef.current.active) {
        camera.position.x = THREE.MathUtils.damp(camera.position.x, cameraGoalRef.current.pos.x, 5.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, cameraGoalRef.current.pos.y, 5.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, cameraGoalRef.current.pos.z, 5.5, dt);

        controls.target.x = THREE.MathUtils.damp(controls.target.x, cameraGoalRef.current.target.x, 5.5, dt);
        controls.target.y = THREE.MathUtils.damp(controls.target.y, cameraGoalRef.current.target.y, 5.5, dt);
        controls.target.z = THREE.MathUtils.damp(controls.target.z, cameraGoalRef.current.target.z, 5.5, dt);

        if (
          camera.position.distanceTo(cameraGoalRef.current.pos) < 0.03 &&
          controls.target.distanceTo(cameraGoalRef.current.target) < 0.03
        ) {
          cameraGoalRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      envRT.dispose();
      sensorsModel.dispose();
      mats.dispose();
      textures.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full select-none">
      <div ref={mountRef} className="h-full w-full" />
      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0b0f17]/95 text-slate-200">
          <div className="max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-6 text-center">
            <p className="font-display text-base font-semibold">Konteks WebGL Terhenti</p>
            <p className="mt-2 text-sm text-slate-400">
              GPU browser sedang memulihkan rendering 3D. Muat ulang halaman jika tampilan belum kembali.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
