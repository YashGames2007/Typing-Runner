
console.log("Started");

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { io } from "socket.io-client";

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
camera.position.set(0, 2.2, 5);
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
loader.load("/backdrop3.png", function (texture) {
    scene.background = texture; // directly set as background
});
// Create HTML video element
// ---------- SKY / BACKDROP ----------

// Create HTML video element
// --- Video Element ---
const video = document.createElement('video');
video.src = '/background.mp4';  // your file
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

function updateVideoBackdrop() {
    videoMesh.position.copy(camera.position);
    videoMesh.position.z -= 5;   // always 20 units behind camera
    videoMesh.position.y = camera.position.y;
    // videoMesh.lookAt(camera.position);
}


scene.fog = new THREE.FogExp2(0x100000, 0.04); // adjust density


// --- Road Material ---
const roadMat = new THREE.MeshStandardMaterial({
    color: 0x333333,   // asphalt grey
    roughness: 0.8,
    metalness: 0.2,
});

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
const BILLBOARD_COUNT = 15;

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
const SPORE_COUNT = 100; // denser
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
  return -(Math.random()*110 + 5); // -25..-135
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
const LAMP_COUNT = 15;
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
const VINES_COUNT = 20;
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
    if (v.position.z > camera.position.z) resetVine(v);
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
const riftPool = []; const RIFT_COUNT = 7;
function placeRift(r, first=false){
  const side = Math.random()<0.5?-1:1; const x = side*(9+Math.random()*6);
  const y = .6+Math.random()*1.6; const z = first? (-(70+Math.random()*160)) : (-(100+Math.random()*200));
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
// let player, playerMixer, playerAction, playerIdleAction;
let enemy, enemyMixer, enemyAction, enemyIdleAction;

const fbxLoader = new FBXLoader();
const gltfLoader = new GLTFLoader();

// fbxLoader.load('/models/player.fbx', (object) => {
//     player = object;
//     player.scale.set(0.01, 0.01, 0.01);
//     player.rotation.set(0, 135, 0);
//     scene.add(player);
//     playerMixer = new THREE.AnimationMixer(player);
//     if (object.animations && object.animations.length > 0) {
//         playerAction = playerMixer.clipAction(object.animations[0]);
//     }
//     fbxLoader.load('/models/idle.fbx', (animObj) => {
//         if (animObj.animations.length > 0) {
//             const idleClip = animObj.animations[0];
//             playerIdleAction = playerMixer.clipAction(idleClip);
//             playerIdleAction.play();
//         }
//     });
//     resetPositions();
// });
const textureLoader = new THREE.TextureLoader();

const textures = {
    Arms: textureLoader.load('/textures/T_QK_Arms00_BC.png'),
    Body: textureLoader.load('/textures/T_QK_Body00_BC.png'),
    Head: textureLoader.load('/textures/T_QK_Head00_BC.png'),
    Teeth: textureLoader.load('/textures/T_QK_Teeth00_BC.png'),
};

// fbxLoader.load('/models/enemy.fbx', (object) => {
//   object.traverse((child) => {
//         if (child.isMesh) {
//             // Look at the material/mesh name in console to match properly
//             console.log("Mesh:", child.name);

//             if (child.name.includes("Arm")) {
//                 child.material = new THREE.MeshStandardMaterial({ map: textures.Arms });
//             } else if (child.name.includes("Body")) {
//                 child.material = new THREE.MeshStandardMaterial({ map: textures.Body });
//             } else if (child.name.includes("Head")) {
//                 child.material = new THREE.MeshStandardMaterial({ map: textures.Head });
//             } else if (child.name.includes("Teeth")) {
//                 child.material = new THREE.MeshStandardMaterial({ map: textures.Teeth });
//             }
//         }
//     });
//     enemy = object;
//     const n = 0.1;
//     enemy.scale.set(n, n, n);
//     // enemy.position.set(0, -2, 5);
//     enemy.rotation.set(0, 135, 0);
//     scene.add(enemy);
//     enemyMixer = new THREE.AnimationMixer(enemy);
    
//     if (object.animations && object.animations.length > 0) {
//         enemyAction = enemyMixer.clipAction(object.animations[0]);
//     }
//     fbxLoader.load('/models/idle.fbx', (animObj) => {
//         if (animObj.animations.length > 0) {
//             const idleClip = animObj.animations[0];
//             enemyIdleAction = enemyMixer.clipAction(idleClip);
//             enemyIdleAction.play();
//         }
//     });
//     resetPositions();
// });

// Define 4 lanes
const lanes = [-3.75, -1.25, 1.25, 3.75];

// Arrays to hold 4 players and their mixers/actions
const players = [];
const playerMixers = [];
const playerActions = [];
const playerIdleActions = [];

// Each player starts in their own lane
const currentLaneIndices = [0, 1, 2, 3];
const targetXs = lanes.slice(); // clone lanes as target X positions

// Load the same FBX model 4 times for 4 players

let size = [1.25, 1.25, 1.25, 1.25];

for (let i = 0; i < 4; i++) {
  fbxLoader.load('./models/player'+i+'.fbx', (object) => {
    // players[i] = gltf.scene;
    players[i] = object;
    players[i].scale.set(size[i], size[i], size[i]);
    players[i].rotation.set(0, 135, 0);
    scene.add(players[i]);
    playerMixers[i] = new THREE.AnimationMixer(players[i]);
    if (object.animations && object.animations.length > 0) {
        playerActions[i] = playerMixers[i].clipAction(object.animations[0]);
    }
    // fbxLoader.load('/models/running.fbx', (animObj) => {
    //     if (animObj.animations.length > 0) {
    //         const runningClip = animObj.animations[0];
    //         playerActions[i] = playerMixers[i].clipAction(runningClip);
    //         // playerActions[i].play();
    //     }
    // });
    fbxLoader.load('/models/idle.fbx', (animObj) => {
        if (animObj.animations.length > 0) {
            const idleClip = animObj.animations[0];
            playerIdleActions[i] = playerMixers[i].clipAction(idleClip);
            playerIdleActions[i].play();
        }
    });
    resetPositions();
});
}

// --- Typing Logic ---
// ---------- Typing + Game Logic (updated) ----------
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
// typedCount and wrongCount will be recomputed from input each time
let typedCount = 0, wrongCount = 0;
let paused = false, gameOver = false;
let enemyBoost = 0.1;

// helper to track previous input length so we only trigger stumble on newly typed wrong char
let prevInputLen = 0;

function newLine() {
    target = LINES[(Math.random() * LINES.length) | 0];
    idx = 0;
    inputEl.value = "";
    typedCount = 0;
    wrongCount = 0;
    prevInputLen = 0;
    startedAt = null;
    renderPrompt();
    prog.style.width = "0%";
    if (gameOver) {
        resetPositions();
        gameOver = false;
    }
    inputEl.focus();
}

function resetPositions()
{
    for (let i = 0; i < players.length; i++)
    {
      if (players[i]) {players[i].position.set(lanes[i], 0, 0);}
      if (playerActions[i]) { playerActions[i].reset(); }
    }
    if (enemy) {enemy.position.set(0, 0, 5);}
    momentum = 0;
}

// New renderPrompt: color each character individually:
// - correct: user typed same char at that position => green
// - wrong: user typed different char at that position => red
// - current: next character to type (if no char typed there yet)
// - rest: untouched
// --- RENDER PROMPT FUNCTION ---
function renderPrompt() {
    const inputVal = inputEl.value || "";
    let html = "";

    for (let i = 0; i < target.length; i++) {
        const expected = target[i];
        const typed = inputVal[i];

        if (typed !== undefined) {
            if (typed === expected) {
                html += `<span class="char correct">${escapeHTML(expected)}</span>`;
            } else {
                html += `<span class="char wrong">${escapeHTML(expected)}</span>`;
            }
        } else if (i === inputVal.length) {
            html += `<span class="char current">${escapeHTML(expected)}</span>`;
        } else {
            html += `<span class="char future">${escapeHTML(expected)}</span>`;
        }
    }

    promptEl.innerHTML = html;
    idx = inputVal.length; // always advance by input length, even with mistakes
}


function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (m) => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]));
}

// --- INPUT HANDLER ---
inputEl.addEventListener("input", () => {
    if (gameOver) return;

    // start the run on first input
    if (!startedAt && inputEl.value.length > 0) {
        momentum = 10;
        for (let i = 0; i < players.length; i++) {
            if (playerActions[i]) playerActions[i].play();
            if (playerIdleActions[i]) playerIdleActions[i].stop();
        }
        if (enemyAction) enemyAction.play();
        if (enemyIdleAction) enemyIdleAction.stop();
        startedAt = performance.now();
    }

    const inputVal = inputEl.value || "";

    // recompute stats
    typedCount = inputVal.length;
    wrongCount = 0;
    for (let i = 0; i < inputVal.length && i < target.length; i++) {
        if (inputVal[i] !== target[i]) wrongCount++;
    }
    if (inputVal.length > target.length) {
        wrongCount += inputVal.length - target.length;
    }

    // trigger stumble only on newly added wrong char
    if (inputVal.length > prevInputLen) {
        const pos = inputVal.length - 1;
        if (pos < target.length && inputVal[pos] !== target[pos]) {
            stumble();
        } else if (pos >= target.length) {
            stumble();
        }
    }
    prevInputLen = inputVal.length;

    // update visuals
    renderPrompt();
    updatePlayer0Speed();
    prog.style.width = (idx / Math.max(1, target.length)) * 100 + "%";

    // completed line?
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
        typedCount > 0
            ? Math.max(0, (typedCount - wrongCount) / typedCount)
            : 1;
    return { wpm: grossWPM, acc: accuracy };
}

let momentum = 0;

// --- Player Speeds ---
const baseSpeed = 1.52;        // constant speed for AI players
let player0Speed = 0;  // typing-controlled speed
// let isIdle = true;

// Example: adjust speed by typing system (hook this to your typing accuracy logic)
function updatePlayer0Speed() {
    const { wpm, acc } = computeStats();

    const accFactor = Math.max(acc, 0.3); // 0..1
    const wpmFactor = Math.min(wpm / 100, 1.5);

    // balanced formula for speed
    player0Speed = 2.5 + (accFactor * wpmFactor * 5);
}


// --- Animate Players ---
function updatePlayers(delta) {
    // move AI players
    for (let i = 1; i < players.length; i++) {
        if (!players[i]) continue;

        players[i].position.z -= baseSpeed * delta;

        // if AI is moving, make sure run is playing instead of idle
        if (baseSpeed > 0) {
            if (playerIdleActions[i]) playerIdleActions[i].stop();
            if (playerActions[i] && !playerActions[i].isRunning()) {
                playerActions[i].play();
            }
        } else {
            if (playerActions[i]) playerActions[i].stop();
            if (playerIdleActions[i] && !playerIdleActions[i].isRunning()) {
                playerIdleActions[i].play();
            }
        }
    }

    // move player[0]
    if (players[0]) players[0].position.z -= player0Speed * delta;
}


// --- Camera Follow ---
// const cameraOffset = new THREE.Vector3(0, 3, 6); // height + back distance
function updateCamera() {
    if (!players[0]) return;

    // keep current x and y, just update z relative to player[0]
    const offsetZ = 6; // distance behind player[0]
    camera.position.z = players[0].position.z + offsetZ;

    // always look at player[0]
    // camera.lookAt(players[0].position.x, players[0].position.y + 1.5, players[0].position.z);
}

function enemySpeed() {
    return player0Speed + (enemyBoost * wrongCount);
}

function setGameOver(msg) {
    gameOver = true;
    paused = true;
    banner.textContent = msg + " Press Enter";
    banner.style.display = "";
    for (let i = 0; i < players.length; i++) {
      if (playerActions[i]) { playerActions[i].stop(); }
        if (playerIdleActions[i]) { playerIdleActions[i].play(); }
    }


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

// --- Scenery Pools ---
const sceneryPool = [];

// Helper to spawn objects
function spawnScenery(mesh, roadWidth = 10, sideOffset = 5, worldDepth = 100) {
    // pick left or right side
    const side = Math.random() > 0.5 ? 1 : -1;

    // place outside road width
    const x = side * (roadWidth / 2 + sideOffset + Math.random() * 10);
    const z = -20 - Math.random() * worldDepth;

    mesh.position.set(x, 0, z);

    scene.add(mesh);
    sceneryPool.push(mesh);
    return mesh;
}


// --- Procedural Elements ---

// Tree (cylinder trunk + cone leaves)
function makeTree() {
    const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.5, 4, 8),
        new THREE.MeshStandardMaterial({ color: 0x5a3a1a })
    );
    const leaves = new THREE.Mesh(
        new THREE.ConeGeometry(3, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0x0a5a0a })
    );
    leaves.position.y = 5;
    trunk.add(leaves);
    return trunk;
}

// Rock (icosahedron)
function makeRock() {
    return new THREE.Mesh(
        new THREE.IcosahedronGeometry(2, 0),
        new THREE.MeshStandardMaterial({ color: 0x555555, flatShading: true })
    );
}

// Mushroom (cylinder + sphere)
function makeMushroom() {
    const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xffffff })
    );
    const cap = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xff0000 })
    );
    cap.position.y = 0.9;
    stem.add(cap);
    return stem;
}

// Streetlamp (cylinder + sphere light)
function makeLamp() {
    const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.2, 0.2, 6, 8),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
    const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 8, 8),
        new THREE.MeshStandardMaterial({ emissive: 0xffffaa, emissiveIntensity: 2 })
    );
    bulb.position.y = 3;
    pole.add(bulb);
    return pole;
}

// Road sign (plane)
function makeSign() {
    const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1, 0.1, 3, 6),
        new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    const board = new THREE.Mesh(
        new THREE.BoxGeometry(2, 1.2, 0.2),
        new THREE.MeshStandardMaterial({ color: 0x3366ff })
    );
    board.position.y = 1.8;
    post.add(board);
    return post;
}

// Floating debris (box)
function makeDebris() {
    return new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
    );
}

// --- Initialize a few of each ---
function initScenery() {
    for (let i = 0; i < 10; i++) {
        spawnScenery(makeTree());
        spawnScenery(makeRock());
        spawnScenery(makeMushroom());
        spawnScenery(makeLamp());
        spawnScenery(makeSign());
        spawnScenery(makeDebris(), 10, 30);
    }
}
initScenery();

function updateScenery(worldMove) {
    for (const obj of sceneryPool) {
        obj.position.z += worldMove;

        if (obj.position.z > -20) {
            // recycle ahead in front of player
            const side = Math.random() > 0.5 ? 1 : -1;
            obj.position.z = -80 - Math.random() * 50;   // push far into distance
            obj.position.x = side * (10 + Math.random() * 15);
        }
    }
}



// ---------- Game Loop ----------
let last = performance.now();
let start = false;
newLine();

function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    // update mixers
    for (let i = 0; i < playerMixers.length; i++) {
        if (playerMixers[i]) playerMixers[i].update(dt);
    }
    if (enemyMixer) enemyMixer.update(dt);

    // lightning auto trigger
    if (now > nextLightningTime && !paused) {
        triggerLightning();
    }

    if (!paused) {
        // const spd = playerSpeed(dt);
        const worldMove = player0Speed * dt;

        // updatePlayers(dt);
        // ground scroll
        ground.position.z += worldMove;
        if (ground.position.z > -10) ground.position.z -= -150;

        // --- NEW: UPDATE BILLBOARD POSITION ---
        // billboard.position.z += worldMove;
        // if (billboard.position.z > 6) resetBillboard(bb, true);
        // multiple billboards (pool)
        for (const bb of billboardPool) {
          bb.position.z += worldMove;
          if (bb.position.z > camera.position.z) resetBillboard(bb);
        }

        // worldMove computed above
        updateSpores(dt, worldMove);
        updateLamps(dt, worldMove, now*0.001);
        updateVines(dt, worldMove, now*0.001);
        updateRifts(dt, worldMove, now*0.001);
        triggerRiftFlash();
        updateVideoBackdrop();
        updateScenery(worldMove);


        updatePlayers(dt);
        updateCamera(dt);
        const eSpd = enemySpeed();

        if (enemy) {enemy.position.z -= eSpd * dt;}

        if (stumbleTimer > 0) { stumbleTimer = Math.max(0, stumbleTimer - dt); }
        if (lineCompleteBurst > 0) { lineCompleteBurst = Math.max(0, lineCompleteBurst - dt * 1.5); }

        if (players[0] && enemy && enemy.position.z <= players[0].position.z - 0.2) {
            setGameOver("Caught! Press New Line.");
        }
    }

    // HUD
    const { wpm, acc } = computeStats();
    wpmEl.textContent = Math.round(wpm);
    accEl.textContent = ((acc * 100) | 0) + "%";
    const spdNow = player0Speed;
    spdEl.textContent = spdNow.toFixed(1);
    let gap = 0;
    if (players[0] && enemy) gap = players[0].position.z - enemy.position.z;
    gapEl.textContent = (gap > 0 ? "Lead " : "Behind ") + Math.abs(gap).toFixed(1) + "m";
    accEl.className = "ok";
    if (acc < 0.93) accEl.className = "danger";

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
