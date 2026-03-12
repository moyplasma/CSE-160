const foundCountEl  = document.getElementById('foundCount');
const victoryEl     = document.getElementById('victory');
const startOverlay  = document.getElementById('startOverlay');
const fpsEl         = document.getElementById('fps');
const hintEl        = document.getElementById('proximityHint');

export function updateHUD(found) {
  foundCountEl.textContent = found;
}

export function showVictory() {
  victoryEl.style.display = 'block';
}

export function hideStartOverlay() {
  startOverlay.style.display = 'none';
}

export function updateFPS(fps) {
  fpsEl.textContent = `FPS: ${fps}`;
}

export function setProximityHint(visible) {
  hintEl.style.opacity = visible ? '1' : '0';
}
