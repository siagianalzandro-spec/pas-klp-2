import * as THREE from 'three';
import { CrossoverMode } from '../../types/paSystem';
import { PaMaterialLibrary } from '../materials';

export interface CeilingSpeakerModelHandle {
  root: THREE.Group;
  clickables: THREE.Object3D[];
  terminalAnchor: THREE.Object3D;
  grilleWorldDir: THREE.Object3D;
  update: (params: {
    dt: number;
    elapsed: number;
    exploded: number;
    cutAway: boolean;
    grilleRemoved: boolean;
    ceilingMountProgress: number;
    crossoverMode: CrossoverMode;
    backCanDamping: boolean;
    polarityReversed: boolean;
    showCeilingBoard: boolean;
    audioLevel: number;
    isSignalActive: boolean;
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

export function buildCeilingSpeakerModel(mats: PaMaterialLibrary): CeilingSpeakerModelHandle {
  const root = new THREE.Group();
  root.name = 'pa_ceiling_speaker';
  const clickables: THREE.Object3D[] = [];

  // Note: Local origin (0, 0, 0) is the ceiling plane!
  // Facing downward (-Y) is the room side (Grille & Rim); upward (+Y) is inside ceiling plenum (Back Can, Magnet, Terminal).

  // 1. Virtual Acoustic Ceiling Tile with Cutout Hole
  const ceilingBoardGroup = new THREE.Group();
  root.add(ceilingBoardGroup);

  const tileShape = new THREE.Shape();
  tileShape.moveTo(-1.35, -1.35);
  tileShape.lineTo(1.35, -1.35);
  tileShape.lineTo(1.35, 1.35);
  tileShape.lineTo(-1.35, 1.35);
  tileShape.closePath();

  const cutoutHole = new THREE.Path();
  cutoutHole.absarc(0, 0, 0.72, 0, Math.PI * 2, true);
  tileShape.holes.push(cutoutHole);

  const tileGeo = new THREE.ExtrudeGeometry(tileShape, {
    depth: 0.08,
    bevelEnabled: false,
    curveSegments: 36,
  });
  tileGeo.rotateX(Math.PI / 2);
  const ceilingBoardMat = mats.ceilingTile.clone();
  const ceilingBoard = new THREE.Mesh(tileGeo, ceilingBoardMat);
  ceilingBoard.position.y = 0.08;
  ceilingBoard.receiveShadow = true;
  ceilingBoardGroup.add(ceilingBoard);

  // 2. ABS Baffle Frame & Rim (sits flush under ceiling at y = 0)
  const frameGroup = new THREE.Group();
  root.add(frameGroup);

  const rimGeo = new THREE.RingGeometry(0.62, 0.86, 48);
  rimGeo.rotateX(Math.PI / 2);
  const rimMesh = new THREE.Mesh(rimGeo, mats.matteAbsLight);
  rimMesh.position.y = -0.012;
  frameGroup.add(rimMesh);

  const baffleSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.71, 0.71, 0.18, 36, 1, true),
    mats.matteAbsLight
  );
  baffleSleeve.position.y = 0.08;
  frameGroup.add(baffleSleeve);

  // 3x Dog-Ear Mounting Clamps + Locking Screws
  const clampAssemblies: Array<{ screw: THREE.Mesh; wingPivot: THREE.Group }> = [];
  for (let i = 0; i < 3; i++) {
    const ang = (i * Math.PI * 2) / 3 + Math.PI / 6;
    const clampHolder = new THREE.Group();
    clampHolder.rotation.y = ang;
    frameGroup.add(clampHolder);

    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.36, 12), mats.chromeSteel);
    screw.position.set(0.75, 0.16, 0);
    clampHolder.add(screw);

    const screwHead = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 12), mats.chromeSteel);
    screwHead.position.y = -0.18;
    screw.add(screwHead);

    const wingPivot = new THREE.Group();
    wingPivot.position.set(0.75, 0.28, 0);
    clampHolder.add(wingPivot);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.045, 0.11), mats.pttRedButton);
    wing.position.x = 0.08;
    wingPivot.add(wing);

    clampAssemblies.push({ screw, wingPivot });
  }
  tagClickable(frameGroup, 'spk-clamp', clickables);

  // 3. Perforated Front Grille (detachable downward)
  const grilleGroup = new THREE.Group();
  root.add(grilleGroup);

  const grilleDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.02, 40), mats.perforatedGrille);
  grilleDisk.position.y = -0.035;
  grilleDisk.castShadow = true;
  grilleGroup.add(grilleDisk);

  const grilleRing = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.022, 12, 48), mats.matteAbsLight);
  grilleRing.rotation.x = Math.PI / 2;
  grilleRing.position.y = -0.03;
  grilleGroup.add(grilleRing);
  tagClickable(grilleGroup, 'spk-grille', clickables, 'toggle-grille');

  const grilleWorldDir = new THREE.Object3D();
  grilleWorldDir.position.set(0, -0.05, 0);
  root.add(grilleWorldDir);

  // 4. Driver Basket, Cone/Diaphragm, Voice Coil, Permanent Magnet
  const driverGroup = new THREE.Group();
  root.add(driverGroup);

  // Steel speaker basket ribs (4 legs)
  for (let i = 0; i < 4; i++) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.36, 0.03), mats.matteAbsDark);
    const a = (i * Math.PI) / 2;
    leg.position.set(Math.cos(a) * 0.42, 0.16, Math.sin(a) * 0.42);
    leg.rotation.y = -a;
    leg.rotation.z = 0.45;
    driverGroup.add(leg);
  }

  // Permanent Ferrite Magnet + Pole Piece + Yoke
  const magnetGroup = new THREE.Group();
  magnetGroup.position.y = 0.42;
  driverGroup.add(magnetGroup);

  const topPlate = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.035, 32), mats.chromeSteel);
  topPlate.position.y = -0.06;
  magnetGroup.add(topPlate);

  const ferriteRing = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.11, 32), mats.ferriteMagnet);
  magnetGroup.add(ferriteRing);

  const backYoke = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 32), mats.chromeSteel);
  backYoke.position.y = 0.075;
  magnetGroup.add(backYoke);

  const polePiece = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.18, 24), mats.chromeSteel);
  polePiece.position.y = -0.01;
  magnetGroup.add(polePiece);

  // Magnetic Flux Field Torus Rings (visible in Cut-Away)
  const fluxRingMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    wireframe: true,
  });
  const fluxRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.055, 8, 24), fluxRingMat);
  fluxRing.rotation.x = Math.PI / 2;
  fluxRing.position.y = -0.05;
  magnetGroup.add(fluxRing);

  // Moving Cone / Diaphragm + Copper Voice Coil
  const coneGroup = new THREE.Group();
  driverGroup.add(coneGroup);

  const coneProfile = [
    new THREE.Vector2(0.12, 0.24),
    new THREE.Vector2(0.32, 0.10),
    new THREE.Vector2(0.56, 0.02),
  ];
  const coneGeo = new THREE.LatheGeometry(coneProfile, 36);
  const coneMesh = new THREE.Mesh(coneGeo, mats.paperCone);
  coneMesh.castShadow = true;
  coneGroup.add(coneMesh);

  const surround = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.04, 14, 36), mats.rubberSurround);
  surround.rotation.x = Math.PI / 2;
  surround.position.y = 0.015;
  coneGroup.add(surround);

  const dustCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.125, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.48),
    mats.matteAbsDark
  );
  dustCap.rotation.x = Math.PI;
  dustCap.position.y = 0.23;
  coneGroup.add(dustCap);

  // Copper Voice Coil wound on bobbin inside magnet gap
  const voiceCoilMat = mats.copperCoil.clone();
  const voiceCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 28, 1, true), voiceCoilMat);
  voiceCoil.position.y = 0.34;
  coneGroup.add(voiceCoil);

  tagClickable(coneMesh, 'spk-cone', clickables);
  tagClickable(surround, 'spk-cone', clickables);
  tagClickable(voiceCoil, 'spk-voice-coil', clickables);
  tagClickable(magnetGroup, 'spk-voice-coil', clickables);

  // 5. Passive Crossover Network PCB (1-Way vs 2-Way)
  const crossoverGroup = new THREE.Group();
  crossoverGroup.position.set(0.34, 0.58, 0);
  root.add(crossoverGroup);

  const xoBoard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.024, 0.28), mats.pcbFr4);
  crossoverGroup.add(xoBoard);

  // 1-Way bypass jumper wire
  const oneWayJumper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.025), mats.goldPin);
  oneWayJumper.position.y = 0.022;
  crossoverGroup.add(oneWayJumper);

  // 2-Way RLC filter components (Inductor, Yellow Capacitor, Ceramic Resistor)
  const twoWayParts = new THREE.Group();
  crossoverGroup.add(twoWayParts);

  const xoInductor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.07, 20), mats.copperCoil);
  xoInductor.position.set(-0.08, 0.05, 0);
  twoWayParts.add(xoInductor);

  const xoCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.032, 0.032, 0.13, 14),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 })
  );
  xoCap.rotation.z = Math.PI / 2;
  xoCap.position.set(0.07, 0.045, -0.05);
  twoWayParts.add(xoCap);

  const xoRes = new THREE.Mesh(
    new THREE.BoxGeometry(0.13, 0.04, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 })
  );
  xoRes.position.set(0.07, 0.035, 0.06);
  twoWayParts.add(xoRes);
  tagClickable(crossoverGroup, 'spk-crossover', clickables);

  // 6. Fire-Rated Steel Back Can / Housing
  const backCanGroup = new THREE.Group();
  root.add(backCanGroup);

  const backCanMat = mats.matteAbsDark.clone();
  backCanMat.side = THREE.DoubleSide;
  const fullCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.78, 36, 1, false, 0, Math.PI * 2),
    backCanMat
  );
  fullCan.position.y = 0.48;
  fullCan.castShadow = true;
  backCanGroup.add(fullCan);

  // Cut-away half shell shown when cutAway === true
  const cutCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.68, 0.68, 0.78, 32, 1, false, Math.PI * 0.55, Math.PI * 1.15),
    backCanMat
  );
  cutCan.position.y = 0.48;
  cutCan.visible = false;
  backCanGroup.add(cutCan);

  // Internal acoustic foam damping pad inside Back Can
  const dampingLiner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.65, 0.66, 28, 1, true, Math.PI * 0.6, Math.PI * 1.05),
    mats.acousticFoam
  );
  dampingLiner.position.y = 0.48;
  backCanGroup.add(dampingLiner);
  tagClickable(backCanGroup, 'spk-backcan', clickables);

  // 7. Terminal Input (+/-) & Internal Red/Black Wires
  const terminalGroup = new THREE.Group();
  terminalGroup.position.set(-0.28, 0.90, 0);
  root.add(terminalGroup);

  const termBlock = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.16), mats.matteAbsLight);
  terminalGroup.add(termBlock);

  const posPost = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 14), mats.wireRed);
  posPost.position.set(-0.07, 0.06, 0);
  terminalGroup.add(posPost);

  const negPost = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.09, 14), mats.wireBlack);
  negPost.position.set(0.07, 0.06, 0);
  terminalGroup.add(negPost);

  // Internal red & black leads descending to voice coil
  const leadRed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 8), mats.wireRed);
  leadRed.position.set(0.06, -0.28, 0.04);
  leadRed.rotation.z = -0.35;
  terminalGroup.add(leadRed);

  const leadBlack = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 8), mats.wireBlack);
  leadBlack.position.set(0.14, -0.28, -0.04);
  leadBlack.rotation.z = -0.22;
  terminalGroup.add(leadBlack);

  const terminalAnchor = new THREE.Object3D();
  terminalAnchor.position.set(0, 0.08, 0);
  terminalGroup.add(terminalAnchor);
  tagClickable(terminalGroup, 'spk-terminal', clickables);

  let curExploded = 0;
  let curGrille = 0;
  let curMount = 1;

  return {
    root,
    clickables,
    terminalAnchor,
    grilleWorldDir,
    update: ({
      dt,
      elapsed,
      exploded,
      cutAway,
      grilleRemoved,
      ceilingMountProgress,
      crossoverMode,
      backCanDamping,
      polarityReversed,
      showCeilingBoard,
      audioLevel,
      isSignalActive,
    }) => {
      curExploded = THREE.MathUtils.damp(curExploded, exploded, 7, dt);
      curGrille = THREE.MathUtils.damp(curGrille, grilleRemoved ? 1 : 0, 8, dt);
      curMount = THREE.MathUtils.damp(curMount, ceilingMountProgress, 8, dt);

      ceilingBoardGroup.visible = showCeilingBoard;
      ceilingBoardMat.transparent = cutAway || curExploded > 0.05;
      ceilingBoardMat.opacity = cutAway ? 0.35 : 1.0 - curExploded * 0.45;

      // Exploded layers along Y axis
      grilleGroup.position.y = -(curGrille * 0.42 + curExploded * 0.55);
      frameGroup.position.y = -(curExploded * 0.16);
      driverGroup.position.y = curExploded * 0.25;
      crossoverGroup.position.y = 0.58 + curExploded * 0.45;
      backCanGroup.position.y = curExploded * 0.65;
      terminalGroup.position.y = 0.90 + curExploded * 0.85;

      // Dog-Ear Clamp Screw & Wing Kinematics
      clampAssemblies.forEach(({ screw, wingPivot }) => {
        screw.rotation.y = curMount * Math.PI * 6;
        // As mount progresses 0 -> 1: wing pivots out 90° and drops down to grip ceiling tile (y = 0.08)
        wingPivot.rotation.y = curMount * (Math.PI * 0.5);
        wingPivot.position.y = THREE.MathUtils.lerp(0.28, 0.105, curMount);
      });

      // Cut-Away Back Can half-section
      fullCan.visible = !cutAway;
      cutCan.visible = cutAway;
      dampingLiner.visible = backCanDamping;
      fluxRing.visible = cutAway || curExploded > 0.15;

      // 1-Way vs 2-Way Crossover visuals
      oneWayJumper.visible = crossoverMode === '1-way';
      twoWayParts.visible = crossoverMode === '2-way';

      // Polarity visual feedback on binding posts
      posPost.position.x = polarityReversed ? 0.07 : -0.07;
      negPost.position.x = polarityReversed ? -0.07 : 0.07;

      // Real-time Voice Coil & Cone excursion when audio signal plays
      const disp = isSignalActive ? Math.sin(elapsed * 42) * (0.008 + audioLevel * 0.048) : 0;
      coneGroup.position.y = disp;
      voiceCoilMat.emissive.setHex(isSignalActive ? 0xf59e0b : 0x000000);
      voiceCoilMat.emissiveIntensity = isSignalActive ? 0.25 + audioLevel * 1.4 : 0;
    },
  };
}
