export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx;
  const dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

export function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

export function loadGLTFAsync(loader, path) {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject);
  });
}
