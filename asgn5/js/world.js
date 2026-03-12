
import * as THREE from 'three';

export const WALL_OBSTACLES   = [];
export const CIRCLE_OBSTACLES = [];

export const STEP_ZONES = [
  { x1: -5,  x2:  5,  z1: -7.5, z2:  2.5, y: 0.46 },   // shrine tier 1 (broad base)
  { x1: -3,  x2:  3,  z1: -5.5, z2:  0.5, y: 0.82 },   // shrine tier 2 (mid)
];

export function buildWorld(scene, texLoader) {
  WALL_OBSTACLES.length   = 0;
  CIRCLE_OBSTACLES.length = 0;

  // ── Textures ──────────────────────────────────────────────────
  const tPebbles = makeTex(texLoader, 'textures/pebbles_ground.jpg', 12, 12);
  const tStone   = makeTex(texLoader, 'textures/stone_rocks.jpg',     2,  2);
  const tDirt    = makeTex(texLoader, 'textures/dirt_ground.jpg',      6,  6);
  const tCracked = makeTex(texLoader, 'textures/cracked_dry_ground.jpg', 4, 4);

  // ── Materials ─────────────────────────────────────────────────
  const mGround   = new THREE.MeshLambertMaterial({ map: tPebbles });
  const mStone    = new THREE.MeshLambertMaterial({ map: tStone });
  const mDirt     = new THREE.MeshLambertMaterial({ map: tDirt });
  const mCracked  = new THREE.MeshLambertMaterial({ map: tCracked });
  const mMoss     = new THREE.MeshLambertMaterial({ color: 0x3a5c2a });
  const mTree     = new THREE.MeshLambertMaterial({ color: 0x2d6632 });
  const mTreeDark = new THREE.MeshLambertMaterial({ color: 0x1e4825 });
  const mTrunk    = new THREE.MeshLambertMaterial({ color: 0x4e3318 });
  const mRock     = new THREE.MeshLambertMaterial({ color: 0x7a7875 });

  // ══════════════════════════════════════════════════════════════
  //  GROUND
  // ══════════════════════════════════════════════════════════════

  addBox(scene, mGround,  70, 0.20, 70,   0, -0.10,   0);   // full ground
  addBox(scene, mCracked, 18, 0.05, 10,   0,  0.02, -24);   // temple interior floor
  addBox(scene, mDirt,    14, 0.05, 10,  20,  0.02, -12);   // east ruin floor

  // ══════════════════════════════════════════════════════════════
  //  PERIMETER WALLS
  // ══════════════════════════════════════════════════════════════

  addWall(scene, mStone, 70, 5.5, 1.4,   0, 2.75, -35);   // north
  addWall(scene, mStone, 70, 5.5, 1.4,   0, 2.75,  35);   // south
  addWall(scene, mStone, 1.4, 5.5, 72,  35, 2.75,   0);   // east
  addWall(scene, mStone, 1.4, 5.5, 72, -35, 2.75,   0);   // west

  // ══════════════════════════════════════════════════════════════
  //  NORTH TEMPLE COMPLEX
  // ══════════════════════════════════════════════════════════════

  addWall(scene, mStone, 20, 5.0, 1.4,   0, 2.50, -29);   // back wall (full width)
  addWall(scene, mStone, 1.4, 5.0,  9, -10, 2.50, -24.5); // left flank (full height)
  addWall(scene, mStone, 1.4, 4.2,  7,  10, 2.10, -23.5); // right flank (shorter — crumbled)
  // Interior divider creates two chambers, gap on the right (x>-1) for navigation
  addWall(scene, mStone,  8, 3.8, 1.4, -5.5, 1.90, -22);  // interior divider
  // Low remnant at the front-left — where the portico wall once stood
  addWall(scene, mMoss,   4, 1.8, 1.4,  -8,  0.90, -18.5);// collapsed portico stub

  // Gate post columns marking the temple entrance
  addCylinder(scene, mStone, 0.30, 0.44, 4.4,  -4.5, 2.20, -18);
  addCylinder(scene, mStone, 0.30, 0.44, 4.4,   4.5, 2.20, -18);
  addCircleObstacle(-4.5, -18, 0.56);
  addCircleObstacle( 4.5, -18, 0.56);

  // ══════════════════════════════════════════════════════════════
  //  EAST RUIN HALL
  // ══════════════════════════════════════════════════════════════

  addWall(scene, mStone, 18, 4.2, 1.4,  22,  2.10, -16);  // north wall
  addWall(scene, mStone, 16, 3.8, 1.4,  21,  1.90,  -6);  // south wall (slightly shorter)
  addWall(scene, mStone, 1.4, 4.0, 10,  24,  2.00, -11);  // interior cross-wall
  addWall(scene, mMoss,  1.4, 2.2,  4,  31,  1.10, -14);  // east remnant (low, broken)

  // ══════════════════════════════════════════════════════════════
  //  WEST GARDEN 
  // ══════════════════════════════════════════════════════════════

  addWall(scene, mStone, 1.4, 4.5, 18, -13, 2.25,   2);  // east wall (full, faces courtyard)
  addWall(scene, mStone, 18, 4.5, 1.4, -22, 2.25,  12);  // south wall (full)
  addWall(scene, mMoss,   8, 3.2, 1.4, -25, 1.60,  -7);  // north wall — partial stub only
  // Rubble where the north wall corner fell
  addBox(scene, mStone, 2.0, 1.0, 1.6, -17.5, 0.50, -7);
  addBox(scene, mStone, 1.4, 0.7, 1.2, -15.5, 0.35, -6.5);

  // ══════════════════════════════════════════════════════════════
  //  SOUTH DIVIDER
  // ══════════════════════════════════════════════════════════════

  addWall(scene, mMoss, 22, 3.8, 1.4, -18, 1.90,  20);  // west piece
  addWall(scene, mMoss, 20, 3.8, 1.4,  17, 1.90,  20);  // east piece
  // Debris at gap edges — where the wall ended
  addBox(scene, mStone, 1.8, 0.85, 1.4, -7.5, 0.42, 20);
  addBox(scene, mStone, 1.2, 0.55, 1.0,  7.2, 0.27, 19.5);

  // ══════════════════════════════════════════════════════════════
  //  SE CORNER REMNANT
  // ═════════════

  addWall(scene, mMoss, 14, 3.2, 1.4,  25, 1.60,  12);

  // ══════════════════════════════════════════════════════════════
  //  CENTRAL SHRINE
  // ══════════════════════════════════════════════════════════════

  addBox(scene, mStone,  10, 0.55, 10,  0, 0.27, -2.5);   // tier 1 — broad base
  addBox(scene, mCracked, 6, 0.55,  6,  0, 0.82, -2.5);   // tier 2 — mid
  addBox(scene, mStone,  3.5, 0.42, 3.5, 0, 1.30, -2.5);  // altar top
  addCylinder(scene, mStone, 0.28, 0.46, 4.5,  0, 3.75, -2.5);  // obelisk
  addBox(scene, mCracked, 0.88, 0.24, 0.88, 0, 6.12, -2.5);     // obelisk cap
  addCircleObstacle(0, -2.5, 0.62);

  // ══════════════════════════════════════════════════════════════
  //  COURTYARD COLUMNS
  // ══════════════════════════════════════════════════════════════

  addCylinder(scene, mStone, 0.30, 0.45, 4.5,  -8,  2.25,  -9.5);   // NW (tall)
  addBox(scene, mCracked, 1.08, 0.28, 1.08,   -8,  4.64,  -9.5);
  addCircleObstacle(-8, -9.5, 0.58);

  addCylinder(scene, mStone, 0.30, 0.45, 4.0,   8,  2.00,   -9);    // NE (slightly shorter)
  addBox(scene, mCracked, 1.08, 0.28, 1.08,    8,  4.14,   -9);
  addCircleObstacle(8, -9, 0.58);

  addCylinder(scene, mStone, 0.30, 0.45, 4.3,  -7.5, 2.15,  4.5);   // SW
  addBox(scene, mCracked, 1.08, 0.28, 1.08,   -7.5, 4.44,  4.5);
  addCircleObstacle(-7.5, 4.5, 0.58);

  addCylinder(scene, mStone, 0.30, 0.45, 4.5,   8,  2.25,   4);     // SE
  addBox(scene, mCracked, 1.08, 0.28, 1.08,    8,  4.64,   4);
  addCircleObstacle(8, 4, 0.58);

  // ══════════════════════════════════════════════════════════════
  //  EAST RUIN COLUMNS
  //  Heights vary — one is intact, the others are stumps or fallen.
  // ══════════════════════════════════════════════════════════════

  addCylinder(scene, mStone, 0.28, 0.36, 4.0,  14, 2.00, -11.5);  // tall — near entrance
  addCircleObstacle(14, -11.5, 0.50);
  addCylinder(scene, mStone, 0.28, 0.36, 2.2,  29, 1.10, -10);    // stump — back of hall
  addCircleObstacle(29, -10, 0.50);
  // Fallen column section — lying on its side
  addBox(scene, mStone, 0.7, 0.7, 3.5,  16, 0.35, -6.5);

  // ══════════════════════════════════════════════════════════════
  //  RUBBLE AND STONE DEBRIS
  // ══════════════════════════════════════════════════════════════

  // Temple entrance debris — stones that fell from the side walls
  addBox(scene, mStone, 1.6, 0.80, 1.2, -7,   0.40, -17);
  addBox(scene, mStone, 1.0, 0.50, 1.4,  6,   0.25, -17.5);
  addBox(scene, mStone, 0.8, 0.55, 0.9,  8.5, 0.27, -19);

  // East ruin floor chunks
  addBox(scene, mStone, 1.4, 0.75, 1.2,  17, 0.37, -8.5);
  addBox(scene, mStone, 0.9, 0.45, 1.0,  28, 0.22, -7);

  // West garden debris from the fallen north wall
  addBox(scene, mStone, 1.2, 0.60, 1.0, -18, 0.30, -4.5);
  addBox(scene, mStone, 0.9, 0.45, 0.8, -21, 0.22, -5.2);

  // Scattered rocks — adds texture to open ground
  addRock(scene, mRock, 0.72, 0.42, 0.68,  -9,  0.30, -16.0);
  addRock(scene, mRock, 0.50, 0.30, 0.55, -10,  0.20, -14.5);
  addRock(scene, mRock, 0.88, 0.50, 0.72,  20,  0.36,  -4.0);
  addRock(scene, mRock, 0.55, 0.32, 0.50,   4,  0.22,  13.5);
  addRock(scene, mRock, 0.44, 0.26, 0.48,  -5,  0.20,  25.0);
  addRock(scene, mRock, 0.62, 0.38, 0.58, -20,  0.28,   6.0);

  // ══════════════════════════════════════════════════════════════
  //  TREES
  // ══════════════════════════════════════════════════════════════

  // NW cluster — densest, overlapping canopies
  addTree(scene, mTrunk, mTree,     0.26, 4.2, 2.30, -22, -27);
  addTree(scene, mTrunk, mTreeDark, 0.21, 3.4, 1.85, -26, -22);
  addTree(scene, mTrunk, mTree,     0.17, 2.8, 1.50, -19, -23);
  addTree(scene, mTrunk, mTreeDark, 0.15, 2.2, 1.25, -28, -15);

  // NE — flanking the temple from outside, slightly sparse
  addTree(scene, mTrunk, mTreeDark, 0.24, 3.8, 2.05,  22, -28);
  addTree(scene, mTrunk, mTree,     0.20, 3.2, 1.70,  27, -22);
  addTree(scene, mTrunk, mTreeDark, 0.17, 2.6, 1.40,  30, -16);

  // West wall — jungle creeping along the entire west side
  addTree(scene, mTrunk, mTree,     0.23, 3.4, 1.85, -30,  -2);
  addTree(scene, mTrunk, mTreeDark, 0.19, 2.8, 1.55, -31,   9);
  addTree(scene, mTrunk, mTree,     0.26, 4.0, 2.20, -29,  20);
  addTree(scene, mTrunk, mTreeDark, 0.20, 3.0, 1.65, -32,  29);

  // South border — thick growth against the south wall
  addTree(scene, mTrunk, mTree,     0.24, 3.6, 2.00, -14,  31);
  addTree(scene, mTrunk, mTreeDark, 0.21, 3.0, 1.70,  -2,  33);
  addTree(scene, mTrunk, mTree,     0.19, 2.8, 1.55,  12,  31);
  addTree(scene, mTrunk, mTreeDark, 0.23, 3.4, 1.90,  26,  28);

  // East border — lighter coverage (the ruin hall is near here)
  addTree(scene, mTrunk, mTree,     0.20, 3.0, 1.65,  30,   4);
  addTree(scene, mTrunk, mTreeDark, 0.18, 2.4, 1.35,  32,  18);

  // Interior accent trees — nature reclaiming the old stone
  addTree(scene, mTrunk, mTreeDark, 0.16, 2.4, 1.30, -24,  -8);
  addTree(scene, mTrunk, mTree,     0.18, 2.8, 1.50, -20,  18);
  addTree(scene, mTrunk, mTreeDark, 0.15, 2.0, 1.15,  12,  22);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addBox(scene, mat, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow    = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addWall(scene, mat, w, h, d, x, y, z) {
  addBox(scene, mat, w, h, d, x, y, z);
  WALL_OBSTACLES.push({ x, z, w, d });
}

function addCylinder(scene, mat, rTop, rBot, h, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(rTop, rBot, h, 14),
    mat
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  scene.add(mesh);
}

function addSphere(scene, mat, r, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function addRock(scene, mat, rx, ry, rz, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
  mesh.scale.set(rx, ry, rz);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function addTree(scene, trunkMat, canopyMat, r, trunkH, canopyR, x, z) {
  addCylinder(scene, trunkMat, r * 0.85, r * 1.1, trunkH, x, trunkH / 2, z);
  addSphere(scene, canopyMat, canopyR, x, trunkH + canopyR * 0.65, z);
  addCircleObstacle(x, z, r + 0.28);
}

function addCircleObstacle(x, z, r) {
  CIRCLE_OBSTACLES.push({ x, z, r });
}

function makeTex(loader, path, rx, ry) {
  const tex = loader.load(path);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(rx, ry);
  return tex;
}
