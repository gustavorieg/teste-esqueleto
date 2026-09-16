/* Monta os ossos a partir de js/skeleton-data.js (malhas do BodyParts3D).
   Formato por peça: posições Uint16 quantizadas (min + q * s) seguidas dos índices. */
THREE.ColorManagement.legacyMode = false;   // cores hexadecimais tratadas como sRGB

const SK = (() => {
  /* ---------------- CORES E MATERIAIS ---------------- */
  const pal = (base, light, stain, cavity) => ({
    base: new THREE.Color(base), light: new THREE.Color(light),
    stain: new THREE.Color(stain), cavity: new THREE.Color(cavity),
  });
  const PALETTES = {
    bone: pal(0xd3bd96, 0xe8dabd, 0xa98758, 0x46321f),
    teeth: pal(0xebe1c8, 0xf6efdf, 0xcdb27a, 0x6e5b3e),
    cartilage: pal(0xa7b3ab, 0xc0cac2, 0x8f9d93, 0x46524a),
  };

  // Ruído 3D + relevo poroso aplicado no shader (sem precisar de UVs)
  const NOISE_GLSL = `
    varying vec3 vBonePos;
    uniform float uBump;
    float bHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float bNoise(vec3 x) {
      vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(bHash(i), bHash(i + vec3(1.0, 0.0, 0.0)), f.x),
                     mix(bHash(i + vec3(0.0, 1.0, 0.0)), bHash(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
                 mix(mix(bHash(i + vec3(0.0, 0.0, 1.0)), bHash(i + vec3(1.0, 0.0, 1.0)), f.x),
                     mix(bHash(i + vec3(0.0, 1.0, 1.0)), bHash(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z);
    }
    float bFbm(vec3 p) { return bNoise(p) * 0.5 + bNoise(p * 2.03) * 0.3 + bNoise(p * 4.1) * 0.2; }
    vec3 bPerturb(vec3 surfPos, vec3 surfNorm, vec2 dHdxy, float faceDir) {
      vec3 sx = dFdx(surfPos); vec3 sy = dFdy(surfPos);
      vec3 r1 = cross(sy, surfNorm); vec3 r2 = cross(surfNorm, sx);
      float det = dot(sx, r1) * faceDir;
      vec3 grad = sign(det) * (dHdxy.x * r1 + dHdxy.y * r2);
      return normalize(abs(det) * surfNorm - grad);
    }`;
  const BUMP_GLSL = `
    float bFade = uBump * (1.0 - smoothstep(30.0, 230.0, length(vViewPosition)));
    float bH = bFbm(vBonePos * 3.2) * 0.65 + bNoise(vBonePos * 12.0) * 0.35;
    normal = bPerturb(-vViewPosition, normal, vec2(dFdx(bH), dFdy(bH)) * bFade, faceDirection);`;

  function decorate(mat, bump = mat.userData.bump) {
    mat.userData.bump = bump;
    mat.onBeforeCompile = shader => {
      shader.uniforms.uBump = { value: mat.userData.bump };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vBonePos;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBonePos = position;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + NOISE_GLSL)
        .replace('#include <roughnessmap_fragment>',
          '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor * (0.8 + 0.4 * bFbm(vBonePos * 1.7)), 0.04, 1.0);')
        .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + BUMP_GLSL);
    };
    mat.customProgramCacheKey = () => 'osso-v1';
    return mat;
  }

  const MAT = {
    bone: decorate(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.55 }), 0.04),
    teeth: decorate(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0, envMapIntensity: 0.7 }), 0.004),
    cartilage: decorate(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, envMapIntensity: 0.45 }), 0.006),
  };

  /* ---------------- COR POR VÉRTICE ---------------- */
  function hash(x, y, z) {
    const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const s = t => t * t * (3 - 2 * t);
    const fx = s(x - ix), fy = s(y - iy), fz = s(z - iz);
    const lerp = (a, b, t) => a + (b - a) * t;
    const plane = k => lerp(
      lerp(hash(ix, iy, k), hash(ix + 1, iy, k), fx),
      lerp(hash(ix, iy + 1, k), hash(ix + 1, iy + 1, k), fx), fy);
    return lerp(plane(iz), plane(iz + 1), fz);
  }
  const clamp01 = v => Math.min(1, Math.max(0, v));
  const smooth = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

  // Tom marfim com manchas + escurecimento em sulcos (curvatura côncava)
  function bakeColors(geo, kind, seed) {
    const p = PALETTES[kind];
    const tone = hash(seed, seed * 0.37, 11.3) * 0.3;          // cada osso com um tom levemente diferente
    const pos = geo.attributes.position.array;
    const nor = geo.attributes.normal.array;
    const n = pos.length / 3;
    const tri = geo.index ? geo.index.array : Uint32Array.from({ length: n }, (_, i) => i);

    let cav = new Float32Array(n);
    const cnt = new Float32Array(n);
    const edge = (i, j) => {
      const dx = pos[j * 3] - pos[i * 3], dy = pos[j * 3 + 1] - pos[i * 3 + 1], dz = pos[j * 3 + 2] - pos[i * 3 + 2];
      const len = Math.hypot(dx, dy, dz) || 1;
      cav[i] += (dx * nor[i * 3] + dy * nor[i * 3 + 1] + dz * nor[i * 3 + 2]) / len;
      cav[j] -= (dx * nor[j * 3] + dy * nor[j * 3 + 1] + dz * nor[j * 3 + 2]) / len;
      cnt[i]++;
      cnt[j]++;
    };
    for (let t = 0; t < tri.length; t += 3) {
      edge(tri[t], tri[t + 1]);
      edge(tri[t + 1], tri[t + 2]);
      edge(tri[t + 2], tri[t]);
    }
    for (let i = 0; i < n; i++) cav[i] /= cnt[i] || 1;

    for (let it = 0; it < 3; it++) {                       // suaviza para parecer oclusão
      const acc = new Float32Array(n), c = new Float32Array(n);
      for (let t = 0; t < tri.length; t += 3) {
        const a = tri[t], b = tri[t + 1], d = tri[t + 2];
        const sum = cav[a] + cav[b] + cav[d];
        acc[a] += sum; acc[b] += sum; acc[d] += sum;
        c[a] += 3; c[b] += 3; c[d] += 3;
      }
      for (let i = 0; i < n; i++) if (c[i]) acc[i] /= c[i];
      cav = acc;
    }

    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2];
      const t = noise(x * 0.09, y * 0.09, z * 0.09) * 0.5
        + noise(x * 0.45 + 17, y * 0.45, z * 0.45) * 0.35
        + noise(x * 2.2, y * 2.2 + 5, z * 2.2) * 0.15;
      c.copy(p.base).lerp(p.light, clamp01(0.5 - t) * 0.9);
      c.lerp(p.stain, clamp01(smooth(0.45, 0.85, t) * 0.7 + tone));
      const k = cav[i] * 9;
      if (k > 0) c.lerp(p.cavity, clamp01(k) * 0.75);
      else c.lerp(p.light, clamp01(-k) * 0.35);
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  }

  /* ---------------- CARREGAMENTO ---------------- */
  const root = new THREE.Group();
  const bones = [];

  function addMesh(group, geo, kind) {
    bakeColors(geo, kind, bones.length + group.children.length * 7.1);
    const m = new THREE.Mesh(geo, MAT[kind]);
    m.userData.kind = kind;
    m.castShadow = m.receiveShadow = true;
    group.add(m);
    return m;
  }

  async function gunzip(b64) {
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).arrayBuffer();
  }

  const ready = (async () => {
    const { parts, bin } = window.SKELETON_DATA;
    const buf = await gunzip(bin);
    let off = 0;

    for (const p of parts) {
      const q = new Uint16Array(buf.slice(off, off + p.vc * 6));
      off += p.vc * 6;
      const idxBytes = p.ic * (p.i32 ? 4 : 2);
      const idx = p.i32 ? new Uint32Array(buf.slice(off, off + idxBytes)) : new Uint16Array(buf.slice(off, off + idxBytes));
      off += idxBytes;

      const pos = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) pos[i] = p.min[i % 3] + q[i] * p.s;

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      geo.computeVertexNormals();

      const kind = p.type === 'dentes' ? 'teeth' : p.kind;
      const g = new THREE.Group();
      g.name = p.name;
      g.userData = { isBone: true, ...p, kind };
      addMesh(g, geo, kind);
      root.add(g);
      bones.push(g);
    }
    delete window.SKELETON_DATA.bin;
    addMissingParts();
    bakeAmbientOcclusion();
  })();

  // Oclusão ambiente global: a superfície de todos os ossos é depositada numa grade 3D (1 cm)
  // e cada vértice mede quanto dessa "massa" bloqueia a luz em direções ao redor da normal.
  // Escurece órbitas, cavidade nasal, interior da pelve, espaços entre vértebras e costelas.
  function bakeAmbientOcclusion() {
    root.updateMatrixWorld(true);
    const meshes = [];
    root.traverse(o => { if (o.isMesh) meshes.push(o); });

    const box = new THREE.Box3().setFromObject(root).expandByScalar(4);
    const CELL = 1;
    const nx = Math.ceil((box.max.x - box.min.x) / CELL);
    const ny = Math.ceil((box.max.y - box.min.y) / CELL);
    const nz = Math.ceil((box.max.z - box.min.z) / CELL);
    let grid = new Float32Array(nx * ny * nz);
    const cellOf = (x, y, z) => {
      const i = Math.floor((x - box.min.x) / CELL), j = Math.floor((y - box.min.y) / CELL), k = Math.floor((z - box.min.z) / CELL);
      return (i < 0 || j < 0 || k < 0 || i >= nx || j >= ny || k >= nz) ? -1 : i + nx * (j + ny * k);
    };

    for (const m of meshes) {                                  // área de superfície por célula
      const pos = m.geometry.attributes.position.array;
      const idx = m.geometry.index ? m.geometry.index.array : null;
      const count = idx ? idx.length : pos.length / 3;
      for (let t = 0; t < count; t += 3) {
        const a = (idx ? idx[t] : t) * 3, b = (idx ? idx[t + 1] : t + 1) * 3, c = (idx ? idx[t + 2] : t + 2) * 3;
        const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
        const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
        const area = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) / 2;
        const cell = cellOf((pos[a] + pos[b] + pos[c]) / 3, (pos[a + 1] + pos[b + 1] + pos[c + 1]) / 3, (pos[a + 2] + pos[b + 2] + pos[c + 2]) / 3);
        if (cell >= 0) grid[cell] += area;
      }
    }
    for (let i = 0; i < grid.length; i++) grid[i] = Math.min(1, grid[i] / (CELL * CELL));

    const blurred = new Float32Array(grid.length);             // desfoque 3x3x3
    for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      let s = 0;
      for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        s += grid[(i + di) + nx * ((j + dj) + ny * (k + dk))];
      }
      blurred[i + nx * (j + ny * k)] = s / 27;
    }
    grid = blurred;

    const DIRS = [];                                           // 16 direções uniformes na esfera
    for (let i = 0; i < 16; i++) {
      const y = 1 - (i + 0.5) / 8, r = Math.sqrt(Math.max(0, 1 - y * y)), phi = i * 2.39996;
      DIRS.push([Math.cos(phi) * r, y, Math.sin(phi) * r]);
    }
    const STEPS = [1.3, 2.4, 3.8, 5.6, 8, 11.5];

    const results = [];
    const all = [];
    for (const m of meshes) {
      const pos = m.geometry.attributes.position.array;
      const nor = m.geometry.attributes.normal.array;
      const n = pos.length / 3;
      const ao = new Float32Array(n);
      for (let v = 0; v < n; v++) {
        const px = pos[v * 3] + nor[v * 3] * 0.5, py = pos[v * 3 + 1] + nor[v * 3 + 1] * 0.5, pz = pos[v * 3 + 2] + nor[v * 3 + 2] * 0.5;
        let sum = 0, wsum = 0;
        for (const [dx, dy, dz] of DIRS) {
          const w = dx * nor[v * 3] + dy * nor[v * 3 + 1] + dz * nor[v * 3 + 2];
          if (w <= 0.15) continue;
          let trans = 1;
          for (const s of STEPS) {
            const cell = cellOf(px + dx * s, py + dy * s, pz + dz * s);
            if (cell < 0) break;
            trans *= 1 - Math.min(0.9, grid[cell] * 1.6);
          }
          sum += trans * w;
          wsum += w;
        }
        ao[v] = wsum ? sum / wsum : 1;
        all.push(ao[v]);
      }
      results.push(ao);
    }

    all.sort((a, b) => a - b);
    const ref = all[Math.floor(all.length * 0.9)] || 1;        // superfícies abertas ≈ 1
    const cavity = PALETTES.bone.cavity.toArray();
    meshes.forEach((m, mi) => {
      const col = m.geometry.attributes.color.array;
      const ao = results[mi];
      for (let v = 0; v < ao.length; v++) {
        const shade = Math.pow(clamp01(ao[v] / ref), 1.4);
        const f = 0.28 + 0.72 * shade;
        for (let ch = 0; ch < 3; ch++) {
          const val = col[v * 3 + ch] * f;
          col[v * 3 + ch] = val + (cavity[ch] * 0.5 - val) * (1 - shade) * 0.2;
        }
      }
      m.geometry.attributes.color.needsUpdate = true;
    });
  }

  // O BodyParts3D não inclui o manúbrio do esterno nem o cóccix: modelados aqui,
  // encaixados nas peças vizinhas (corpo do esterno, clavículas, 1ª cartilagem e sacro).
  function addMissingParts() {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);

    const sternum = bones.find(b => b.userData.type === 'esterno');
    if (sternum) {
      const pts = [[-1.4, 0], [1.4, 0], [1.9, 1.2], [2.6, 3.2], [2.6, 4.3], [2.2, 5.1], [1.2, 5.5], [0.5, 5.2],
        [0, 5.1], [-0.5, 5.2], [-1.2, 5.5], [-2.2, 5.1], [-2.6, 4.3], [-2.6, 3.2], [-1.9, 1.2]]
        .map(([x, y]) => new THREE.Vector2(x, y));
      const shape = new THREE.Shape();
      shape.moveTo(pts[0].x, pts[0].y);
      shape.splineThru([...pts.slice(1), pts[0]]);
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 0.9, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.3, bevelSegments: 3, curveSegments: 40,
      });
      geo.translate(0, 0, -0.95);                         // plano levemente atrás da linha base
      const u = V(1, 0, 0);
      const v = V(0, 4.5, -3.3).normalize();
      const w = V().crossVectors(u, v);
      geo.applyMatrix4(new THREE.Matrix4().makeBasis(u, v, w).setPosition(0, 130.3, 6.2));
      addMesh(sternum, geo, 'bone');
    }

    const coccyx = new THREE.Group();
    coccyx.name = 'Cóccix';
    coccyx.userData = { isBone: true, name: 'Cóccix', region: 'Coluna vertebral', type: 'coccix', kind: 'bone' };
    [[78.9, -8.05, 0.8, 0.42, 0.55], [78.05, -7.55, 0.58, 0.38, 0.45], [77.35, -6.95, 0.42, 0.32, 0.36], [76.85, -6.4, 0.3, 0.26, 0.28]]
      .forEach(([y, z, sx, sy, sz]) => {
        const geo = new THREE.SphereGeometry(1, 20, 14);
        geo.applyMatrix4(new THREE.Matrix4().compose(
          V(-0.05, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0, 0)), V(sx, sy, sz)));
        addMesh(coccyx, geo, 'bone');
      });
    root.add(coccyx);
    bones.splice(bones.findIndex(b => b.userData.type === 'sacro') + 1, 0, coccyx);
  }

  return { MAT, root, bones, ready, decorate };
})();
