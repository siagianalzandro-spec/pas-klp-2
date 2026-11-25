import * as THREE from 'three';
import { PaMaterialLibrary } from '../materials';

export interface PreAmpModelHandle {
  root: THREE.Group;
  clickables: THREE.Object3D[];
  bncInAnchor: THREE.Object3D;
  bncOutAnchor: THREE.Object3D;
  update: (params: {
    dt: number;
    elapsed: number;
    exploded: number;
    cutAway: boolean;
    powerOn: boolean;
    gainPercent: number;
    audioLevel: number;
    isClipping: boolean;
  }) => void;
}

function tagClickable(obj: THREE.Object3D, annotationId: string, clickables: THREE.Object3D[], action?: string) {
  obj.traverse((child) => {
    child.layers.enable(1);
    child.userData.annotationId = annotationId;
    if (action) child.userData.interactiveAction = action;
  });
  clickables.push(obj);
}

export function buildPreAmpModel(mats: PaMaterialLibrary): PreAmpModelHandle {
  const root = new THREE.Group();
  root.name = 'pa_preamplifier';
  const clickables: THREE.Object3D[] = [];

  // 1. Chassis Bottom Tray & Rubber Feet (Bottom-Center Pivot at y = 0)
  const chassisBottom = new THREE.Group();
  root.add(chassisBottom);

  const footGeo = new THREE.CylinderGeometry(0.08, 0.09, 0.04, 16);
  for (const [fx, fz] of [
    [-0.95, -0.58],
    [0.95, -0.58],
    [-0.95, 0.58],
    [0.95, 0.58],
  ]) {
    const foot = new THREE.Mesh(footGeo, mats.rubberSurround);
    foot.position.set(fx, 0.02, fz);
    chassisBottom.add(foot);
  }

  const tray = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 1.44), mats.matteAbsDark);
  tray.position.y = 0.08;
  tray.castShadow = true;
  tray.receiveShadow = true;
  chassisBottom.add(tray);

  // Side walls (brushed aluminum)
  const sideGeo = new THREE.BoxGeometry(0.06, 0.62, 1.44);
  const leftWall = new THREE.Mesh(sideGeo, mats.brushedAluminum);
  leftWall.position.set(-1.07, 0.43, 0);
  leftWall.castShadow = true;
  chassisBottom.add(leftWall);

  const rightWall = new THREE.Mesh(sideGeo, mats.brushedAluminum);
  rightWall.position.set(1.07, 0.43, 0);
  rightWall.castShadow = true;
  chassisBottom.add(rightWall);

  const rearWall = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.62, 0.06), mats.matteAbsDark);
  rearWall.position.set(0, 0.43, -0.69);
  rearWall.castShadow = true;
  chassisBottom.add(rearWall);

  // 2. Removable / Cut-Away Top Cover
  const topCoverGroup = new THREE.Group();
  root.add(topCoverGroup);
  const topCoverMat = mats.brushedAluminum.clone();
  const topCover = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.05, 1.46), topCoverMat);
  topCover.position.set(0, 0.76, 0);
  topCover.castShadow = true;
  topCoverGroup.add(topCover);

  // Ventilation louvers on top cover
  for (let i = -3; i <= 3; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.68), mats.rubberSurround);
    vent.position.set(i * 0.22, 0.785, -0.1);
    topCoverGroup.add(vent);
  }

  // 3. Engraved Front Faceplate + Controls
  const frontPanelGroup = new THREE.Group();
  frontPanelGroup.position.set(0, 0.43, 0.71);
  root.add(frontPanelGroup);

  const faceplateMesh = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.68, 0.045), mats.preampFaceplate);
  faceplateMesh.castShadow = true;
  frontPanelGroup.add(faceplateMesh);

  // Interactive Rocker Power Switch (I / O)
  const switchHousing = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.28, 0.05), mats.matteAbsDark);
  switchHousing.position.set(-0.68, -0.02, 0.02);
  frontPanelGroup.add(switchHousing);

  const powerRockerPivot = new THREE.Group();
  powerRockerPivot.position.set(-0.68, -0.02, 0.045);
  frontPanelGroup.add(powerRockerPivot);

  const rockerMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.4, metalness: 0.1 });
  const rockerPaddle = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.06), rockerMat);
  powerRockerPivot.add(rockerPaddle);

  const rockerRedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.03, 0.065), mats.pttRedButton);
  rockerRedStrip.position.y = 0.06;
  powerRockerPivot.add(rockerRedStrip);
  tagClickable(switchHousing, 'preamp-power-switch', clickables, 'toggle-power');
  tagClickable(rockerPaddle, 'preamp-power-switch', clickables, 'toggle-power');

  // Green Power Indicator LED
  const ledGroup = new THREE.Group();
  ledGroup.position.set(-0.36, -0.02, 0.03);
  frontPanelGroup.add(ledGroup);

  const ledBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.04, 18), mats.chromeSteel);
  ledBezel.rotation.x = Math.PI / 2;
  ledGroup.add(ledBezel);

  const ledLensMat = mats.ledOff.clone();
  const ledBulb = new THREE.Mesh(new THREE.SphereGeometry(0.04, 16, 16), ledLensMat);
  ledBulb.position.z = 0.02;
  ledGroup.add(ledBulb);
  tagClickable(ledGroup, 'preamp-led', clickables);

  // Interactive Gain Rotary Knob
  const gainKnobGroup = new THREE.Group();
  gainKnobGroup.position.set(0.28, -0.03, 0.04);
  frontPanelGroup.add(gainKnobGroup);

  const knobSkirt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.04, 28), mats.matteAbsDark);
  knobSkirt.rotation.x = Math.PI / 2;
  gainKnobGroup.add(knobSkirt);

  const knobBody = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.155, 0.14, 28), mats.brushedAluminum);
  knobBody.rotation.x = Math.PI / 2;
  knobBody.position.z = 0.08;
  knobBody.castShadow = true;
  gainKnobGroup.add(knobBody);

  const knobPointer = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.11, 0.025), mats.pttRedButton);
  knobPointer.position.set(0, 0.06, 0.148);
  gainKnobGroup.add(knobPointer);
  tagClickable(gainKnobGroup, 'preamp-gain-knob', clickables, 'step-gain');

  // 4. Left Input BNC & Right Output BNC Coaxial Connectors
  const buildBnc = (sideSign: -1 | 1, annotationId: string) => {
    const g = new THREE.Group();
    g.position.set(sideSign * 1.15, 0.36, 0.12);
    g.rotation.z = sideSign * (-Math.PI / 2);
    root.add(g);

    const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 6), mats.chromeSteel);
    g.add(nut);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.16, 20), mats.chromeSteel);
    barrel.position.y = 0.10;
    g.add(barrel);

    const ptfe = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.17, 16), mats.wireWhite);
    ptfe.position.y = 0.10;
    g.add(ptfe);

    const centerPin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.20, 12), mats.goldPin);
    centerPin.position.y = 0.11;
    g.add(centerPin);

    const anchor = new THREE.Object3D();
    anchor.position.y = 0.22;
    g.add(anchor);

    tagClickable(g, annotationId, clickables);
    return { group: g, anchor };
  };

  const bncIn = buildBnc(-1, 'preamp-bnc-in');
  const bncOut = buildBnc(1, 'preamp-bnc-out');

  // 5. Internal PCB Assembly (NPN Transistor, Color Resistors, Elco/Ceramic Caps, Mechanical Potentiometer)
  const pcbGroup = new THREE.Group();
  pcbGroup.position.set(0, 0.16, 0);
  root.add(pcbGroup);

  const pcbBoard = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.04, 1.18), mats.pcbFr4);
  pcbBoard.receiveShadow = true;
  pcbGroup.add(pcbBoard);

  // Discrete NPN Transistor Q1 (TO-126 / TO-92 stylized)
  const transistorGroup = new THREE.Group();
  transistorGroup.position.set(-0.08, 0.02, -0.06);
  pcbGroup.add(transistorGroup);

  const qBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.16, 16, 1, false, 0, Math.PI),
    mats.rubberSurround
  );
  qBody.position.y = 0.14;
  qBody.castShadow = true;
  transistorGroup.add(qBody);

  const qFlat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, 0.02), mats.chromeSteel);
  qFlat.position.set(0, 0.14, 0);
  transistorGroup.add(qFlat);

  for (const lx of [-0.055, 0, 0.055]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 8), mats.chromeSteel);
    leg.position.set(lx, 0.04, 0);
    transistorGroup.add(leg);
  }
  tagClickable(transistorGroup, 'preamp-pcb-transistor', clickables);

  // Color-Banded Resistors (R1 - R4)
  const passiveGroup = new THREE.Group();
  pcbGroup.add(passiveGroup);

  const resistorMat = new THREE.MeshStandardMaterial({ color: 0xd6b88d, roughness: 0.6 });
  const bandColors = [0x78350f, 0xef4444, 0xeab308, 0xd4af37];
  const resistorSpots: Array<[number, number, number]> = [
    [-0.55, 0.06, -0.18],
    [-0.36, 0.06, 0.12],
    [0.24, 0.06, -0.26],
    [0.54, 0.06, -0.12],
  ];
  resistorSpots.forEach(([rx, ry, rz], idx) => {
    const rg = new THREE.Group();
    rg.position.set(rx, ry, rz);
    if (idx % 2 === 1) rg.rotation.y = Math.PI / 2;

    const rBody = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.18, 12), resistorMat);
    rBody.rotation.z = Math.PI / 2;
    rg.add(rBody);

    // 4 color bands
    for (let b = 0; b < 4; b++) {
      const band = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.034, 0.016, 12),
        new THREE.MeshStandardMaterial({ color: bandColors[(b + idx) % bandColors.length], roughness: 0.4 })
      );
      band.rotation.z = Math.PI / 2;
      band.position.x = -0.055 + b * 0.036;
      rg.add(band);
    }

    const lead = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.26, 8), mats.chromeSteel);
    lead.rotation.z = Math.PI / 2;
    rg.add(lead);

    passiveGroup.add(rg);
  });

  // Electrolytic Capacitors (Elco)
  const elcoMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.35, metalness: 0.2 });
  for (const [cx, cz] of [
    [-0.68, 0.18],
    [0.64, 0.24],
  ]) {
    const cap = new THREE.Group();
    cap.position.set(cx, 0.02, cz);
    const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.22, 18), elcoMat);
    cyl.position.y = 0.11;
    cyl.castShadow = true;
    cap.add(cyl);
    const topVent = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 18), mats.chromeSteel);
    topVent.position.y = 0.222;
    cap.add(topVent);
    passiveGroup.add(cap);
  }

  // Ceramic Disc Capacitors
  const ceramicMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.45 });
  for (const [cx, cz] of [
    [-0.22, -0.32],
    [0.14, 0.22],
  ]) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.025, 16), ceramicMat);
    disc.rotation.x = Math.PI / 2;
    disc.position.set(cx, 0.09, cz);
    passiveGroup.add(disc);
  }
  tagClickable(passiveGroup, 'preamp-pcb-passive', clickables);

  // Mechanical Potentiometer (synced with front Gain knob!)
  const potGroup = new THREE.Group();
  potGroup.position.set(0.28, 0.14, 0.42);
  pcbGroup.add(potGroup);

  const potCase = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.12, 20), mats.chromeSteel);
  potCase.rotation.x = Math.PI / 2;
  potGroup.add(potCase);

  const potShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 16), mats.goldPin);
  potShaft.rotation.x = Math.PI / 2;
  potShaft.position.z = 0.14;
  potGroup.add(potShaft);

  const potWiper = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.03), mats.pttRedButton);
  potWiper.position.set(0, 0.04, -0.07);
  potGroup.add(potWiper);
  tagClickable(potGroup, 'preamp-gain-knob', clickables);

  // Animated Signal Flow Bars on PCB (mV In -> Amplified Out)
  const traceInMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const traceOutMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xfbbf24,
    emissiveIntensity: 0,
    roughness: 0.3,
  });
  const traceIn = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.015, 0.04), traceInMat);
  traceIn.position.set(-0.52, 0.026, 0.02);
  pcbGroup.add(traceIn);

  const traceOut = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.015, 0.06), traceOutMat);
  traceOut.position.set(0.46, 0.026, 0.02);
  pcbGroup.add(traceOut);

  let curExploded = 0;
  let curSwitchTilt = 0;
  let curGainAngle = 0;

  return {
    root,
    clickables,
    bncInAnchor: bncIn.anchor,
    bncOutAnchor: bncOut.anchor,
    update: ({ dt, elapsed, exploded, cutAway, powerOn, gainPercent, audioLevel, isClipping }) => {
      curExploded = THREE.MathUtils.damp(curExploded, exploded, 7, dt);

      // Exploded disassembly layers
      topCoverGroup.position.y = curExploded * 0.72;
      frontPanelGroup.position.z = 0.71 + curExploded * 0.45;
      pcbGroup.position.y = 0.16 + curExploded * 0.25;
      bncIn.group.position.x = -1.15 - curExploded * 0.32;
      bncOut.group.position.x = 1.15 + curExploded * 0.32;

      // Cut-Away top cover transparency
      topCoverMat.transparent = cutAway;
      topCoverMat.opacity = cutAway ? 0.18 : 1.0;
      topCoverMat.depthWrite = !cutAway;

      // Power rocker tilt (I = top pressed in, O = bottom pressed in)
      curSwitchTilt = THREE.MathUtils.damp(curSwitchTilt, powerOn ? -0.28 : 0.28, 12, dt);
      powerRockerPivot.rotation.x = curSwitchTilt;

      // Green Power LED
      if (powerOn) {
        ledLensMat.color.setHex(0x22c55e);
        ledLensMat.emissive.setHex(0x22c55e);
        ledLensMat.emissiveIntensity = 2.2;
      } else {
        ledLensMat.color.setHex(0x144528);
        ledLensMat.emissive.setHex(0x000000);
        ledLensMat.emissiveIntensity = 0;
      }

      // Gain Knob & Mechanical Potentiometer Wiper synced rotation (-135 deg to +135 deg)
      const targetAngle = -THREE.MathUtils.degToRad(-135 + (gainPercent / 100) * 270);
      curGainAngle = THREE.MathUtils.damp(curGainAngle, targetAngle, 12, dt);
      gainKnobGroup.rotation.z = curGainAngle;
      potShaft.rotation.y = -curGainAngle;
      potWiper.position.set(Math.sin(-curGainAngle) * 0.05, Math.cos(-curGainAngle) * 0.05, -0.07);
      potWiper.rotation.z = curGainAngle;

      // PCB Signal Flow Glow
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 12);
      if (powerOn) {
        traceInMat.emissiveIntensity = 0.15 + audioLevel * 1.4 * pulse;
        traceOutMat.color.setHex(isClipping ? 0xef4444 : 0xfbbf24);
        traceOutMat.emissive.setHex(isClipping ? 0xef4444 : 0xfbbf24);
        traceOutMat.emissiveIntensity = 0.2 + audioLevel * (0.6 + (gainPercent / 100) * 1.8);
      } else {
        traceInMat.emissiveIntensity = 0;
        traceOutMat.emissiveIntensity = 0;
      }
    },
  };
}
