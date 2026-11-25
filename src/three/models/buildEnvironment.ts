import * as THREE from 'three';
import { CableState } from '../../types/paSystem';
import { PaMaterialLibrary } from '../materials';
import { ProceduralTextureSet } from '../proceduralTextures';

export interface EnvironmentHandle {
  studioFloor: THREE.Group;
  integratedRoom: THREE.Group;
  cablesGroup: THREE.Group;
  waveGroup: THREE.Group;
  updateCablesAndWaves: (params: {
    dt: number;
    elapsed: number;
    isIntegrated: boolean;
    micCable: CableState;
    spkCable: CableState;
    micXlrWorld: THREE.Vector3;
    preampInWorld: THREE.Vector3;
    preampOutWorld: THREE.Vector3;
    spkTermWorld: THREE.Vector3;
    spkGrilleWorld: THREE.Vector3;
    isSignalActive: boolean;
    isMicSignalReady: boolean;
    isClipping: boolean;
    isHumPresent: boolean;
    audioLevel: number;
    splDb: number;
  }) => void;
}

const _pulsePos = new THREE.Vector3();

export function buildEnvironment(
  mats: PaMaterialLibrary,
  textures: ProceduralTextureSet
): EnvironmentHandle {
  // 1. Studio Inspection Floor & Contact Shadows
  const studioFloor = new THREE.Group();

  const floorGeo = new THREE.CircleGeometry(14, 64);
  floorGeo.rotateX(-Math.PI / 2);
  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x0e1420,
    roughness: 0.85,
    metalness: 0.1,
  });
  const studioPlane = new THREE.Mesh(floorGeo, floorMat);
  studioPlane.position.y = -0.02;
  studioPlane.receiveShadow = true;
  studioFloor.add(studioPlane);

  const gridHelper = new THREE.GridHelper(22, 44, 0x1e293b, 0x151e2e);
  gridHelper.position.y = -0.01;
  studioFloor.add(gridHelper);

  const contactMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const studioContact = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), contactMat);
  studioContact.rotation.x = -Math.PI / 2;
  studioContact.position.y = 0.002;
  studioFloor.add(studioContact);

  // 2. Integrated PA Room (Control Desk + Terminal Waiting Lounge Ceiling)
  const integratedRoom = new THREE.Group();

  // Terminal Lounge Floor
  const roomFloor = new THREE.Mesh(
    new THREE.BoxGeometry(11.5, 0.12, 6.2),
    new THREE.MeshStandardMaterial({ color: 0x121926, roughness: 0.78, metalness: 0.08 })
  );
  roomFloor.position.set(0.2, -2.26, 0);
  roomFloor.receiveShadow = true;
  integratedRoom.add(roomFloor);

  // Subtle floor zone markings
  const zoneDivider = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.02, 5.8),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 })
  );
  zoneDivider.position.set(-0.2, -2.19, 0);
  integratedRoom.add(zoneDivider);

  // Operator Control Desk (left side, top surface at y = 0 so Mic & PreAmp sit flush!)
  const deskGroup = new THREE.Group();
  integratedRoom.add(deskGroup);

  const deskTop = new THREE.Mesh(
    new THREE.BoxGeometry(5.6, 0.14, 2.8),
    new THREE.MeshStandardMaterial({ color: 0x1e2636, roughness: 0.55, metalness: 0.18 })
  );
  deskTop.position.set(-2.5, -0.07, 0);
  deskTop.castShadow = true;
  deskTop.receiveShadow = true;
  deskGroup.add(deskTop);

  // Desk metal legs reaching floor at y = -2.2
  const legGeo = new THREE.BoxGeometry(0.14, 2.12, 0.14);
  for (const [lx, lz] of [
    [-5.0, -1.15],
    [-0.1, -1.15],
    [-5.0, 1.15],
    [-0.1, 1.15],
  ]) {
    const leg = new THREE.Mesh(legGeo, mats.brushedAluminum);
    leg.position.set(lx, -1.14, lz);
    leg.castShadow = true;
    deskGroup.add(leg);
  }

  // Waiting Lounge Architectural Columns & Ceiling Canopy (right side, ceiling at y = 2.6)
  const colGeo = new THREE.CylinderGeometry(0.11, 0.11, 4.8, 16);
  for (const [cx, cz] of [
    [1.1, -1.9],
    [5.1, -1.9],
    [1.1, 1.9],
    [5.1, 1.9],
  ]) {
    const col = new THREE.Mesh(colGeo, mats.matteAbsDark);
    col.position.set(cx, 0.2, cz);
    col.castShadow = true;
    integratedRoom.add(col);
  }

  // Suspended Ceiling Frame around speaker cutout
  const ceilingBeamMat = mats.brushedAluminum;
  for (const bz of [-1.9, 1.9]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.12, 0.14), ceilingBeamMat);
    beam.position.set(3.1, 2.66, bz);
    integratedRoom.add(beam);
  }
  for (const bx of [1.1, 5.1]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 3.94), ceilingBeamMat);
    beam.position.set(bx, 2.66, 0);
    integratedRoom.add(beam);
  }

  // Passenger Lounge Bench below Ceiling Speaker
  const benchGroup = new THREE.Group();
  benchGroup.position.set(3.1, -2.2, 0);
  integratedRoom.add(benchGroup);
  const benchSeat = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.12, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 })
  );
  benchSeat.position.y = 0.48;
  benchSeat.castShadow = true;
  benchGroup.add(benchSeat);
  const benchBack = new THREE.Mesh(
    new THREE.BoxGeometry(2.3, 0.56, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.75 })
  );
  benchBack.position.set(0, 0.78, -0.31);
  benchGroup.add(benchBack);
  for (const lx of [-0.9, 0.9]) {
    const bLeg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.58), mats.chromeSteel);
    bLeg.position.set(lx, 0.23, 0);
    benchGroup.add(bLeg);
  }

  // 3. Dynamic 3D Cables & Signal Pulses
  const cablesGroup = new THREE.Group();

  const micCableMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.55, metalness: 0.1 });
  const spkCableMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55, metalness: 0.1 });

  let micCableMesh: THREE.Mesh | null = null;
  let spkCableMesh: THREE.Mesh | null = null;
  let micCurve: THREE.CatmullRomCurve3 | null = null;
  let spkCurve: THREE.CatmullRomCurve3 | null = null;

  // Signal pulse packets along cables
  const pulseGeo = new THREE.SphereGeometry(0.055, 12, 12);
  const micPulseMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
  const spkPulseMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

  const micPulses = Array.from({ length: 4 }, () => {
    const m = new THREE.Mesh(pulseGeo, micPulseMat);
    cablesGroup.add(m);
    return m;
  });
  const spkPulses = Array.from({ length: 5 }, () => {
    const m = new THREE.Mesh(pulseGeo, spkPulseMat);
    cablesGroup.add(m);
    return m;
  });

  // Track last cable anchors to rebuild TubeGeometry only when moved meaningfully
  let lastCoordsKey = '';

  // 4. 3D Acoustic Wavefront Propagation Rings under Ceiling Speaker
  const waveGroup = new THREE.Group();
  const waveRings: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = [];
  for (let i = 0; i < 6; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ringGeo = new THREE.TorusGeometry(0.45, 0.018, 10, 48);
    ringGeo.rotateX(Math.PI / 2);
    const mesh = new THREE.Mesh(ringGeo, mat);
    waveGroup.add(mesh);
    waveRings.push({ mesh, mat, phase: i / 6 });
  }

  return {
    studioFloor,
    integratedRoom,
    cablesGroup,
    waveGroup,
    updateCablesAndWaves: ({
      elapsed,
      isIntegrated,
      micCable,
      spkCable,
      micXlrWorld,
      preampInWorld,
      preampOutWorld,
      spkTermWorld,
      spkGrilleWorld,
      isSignalActive,
      isMicSignalReady,
      isClipping,
      isHumPresent,
      audioLevel,
      splDb,
    }) => {
      studioFloor.visible = !isIntegrated;
      integratedRoom.visible = isIntegrated;
      cablesGroup.visible = isIntegrated;
      waveGroup.visible = isIntegrated || isSignalActive;

      if (isIntegrated) {
        const key = `${micCable}:${spkCable}:${micXlrWorld.x.toFixed(2)},${micXlrWorld.z.toFixed(2)}:${preampInWorld.x.toFixed(2)}:${spkTermWorld.y.toFixed(2)}`;
        if (key !== lastCoordsKey) {
          lastCoordsKey = key;

          if (micCableMesh) {
            cablesGroup.remove(micCableMesh);
            micCableMesh.geometry.dispose();
            micCableMesh = null;
          }
          if (spkCableMesh) {
            cablesGroup.remove(spkCableMesh);
            spkCableMesh.geometry.dispose();
            spkCableMesh = null;
          }

          // Build Mic XLR -> PreAmp BNC In cable
          if (micCable !== 'disconnected') {
            const endOffset = micCable === 'loose' ? new THREE.Vector3(-0.22, 0.14, 0.12) : new THREE.Vector3(0, 0, 0);
            const targetIn = preampInWorld.clone().add(endOffset);
            micCurve = new THREE.CatmullRomCurve3([
              micXlrWorld.clone(),
              micXlrWorld.clone().add(new THREE.Vector3(0, -0.05, -0.45)),
              new THREE.Vector3(
                (micXlrWorld.x + targetIn.x) * 0.5,
                0.08,
                (micXlrWorld.z + targetIn.z) * 0.5 - 0.35
              ),
              targetIn.clone().add(new THREE.Vector3(-0.32, -0.04, 0)),
              targetIn,
            ]);
            micCableMesh = new THREE.Mesh(new THREE.TubeGeometry(micCurve, 32, 0.032, 10, false), micCableMat);
            micCableMesh.castShadow = true;
            cablesGroup.add(micCableMesh);
          } else {
            micCurve = null;
          }

          // Build PreAmp BNC Out -> Ceiling Speaker (+/-) Terminal cable
          if (spkCable !== 'disconnected') {
            const endOffset = spkCable === 'loose' ? new THREE.Vector3(-0.28, 0.18, 0) : new THREE.Vector3(0, 0, 0);
            const targetTerm = spkTermWorld.clone().add(endOffset);
            spkCurve = new THREE.CatmullRomCurve3([
              preampOutWorld.clone(),
              preampOutWorld.clone().add(new THREE.Vector3(0.45, -0.05, 0)),
              new THREE.Vector3(0.85, 0.65, -0.65),
              new THREE.Vector3(1.15, 2.75, -0.85),
              new THREE.Vector3(targetTerm.x - 0.55, targetTerm.y + 0.35, targetTerm.z - 0.25),
              targetTerm,
            ]);
            spkCableMesh = new THREE.Mesh(new THREE.TubeGeometry(spkCurve, 44, 0.032, 10, false), spkCableMat);
            spkCableMesh.castShadow = true;
            cablesGroup.add(spkCableMesh);
          } else {
            spkCurve = null;
          }
        }

        // Cable color feedback for loose/fault states
        micCableMat.color.setHex(micCable === 'loose' ? 0xf59e0b : 0x0ea5e9);
        spkCableMat.color.setHex(spkCable === 'loose' ? 0xf97316 : 0xf59e0b);

        // Animate signal pulses along cables
        micPulses.forEach((p, idx) => {
          if (micCurve && isMicSignalReady && micCable !== 'disconnected') {
            p.visible = true;
            const u = (elapsed * 0.65 + idx / micPulses.length) % 1;
            micCurve.getPointAt(u, _pulsePos);
            p.position.copy(_pulsePos);
            micPulseMat.color.setHex(micCable === 'loose' ? 0xfbbf24 : 0x38bdf8);
          } else {
            p.visible = false;
          }
        });

        spkPulses.forEach((p, idx) => {
          if (spkCurve && (isSignalActive || isHumPresent) && spkCable !== 'disconnected') {
            p.visible = true;
            const u = (elapsed * 0.72 + idx / spkPulses.length) % 1;
            spkCurve.getPointAt(u, _pulsePos);
            p.position.copy(_pulsePos);
            spkPulseMat.color.setHex(isClipping ? 0xef4444 : isHumPresent ? 0xf59e0b : 0x22c55e);
          } else {
            p.visible = false;
          }
        });
      }

      // 3D Sound Wave Propagation radiating downward from Ceiling Speaker
      const waveStrength = isSignalActive ? Math.max(0.25, Math.min(1, (splDb - 45) / 48 + audioLevel * 0.35)) : 0;
      const waveColor = isClipping ? 0xef4444 : isHumPresent ? 0xf59e0b : 0x38bdf8;
      waveGroup.position.copy(spkGrilleWorld);

      waveRings.forEach((ring) => {
        if (waveStrength <= 0.02) {
          ring.mesh.visible = false;
          return;
        }
        ring.mesh.visible = true;
        const progress = (elapsed * 0.55 + ring.phase) % 1;
        const maxDrop = isIntegrated ? 4.2 : 1.8;
        ring.mesh.position.y = -progress * maxDrop;
        const scale = 0.65 + progress * (isIntegrated ? 4.4 : 2.2);
        ring.mesh.scale.set(scale, 1, scale);
        ring.mat.color.setHex(waveColor);
        ring.mat.opacity = Math.sin(progress * Math.PI) * 0.52 * waveStrength;
      });
    },
  };
}
