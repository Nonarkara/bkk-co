/*
 * Hat monotile patches for PLUB's Explore hotspot layer.
 *
 * Substitution tables adapted from hatviz by Craig S. Kaplan:
 * BSD 3-Clause License
 * Copyright (c) 2023, Craig S. Kaplan
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * The hat is the einstein polykite of Smith, Myers, Kaplan and Goodman-Strauss
 * (arXiv:2303.10798). These polygons are a density treatment, never place pins.
 */
(function (root) {
  const HR3 = Math.sqrt(3) / 2;
  const IDENT = [1, 0, 0, 0, 1, 0];
  const HAT = [
    [0, 0],
    [-1, -1],
    [0, -2],
    [2, -2],
    [2, -1],
    [4, -2],
    [5, -1],
    [4, 0],
    [3, 0],
    [2, 2],
    [0, 3],
    [0, 2],
    [-1, 2]
  ].map(([x, y]) => [x + 0.5 * y, HR3 * y]);

  const mul = (A, B) => [
    A[0] * B[0] + A[1] * B[3],
    A[0] * B[1] + A[1] * B[4],
    A[0] * B[2] + A[1] * B[5] + A[2],
    A[3] * B[0] + A[4] * B[3],
    A[3] * B[1] + A[4] * B[4],
    A[3] * B[2] + A[4] * B[5] + A[5]
  ];
  const inv = (T) => {
    const det = T[0] * T[4] - T[1] * T[3];
    return [
      T[4] / det,
      -T[1] / det,
      (T[1] * T[5] - T[2] * T[4]) / det,
      -T[3] / det,
      T[0] / det,
      (T[2] * T[3] - T[0] * T[5]) / det
    ];
  };
  const apply = (M, p) => [M[0] * p[0] + M[1] * p[1] + M[2], M[3] * p[0] + M[4] * p[1] + M[5]];
  const add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const sub = (p, q) => [p[0] - q[0], p[1] - q[1]];
  const rot = (ang) => {
    const c = Math.cos(ang),
      s = Math.sin(ang);
    return [c, -s, 0, s, c, 0];
  };
  const trans = (x, y) => [1, 0, x, 0, 1, y];
  const rotAbout = (p, ang) => mul(trans(p[0], p[1]), mul(rot(ang), trans(-p[0], -p[1])));
  const matchSeg = (p, q) => [q[0] - p[0], p[1] - q[1], p[0], q[1] - p[1], q[0] - p[0], p[1]];
  const matchTwo = (p1, q1, p2, q2) => mul(matchSeg(p2, q2), inv(matchSeg(p1, q1)));
  const intersect = (p1, q1, p2, q2) => {
    const d = (q2[1] - p2[1]) * (q1[0] - p1[0]) - (q2[0] - p2[0]) * (q1[1] - p1[1]);
    const u = ((q2[0] - p2[0]) * (p1[1] - p2[1]) - (q2[1] - p2[1]) * (p1[0] - p2[0])) / d;
    return [p1[0] + u * (q1[0] - p1[0]), p1[1] + u * (q1[1] - p1[1])];
  };
  const area = (ring) => {
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
      a += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
    return a / 2;
  };

  function hatTile(label) {
    return { label, shape: HAT };
  }
  function meta(shape) {
    return { shape, children: [] };
  }
  function addChild(node, T, geom) {
    node.children.push({ T, geom });
  }
  function childPoint(node, n, i) {
    return apply(node.children[n].T, node.children[n].geom.shape[i]);
  }
  function recentre(node) {
    let cx = 0,
      cy = 0;
    for (const p of node.shape) {
      cx += p[0];
      cy += p[1];
    }
    cx /= node.shape.length;
    cy /= node.shape.length;
    node.shape = node.shape.map((p) => [p[0] - cx, p[1] - cy]);
    const M = trans(-cx, -cy);
    for (const ch of node.children) ch.T = mul(M, ch.T);
  }

  function initTiles() {
    const Hhat = hatTile('H'),
      H1 = hatTile('H1'),
      That = hatTile('T'),
      Phat = hatTile('P'),
      Fhat = hatTile('F');
    const H = meta([
      [0, 0],
      [4, 0],
      [4.5, HR3],
      [2.5, 5 * HR3],
      [1.5, 5 * HR3],
      [-0.5, HR3]
    ]);
    addChild(H, matchTwo(HAT[5], HAT[7], H.shape[5], H.shape[0]), Hhat);
    addChild(H, matchTwo(HAT[9], HAT[11], H.shape[1], H.shape[2]), Hhat);
    addChild(H, matchTwo(HAT[5], HAT[7], H.shape[3], H.shape[4]), Hhat);
    addChild(H, mul(trans(2.5, HR3), mul([-0.5, -HR3, 0, HR3, -0.5, 0], [0.5, 0, 0, 0, -0.5, 0])), H1);
    const T = meta([
      [0, 0],
      [3, 0],
      [1.5, 3 * HR3]
    ]);
    addChild(T, [0.5, 0, 0.5, 0, 0.5, HR3], That);
    const P = meta([
      [0, 0],
      [4, 0],
      [3, 2 * HR3],
      [-1, 2 * HR3]
    ]);
    addChild(P, [0.5, 0, 1.5, 0, 0.5, HR3], Phat);
    addChild(P, mul(trans(0, 2 * HR3), mul([0.5, HR3, 0, -HR3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), Phat);
    const F = meta([
      [0, 0],
      [3, 0],
      [3.5, HR3],
      [3, 2 * HR3],
      [-1, 2 * HR3]
    ]);
    addChild(F, [0.5, 0, 1.5, 0, 0.5, HR3], Fhat);
    addChild(F, mul(trans(0, 2 * HR3), mul([0.5, HR3, 0, -HR3, 0.5, 0], [0.5, 0, 0, 0, 0.5, 0])), Fhat);
    return [H, T, P, F];
  }

  function constructPatch(H, T, P, F) {
    const rules = [
      ['H'],
      [0, 0, 'P', 2],
      [1, 0, 'H', 2],
      [2, 0, 'P', 2],
      [3, 0, 'H', 2],
      [4, 4, 'P', 2],
      [0, 4, 'F', 3],
      [2, 4, 'F', 3],
      [4, 1, 3, 2, 'F', 0],
      [8, 3, 'H', 0],
      [9, 2, 'P', 0],
      [10, 2, 'H', 0],
      [11, 4, 'P', 2],
      [12, 0, 'H', 2],
      [13, 0, 'F', 3],
      [14, 2, 'F', 1],
      [15, 3, 'H', 4],
      [8, 2, 'F', 1],
      [17, 3, 'H', 0],
      [18, 2, 'P', 0],
      [19, 2, 'H', 2],
      [20, 4, 'F', 3],
      [20, 0, 'P', 2],
      [22, 0, 'H', 2],
      [23, 4, 'F', 3],
      [23, 0, 'F', 3],
      [16, 0, 'P', 2],
      [9, 4, 0, 2, 'T', 2],
      [4, 0, 'F', 3]
    ];
    const ret = meta([]);
    const shapes = { H, T, P, F };
    for (const r of rules) {
      if (r.length === 1) addChild(ret, IDENT.slice(), shapes[r[0]]);
      else if (r.length === 4) {
        const poly = ret.children[r[0]].geom.shape;
        const Tm = ret.children[r[0]].T;
        const Pnt = apply(Tm, poly[(r[1] + 1) % poly.length]);
        const Q = apply(Tm, poly[r[1]]);
        const nshp = shapes[r[2]];
        const npoly = nshp.shape;
        addChild(ret, matchTwo(npoly[r[3]], npoly[(r[3] + 1) % npoly.length], Pnt, Q), nshp);
      } else {
        const chP = ret.children[r[0]];
        const chQ = ret.children[r[2]];
        const Pnt = apply(chQ.T, chQ.geom.shape[r[3]]);
        const Q = apply(chP.T, chP.geom.shape[r[1]]);
        const nshp = shapes[r[4]];
        const npoly = nshp.shape;
        addChild(ret, matchTwo(npoly[r[5]], npoly[(r[5] + 1) % npoly.length], Pnt, Q), nshp);
      }
    }
    return ret;
  }

  function constructMetatiles(patch) {
    const bps1 = childPoint(patch, 8, 2);
    const bps2 = childPoint(patch, 21, 2);
    const rbps = apply(rotAbout(bps1, (-2 * Math.PI) / 3), bps2);
    const p72 = childPoint(patch, 7, 2);
    const p252 = childPoint(patch, 25, 2);
    const llc = intersect(bps1, rbps, childPoint(patch, 6, 2), p72);
    let w = sub(childPoint(patch, 6, 2), llc);
    const newH = [llc, bps1];
    w = apply(rot(-Math.PI / 3), w);
    newH.push(add(newH[1], w));
    newH.push(childPoint(patch, 14, 2));
    w = apply(rot(-Math.PI / 3), w);
    newH.push(sub(newH[3], w));
    newH.push(childPoint(patch, 6, 2));
    const H = meta(newH);
    for (const ch of [0, 9, 16, 27, 26, 6, 1, 8, 10, 15])
      addChild(H, patch.children[ch].T.slice(), patch.children[ch].geom);
    const P = meta([p72, add(p72, sub(bps1, llc)), bps1, llc]);
    for (const ch of [7, 2, 3, 4, 28]) addChild(P, patch.children[ch].T.slice(), patch.children[ch].geom);
    const F = meta([
      bps2,
      childPoint(patch, 24, 2),
      childPoint(patch, 25, 0),
      p252,
      add(p252, sub(llc, bps1))
    ]);
    for (const ch of [21, 20, 22, 23, 24, 25])
      addChild(F, patch.children[ch].T.slice(), patch.children[ch].geom);
    const AAA = newH[2];
    const BBB = add(newH[1], sub(newH[4], newH[5]));
    const CCC = apply(rotAbout(BBB, -Math.PI / 3), AAA);
    const T = meta([BBB, CCC, AAA]);
    addChild(T, patch.children[11].T.slice(), patch.children[11].geom);
    recentre(H);
    recentre(P);
    recentre(F);
    recentre(T);
    return [H, T, P, F];
  }

  function collect(node, T, out) {
    if (node.label) {
      const ring = HAT.map((p) => apply(T, p));
      const det = T[0] * T[4] - T[1] * T[3];
      out.push({ ring, reflected: det < 0 });
      return;
    }
    for (const ch of node.children) collect(ch.geom, mul(T, ch.T), out);
  }

  const cache = new Map();
  function patch(level) {
    const n = Math.max(1, level | 0);
    if (cache.has(n)) return cache.get(n);
    let tiles = initTiles();
    for (let i = 1; i < n; i++) tiles = constructMetatiles(constructPatch(...tiles));
    const hats = [];
    collect(tiles[0], IDENT, hats);
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const h of hats)
      for (const p of h.ring) {
        minX = Math.min(minX, p[0]);
        minY = Math.min(minY, p[1]);
        maxX = Math.max(maxX, p[0]);
        maxY = Math.max(maxY, p[1]);
      }
    let hx0 = Infinity,
      hy0 = Infinity,
      hx1 = -Infinity,
      hy1 = -Infinity;
    for (const p of hats[0].ring) {
      hx0 = Math.min(hx0, p[0]);
      hy0 = Math.min(hy0, p[1]);
      hx1 = Math.max(hx1, p[0]);
      hy1 = Math.max(hy1, p[1]);
    }
    const built = {
      level: n,
      hats,
      minX,
      minY,
      maxX,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
      hatWidth: hx1 - hx0,
      hatHeight: hy1 - hy0,
      hatSpan: Math.max(hx1 - hx0, hy1 - hy0),
      hatArea: Math.abs(area(hats[0].ring))
    };
    cache.set(n, built);
    return built;
  }

  function legendSVG() {
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const p of HAT) {
      minX = Math.min(minX, p[0]);
      minY = Math.min(minY, p[1]);
      maxX = Math.max(maxX, p[0]);
      maxY = Math.max(maxY, p[1]);
    }
    const s = 26 / Math.max(maxX - minX, maxY - minY);
    const d =
      HAT.map((p, i) => {
        const x = (1 + (p[0] - minX) * s).toFixed(2);
        const y = (1 + (maxY - p[1]) * s).toFixed(2);
        return (i ? 'L' : 'M') + x + ' ' + y;
      }).join('') + 'Z';
    return `<svg class="atlas-hat" viewBox="0 0 28 28" width="28" height="28" aria-hidden="true"><path d="${d}" fill="#7d133a"/></svg>`;
  }

  root.EinsteinHat = { patch, legendSVG, area, outline: HAT };
  if (typeof module !== 'undefined') module.exports = root.EinsteinHat;
})(typeof window !== 'undefined' ? window : globalThis);
