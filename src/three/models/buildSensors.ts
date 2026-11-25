import * as THREE from 'three';
import { SplProbeLocation } from '../../types/paSystem';
import { PaMaterialLibrary } from '../materials';

export interface SensorsModelHandle {
  splProbeRoot: THREE.Group;
  preampSensorsRoot: THREE.Group;
  speakerSensorsRoot: THREE.Group;
  clickables: THREE.Object3D[];
  update: (params: {
    dt: number;
    elapsed: number;
    visible: boolean;
    isIntegrated: boolean;
    splProbeLocation: SplProbeLocation;
    splListenerDistanceM: number;
    micCapsuleWorld: THREE.Vector3;
    spkGrilleWorld: THREE.Vector3;
    tempPreampC: number;
    tempSpeakerC: number;
    currentPreampMa: number;
    currentSpeakerMa: number;
    isOvercurrent: boolean;
    isClipping: boolean;
    preampExploded: number;
    speakerExploded: number;
  }) => void;
  dispose: () => void;
}


interface BreakoutModuleResult {
  group: THREE.Group;
  ledMat: THREE.MeshStandardMaterial;
}

function tagClickable(obj: THREE.Object3D, annotationId: string, clickables: THREE.Object3D[]) {
  obj.traverse((child) => {
    child.layers.enable(1);
    child.userData.annotationId = annotationId;
  });
  clickables.push(obj);
}

function createSoundSensorPcbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  // UV laid out with +X = width (across board), +Y = length (-Z header at top, +Z mic at bottom)
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0e4f8c';
  ctx.fillRect(0, 0, 256, 512);

  // Subtle copper traces beneath blue solder mask
  ctx.strokeStyle = '#186bb8';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(64, 30);
  ctx.lineTo(64, 175);
  ctx.moveTo(128, 30);
  ctx.lineTo(128, 130);
  ctx.moveTo(192, 30);
  ctx.lineTo(192, 210);
  ctx.moveTo(85, 295);
  ctx.lineTo(85, 480);
  ctx.moveTo(171, 295);
  ctx.lineTo(171, 480);
  ctx.stroke();

  // Crisp white silkscreen outer frame
  ctx.strokeStyle = 'rgba(248,250,252,0.88)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 240, 496);

  // Header pads & OUT / GND / VCC labels at rear (-Z)
  const pins = ['OUT', 'GND', 'VCC'];
  const pinXs = [64, 128, 192];
  pinXs.forEach((px, i) => {
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(px, 32, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(px, 32, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pins[i], px, 72);
  });

  // Mounting hole ring behind trimmer pot
  ctx.fillStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.arc(128, 126, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b1322';
  ctx.beginPath();
  ctx.arc(128, 126, 17, 0, Math.PI * 2);
  ctx.fill();

  // LED silkscreen markers flanking rear (+ sign & outline)
  for (const lx of [24, 206]) {
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(lx, 102, 26, 40);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('+', lx + 13, 95);
  }

  // White silkscreen footprint outlines for trimmer pot, LM393, and SMD array
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(24, 168, 112, 112); // Trimmer pot footprint
  ctx.strokeRect(148, 176, 84, 96);  // LM393 IC footprint

  // SMD pads & outlines in lower half (between IC/pot and microphone)
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      const sx = 24 + c * 54;
      const sy = 304 + r * 48;
      ctx.strokeStyle = 'rgba(248,250,252,0.85)';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, 42, 32);
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(sx + 4, sy + 5, 8, 22);
      ctx.fillRect(sx + 30, sy + 5, 8, 22);
    }
  }

  // Front Electret Mic Capsule solder pads (+Z edge)
  for (const mx of [92, 164]) {
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(mx, 474, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(mx, 474, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(248,250,252,0.92)';
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('SPL SOUND MODULE', 128, 452);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createBreakoutPcbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  // Classic blue solder mask for ACS712
  ctx.fillStyle = '#0c5694';
  ctx.fillRect(0, 0, 512, 256);

  // Subtle copper traces beneath solder mask
  ctx.strokeStyle = '#1472be';
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.moveTo(85, 78);
  ctx.lineTo(220, 78);
  ctx.moveTo(85, 178);
  ctx.lineTo(220, 178);
  ctx.stroke();

  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(270, 82);
  ctx.lineTo(445, 56);
  ctx.moveTo(270, 128);
  ctx.lineTo(445, 128);
  ctx.moveTo(270, 174);
  ctx.lineTo(445, 200);
  ctx.stroke();

  // White silkscreen border
  ctx.strokeStyle = 'rgba(248,250,252,0.88)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 240);

  // Silkscreen rectangular outlines for C1, C2, R1, D1 matching ACS712 layout
  const drawSmdSilkscreen = (x: number, y: number, w: number, h: number, label: string) => {
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + w / 2, y - 12);
  };

  drawSmdSilkscreen(286, 84, 34, 62, 'C1');
  drawSmdSilkscreen(328, 84, 34, 62, 'C2');
  drawSmdSilkscreen(370, 96, 32, 56, 'R1');
  drawSmdSilkscreen(410, 108, 28, 48, 'D1');

  // Silver solder pads for SOIC-8 (U1)
  ctx.fillStyle = '#cbd5e1';
  for (let i = 0; i < 4; i++) {
    const px = 205 + i * 18;
    ctx.fillRect(px, 68, 10, 14);
    ctx.fillRect(px, 172, 10, 14);
  }

  // Silver pads for SMD passives
  for (const px of [292, 334, 376, 415]) {
    ctx.fillRect(px, 88, 20, 10);
    ctx.fillRect(px, 142, 20, 10);
  }

  // 3-pin header solder pads & VCC / OUT / GND silkscreen labels
  const pinLabels = ['VCC', 'OUT', 'GND'];
  const pinYs = [58, 128, 198];
  pinYs.forEach((py, idx) => {
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(470, py, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(470, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(pinLabels[idx], 448, py + 7);
  });

  // Module code on PCB edge
  ctx.fillStyle = 'rgba(248,250,252,0.9)';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('ACS712-20A', 194, 224);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createDht11PcbTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0e4f8c';
  ctx.fillRect(0, 0, 512, 256);

  // Copper traces
  ctx.strokeStyle = '#176bb5';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(42, 62);
  ctx.lineTo(250, 62);
  ctx.moveTo(42, 128);
  ctx.lineTo(250, 128);
  ctx.moveTo(42, 194);
  ctx.lineTo(250, 194);
  ctx.stroke();

  // Outer white silkscreen frame
  ctx.strokeStyle = 'rgba(248,250,252,0.88)';
  ctx.lineWidth = 3;
  ctx.strokeRect(8, 8, 496, 240);

  // 3-pin right-angle header pads & GND / DATA / VCC labels at left (-X)
  const pinLabels = ['GND', 'DATA', 'VCC'];
  const pinYs = [62, 128, 194];
  pinYs.forEach((py, idx) => {
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(38, py, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(38, py, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(pinLabels[idx], 60, py + 7);
  });

  // Mounting hole near left-center
  ctx.fillStyle = '#d4d4d8';
  ctx.beginPath();
  ctx.arc(166, 128, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#09111d';
  ctx.beginPath();
  ctx.arc(166, 128, 15, 0, Math.PI * 2);
  ctx.fill();

  // LED silkscreen circle at top-center-left
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(166, 56, 20, 0, Math.PI * 2);
  ctx.stroke();

  // Two SMD 102 resistor footprints near VCC corner
  for (const [rx, ry] of [
    [98, 212],
    [152, 212],
  ]) {
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx, ry, 42, 26);
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(rx + 3, ry + 3, 8, 20);
    ctx.fillRect(rx + 31, ry + 3, 8, 20);
  }

  // DHT11 package outline & 4 right-side solder pads
  ctx.strokeStyle = '#f8fafc';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(216, 36, 224, 184);

  for (let i = 0; i < 4; i++) {
    const py = 62 + i * 44;
    ctx.fillStyle = '#d4d4d8';
    ctx.beginPath();
    ctx.arc(474, py, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(474, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(248,250,252,0.92)';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('DHT11 MODULE', 328, 240);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createIcTopTexture(line1: string, line2: string, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#1b1e24';
  ctx.fillRect(0, 0, 128, 128);

  // Pin 1 dimple
  ctx.fillStyle = '#333945';
  ctx.beginPath();
  ctx.arc(22, 102, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#cbd5e1';
  ctx.font = 'bold 21px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(line1, 64, 54);
  ctx.font = 'bold 19px monospace';
  ctx.fillText(line2, 64, 84);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createResistor102Texture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14171c';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = 'bold 22px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('102', 32, 40);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function tempToColor(tempC: number, warnC: number, critC: number, out: THREE.Color) {
  if (tempC < 45) {
    out.setHex(0x0ea5e9);
  } else if (tempC < warnC) {
    const t = (tempC - 45) / Math.max(1, warnC - 45);
    out.setHex(0x0ea5e9).lerp(new THREE.Color(0xf59e0b), t);
  } else {
    const t = Math.min(1, (tempC - warnC) / Math.max(1, critC - warnC));
    out.setHex(0xf59e0b).lerp(new THREE.Color(0xef4444), t);
  }
}

export function buildSensorsModel(mats: PaMaterialLibrary, maxAnisotropy = 4): SensorsModelHandle {
  const clickables: THREE.Object3D[] = [];
  const disposableTextures: THREE.Texture[] = [];
  const disposableGeometries: THREE.BufferGeometry[] = [];
  const disposableMaterials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    disposableGeometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    disposableMaterials.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T): T => {
    disposableTextures.push(t);
    return t;
  };

  // Shared PCB / Breakout Textures & Materials
  const pcbSoundTex = trackTex(createSoundSensorPcbTexture(maxAnisotropy));
  const pcbCurrentTex = trackTex(createBreakoutPcbTexture(maxAnisotropy));
  const pcbDht11Tex = trackTex(createDht11PcbTexture(maxAnisotropy));
  const icCurrentTex = trackTex(createIcTopTexture('ACS712T', 'ELC-20A', maxAnisotropy));
  const icSoundTex = trackTex(createIcTopTexture('LM393', 'COMP-IC', maxAnisotropy));
  const r102Tex = trackTex(createResistor102Texture(maxAnisotropy));

  const pcbSoundTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: pcbSoundTex,
      roughness: 0.34,
      metalness: 0.12,
    })
  );
  const icSoundTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: icSoundTex,
      roughness: 0.46,
      metalness: 0.08,
    })
  );
  const bluePotMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x2563eb,
      roughness: 0.42,
      metalness: 0.06,
    })
  );

  const fr4CoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xd4d0be,
      roughness: 0.72,
      metalness: 0.04,
    })
  );
  const pcbCurrentTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: pcbCurrentTex,
      roughness: 0.34,
      metalness: 0.12,
    })
  );
  const pcbDht11TopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: pcbDht11Tex,
      roughness: 0.34,
      metalness: 0.12,
    })
  );
  const dht11SkyBlueMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x3b9be8,
      roughness: 0.4,
      metalness: 0.05,
    })
  );
  const dht11CavityMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x101824,
      roughness: 0.75,
      metalness: 0.1,
    })
  );
  const greenTerminalMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x34b87c,
      roughness: 0.44,
      metalness: 0.05,
    })
  );
  const screwWellDarkMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x0f2e20,
      roughness: 0.8,
      metalness: 0.08,
    })
  );
  const icBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x181b21,
      roughness: 0.48,
      metalness: 0.08,
    })
  );
  const icCurrentTopMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: icCurrentTex,
      roughness: 0.46,
      metalness: 0.08,
    })
  );
  const mlccBodyMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xb88442,
      roughness: 0.38,
      metalness: 0.08,
    })
  );
  const smdResMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: r102Tex,
      roughness: 0.42,
      metalness: 0.06,
    })
  );
  const pinSpacerMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x161920,
      roughness: 0.72,
      metalness: 0.05,
    })
  );

  // Shared Chamfered KF301 2-Pin Screw Terminal Block Geometry (extruded along Z, then centered)
  const termShape = new THREE.Shape();
  termShape.moveTo(-0.075, 0);
  termShape.lineTo(0.065, 0);
  termShape.lineTo(0.065, 0.118);
  termShape.lineTo(-0.025, 0.118);
  termShape.lineTo(-0.075, 0.078);
  termShape.closePath();

  const terminalBlockGeo = trackGeo(
    new THREE.ExtrudeGeometry(termShape, {
      depth: 0.21,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.004,
      bevelSegments: 2,
    })
  );
  terminalBlockGeo.translate(0, 0, -0.105);

  const pcbCoreGeo = trackGeo(new THREE.BoxGeometry(0.52, 0.016, 0.24));
  const pcbMaskGeo = trackGeo(new THREE.PlaneGeometry(0.516, 0.236));
  const wellGeo = trackGeo(new THREE.CylinderGeometry(0.032, 0.032, 0.004, 16));
  const screwHeadGeo = trackGeo(new THREE.CylinderGeometry(0.024, 0.024, 0.008, 16));
  const screwSlotGeo = trackGeo(new THREE.BoxGeometry(0.04, 0.005, 0.006));
  const cageOpeningGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.055, 0.068));
  const cageMetalGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.036, 0.054));
  const dividerGeo = trackGeo(new THREE.BoxGeometry(0.145, 0.122, 0.014));
  const icBodyGeo = trackGeo(new THREE.BoxGeometry(0.088, 0.024, 0.068));
  const icLabelGeo = trackGeo(new THREE.PlaneGeometry(0.084, 0.064));
  const icPinLegGeo = trackGeo(new THREE.BoxGeometry(0.01, 0.016, 0.022));
  const smdCapGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.015, 0.036));
  const smdEndCapGeo = trackGeo(new THREE.BoxGeometry(0.024, 0.016, 0.008));
  const smdResGeo = trackGeo(new THREE.BoxGeometry(0.02, 0.012, 0.034));
  const smdLedBaseGeo = trackGeo(new THREE.BoxGeometry(0.022, 0.01, 0.03));
  const smdLedLensGeo = trackGeo(new THREE.BoxGeometry(0.018, 0.01, 0.018));
  const pinSpacerGeo = trackGeo(new THREE.BoxGeometry(0.03, 0.03, 0.046));
  const headerPinGeo = trackGeo(new THREE.BoxGeometry(0.01, 0.11, 0.01));
  const standoffGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.018, 0.045, 10));

  // Perforated 4x4 waffle grid top plate for DHT11 sky-blue housing
  const dhtGridShape = new THREE.Shape();
  dhtGridShape.moveTo(-0.105, -0.088);
  dhtGridShape.lineTo(0.105, -0.088);
  dhtGridShape.lineTo(0.105, 0.088);
  dhtGridShape.lineTo(-0.105, 0.088);
  dhtGridShape.closePath();

  for (let gx = 0; gx < 4; gx++) {
    for (let gz = 0; gz < 4; gz++) {
      const cx = -0.069 + gx * 0.046;
      const cz = -0.054 + gz * 0.036;
      const hw = 0.014;
      const hh = 0.011;
      const hole = new THREE.Path();
      hole.moveTo(cx - hw, cz - hh);
      hole.lineTo(cx - hw, cz + hh);
      hole.lineTo(cx + hw, cz + hh);
      hole.lineTo(cx + hw, cz - hh);
      hole.closePath();
      dhtGridShape.holes.push(hole);
    }
  }

  const dhtGridTopGeo = trackGeo(
    new THREE.ExtrudeGeometry(dhtGridShape, {
      depth: 0.018,
      bevelEnabled: true,
      bevelThickness: 0.004,
      bevelSize: 0.003,
      bevelSegments: 2,
    })
  );
  dhtGridTopGeo.rotateX(-Math.PI / 2);

  const dhtWallLongGeo = trackGeo(new THREE.BoxGeometry(0.21, 0.072, 0.016));
  const dhtWallShortGeo = trackGeo(new THREE.BoxGeometry(0.016, 0.072, 0.176));
  const dhtInnerCoreGeo = trackGeo(new THREE.BoxGeometry(0.175, 0.045, 0.14));
  const dhtLeadHorizGeo = trackGeo(new THREE.BoxGeometry(0.032, 0.009, 0.009));
  const dhtLeadVertGeo = trackGeo(new THREE.BoxGeometry(0.009, 0.036, 0.009));

  function buildAcs712CurrentModule(initialLedColor: number): BreakoutModuleResult {
    const group = new THREE.Group();

    // 1. Standoffs underneath so PCB mounts flush onto chassis
    for (const [sx, sz] of [
      [-0.21, -0.09],
      [-0.21, 0.09],
      [0.21, -0.09],
      [0.21, 0.09],
    ]) {
      const standoff = new THREE.Mesh(standoffGeo, mats.goldPin);
      standoff.position.set(sx, -0.022, sz);
      group.add(standoff);
    }

    // 2. FR-4 Core + Top Blue Silkscreen Mask
    const pcbCore = new THREE.Mesh(pcbCoreGeo, fr4CoreMat);
    pcbCore.castShadow = true;
    pcbCore.receiveShadow = true;
    group.add(pcbCore);

    const pcbTopMask = new THREE.Mesh(pcbMaskGeo, pcbCurrentTopMat);
    pcbTopMask.rotation.x = -Math.PI / 2;
    pcbTopMask.position.y = 0.0085;
    group.add(pcbTopMask);

    // 3. Green 2-Pin Chamfered Screw Terminal Block (KF301) — zero Z-fighting
    const termGroup = new THREE.Group();
    termGroup.position.set(-0.17, 0.008, 0);
    group.add(termGroup);

    const termHousing = new THREE.Mesh(terminalBlockGeo, greenTerminalMat);
    termHousing.castShadow = true;
    termGroup.add(termHousing);

    const centerDivider = new THREE.Mesh(dividerGeo, greenTerminalMat);
    centerDivider.position.set(-0.005, 0.06, 0);
    termGroup.add(centerDivider);

    for (const pz of [-0.052, 0.052]) {
      const well = new THREE.Mesh(wellGeo, screwWellDarkMat);
      well.position.set(0.015, 0.1205, pz);
      termGroup.add(well);

      const screw = new THREE.Mesh(screwHeadGeo, mats.chromeSteel);
      screw.position.set(0.015, 0.121, pz);
      termGroup.add(screw);

      const slot = new THREE.Mesh(screwSlotGeo, mats.matteAbsDark);
      slot.position.set(0.015, 0.1275, pz);
      slot.rotation.y = pz > 0 ? 0.45 : -0.35;
      termGroup.add(slot);

      const cavity = new THREE.Mesh(cageOpeningGeo, screwWellDarkMat);
      cavity.position.set(-0.074, 0.038, pz);
      termGroup.add(cavity);

      const cage = new THREE.Mesh(cageMetalGeo, mats.chromeSteel);
      cage.position.set(-0.070, 0.036, pz);
      termGroup.add(cage);
    }

    // 4. SOIC-8 IC Chip (ACS712T ELC-20A) + 8 gull-wing pins
    const icGroup = new THREE.Group();
    icGroup.position.set(-0.02, 0.02, 0);
    group.add(icGroup);

    const icBody = new THREE.Mesh(icBodyGeo, icBodyMat);
    icBody.castShadow = true;
    icGroup.add(icBody);

    const icTopFace = new THREE.Mesh(icLabelGeo, icCurrentTopMat);
    icTopFace.rotation.x = -Math.PI / 2;
    icTopFace.position.y = 0.0124;
    icGroup.add(icTopFace);

    for (let i = 0; i < 4; i++) {
      const px = -0.028 + i * 0.0185;
      const pinTop = new THREE.Mesh(icPinLegGeo, mats.chromeSteel);
      pinTop.position.set(px, -0.005, -0.04);
      icGroup.add(pinTop);

      const pinBot = new THREE.Mesh(icPinLegGeo, mats.chromeSteel);
      pinBot.position.set(px, -0.005, 0.04);
      icGroup.add(pinBot);
    }

    // 5. SMD Components: C1, C2 (MLCC), R1 (102), D1 (Dynamic Status LED)
    for (const cx of [0.052, 0.095]) {
      const cap = new THREE.Mesh(smdCapGeo, mlccBodyMat);
      cap.position.set(cx, 0.016, -0.01);
      group.add(cap);
      for (const ez of [-0.028, 0.008]) {
        const endCap = new THREE.Mesh(smdEndCapGeo, mats.chromeSteel);
        endCap.position.set(cx, 0.016, ez);
        group.add(endCap);
      }
    }

    const r1Body = new THREE.Mesh(smdResGeo, smdResMat);
    r1Body.position.set(0.138, 0.015, -0.005);
    group.add(r1Body);
    for (const ez of [-0.021, 0.011]) {
      const endCap = new THREE.Mesh(smdEndCapGeo, mats.chromeSteel);
      endCap.position.set(0.138, 0.015, ez);
      group.add(endCap);
    }

    const d1Base = new THREE.Mesh(smdLedBaseGeo, mats.matteAbsLight);
    d1Base.position.set(0.175, 0.014, 0.002);
    group.add(d1Base);

    const ledMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: initialLedColor,
        emissive: initialLedColor,
        emissiveIntensity: 0.9,
        roughness: 0.22,
        metalness: 0.05,
      })
    );
    const d1Lens = new THREE.Mesh(smdLedLensGeo, ledMat);
    d1Lens.position.set(0.175, 0.021, 0.002);
    group.add(d1Lens);

    // 6. 3-Pin Male Header (VCC / OUT / GND)
    for (const pz of [-0.068, 0, 0.068]) {
      const spacer = new THREE.Mesh(pinSpacerGeo, pinSpacerMat);
      spacer.position.set(0.222, 0.023, pz);
      group.add(spacer);

      const pin = new THREE.Mesh(headerPinGeo, mats.chromeSteel);
      pin.position.set(0.222, 0.068, pz);
      group.add(pin);
    }

    return { group, ledMat };
  }

  function buildDht11ThermalModule(initialLedColor: number): BreakoutModuleResult {
    const group = new THREE.Group();

    // 1. Standoffs underneath so PCB mounts flush onto chassis
    for (const [sx, sz] of [
      [-0.21, -0.09],
      [-0.21, 0.09],
      [0.21, -0.09],
      [0.21, 0.09],
    ]) {
      const standoff = new THREE.Mesh(standoffGeo, mats.goldPin);
      standoff.position.set(sx, -0.022, sz);
      group.add(standoff);
    }

    // 2. FR-4 Core + Blue DHT11 Silkscreen Mask
    const pcbCore = new THREE.Mesh(pcbCoreGeo, fr4CoreMat);
    pcbCore.castShadow = true;
    pcbCore.receiveShadow = true;
    group.add(pcbCore);

    const pcbTopMask = new THREE.Mesh(pcbMaskGeo, pcbDht11TopMat);
    pcbTopMask.rotation.x = -Math.PI / 2;
    pcbTopMask.position.y = 0.0085;
    group.add(pcbTopMask);

    // 3. 3-Pin Right-Angle Header (GND / DATA / VCC) at left (-X)
    for (const pz of [-0.062, 0, 0.062]) {
      const spacer = new THREE.Mesh(pinSpacerGeo, pinSpacerMat);
      spacer.position.set(-0.222, 0.023, pz);
      group.add(spacer);

      const vStem = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.042, 0.01)), mats.chromeSteel);
      vStem.position.set(-0.222, 0.044, pz);
      group.add(vStem);

      const hPin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.095, 0.01, 0.01)), mats.chromeSteel);
      hPin.position.set(-0.265, 0.06, pz);
      group.add(hPin);
    }

    // 4. Two 102 SMD Resistors near VCC side
    for (const rx of [-0.145, -0.088]) {
      const resBody = new THREE.Mesh(smdResGeo, smdResMat);
      resBody.position.set(rx, 0.015, 0.086);
      resBody.rotation.y = Math.PI / 2;
      group.add(resBody);
      for (const ex of [-0.018, 0.018]) {
        const endCap = new THREE.Mesh(smdEndCapGeo, mats.chromeSteel);
        endCap.position.set(rx + ex, 0.015, 0.086);
        endCap.rotation.y = Math.PI / 2;
        group.add(endCap);
      }
    }

    // 5. Domed Through-Hole Status LED near GND / Mounting Hole
    const ledMat = trackMat(
      new THREE.MeshStandardMaterial({
        color: initialLedColor,
        emissive: initialLedColor,
        emissiveIntensity: 1.0,
        roughness: 0.2,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92,
      })
    );
    const ledCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.01, 16)), ledMat);
    ledCollar.position.set(-0.092, 0.014, -0.068);
    group.add(ledCollar);

    const ledShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.036, 16)), ledMat);
    ledShaft.position.set(-0.092, 0.036, -0.068);
    group.add(ledShaft);

    const ledDome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.018, 16, 12)), ledMat);
    ledDome.position.set(-0.092, 0.054, -0.068);
    group.add(ledDome);

    // 6. Sky-Blue DHT11 Waffle-Grid Sensor Housing + Dark Inner Cavity + 4 Bent Silver Pins
    const dhtGroup = new THREE.Group();
    dhtGroup.position.set(0.078, 0.008, 0);
    group.add(dhtGroup);

    const innerCore = new THREE.Mesh(dhtInnerCoreGeo, dht11CavityMat);
    innerCore.position.y = 0.028;
    dhtGroup.add(innerCore);

    // 4 Side Walls of DHT11 Cage
    for (const wz of [-0.08, 0.08]) {
      const wLong = new THREE.Mesh(dhtWallLongGeo, dht11SkyBlueMat);
      wLong.position.set(0, 0.038, wz);
      wLong.castShadow = true;
      dhtGroup.add(wLong);
    }
    for (const wx of [-0.097, 0.097]) {
      const wShort = new THREE.Mesh(dhtWallShortGeo, dht11SkyBlueMat);
      wShort.position.set(wx, 0.038, 0);
      wShort.castShadow = true;
      dhtGroup.add(wShort);
    }

    // Perforated 4x4 Waffle Grid Top Plate
    const dhtTopGrid = new THREE.Mesh(dhtGridTopGeo, dht11SkyBlueMat);
    dhtTopGrid.position.y = 0.068;
    dhtTopGrid.castShadow = true;
    dhtGroup.add(dhtTopGrid);

    // 4 Bent Silver Metal Leads exiting front/right edge to PCB pads
    for (let i = 0; i < 4; i++) {
      const lz = -0.06 + i * 0.04;
      const hLead = new THREE.Mesh(dhtLeadHorizGeo, mats.chromeSteel);
      hLead.position.set(0.118, 0.03, lz);
      dhtGroup.add(hLead);

      const vLead = new THREE.Mesh(dhtLeadVertGeo, mats.chromeSteel);
      vLead.position.set(0.132, 0.015, lz);
      dhtGroup.add(vLead);
    }

    return { group, ledMat };
  }

  // ==========================================
  // 1. SENSOR SUARA (LM393 ELECTRET SOUND MODULE)
  // ==========================================
  const splProbeRoot = new THREE.Group();
  splProbeRoot.name = 'sensor_spl_probe';

  const standBase = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.19, 0.22, 0.05, 24)), mats.matteAbsDark);
  standBase.position.y = 0.025;
  standBase.castShadow = true;
  splProbeRoot.add(standBase);

  const standPole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.024, 0.028, 0.92, 16)), mats.chromeSteel);
  standPole.position.y = 0.48;
  splProbeRoot.add(standPole);

  const poleCollar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.042, 0.042, 0.06, 16)), mats.matteAbsDark);
  poleCollar.position.y = 0.93;
  splProbeRoot.add(poleCollar);

  const probeHeadPivot = new THREE.Group();
  probeHeadPivot.position.y = 0.97;
  splProbeRoot.add(probeHeadPivot);

  // Dark mounting cradle holding the Sound Sensor PCB tilted gently for clear visibility
  const soundBoardHolder = new THREE.Group();
  soundBoardHolder.rotation.set(0.28, 0, 0);
  probeHeadPivot.add(soundBoardHolder);

  const cradleClamp = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.028, 0.14)), mats.matteAbsDark);
  cradleClamp.position.set(0, -0.02, -0.02);
  soundBoardHolder.add(cradleClamp);

  // Blue FR-4 Sound Sensor PCB (0.28 wide in X, 0.56 long in Z)
  const soundPcbCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.018, 0.56)), fr4CoreMat);
  soundPcbCore.castShadow = true;
  soundPcbCore.receiveShadow = true;
  soundBoardHolder.add(soundPcbCore);

  const soundPcbTopMask = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(0.276, 0.556)), pcbSoundTopMat);
  soundPcbTopMask.rotation.x = -Math.PI / 2;
  soundPcbTopMask.position.y = 0.0096;
  soundBoardHolder.add(soundPcbTopMask);

  // 3-Pin Right-Angle Header (OUT / GND / VCC) extending backward (-Z)
  for (const px of [-0.072, 0, 0.072]) {
    const spacer = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.036, 0.036, 0.036)), pinSpacerMat);
    spacer.position.set(px, 0.026, -0.265);
    soundBoardHolder.add(spacer);

    const hPin = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.011, 0.011, 0.11)), mats.chromeSteel);
    hPin.position.set(px, 0.026, -0.315);
    soundBoardHolder.add(hPin);
  }

  // Two SMD LEDs (Power LED left + Trigger LED right) with + silkscreen
  const soundPowerLedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.1,
      roughness: 0.25,
    })
  );
  const soundTriggerLedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      roughness: 0.25,
    })
  );

  for (const [lx, mat] of [
    [-0.10, soundPowerLedMat],
    [0.10, soundTriggerLedMat],
  ] as const) {
    const ledBase = new THREE.Mesh(smdLedBaseGeo, mats.matteAbsLight);
    ledBase.position.set(lx, 0.014, -0.145);
    soundBoardHolder.add(ledBase);

    const ledLens = new THREE.Mesh(smdLedLensGeo, mat);
    ledLens.position.set(lx, 0.021, -0.145);
    soundBoardHolder.add(ledLens);
  }

  // Blue Square Trimmer Potentiometer (3362P) + White Cross Dial
  const potGroup = new THREE.Group();
  potGroup.position.set(-0.048, 0.048, -0.028);
  soundBoardHolder.add(potGroup);

  const potCube = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.115, 0.075, 0.115)), bluePotMat);
  potCube.castShadow = true;
  potGroup.add(potCube);

  const potDialDisc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 0.008, 20)), mats.matteAbsLight);
  potDialDisc.position.y = 0.037;
  potGroup.add(potDialDisc);

  const potCrossA = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.052, 0.01, 0.012)), mats.matteAbsDark);
  potCrossA.position.y = 0.039;
  potCrossA.rotation.y = 0.35;
  potGroup.add(potCrossA);

  const potCrossB = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.012, 0.01, 0.052)), mats.matteAbsDark);
  potCrossB.position.y = 0.039;
  potCrossB.rotation.y = 0.35;
  potGroup.add(potCrossB);

  // LM393 SOIC-8 Comparator IC + 8 Silver Gull-Wing Pins
  const lm393Group = new THREE.Group();
  lm393Group.position.set(0.072, 0.021, -0.022);
  lm393Group.rotation.y = Math.PI / 2;
  soundBoardHolder.add(lm393Group);

  const lm393Body = new THREE.Mesh(icBodyGeo, icBodyMat);
  lm393Body.castShadow = true;
  lm393Group.add(lm393Body);

  const lm393Top = new THREE.Mesh(icLabelGeo, icSoundTopMat);
  lm393Top.rotation.x = -Math.PI / 2;
  lm393Top.position.y = 0.0124;
  lm393Group.add(lm393Top);

  for (let i = 0; i < 4; i++) {
    const px = -0.028 + i * 0.0185;
    const legL = new THREE.Mesh(icPinLegGeo, mats.chromeSteel);
    legL.position.set(px, -0.005, -0.04);
    lm393Group.add(legL);

    const legR = new THREE.Mesh(icPinLegGeo, mats.chromeSteel);
    legR.position.set(px, -0.005, 0.04);
    lm393Group.add(legR);
  }

  // SMD Resistor & Capacitor Array + SOT-23 Transistor between IC and Mic
  const smdLayout: Array<{ x: number; z: number; kind: 'cap' | 'res' }> = [
    { x: -0.088, z: 0.085, kind: 'cap' },
    { x: -0.028, z: 0.085, kind: 'res' },
    { x: 0.032, z: 0.085, kind: 'res' },
    { x: 0.092, z: 0.085, kind: 'res' },
    { x: -0.088, z: 0.145, kind: 'cap' },
    { x: -0.028, z: 0.145, kind: 'res' },
    { x: 0.032, z: 0.145, kind: 'cap' },
    { x: 0.092, z: 0.145, kind: 'res' },
    { x: -0.058, z: 0.20, kind: 'cap' },
    { x: 0.058, z: 0.20, kind: 'res' },
  ];
  for (const smd of smdLayout) {
    const body = new THREE.Mesh(smd.kind === 'cap' ? smdCapGeo : smdResGeo, smd.kind === 'cap' ? mlccBodyMat : smdResMat);
    body.position.set(smd.x, 0.015, smd.z);
    body.rotation.y = Math.PI / 2;
    soundBoardHolder.add(body);

    for (const ex of [-0.018, 0.018]) {
      const cap = new THREE.Mesh(smdEndCapGeo, mats.chromeSteel);
      cap.position.set(smd.x + ex, 0.015, smd.z);
      cap.rotation.y = Math.PI / 2;
      soundBoardHolder.add(cap);
    }
  }

  // SOT-23 Transistor near pot front
  const sotBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.034, 0.014, 0.022)), icBodyMat);
  sotBody.position.set(-0.005, 0.016, 0.20);
  soundBoardHolder.add(sotBody);

  // Silver Cylindrical Electret Condenser Microphone Capsule at +Z front
  for (const lx of [-0.038, 0.038]) {
    const micLead = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.0055, 0.0055, 0.08, 8)), mats.chromeSteel);
    micLead.rotation.x = Math.PI / 2;
    micLead.position.set(lx, 0.016, 0.275);
    soundBoardHolder.add(micLead);
  }

  const electretGroup = new THREE.Group();
  electretGroup.position.set(0, 0.02, 0.355);
  soundBoardHolder.add(electretGroup);

  const electretCan = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.115, 28)), mats.brushedAluminum);
  electretCan.rotation.x = Math.PI / 2;
  electretCan.castShadow = true;
  electretGroup.add(electretCan);

  const electretRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.084, 0.008, 12, 28)), mats.chromeSteel);
  electretRim.position.z = 0.056;
  electretGroup.add(electretRim);

  const electretFelt = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.078, 0.078, 0.008, 24)), mats.acousticFoam);
  electretFelt.rotation.x = Math.PI / 2;
  electretFelt.position.z = 0.056;
  electretGroup.add(electretFelt);

  const pickupConeMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  const pickupCone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.26, 0.50, 24, 1, true)), pickupConeMat);
  pickupCone.rotation.x = -Math.PI / 2;
  pickupCone.position.z = 0.68;
  probeHeadPivot.add(pickupCone);

  tagClickable(splProbeRoot, 'sensor-spl-probe', clickables);

  // ==========================================
  // 2. SENSOR SUHU & SENSOR ARUS (PRE-AMPLIFIER)
  // ==========================================
  const preampSensorsRoot = new THREE.Group();

  // A. Thermal Probe on Transistor Q1 + External Thermal Breakout PCB Module
  const preampThermalGroup = new THREE.Group();
  preampThermalGroup.position.set(-0.08, 0.39, -0.06);
  preampSensorsRoot.add(preampThermalGroup);

  const ntcBeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.3,
      emissive: 0x78350f,
      emissiveIntensity: 0.4,
    })
  );
  const ntcBead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.048, 14, 14)), ntcBeadMat);
  preampThermalGroup.add(ntcBead);

  const preampHotspotMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    })
  );
  const preampHotspot = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.18, 18, 18)), preampHotspotMat);
  preampThermalGroup.add(preampHotspot);

  const kaptonLead = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.01, 0.01, 0.28, 8)), mats.goldPin);
  kaptonLead.position.set(-0.1, 0.08, -0.06);
  kaptonLead.rotation.z = 0.65;
  preampThermalGroup.add(kaptonLead);

  // External DHT11 Thermal Sensor Breakout PCB Module on top-right of Pre-Amp
  const preampThermalMod = buildDht11ThermalModule(0xef4444);
  const preampThermalPod = preampThermalMod.group;
  preampThermalPod.position.set(0.72, 0.84, 0.36);
  preampThermalPod.rotation.set(0.45, -0.22, 0);
  preampThermalPod.scale.setScalar(0.95);
  preampSensorsRoot.add(preampThermalPod);

  tagClickable(preampThermalGroup, 'sensor-thermal-preamp', clickables);
  tagClickable(preampThermalPod, 'sensor-thermal-preamp', clickables);

  // B. Current Sense Shunt on DC Power Rail + External ACS712 Current Sensor PCB Module
  const preampCurrentGroup = new THREE.Group();
  preampCurrentGroup.position.set(-0.62, 0.21, -0.34);
  preampSensorsRoot.add(preampCurrentGroup);

  const shuntBlock = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.09, 0.14)), mats.matteAbsLight);
  preampCurrentGroup.add(shuntBlock);

  const preampCurBarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    })
  );
  const preampCurBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.03, 0.06)), preampCurBarMat);
  preampCurBar.position.y = 0.052;
  preampCurrentGroup.add(preampCurBar);

  // External ACS712 Current Sensor Breakout PCB Module on top-left of Pre-Amp
  const preampCurrentMod = buildAcs712CurrentModule(0x22c55e);
  const preampCurrentPod = preampCurrentMod.group;
  preampCurrentPod.position.set(-0.72, 0.84, 0.36);
  preampCurrentPod.rotation.set(0.45, 0.22, 0);
  preampCurrentPod.scale.setScalar(0.95);
  preampSensorsRoot.add(preampCurrentPod);

  tagClickable(preampCurrentGroup, 'sensor-current-preamp', clickables);
  tagClickable(preampCurrentPod, 'sensor-current-preamp', clickables);

  // ==========================================
  // 3. SENSOR SUHU & SENSOR ARUS (CEILING SPEAKER)
  // ==========================================
  const speakerSensorsRoot = new THREE.Group();

  // Voice Coil / Back Can Thermal Probe
  const spkThermalGroup = new THREE.Group();
  spkThermalGroup.position.set(0.18, 0.36, 0.14);
  speakerSensorsRoot.add(spkThermalGroup);

  const spkNtcBead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.05, 14, 14)), ntcBeadMat);
  spkThermalGroup.add(spkNtcBead);

  const spkHotspotMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
  );
  const spkHotspot = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.16, 0.05, 12, 28)), spkHotspotMat);
  spkHotspot.rotation.x = Math.PI / 2;
  spkHotspot.position.set(-0.18, -0.02, -0.14);
  spkThermalGroup.add(spkHotspot);

  // External DHT11 Thermal Breakout PCB on side of Back Can
  const spkThermalMod = buildDht11ThermalModule(0xef4444);
  const spkThermalPod = spkThermalMod.group;
  spkThermalPod.position.set(0.75, 0.56, 0.16);
  spkThermalPod.rotation.set(0.45, 0.35, 0);
  spkThermalPod.scale.setScalar(0.9);
  speakerSensorsRoot.add(spkThermalPod);

  tagClickable(spkThermalGroup, 'sensor-thermal-speaker', clickables);
  tagClickable(spkThermalPod, 'sensor-thermal-speaker', clickables);

  // Speaker Line Current Sense Clamp + ACS712 Breakout PCB near Terminal (+/-)
  const spkCurrentGroup = new THREE.Group();
  spkCurrentGroup.position.set(-0.28, 0.96, 0.20);
  speakerSensorsRoot.add(spkCurrentGroup);

  const clampRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.095, 0.026, 10, 20)), mats.brushedAluminum);
  spkCurrentGroup.add(clampRing);

  const spkCurBarMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.5,
      roughness: 0.25,
    })
  );
  const spkCurBar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.045, 0.055)), spkCurBarMat);
  spkCurBar.position.y = 0.09;
  spkCurrentGroup.add(spkCurBar);

  const spkCurrentMod = buildAcs712CurrentModule(0x22c55e);
  spkCurrentMod.group.position.set(-0.34, 0.06, 0.08);
  spkCurrentMod.group.rotation.set(0.42, 0.25, 0);
  spkCurrentMod.group.scale.setScalar(0.88);
  spkCurrentGroup.add(spkCurrentMod.group);

  tagClickable(spkCurrentGroup, 'sensor-current-speaker', clickables);

  const _tempColor = new THREE.Color();
  const _targetPos = new THREE.Vector3();

  return {
    splProbeRoot,
    preampSensorsRoot,
    speakerSensorsRoot,
    clickables,
    update: ({
      elapsed,
      visible,
      isIntegrated,
      splProbeLocation,
      splListenerDistanceM,
      micCapsuleWorld,
      spkGrilleWorld,
      tempPreampC,
      tempSpeakerC,
      currentPreampMa,
      currentSpeakerMa,
      isOvercurrent,
      isClipping,
      preampExploded,
      speakerExploded,
    }) => {
      splProbeRoot.visible = visible;
      preampSensorsRoot.visible = visible;
      speakerSensorsRoot.visible = visible;
      if (!visible) return;

      // Position Virtual SPL Probe
      if (splProbeLocation === 'mic-gooseneck' && !isIntegrated) {
        splProbeRoot.position.set(micCapsuleWorld.x + 0.65, 0, micCapsuleWorld.z + 0.35);
        _targetPos.copy(micCapsuleWorld);
        probeHeadPivot.lookAt(_targetPos);
      } else if (splProbeLocation === 'mic-gooseneck' && isIntegrated) {
        splProbeRoot.position.set(micCapsuleWorld.x + 0.55, 0, micCapsuleWorld.z + 0.48);
        _targetPos.copy(micCapsuleWorld);
        probeHeadPivot.lookAt(_targetPos);
      } else {
        if (isIntegrated) {
          const offsetZ = (splListenerDistanceM - 1.0) * 0.42;
          splProbeRoot.position.set(3.1, -2.2, 0.45 + offsetZ);
          _targetPos.copy(spkGrilleWorld);
          probeHeadPivot.lookAt(_targetPos);
        } else {
          splProbeRoot.position.set(1.05, 0, 1.15 + (splListenerDistanceM - 1.0) * 0.2);
          _targetPos.copy(spkGrilleWorld);
          probeHeadPivot.lookAt(_targetPos);
        }
      }

      pickupConeMat.color.setHex(isClipping ? 0xef4444 : 0x38bdf8);
      pickupConeMat.opacity = 0.18 + 0.08 * Math.sin(elapsed * 4);

      soundTriggerLedMat.color.setHex(isClipping ? 0xef4444 : 0x38bdf8);
      soundTriggerLedMat.emissive.setHex(isClipping ? 0xef4444 : 0x38bdf8);
      soundTriggerLedMat.emissiveIntensity = isClipping ? 1.8 : 0.6 + 0.5 * Math.sin(elapsed * 5);

      // Pre-Amp Thermal & Current Probe visuals
      preampThermalGroup.position.y = 0.39 + preampExploded * 0.25;
      preampCurrentGroup.position.y = 0.21 + preampExploded * 0.25;
      preampThermalPod.position.y = 0.84 + preampExploded * 0.72;
      preampCurrentPod.position.y = 0.84 + preampExploded * 0.72;

      tempToColor(tempPreampC, 72, 92, _tempColor);
      preampHotspotMat.color.copy(_tempColor);
      preampThermalMod.ledMat.color.copy(_tempColor);
      preampThermalMod.ledMat.emissive.copy(_tempColor);
      preampThermalMod.ledMat.emissiveIntensity = tempPreampC > 72 ? 1.8 : 0.9;
      const preampHeatAlpha = Math.max(0.14, Math.min(0.7, (tempPreampC - 26) / 65));
      preampHotspotMat.opacity = preampHeatAlpha + (tempPreampC > 72 ? 0.14 * Math.sin(elapsed * 8) : 0);
      preampHotspot.scale.setScalar(0.85 + (tempPreampC - 26) / 110);

      if (currentPreampMa <= 1) {
        preampCurBarMat.emissive.setHex(0x000000);
        preampCurBarMat.emissiveIntensity = 0;
        preampCurrentMod.ledMat.emissiveIntensity = 0;
      } else {
        const curCol = currentPreampMa > 220 ? 0xef4444 : 0x22c55e;
        preampCurBarMat.color.setHex(curCol);
        preampCurBarMat.emissive.setHex(curCol);
        preampCurBarMat.emissiveIntensity = 0.5 + 0.5 * Math.sin(elapsed * (6 + currentPreampMa * 0.04));
        preampCurrentMod.ledMat.color.setHex(curCol);
        preampCurrentMod.ledMat.emissive.setHex(curCol);
        preampCurrentMod.ledMat.emissiveIntensity = 1.4;
      }

      // Speaker Thermal & Current Probe visuals
      spkThermalGroup.position.y = 0.36 + speakerExploded * 0.25;
      spkThermalPod.position.y = 0.56 + speakerExploded * 0.65;
      spkCurrentGroup.position.y = 0.96 + speakerExploded * 0.85;

      tempToColor(tempSpeakerC, 95, 120, _tempColor);
      spkHotspotMat.color.copy(_tempColor);
      spkThermalMod.ledMat.color.copy(_tempColor);
      spkThermalMod.ledMat.emissive.copy(_tempColor);
      spkThermalMod.ledMat.emissiveIntensity = tempSpeakerC > 95 ? 1.8 : 0.9;
      const spkHeatAlpha = Math.max(0.12, Math.min(0.74, (tempSpeakerC - 26) / 85));
      spkHotspotMat.opacity = spkHeatAlpha + (tempSpeakerC > 95 ? 0.16 * Math.sin(elapsed * 8) : 0);

      if (currentSpeakerMa <= 1) {
        spkCurBarMat.emissive.setHex(0x000000);
        spkCurBarMat.emissiveIntensity = 0;
        spkCurrentMod.ledMat.emissiveIntensity = 0;
      } else {
        const spkCol = isOvercurrent ? 0xef4444 : 0x38bdf8;
        spkCurBarMat.color.setHex(spkCol);
        spkCurBarMat.emissive.setHex(spkCol);
        spkCurBarMat.emissiveIntensity =
          0.4 + 0.6 * Math.sin(elapsed * (5 + Math.min(35, currentSpeakerMa * 0.025)));
        spkCurrentMod.ledMat.color.setHex(isOvercurrent ? 0xef4444 : 0x22c55e);
        spkCurrentMod.ledMat.emissive.setHex(isOvercurrent ? 0xef4444 : 0x22c55e);
        spkCurrentMod.ledMat.emissiveIntensity = 1.4;
      }
    },
    dispose: () => {
      disposableTextures.forEach((t) => t.dispose());
      disposableGeometries.forEach((g) => g.dispose());
      disposableMaterials.forEach((m) => m.dispose());
    },
  };
}
