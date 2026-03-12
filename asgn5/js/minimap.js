import { MINIMAP_SIZE } from './constants.js';

const S = MINIMAP_SIZE;

export function drawMinimap(ctx, dinoList, playerPos, playerYaw, wallObstacles) {
  // ── Background ──────────────────────────────────────────────
  ctx.clearRect(0, 0, S, S);
  ctx.fillStyle = 'rgba(8, 6, 4, 0.80)';
  ctx.fillRect(0, 0, S, S);

  // ── Map boundary ────────────────────────────────────────────
  ctx.strokeStyle = 'rgba(160, 130, 70, 0.50)';
  ctx.lineWidth   = 1;
  ctx.strokeRect(2, 2, S - 4, S - 4);

  // ── Walls ────────────────────────────────────────────────────
  ctx.fillStyle = 'rgba(95, 82, 62, 0.90)';
  for (const wall of wallObstacles) {
    // Convert world-space center + extent to top-left canvas corner + size
    const mx = w2m(wall.x - wall.w / 2);
    const mz = w2m(wall.z - wall.d / 2);
    const mw = (wall.w / 70) * S;
    const md = (wall.d / 70) * S;
    ctx.fillRect(mx, mz, Math.max(mw, 2), Math.max(md, 2));
  }

  // ── Found dino markers ──────────────────────────────────────
  for (const dino of dinoList) {
    if (!dino.found) continue;
    const mx = w2m(dino.pos.x);
    const mz = w2m(dino.pos.z);

    // Glowing green dot
    ctx.beginPath();
    ctx.arc(mx, mz, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#44ff88';
    ctx.fill();

    // Small outer ring for visibility
    ctx.beginPath();
    ctx.arc(mx, mz, 5, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(68, 255, 136, 0.35)';
    ctx.lineWidth   = 1;
    ctx.stroke();
  }

  // ── Player arrow ─────────────────────────────────────────────
  const px = w2m(playerPos.x);
  const pz = w2m(playerPos.z);
  drawArrow(ctx, px, pz, playerYaw);
}

function drawArrow(ctx, px, pz, angle) {
  const size = 5;
  ctx.save();
  ctx.translate(px, pz);
  ctx.rotate(angle);

  ctx.beginPath();
  ctx.moveTo(0, -size);              // forward tip
  ctx.lineTo(size * 0.6,  size * 0.7);  // right-back
  ctx.lineTo(-size * 0.6, size * 0.7);  // left-back
  ctx.closePath();

  ctx.fillStyle   = '#f5e060';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth   = 0.8;
  ctx.stroke();

  ctx.restore();
}

// Converts a world coordinate (-35…+35) to a minimap pixel (0…S).
function w2m(worldVal) {
  return ((worldVal + 35) / 70) * S;
}
