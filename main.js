console.log("Started");

import * as THREE from "./three.js";
import { OrbitControls } from "./orbitControls.js";
import { FBXLoader } from './threelabs/three/examples/jsm/loaders/FBXLoader.js';

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);

const scene = new THREE.Scene();

// --- STRANGER THINGS TONE ---
scene.fog = new THREE.Fog(new THREE.Color(0x2a0b07), 10, 220); // deep red-ish fog

// Camera + Controls
const camera = new THREE.PerspectiveCamera(75, innerWidth / innerHeight, 0.1, 1000);
camera.position.set(0, 3, 5);
// camera.rotation.y = Math.PI / 2;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.target.set(0, 1.5, 0);

// resize
function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// ---------- Lighting ----------
const hemi = new THREE.HemisphereLight(0xffe9d6, 0x0b0b10, 0.8);
scene.add(hemi);

const dir = new THREE.DirectionalLight(0xffd1a6, 0.9);
dir.position.set(5, 10, 2);
scene.add(dir);

// extra fill red-ish rim to tint scene
const fillLight = new THREE.PointLight(0xff6b3b, 0.12, 40);
fillLight.position.set(-6, 6, -6);
scene.add(fillLight);

// lightning (dynamic)
const lightningLight = new THREE.PointLight(0xffffff, 0, 120); // start off
lightningLight.position.set(0, 30, -40);
scene.add(lightningLight);

// ---------- SKY / BACKDROP ----------
// Uses the provided image as dramatic clouds background. We set it as a large distant plane
const loader = new THREE.TextureLoader();
loader.load("./public/backdrop3.png", function (texture) {
    scene.background = texture; // directly set as background
});
// Create HTML video element
// ---------- SKY / BACKDROP ----------

// Create HTML video element
// --- Video Element ---
const video = document.createElement('video');
video.src = './public/background.mp4';  // your file
video.loop = true;
video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.play().catch(err => console.warn("Autoplay blocked:", err));

// --- Video Texture ---
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;
videoTexture.colorSpace = THREE.SRGBColorSpace;

// --- Fullscreen Quad ---
const videoGeometry = new THREE.PlaneGeometry(25, 25);
const videoMaterial = new THREE.MeshBasicMaterial({ map: videoTexture });
const videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);

videoMesh.material.depthTest = false;
videoMesh.material.depthWrite = false;
videoMesh.renderOrder = -1;
videoMesh.position.y = 2.5;
scene.add(videoMesh);


// Very large plane behind the world as backdrop so we can keep fog and depth
// const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
// const skyGeo = new THREE.PlaneGeometry(200, 120);
// const skyPlane = new THREE.Mesh(skyGeo, skyMat);
// skyPlane.position.set(0, 25, -140);
// scene.add(skyPlane);

// subtle volumetric-like cloud layers: two semi-transparent planes for depth
// const cloudMat = new THREE.MeshStandardMaterial({
//     map: skyTex,
//     transparent: true,
//     opacity: 0.28,
//     depthWrite: false,
// });
// const cloudPlane1 = new THREE.Mesh(new THREE.PlaneGeometry(220, 120), cloudMat);
// cloudPlane1.position.set(0, 18, -120);
// cloudPlane1.rotation.y = 0.05;
// scene.add(cloudPlane1);
scene.fog = new THREE.FogExp2(0x100000, 0.04); // adjust density


// --- Road Material ---
const roadMat = new THREE.MeshStandardMaterial({
    color: 0x333333,   // asphalt grey
    roughness: 0.8,
    metalness: 0.2,
});

// --- Road Geometry (long strip in center) ---
// const roadGeo = new THREE.PlaneGeometry(10, 400); // narrower than grass
// const road = new THREE.Mesh(roadGeo, roadMat);
// road.rotation.x = -Math.PI / 2;
// road.position.set(0, 0, -150); 
// scene.add(road);

// --- Grass Material ---
const grassMat = new THREE.MeshStandardMaterial({
    color: 0x1d5e20,   // dark green
    roughness: 1,
    metalness: 0,
});

// --- Grass Geometry ---
const grassGeo = new THREE.PlaneGeometry(100, 400);

// Left grass
const grassLeft = new THREE.Mesh(grassGeo, grassMat);
grassLeft.rotation.x = -Math.PI / 2;
grassLeft.position.set(-30, -0.01, -150); // pushed left, slightly lower
scene.add(grassLeft);

// Right grass
const grassRight = new THREE.Mesh(grassGeo, grassMat);
grassRight.rotation.x = -Math.PI / 2;
grassRight.position.set(30, -0.01, -150); // pushed right, slightly lower
scene.add(grassRight);


// ---------- ROAD (canvas texture repeated) ----------
function makeRoadTexture() {
    const W = 512, H = 2048; // tall so repeat looks continuous
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");

    // background asphalt
    ctx.fillStyle = "#11131a";
    ctx.fillRect(0, 0, W, H);

    // subtle road noise
    for (let i = 0; i < 8000; i++) {
        const x = Math.random() * W, y = Math.random() * H;
        const a = Math.random() * 0.06;
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.fillRect(x, y, 1, 1);
    }

    // center double stripe (yellow)
    ctx.fillStyle = "#e6c84a";
    const centerX = W / 2;
    const stripeW = 8;
    const dashH = 60;
    const gapH = 40;
    let y = 0;
    while (y < H) {
        ctx.fillRect(centerX - 18, y, stripeW + 4, dashH);
        ctx.fillRect(centerX + 10, y, stripeW + 4, dashH);
        y += dashH + gapH;
    }

    // side edges (faded)
    ctx.fillStyle = "rgba(200,200,200,0.03)";
    ctx.fillRect(20, 0, 2, H);
    ctx.fillRect(W - 22, 0, 2, H);

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 20); // repeat vertically
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

const roadTex = makeRoadTexture();
const groundGeo = new THREE.PlaneGeometry(12, 400, 1, 1); // wider road
const groundMat = new THREE.MeshStandardMaterial({
    map: roadTex,
    metalness: 0.05,
    roughness: 0.9,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -150;
scene.add(ground);

// remove previous stripe geometry logic — replaced by road texture, but keep visual lane markers slightly
// const stripeGeo = new THREE.PlaneGeometry(0.15, 3);
// const stripeMat = new THREE.MeshBasicMaterial({
//     color: 0x332200,
//     side: THREE.DoubleSide,
// });
// const stripes = [];
// for (let i = 0; i < 20; i++) {
//     const s = new THREE.Mesh(stripeGeo, stripeMat);
//     s.rotation.x = -Math.PI / 2;
//     s.position.set(-2.5 + (i % 3) * 2.5, 0.01, -i * 16);
//     scene.add(s);
//     stripes.push(s);
// }

// ---------- WELCOME TO HAWKINS SIGN ----------
// function makeSignTexture(text = "WELCOME\nTO\nHAWKINS") {
//     const W = 512, H = 256;
//     const c = document.createElement("canvas");
//     c.width = W; c.height = H;
//     const ctx = c.getContext("2d");
//     ctx.fillStyle = "#2b2b2b";
//     ctx.fillRect(0, 0, W, H);

//     ctx.font = "bold 36px Arial";
//     ctx.fillStyle = "#fff";
//     ctx.textAlign = "center";
//     ctx.textBaseline = "middle";
//     const lines = text.split("\n");
//     for (let i = 0; i < lines.length; i++) {
//         ctx.fillText(lines[i], W / 2, (H / (lines.length + 1)) * (i + 1));
//     }

//     // wooden post
//     const tex = new THREE.CanvasTexture(c);
//     tex.encoding = THREE.sRGBEncoding;
//     return tex;
// }

// --- BILLBOARD MESHES ---
const signTex = makeSignTexture();
const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: false });
const signGeo = new THREE.PlaneGeometry(3, 1.5);
const signMesh = new THREE.Mesh(signGeo, signMat);
const postGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
const postMat = new THREE.MeshStandardMaterial({ color: 0x4b2f1a, metalness: 0.02, roughness: 0.9 });
const post = new THREE.Mesh(postGeo, postMat);
const billboard = new THREE.Group();
billboard.add(signMesh, post);
// scene.add(billboard);

// // --- NEW: BILLBOARD RESET FUNCTION ---
// function resetBillboard() {
//     // Randomly place the billboard on the left or right side of the road
//     const side = Math.random() < 0.5 ? -1 : 1;
//     billboard.position.x = (20 + Math.random() * 10) * side;
//     billboard.position.y = 0;
//     billboard.position.z = -150 - Math.random() * 200; // Reset far down the road
//     signMesh.position.set(0, 1.2, 0);
//     post.position.set(0, 0.1, 0);
// }
// resetBillboard(); // Initialize billboard position on load

// ====== THEMED BILLBOARDS POOL ======
const billboardTexts = [
  "WELCOME\nTO\nHAWKINS",
  "STARCOURT\nMALL",
  "MISSING\nHAVE YOU\nSEEN WILL?",
  "HOPPER'S\nCABIN",
  "PALACE\nARCADE"
];

function makeSignTexture(text = "WELCOME\nTO\nHAWKINS") {
  const W = 512, H = 256;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");

  // dark sign + red glow edge for vibe
  ctx.fillStyle = "#1e0707";
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#ff1515";
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, W-12, H-12);

  // retro serif-ish look approximation; later swap to ITC Benguiat if licensed
  ctx.font = "700 40px Georgia";
  ctx.fillStyle = "#ffdddd";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], W/2, (H/(lines.length+1))*(i+1));
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function makeBillboard() {
  const signTex = makeSignTexture(billboardTexts[(Math.random()*billboardTexts.length)|0]);
  const signMat = new THREE.MeshBasicMaterial({ map: signTex, transparent: false });
  const signGeo = new THREE.PlaneGeometry(3, 1.5);

  const signMesh = new THREE.Mesh(signGeo, signMat);
  const postGeo = new THREE.BoxGeometry(0.15, 2.2, 0.15);
  const postMat = new THREE.MeshStandardMaterial({ color: 0x4b2f1a, metalness: 0.02, roughness: 0.9 });
  const post = new THREE.Mesh(postGeo, postMat);

  const group = new THREE.Group();
  // position meshes inside group
  signMesh.position.set(0, 1.2, 0);
  post.position.set(0, 0.1, 0);
  group.add(signMesh, post);
  group.userData.signMesh = signMesh; // for retheming when recycled
  return group;
}

const billboardPool = [];
const BILLBOARD_COUNT = 6;

function resetBillboard(group, first=false) {
  const side = Math.random() < 0.5 ? -1 : 1;
  const offsetX = 10 + Math.random()*10;
  const z = first ? (-60 - Math.random()*260) : (-120 - Math.random()*240);
  group.position.set(offsetX*side, 0, z);
  // occasionally change the text to keep variety
  if (Math.random() < 0.4) {
    const newTex = makeSignTexture(billboardTexts[(Math.random()*billboardTexts.length)|0]);
    group.userData.signMesh.material.map.dispose?.();
    group.userData.signMesh.material.map = newTex;
    group.userData.signMesh.material.needsUpdate = true;
  }
}

for (let i = 0; i < BILLBOARD_COUNT; i++) {
  const bb = makeBillboard();
  resetBillboard(bb, true);
  scene.add(bb);
  billboardPool.push(bb);
}

// SIDE ELEMENTS

// ===== Upside Down Spores (particles) — DENSE & VISIBLE =====
function makeCircleSprite(size=64, inner='rgba(255,220,220,0.8)', outer='rgba(255,40,30,0)'){
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d'); const r = size/2;
  const g = ctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, inner); g.addColorStop(1, outer);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(r, r, r, 0, Math.PI*2); ctx.fill();
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true; return tex;
}

const sporeTex = makeCircleSprite(64);
const SPORE_COUNT = 10; // denser
const sporeGeo = new THREE.BufferGeometry();
const sporePos = new Float32Array(SPORE_COUNT*3);
const sporeVel = new Float32Array(SPORE_COUNT);

// Shoulder-focused spawn bands near the road: x in ±[6.5..10]
function randomShoulderX() {
  const side = Math.random() < 0.5 ? -1 : 1;
  return side * (6.5 + Math.random()*3.5);
}

// Closer Z spawn so they are visible sooner
function randomSpawnZ() {
  return -(Math.random()*110 + 25); // -25..-135
}

for (let i=0;i<SPORE_COUNT;i++){
  sporePos[i*3+0] = randomShoulderX();          // x near road shoulders
  sporePos[i*3+1] = Math.random()*8 + 1.0;      // y low to mid
  sporePos[i*3+2] = randomSpawnZ();             // z closer to camera
  sporeVel[i]      = 0.025 + Math.random()*0.065; // gentle up drift
}
sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos,3));

// Bigger size, additive, no fog; optional sizeAttenuation=false for screen-constant size
const sporeMat = new THREE.PointsMaterial({
  map: sporeTex,
  size: 0.55,                 // was 0.35; larger for visibility
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  color: new THREE.Color(0xff3b2f),
  opacity: 0.9,
  fog: false,                 // ignore scene fog to stay visible
  sizeAttenuation: true       // set to false if wanting constant screen size
});
const spores = new THREE.Points(sporeGeo, sporeMat);
scene.add(spores);

function updateSpores(dt, worldMove){
  const arr = spores.geometry.attributes.position.array;
  for (let i=0;i<SPORE_COUNT;i++){
    const j = i*3;
    // drift with world and float upward
    arr[j+2] += worldMove*0.95;            // slightly faster approach
    arr[j+1] += sporeVel[i]*dt*60;

    // Mild lateral shimmer near shoulders for movement variety
    arr[j+0] += Math.sin((last*0.001) + i*0.17) * 0.005;

    // recycle when past camera
    if (arr[j+2] > 6){
      arr[j+0] = randomShoulderX();
      arr[j+1] = Math.random()*8 + 1.0;
      arr[j+2] = randomSpawnZ();
      sporeVel[i] = 0.025 + Math.random()*0.065;
    }
  }
  spores.geometry.attributes.position.needsUpdate = true;
}

// ===== Flickering Streetlamps =====
function makeStreetLamp(){
  const g = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.06,0.06,5,8),
    new THREE.MeshStandardMaterial({color:0x202020, metalness:0.6, roughness:0.7})
  );
  pole.position.y = 2.5; g.add(pole);
  const headMat = new THREE.MeshStandardMaterial({color:0x111111, emissive:0x330000, emissiveIntensity:2});
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.15,12,12), headMat);
  head.position.set(0,5.1,0); g.add(head);
  const spot = new THREE.SpotLight(0xff5533, 0.0, 12, Math.PI/5, 0.4, 1.2);
  spot.position.set(0,5.1,0);
  spot.target.position.set(0,0,-2);
  g.add(spot, spot.target);
  g.userData = { head, spot, phase: Math.random()*Math.PI*2 };
  return g;
}

const lampPool = [];
const LAMP_COUNT = 4;
for(let i=0;i<LAMP_COUNT;i++){
  const L = makeStreetLamp();
  L.position.set((Math.random()<0.5?-1:1)*(8+Math.random()*6), 0, -(60+Math.random()*160));
  scene.add(L); lampPool.push(L);
}
function resetLamp(L){
  L.position.set((Math.random()<0.5?-1:1)*(8+Math.random()*6), 0, -(80+Math.random()*180));
  L.userData.phase = Math.random()*Math.PI*2;
}


function updateLamps(dt, worldMove, t){
  for (const L of lampPool){
    L.position.z += worldMove;
    // random stuttered flicker
    const flicker = (Math.sin(t*3 + L.userData.phase) > 0.7) ? 1 : (Math.random()<0.02?1:0);
    const intensity = flicker ? (0.6 + Math.random()*1.4) : 0.0;
    L.userData.spot.intensity = intensity;
    L.userData.head.material.emissiveIntensity = intensity*2.0;
    if (L.position.z > 6) resetLamp(L);
  }
}

// ===== Creeping Vines =====
function makeVineCluster(){
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x3a0b0f, roughness: 0.95, metalness: 0.05 });
  const count = 6 + (Math.random()*6|0);
  for (let i=0;i<count;i++){
    const h = 0.6 + Math.random()*1.4;
    const r = 0.04 + Math.random()*0.05;
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,6), mat);
    seg.position.set((Math.random()*1.8-0.9), h/2, (Math.random()*1.8-0.9));
    seg.rotation.z = (Math.random()*0.6 - 0.3);
    seg.rotation.x = (Math.random()*0.4 - 0.2);
    g.add(seg);
  }
  g.userData = { baseScale: 1 + Math.random()*0.2, phase: Math.random()*Math.PI*2 };
  return g;
}

const vinesPool = [];
const VINES_COUNT = 10;
for (let i=0;i<VINES_COUNT;i++){
  const v = makeVineCluster();
  v.position.set((Math.random()<0.5?-1:1)*(7.5+Math.random()*5.5), 0, -(50+Math.random()*160));
  scene.add(v); vinesPool.push(v);
}
function resetVine(v){
  v.position.set((Math.random()<0.5?-1:1)*(7.5+Math.random()*5.5), 0, -(70+Math.random()*180));
  v.userData.phase = Math.random()*Math.PI*2;
}


function updateVines(dt, worldMove, t){
  for (const v of vinesPool){
    v.position.z += worldMove;
    const s = v.userData.baseScale * (1 + Math.sin(t*0.8 + v.userData.phase)*0.03);
    v.scale.set(s, s, s);
    if (v.position.z > 6) resetVine(v);
  }
}

// Layered Rift: membrane + glow veins + inner void
function makeRiftGroup(){
  const g = new THREE.Group();

  function canvasTex(draw){
    const W=512,H=1024; const c=document.createElement('canvas'); c.width=W; c.height=H;
    const ctx=c.getContext('2d'); draw(ctx,W,H); const t=new THREE.CanvasTexture(c);
    t.colorSpace=THREE.SRGBColorSpace; t.needsUpdate=true; return t;
  }

  // Inner dark membrane (main body that participates in fog)
  const memTex = canvasTex((ctx,W,H)=>{
    ctx.fillStyle='#0b0709'; ctx.fillRect(0,0,W,H);
    const g=ctx.createRadialGradient(W/2,H/2,20,W/2,H/2,Math.min(W,H)/2);
    g.addColorStop(0,'rgba(15,10,12,0.95)');
    g.addColorStop(1,'rgba(15,10,12,0.0)');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    // jagged silhouette alpha mask
    ctx.globalCompositeOperation='destination-in';
    ctx.beginPath();
    const steps=24; for(let i=0;i<=steps;i++){ const t=i/steps; const x=W*(0.5+0.12*Math.sin(t*7+Math.random()*0.4)); const y=H*t; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.lineTo(W, H); ctx.lineTo(0,H); ctx.closePath(); ctx.fill();
  });
  const memMat = new THREE.MeshBasicMaterial({ map: memTex, transparent:true, depthWrite:true, fog:true, opacity:0.9 });
  const mem = new THREE.Mesh(new THREE.PlaneGeometry(2.3,5.2,1,1), memMat);
  g.add(mem);

  // Outer emissive veins (additive, no fog)
  const veinsTex = canvasTex((ctx,W,H)=>{
    ctx.clearRect(0,0,W,H); ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle='rgba(255,70,50,0.9)'; ctx.lineWidth=6; ctx.lineCap='round';
    function branch(x,y,len,angle,w){
      ctx.lineWidth=w; ctx.beginPath(); ctx.moveTo(x,y);
      const x2=x+Math.cos(angle)*len, y2=y+Math.sin(angle)*len; ctx.lineTo(x2,y2); ctx.stroke();
      if (w>2){ const n=1+Math.random()*2|0; for(let i=0;i<n;i++){ branch(x2,y2,len*0.6, angle+(Math.random()*0.8-0.4), w*0.65); } }
    }
    for(let i=0;i<6;i++){ branch(W*0.5+(Math.random()*60-30), H*(0.15+0.7*Math.random()), 60+Math.random()*120, -Math.PI/2+(Math.random()*0.6-0.3), 5); }
  });
  const veinsMat = new THREE.MeshBasicMaterial({ map: veinsTex, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending, fog:false, opacity:0.85 });
  const veins = new THREE.Mesh(new THREE.PlaneGeometry(2.5,5.4,1,1), veinsMat); veins.position.z = 0.01; g.add(veins);

  // Inner void (gives sense of depth behind membrane)
  const voidTex = canvasTex((ctx,W,H)=>{
    const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,W/2);
    grd.addColorStop(0,'rgba(3,2,3,1)'); grd.addColorStop(1,'rgba(3,2,3,0)');
    ctx.fillStyle=grd; ctx.fillRect(0,0,W,H);
  });
  const voidMat = new THREE.MeshBasicMaterial({ map:voidTex, transparent:true, depthWrite:false, fog:false, opacity:0.7 });
  const inner = new THREE.Mesh(new THREE.PlaneGeometry(2.0,4.8,1,1), voidMat); inner.position.z = -0.01; g.add(inner);

  g.userData = { pulse: 0, phase: Math.random()*Math.PI*2 };
  return g;
}

// Pool
const riftPool = []; const RIFT_COUNT = 3;
function placeRift(r, first=false){
  const side = Math.random()<0.5?-1:1; const x = side*(9+Math.random()*6);
  const y = 0.6+Math.random()*1.6; const z = first? (-(70+Math.random()*160)) : (-(100+Math.random()*200));
  r.position.set(x,y,z); r.rotation.y = (Math.random()*0.3-0.15);
  r.userData.pulse = 0; r.userData.phase = Math.random()*Math.PI*2;
}
for (let i=0;i<RIFT_COUNT;i++){ const r = makeRiftGroup(); placeRift(r,true); scene.add(r); riftPool.push(r); }

function updateRifts(dt, worldMove, t){
  for (const r of riftPool){
    r.position.z += worldMove;
    // subtle wobble and emissive pulse
    r.rotation.y += Math.sin(t*0.6 + r.userData.phase)*0.0015;
    const base = 0.6 + 0.3*Math.sin(t*1.3 + r.userData.phase);
    r.children[1].material.opacity = base + r.userData.pulse*0.5; // veins layer brighter
    r.userData.pulse = Math.max(0, r.userData.pulse - dt*2.0);
    if (r.position.z > 6) placeRift(r);
  }
}

// Optional: call during lightning to spike the glow
function triggerRiftFlash(){ for (const r of riftPool){ r.userData.pulse = 1.0; } }



// ---------- Simple animated lightning sprite (faint) ----------
const boltCanvas = document.createElement("canvas");
boltCanvas.width = 256; boltCanvas.height = 512;
const bctx = boltCanvas.getContext("2d");
bctx.fillStyle = "rgba(255,255,255,0)";
bctx.fillRect(0, 0, 256, 512);
// simple streak
bctx.fillStyle = "rgba(255,255,255,0.95)";
bctx.fillRect(120, 0, 8, 512);
const boltTex = new THREE.CanvasTexture(boltCanvas);
const boltMat = new THREE.MeshBasicMaterial({
    map: boltTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
const boltGeo = new THREE.PlaneGeometry(6, 16);
const boltMesh = new THREE.Mesh(boltGeo, boltMat);
boltMesh.position.set(-6, 18, -60);
scene.add(boltMesh);

// ---------- Player/Enemy loaders & base game logic kept largely unchanged ----------
let player, playerMixer, playerAction, playerIdleAction;
let enemy, enemyMixer, enemyAction, enemyIdleAction;

const fbxLoader = new FBXLoader();

fbxLoader.load('/models/player.fbx', (object) => {
    player = object;
    player.scale.set(0.01, 0.01, 0.01);
    player.rotation.set(0, 135, 0);
    scene.add(player);
    playerMixer = new THREE.AnimationMixer(player);
    if (object.animations && object.animations.length > 0) {
        playerAction = playerMixer.clipAction(object.animations[0]);
    }
    fbxLoader.load('/models/idle.fbx', (animObj) => {
        if (animObj.animations.length > 0) {
            const idleClip = animObj.animations[0];
            playerIdleAction = playerMixer.clipAction(idleClip);
            playerIdleAction.play();
        }
    });
    resetPositions();
});

fbxLoader.load('/models/enemy.fbx', (object) => {
    enemy = object;
    enemy.scale.set(0.01, 0.01, 0.01);
    enemy.rotation.set(0, 135 * (Math.PI/180), 0);
    scene.add(enemy);
    enemyMixer = new THREE.AnimationMixer(enemy);
    if (object.animations && object.animations.length > 0) {
        enemyAction = enemyMixer.clipAction(object.animations[0]);
    }
    fbxLoader.load('/models/idle.fbx', (animObj) => {
        if (animObj.animations.length > 0) {
            const idleClip = animObj.animations[0];
            enemyIdleAction = enemyMixer.clipAction(idleClip);
            enemyIdleAction.play();
        }
    });
    resetPositions();
});

// Obstacles pool (unchanged)
// const obstGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
// const obstMat = new THREE.MeshStandardMaterial({
//     color: 0x89b4ff,
//     metalness: 0.2,
//     roughness: 0.7,
// });
// const obstacles = [];
// const maxObst = 18;
// for (let i = 0; i < maxObst; i++) {
//     const m = new THREE.Mesh(obstGeo, obstMat);
//     resetObstacle(m, true);
//     scene.add(m);
//     obstacles.push(m);
// }
// function resetObstacle(mesh, first = false) {
//     const laneX = [-2.5, 0, 2.5][(Math.random() * 3) | 0];
//     const z =
//         -40 -
//         Math.random() * 120 -
//         (first ? Math.random() * 200 : 0);
//     mesh.position.set(laneX, 0.65, z);
// }

// ---------- Typing + Game Logic (unchanged, pasted for completeness) ----------
const promptEl = document.getElementById("prompt");
const inputEl = document.getElementById("input");
const wpmEl = document.getElementById("wpm");
const accEl = document.getElementById("acc");
const spdEl = document.getElementById("spd");
const gapEl = document.getElementById("gap");
const refreshBtn = document.getElementById("refresh");
const pauseBtn = document.getElementById("pause");
const prog = document.getElementById("prog");
const banner = document.getElementById("banner");

const LINES = [
    "the quick brown fox jumps over the lazy dog",
    "a wizard's job is to vex chumps quickly in fog",
    "this is just sample text",
    "we will add dynamic text generation later",
    "tell me if you liked this prototype"
];

let target = "", idx = 0, startedAt = null;
let typedCount = 0, wrongCount = 0;
let paused = false, gameOver = false;
let enemyBoost = 0.1;

function newLine() {
    target = LINES[(Math.random() * LINES.length) | 0];
    idx = 0;
    inputEl.value = "";
    typedCount = 0;
    wrongCount = 0;
    startedAt = null;
    renderPrompt();
    prog.style.width = "0%";
    if (gameOver) {
        resetPositions();
        // for (const o of obstacles) resetObstacle(o, true);
        gameOver = false;
    }
    inputEl.focus();
}

function resetPositions()
{
    if (player) {player.position.set(0, 0, 0);}
    if (enemy) {enemy.position.set(0, 0, 5);}
    momentum = 0;
    if (playerAction) { playerAction.reset(); }
}

function renderPrompt() {
    const done = target.slice(0, idx);
    const current = target[idx] ?? "";
    const rest = target.slice(idx + 1);

    const typed = inputEl.value;
    const wrong = typed.length > 0 && typed[typed.length - 1] !== current;

    promptEl.innerHTML =
        `<span class="done">${escapeHTML(done)}</span>` +
        (current
            ? `<span class="${wrong ? "wrong" : "current"}">${escapeHTML(current)}</span>`
            : "") +
        `<span>${escapeHTML(rest)}</span>`;
}
function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}

window.addEventListener('keydown', function (e) {
  if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
  if (gameOver) return;
  if (e.code === 'KeyF') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (currentLaneIndex > 0) { currentLaneIndex--; targetX = lanes[currentLaneIndex]; }
    return;
  }
  if (e.code === 'KeyJ') {
    e.preventDefault(); e.stopImmediatePropagation();
    if (currentLaneIndex < lanes.length - 1) { currentLaneIndex++; targetX = lanes[currentLaneIndex]; }
    return;
  }
}, true);

inputEl.addEventListener("input", () => {
    if (gameOver) return;
    if (!startedAt)
    {
        momentum = 10;
        if (playerAction) { playerAction.play(); }
        if (enemyAction) { enemyAction.play(); }
        if (playerIdleAction) { playerIdleAction.stop(); }
        if (enemyIdleAction) { enemyIdleAction.stop(); }
        startedAt = performance.now();
    }

    const currentChar = target[idx] ?? null;
    const last = inputEl.value.slice(-1);

    if (last === currentChar) {
        idx++; typedCount++;
    } else if (last === " ") {
        while (target[idx] !== " " && idx < target.length) { idx++; }
        idx++;
    } else {
        wrongCount++;
        stumble();
        idx++; typedCount++;
    }

    renderPrompt();
    prog.style.width = (idx / Math.max(1, target.length)) * 100 + "%";

    if (idx >= target.length) {
        lineCompleteBurst = 1.2;
        newLine();
    }
});

refreshBtn.addEventListener("click", newLine);
pauseBtn.addEventListener("click", () => {
    paused = !paused;
    banner.style.display = paused ? "" : "none";
});
document.addEventListener("keydown", (e) => {
    if (gameOver && e.key === "Enter") {
        banner.style.display = "none";
        paused = false;
        newLine();
    }
});

// Speed mapping & game variables (kept structure, modified tuning slightly)
let stumbleTimer = 0;
let lineCompleteBurst = 0;
function stumble() {
    stumbleTimer = Math.min(stumbleTimer + 0.6, 1.2);
    enemyBoost *= 1.001;
}

function computeStats() {
    const now = performance.now();
    const minutes = startedAt ? (now - startedAt) / 60000 : 0;
    const grossWPM = minutes > 0 ? typedCount / 5 / minutes : 0;
    const accuracy =
        typedCount + wrongCount > 0
            ? typedCount / (typedCount + wrongCount)
            : 1;
    return { wpm: grossWPM, acc: accuracy };
}

function playerSpeed(dt) {
    const { wpm, acc } = computeStats();
    const base = Math.max(0, (wpm - 20) * 0.08);
    const accFactor = Math.max(0, acc);
    let speed = base * accFactor * 2.5;
    if (stumbleTimer > 0) speed *= 0.3;
    if (lineCompleteBurst > 0) speed *= 1.1;
    return Math.max(momentum, speed);
}

function enemySpeed(playerSpd) {
    return playerSpd * (enemyBoost * wrongCount * 0.1);
}

let lanes = [-2.5, 0, 2.5];
let currentLaneIndex = 1;
let targetX = lanes[currentLaneIndex];
let momentum = 0;

let laneHistory = [];
const enemyDelayFrames = 30;
let enemyTargetLane = 1;

function updateEnemyLane() {
  laneHistory.push(currentLaneIndex);
  if (laneHistory.length > enemyDelayFrames) {
    enemyTargetLane = laneHistory.shift();
  }
  const tx = lanes[enemyTargetLane];
  if (enemy) { enemy.position.x += (tx - enemy.position.x) * 0.1; }
}

function updatePlayer(dt) {
    if (player) player.position.x += (targetX - player.position.x) * dt * 10;
}

// collisions helper
function intersects(a, center, radius = 0.45) {
    const axMin = a.position.x - 0.65, axMax = a.position.x + 0.65;
    const ayMin = 0, ayMax = 1.3;
    const azMin = a.position.z - 0.65, azMax = a.position.z + 0.65;
    const cx = center.x, cy = center.y, cz = center.z;
    const dx = Math.max(axMin - cx, 0, cx - axMax);
    const dy = Math.max(ayMin - cy, 0, cy - ayMax);
    const dz = Math.max(azMin - cz, 0, cz - azMax);
    const dist = Math.hypot(dx, dy, dz);
    return dist < radius;
}

function setGameOver(msg) {
    gameOver = true;
    paused = true;
    banner.textContent = msg + " Press Enter";
    banner.style.display = "";
    if (playerAction) { playerAction.stop(); }
    if (playerIdleAction) { playerIdleAction.play(); }
    if (enemyAction) { enemyAction.stop(); }
    if (enemyIdleAction) { enemyIdleAction.play(); }
}

// ---------- Lightning logic ----------
let nextLightningTime = performance.now() + 2000;
function triggerLightning() {
    // random small flashes + big flashes
    const isBig = Math.random() > 0.6;
    const flashIntensity = isBig ? 6.0 + Math.random() * 4 : 1.5 + Math.random() * 1.5;
    const flashDuration = isBig ? 200 + Math.random() * 300 : 60 + Math.random() * 100;

    // animate bolt visibility (immediate)
    boltMat.opacity = isBig ? 0.85 : 0.35;
    lightningLight.intensity = flashIntensity;

    // small flicker sequence
    const t0 = performance.now();
    const steps = isBig ? 5 : 2;
    let i = 0;
    const interval = setInterval(() => {
        const now = performance.now();
        // pulse intensity
        lightningLight.intensity = flashIntensity * (0.7 + Math.random() * 0.6);
        boltMat.opacity = (0.3 + Math.random() * 0.7) * (isBig ? 1.0 : 0.5);
        if (++i >= steps || now - t0 > flashDuration + 300) {
            clearInterval(interval);
            lightningLight.intensity = 0;
            boltMat.opacity = 0;
        }
    }, 60);

    // schedule next lightning
    nextLightningTime = performance.now() + 2000 + Math.random() * 6000;
}

// ---------- Game Loop ----------
let last = performance.now();
let start = false;
newLine();

function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    // update mixers
    if (playerMixer) playerMixer.update(dt);
    if (enemyMixer) enemyMixer.update(dt);

    // lightning auto trigger
    if (now > nextLightningTime && !paused) {
        triggerLightning();
    }

    if (!paused) {
        const spd = playerSpeed(dt);
        const worldMove = spd * dt;

        // ground scroll
        ground.position.z += worldMove;
        if (ground.position.z > -10) ground.position.z = -150;

        // --- NEW: UPDATE BILLBOARD POSITION ---
        // billboard.position.z += worldMove;
        // if (billboard.position.z > 6) resetBillboard(bb, true);
        // multiple billboards (pool)
        for (const bb of billboardPool) {
          bb.position.z += worldMove;
          if (bb.position.z > 6) resetBillboard(bb);
        }

        // worldMove computed above
        updateSpores(dt, worldMove);
        updateLamps(dt, worldMove, now*0.001);
        updateVines(dt, worldMove, now*0.001);
        updateRifts(dt, worldMove, now*0.001);
        triggerRiftFlash();



        // for (const o of obstacles) {
        //     o.position.z += worldMove;
        //     if (o.position.z > 6) resetObstacle(o);
        // }

        const s_pd = playerSpeed(dt);
        const eSpd = enemySpeed(s_pd);

        if (player) {
            player.position.z += eSpd * dt;
            updatePlayer(dt);
            updateEnemyLane(dt);
        }

        camera.position.z = 4;
        controls.update();

        // collisions
        // if (player) {
        //     for (const o of obstacles) {
        //         if (intersects(o, player.position)) {
        //             setGameOver("Crashed into obstacle!");
        //             break;
        //         }
        //     }
        // }

        if (stumbleTimer > 0) { stumbleTimer = Math.max(0, stumbleTimer - dt); }
        if (lineCompleteBurst > 0) { lineCompleteBurst = Math.max(0, lineCompleteBurst - dt * 1.5); }

        if (player && enemy && enemy.position.z <= player.position.z - 0.2) {
            setGameOver("Caught! Press New Line.");
        }
    }

    // HUD
    const { wpm, acc } = computeStats();
    wpmEl.textContent = Math.round(wpm);
    accEl.textContent = ((acc * 100) | 0) + "%";
    const spdNow = playerSpeed(0);
    spdEl.textContent = spdNow.toFixed(1);
    let gap = 0;
    if (player && enemy) gap = player.position.z - enemy.position.z;
    gapEl.textContent = (gap > 0 ? "Lead " : "Behind ") + Math.abs(gap).toFixed(1) + "m";
    accEl.className = "ok";
    if (acc < 0.93) accEl.className = "danger";

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);