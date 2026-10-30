// Geometry of the plane, pure: planeParts(P) -> { body (SVG string), count }.
// World: x forward (nose +x), y = span, z up. Units ≈ 1 px of a 1:? model.
import * as k from "@/components/iso/iso-kit";
import * as G from "@/components/iso/lathe";
import { NOSE, PROP_R, SPAN, bladePath, STILL_BLADE_ANGLE } from "./motion";

const WING_Z = 34;
const WING_X0 = -6;
const CHORD = 26;

type Point3 = k.Point3;
type Frame = { o: Point3; a: Point3; u: Point3; v: Point3 };

export function planeParts(P: k.Projection) {
  let count = 0;
  const S = (paths: k.SolidPaths, style?: k.SolidStyle) => {
    count++;
    return k.solidSvg(paths, style);
  };
  const L = (d: string, style?: k.LineStyle) => k.lineSvg(d, style);
  const D = (pts: k.Flat[], style?: { size?: number; tone?: k.Tone }) =>
    k.dotsSvg(pts, style);
  const at = (p: Point3) => k.iso(p, P);
  const ax = (o: Point3): Frame => G.frameOf(o, [1, 0, 0], [0, 1, 0], [0, 0, 1]);
  const ay = (o: Point3): Frame => G.frameOf(o, [0, 1, 0], [1, 0, 0], [0, 0, 1]);
  const near = k.depthOf([0, 1, 0], P) > k.depthOf([0, -1, 0], P) ? 1 : -1;
  const far = -near;
  const out: { back: string[]; mid: string[]; front: string[] } = {
    back: [],
    mid: [],
    front: [],
  };

  const foil = (c: number, t: number): Array<[number, number]> => [
    [0, 0],
    [c * 0.08, t * 0.7],
    [c * 0.3, t],
    [c * 0.7, t * 0.6],
    [c, 0],
    [c * 0.6, -t * 0.15],
    [c * 0.2, -t * 0.25],
  ];
  const wingHalf = (side: number) => {
    const F = ay([WING_X0, 0, WING_Z]);
    const poly = foil(CHORD, 3.4);
    const [s0, s1] = side > 0 ? [0, SPAN] : [-SPAN, 0];
    const parts = [S(G.prismOf(F, poly, s0, s1, P), { tone: "hi" })];
    const yT = side * (SPAN - 2);
    const yM = side * Math.min(46, SPAN * 0.5);
    const yR = side * 8;
    parts.push(
      L(k.segment([WING_X0 + 7, yM, WING_Z + 2.6], [WING_X0 + 7, yT, WING_Z + 2.4], P), {
        tone: "lo",
      }),
    );
    parts.push(
      L(k.segment([WING_X0, yM, WING_Z + 0.4], [WING_X0 + 7, yM, WING_Z + 2.6], P), {
        tone: "lo",
      }),
    );
    parts.push(
      L(k.segment([WING_X0 + 7, yR, WING_Z + 2.6], [WING_X0 + 7, yM, WING_Z + 2.6], P), {
        tone: "faint",
      }),
    );
    const rivets = [12, 22, 32, 46, 56, 64, 70].filter((y) => y < SPAN - 2);
    parts.push(
      D(
        rivets.map((y) => at([WING_X0 + 14, side * y, WING_Z + 3.3])),
        { size: 0.35, tone: "lo" },
      ),
    );
    parts.push(
      S(
        G.prismOf(
          ay([WING_X0, 0, WING_Z]),
          foil(CHORD, 3.6),
          side > 0 ? SPAN : -SPAN - 1.2,
          side > 0 ? SPAN + 1.2 : -SPAN,
          P,
        ),
        { tone: "mid" },
      ),
    );
    parts.push(
      D([at([WING_X0 + 4, side * (SPAN + 1.2), WING_Z + 1.4])], {
        size: 0.9,
        tone: "hi",
      }),
    );
    return parts.join("");
  };
  const strut = (side: number) => {
    const a: Point3 = [6, side * 9, 9];
    const b: Point3 = [8, side * Math.min(52, SPAN * 0.7), WING_Z - 0.4];
    return (
      S(
        G.lathe(
          [
            [0, 0],
            [0, 1.1],
            [G.len3(G.sub3(b, a)), 1.1],
            [G.len3(G.sub3(b, a)), 0],
          ],
          G.frameAlong(a, G.sub3(b, a)),
          P,
        ),
        { tone: "mid" },
      ) + D([at(a), at(b)], { size: 0.55 })
    );
  };
  const gear = (x: number, y: number, zTop: number, r: number) => {
    const legs = S(
      G.lathe(
        [
          [0, 0],
          [0, 0.9],
          [zTop - r, 0.9],
          [zTop - r, 0],
        ],
        G.frameAlong([x, y, r], [0, y * 0.25, 1]),
        P,
      ),
      { tone: "mid" },
    );
    const wheel = S(
      G.lathe(
        [
          [0, 0],
          [0, r * 0.75],
          [0.6, r, 1],
          [3.4, r, 1],
          [4, r * 0.75],
          [4, 0],
        ],
        G.frameOf([x, y - 2, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        P,
      ),
      { tone: "lo" },
    );
    const hub = S(
      G.disc(
        4,
        4.6,
        r * 0.45,
        G.frameOf([x, y - 2, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        P,
      ),
      { tone: "mid" },
    );
    const fair = S(
      G.solidOf(
        [
          [-6, 0],
          [-4, 2.2, 1],
          [4, 2.6, 1],
          [7, 0],
        ],
        ax([x, y, r + 1]),
        P,
      ),
      { tone: "hi" },
    );
    return { legs, wheel: wheel + hub + fair };
  };

  out.back.push(
    S(
      G.prismOf(
        ay([-70, 0, 20]),
        foil(16, 1.8),
        far > 0 ? 0 : -26,
        far > 0 ? 26 : 0,
        P,
      ),
      { tone: "mid" },
    ),
  );
  out.back.push(strut(far));
  const gF = gear(8, far * 14, 10, 5.5);
  out.back.push(gF.legs, gF.wheel);
  const gN0 = gear(48, 0, 12, 4.4);
  out.back.push(gN0.legs, gN0.wheel);

  const F = ax([-72, 0, 20]);
  const prof = [
    [0, 1.5],
    [10, 4, 1],
    [40, 8.5, 1],
    [80, 11.5, 1],
    [112, 12.5, 1],
    [124, 11.8, 1],
    [130, 10, 1],
    [134, 7],
  ];
  out.mid.push(
    S(G.solidOf(prof, F, P, { smooth: true }), {
      tone: "hi",
      inner: L(G.arcOf(F, 82, 11.6, P), { tone: "faint" }) + L(G.arcOf(F, 120, 12.1, P), { tone: "faint" }),
    }),
  );
  out.mid.push(
    S(G.prismOf(ay([-14, 0, 24]), [[0, 0], [30, 0], [30, 9], [4, 9]], -10, 10, P), {
      tone: "mid",
    }),
  );
  const win = (x0: number, x1: number) =>
    S(
      G.prismOf(
        ay([0, 0, 0]),
        [
          [x0, 25],
          [x1, 25],
          [x1 - 1, 31.5],
          [x0 + 1, 31.5],
        ],
        near * 10.6,
        near * 11.0,
        P,
      ),
      { tone: "lo", crease: "none" },
    );
  out.mid.push(win(-12, -2), win(0, 10), win(12, 15.5));
  out.mid.push(
    S(
      G.prismOf(ay([0, 0, 0]), [[16, 24], [23, 24], [17, 32.5]], -9, 9, P),
      { tone: "lo" },
    ),
  );
  out.mid.push(
    L(k.segment([-1, near * 11.6, 13], [-1, near * 11.6, 24], P), { tone: "faint" }),
  );
  out.mid.push(D([at([7, near * 11.7, 18])], { size: 0.45 }));
  // Original call used face "y"/"-y", which both fall through to the right-face matrix.
  out.mid.push(
    k.faceTextSvg(k.sideMatrix([-46, near * 7.4], 17, P, "right"), "F-HUGO", {
      size: 3,
      tone: "lo",
    }),
  );
  const Fc = ax([-72, 0, 20]);
  out.mid.push(L(G.arcOf(Fc, 126, 11.5, P), { tone: "lo" }));
  out.mid.push(
    S(G.disc(0, 4, 1.1, G.frameAlong([48, near * 7, 12], [-1, 0, -0.4]), P), {
      tone: "lo",
    }),
  );
  out.mid.push(
    S(
      G.prismOf(
        ay([0, 0, 0]),
        [
          [56, 10.4],
          [61, 10.4],
          [61, 13],
          [56, 13],
        ],
        -3,
        3,
        P,
      ),
      { tone: "lo" },
    ),
  );
  out.mid.push(
    S(
      G.prismOf(
        G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        [
          [-71, 22],
          [-56, 22],
          [-62, 42],
          [-71, 44],
        ],
        -0.9,
        0.9,
        P,
      ),
      { tone: "hi" },
    ),
  );
  out.mid.push(
    S(
      G.prismOf(
        G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        [
          [-76, 21],
          [-71, 22],
          [-71, 44],
          [-74, 43],
        ],
        -0.7,
        0.7,
        P,
      ),
      { tone: "mid" },
    ),
  );
  out.mid.push(
    S(
      G.prismOf(
        G.frameOf([0, 0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]),
        [
          [-56, 22],
          [-36, 25],
          [-56, 27],
        ],
        -0.7,
        0.7,
        P,
      ),
      { tone: "mid" },
    ),
  );
  out.mid.push(D([at([-70, 0, 44.6])], { size: 0.9, tone: "hi" }));
  out.mid.push(
    S(
      G.prismOf(
        ay([-70, 0, 20]),
        foil(16, 1.8),
        near > 0 ? 0 : -26,
        near > 0 ? 26 : 0,
        P,
      ),
      { tone: "hi" },
    ),
  );
  out.mid.push(L(k.segment([-66, -26, 20.6], [-66, 26, 20.6], P), { tone: "lo" }));
  out.mid.push(
    L(k.segment([-30, 0, 32.4], [-36, 0, 38], P), { tone: "mid" }),
    D([at([-30, 0, 32.4])], { size: 0.5 }),
  );

  out.mid.push(wingHalf(far), wingHalf(near));
  const pitotY = near * Math.min(60, SPAN * 0.8);
  out.mid.push(L(k.segment([2, pitotY, WING_Z - 2], [8, pitotY, WING_Z - 2], P), { tone: "mid" }));

  out.front.push(strut(near));
  const gNear = gear(8, near * 14, 10, 5.5);
  out.front.push(gNear.legs, gNear.wheel);
  const Fs = ax([NOSE, 0, 20]);
  out.front.push(S(G.disc(0, 1.2, 4.4, Fs, P), { tone: "mid" }));
  out.front.push(
    L(
      G.circleOf(G.frameOf([NOSE + 3, 0, 22], [1, 0, 0], [0, 1, 0], [0, 0, 1]), 0, PROP_R, P),
      { tone: "faint" },
    ),
  );
  out.front.push(
    `<path data-part="blades" class="iso-line" data-tone="lit" data-free="both" d="${bladePath(STILL_BLADE_ANGLE, P)}" style="stroke-width:2.2;stroke-linecap:round"/>`,
  );
  out.front.push(
    S(
      G.solidOf(
        [
          [1.2, 4.2],
          [4, 3.6, 1],
          [7, 1.8, 1],
          [8.4, 0],
        ],
        G.frameOf([NOSE, 0, 22], [1, 0, 0], [0, 1, 0], [0, 0, 1]),
        P,
        { smooth: true },
      ),
      { tone: "hi", lit: true },
    ),
  );
  return { body: [...out.back, ...out.mid, ...out.front].join(""), count };
}
