console.log("Started");

import * as THREE from "./three.js";
import { OrbitControls } from "./orbitControls.js";

const _scene = new THREE.Scene();
console.log("Three.js working!", _scene);

    
const canvas = document.getElementById("game");
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x0f1115, 10, 180);

const camera = new THREE.PerspectiveCamera(
    60,
    innerWidth / innerHeight,
    0.1,
    500
);
camera.position.set(0, 4.5, 8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.target.set(0, 1, 0);

function resize() {
    renderer.setSize(innerWidth, innerHeight);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x20222a, 1.1);
scene.add(hemi);
const dir = new THREE.DirectionalLight(0xffffff, 0.8);
dir.position.set(5, 10, 2);
scene.add(dir);

// Ground (scrolling)
const groundGeo = new THREE.PlaneGeometry(20, 400, 1, 1);
const groundMat = new THREE.MeshStandardMaterial({
    color: 0x1a1f2a,
    metalness: 0.1,
    roughness: 0.9,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.z = -150;
scene.add(ground);

// Lane stripes for speed feel
const stripeGeo = new THREE.PlaneGeometry(0.15, 3);
const stripeMat = new THREE.MeshBasicMaterial({
    color: 0x4455aa,
    side: THREE.DoubleSide,
});
const stripes = [];
for (let i = 0; i < 40; i++) {
    const s = new THREE.Mesh(stripeGeo, stripeMat);
    s.rotation.x = -Math.PI / 2;
    s.position.set(-2.5 + (i % 3) * 2.5, 0.01, -i * 8);
    scene.add(s);
    stripes.push(s);
}

let lanes = [-2.5, 0, 2.5];
let currentLaneIndex = 1; // start at middle
let targetX = lanes[currentLaneIndex]; // for smooth sliding
let momentum = 0;


// 3D Characters
import { FBXLoader } from './node_modules/three/examples/jsm/loaders/FBXLoader.js';


const loader = new FBXLoader();

let player, playerMixer, playerAction, playerIdleAction;
let enemy, enemyMixer, enemyAction, enemyIdleAction;

loader.load('/models/player.fbx', (object) => {
    player = object; // FBX root is the object itself, not object.scene
    player.scale.set(0.01, 0.01, 0.01);  // FBX models are huge → scale down
    player.rotation.set(0, 135, 0);
    scene.add(player);

    // animation setup
    playerMixer = new THREE.AnimationMixer(player);
    if (object.animations && object.animations.length > 0) {
        playerAction = playerMixer.clipAction(object.animations[0]);
        // playerAction.play();
    }

    // Now load Idle separately
    loader.load('/models/idle.fbx', (animObj) => {
        if (animObj.animations.length > 0) {
            const idleClip = animObj.animations[0];
            playerIdleAction = playerMixer.clipAction(idleClip);
            playerIdleAction.play(); // start in idle state
        }
    });

    resetPositions();
    scene.add(player);
    scene.add(enemy);
});

loader.load('/models/enemy.fbx', (object) => {
    enemy = object; // FBX root is the object itself, not object.scene
    enemy.scale.set(0.01, 0.01, 0.01);  // FBX models are huge → scale down
    enemy.rotation.set(0, 135, 0);
    scene.add(enemy);

    // animation setup
    enemyMixer = new THREE.AnimationMixer(enemy);
    if (object.animations && object.animations.length > 0) {
        enemyAction = enemyMixer.clipAction(object.animations[0]);
        // playerAction.play();
    }

    // Now load Idle separately
    loader.load('/models/idle.fbx', (animObj) => {
        if (animObj.animations.length > 0) {
            const idleClip = animObj.animations[0];
            enemyIdleAction = enemyMixer.clipAction(idleClip);
            enemyIdleAction.play(); // start in idle state
        }
    });
    resetPositions();
});



// Player and Enemy
// const playerMat = new THREE.MeshStandardMaterial({
//     color: 0x80ffb4,
//     metalness: 0.2,
//     roughness: 0.6,
// });
// const enemyMat = new THREE.MeshStandardMaterial({
//     color: 0xff6b6b,
//     metalness: 0.2,
//     roughness: 0.6,
// });

// const player = new THREE.Mesh(
//     new THREE.CapsuleGeometry(0.5, 1.0, 8, 16),
//     playerMat
// );

// const enemy = new THREE.Mesh(
//     new THREE.CapsuleGeometry(0.5, 1.0, 8, 16),
//     enemyMat
// );


// Obstacles pool
const obstGeo = new THREE.BoxGeometry(1.3, 1.3, 1.3);
const obstMat = new THREE.MeshStandardMaterial({
    color: 0x89b4ff,
    metalness: 0.2,
    roughness: 0.7,
});
const obstacles = [];
const maxObst = 18;
for (let i = 0; i < maxObst; i++) {
    const m = new THREE.Mesh(obstGeo, obstMat);
    resetObstacle(m, true);
    scene.add(m);
    obstacles.push(m);
}
function resetObstacle(mesh, first = false) {
    const laneX = [-2.5, 0, 2.5][(Math.random() * 3) | 0];
    const z =
        -40 -
        Math.random() * 120 -
        (first ? Math.random() * 200 : 0);
    mesh.position.set(laneX, 0.65, z);
}

// ---------- Typing + Game Logic ----------
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

// Simple sentence bank (replace with your word-list generator)
const LINES = [
    "the quick brown fox jumps over the lazy dog",
    "a wizard's job is to vex chumps quickly in fog",
    "this is just sample text",
    "we will add dynamic text generation later",
    "tell me if you liked this prototype"
];

let target = "",
    idx = 0,
    startedAt = null;
let typedCount = 0,
    wrongCount = 0;
let paused = false,
    gameOver = false;

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
        // reset game state
        resetPositions();
        for (const o of obstacles) resetObstacle(o, true);
        gameOver = false;
    }
    inputEl.focus();
}

function resetPositions()
{
    if (player) {player.position.set(0, 1, 0);}
    if (enemy) {enemy.position.set(0, 1, 5);}
    momentum = 0;
    if (playerAction) {
            playerAction.reset();   // rewind to first frame
            // playerAction.paused = true; // keep frozen
    }
}

function renderPrompt() {
    // Build spans: done / current / rest; highlight wrong char
    const done = target.slice(0, idx);
    const current = target[idx] ?? "";
    const rest = target.slice(idx + 1);

    const typed = inputEl.value;
    const wrong =
        typed.length > 0 && typed[typed.length - 1] !== current;

    promptEl.innerHTML =
        `<span class="done">${escapeHTML(done)}</span>` +
        (current
            ? `<span class="${
                    wrong ? "wrong" : "current"
                }">${escapeHTML(current)}</span>`
            : "") +
        `<span>${escapeHTML(rest)}</span>`;
}
function escapeHTML(s) {
    return s.replace(
        /[&<>"']/g,
        (m) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[m])
    );
}

// inputEl.addEventListener("input", () => {
//     if (gameOver) return;
//     if (!startedAt) startedAt = performance.now();
//     const c = target[idx] ?? null;
//     const last = inputEl.value.slice(-1);
//     if (last === c) {
//         idx++;
//         typedCount++;
//     } else {
//         wrongCount++;
//         stumble();
//     } // penalize immediately
//     renderPrompt();
//     prog.style.width =
//         (idx / Math.max(1, target.length)) * 100 + "%";
//     if (idx >= target.length) {
//         // smooth bonus on line completion
//         lineCompleteBurst = 1.2; // short boost factor
//         newLine();
//     }
// });

// Inside your keydown event listener
// --- SHIFT+F / SHIFT+J lane switching (capture phase) ---
window.addEventListener('keydown', function (e) {
  // ignore combos with other modifiers (Ctrl/Alt/Meta) to avoid conflicts
  if (!e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;

  // make sure game is running
  if (gameOver) return;

  // Use e.code (KeyF / KeyJ) — reliable regardless of CapsLock / layout
  if (e.code === 'KeyF') {
    // intercept before it reaches the input
    e.preventDefault();
    e.stopImmediatePropagation();

    if (currentLaneIndex > 0) {
      currentLaneIndex--;
      targetX = lanes[currentLaneIndex];
      // optional: give small visual feedback (flash banner)
      // banner.textContent = "Moved Left"; banner.style.display = ''; setTimeout(()=>banner.style.display='none', 400);
    }
    return;
  }

  if (e.code === 'KeyJ') {
    e.preventDefault();
    e.stopImmediatePropagation();

    if (currentLaneIndex < lanes.length - 1) {
      currentLaneIndex++;
      targetX = lanes[currentLaneIndex];
      // optional feedback
    }
    return;
  }

}, /* useCapture = */ true);

inputEl.addEventListener("input", () => {
    if (gameOver) return;
    if (!startedAt)
    {
        momentum = 10; // initial boost
        if (playerAction) {playerAction.play();}
        if (enemyAction) {enemyAction.play();}
        if (playerIdleAction) {playerIdleAction.stop();}
        if (enemyIdleAction) {enemyIdleAction.stop();}
        startedAt = performance.now();
    }

    const currentChar = target[idx] ?? null;
    const last = inputEl.value.slice(-1);

    if (last === currentChar) {
        // ✅ correct → move forward
        idx++;
        typedCount++;
    } else if (last === " ") {
        // ✅ space → skip to next word
        while (target[idx] !== " " && idx < target.length) {
            idx++;
        }
        idx++; // skip the space itself
    } else {
        // ❌ mistake → ignore but still count for stats
        wrongCount++;
        stumble();
        idx++;
        typedCount++;
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
        banner.style.display = "none"; // hide floating notification
        paused = false;
        newLine(); // restart game
    }
});


// Speed mapping
let stumbleTimer = 0; // seconds remaining in stumble (heavier drag)
let lineCompleteBurst = 0; // brief boost
function stumble() {
    stumbleTimer = Math.min(stumbleTimer + 0.6, 1.2);
    enemyBoost *= 1.001; // +1% speed each mistake
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

// function playerSpeed(dt) {
//     const { wpm, acc } = computeStats();
//     // Base tuning: feel free to tweak
//     const base = 6.5; // base m/s
//     const wpmGain = Math.max(0, wpm - 35) * 0.09; // speed grows above 35 WPM
//     const accPenalty = (1 - acc) * 8.0; // reduce speed with errors
//     let speed = base + wpmGain - accPenalty;
//     if (stumbleTimer > 0) speed *= 0.45; // heavy drag when stumbling
//     if (lineCompleteBurst > 0) speed *= 1.08; // tiny reward on completes
//     return Math.max(2.5, speed); // never drop below jog
// }

// function enemySpeed(playerSpd) {
//     // Rubber-banding enemy that scales with “level”
//     const level = 1.0; // expand over time for difficulty
//     const target = playerSpd * (0.88 + 0.1 * level); // slightly slower than you… unless you mess up
//     return target + (stumbleTimer > 0 ? 2.1 : 0.0);
// }

function playerSpeed(dt) {
    const { wpm, acc } = computeStats();

    // Player base speed grows with WPM
    const base = Math.max(0, (wpm - 20) * 0.08); 
    const accFactor = Math.max(0, acc); 
    let speed = base * accFactor * 2.5;

    if (stumbleTimer > 0) speed *= 0.3;   // stumble slowdown
    if (lineCompleteBurst > 0) speed *= 1.1;

    return Math.max(momentum, speed);
}


function enemySpeed(playerSpd) {
    // Always a bit slower than player, unless mistakes stack up
    return playerSpd * (enemyBoost*wrongCount*0.1); 
}

let laneHistory = [];
const enemyDelayFrames = 30; // about 0.5s delay at 60fps
let enemyTargetLane = 1;

function updateEnemyLane() {
  // record player’s lane each frame
  laneHistory.push(currentLaneIndex);

  // once enough frames passed, update enemy's target lane
  if (laneHistory.length > enemyDelayFrames) {
    enemyTargetLane = laneHistory.shift();
  }

  // smoothly move enemy toward target lane
  const targetX = lanes[enemyTargetLane];
  if (enemy) {enemy.position.x += (targetX - enemy.position.x) * 0.1; }
  // 0.1 = smoothing factor (bigger = faster catch-up, smaller = smoother)
}



function updatePlayer(dt) {
    // Lerp toward target lane smoothly
    // enemy.position.x += (targetX - player.position.x) * dt * 10;
    player.position.x += (targetX - player.position.x) * dt * 10;

}


// Collision (AABB vs Capsule center approx)
function intersects(a, center, radius = 0.45) {
    const axMin = a.position.x - 0.65,
        axMax = a.position.x + 0.65;
    const ayMin = 0,
        ayMax = 1.3;
    const azMin = a.position.z - 0.65,
        azMax = a.position.z + 0.65;
    const cx = center.x,
        cy = center.y,
        cz = center.z;
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

    if (playerAction) { playerAction.stop();}
    if (playerIdleAction) {playerIdleAction.play();}
    if (enemyAction) { enemyAction.stop();}
    if (enemyIdleAction) {enemyIdleAction.play();}
}


// ---------- Game Loop ----------
let last = performance.now();
let start = false;
newLine();

function tick(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;
    if (playerMixer && enemyMixer) {
        if (playerIdleAction && !start)
        {
            playerIdleAction.play();
            if (enemyIdleAction) { enemyIdleAction.play();}
            start = true;
        }
        playerMixer.update(dt);
        enemyMixer.update(dt);
    }

    // if (player == undefined)
    // {
    //     return requestAnimationFrame(tick);
    // }

    if (!paused) {
        // Scroll ground & stripes for motion parallax (world moves backward)
        const spd = playerSpeed(dt);
        const worldMove = spd * dt;

        ground.position.z += worldMove;
        if (ground.position.z > -10) ground.position.z = -150;

        for (const s of stripes) {
            s.position.z += worldMove * 1.2;
            if (s.position.z > 6) s.position.z -= 320; // loop
        }

        // Move obstacles toward player (by moving them forward)
        for (const o of obstacles) {
            o.position.z += worldMove;
            if (o.position.z > 6) resetObstacle(o);
        }

        // Enemy rubber banding
        // const eSpd = enemySpeed(spd);
        // enemy.position.z += (spd - eSpd) * dt; // relative gap change
        // Enemy moves forward at its own pace
        const s_pd = playerSpeed(dt);
        const eSpd = enemySpeed(s_pd);

        if (player != undefined)
        {
            player.position.z += eSpd * dt;
            updatePlayer(dt);
            updateEnemyLane(dt);
        }



        // Simulate player forward progress by camera follow offset
        camera.position.z = 8;
        controls.update();

        // Collision checks: if we hit, stumble + push back enemy closer
        // for (const o of obstacles) {
        //     if (intersects(o, player.position)) {
        //         stumble();
        //         enemy.position.z = Math.min(
        //             enemy.position.z + 1.2,
        //             player.position.z - 0.5
        //         );
        //         resetObstacle(o);
        //         break;
        //     }
        // }
        if (player != undefined)
        {
            for (const o of obstacles) {
                if (intersects(o, player.position)) {
                    setGameOver("Crashed into obstacle!");
                    break;
                }
            }
        }


        // Stumble and burst timers
        if (stumbleTimer > 0) {
            stumbleTimer = Math.max(0, stumbleTimer - dt);
        }
        if (lineCompleteBurst > 0) {
            lineCompleteBurst = Math.max(
                0,
                lineCompleteBurst - dt * 1.5
            );
        }

        // Lose/win conditions
        if (player != undefined  && enemy != undefined && enemy.position.z <= player.position.z - 0.2) {
            setGameOver("Caught! Press New Line.");
        }
    }

    // HUD
    const { wpm, acc } = computeStats();
    wpmEl.textContent = Math.round(wpm);
    accEl.textContent = ((acc * 100) | 0) + "%";
    const spdNow = playerSpeed(0);
    spdEl.textContent = spdNow.toFixed(1);
    if (player != undefined && enemy != undefined) {const gap = player.position.z - enemy.position.z;}
    gapEl.textContent =
        (gap > 0 ? "Lead " : "Behind ") +
        Math.abs(gap).toFixed(1) +
        "m";
    accEl.className = "ok";
    if (acc < 0.93) accEl.className = "danger";

    renderer.render(scene, camera);
    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);