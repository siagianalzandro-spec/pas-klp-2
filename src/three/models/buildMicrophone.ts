import * as THREE from 'three';
import { PaMaterialLibrary } from '../materials';

export interface MicrophoneModelHandle {
  root: THREE.Group;
  clickables: THREE.Object3D[];
  xlrAnchor: THREE.Object3D;
  capsuleAnchor: THREE.Object3D;
  update: (params: {
    dt: number;
    elapsed: number;
    exploded: number;
    cutAway: boolean;
    windshieldAttached: boolean;
    gooseneckAngleDeg: number;
    pttActive: boolean;
    audioLevel: number;
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

export function buildMicrophoneModel(mats: PaMaterialLibrary): MicrophoneModelHandle {
  const root = new THREE.Group();
  root.name = 'pa_microphone';
  const clickables: THREE.Object3D[] = [];

  // 1. Weighted Desktop Base (Bottom-Center Pivot at y = 0)
  const baseGroup = new THREE.Group();
  root.add(baseGroup);

  // Rubber feet (4 corners)
  const footGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.04, 16);
  const footPositions: Array<[number, number]> = [
    [-0.58, -0.72],
    [0.58, -0.72],
    [-0.58, 0.72],
    [0.58, 0.72],
  ];
  for (const [fx, fz] of footPositions) {
    const foot = new THREE.Mesh(footGeo, mats.rubberSurround);
    foot.position.set(fx, 0.02, fz);
    foot.castShadow = true;
    baseGroup.add(foot);
  }

  // Lower chassis tray
  const trayShape = new THREE.Shape();
  const bw = 0.72;
  const bd = 0.88;
  const br = 0.12;
  trayShape.moveTo(-bw + br, -bd);
  trayShape.lineTo(bw - br, -bd);
  trayShape.quadraticCurveTo(bw, -bd, bw, -bd + br);
  trayShape.lineTo(bw, bd - br);
  trayShape.quadraticCurveTo(bw, bd, bw - br, bd);
  trayShape.lineTo(-bw + br, bd);
  trayShape.quadraticCurveTo(-bw, bd, -bw, bd - br);
  trayShape.lineTo(-bw, -bd + br);
  trayShape.quadraticCurveTo(-bw, -bd, -bw + br, -bd);

  const trayGeo = new THREE.ExtrudeGeometry(trayShape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  trayGeo.rotateX(-Math.PI / 2);
  const lowerTray = new THREE.Mesh(trayGeo, mats.matteAbsDark);
  lowerTray.position.y = 0.04;
  lowerTray.castShadow = true;
  lowerTray.receiveShadow = true;
  baseGroup.add(lowerTray);

  // Upper beveled console housing (lifts in Exploded, fades in Cut-Away)
  const upperShellGroup = new THREE.Group();
  root.add(upperShellGroup);

  const shellGeo = new THREE.ExtrudeGeometry(trayShape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 4,
  });
  shellGeo.rotateX(-Math.PI / 2);
  const upperShell = new THREE.Mesh(shellGeo, mats.matteAbsDark.clone());
  upperShell.position.y = 0.20;
  upperShell.castShadow = true;
  upperShell.receiveShadow = true;
  upperShellGroup.add(upperShell);

  // Brushed aluminum accent trim plate on top
  const trimGeo = new THREE.BoxGeometry(1.12, 0.03, 0.56);
  const trimPlate = new THREE.Mesh(trimGeo, mats.brushedAluminum);
  trimPlate.position.set(0, 0.445, 0.14);
  trimPlate.castShadow = true;
  upperShellGroup.add(trimPlate);

  // Monitor speaker grille slots on front-center of upper shell
  const grilleGroup = new THREE.Group();
  grilleGroup.position.set(0, 0.462, 0.14);
  for (let i = -3; i <= 3; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.014, 0.028), mats.rubberSurround);
    slot.position.z = i * 0.055;
    grilleGroup.add(slot);
  }
  upperShellGroup.add(grilleGroup);
  tagClickable(upperShell, 'mic-base-xlr', clickables);

  // 2. Interactive Red Push-to-Talk (PTT) Button
  const pttGroup = new THREE.Group();
  pttGroup.position.set(0, 0.45, 0.64);
  upperShellGroup.add(pttGroup);

  const pttBezel = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.24), mats.chromeSteel);
  pttGroup.add(pttBezel);

  const pttButtonMat = mats.pttRedButton.clone();
  const pttButton = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.07, 0.17), pttButtonMat);
  pttButton.position.y = 0.045;
  pttButton.castShadow = true;
  pttGroup.add(pttButton);
  tagClickable(pttButton, 'mic-ptt', clickables, 'toggle-ptt');

  // 3. Rear 3-Pin XLR Output Connector
  const xlrGroup = new THREE.Group();
  xlrGroup.position.set(0, 0.22, -0.92);
  baseGroup.add(xlrGroup);

  const xlrFlange = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 24), mats.chromeSteel);
  xlrFlange.rotation.x = Math.PI / 2;
  xlrGroup.add(xlrFlange);

  const xlrInsert = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.09, 24), mats.matteAbsDark);
  xlrInsert.rotation.x = Math.PI / 2;
  xlrInsert.position.z = -0.01;
  xlrGroup.add(xlrInsert);

  const pinGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.08, 10);
  const pinCoords: Array<[number, number]> = [
    [-0.045, 0.025],
    [0.045, 0.025],
    [0, -0.045],
  ];
  for (const [px, py] of pinCoords) {
    const pin = new THREE.Mesh(pinGeo, mats.goldPin);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(px, py, -0.04);
    xlrGroup.add(pin);
  }
  const xlrAnchor = new THREE.Object3D();
  xlrAnchor.position.set(0, 0, -0.08);
  xlrGroup.add(xlrAnchor);
  tagClickable(xlrGroup, 'mic-base-xlr', clickables);

  // 4. Internal Components (PCB + Monitor Speaker + Magnet)
  const internalGroup = new THREE.Group();
  root.add(internalGroup);

  // Signal Conditioning SMD PCB
  const pcbGroup = new THREE.Group();
  pcbGroup.position.set(0, 0.18, -0.22);
  internalGroup.add(pcbGroup);

  const pcbBoard = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.028, 0.52), mats.pcbFr4);
  pcbGroup.add(pcbBoard);

  // SMD Op-Amp IC & SMD passives
  const smdIc = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, 0.12), mats.rubberSurround);
  smdIc.position.set(0, 0.028, 0);
  pcbGroup.add(smdIc);

  for (let i = -2; i <= 2; i++) {
    const smdComp = new THREE.Mesh(
      new THREE.BoxGeometry(0.06, 0.022, 0.035),
      i % 2 === 0 ? mats.goldPin : mats.copperCoil
    );
    smdComp.position.set(i * 0.14, 0.022, 0.14);
    pcbGroup.add(smdComp);
  }

  // Animated Signal Pulse Bar on PCB
  const signalGlowMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.2,
    roughness: 0.3,
  });
  const signalTrace = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.012, 0.035), signalGlowMat);
  signalTrace.position.set(0, 0.022, -0.14);
  pcbGroup.add(signalTrace);
  tagClickable(pcbGroup, 'mic-pcb', clickables);

  // Internal Monitor Speaker (rear visible with permanent magnet)
  const monitorGroup = new THREE.Group();
  monitorGroup.position.set(0, 0.24, 0.24);
  internalGroup.add(monitorGroup);

  const monFrame = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.16, 0.08, 24), mats.chromeSteel);
  monFrame.position.y = 0.03;
  monitorGroup.add(monFrame);

  const monMagnet = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24), mats.ferriteMagnet);
  monMagnet.position.y = -0.04;
  monitorGroup.add(monMagnet);

  const monPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.016, 24), mats.chromeSteel);
  monPlate.position.y = -0.078;
  monitorGroup.add(monPlate);
  tagClickable(monitorGroup, 'mic-monitor-speaker', clickables);

  // 5. Gooseneck Assembly (Threaded Collar + Flexible Neck + Internal Red/Black/White Wires)
  const gooseneckBaseGroup = new THREE.Group();
  gooseneckBaseGroup.position.set(0, 0.45, -0.42);
  root.add(gooseneckBaseGroup);

  // Threaded metal collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.135, 0.16, 20), mats.chromeSteel);
  collar.position.y = 0.08;
  collar.castShadow = true;
  gooseneckBaseGroup.add(collar);

  // Lower straight rigid stem
  const stemHeight = 0.72;
  const stemOuterMat = mats.matteAbsDark.clone();
  const lowerStem = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.062, stemHeight, 18), stemOuterMat);
  lowerStem.position.y = 0.16 + stemHeight / 2;
  lowerStem.castShadow = true;
  gooseneckBaseGroup.add(lowerStem);

  // Internal triad wires inside lower stem (visible in Cut-Away / Exploded)
  const makeWire = (xOff: number, zOff: number, h: number, mat: THREE.Material) => {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, h, 8), mat);
    w.position.set(xOff, 0.16 + h / 2, zOff);
    return w;
  };
  const lowerWiresGroup = new THREE.Group();
  lowerWiresGroup.add(makeWire(-0.018, 0.01, stemHeight + 0.04, mats.wireRed));
  lowerWiresGroup.add(makeWire(0.018, 0.01, stemHeight + 0.04, mats.wireWhite));
  lowerWiresGroup.add(makeWire(0, -0.018, stemHeight + 0.04, mats.wireBlack));
  gooseneckBaseGroup.add(lowerWiresGroup);

  // Flex Elbow Pivot (bends gooseneckAngle toward user)
  const flexPivot = new THREE.Group();
  flexPivot.position.y = 0.16 + stemHeight;
  gooseneckBaseGroup.add(flexPivot);

  // Ribbed flex elbow joint
  const elbowCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0.22, 0.08),
    new THREE.Vector3(0, 0.42, 0.28),
    new THREE.Vector3(0, 0.52, 0.56),
  ]);
  const elbowTube = new THREE.Mesh(new THREE.TubeGeometry(elbowCurve, 24, 0.054, 14, false), stemOuterMat);
  elbowTube.castShadow = true;
  flexPivot.add(elbowTube);

  // Internal triad wires following the curved gooseneck
  const makeCurvedWire = (dx: number, dy: number, mat: THREE.Material) => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(dx, 0, dy),
      new THREE.Vector3(dx, 0.22 + dy, 0.08),
      new THREE.Vector3(dx, 0.42 + dy, 0.28),
      new THREE.Vector3(dx, 0.52 + dy, 0.56),
    ]);
    return new THREE.Mesh(new THREE.TubeGeometry(c, 20, 0.01, 8, false), mat);
  };
  const flexWiresGroup = new THREE.Group();
  flexWiresGroup.add(makeCurvedWire(-0.016, 0.01, mats.wireRed));
  flexWiresGroup.add(makeCurvedWire(0.016, 0.01, mats.wireWhite));
  flexWiresGroup.add(makeCurvedWire(0, -0.016, mats.wireBlack));
  flexPivot.add(flexWiresGroup);

  tagClickable(collar, 'mic-gooseneck', clickables);
  tagClickable(lowerStem, 'mic-gooseneck', clickables);
  tagClickable(elbowTube, 'mic-gooseneck', clickables);
  tagClickable(flexWiresGroup, 'mic-gooseneck', clickables);

  // 6. Microphone Capsule & Vibrating Diaphragm at tip
  const capsuleGroup = new THREE.Group();
  capsuleGroup.position.set(0, 0.52, 0.56);
  capsuleGroup.rotation.x = Math.PI * 0.42;
  flexPivot.add(capsuleGroup);

  const capsuleAnchor = new THREE.Object3D();
  capsuleAnchor.position.set(0, 0.16, 0);
  capsuleGroup.add(capsuleAnchor);

  const capsuleShellMat = mats.chromeSteel.clone();
  const capsuleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.068, 0.22, 24), capsuleShellMat);
  capsuleBody.position.y = 0.11;
  capsuleBody.castShadow = true;
  capsuleGroup.add(capsuleBody);

  // Inner capsule transducer core & vibrating diaphragm
  const transducerCore = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, 0.12, 20), mats.goldPin);
  transducerCore.position.y = 0.14;
  capsuleGroup.add(transducerCore);

  const diaphragmMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    metalness: 0.7,
    roughness: 0.25,
    emissive: 0x38bdf8,
    emissiveIntensity: 0.1,
  });
  const diaphragm = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.014, 24), diaphragmMat);
  diaphragm.position.y = 0.21;
  capsuleGroup.add(diaphragm);

  const capsuleBasket = new THREE.Mesh(
    new THREE.SphereGeometry(0.084, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    mats.perforatedGrille
  );
  capsuleBasket.position.y = 0.21;
  capsuleGroup.add(capsuleBasket);
  tagClickable(capsuleGroup, 'mic-capsule', clickables);

  // 7. Removable Acoustic Foam Windshield
  const windshieldGroup = new THREE.Group();
  capsuleGroup.add(windshieldGroup);

  const foamGeo = new THREE.CapsuleGeometry(0.145, 0.18, 12, 24);
  const foamMesh = new THREE.Mesh(foamGeo, mats.acousticFoam);
  foamMesh.position.y = 0.19;
  foamMesh.castShadow = true;
  windshieldGroup.add(foamMesh);
  tagClickable(windshieldGroup, 'mic-windshield', clickables, 'toggle-windshield');

  // Animation state
  let curExploded = 0;
  let curFlexAngle = 0;
  let curPtt = 0;
  let curWindshield = 1;

  return {
    root,
    clickables,
    xlrAnchor,
    capsuleAnchor,
    update: ({
      dt,
      elapsed,
      exploded,
      cutAway,
      windshieldAttached,
      gooseneckAngleDeg,
      pttActive,
      audioLevel,
    }) => {
      curExploded = THREE.MathUtils.damp(curExploded, exploded, 7, dt);
      const targetFlex = THREE.MathUtils.degToRad(gooseneckAngleDeg);
      curFlexAngle = THREE.MathUtils.damp(curFlexAngle, targetFlex, 8, dt);
      curPtt = THREE.MathUtils.damp(curPtt, pttActive ? 1 : 0, 14, dt);
      curWindshield = THREE.MathUtils.damp(curWindshield, windshieldAttached ? 1 : 0, 7, dt);

      // Exploded layers
      upperShellGroup.position.y = curExploded * 0.55;
      pcbGroup.position.y = 0.18 + curExploded * 0.22;
      monitorGroup.position.y = 0.24 + curExploded * 0.34;
      gooseneckBaseGroup.position.y = 0.45 + curExploded * 0.65;
      capsuleGroup.position.set(0, 0.52 + curExploded * 0.18, 0.56 + curExploded * 0.22);

      // Windshield attachment + exploded separation
      const detachedOffset = (1 - curWindshield) * 0.52 + curExploded * 0.38;
      windshieldGroup.position.y = detachedOffset;
      windshieldGroup.position.x = (1 - curWindshield) * 0.36;
      foamMesh.material.transparent = !windshieldAttached;
      foamMesh.material.opacity = THREE.MathUtils.lerp(0.32, 1.0, curWindshield);

      // Cut-away transparency on outer housings to expose internal PCB, Magnet, Wires, Capsule
      const outerOpacity = cutAway ? 0.24 : 1.0;
      const isTransparent = cutAway;
      upperShell.material.transparent = isTransparent;
      upperShell.material.opacity = outerOpacity;
      upperShell.material.depthWrite = !cutAway;

      stemOuterMat.transparent = isTransparent;
      stemOuterMat.opacity = cutAway ? 0.2 : 1.0;
      stemOuterMat.depthWrite = !cutAway;

      capsuleShellMat.transparent = isTransparent;
      capsuleShellMat.opacity = cutAway ? 0.25 : 1.0;
      capsuleShellMat.depthWrite = !cutAway;

      // Gooseneck bend
      flexPivot.rotation.x = curFlexAngle;

      // PTT button press + red LED glow
      pttButton.position.y = 0.045 - curPtt * 0.024;
      pttButtonMat.emissive.setHex(pttActive ? 0xff2222 : 0x3b0505);
      pttButtonMat.emissiveIntensity = pttActive ? 1.1 : 0.35;

      // Vibrating capsule diaphragm & PCB signal glow
      const vibAmp = pttActive ? 0.008 + audioLevel * 0.032 : 0;
      diaphragm.position.y = 0.21 + Math.sin(elapsed * 55) * vibAmp;
      diaphragmMat.emissiveIntensity = pttActive ? 0.3 + audioLevel * 1.6 : 0.05;
      signalGlowMat.emissiveIntensity = pttActive ? 0.4 + audioLevel * 2.0 : 0.1;
    },
  };
}
