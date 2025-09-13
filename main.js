import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import { io } from "socket.io-client";

// --- Basic Setup ---
console.log("Started");

const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(new THREE.Color(0x2a0b07), 10, 220);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 2.2, 5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.target.set(0, 1.5, 0);

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});
renderer.setSize(window.innerWidth, window.innerHeight);

// --- Lighting (as per your original code) ---
const hemi = new THREE.HemisphereLight(0xffe9d6, 0x0b0b10, 0.8);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffd1a6, 0.9);
dir.position.set(5, 10, 2);
scene.add(dir);
const fillLight = new THREE.PointLight(0xff6b3b, 0.12, 40);
fillLight.position.set(-6, 6, -6);
scene.add(fillLight);
const lightningLight = new THREE.PointLight(0xffffff, 0, 120);
lightningLight.position.set(0, 30, -40);
scene.add(lightningLight);

// --- Background ---
const loader = new THREE.TextureLoader();
loader.load("/backdrop3.png", (texture) => {
  scene.background = texture;
});

// --- Video Backdrop ---
const video = document.createElement("video");
video.src = "/background.mp4";
video.loop = true;
video.muted = true;
video.autoplay = true;
video.playsInline = true;
video.play().catch((e) => console.warn("Autoplay blocked:", e));
const videoTexture = new THREE.VideoTexture(video);
videoTexture.minFilter = THREE.LinearFilter;
videoTexture.magFilter = THREE.LinearFilter;
videoTexture.generateMipmaps = false;
videoTexture.colorSpace = THREE.SRGBColorSpace;
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
  videoMesh.position.z -= 5;
  videoMesh.position.y = camera.position.y;
}

// --- Road ---
function makeRoadTexture() {
  const W = 512,
    H = 2048;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#11131a";
  ctx.fillRect(0, 0, W, H);

  for (let i = 0; i < 8000; i++) {
    const x = Math.random() * W,
      y = Math.random() * H,
      a = Math.random() * 0.06;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

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
  ctx.fillStyle = "rgba(200,200,200,0.03)";
  ctx.fillRect(20, 0, 2, H);
  ctx.fillRect(W - 22, 0, 2, H);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 20);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}
const roadTex = makeRoadTexture();
const groundGeo = new THREE.PlaneGeometry(12, 400, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({
  map: roadTex,
  metalness: 0.05,
  roughness: 0.9,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -150;
scene.add(ground);

// --- Players Data ---
const fbxLoader = new FBXLoader();
const lanes = [-3.75, -1.25, 1.25, 3.75];
const players = [];
const playerMixers = [];
const playerActions = [];
const playerIdleActions = [];
for (let i = 0; i < 4; i++) {
  fbxLoader.load(`/models/player${0}.fbx`, (object) => {
    players[i] = object;
    players[i].scale.set(0.01, 0.01, 0.01);
    players[i].rotation.set(0, 135, 0);
    scene.add(players[i]);
    playerMixers[i] = new THREE.AnimationMixer(players[i]);
    if (object.animations && object.animations.length > 0) {
      playerActions[i] = playerMixers[i].clipAction(object.animations[0]);
    }
    fbxLoader.load("/models/idle.fbx", (animObj) => {
      if (animObj.animations.length > 0) {
        const idleClip = animObj.animations[0];
        playerIdleActions[i] = playerMixers[i].clipAction(idleClip);
        playerIdleActions[i].play();
      }
    });
    resetPositions();
  });
}

// --- Socket.io Setup ---
const socket = io(); // Change to your backend URL if needed

// Lobby UI Elements
const lobby = document.getElementById("lobby");
const status = document.getElementById("status");
const playerNameInput = document.getElementById("playerName");
const roomCodeInput = document.getElementById("roomCode");
const createBtn = document.getElementById("createBtn");
const joinBtn = document.getElementById("joinBtn");
const hud = document.getElementById("hud");
const inputEl = document.getElementById("input");
const promptEl = document.getElementById("prompt");
const wpmEl = document.getElementById("wpm");
const accEl = document.getElementById("acc");
const spdEl = document.getElementById("spd");
const gapEl = document.getElementById("gap");
const refreshBtn = document.getElementById("refresh");
const pauseBtn = document.getElementById("pause");
const prog = document.getElementById("prog");
const banner = document.getElementById("banner");

let myName = "";
let myRoom = "";
let playerList = [];
let playerStates = {};
let startedAt = null;
let paused = false;
let gameOver = false;
let target = "";

// Utility: generate valid room code (2 letters + 2 digits)
function generateRoomCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  return (
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    letters.charAt(Math.floor(Math.random() * letters.length)) +
    digits.charAt(Math.floor(Math.random() * digits.length)) +
    digits.charAt(Math.floor(Math.random() * digits.length))
  );
}

// --- Lobby button handlers ---
createBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  if (!name) return (status.textContent = "Please enter your name.");
  const room = generateRoomCode();
  myName = name;
  myRoom = room;
  status.textContent = `Creating room ${room} ...`;
  socket.emit("join-game", { roomId: room, name });
});

joinBtn.addEventListener("click", () => {
  const name = playerNameInput.value.trim();
  const room = roomCodeInput.value.trim().toUpperCase();
  if (!name || !room) return (status.textContent = "Please enter name and room code.");
  myName = name;
`  myRoom = room;
  status.textContent = `Joining room ${room} ...`;
  socket.emit("join-game", { roomId: room, name });
  console.log("Joining room:", room, name);
  
});

// --- Socket Event Handlers ---

socket.on("error-message", (msg) => {
  status.textContent = msg;
});

socket.on("player-list", (list) => {
  playerList = [...list];
  // After join success, switch UI to game view
  if (lobby.style.display !== "none") {
    lobby.style.display = "none";
    hud.style.display = "flex";
    canvas.style.display = "block";
    status.textContent = "";
    inputEl.focus();
  }
});

socket.on("leaderboar`d-update", (list) => {
  playerList = [...list];
  list.forEach((p) => {
    playerStates[p.name] = { ...p };
  });
});

socket.on("game-start", ({ paragraph }) => {
  target = paragraph;
  renderPrompt();
  resetPositions();
  inputEl.value = "";
  startedAt = null;
  paused = false;
  gameOver = false;
  banner.style.display = "none";
});

socket.on("game-over", ({ winner }) => {
  banner.textContent = `${winner} wins! Press Enter to play again.`;
  banner.style.display = "";
  paused = true;
  gameOver = true;
});

// --- Game Logic ---

function resetPositions() {
  for (let i = 0; i < players.length; i++) {
    if (players[i]) players[i].position.set(lanes[i], 0, 0);
    playerActions[i]?.reset();
  }
}

function findMyIndex() {
  return playerList.findIndex((p) => p.name === myName);
}

function animatePlayerStates(dt) {
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    if (!player) continue;
    const p = playerList[i];
    if (!p) continue;
    const pdata = playerStates[p.name];
    if (!pdata) continue;

    player.position.x = lanes[i];
    player.position.z = -pdata.progress * 60; // course length

    if (pdata.speed > 0.01) {
      playerIdleActions[i]?.stop();
      if (!playerActions[i]?.isRunning()) playerActions[i]?.play();
    } else {
      playerActions[i]?.stop();
      if (!playerIdleActions[i]?.isRunning()) playerIdleActions[i]?.play();
    }
    playerMixers[i]?.update(dt);
  }
}

inputEl.addEventListener("input", () => {
  if (gameOver || paused) return;
  const inputVal = inputEl.value || "";
  let typedCount = inputVal.length;
  let wrongCount = 0;
  for (let i = 0; i < inputVal.length && i < target.length; i++) {
    if (inputVal[i] !== target[i]) wrongCount++;
  }
  if (inputVal.length > target.length) wrongCount += inputVal.length - target.length;
  if (!startedAt && inputVal.length > 0) startedAt = Date.now();

  const minutes = startedAt ? (Date.now() - startedAt) / 60000 : 1;
  const wpm = typedCount === 0 ? 0 : typedCount / 5 / minutes;
  const acc = typedCount === 0 ? 1 : Math.max(0, (typedCount - wrongCount) / typedCount);
  const progress = Math.min(1, typedCount / (target.length || 1));

  socket.emit("progress-update", {
    roomId: myRoom,
    name: myName,
    progress,
    wpm,
    acc,
  });

  renderPrompt();
  prog.style.width = `${progress * 100}%`;

  if (progress === 1) {
    socket.emit("game-over", { roomId: myRoom, winner: myName });
  }
});

function renderPrompt() {
  const inputVal = inputEl.value || "";
  let html = "";
  for (let i = 0; i < target.length; i++) {
    const expected = target[i];
    const typed = inputVal[i];
    if (typed !== undefined) {
      html += `<span class="char ${typed === expected ? "correct" : "wrong"}">${escapeHTML(expected)}</span>`;
    } else if (i === inputVal.length) {
      html += `<span class="char current">${escapeHTML(expected)}</span>`;
    } else {
      html += `<span class="char future">${escapeHTML(expected)}</span>`;
    }
  }
  promptEl.innerHTML = html;
}

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m]);
}

function updateCamera() {
  const myIndex = findMyIndex();
  if (!players[myIndex]) return;
  camera.position.x = lanes[myIndex];
  camera.position.z = players[myIndex].position.z + 6;
  camera.lookAt(players[myIndex].position.x, players[myIndex].position.y + 1.5, players[myIndex].position.z);
}

function updateHUD() {
  const myIndex = findMyIndex();
  const myStats = playerStates[myName] || { wpm: 0, acc: 1, speed: 0, progress: 0 };
  wpmEl.textContent = Math.round(myStats.wpm || 0);
  accEl.textContent = ((myStats.acc * 100) | 0) + "%";
  spdEl.textContent = (myStats.speed || 0).toFixed(1);

  let gap = 0;
  if (playerList.length > 1) {
    let best = -Infinity;
    for (let i = 0; i < playerList.length; i++) {
      if (i === myIndex) continue;
      const other = playerStates[playerList[i].name];
      if (other && other.progress > best) best = other.progress;
    }
    gap = ((myStats.progress || 0) - best) * 60;
  }
  gapEl.textContent = (gap > 0 ? "Lead " : "Behind ") + Math.abs(gap).toFixed(1) + "m";
  accEl.className = myStats.acc < 0.93 ? "danger" : "ok";
}

// Main loop
let last = performance.now();
function tick(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;

  animatePlayerStates(dt);
  updateCamera();
  updateHUD();
  updateVideoBackdrop();

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// Controls
refreshBtn.addEventListener("click", () => {
  inputEl.value = "";
  startedAt = null;
  socket.emit("player-ready", { roomId: myRoom, name: myName });
  banner.style.display = "";
  banner.textContent = "Waiting for players...";
});

pauseBtn.addEventListener("click", () => {
  paused = !paused;
  banner.style.display = paused ? "" : "none";
});

document.addEventListener("keydown", (e) => {
  if (gameOver && e.key === "Enter") {
    socket.emit("player-ready", { roomId: myRoom, name: myName });
    banner.style.display = "none";
    paused = false;
    inputEl.value = "";
    startedAt = null;
  }
});
