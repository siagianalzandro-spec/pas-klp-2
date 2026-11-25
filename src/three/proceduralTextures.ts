import * as THREE from 'three';

export interface ProceduralTextureSet {
  brushedMetalAlbedo: THREE.CanvasTexture;
  brushedMetalRoughness: THREE.CanvasTexture;
  acousticFoamBump: THREE.CanvasTexture;
  perforatedGrilleAlpha: THREE.CanvasTexture;
  pcbBoardAlbedo: THREE.CanvasTexture;
  preampFrontPlateAlbedo: THREE.CanvasTexture;
  ceilingTileAlbedo: THREE.CanvasTexture;
  contactShadowTexture: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Brushed Anodized Aluminum
  const metalCanvas = document.createElement('canvas');
  metalCanvas.width = 512;
  metalCanvas.height = 512;
  const mctx = metalCanvas.getContext('2d')!;
  mctx.fillStyle = '#8b95a3';
  mctx.fillRect(0, 0, 512, 512);
  for (let y = 0; y < 512; y++) {
    const shade = 128 + Math.floor((Math.random() - 0.5) * 28);
    mctx.fillStyle = `rgb(${shade},${shade + 4},${shade + 10})`;
    mctx.fillRect(0, y, 512, 1);
  }
  const brushedMetalAlbedo = new THREE.CanvasTexture(metalCanvas);
  brushedMetalAlbedo.colorSpace = THREE.SRGBColorSpace;
  brushedMetalAlbedo.wrapS = THREE.RepeatWrapping;
  brushedMetalAlbedo.wrapT = THREE.RepeatWrapping;
  brushedMetalAlbedo.anisotropy = maxAnisotropy;

  // Brushed metal roughness map (linear NoColorSpace)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rctx = roughCanvas.getContext('2d')!;
  rctx.fillStyle = '#555555';
  rctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y++) {
    const val = 70 + Math.floor(Math.random() * 55);
    rctx.fillStyle = `rgb(${val},${val},${val})`;
    rctx.fillRect(0, y, 256, 1);
  }
  const brushedMetalRoughness = new THREE.CanvasTexture(roughCanvas);
  brushedMetalRoughness.colorSpace = THREE.NoColorSpace;
  brushedMetalRoughness.wrapS = THREE.RepeatWrapping;
  brushedMetalRoughness.wrapT = THREE.RepeatWrapping;

  // 2. Open-Cell Acoustic Foam Bump Map
  const foamCanvas = document.createElement('canvas');
  foamCanvas.width = 256;
  foamCanvas.height = 256;
  const fctx = foamCanvas.getContext('2d')!;
  fctx.fillStyle = '#606060';
  fctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const r = 0.8 + Math.random() * 2.2;
    const v = Math.random() > 0.4 ? 30 : 185;
    fctx.fillStyle = `rgb(${v},${v},${v})`;
    fctx.beginPath();
    fctx.arc(x, y, r, 0, Math.PI * 2);
    fctx.fill();
  }
  const acousticFoamBump = new THREE.CanvasTexture(foamCanvas);
  acousticFoamBump.colorSpace = THREE.NoColorSpace;
  acousticFoamBump.wrapS = THREE.RepeatWrapping;
  acousticFoamBump.wrapT = THREE.RepeatWrapping;
  acousticFoamBump.repeat.set(3, 3);

  // 3. Perforated Hexagonal Grille Alpha Map
  const grilleCanvas = document.createElement('canvas');
  grilleCanvas.width = 512;
  grilleCanvas.height = 512;
  const gctx = grilleCanvas.getContext('2d')!;
  gctx.fillStyle = '#ffffff';
  gctx.fillRect(0, 0, 512, 512);
  gctx.fillStyle = '#000000';
  const stepX = 16;
  const stepY = 14;
  for (let row = 0; row < 512 / stepY + 2; row++) {
    for (let col = 0; col < 512 / stepX + 2; col++) {
      const cx = col * stepX + (row % 2 === 1 ? stepX * 0.5 : 0);
      const cy = row * stepY;
      gctx.beginPath();
      gctx.arc(cx, cy, 4.9, 0, Math.PI * 2);
      gctx.fill();
    }
  }
  const perforatedGrilleAlpha = new THREE.CanvasTexture(grilleCanvas);
  perforatedGrilleAlpha.colorSpace = THREE.NoColorSpace;
  perforatedGrilleAlpha.wrapS = THREE.RepeatWrapping;
  perforatedGrilleAlpha.wrapT = THREE.RepeatWrapping;
  perforatedGrilleAlpha.repeat.set(3.5, 3.5);
  perforatedGrilleAlpha.anisotropy = maxAnisotropy;

  // 4. PCB FR4 Solder Mask & Copper Traces
  const pcbCanvas = document.createElement('canvas');
  pcbCanvas.width = 1024;
  pcbCanvas.height = 512;
  const pctx = pcbCanvas.getContext('2d')!;
  pctx.fillStyle = '#0f4c3a';
  pctx.fillRect(0, 0, 1024, 512);
  // Subtle fiberglass weave grid
  pctx.strokeStyle = 'rgba(255,255,255,0.035)';
  pctx.lineWidth = 1;
  for (let i = 0; i < 1024; i += 16) {
    pctx.beginPath();
    pctx.moveTo(i, 0);
    pctx.lineTo(i, 512);
    pctx.stroke();
  }
  for (let j = 0; j < 512; j += 16) {
    pctx.beginPath();
    pctx.moveTo(0, j);
    pctx.lineTo(1024, j);
    pctx.stroke();
  }
  // Copper trace paths under solder mask
  pctx.strokeStyle = '#1d7a5c';
  pctx.lineWidth = 7;
  pctx.lineCap = 'round';
  pctx.lineJoin = 'round';
  const traces = [
    [[70, 256], [190, 256], [240, 190], [420, 190], [490, 256], [690, 256], [760, 210], [950, 210]],
    [[70, 310], [190, 310], [260, 360], [540, 360], [640, 300], [950, 300]],
    [[340, 190], [340, 100], [620, 100], [620, 256]],
    [[480, 256], [480, 420], [820, 420], [820, 300]],
  ];
  for (const path of traces) {
    pctx.beginPath();
    path.forEach(([x, y], idx) => {
      if (idx === 0) pctx.moveTo(x, y);
      else pctx.lineTo(x, y);
    });
    pctx.stroke();
  }
  // Gold solder pads
  const pads = [
    [190, 256], [340, 190], [490, 256], [620, 256], [690, 256], [760, 210],
    [260, 360], [540, 360], [480, 420], [820, 300],
  ];
  for (const [px, py] of pads) {
    pctx.fillStyle = '#d4af37';
    pctx.beginPath();
    pctx.arc(px, py, 10, 0, Math.PI * 2);
    pctx.fill();
    pctx.fillStyle = '#071b15';
    pctx.beginPath();
    pctx.arc(px, py, 4, 0, Math.PI * 2);
    pctx.fill();
  }
  // Silkscreen markings
  pctx.fillStyle = '#e2e8f0';
  pctx.font = 'bold 20px monospace';
  pctx.fillText('MIC_IN (mV)', 48, 225);
  pctx.fillText('Q1 NPN', 460, 155);
  pctx.fillText('C1  R1  R2', 265, 165);
  pctx.fillText('RV1 GAIN POT', 610, 150);
  pctx.fillText('LINE_OUT', 835, 185);
  const pcbBoardAlbedo = new THREE.CanvasTexture(pcbCanvas);
  pcbBoardAlbedo.colorSpace = THREE.SRGBColorSpace;
  pcbBoardAlbedo.anisotropy = maxAnisotropy;

  // 5. Pre-Amplifier Front Panel Engraved Plate
  const plateCanvas = document.createElement('canvas');
  plateCanvas.width = 1024;
  plateCanvas.height = 384;
  const fpctx = plateCanvas.getContext('2d')!;
  fpctx.fillStyle = '#1b2330';
  fpctx.fillRect(0, 0, 1024, 384);
  // Subtle brushed lines
  for (let y = 0; y < 384; y += 2) {
    fpctx.fillStyle = y % 4 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
    fpctx.fillRect(0, y, 1024, 1);
  }
  // Outer technical border line
  fpctx.strokeStyle = '#475569';
  fpctx.lineWidth = 4;
  fpctx.strokeRect(20, 20, 984, 344);

  fpctx.fillStyle = '#e2e8f0';
  fpctx.font = 'bold 28px sans-serif';
  fpctx.textAlign = 'center';
  fpctx.fillText('PA PRE-AMPLIFIER  ·  PENGUAT AWAL SINYAL', 512, 66);

  // Power label
  fpctx.font = 'bold 22px monospace';
  fpctx.fillStyle = '#cbd5e1';
  fpctx.fillText('POWER', 180, 128);
  fpctx.font = 'bold 18px monospace';
  fpctx.fillText('I  /  O', 180, 286);

  // LED label
  fpctx.fillStyle = '#94a3b8';
  fpctx.fillText('PWR LED', 330, 265);

  // Gain Dial markings around (640, 210)
  const cx = 640;
  const cy = 208;
  fpctx.fillStyle = '#e2e8f0';
  fpctx.font = 'bold 22px monospace';
  fpctx.fillText('GAIN', cx, 106);

  for (let i = 0; i <= 10; i++) {
    const ang = ((-135 + i * 27) * Math.PI) / 180 - Math.PI / 2;
    const r1 = 68;
    const r2 = i % 2 === 0 ? 84 : 77;
    fpctx.strokeStyle = i >= 8 ? '#f87171' : '#94a3b8';
    fpctx.lineWidth = i % 2 === 0 ? 3 : 2;
    fpctx.beginPath();
    fpctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
    fpctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
    fpctx.stroke();
  }
  fpctx.font = 'bold 18px monospace';
  fpctx.fillStyle = '#cbd5e1';
  fpctx.fillText('MIN', cx - 84, cy + 88);
  fpctx.fillStyle = '#f87171';
  fpctx.fillText('MAX', cx + 84, cy + 88);

  // Input / Output hints
  fpctx.fillStyle = '#38bdf8';
  fpctx.font = 'bold 18px monospace';
  fpctx.fillText('← BNC IN (mV)', 130, 340);
  fpctx.fillStyle = '#fbbf24';
  fpctx.fillText('BNC OUT (LINE) →', 880, 340);

  const preampFrontPlateAlbedo = new THREE.CanvasTexture(plateCanvas);
  preampFrontPlateAlbedo.colorSpace = THREE.SRGBColorSpace;
  preampFrontPlateAlbedo.anisotropy = maxAnisotropy;

  // 6. Ceiling Acoustic Mineral Tile Texture
  const tileCanvas = document.createElement('canvas');
  tileCanvas.width = 512;
  tileCanvas.height = 512;
  const tctx = tileCanvas.getContext('2d')!;
  tctx.fillStyle = '#d8dde3';
  tctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    tctx.fillStyle = Math.random() > 0.5 ? 'rgba(100,116,139,0.22)' : 'rgba(255,255,255,0.25)';
    tctx.fillRect(x, y, 2, 2);
  }
  // Acoustic tile grid seams
  tctx.strokeStyle = '#94a3b8';
  tctx.lineWidth = 4;
  tctx.strokeRect(2, 2, 508, 508);
  const ceilingTileAlbedo = new THREE.CanvasTexture(tileCanvas);
  ceilingTileAlbedo.colorSpace = THREE.SRGBColorSpace;
  ceilingTileAlbedo.wrapS = THREE.RepeatWrapping;
  ceilingTileAlbedo.wrapT = THREE.RepeatWrapping;
  ceilingTileAlbedo.repeat.set(3, 3);
  ceilingTileAlbedo.anisotropy = maxAnisotropy;

  // 7. Radial Contact Shadow Texture
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 256;
  shadowCanvas.height = 256;
  const sctx = shadowCanvas.getContext('2d')!;
  const grad = sctx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.28)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, 256, 256);
  const contactShadowTexture = new THREE.CanvasTexture(shadowCanvas);
  contactShadowTexture.colorSpace = THREE.NoColorSpace;

  return {
    brushedMetalAlbedo,
    brushedMetalRoughness,
    acousticFoamBump,
    perforatedGrilleAlpha,
    pcbBoardAlbedo,
    preampFrontPlateAlbedo,
    ceilingTileAlbedo,
    contactShadowTexture,
    dispose: () => {
      brushedMetalAlbedo.dispose();
      brushedMetalRoughness.dispose();
      acousticFoamBump.dispose();
      perforatedGrilleAlpha.dispose();
      pcbBoardAlbedo.dispose();
      preampFrontPlateAlbedo.dispose();
      ceilingTileAlbedo.dispose();
      contactShadowTexture.dispose();
    },
  };
}
