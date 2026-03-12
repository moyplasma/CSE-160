import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { loadGLTFAsync } from './utils.js';
import {
  DINO_SCALE,
  DINO_TRIGGER_DIST,
  ORB_BASE_Y,
  ORB_BOB_SPEED,
  ORB_BOB_AMP,
} from './constants.js';

const PLACEMENTS = [
  { x:  -5.5, z: -25.5, rotY: Math.PI * 1.1 },
  { x: -20,   z:   0.5, rotY: Math.PI * 0.2 },
  { x:  28,   z: -12.5, rotY: -Math.PI * 0.5 },
  { x: -22,   z:  26,   rotY: Math.PI * 1.4 },
  { x:  30,   z:  18,   rotY: Math.PI * 0.7 },
];

// Loads dinos, clones, sets up
export async function setupDinos(scene, gltfLoader) {
  const gltf     = await loadGLTFAsync(gltfLoader, 'models/dino.glb');
  const baseClip = gltf.animations[0] ?? null;

  const dinos = PLACEMENTS.map((p, i) => {
    const model = SkeletonUtils.clone(gltf.scene);
    model.position.set(p.x, 0, p.z);
    model.rotation.y = p.rotY;
    model.scale.setScalar(DINO_SCALE);
    model.traverse((child) => {
      if (child.isMesh) {
        child.castShadow    = true;
        child.receiveShadow = true;
      }
    });

    scene.add(model);

    let mixer = null;
    let action = null;
    if (baseClip) {
      mixer  = new THREE.AnimationMixer(model);
      action = mixer.clipAction(baseClip);
    }

    return {
      id:    i,
      model,
      mixer,
      action,
      pos:   new THREE.Vector3(p.x, 0, p.z),
      found: false,
      orb:   null,
      light: null,
    };
  });

  return dinos;
}

export function checkDiscovery(dinos, playerPos, scene) {
  let newFinds = 0;

  for (const dino of dinos) {
    if (dino.found) continue;

    const dx   = playerPos.x - dino.pos.x;
    const dz   = playerPos.z - dino.pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist <= DINO_TRIGGER_DIST) {
      triggerDiscovery(dino, scene);
      newFinds++;
    }
  }

  return newFinds;
}


export function updateDinos(dinos, elapsed, delta) {
  for (const dino of dinos) {
    if (!dino.found) continue;

    // Tick the animation mixer forward
    if (dino.mixer) dino.mixer.update(delta);

    // Bob the orb vertically with a sine wave
    if (dino.orb) {
      dino.orb.position.y =
        ORB_BASE_Y + Math.sin(elapsed * ORB_BOB_SPEED) * ORB_BOB_AMP;

      // Also sync the point light position to follow the orb
      if (dino.light) {
        dino.light.position.y = dino.orb.position.y;
      }
    }

    // Gently pulse the point light intensity
    if (dino.light) {
      dino.light.intensity = 1.3 + Math.sin(elapsed * 2.6) * 0.4;
    }
  }
}

function triggerDiscovery(dino, scene) {
  dino.found = true;

  if (dino.action) {
    dino.action.reset();
    dino.action.setLoop(THREE.LoopRepeat);
    dino.action.play();
  }

  // ── Glowing orb ──────────────────────────────────────────────
  const orbGeo = new THREE.SphereGeometry(0.25, 14, 10);
  const orbMat = new THREE.MeshStandardMaterial({
    color:             0x88ffaa,
    emissive:          0x44cc77,
    emissiveIntensity: 1.8,
    transparent:       true,
    opacity:           0.88,
  });
  const orb = new THREE.Mesh(orbGeo, orbMat);
  orb.position.set(dino.pos.x, ORB_BASE_Y, dino.pos.z);
  scene.add(orb);
  dino.orb = orb;

  // ── Discovery point light ─────────────────────────────────────
  const light = new THREE.PointLight(0x44ff88, 1.5, 9);
  light.position.set(dino.pos.x, ORB_BASE_Y, dino.pos.z);
  scene.add(light);
  dino.light = light;
}
