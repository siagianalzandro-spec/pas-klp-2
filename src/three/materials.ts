import * as THREE from 'three';
import { ProceduralTextureSet } from './proceduralTextures';

export interface PaMaterialLibrary {
  matteAbsDark: THREE.MeshStandardMaterial;
  matteAbsLight: THREE.MeshStandardMaterial;
  brushedAluminum: THREE.MeshPhysicalMaterial;
  chromeSteel: THREE.MeshPhysicalMaterial;
  copperCoil: THREE.MeshPhysicalMaterial;
  goldPin: THREE.MeshStandardMaterial;
  ferriteMagnet: THREE.MeshStandardMaterial;
  acousticFoam: THREE.MeshStandardMaterial;
  pttRedButton: THREE.MeshPhysicalMaterial;
  rubberSurround: THREE.MeshStandardMaterial;
  paperCone: THREE.MeshStandardMaterial;
  pcbFr4: THREE.MeshStandardMaterial;
  preampFaceplate: THREE.MeshStandardMaterial;
  perforatedGrille: THREE.MeshStandardMaterial;
  wireRed: THREE.MeshStandardMaterial;
  wireBlack: THREE.MeshStandardMaterial;
  wireWhite: THREE.MeshStandardMaterial;
  ceilingTile: THREE.MeshStandardMaterial;
  ledOff: THREE.MeshStandardMaterial;
  ledOn: THREE.MeshStandardMaterial;
  cutawayTint: THREE.MeshPhysicalMaterial;
  dispose: () => void;
}

export function createPaMaterials(textures: ProceduralTextureSet, isSoftwareGl: boolean): PaMaterialLibrary {
  const matteAbsDark = new THREE.MeshStandardMaterial({
    color: 0x1a202c,
    roughness: 0.72,
    metalness: 0.08,
  });

  const matteAbsLight = new THREE.MeshStandardMaterial({
    color: 0xe6eaf0,
    roughness: 0.62,
    metalness: 0.05,
  });

  const brushedAluminum = new THREE.MeshPhysicalMaterial({
    color: 0x9aa5b4,
    map: textures.brushedMetalAlbedo,
    roughnessMap: textures.brushedMetalRoughness,
    roughness: 0.26,
    metalness: 0.92,
    anisotropy: isSoftwareGl ? 0 : 0.75,
    anisotropyRotation: Math.PI / 2,
  });

  const chromeSteel = new THREE.MeshPhysicalMaterial({
    color: 0xdbe2ea,
    roughness: 0.16,
    metalness: 0.98,
    clearcoat: 0.4,
  });

  const copperCoil = new THREE.MeshPhysicalMaterial({
    color: 0xd97736,
    roughness: 0.24,
    metalness: 0.94,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const goldPin = new THREE.MeshStandardMaterial({
    color: 0xf4c44e,
    roughness: 0.2,
    metalness: 0.96,
  });

  const ferriteMagnet = new THREE.MeshStandardMaterial({
    color: 0x2a2f38,
    roughness: 0.85,
    metalness: 0.15,
  });

  const acousticFoam = new THREE.MeshStandardMaterial({
    color: 0x1e222a,
    bumpMap: textures.acousticFoamBump,
    bumpScale: 0.025,
    roughness: 0.95,
    metalness: 0.0,
  });

  const pttRedButton = new THREE.MeshPhysicalMaterial({
    color: 0xdc2626,
    roughness: 0.34,
    metalness: 0.06,
    clearcoat: 0.55,
    emissive: 0x3b0505,
    emissiveIntensity: 0.4,
  });

  const rubberSurround = new THREE.MeshStandardMaterial({
    color: 0x15181e,
    roughness: 0.82,
    metalness: 0.04,
  });

  const paperCone = new THREE.MeshStandardMaterial({
    color: 0x2d3440,
    roughness: 0.78,
    metalness: 0.05,
    side: THREE.DoubleSide,
  });

  const pcbFr4 = new THREE.MeshStandardMaterial({
    map: textures.pcbBoardAlbedo,
    roughness: 0.44,
    metalness: 0.12,
  });

  const preampFaceplate = new THREE.MeshStandardMaterial({
    map: textures.preampFrontPlateAlbedo,
    roughness: 0.38,
    metalness: 0.65,
  });

  const perforatedGrille = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    alphaMap: textures.perforatedGrilleAlpha,
    transparent: true,
    alphaTest: 0.45,
    roughness: 0.35,
    metalness: 0.75,
    side: THREE.DoubleSide,
  });

  const wireRed = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    roughness: 0.52,
    metalness: 0.05,
  });

  const wireBlack = new THREE.MeshStandardMaterial({
    color: 0x181c24,
    roughness: 0.58,
    metalness: 0.05,
  });

  const wireWhite = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.5,
    metalness: 0.05,
  });

  const ceilingTile = new THREE.MeshStandardMaterial({
    map: textures.ceilingTileAlbedo,
    roughness: 0.9,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const ledOff = new THREE.MeshStandardMaterial({
    color: 0x144528,
    roughness: 0.25,
    metalness: 0.1,
    emissive: 0x000000,
    emissiveIntensity: 0,
  });

  const ledOn = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.2,
    metalness: 0.1,
    emissive: 0x22c55e,
    emissiveIntensity: 2.2,
  });

  const cutawayTint = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const allMats = [
    matteAbsDark,
    matteAbsLight,
    brushedAluminum,
    chromeSteel,
    copperCoil,
    goldPin,
    ferriteMagnet,
    acousticFoam,
    pttRedButton,
    rubberSurround,
    paperCone,
    pcbFr4,
    preampFaceplate,
    perforatedGrille,
    wireRed,
    wireBlack,
    wireWhite,
    ceilingTile,
    ledOff,
    ledOn,
    cutawayTint,
  ];

  return {
    matteAbsDark,
    matteAbsLight,
    brushedAluminum,
    chromeSteel,
    copperCoil,
    goldPin,
    ferriteMagnet,
    acousticFoam,
    pttRedButton,
    rubberSurround,
    paperCone,
    pcbFr4,
    preampFaceplate,
    perforatedGrille,
    wireRed,
    wireBlack,
    wireWhite,
    ceilingTile,
    ledOff,
    ledOn,
    cutawayTint,
    dispose: () => {
      allMats.forEach((m) => m.dispose());
    },
  };
}
