import * as THREE from "three";

/**
 * Anatomy-faithful 3D trainer.
 *
 * Blender is not on this VM. Geometry is reconstructed from the original
 * Anatomy SVG kit (`components/figures/plane/parts.ts` at 57539b4): world
 * +X nose, +Y span, +Z up, remapped to Three.js (+X span, +Y up, +Z nose).
 *
 * Faces are painted with the kit's paper tones, quantized by the same
 * `bandOf` / `lightOf` rules as `components/iso/lathe.ts`. This is a
 * brochure solid, not a Lambert-shaded toy Cessna.
 */
export const ANATOMY = {
  nose: 62,
  propR: 17,
  span: 75,
  wingZ: 34,
  wingX0: -6,
  chord: 26,
} as const;

export const MODEL_SPAN = ANATOMY.span * 2;

export const PAPER = {
  light: {
    paper: 0xfbfbfa,
    face: 0xffffff,
    top: 0xffffff,
    shade0: 0xdcdcd9,
    shade1: 0xe5e5e2,
    shade2: 0xededea,
    shade3: 0xf4f4f1,
    ink: 0x26262a,
    mid: 0x8a8a8f,
    lo: 0xb4b4b8,
    faint: 0xd4d4d6,
    dot: 0x3a3a3e,
  },
  dark: {
    paper: 0x131313,
    face: 0x1b1b1b,
    top: 0x1c1c1c,
    shade0: 0x0f0f0f,
    shade1: 0x121212,
    shade2: 0x151515,
    shade3: 0x181818,
    ink: 0xd4d4d4,
    mid: 0x6a6a6a,
    lo: 0x3e3e3e,
    faint: 0x2a2a2a,
    dot: 0xe6e6e6,
  },
} as const;

export type AnatomyPlane = {
  group: THREE.Group;
  prop: THREE.Group;
  setTheme: (scheme: "light" | "dark") => void;
};

type Palette = (typeof PAPER)[keyof typeof PAPER];

const BANDS = [0, 0.2, 0.42, 0.62];
const ISO_AZIMUTH = 38 * (Math.PI / 180);

function foil(c: number, t: number): Array<[number, number]> {
  return [
    [0, 0],
    [c * 0.08, t * 0.7],
    [c * 0.3, t],
    [c * 0.7, t * 0.6],
    [c, 0],
    [c * 0.6, -t * 0.15],
    [c * 0.2, -t * 0.25],
  ];
}

function bandOf(score: number) {
  let tone = 0;
  while (tone < BANDS.length && score >= BANDS[tone]) tone += 1;
  return tone;
}

/** Anatomy `lightOf` remapped into Three.js. */
function kitLight() {
  return new THREE.Vector3(Math.cos(ISO_AZIMUTH), 1.2, -Math.sin(ISO_AZIMUTH)).normalize();
}

function facet(geometry: THREE.BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  flat.computeVertexNormals();
  return flat;
}

function paintBands(geometry: THREE.BufferGeometry, palette: Palette) {
  const position = geometry.getAttribute("position");
  const colors = new Float32Array(position.count * 3);
  const shades = [palette.shade0, palette.shade1, palette.shade2, palette.shade3, palette.top];
  const light = kitLight();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const rgb = new THREE.Color();
  for (let i = 0; i < position.count; i += 3) {
    a.fromBufferAttribute(position, i);
    b.fromBufferAttribute(position, i + 1);
    c.fromBufferAttribute(position, i + 2);
    normal.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    rgb.setHex(shades[bandOf(normal.dot(light))]);
    for (let v = 0; v < 3; v += 1) {
      colors[(i + v) * 3] = rgb.r;
      colors[(i + v) * 3 + 1] = rgb.g;
      colors[(i + v) * 3 + 2] = rgb.b;
    }
  }
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

function paperMat() {
  return new THREE.MeshBasicMaterial({
    vertexColors: true,
  });
}

function flatMat(color: number) {
  return new THREE.MeshBasicMaterial({ color });
}

function edgeOf(geometry: THREE.BufferGeometry, color: number, opacity = 0.82) {
  return new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 16),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  );
}

function shapeOf(pts: Array<[number, number]>) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();
  return shape;
}

/**
 * Prism whose 2D profile is Anatomy XZ (nose, up) and whose thickness is
 * span (Anatomy Y). Built with an explicit basis so the wing cannot collapse
 * onto the fuselage.
 */
function prismSpan(
  profile: Array<[number, number]>,
  y0: number,
  y1: number,
  material: THREE.Material,
  ink: number,
  palette: Palette,
) {
  const group = new THREE.Group();
  const depth = Math.abs(y1 - y0);
  const raw = new THREE.ExtrudeGeometry(shapeOf(profile), {
    depth,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1,
  });
  // Extrude (sx=nose, sy=up, sz=span) → Three (span, up, nose).
  raw.applyMatrix4(
    new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1),
  );
  raw.translate(Math.min(y0, y1), 0, 0);
  const geometry = facet(raw);
  paintBands(geometry, palette);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.add(edgeOf(geometry, ink));
  group.add(mesh);
  return group;
}

function latheAlongZ(
  profile: Array<[number, number]>,
  origin: [number, number, number],
  material: THREE.Material,
  ink: number,
  palette: Palette,
  segments = 10,
) {
  const points = profile.map(([s, r]) => new THREE.Vector2(Math.max(r, 0.05), s));
  const raw = new THREE.LatheGeometry(points, segments);
  raw.rotateX(Math.PI / 2);
  raw.translate(origin[1], origin[2], origin[0]);
  const geometry = facet(raw);
  paintBands(geometry, palette);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.add(edgeOf(geometry, ink, 0.7));
  return mesh;
}

function cylinderBetween(
  a: [number, number, number],
  b: [number, number, number],
  radius: number,
  material: THREE.Material,
  ink: number,
  palette: Palette,
) {
  const start = new THREE.Vector3(a[1], a[2], a[0]);
  const end = new THREE.Vector3(b[1], b[2], b[0]);
  const dir = end.clone().sub(start);
  const length = dir.length();
  const raw = new THREE.CylinderGeometry(radius, radius, length, 6);
  const geometry = facet(raw);
  paintBands(geometry, palette);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.add(edgeOf(geometry, ink, 0.55));
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return mesh;
}

function registrationTexture(ink: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = `#${ink.toString(16).padStart(6, "0")}`;
    ctx.font = "700 42px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F-HUGO", 128, 34);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function createAnatomyPlane(): AnatomyPlane {
  const group = new THREE.Group();
  group.name = "anatomy-trainer";
  const rig = new THREE.Group();
  group.add(rig);

  let palette: Palette = PAPER.light;
  const paper = paperMat();
  const ink = flatMat(palette.ink);
  const lo = flatMat(palette.lo);
  const mid = flatMat(palette.mid);
  const solids: THREE.BufferGeometry[] = [];

  const addSolid = (mesh: THREE.Object3D) => {
    mesh.traverse((node) => {
      if (node instanceof THREE.Mesh && node.geometry.getAttribute("color")) {
        solids.push(node.geometry);
      }
    });
    rig.add(mesh);
  };

  addSolid(
    latheAlongZ(
      [
        [0, 1.5],
        [10, 4],
        [40, 8.5],
        [80, 11.5],
        [112, 12.5],
        [124, 11.8],
        [130, 10],
        [134, 7],
      ],
      [-72, 0, 20],
      paper,
      palette.ink,
      palette,
      10,
    ),
  );

  addSolid(
    prismSpan(
      [
        [-14, 24],
        [16, 24],
        [16, 33],
        [-10, 33],
      ],
      -10,
      10,
      paper,
      palette.ink,
      palette,
    ),
  );

  addSolid(
    prismSpan(
      [
        [16, 24],
        [23, 24],
        [17, 32.5],
      ],
      -9,
      9,
      lo,
      palette.ink,
      palette,
    ),
  );

  for (const [x0, x1] of [
    [-12, -2],
    [0, 10],
    [12, 15.5],
  ] as Array<[number, number]>) {
    addSolid(
      prismSpan(
        [
          [x0, 25],
          [x1, 25],
          [x1 - 1, 31.5],
          [x0 + 1, 31.5],
        ],
        9.2,
        11.2,
        lo,
        palette.ink,
        palette,
      ),
    );
  }

  const wing = prismSpan(
    foil(ANATOMY.chord, 3.8),
    -ANATOMY.span,
    ANATOMY.span,
    paper,
    palette.ink,
    palette,
  );
  wing.position.set(0, ANATOMY.wingZ, ANATOMY.wingX0);
  addSolid(wing);

  const tipL = prismSpan(
    foil(ANATOMY.chord, 4),
    ANATOMY.span,
    ANATOMY.span + 1.4,
    paper,
    palette.mid,
    palette,
  );
  const tipR = prismSpan(
    foil(ANATOMY.chord, 4),
    -ANATOMY.span - 1.4,
    -ANATOMY.span,
    paper,
    palette.mid,
    palette,
  );
  tipL.position.set(0, ANATOMY.wingZ, ANATOMY.wingX0);
  tipR.position.set(0, ANATOMY.wingZ, ANATOMY.wingX0);
  addSolid(tipL);
  addSolid(tipR);

  const hStab = prismSpan(foil(16, 1.8), -26, 26, paper, palette.ink, palette);
  hStab.position.set(0, 20, -70);
  addSolid(hStab);

  addSolid(
    prismSpan(
      [
        [-71, 22],
        [-56, 22],
        [-62, 42],
        [-71, 44],
      ],
      -0.9,
      0.9,
      paper,
      palette.ink,
      palette,
    ),
  );
  addSolid(
    prismSpan(
      [
        [-76, 21],
        [-71, 22],
        [-71, 44],
        [-74, 43],
      ],
      -0.7,
      0.7,
      paper,
      palette.mid,
      palette,
    ),
  );
  addSolid(
    prismSpan(
      [
        [-56, 22],
        [-36, 25],
        [-56, 27],
      ],
      -0.7,
      0.7,
      paper,
      palette.mid,
      palette,
    ),
  );
  addSolid(
    prismSpan(
      [
        [56, 10.4],
        [61, 10.4],
        [61, 13],
        [56, 13],
      ],
      -3,
      3,
      lo,
      palette.ink,
      palette,
    ),
  );

  for (const side of [-1, 1] as const) {
    addSolid(
      cylinderBetween(
        [6, side * 9, 9],
        [8, side * Math.min(52, ANATOMY.span * 0.7), ANATOMY.wingZ - 0.4],
        1.1,
        paper,
        palette.mid,
        palette,
      ),
    );
  }

  const addGear = (x: number, y: number, zTop: number, r: number) => {
    addSolid(cylinderBetween([x, y, r], [x, y * 0.25, zTop], 0.9, paper, palette.mid, palette));
    const wheelGeo = facet(new THREE.CylinderGeometry(r, r, 4, 10));
    const wheel = new THREE.Mesh(wheelGeo, lo);
    wheel.add(edgeOf(wheelGeo, palette.ink, 0.65));
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(y, r, x);
    rig.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 4.6, 8), mid);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(y, r, x);
    rig.add(hub);
    const fair = prismSpan(
      [
        [-6, 0],
        [-4, 2.2],
        [4, 2.6],
        [7, 0],
      ],
      y - 2.2,
      y + 2.2,
      paper,
      palette.ink,
      palette,
    );
    fair.position.set(0, r + 1, x);
    addSolid(fair);
  };
  addGear(8, 14, 10, 5.5);
  addGear(8, -14, 10, 5.5);
  addGear(48, 0, 12, 4.4);

  const cowlingGeo = facet(new THREE.CylinderGeometry(4.4, 4.4, 1.2, 10));
  const cowling = new THREE.Mesh(cowlingGeo, mid);
  cowling.add(edgeOf(cowlingGeo, palette.ink, 0.65));
  cowling.rotation.x = Math.PI / 2;
  cowling.position.set(0, 20, ANATOMY.nose);
  rig.add(cowling);

  const markPaint = () =>
    new THREE.MeshBasicMaterial({
      map: registrationTexture(palette.ink),
      transparent: true,
      depthWrite: false,
    });
  const mark = new THREE.Mesh(new THREE.PlaneGeometry(18, 4.2), markPaint());
  mark.position.set(8.2, 17, -46);
  mark.rotation.y = Math.PI / 2;
  rig.add(mark);
  const wingMark = new THREE.Mesh(new THREE.PlaneGeometry(28, 6.4), markPaint());
  wingMark.position.set(34, ANATOMY.wingZ + 4.2, ANATOMY.wingX0 + 13);
  wingMark.rotation.set(-Math.PI / 2, 0, Math.PI / 2);
  rig.add(wingMark);

  const prop = new THREE.Group();
  prop.name = "prop";
  prop.position.set(0, 22, ANATOMY.nose + 3);
  const spinner = latheAlongZ(
    [
      [0, 4.2],
      [2.8, 3.6],
      [5.8, 1.8],
      [7.2, 0.15],
    ],
    [0, 0, 0],
    paper,
    palette.ink,
    palette,
    8,
  );
  solids.push(spinner.geometry);
  prop.add(spinner);
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, ANATOMY.propR * 2, 0.35), ink);
  prop.add(blade);
  const arc = new THREE.Mesh(
    new THREE.RingGeometry(ANATOMY.propR - 0.3, ANATOMY.propR + 0.08, 32),
    new THREE.MeshBasicMaterial({
      color: palette.faint,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  prop.add(arc);
  rig.add(prop);

  const rivetGeo = new THREE.SphereGeometry(0.35, 6, 4);
  for (const side of [-1, 1] as const) {
    for (const y of [12, 22, 32, 46, 56, 64, 70].filter((n) => n < ANATOMY.span - 2)) {
      const rivet = new THREE.Mesh(rivetGeo, mid);
      rivet.position.set(side * y, ANATOMY.wingZ + 3.3, ANATOMY.wingX0 + 14);
      rig.add(rivet);
    }
  }

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), flatMat(palette.face));
  beacon.position.set(0, 44.6, -70);
  rig.add(beacon);

  addSolid(
    cylinderBetween(
      [2, ANATOMY.span * 0.8, ANATOMY.wingZ - 2],
      [8, ANATOMY.span * 0.8, ANATOMY.wingZ - 2],
      0.28,
      mid,
      palette.mid,
      palette,
    ),
  );

  rig.position.set(0, -20, 5);

  const applyPalette = (next: Palette) => {
    palette = next;
    for (const geometry of solids) paintBands(geometry, next);
    ink.color.setHex(next.ink);
    lo.color.setHex(next.lo);
    mid.color.setHex(next.mid);
    const sideMark = mark.material as THREE.MeshBasicMaterial;
    const topMark = wingMark.material as THREE.MeshBasicMaterial;
    sideMark.map?.dispose();
    topMark.map?.dispose();
    sideMark.map = registrationTexture(next.ink);
    topMark.map = registrationTexture(next.ink);
    sideMark.needsUpdate = true;
    topMark.needsUpdate = true;
    (arc.material as THREE.MeshBasicMaterial).color.setHex(next.faint);
    (beacon.material as THREE.MeshBasicMaterial).color.setHex(next.face);
    rig.traverse((node) => {
      if (node instanceof THREE.LineSegments) {
        (node.material as THREE.LineBasicMaterial).color.setHex(next.ink);
      }
    });
  };

  const setTheme = (scheme: "light" | "dark") => {
    applyPalette(PAPER[scheme]);
  };

  group.userData.hit = true;
  group.traverse((node) => {
    node.userData.hit = true;
  });

  return { group, prop, setTheme };
}
