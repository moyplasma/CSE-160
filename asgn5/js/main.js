import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import { GLTFLoader }          from 'three/addons/loaders/GLTFLoader.js';

import { buildWorld, WALL_OBSTACLES, CIRCLE_OBSTACLES, STEP_ZONES } from './world.js';
import { setupDinos, checkDiscovery, updateDinos }  from './dinos.js';
import { drawMinimap }  from './minimap.js';
import { updateHUD, showVictory, hideStartOverlay, updateFPS,
         setProximityHint } from './ui.js';
import { clamp } from './utils.js';
import {
  MAP_HALF, PLAYER_HEIGHT, MOVE_SPEED, MOVE_ACCEL,
  PLAYER_RADIUS, BOB_FREQ, BOB_AMP,
  DINO_COUNT, DINO_BLOCK_RADIUS, PROXIMITY_HINT_DIST,
} from './constants.js';

// ── Renderer ──────────────────────────────────────────────────────────────────

const canvas   = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;

// ── Scene & Camera ────────────────────────────────────────────────────────────

const scene = new THREE.Scene();
// Lighter fog density so the bigger 70×70 world reads at a distance
scene.fog = new THREE.FogExp2(0x1e3a1e, 0.014);

const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  220
);
camera.position.set(0, PLAYER_HEIGHT, 0);

// ── Lighting ──────────────────────────────────────────────────────────────────
// Three.js lights reference: https://threejs.org/manual/#en/lights

// 1. AmbientLight — soft fill so nothing goes fully black
const ambientLight = new THREE.AmbientLight(0x2a3a2a, 0.75);
scene.add(ambientLight);

// 2. DirectionalLight — late-afternoon sun, casts soft shadows across the scene
const sunLight = new THREE.DirectionalLight(0xffd080, 1.25);
sunLight.position.set(15, 24, 10);
sunLight.castShadow              = true;
sunLight.shadow.mapSize.width    = 2048;
sunLight.shadow.mapSize.height   = 2048;
sunLight.shadow.camera.near      = 1;
sunLight.shadow.camera.far       = 140;
sunLight.shadow.camera.left      = -50;
sunLight.shadow.camera.right     = 50;
sunLight.shadow.camera.top       = 50;
sunLight.shadow.camera.bottom    = -50;
sunLight.shadow.bias             = -0.001;
scene.add(sunLight);

// 3. HemisphereLight — scattered sky above, warm earth below
const hemiLight = new THREE.HemisphereLight(0x8ab4cc, 0x4a3a10, 0.5);
scene.add(hemiLight);

// ── Sky dome ──────────────────────────────────────────────────────────────────
{
  const skyCanvas  = document.createElement('canvas');
  skyCanvas.width  = 512;
  skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d');
  const grad = skyCtx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0.00, '#0c1c2e');
  grad.addColorStop(0.30, '#1a4a6a');
  grad.addColorStop(0.65, '#3a7050');
  grad.addColorStop(1.00, '#6a4a28');
  skyCtx.fillStyle = grad;
  skyCtx.fillRect(0, 0, 512, 256);

  const skyTex = new THREE.CanvasTexture(skyCanvas);
  const skyGeo = new THREE.SphereGeometry(120, 32, 16);
  const skyMat = new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
}

// ── First-person Controls ─────────────────────────────────────────────────────
// PointerLockControls: https://threejs.org/docs/#examples/en/controls/PointerLockControls

const controls = new PointerLockControls(camera, document.body);

document.getElementById('startOverlay').addEventListener('click', () => {
  controls.lock();
});
controls.addEventListener('lock', () => hideStartOverlay());


const keys = { forward: false, backward: false, left: false, right: false };

document.addEventListener('keydown', (e) => {
  if (e.code === 'KeyW'     || e.code === 'ArrowUp')    keys.forward   = true;
  if (e.code === 'KeyS'     || e.code === 'ArrowDown')  keys.backward  = true;
  if (e.code === 'KeyA'     || e.code === 'ArrowLeft')  keys.left      = true;
  if (e.code === 'KeyD'     || e.code === 'ArrowRight') keys.right     = true;
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'KeyW'     || e.code === 'ArrowUp')    keys.forward   = false;
  if (e.code === 'KeyS'     || e.code === 'ArrowDown')  keys.backward  = false;
  if (e.code === 'KeyA'     || e.code === 'ArrowLeft')  keys.left      = false;
  if (e.code === 'KeyD'     || e.code === 'ArrowRight') keys.right     = false;
});

// ── Collision ─────────────────────────────────────────────────────────────────
function isBlocked(pos) {
  const R = PLAYER_RADIUS;

  for (const wall of WALL_OBSTACLES) {
    if (pos.x > wall.x - wall.w / 2 - R &&
        pos.x < wall.x + wall.w / 2 + R &&
        pos.z > wall.z - wall.d / 2 - R &&
        pos.z < wall.z + wall.d / 2 + R) {
      return true;
    }
  }

  for (const c of CIRCLE_OBSTACLES) {
    const dx = pos.x - c.x;
    const dz = pos.z - c.z;
    if (dx * dx + dz * dz < (c.r + R) * (c.r + R)) return true;
  }

  for (const dino of dinos) {
    const dx = pos.x - dino.pos.x;
    const dz = pos.z - dino.pos.z;
    if (dx * dx + dz * dz < (DINO_BLOCK_RADIUS + R) * (DINO_BLOCK_RADIUS + R)) return true;
  }

  return false;
}

// ── Reusable vectors ──────────────────────────────────────────────────────────

const _fwd   = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up    = new THREE.Vector3(0, 1, 0);

// ── Build the world ───────────────────────────────────────────────────────────

const texLoader = new THREE.TextureLoader();
buildWorld(scene, texLoader);

// ── Load dinosaurs ────────────────────────────────────────────────────────────

const gltfLoader = new GLTFLoader();
let dinos      = [];
let foundCount = 0;
let gameWon    = false;

(async () => {
  try {
    dinos = await setupDinos(scene, gltfLoader);
    console.log(`[Dino Hunter] ${dinos.length} dino relics placed.`);
  } catch (err) {
    console.error('[Dino Hunter] Failed to load dino.glb:', err);
  }
})();

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Minimap canvas ────────────────────────────────────────────────────────────

const minimapCanvas = document.getElementById('minimap');
const minimapCtx    = minimapCanvas.getContext('2d');

// ── Loop state ────────────────────────────────────────────────────────────────

const clock = new THREE.Clock();
let fpsTimer   = 0;
let frameCount = 0;
let vz = 0, vx = 0;
let bobPhase = 0;
let stepY = 0;

// ── Main animation loop ───────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate);

  const delta   = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // ── FPS counter ───────────────────────────────────────────
  frameCount++;
  fpsTimer += delta;
  if (fpsTimer >= 1.0) {
    updateFPS(frameCount);
    frameCount = 0;
    fpsTimer   = 0;
  }

  // ── Player movement ───────────────────────────────────────
  if (controls.isLocked) {

    // 1. Raw input direction
    let inputZ = (keys.forward  ? 1 : 0) - (keys.backward ? 1 : 0);
    let inputX = (keys.right    ? 1 : 0) - (keys.left     ? 1 : 0);

    // Normalize diagonals so corner-walking isn't faster
    const inputLen = Math.sqrt(inputX * inputX + inputZ * inputZ);
    if (inputLen > 1) { inputX /= inputLen; inputZ /= inputLen; }

    // 2. Lerp velocity toward input target — gives natural acceleration
    const smooth = Math.min(1, MOVE_ACCEL * delta);
    vz += (inputZ * MOVE_SPEED - vz) * smooth;
    vx += (inputX * MOVE_SPEED - vx) * smooth;

    // 3. Camera's flat forward/right (Y zeroed so looking up doesn't tilt movement)
    camera.getWorldDirection(_fwd);
    _fwd.y = 0;
    _fwd.normalize();
    _right.crossVectors(_fwd, _up).normalize();

    // 4. World-space displacement this frame
    const dx = (_fwd.x * vz + _right.x * vx) * delta;
    const dz = (_fwd.z * vz + _right.z * vx) * delta;

    // 5. Apply X and Z separately so the player slides along walls
    camera.position.x += dx;
    camera.position.x  = clamp(camera.position.x, -MAP_HALF, MAP_HALF);
    if (isBlocked(camera.position)) camera.position.x -= dx;

    camera.position.z += dz;
    camera.position.z  = clamp(camera.position.z, -MAP_HALF, MAP_HALF);
    if (isBlocked(camera.position)) camera.position.z -= dz;

    // 6. Step zones — lerp camera up/down for shrine platform tiers.
    //    Last matching zone wins (array is ordered outer → inner).
    let targetStepY = 0;
    for (const zone of STEP_ZONES) {
      if (camera.position.x >= zone.x1 && camera.position.x <= zone.x2 &&
          camera.position.z >= zone.z1 && camera.position.z <= zone.z2) {
        targetStepY = zone.y;
      }
    }
    stepY = THREE.MathUtils.lerp(stepY, targetStepY, Math.min(delta * 9, 1));

    // 7. Head bob — runs on top of stepY so it works on platforms too
    const currentSpeed = Math.sqrt(vz * vz + vx * vx);
    if (currentSpeed > 0.5) {
      bobPhase += delta * BOB_FREQ * Math.PI * 2;
    }
    const bobAmount = (currentSpeed / MOVE_SPEED) * BOB_AMP;
    camera.position.y = PLAYER_HEIGHT + stepY + Math.sin(bobPhase) * bobAmount;
  }

  // ── Dino update + discovery ───────────────────────────────
  if (dinos.length > 0) {
    updateDinos(dinos, elapsed, delta);

    if (!gameWon) {
      const newFinds = checkDiscovery(dinos, camera.position, scene);
      if (newFinds > 0) {
        foundCount += newFinds;
        updateHUD(foundCount);

        if (foundCount >= DINO_COUNT) {
          gameWon = true;
          showVictory();
        }
      }

      // Proximity hint — show when the nearest unfound dino is close
      let minDist = Infinity;
      for (const dino of dinos) {
        if (dino.found) continue;
        const dx = camera.position.x - dino.pos.x;
        const dz = camera.position.z - dino.pos.z;
        minDist = Math.min(minDist, Math.sqrt(dx * dx + dz * dz));
      }
      setProximityHint(minDist < PROXIMITY_HINT_DIST);
    }
  }

  // ── Minimap ───────────────────────────────────────────────
  // Project camera facing to a canvas angle: 0=up(north), π/2=right(east)
  _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
  const playerYaw = Math.atan2(_fwd.x, -_fwd.z);
  drawMinimap(minimapCtx, dinos, camera.position, playerYaw, WALL_OBSTACLES);

  renderer.render(scene, camera);
}

animate();
