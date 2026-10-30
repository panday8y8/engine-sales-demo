import * as THREE from 'three';
import { R, E, TAU, ROTOR_R, epitrochoidPoints, rotorPoints, rotorFlank } from './geom.js';
import { SPEC } from './spec.js';

// ---------------------------------------------------------------- 基础
const canvas = document.getElementById('c');
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 200);

// ---------------------------------------------------------------- 灯光
const hemi = new THREE.HemisphereLight(0xfff6e8, 0x4b453a, 0.42);
scene.add(hemi);

const key = new THREE.DirectionalLight(0xfff1da, 3.6);
key.position.set(-5.5, 8.5, 7.0);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 1;
key.shadow.camera.far = 30;
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 4;
key.shadow.camera.bottom = -4;
key.shadow.bias = -0.0006;
key.shadow.radius = 9;
scene.add(key);

const fill = new THREE.DirectionalLight(0xcfe0ff, 1.25);
fill.position.set(7, 2.5, 5);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 1.9);
rim.position.set(2.5, 5.5, -8);
scene.add(rim);

const bounce = new THREE.DirectionalLight(0xffe3bd, 0.55);
bounce.position.set(0, -6, 3);
scene.add(bounce);

// 环境反射（暖棚光），让金属有东西可反射
function makeEnv() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const x = c.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, '#fffdf6');
  g.addColorStop(0.42, '#ece4d6');
  g.addColorStop(0.6, '#b9ad9a');
  g.addColorStop(1, '#6a6052');
  x.fillStyle = g; x.fillRect(0, 0, 512, 256);
  let r = x.createRadialGradient(120, 62, 8, 120, 62, 170);
  r.addColorStop(0, 'rgba(255,255,248,1)');
  r.addColorStop(1, 'rgba(255,255,248,0)');
  x.fillStyle = r; x.fillRect(0, 0, 512, 256);
  r = x.createRadialGradient(430, 90, 10, 430, 90, 150);
  r.addColorStop(0, 'rgba(205,222,255,0.85)');
  r.addColorStop(1, 'rgba(205,222,255,0)');
  x.fillStyle = r; x.fillRect(0, 0, 512, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  pm.dispose();
  tex.dispose();
  return env;
}
scene.environment = makeEnv();
scene.environmentIntensity = 0.55;

// 地面阴影
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.ShadowMaterial({ color: 0x2a2015, opacity: 0.14 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.66;
ground.receiveShadow = true;
scene.add(ground);

// ---------------------------------------------------------------- 材质
const mat = {
  shell: new THREE.MeshStandardMaterial({ color: 0xcdccc6, metalness: 0.6, roughness: 0.36 }),
  shellDark: new THREE.MeshStandardMaterial({ color: 0xa5a49d, metalness: 0.72, roughness: 0.46 }),
  cast: new THREE.MeshStandardMaterial({ color: 0xa9a79e, metalness: 0.55, roughness: 0.55 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9d9d99, metalness: 0.92, roughness: 0.28 }),
  steelDark: new THREE.MeshStandardMaterial({ color: 0x4a4a48, metalness: 0.9, roughness: 0.42 }),
  black: new THREE.MeshStandardMaterial({ color: 0x1a1a19, metalness: 0.35, roughness: 0.62 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x121212, metalness: 0.05, roughness: 0.92 }),
  copper: new THREE.MeshStandardMaterial({ color: 0xb87333, metalness: 0.92, roughness: 0.33 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.88, roughness: 0.34 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xe9e5d9, metalness: 0.06, roughness: 0.52 }),
  seal: new THREE.MeshStandardMaterial({ color: 0x7d7d78, metalness: 0.85, roughness: 0.36 }),
  sealHot: new THREE.MeshStandardMaterial({ color: 0xc0392b, metalness: 0.6, roughness: 0.4, emissive: 0x7a1206, emissiveIntensity: 0.9 }),
  gas: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  rotor: new THREE.MeshStandardMaterial({ color: 0xb2b1aa, metalness: 0.78, roughness: 0.3 })
};
const shellMats = [mat.shell, mat.shellDark, mat.cast, mat.black, mat.rubber, mat.copper, mat.brass];
const ghostMats = [mat.shell, mat.shellDark, mat.cast];

// ---------------------------------------------------------------- 几何
function roundedRect(shape, w, h, r) {
  const x = -w / 2, y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

const HOUSING_PTS = epitrochoidPoints(480);

function epitrochoidPath(target) {
  const pts = HOUSING_PTS;
  target.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) target.lineTo(pts[i][0], pts[i][1]);
  target.closePath();
  return target;
}

function extrude(shape, depth, matOpts = {}) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 2,
    curveSegments: 2,
    steps: 1
  });
  g.translate(0, 0, -depth / 2);
  const m = new THREE.Mesh(g, matOpts.mat || mat.shell);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function housingBlock(depth) {
  const s = roundedRect(new THREE.Shape(), 2.66, 2.6, 0.3);
  const hole = new THREE.Path();
  epitrochoidPath(hole);
  s.holes.push(hole);
  return extrude(s, depth);
}

function plateShape(w, h, r) {
  return roundedRect(new THREE.Shape(), w, h, r);
}

function rotorShape() {
  const pts = rotorPoints();
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function rotorMesh() {
  const g = new THREE.Group();
  const body = extrude(rotorShape(), 0.6, { mat: mat.rotor });
  body.castShadow = true;
  g.add(body);

  // 中心轴承
  const bearing = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.72, 40), mat.steelDark);
  bearing.rotation.x = Math.PI / 2;
  bearing.castShadow = true;
  g.add(bearing);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 36), mat.shellDark);
  boss.rotation.x = Math.PI / 2;
  boss.position.z = 0.3;
  g.add(boss);
  const boss2 = boss.clone();
  boss2.position.z = -0.3;
  g.add(boss2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + 0.3;
    const bl = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.05, 6), mat.steelDark);
    bl.rotation.x = Math.PI / 2;
    bl.position.set(0.235 * Math.cos(a), 0.235 * Math.sin(a), 0.31);
    g.add(bl);
  }
  const bore = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.76, 32), mat.black);
  bore.rotation.x = Math.PI / 2;
  g.add(bore);

  // 端面油封环
  for (const [rad, tube] of [[0.56, 0.01]]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(rad, tube, 8, 96), mat.steelDark);
    t.position.z = 0.305;
    g.add(t);
    const t2 = t.clone();
    t2.position.z = -0.305;
    g.add(t2);
  }

  // 顶角密封片
  // 前后轮廓细线
  const pts = rotorPoints();
  const lineGeo = new THREE.BufferGeometry();
  const arr = [];
  for (const [x, y] of pts) arr.push(x * 1.002, y * 1.002, 0);
  lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  for (const zz of [0.303, -0.303]) {
    const line = new THREE.LineLoop(lineGeo, new THREE.LineBasicMaterial({ color: 0x2c2b27, transparent: true, opacity: 0.55 }));
    line.position.z = zz;
    g.add(line);
  }

  const seals = [];
  for (let k = 0; k < 3; k++) {
    const a = (k * TAU) / 3;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.085, 0.67), mat.seal);
    s.position.set(0.972 * Math.cos(a), 0.972 * Math.sin(a), 0);
    s.rotation.z = a + Math.PI / 2;
    s.castShadow = true;
    s.userData.baseScale = s.scale.clone();
    g.add(s);
    seals.push(s);
  }
  g.userData.seals = seals;
  return g;
}

// ---------------------------------------------------------------- 装配
const engine = new THREE.Group();
engine.rotation.y = -0.42;
engine.rotation.z = 0.16;
scene.add(engine);

const HD = 0.78;      // 缸体厚度
const Z = {
  cover: 1.07,
  frontPlate: 0.835,
  h1: 0.38,
  mid: -0.08,
  h2: -0.54,
  rearPlate: -0.995,
  rearCover: -1.21
};

const parts = {};
function reg(name, obj, ex, home) {
  obj.userData.home = home ? home.clone() : obj.position.clone();
  obj.userData.ex = ex;
  engine.add(obj);
  parts[name] = obj;
  return obj;
}

// 前盖
const frontCover = new THREE.Group();
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.34, 72), mat.shell);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = disc.receiveShadow = true;
  frontCover.add(disc);
  // 齿圈
  const toothGeo = new THREE.BoxGeometry(0.055, 0.075, 0.34);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    const t = new THREE.Mesh(toothGeo, mat.shellDark);
    t.position.set(1.235 * Math.cos(a), 1.235 * Math.sin(a), 0);
    t.rotation.z = a;
    t.castShadow = true;
    frontCover.add(t);
  }
  // 中心轮毂
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.14, 48), mat.shellDark);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = 0.24;
  hub.castShadow = true;
  frontCover.add(hub);
  const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.1, 6), mat.steelDark);
  nut.rotation.x = Math.PI / 2;
  nut.position.z = 0.34;
  frontCover.add(nut);
  const pulley = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 48), mat.steel);
  pulley.rotation.x = Math.PI / 2;
  pulley.position.z = 0.24;
  frontCover.add(pulley);
  const pulley2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 48), mat.steelDark);
  pulley2.rotation.x = Math.PI / 2;
  pulley2.position.z = 0.3;
  frontCover.add(pulley2);
  // 螺栓
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.2;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 6), mat.brass);
    b.rotation.x = Math.PI / 2;
    b.position.set(1.07 * Math.cos(a), 1.07 * Math.sin(a), 0.18);
    frontCover.add(b);
  }
  frontCover.position.z = Z.cover;
}
function fadeGroup(g, op) {
  if (op >= 0.999 && !g.userData._faded) return;
  if (op < 0.999) g.userData._faded = true;
  g.traverse((o) => {
    if (!o.isMesh) return;
    if (!o.userData._m) { o.userData._m = o.material; o.material = o.material.clone(); }
    const m = o.material;
    m.transparent = op < 0.998;
    m.opacity = op;
    m.depthWrite = op > 0.45;
  });
}
reg('frontCover', frontCover, 2.15);

// 前隔板
const frontPlate = new THREE.Group();
{
  const s = plateShape(2.66, 2.6, 0.3);
  const hole = new THREE.Path();
  epitrochoidPath(hole);
  s.holes.push(hole);
  const m = extrude(s, 0.13, { mat: mat.shellDark });
  frontPlate.add(m);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 6), mat.brass);
    b.rotation.x = Math.PI / 2;
    b.position.set(1.245 * Math.cos(a), 1.245 * Math.sin(a), 0);
    frontPlate.add(b);
  }
  frontPlate.position.z = Z.frontPlate;
}
reg('frontPlate', frontPlate, 1.55);

// 缸体 1
function makeHousing(zPos, phi0) {
  const g = new THREE.Group();
  const block = housingBlock(HD);
  block.position.z = 0;
  g.add(block);

  // 散热筋
  const finGeo = new THREE.BoxGeometry(0.06, 0.34, HD * 0.86);
  for (let i = 0; i < 6; i++) {
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(finGeo, mat.shellDark);
      f.position.set(sx * 1.345, -0.85 + i * 0.34, 0);
      f.castShadow = true;
      g.add(f);
    }
  }
  // 缸体侧螺栓
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + 0.13;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, HD * 0.9, 6), mat.steelDark);
    b.rotation.x = Math.PI / 2;
    b.position.set(1.245 * Math.cos(a), 1.245 * Math.sin(a), 0);
    g.add(b);
  }

  // 转子
  const rotor = rotorMesh();
  rotor.position.z = 0;
  rotor.rotation.z = phi0;
  g.add(rotor);

  // 气体面
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(2.56, 2.56), mat.gas.clone());
  plane.position.z = HD / 2 - 0.018;
  plane.renderOrder = 4;
  g.add(plane);

  g.position.z = zPos;
  g.userData.rotor = rotor;
  g.userData.plane = plane;
  g.userData.phi0 = phi0;
  return g;
}

const housing1 = makeHousing(Z.h1, 0);
reg('housing1', housing1, 0.95);

const housing2 = makeHousing(Z.h2, Math.PI);
reg('housing2', housing2, -0.18);

// 中隔板
const midPlate = new THREE.Group();
{
  const s = plateShape(2.66, 2.6, 0.3);
  const hole = new THREE.Path();
  epitrochoidPath(hole);
  s.holes.push(hole);
  midPlate.add(extrude(s, 0.14, { mat: mat.shellDark }));
  midPlate.position.z = Z.mid;
}
reg('midPlate', midPlate, 0.35);

// 后隔板
const rearPlate = new THREE.Group();
{
  const s = plateShape(2.66, 2.6, 0.3);
  const hole = new THREE.Path();
  epitrochoidPath(hole);
  s.holes.push(hole);
  rearPlate.add(extrude(s, 0.13, { mat: mat.shellDark }));
  rearPlate.position.z = Z.rearPlate;
}
reg('rearPlate', rearPlate, -1.4);

// 后盖
const rearCover = new THREE.Group();
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.3, 64), mat.shell);
  disc.rotation.x = Math.PI / 2;
  disc.castShadow = disc.receiveShadow = true;
  rearCover.add(disc);
  rearCover.position.z = Z.rearCover;
}
reg('rearCover', rearCover, -2.0);

// 偏心轴
const shaft = new THREE.Group();
{
  const main = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.145, 2.55, 28), mat.steel);
  main.rotation.x = Math.PI / 2;
  main.castShadow = true;
  shaft.add(main);
  for (const [z, a] of [[Z.h1, 0], [Z.h2, Math.PI]]) {
    const j = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.245, 0.58, 36), mat.steelDark);
    j.rotation.x = Math.PI / 2;
    j.position.set(E * Math.cos(a), E * Math.sin(a), z);
    shaft.add(j);
    const cw = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 40, 1, false, -0.7, 1.4), mat.steelDark);
    cw.rotation.x = Math.PI / 2;
    cw.rotation.z = a + Math.PI;
    cw.position.set(E * Math.cos(a + Math.PI) * 0.9, E * Math.sin(a + Math.PI) * 0.9, z);
    shaft.add(cw);
  }
  const nose = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.18, 32), mat.steel);
  nose.rotation.x = Math.PI / 2;
  nose.position.z = 1.14;
  shaft.add(nose);
  const nose2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 20), mat.steelDark);
  nose2.rotation.x = Math.PI / 2;
  nose2.position.z = 1.26;
  shaft.add(nose2);
}
shaft.position.z = 0;
engine.add(shaft);
shaft.userData.home = shaft.position.clone();
shaft.userData.ex = 0;

// 顶部：火花塞、分电器、高压线
const top = new THREE.Group();
{
  const plugGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.24, 18);
  const cerGeo = new THREE.CylinderGeometry(0.058, 0.058, 0.12, 18);
  const plugPos = [
    [0.28, 1.16, Z.h1 + 0.13], [-0.2, 1.19, Z.h1 - 0.13],
    [0.28, 1.16, Z.h2 + 0.13], [-0.2, 1.19, Z.h2 - 0.13]
  ];
  for (const [x, y, z] of plugPos) {
    const p = new THREE.Mesh(plugGeo, mat.steelDark);
    p.position.set(x, y, z);
    p.castShadow = true;
    top.add(p);
    const c = new THREE.Mesh(cerGeo, mat.ceramic);
    c.position.set(x, y + 0.16, z);
    top.add(c);
  }
  const dist = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.2, 0.42), mat.black);
  dist.position.set(0.62, 1.62, -0.86);
  dist.castShadow = true;
  top.add(dist);

  const wireMat = mat.rubber;
  for (let i = 0; i < 4; i++) {
    const [x, y, z] = plugPos[i];
    const start = new THREE.Vector3(0.62, 1.66, -0.86);
    const end = new THREE.Vector3(x, y + 0.19, z);
    const mid1 = new THREE.Vector3(start.x - 0.1, start.y + 0.12, start.z + 0.1);
    const mid2 = new THREE.Vector3(x + 0.05, y + 0.3, z + 0.05);
    const curve = new THREE.CatmullRomCurve3([start, mid1, mid2, end]);
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.022, 8, false), wireMat);
    top.add(tube);
  }
}
engine.add(top);
top.userData.home = top.position.clone();
top.userData.ex = 0;

// 进气
const intake = new THREE.Group();
{
  const plenum = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.36, 0.5), mat.shell);
  plenum.position.set(0.05, 1.35, -1.36);
  plenum.castShadow = plenum.receiveShadow = true;
  intake.add(plenum);
  const throat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.34, 28), mat.shellDark);
  throat.position.set(0.05, 1.7, -1.36);
  throat.castShadow = true;
  intake.add(throat);
  const flap = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.185, 0.02, 28), mat.brass);
  flap.position.set(0.05, 1.7, -1.2);
  flap.rotation.x = Math.PI / 2;
  intake.add(flap);
  for (const z of [Z.h1, Z.h2]) {
    const runner = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.3, 0.42), mat.shell);
    runner.position.set(0.05, 1.12, z - 0.1);
    runner.castShadow = true;
    intake.add(runner);
  }
}
engine.add(intake);
intake.userData.home = intake.position.clone();
intake.userData.ex = 0;

// 排气
const exhaust = new THREE.Group();
{
  const mk = (pts) => {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.098, 16, false), mat.copper);
    tube.castShadow = true;
    exhaust.add(tube);
  };
  for (const [sx, hz] of [[-1, Z.h1], [1, Z.h1], [-1, Z.h2], [1, Z.h2]]) {
    mk([
      [sx * 0.72, -0.98, hz + 0.14],
      [sx * 1.05, -1.24, hz + 0.2],
      [sx * 1.02, -1.5, hz + 0.42],
      [sx * 0.55, -1.6, 0.72]
    ]);
  }
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.62, 32), mat.copper);
  can.rotation.x = Math.PI / 2;
  can.position.set(0, -1.6, 0.7);
  can.castShadow = true;
  exhaust.add(can);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.14, 32), mat.steelDark);
  tip.rotation.x = Math.PI / 2;
  tip.position.set(0, -1.6, 1.03);
  exhaust.add(tip);
}
engine.add(exhaust);
exhaust.userData.home = exhaust.position.clone();
exhaust.userData.ex = 0;

// 机脚
const stand = new THREE.Group();
{
  const base = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.1, 1.9), mat.black);
  base.position.set(0, -1.58, -0.1);
  base.castShadow = base.receiveShadow = true;
  stand.add(base);
  for (const x of [-1.32, 1.32]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.9, 0.42), mat.black);
    arm.position.set(x, -1.14, -0.62);
    arm.castShadow = true;
    stand.add(arm);
    const lug = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 20), mat.steelDark);
    lug.rotation.z = Math.PI / 2;
    lug.position.set(x - Math.sign(x) * 0.05, -0.72, -0.62);
    stand.add(lug);
  }
}
engine.add(stand);
stand.userData.home = stand.position.clone();
stand.userData.ex = 0;

// 机体在场景里的位置
engine.position.set(0, 0.16, 0);

// ---------------------------------------------------------------- 气体绘制
const GAS = 768;
const gasCanvas = document.createElement('canvas');
gasCanvas.width = gasCanvas.height = GAS;
const g2d = gasCanvas.getContext('2d');
const gasTex = new THREE.CanvasTexture(gasCanvas);
gasTex.colorSpace = THREE.SRGBColorSpace;
gasTex.anisotropy = 4;
for (const h of [housing1, housing2]) {
  h.userData.plane.material.map = gasTex;
  h.userData.plane.material.needsUpdate = true;
}

const EXT = 2.56;
const toPx = (x, y) => [((x + EXT / 2) / EXT) * GAS, ((EXT / 2 - y) / EXT) * GAS];

const PHASE_COLORS = [
  { a: 'rgba(86,132,172,0.42)', b: 'rgba(118,168,204,0.16)', name: '进气' },
  { a: 'rgba(170,140,92,0.40)', b: 'rgba(206,180,130,0.15)', name: '压缩' },
  { a: 'rgba(206,84,36,0.52)', b: 'rgba(255,178,102,0.20)', name: '做功' },
  { a: 'rgba(118,112,100,0.36)', b: 'rgba(150,144,132,0.14)', name: '排气' }
];

function housingArc(t0, t1, n) {
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = t0 + ((t1 - t0) * i) / n;
    out.push([R * Math.cos(t) + E * Math.cos(3 * t), R * Math.sin(t) + E * Math.sin(3 * t)]);
  }
  return out;
}

function transformRot(p, cx, cy, ang) {
  const c = Math.cos(ang), s = Math.sin(ang);
  return [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c];
}

/** 三个工作腔：多边形 + 面积 + 相位 */
function chambers(phi) {
  const cx = E * Math.cos(phi), cy = E * Math.sin(phi);
  const rot = phi / 3;
  const out = [];
  for (let k = 0; k < 3; k++) {
    const ta = rot + (k * TAU) / 3;
    const tb = ta + TAU / 3;
    const arc = housingArc(ta, tb, 40);
    const flank = rotorFlank(k, 44).slice().reverse(); // apex k+1 → k
    const poly = arc.concat(flank.map((p) => transformRot(p, cx, cy, rot)));
    let area = 0;
    for (let i = 0; i < poly.length; i++) {
      const [x1, y1] = poly[i];
      const [x2, y2] = poly[(i + 1) % poly.length];
      area += x1 * y2 - x2 * y1;
    }
    out.push({ poly, area: Math.abs(area) / 2, k });
  }
  return out;
}

// 相位：曲轴每转 270° 一个冲程，三腔依次相差 360°
const PHASE_SHIFT = 0.0;
function phaseOf(phi, k) {
  const a = ((phi - k * TAU + PHASE_SHIFT) % (TAU * 3) + TAU * 3) % (TAU * 3);
  return Math.floor(a / (TAU * 0.75)) % 4;
}

// 体积标定
let VMAX = 0.654, VMIN = 0.0, AREA_MIN = 1, AREA_MAX = 1;
{
  const samples = [];
  for (let i = 0; i < 180; i++) {
    const phi = (i / 180) * TAU;
    const ch = chambers(phi);
    for (const c of ch) samples.push(c.area);
  }
  AREA_MIN = Math.min(...samples);
  AREA_MAX = Math.max(...samples);
}
function volumeOf(area) {
  const t = (area - AREA_MIN) / (AREA_MAX - AREA_MIN);
  return 0.06 + t * (VMAX - 0.06);
}

let lastGasPhi = 1e9;
function drawGas(phi, hot) {
  g2d.clearRect(0, 0, GAS, GAS);
  // 缸壁轮廓
  g2d.beginPath();
  HOUSING_PTS.forEach(([x, y], i) => {
    const [px, py] = toPx(x, y);
    if (i === 0) g2d.moveTo(px, py); else g2d.lineTo(px, py);
  });
  g2d.closePath();
  g2d.strokeStyle = 'rgba(30,27,22,0.42)';
  g2d.lineWidth = 2.2;
  g2d.stroke();
  g2d.save();
  g2d.clip();
  g2d.shadowColor = 'rgba(40,32,22,0.55)';
  g2d.shadowBlur = 14;
  g2d.lineWidth = 10;
  g2d.strokeStyle = 'rgba(0,0,0,0.55)';
  g2d.stroke();
  g2d.restore();
  const chs = chambers(phi);
  const rotorC = [E * Math.cos(phi), E * Math.sin(phi)];
  const sparkAng = 1.05;
  const sparkPt = [R * Math.cos(sparkAng) + E * Math.cos(3 * sparkAng), R * Math.sin(sparkAng) + E * Math.sin(3 * sparkAng)];

  for (const ch of chs) {
    const ph = phaseOf(phi, ch.k);
    const col = PHASE_COLORS[ph];
    const path = new Path2D();
    ch.poly.forEach(([x, y], i) => {
      const [px, py] = toPx(x, y);
      if (i === 0) path.moveTo(px, py);
      else path.lineTo(px, py);
    });
    path.closePath();

    const [ax, ay] = toPx(...ch.poly[0]);
    const [bx, by] = toPx(...ch.poly[Math.floor(ch.poly.length / 2)]);
    const grad = g2d.createLinearGradient(ax, ay, bx, by);
    grad.addColorStop(0, col.a);
    grad.addColorStop(1, col.b);
    g2d.fillStyle = grad;
    g2d.fill(path);

    // 边界：贴着缸壁与转子的一圈细线
    g2d.strokeStyle = 'rgba(38,34,28,0.30)';
    g2d.lineWidth = 1.6;
    g2d.stroke(path);

    // 点火：压缩末端在最窄处闪一下
    if (ph === 2) {
      const [sx, sy] = toPx(sparkPt[0], sparkPt[1]);
      const rg = g2d.createRadialGradient(sx, sy, 0, sx, sy, GAS * 0.22);
      const p = Math.min(1, (volumeOf(ch.area) - 0.06) / 0.5);
      rg.addColorStop(0, `rgba(255,240,205,${0.85 * (1 - p * 0.5)})`);
      rg.addColorStop(0.35, `rgba(255,170,80,${0.4 * (1 - p * 0.5)})`);
      rg.addColorStop(1, 'rgba(255,120,40,0)');
      g2d.globalCompositeOperation = 'lighter';
      g2d.fillStyle = rg;
      g2d.beginPath();
      g2d.arc(sx, sy, GAS * 0.22, 0, TAU);
      g2d.fill();
      g2d.globalCompositeOperation = 'source-over';
    }
  }
  // 把转子本体从气体里挖掉，让三角转子边缘干净
  const rot2 = phi / 3;
  const rp = new Path2D();
  rotorPoints().forEach(([x, y], i) => {
    const wx = rotorC[0] + x * Math.cos(rot2) - y * Math.sin(rot2);
    const wy = rotorC[1] + x * Math.sin(rot2) + y * Math.cos(rot2);
    const [px, py] = toPx(wx, wy);
    if (i === 0) rp.moveTo(px, py); else rp.lineTo(px, py);
  });
  rp.closePath();
  g2d.globalCompositeOperation = 'destination-out';
  g2d.fill(rp);
  g2d.globalCompositeOperation = 'source-over';
  g2d.strokeStyle = 'rgba(34,31,26,0.55)';
  g2d.lineWidth = 2.4;
  g2d.stroke(rp);

  // 磨损：漏气让做功腔发灰、带火星
  if (hot > 0.01) {
    g2d.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU;
      const rr = Math.random() * 0.7;
      const [px, py] = toPx(rotorC[0] + Math.cos(a) * rr, rotorC[1] + Math.sin(a) * rr);
      const s = 1 + Math.random() * 2.2;
      g2d.fillStyle = `rgba(255,${140 + Math.random() * 80},60,${0.35 * hot})`;
      g2d.fillRect(px, py, s, s);
    }
    g2d.globalCompositeOperation = 'source-over';
  }
  gasTex.needsUpdate = true;
}

// ---------------------------------------------------------------- 交互状态
const state = {
  cut: 0,
  cutTarget: 0,
  explode: 0,
  explodeTarget: 0,
  xray: false,
  slow: false,
  labels: true,
  fault: false,
  paused: false,
  throttle: 1
};

const ui = {
  kw: document.getElementById('kw'),
  rpm: document.getElementById('rpm'),
  nm: document.getElementById('nm'),
  bar: document.getElementById('intakeBar'),
  spark: document.getElementById('spark'),
  thrVal: document.getElementById('thrVal'),
  stateText: document.getElementById('stateText'),
  slowTag: document.getElementById('slowTag'),
  thr: document.getElementById('thr'),
  bPause: document.getElementById('bPause'),
  bExplode: document.getElementById('bExplode'),
  bCut: document.getElementById('bCut'),
  bXray: document.getElementById('bXray'),
  bSlow: document.getElementById('bSlow'),
  bLabel: document.getElementById('bLabel'),
  bFault: document.getElementById('bFault'),
  bTour: document.getElementById('bTour')
};

// ---------------------------------------------------------------- 动力学
const sim = {
  rpm: SPEC.engine.idle,
  phi: 0,
  wear: 0,
  shake: 0,
  kw: 0,
  nm: 0
};

function torqueAt(rpm) {
  const E0 = SPEC.engine;
  const t = E0.torquePeak - E0.torqueK * Math.pow(rpm - E0.torqueCenter, 2);
  return Math.max(40, t);
}

function updateSim(dt) {
  const thr = state.throttle;
  const targetRpm = SPEC.engine.idle + Math.pow(thr, 1.08) * (SPEC.engine.redline - SPEC.engine.idle);
  const tau = 0.5;
  const wearFactor = 1 - sim.wear * 0.35;
  sim.rpm += (targetRpm * wearFactor - sim.rpm) * Math.min(1, dt / tau);
  if (sim.rpm < SPEC.engine.idle + 5) sim.rpm = Math.max(SPEC.engine.idle, sim.rpm);

  const rpm = sim.rpm;
  let nm = torqueAt(rpm) * (1 - sim.wear * 0.46);
  let kw = (nm * rpm * TAU) / 60 / 1000;
  sim.nm = nm;
  sim.kw = kw;

  // 转子角
  const speed = state.slow ? 1 / 240 : 1 / 60;
  if (!state.paused) sim.phi += ((rpm / 3) * TAU / 60) * dt * speed;

  sim.shake *= 0.9;
}

// ---------------------------------------------------------------- 相机轨道
const cam = {
  theta: 0.36,
  phi: 1.31,
  radius: 8.6,
  target: new THREE.Vector3(0, 0.02, 0),
  vTheta: 0,
  vPhi: 0,
  dragging: false,
  lastX: 0,
  lastY: 0,
  auto: 0.0
};

function applyCamera() {
  const { theta, phi, radius, target } = cam;
  const sp = Math.sin(phi), cp = Math.cos(phi);
  camera.position.set(target.x + radius * sp * Math.sin(theta), target.y + radius * cp, target.z + radius * sp * Math.cos(theta));
  camera.lookAt(target);
}

canvas.addEventListener('pointerdown', (e) => {
  cam.dragging = true;
  cam.lastX = e.clientX;
  cam.lastY = e.clientY;
  canvas.classList.add('dragging');
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  if (!cam.dragging) return;
  const dx = e.clientX - cam.lastX;
  const dy = e.clientY - cam.lastY;
  cam.lastX = e.clientX;
  cam.lastY = e.clientY;
  cam.vTheta = -dx * 0.005;
  cam.vPhi = -dy * 0.004;
  cam.theta += cam.vTheta;
  cam.phi = Math.max(0.55, Math.min(1.75, cam.phi + cam.vPhi));
});
const endDrag = () => {
  cam.dragging = false;
  canvas.classList.remove('dragging');
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.radius = Math.max(3.4, Math.min(11, cam.radius * (1 + Math.sign(e.deltaY) * 0.08)));
}, { passive: false });

// ---------------------------------------------------------------- 标签
const LABEL_POS = {
  plug: [0.28, 1.33, Z.h1 + 0.12],
  body: [-1.12, 0.92, Z.h1 + 0.26],
  rotor: [0.46, 0.12, Z.h1 + 0.33],
  shaft: [0.05, 0.06, 1.7],
  seal: [0.9, -0.66, Z.h1 + 0.3],
  intake: [-1.2, 0.3, Z.h1 - 0.1],
  exhaust: [0.95, -1.1, Z.h1 + 0.2]
};
const labelDefs = Object.keys(LABEL_POS).map((id) => ({
  id,
  t: SPEC.labels[id][0],
  s: SPEC.labels[id][1],
  p: LABEL_POS[id]
}));
const chLabels = [0, 1, 2].map((k) => ({ id: 'ch' + k, t: '腔 ' + 'ABC'[k], s: '0.000 L', k }));

const labelEls = new Map();
const svg = document.getElementById('leaders');
const labelsRoot = document.getElementById('labels');
const SVGNS = 'http://www.w3.org/2000/svg';

for (const def of [...labelDefs, ...chLabels]) {
  const el = document.createElement('div');
  el.className = 'lab';
  el.innerHTML = `<b>${def.t}</b><span>${def.s}</span>`;
  labelsRoot.appendChild(el);
  const dot = document.createElementNS(SVGNS, 'circle');
  dot.setAttribute('r', '2.4');
  const line = document.createElementNS(SVGNS, 'polyline');
  svg.appendChild(dot);
  svg.appendChild(line);
  labelEls.set(def.id, { def, el, dot, line, y: 0 });
}

const _v = new THREE.Vector3();
function project(p) {
  _v.set(p[0], p[1], p[2]);
  engine.localToWorld(_v);
  _v.project(camera);
  const rect = stage.getBoundingClientRect();
  return [(_v.x * 0.5 + 0.5) * rect.width, (-_v.y * 0.5 + 0.5) * rect.height];
}

function layoutLabels(visibleSet, chamberInfo) {
  const rect = stage.getBoundingClientRect();
  const items = [];
  for (const [id, rec] of labelEls) {
    const show = state.labels && visibleSet.has(id);
    rec.el.classList.toggle('on', show);
    rec.dot.style.opacity = show ? 1 : 0;
    rec.line.style.opacity = show ? 1 : 0;
    if (!show) continue;
    let p = rec.def.p;
    if (rec.def.k !== undefined) p = chamberInfo[rec.def.k].centroid;
    const [x, y] = project(p);
    rec.anchor = [x, y];
    rec.el.querySelector('span').textContent = rec.def.k !== undefined ? chamberInfo[rec.def.k].vol.toFixed(3) + ' L' : rec.def.s;
    items.push(rec);
  }
  items.sort((a, b) => a.anchor[1] - b.anchor[1]);
  const labelX = Math.max(rect.width * 0.78, 700);
  const gap = 46;
  let y = Math.max(150, items.length ? items[0].anchor[1] : 150);
  for (const it of items) {
    y = Math.max(y, it.anchor[1] - 18);
    it.y = y;
    y += gap;
  }
  const maxY = rect.height - 120;
  if (items.length && items[items.length - 1].y > maxY) {
    let back = maxY;
    for (let i = items.length - 1; i >= 0; i--) {
      items[i].y = Math.min(items[i].y, back);
      back = items[i].y - gap;
    }
  }
  for (const it of items) {
    const [ax, ay] = it.anchor;
    const ly = it.y;
    it.el.style.transform = `translate(${labelX}px, ${ly}px) translateY(-50%)`;
    it.dot.setAttribute('cx', ax);
    it.dot.setAttribute('cy', ay);
    const elbowX = labelX - 16;
    it.line.setAttribute('points', `${ax},${ay} ${elbowX},${ly} ${labelX - 4},${ly}`);
  }
}

// ---------------------------------------------------------------- UI 绑定
let quiet = false;
function toast(msg) {
  if (quiet) return;
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('on'), 1800);
}

function setCut(v) {
  state.cutTarget = v;
  ui.bCut.classList.toggle('on', v > 0);
  if (v > 0) toast(SPEC.talks.cut);
}
function setExplode(v) {
  state.explodeTarget = v;
  ui.bExplode.classList.toggle('on', v > 0);
  if (v > 0) toast(SPEC.talks.explode);
}
function setXray(v) {
  state.xray = v;
  ui.bXray.classList.toggle('on', v);
  for (const m of ghostMats) {
    m.transparent = v;
    m.opacity = v ? 0.16 : 1;
    m.depthWrite = !v;
  }
  if (v) toast(SPEC.talks.xray);
}
function setSlow(v) {
  state.slow = v;
  ui.bSlow.classList.toggle('on', v);
  ui.slowTag.textContent = v ? '1:240 慢放' : '1:60 慢放';
}
function setLabels(v) {
  state.labels = v;
  ui.bLabel.classList.toggle('on', v);
}
function setFault(v) {
  state.fault = v;
  sim.wear = v ? 0.7 : 0;
  ui.bFault.classList.toggle('on', v);
  if (v) toast(SPEC.talks.fault);
}
function setPaused(v) {
  state.paused = v;
  ui.bPause.classList.toggle('on', v);
  ui.bPause.innerHTML = v ? '继续 <kbd>Space</kbd>' : '暂停 <kbd>Space</kbd>';
}

ui.bCut.onclick = () => setCut(state.cutTarget > 0 ? 0 : 1);
ui.bExplode.onclick = () => setExplode(state.explodeTarget > 0 ? 0 : 1);
ui.bXray.onclick = () => setXray(!state.xray);
ui.bSlow.onclick = () => setSlow(!state.slow);
ui.bLabel.onclick = () => setLabels(!state.labels);
ui.bFault.onclick = () => setFault(!state.fault);
ui.bPause.onclick = () => setPaused(!state.paused);
ui.thr.oninput = () => {
  state.throttle = ui.thr.value / 100;
  ui.thrVal.textContent = ui.thr.value;
};

// 初始：切开 / 拆开互斥
const _setCut = setCut, _setExplode = setExplode;
setCut = (v) => { _setCut(v); if (v) _setExplode(0); };
setExplode = (v) => { _setExplode(v); if (v) _setCut(0); };
state.labels = true;
ui.bLabel.classList.add('on');

const calcBtn = document.getElementById('calc');
const calcBox = document.getElementById('calcbox');
calcBtn.onclick = () => calcBox.classList.toggle('on');

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === ' ') { e.preventDefault(); setPaused(!state.paused); }
  if (k === 'c') setCut(state.cutTarget > 0 ? 0 : 1);
  if (k === 'e') setExplode(state.explodeTarget > 0 ? 0 : 1);
  if (k === 'x') setXray(!state.xray);
  if (k === 's') setSlow(!state.slow);
  if (k === 'l') setLabels(!state.labels);
  if (k === 'b') setFault(!state.fault);
  if (k === 'p') { tourState.open ? closeTour() : openTour(); }
  if (tourState.open && k === 'arrowright') { tourState.role = -1; applyStep(tourState.i + 1); }
  if (tourState.open && k === 'arrowleft') { tourState.role = -1; applyStep(tourState.i - 1); }
  if (k === 'escape') {
    if (document.body.classList.contains('self')) setSelf(false);
    else if (tourState.open) closeTour();
  }
});

// ---------------------------------------------------------------- 尺寸
function resize() {
  const r = stage.getBoundingClientRect();
  const w = Math.max(320, r.width), h = Math.max(320, r.height);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.setViewOffset(w, h, w * 0.052, 0, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- 主循环
let last = performance.now();
let gasTick = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  updateSim(dt);

  // 过渡
  state.cut += (state.cutTarget - state.cut) * Math.min(1, dt * 4.2);
  state.explode += (state.explodeTarget - state.explode) * Math.min(1, dt * 3.6);
  if (Math.abs(state.cutTarget - state.cut) < 0.001) state.cut = state.cutTarget;
  if (Math.abs(state.explodeTarget - state.explode) < 0.001) state.explode = state.explodeTarget;

  const c = state.cut, ex = state.explode;

  // 切开：前盖、前隔板让开
  frontCover.position.z = Z.cover + c * 0.75 - ex * 1.85;
  frontCover.position.x = c * 0.55;
  frontCover.position.y = c * 0.5;
  frontCover.rotation.z = c * 0.06;
  frontCover.visible = c < 0.995;
  fadeGroup(frontCover, Math.max(0, 1 - c * 1.15));

  frontPlate.position.z = Z.frontPlate + c * 0.55;
  frontPlate.position.x = c * 0.32;
  frontPlate.position.y = c * 0.3;
  frontPlate.visible = c < 0.99;
  fadeGroup(frontPlate, Math.max(0, 1 - c * 1.3));

  // 拆开：沿轴散开
  housing1.position.z = Z.h1 + ex * 0.8 - c * 0.02;
  midPlate.position.z = Z.mid + ex * 0.26;
  housing2.position.z = Z.h2 - ex * 0.24;
  rearPlate.position.z = Z.rearPlate - ex * 0.8;
  rearCover.position.z = Z.rearCover - ex * 1.35;
  rearCover.position.x = -ex * 0.18;
  top.position.y = ex * 0.35;
  intake.position.y = ex * 0.3;
  exhaust.position.y = -ex * 0.15;
  engine.rotation.x = -ex * 0.02;

  // 转子
  const phi1 = sim.phi;
  const phi2 = sim.phi + Math.PI;
  housing1.userData.rotor.position.x = E * Math.cos(phi1);
  housing1.userData.rotor.position.y = E * Math.sin(phi1);
  housing1.userData.rotor.rotation.z = phi1 / 3;
  housing2.userData.rotor.position.x = E * Math.cos(phi2);
  housing2.userData.rotor.position.y = E * Math.sin(phi2);
  housing2.userData.rotor.rotation.z = phi2 / 3;

  // 故障时的抖动与密封片
  const shake = state.fault ? (0.006 + Math.random() * 0.006) * Math.min(1, sim.rpm / 3000) : 0;
  engine.position.x = shake * (Math.random() - 0.5) * 2;
  engine.position.y = 0.16 + shake * (Math.random() - 0.5) * 2;
  for (const h of [housing1, housing2]) {
    for (const s of h.userData.rotor.userData.seals) {
      s.material = state.fault ? mat.sealHot : mat.seal;
      const k = state.fault ? 1 + Math.sin(now * 0.02 + s.id) * 0.04 : 1;
      s.scale.set(k, k, 1);
    }
  }

  // 气体
  gasTick += dt;
  if (gasTick > 0.016) {
    drawGas(phi1, state.fault ? 1 : 0);
    gasTick = 0;
  }

  // 相机惯性
  if (!cam.dragging) {
    cam.theta += cam.vTheta;
    cam.phi = Math.max(0.55, Math.min(1.75, cam.phi + cam.vPhi));
    cam.vTheta *= 0.92;
    cam.vPhi *= 0.92;
    cam.theta += cam.auto * dt;
  }
  applyCamera();

  // 面板
  const kwShown = Math.round(sim.kw);
  ui.kw.textContent = kwShown;
  ui.rpm.textContent = Math.round(sim.rpm).toLocaleString('en-US');
  ui.nm.textContent = Math.round(sim.nm);
  ui.bar.textContent = (0.35 + 0.65 * state.throttle).toFixed(2);
  ui.spark.textContent = Math.round((sim.rpm / 60) * 2);
  ui.stateText.textContent = state.fault
    ? '功率 · 密封片磨损 70%'
    : state.throttle > 0.92 ? '功率 · 全负荷' : state.throttle < 0.06 ? '功率 · 怠速' : '功率 · 部分负荷';
  ui.stateText.style.color = state.fault ? '#a63c19' : '';

  // 标签
  const chs = chambers(phi1);
  const chamberInfo = chs.map((ch) => {
    const n = ch.poly.length;
    const cx = ch.poly.reduce((s, p) => s + p[0], 0) / n;
    const cy = ch.poly.reduce((s, p) => s + p[1], 0) / n;
    return { centroid: [cx, cy, Z.h1 + 0.1], vol: volumeOf(ch.area), phase: phaseOf(phi1, ch.k) };
  });
  const vis = new Set();
  if (state.cut > 0.55) {
    vis.add('rotor'); vis.add('seal'); vis.add('body');
    for (let k = 0; k < 3; k++) vis.add('ch' + k);
  } else {
    vis.add('plug'); vis.add('body'); vis.add('shaft'); vis.add('intake'); vis.add('exhaust');
  }
  layoutLabels(vis, chamberInfo);

  // 比例尺
  const p0 = project([-1.18, -1.52, Z.h1 + 0.4]);
  const p1 = project([-1.18 + 1.0, -1.52, Z.h1 + 0.4]);
  const px = Math.abs(p1[0] - p0[0]);
  const sb = document.querySelector('#scalebar .line');
  if (sb) sb.style.width = px.toFixed(1) + 'px';

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

// 初始角度
applyCamera();
requestAnimationFrame(frame);

// 截图 / 自动化接口
window.__demo = {
  set(s = {}) {
    if (s.cut !== undefined) setCut(s.cut);
    if (s.explode !== undefined) setExplode(s.explode);
    if (s.xray !== undefined) setXray(!!s.xray);
    if (s.slow !== undefined) setSlow(!!s.slow);
    if (s.labels !== undefined) setLabels(!!s.labels);
    if (s.fault !== undefined) setFault(!!s.fault);
    if (s.paused !== undefined) setPaused(!!s.paused);
    if (s.throttle !== undefined) {
      state.throttle = s.throttle;
      ui.thr.value = String(Math.round(s.throttle * 100));
      ui.thrVal.textContent = Math.round(s.throttle * 100);
    }
    if (s.phi !== undefined) sim.phi = s.phi;
    if (s.rpm !== undefined) sim.rpm = s.rpm;
    if (s.tour !== undefined) { if (!tourState.open) openTour(); applyStep(s.tour); }
    if (s.role !== undefined) { if (!tourState.open) openTour(); jumpRole(s.role); }
    if (s.self !== undefined) setSelf(!!s.self);
    if (s.cam) {
      cam.theta = s.cam.theta ?? cam.theta;
      cam.phi = s.cam.phi ?? cam.phi;
      cam.radius = s.cam.radius ?? cam.radius;
      applyCamera();
    }
  },
  settle() {
    return new Promise((res) => {
      const t0 = performance.now();
      const tick = () => {
        if (performance.now() - t0 > (window.__settleMs || 900)) res(true);
        else requestAnimationFrame(tick);
      };
      tick();
    });
  }
};

// ---------------------------------------------------------------- 演示脚本
const tourEl = document.getElementById('tour');
const tourState = { open: false, i: 0, role: -1 };

(function buildTour() {
  const chips = document.getElementById('troleChips');
  SPEC.roles.forEach((r, i) => {
    const b = document.createElement('button');
    b.textContent = r.k;
    b.onclick = () => jumpRole(i);
    chips.appendChild(b);
  });
  const dots = document.getElementById('tdots');
  SPEC.tour.forEach(() => dots.appendChild(document.createElement('i')));
})();

function syncTourCard() {
  const step = SPEC.tour[tourState.i];
  const role = tourState.role >= 0 ? SPEC.roles[tourState.role] : null;
  document.getElementById('tno').textContent = String(tourState.i + 1).padStart(2, '0');
  document.getElementById('ttitle').textContent = step.title;
  document.getElementById('tline').textContent = role ? '「' + role.line + '」' : step.line;
  document.getElementById('troleline').textContent = role ? '对「' + role.k + '」说的 30 秒。' : '';
  document.querySelectorAll('#tdots i').forEach((d, k) => d.classList.toggle('on', k === tourState.i));
  document.querySelectorAll('#troleChips button').forEach((b, k) => b.classList.toggle('on', k === tourState.role));
}

function applyStep(i) {
  const step = SPEC.tour[i];
  tourState.i = Math.max(0, Math.min(SPEC.tour.length - 1, i));
  const st = step.state;
  quiet = true;
  setPaused(false);
  setCut(st.cut ? 1 : 0);
  setExplode(st.explode ? 1 : 0);
  setXray(!!st.xray);
  setSlow(!!st.slow);
  setFault(!!st.fault);
  if (st.throttle !== undefined) {
    state.throttle = st.throttle;
    ui.thr.value = String(Math.round(st.throttle * 100));
    ui.thrVal.textContent = String(Math.round(st.throttle * 100));
  }
  if (st.rot !== undefined) sim.phi = st.rot;
  if (step.cam) {
    cam.theta = step.cam.theta;
    cam.phi = step.cam.phi;
    cam.radius = step.cam.radius;
    applyCamera();
  }
  quiet = false;
  syncTourCard();
}

function openTour() {
  tourEl.classList.remove('off');
  ui.bTour.classList.add('on');
  tourState.open = true;
  tourState.role = -1;
  applyStep(0);
}
function closeTour() {
  tourEl.classList.add('off');
  ui.bTour.classList.remove('on');
  tourState.open = false;
}
function jumpRole(i) {
  tourState.role = i;
  applyStep(SPEC.roles[i].step);
  syncTourCard();
}
function setSelf(v) {
  document.body.classList.toggle('self', v);
  if (v) closeTour();
  toast(v ? '客户自助版：只留四个交互，右下角是预约入口' : '回到销售版');
}
ui.bTour.onclick = () => (tourState.open ? closeTour() : openTour());
document.getElementById('tPrev').onclick = () => { tourState.role = -1; applyStep(tourState.i - 1); };
document.getElementById('tNext').onclick = () => { tourState.role = -1; applyStep(tourState.i + 1); };
document.getElementById('tExit').onclick = closeTour;
const tSelfBtn = document.getElementById('tSelf');
if (tSelfBtn) tSelfBtn.onclick = () => setSelf(true);
document.getElementById('ctaExit').onclick = () => setSelf(false);

// 把 spec 写进页面
(function applySpec() {
  document.title = SPEC.docTitle;
  const brand = document.querySelector('#top .brand');
  if (brand) brand.innerHTML = '<span class="slash">/</span>' + SPEC.brand.replace(/^\//, '');
  const title = document.querySelector('#top .title');
  if (title) title.textContent = SPEC.headline;
  const no = document.querySelector('#panel .no');
  if (no) no.textContent = SPEC.productNo;
  const name = document.querySelector('#panel .name');
  if (name) name.textContent = SPEC.productName;
  const sub = document.querySelector('#panel .sub');
  if (sub) sub.textContent = SPEC.productSub;
})();

window.__ready = true;
window.__dbg = { scene, engine, parts, housing1, housing2, THREE, mat, camera, cam, sim, state };
