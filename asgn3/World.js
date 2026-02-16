var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  varying vec2 v_TexCoord;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;
    v_TexCoord = a_TexCoord;
  }`;

var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_baseColor;
  uniform float u_texColorWeight;
  uniform int u_whichTexture;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform sampler2D u_Sampler3;
  varying vec2 v_TexCoord;
  void main() {
    vec4 texColor;
    if (u_whichTexture == 0)      texColor = texture2D(u_Sampler0, v_TexCoord);
    else if (u_whichTexture == 1) texColor = texture2D(u_Sampler1, v_TexCoord);
    else if (u_whichTexture == 2) texColor = texture2D(u_Sampler2, v_TexCoord);
    else if (u_whichTexture == 3) texColor = texture2D(u_Sampler3, v_TexCoord);
    else                          texColor = vec4(1.0);
    gl_FragColor = (1.0 - u_texColorWeight) * u_baseColor + u_texColorWeight * texColor;
  }`;

var canvas, gl;

var a_Position, a_TexCoord;
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_baseColor, u_texColorWeight, u_whichTexture;
var u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3;

var camera;
var g_identityMatrix = new Matrix4();

var g_lastFrameTime = performance.now();
var g_fpsSmoothed = 60;

var g_worldBuffers = {};
var g_groundBuffer = null, g_groundVertCount = 0;
var g_skyBuffer = null, g_skyVertCount = 0;

var g_texLoaded = 0, g_texTotal = 4;

var g_startTime = performance.now() / 1000;
var g_seconds = 0;

var g_lastMouseX = 0, g_lastMouseY = 0;
var g_mouseSensitivity = 0.15;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('Failed to get WebGL context'); return; }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.53, 0.81, 0.92, 1.0);
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) return;
  a_Position        = gl.getAttribLocation(gl.program, 'a_Position');
  a_TexCoord        = gl.getAttribLocation(gl.program, 'a_TexCoord');
  u_ModelMatrix     = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix      = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjectionMatrix= gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  u_baseColor       = gl.getUniformLocation(gl.program, 'u_baseColor');
  u_texColorWeight  = gl.getUniformLocation(gl.program, 'u_texColorWeight');
  u_whichTexture    = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0        = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1        = gl.getUniformLocation(gl.program, 'u_Sampler1');
  u_Sampler2        = gl.getUniformLocation(gl.program, 'u_Sampler2');
  u_Sampler3        = gl.getUniformLocation(gl.program, 'u_Sampler3');
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_identityMatrix.elements);
}

function initTextures() {
  loadTexture('textures/brick.png', 0);
  loadTexture('textures/stone.png', 1);
  loadTexture('textures/dirt.png', 2);
  loadTexture('textures/grass.png', 3);
}

function loadTexture(src, unit) {
  var tex = gl.createTexture();
  var img = new Image();
  img.onload  = function() { finishTexture(tex, img, unit); };
  img.onerror = function() { finishTexture(tex, makeFallback(unit), unit); };
  img.src = src;
}

function makeFallback(unit) {
  var c = document.createElement('canvas'); c.width=64; c.height=64;
  var x = c.getContext('2d');
  var fills = ['#8B4513','#808080','#6B4226','#3A7D2C'];
  x.fillStyle = fills[unit]; x.fillRect(0,0,64,64);
  return c;
}

function finishTexture(tex, source, unit) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  var glUnit  = [gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3][unit];
  var sampler = [u_Sampler0, u_Sampler1, u_Sampler2, u_Sampler3][unit];
  gl.activeTexture(glUnit);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.uniform1i(sampler, unit);
  g_texLoaded++;
  if (g_texLoaded >= g_texTotal) { buildWorldGeometry(); requestAnimationFrame(tick); }
}

// Faces
var F_FRONT  = [0,0,0,0,0, 1,0,0,1,0, 1,1,0,1,1, 0,0,0,0,0, 1,1,0,1,1, 0,1,0,0,1];
var F_BACK   = [1,0,1,0,0, 0,0,1,1,0, 0,1,1,1,1, 1,0,1,0,0, 0,1,1,1,1, 1,1,1,0,1];
var F_TOP    = [0,1,0,0,0, 0,1,1,0,1, 1,1,1,1,1, 0,1,0,0,0, 1,1,1,1,1, 1,1,0,1,0];
var F_RIGHT  = [1,0,0,0,0, 1,0,1,1,0, 1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,1, 1,1,0,0,1];
var F_LEFT   = [0,0,1,0,0, 0,0,0,1,0, 0,1,0,1,1, 0,0,1,0,0, 0,1,0,1,1, 0,1,1,0,1];

function pushFace(arr, face, wx, wy, wz) {
  for (var i = 0; i < face.length; i += 5)
    arr.push(face[i]+wx, face[i+1]+wy, face[i+2]+wz, face[i+3], face[i+4]);
}

function buildWorldGeometry() {
  var groups = { 0: [], 1: [] }; // 0=brick(upper), 1=stone(base)

  for (var x = 0; x < 32; x++) {
    for (var z = 0; z < 32; z++) {
      var h = g_map[x][z];
      for (var y = 0; y < h; y++) {
        var above = (y+1 < h);
        var north = (z > 0  && g_map[x][z-1] > y);
        var south = (z < 31 && g_map[x][z+1] > y);
        var west  = (x > 0  && g_map[x-1][z] > y);
        var east  = (x < 31 && g_map[x+1][z] > y);
        var tid = (y === 0) ? 1 : 0;
        if (!north) pushFace(groups[tid], F_FRONT, x, y, z);
        if (!south) pushFace(groups[tid], F_BACK,  x, y, z);
        if (!above) pushFace(groups[tid], F_TOP,   x, y, z);
        if (!east)  pushFace(groups[tid], F_RIGHT, x, y, z);
        if (!west)  pushFace(groups[tid], F_LEFT,  x, y, z);
      }
    }
  }

  g_worldBuffers = {};
  for (var tid in groups) {
    if (groups[tid].length === 0) continue;
    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(groups[tid]), gl.STATIC_DRAW);
    g_worldBuffers[tid] = { vbo: buf, vertCount: groups[tid].length / 5 };
  }

  var gv = [0,0,0,0,0, 32,0,0,32,0, 32,0,32,32,32, 0,0,0,0,0, 32,0,32,32,32, 0,0,32,0,32];
  g_groundBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_groundBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(gv), gl.STATIC_DRAW);
  g_groundVertCount = 6;

  // Sky box
  var S=500, cx=16, cy=0, cz=16, sv=[];
  sv.push(cx-S,cy-S,cz-S,0,0, cx+S,cy-S,cz-S,1,0, cx+S,cy+S,cz-S,1,1, cx-S,cy-S,cz-S,0,0, cx+S,cy+S,cz-S,1,1, cx-S,cy+S,cz-S,0,1);
  sv.push(cx+S,cy-S,cz+S,0,0, cx-S,cy-S,cz+S,1,0, cx-S,cy+S,cz+S,1,1, cx+S,cy-S,cz+S,0,0, cx-S,cy+S,cz+S,1,1, cx+S,cy+S,cz+S,0,1);
  sv.push(cx-S,cy+S,cz-S,0,0, cx+S,cy+S,cz-S,1,0, cx+S,cy+S,cz+S,1,1, cx-S,cy+S,cz-S,0,0, cx+S,cy+S,cz+S,1,1, cx-S,cy+S,cz+S,0,1);
  sv.push(cx-S,cy-S,cz+S,0,0, cx+S,cy-S,cz+S,1,0, cx+S,cy-S,cz-S,1,1, cx-S,cy-S,cz+S,0,0, cx+S,cy-S,cz-S,1,1, cx-S,cy-S,cz-S,0,1);
  sv.push(cx+S,cy-S,cz-S,0,0, cx+S,cy-S,cz+S,1,0, cx+S,cy+S,cz+S,1,1, cx+S,cy-S,cz-S,0,0, cx+S,cy+S,cz+S,1,1, cx+S,cy+S,cz-S,0,1);
  sv.push(cx-S,cy-S,cz+S,0,0, cx-S,cy-S,cz-S,1,0, cx-S,cy+S,cz-S,1,1, cx-S,cy-S,cz+S,0,0, cx-S,cy+S,cz-S,1,1, cx-S,cy+S,cz+S,0,1);
  g_skyBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, g_skyBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sv), gl.STATIC_DRAW);
  g_skyVertCount = 36;
}

function rebuildWorld() {
  for (var id in g_worldBuffers) gl.deleteBuffer(g_worldBuffers[id].vbo);
  g_worldBuffers = {};
  buildWorldGeometry();
}


// HELPERS 
var FSIZE = Float32Array.BYTES_PER_ELEMENT;

function bindBuf(buffer) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE*5, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE*5, FSIZE*3);
  gl.enableVertexAttribArray(a_TexCoord);
}

function drawBufTextured(buf, count, texId) {
  bindBuf(buf);
  gl.uniform1f(u_texColorWeight, 1.0);
  gl.uniform1i(u_whichTexture, texId);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}

function drawBufColored(buf, count, r, g2, b, a) {
  bindBuf(buf);
  gl.uniform1f(u_texColorWeight, 0.0);
  gl.uniform4f(u_baseColor, r, g2, b, a);
  gl.drawArrays(gl.TRIANGLES, 0, count);
}


// DINO MODEL
// Colors
var DC=[0.2,0.6,0.55,1], DB=[0.5,0.8,0.7,1], DD=[0.15,0.45,0.4,1];
var DEW=[1,1,1,1], DEP=[0.1,0.1,0.1,1];

// Helper: create a Cube, set color + matrix, render it
function drawCubePart(color, matrix) {
  var c = new Cube();
  c.color = color;
  c.matrix = matrix;
  c.render();
}

function renderDino(dino) {
  var dx = dino.x, dy = dino.y, dz = dino.z;
  var sc = dino.scale;

  // Animate if found, else still
  var bob=0, nod=0, wag=0, legAnim=[0,0,0,0];
  if (dino.found) {
    bob = Math.sin(g_seconds * 2) * 0.05;
    nod = Math.sin(g_seconds * 3) * 5;
    wag = Math.sin(g_seconds * 2.5) * 15;
    legAnim = [
      Math.sin(g_seconds*4)*15, Math.sin(g_seconds*4+Math.PI)*15,
      Math.sin(g_seconds*4+Math.PI)*15, Math.sin(g_seconds*4)*15
    ];
  }

  // Body
  var m = new Matrix4();
  m.translate(dx, dy+bob, dz); m.scale(sc,sc,sc);
  m.translate(-0.25, 0, -0.15); m.scale(0.5, 0.35, 0.6);
  drawCubePart(DC, m);

  // Belly
  m = new Matrix4();
  m.translate(dx, dy+bob, dz); m.scale(sc,sc,sc);
  m.translate(-0.225, -0.001, -0.155); m.scale(0.45, 0.15, 0.55);
  drawCubePart(DB, m);

  // Neck
  var nb = new Matrix4();
  nb.translate(dx, dy+bob, dz); nb.scale(sc,sc,sc);
  nb.translate(-0.08, 0.3, -0.05); nb.rotate(-20, 1,0,0);
  var nbs = new Matrix4(nb);
  nb.scale(0.16, 0.25, 0.12);
  drawCubePart(DC, nb);

  // Head
  var hd = new Matrix4(nbs);
  hd.translate(0, 0.22, -0.05); hd.rotate(nod, 1,0,0);
  var hds = new Matrix4(hd);
  hd.scale(0.16, 0.12, 0.18);
  drawCubePart(DC, hd);

  // Snout
  var sn = new Matrix4(hds);
  sn.translate(0.02, 0, -0.12); sn.scale(0.12, 0.08, 0.14);
  drawCubePart(DC, sn);

  // Eyes
  var el = new Matrix4(hds); el.translate(-0.01,0.05,-0.02); el.scale(0.04,0.04,0.04);
  drawCubePart(DEW, el);
  var er = new Matrix4(hds); er.translate(0.13,0.05,-0.02); er.scale(0.04,0.04,0.04);
  drawCubePart(DEW, er);
  var pl = new Matrix4(hds); pl.translate(-0.011,0.055,-0.025); pl.scale(0.02,0.025,0.02);
  drawCubePart(DEP, pl);
  var pr = new Matrix4(hds); pr.translate(0.131,0.055,-0.025); pr.scale(0.02,0.025,0.02);
  drawCubePart(DEP, pr);

  // Tail
  var t1 = new Matrix4();
  t1.translate(dx, dy+bob, dz); t1.scale(sc,sc,sc);
  t1.translate(-0.08, 0.1, 0.4); t1.rotate(wag, 0,1,0); t1.rotate(10, 1,0,0);
  var t1s = new Matrix4(t1);
  t1.scale(0.16, 0.14, 0.2); drawCubePart(DC, t1);

  var t2 = new Matrix4(t1s); t2.translate(0.02,0,0.18); t2.rotate(wag*0.5,0,1,0);
  var t2s = new Matrix4(t2);
  t2.scale(0.12, 0.1, 0.18); drawCubePart(DC, t2);

  var t3 = new Matrix4(t2s); t3.translate(0.02,0,0.17); t3.rotate(wag*0.3,0,1,0);
  t3.scale(0.08, 0.06, 0.15); drawCubePart(DD, t3);

  // Legs
  var lpos = [[-0.28,-0.08],[0.18,-0.08],[-0.25,0.3],[0.13,0.3]];
  for (var i = 0; i < 4; i++) {
    var lg = new Matrix4();
    lg.translate(dx, dy+bob, dz); lg.scale(sc,sc,sc);
    lg.translate(lpos[i][0], 0, lpos[i][1]);
    lg.rotate(legAnim[i], 1,0,0);
    lg.scale(0.1, -0.25, 0.1);
    drawCubePart(DC, lg);
  }
}

// RENDERING
function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ModelMatrix, false, g_identityMatrix.elements);

  // Sky
  drawBufColored(g_skyBuffer, g_skyVertCount, 0.53, 0.81, 0.92, 1.0);
  // Ground
  drawBufTextured(g_groundBuffer, g_groundVertCount, 3);
  // Walls
  for (var tid in g_worldBuffers) {
    drawBufTextured(g_worldBuffers[tid].vbo, g_worldBuffers[tid].vertCount, parseInt(tid));
  }
  // All dinosaurs
  for (var i = 0; i < g_dinos.length; i++) {
    renderDino(g_dinos[i]);
  }
}


// DINO CHECK
function checkDinos() {
  var ex = camera.eye.elements[0], ez = camera.eye.elements[2];
  var anyNew = false;

  for (var i = 0; i < g_dinos.length; i++) {
    if (g_dinos[i].found) continue;
    var ddx = ex - g_dinos[i].x, ddz = ez - g_dinos[i].z;
    if (Math.sqrt(ddx*ddx + ddz*ddz) < 1) {
      g_dinos[i].found = true;
      g_dinosFound++;
      anyNew = true;
    }
  }

  if (anyNew) {
    updateDinoCounter();
    var msg = document.getElementById('gameMessage');
    if (g_dinosFound >= g_dinosTotal) {
      msg.textContent = 'All dinosaurs found! You win!';
      msg.style.color = '#2ecc71';
    } else {
      msg.textContent = 'Found one! ' + (g_dinosTotal - g_dinosFound) + ' remaining...';
      msg.style.color = '#f9a825';
    }
  }
}

function updateDinoCounter() {
  var el = document.getElementById('dinoCounter');
  var icons = '';
  for (var i = 0; i < g_dinosTotal; i++) {
    icons += (i < g_dinosFound) ? '🦕' : '⬜';
  }
  el.textContent = icons + ' ' + g_dinosFound + '/' + g_dinosTotal;
}

// ANIMATION
function tick() {
  var now = performance.now();
  var dt = now - g_lastFrameTime;
  g_lastFrameTime = now;
  if (dt > 0) g_fpsSmoothed = g_fpsSmoothed * 0.9 + (1000/dt) * 0.1;

  document.getElementById('fpsCounter').textContent = 'FPS: ' + g_fpsSmoothed.toFixed(1);
  g_seconds = now / 1000 - g_startTime;

  var e = camera.eye.elements;
  document.getElementById('camPos').textContent =
    'Pos: (' + e[0].toFixed(1) + ', ' + e[1].toFixed(1) + ', ' + e[2].toFixed(1) + ')';

  checkDinos();
  renderScene();
  requestAnimationFrame(tick);
}

// BUTTONS + MOUSE
function setupInputHandlers() {
  document.onkeydown = function(ev) {
    switch (ev.key) {
      case 'w': case 'W': camera.moveForward();   break;
      case 's': case 'S': camera.moveBackwards();  break;
      case 'a': case 'A': camera.moveLeft();       break;
      case 'd': case 'D': camera.moveRight();      break;
      case 'q': case 'Q': camera.panLeft();        break;
      case 'e': case 'E': camera.panRight();       break;
      case 'f': case 'F':
        var p = camera.getBlockInFront();
        if (addBlock(p[0], p[1])) { rebuildWorld(); }
        break;
      case 'g': case 'G':
        var p = camera.getBlockInFront();
        if (removeBlock(p[0], p[1])) { rebuildWorld(); }
        break;
    }
  };

  canvas.addEventListener('click', function() {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
  });

  canvas.addEventListener('mousemove', function(ev) {
    var dx = 0, dy = 0;
    if (document.pointerLockElement === canvas) {
      dx = ev.movementX || 0;
      dy = ev.movementY || 0;
    } else if (ev.buttons === 1) {
      dx = ev.clientX - g_lastMouseX; dy = ev.clientY - g_lastMouseY;
      g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
    } else return;

    if (dx !== 0) camera.yaw += dx * g_mouseSensitivity;
    if (dy !== 0) {
      camera.pitch -= dy * g_mouseSensitivity;
      if (camera.pitch > 75)  camera.pitch = 75;
      if (camera.pitch < -75) camera.pitch = -75;
    }
    camera.rebuildAt();
  });

  canvas.addEventListener('mousedown', function(ev) {
    g_lastMouseX = ev.clientX; g_lastMouseY = ev.clientY;
  });
}

// MINIMAP
function drawMinimap() {
  var mc = document.getElementById('minimap');
  var ctx = mc.getContext('2d');
  var cs = mc.width / 32;

  ctx.clearRect(0, 0, mc.width, mc.height);

  for (var x = 0; x < 32; x++) {
    for (var z = 0; z < 32; z++) {
      var h = g_map[x][z];
      ctx.fillStyle = h > 0 ? 'rgb('+[100+h*35,100+h*35,100+h*35]+')' : '#3a5a3a';
      ctx.fillRect(x*cs, z*cs, cs, cs);
    }
  }

  // Dino markers
  for (var i = 0; i < g_dinos.length; i++) {
    ctx.fillStyle = g_dinos[i].found ? '#2ecc71' : '#ff4444';
    ctx.beginPath();
    ctx.arc(g_dinos[i].x*cs, g_dinos[i].z*cs, 2.5, 0, Math.PI*2);
    ctx.fill();
  }

  // Player marker + direction
  var ex = camera.eye.elements[0], ez = camera.eye.elements[2];
  var yr = camera.yaw * Math.PI / 180;
  ctx.fillStyle = '#ffff00';
  ctx.beginPath(); ctx.arc(ex*cs, ez*cs, 3, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ex*cs, ez*cs);
  ctx.lineTo((ex+Math.sin(yr)*2)*cs, (ez-Math.cos(yr)*2)*cs);
  ctx.stroke();

  setTimeout(drawMinimap, 200);
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();
  new Cube();

  camera = new Camera(canvas);

  setupInputHandlers();
  updateDinoCounter();
  initTextures();
  drawMinimap();
}
