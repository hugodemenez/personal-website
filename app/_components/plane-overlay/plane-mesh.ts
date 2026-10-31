import * as THREE from "three";

export type Trainer = {
  group: THREE.Group;
  prop: THREE.Group;
  setTheme: (scheme: "light" | "dark") => void;
};

const LIGHT = {
  skin: 0xf3eee4,
  accent: 0xea580c,
  dark: 0x2c2822,
  glass: 0x6a9bb0,
  rubber: 0x1a1816,
  metal: 0xb9b3a8,
};

const DARK = {
  skin: 0xd8d2c6,
  accent: 0xea580c,
  dark: 0x1a1814,
  glass: 0x7eb6c9,
  rubber: 0x0e0d0b,
  metal: 0x8a857c,
};

function mat(color: number, extras: THREE.MeshStandardMaterialParameters = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.12,
    roughness: 0.52,
    ...extras,
  });
}

function registrationTexture(ink: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = `#${ink.toString(16).padStart(6, "0")}`;
    ctx.font = "700 34px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F-HUGO", 128, 34);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createTrainer(): Trainer {
  const group = new THREE.Group();
  group.name = "trainer";

  const skin = mat(LIGHT.skin);
  const accent = mat(LIGHT.accent, { roughness: 0.42 });
  const dark = mat(LIGHT.dark, { roughness: 0.38, metalness: 0.22 });
  const glass = mat(LIGHT.glass, {
    transparent: true,
    opacity: 0.48,
    roughness: 0.12,
    metalness: 0.28,
  });
  const rubber = mat(LIGHT.rubber, { roughness: 0.7 });
  const metal = mat(LIGHT.metal, { metalness: 0.55, roughness: 0.28 });

  const fuse = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 1.28, 6, 14), skin);
  fuse.rotation.z = Math.PI / 2;
  fuse.position.set(0, 0.02, 0);
  group.add(fuse);

  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 10), skin);
  tailCone.rotation.z = Math.PI / 2;
  tailCone.position.set(-0.86, 0.02, 0);
  group.add(tailCone);

  const cowling = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.28, 14), accent);
  cowling.rotation.z = Math.PI / 2;
  cowling.position.set(0.72, 0.02, 0);
  group.add(cowling);

  const cabin = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), glass);
  cabin.position.set(0.12, 0.16, 0);
  cabin.scale.set(1.15, 0.72, 0.82);
  group.add(cabin);

  const wing = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.055, 0.42), skin);
  wing.position.set(0.08, 0.36, 0);
  group.add(wing);

  const wingStripe = new THREE.Mesh(new THREE.BoxGeometry(2.28, 0.02, 0.08), accent);
  wingStripe.position.set(0.08, 0.39, 0.02);
  group.add(wingStripe);

  const strutGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.38, 6);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(strutGeo, metal);
    strut.position.set(0.02, 0.16, 0);
    strut.rotation.z = side * 0.55;
    strut.position.x = side * 0.42;
    group.add(strut);
  }

  const hStab = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.22), skin);
  hStab.position.set(-0.92, 0.1, 0);
  group.add(hStab);

  const vStab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.04), skin);
  vStab.position.set(-0.94, 0.26, 0);
  group.add(vStab);

  const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.03), accent);
  rudder.position.set(-1.06, 0.26, 0);
  group.add(rudder);

  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.28, 6), metal);
    leg.position.set(0.18, -0.16, side * 0.16);
    leg.rotation.z = 0.35;
    group.add(leg);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.024, 8, 12), rubber);
    wheel.rotation.y = Math.PI / 2;
    wheel.position.set(0.26, -0.3, side * 0.18);
    group.add(wheel);
  }

  const tailLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6), metal);
  tailLeg.position.set(-0.78, -0.12, 0);
  group.add(tailLeg);
  const tailWheel = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.014, 6, 10), rubber);
  tailWheel.rotation.y = Math.PI / 2;
  tailWheel.position.set(-0.78, -0.22, 0);
  group.add(tailWheel);

  const mark = new THREE.Mesh(
    new THREE.PlaneGeometry(0.7, 0.16),
    new THREE.MeshBasicMaterial({
      map: registrationTexture(LIGHT.dark),
      transparent: true,
      depthWrite: false,
    }),
  );
  mark.rotation.x = -Math.PI / 2;
  mark.position.set(0.08, 0.392, 0);
  group.add(mark);

  const prop = new THREE.Group();
  prop.position.set(0.9, 0.02, 0);
  const spinner = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), metal);
  spinner.scale.set(1.15, 0.8, 0.8);
  prop.add(spinner);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.72, 0.08), dark);
  blade.position.set(0.02, 0, 0);
  prop.add(blade);
  const blade2 = blade.clone();
  blade2.rotation.x = Math.PI / 2;
  prop.add(blade2);
  group.add(prop);

  group.userData.hit = true;
  group.traverse((node) => {
    node.userData.hit = true;
  });

  const setTheme = (scheme: "light" | "dark") => {
    const palette = scheme === "dark" ? DARK : LIGHT;
    skin.color.setHex(palette.skin);
    accent.color.setHex(palette.accent);
    dark.color.setHex(palette.dark);
    glass.color.setHex(palette.glass);
    rubber.color.setHex(palette.rubber);
    metal.color.setHex(palette.metal);
    const next = registrationTexture(palette.dark);
    const markMat = mark.material as THREE.MeshBasicMaterial;
    markMat.map?.dispose();
    markMat.map = next;
    markMat.needsUpdate = true;
  };

  return { group, prop, setTheme };
}
