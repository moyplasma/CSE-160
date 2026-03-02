var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_TexCoord;
  attribute vec3 a_Normal;

  uniform mat4 u_ModelMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjMatrix;
  uniform mat4 u_NormalMatrix;

  varying vec2 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  void main() {
    vec4 worldPos  = u_ModelMatrix * a_Position;
    gl_Position    = u_ProjMatrix * u_ViewMatrix * worldPos;
    v_WorldPos     = vec3(worldPos);
    v_Normal       = normalize(mat3(u_NormalMatrix) * a_Normal);
    v_TexCoord     = a_TexCoord;
  }
`;

var FSHADER_SOURCE = `
  precision mediump float;

  uniform vec4 u_FragColor;
  uniform int  u_whichTexture;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;

  uniform int  u_LightingOn;
  uniform int  u_NormalVis;
  uniform int  u_PointLightOn;
  uniform int  u_SpotLightOn;

  uniform vec3 u_CameraPos;
  uniform vec3 u_LightPos;
  uniform vec3 u_LightColor;

  uniform vec3  u_SpotPos;
  uniform vec3  u_SpotDir;
  uniform float u_SpotCutoff;

  varying vec2 v_TexCoord;
  varying vec3 v_Normal;
  varying vec3 v_WorldPos;

  vec3 phongContrib(vec3 N, vec3 L, vec3 V, vec3 lightColor, vec3 diffuse) {
    float ambient = 0.15;
    float diff    = max(dot(N, L), 0.0);
    vec3  R       = reflect(-L, N);
    float spec    = pow(max(dot(V, R), 0.0), 32.0);
    return lightColor * (ambient * diffuse + diff * diffuse + 0.4 * spec);
  }

  void main() {
    // pick base color
    vec4 base;
    if (u_whichTexture == 0)      base = texture2D(u_Sampler0, v_TexCoord);
    else if (u_whichTexture == 1) base = texture2D(u_Sampler1, v_TexCoord);
    else                          base = u_FragColor;

    // show normals as RGB
    if (u_NormalVis == 1) {
      gl_FragColor = vec4(normalize(v_Normal) * 0.5 + 0.5, 1.0);
      return;
    }

    // no lighting
    if (u_LightingOn == 0) {
      gl_FragColor = base;
      return;
    }

    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_CameraPos - v_WorldPos);
    vec3 result = 0.08 * base.rgb;

    // point light
    if (u_PointLightOn == 1) {
      vec3 L = normalize(u_LightPos - v_WorldPos);
      result += phongContrib(N, L, V, u_LightColor, base.rgb);
    }

    // spotlight
    if (u_SpotLightOn == 1) {
      vec3  L     = normalize(u_SpotPos - v_WorldPos);
      // theta: how aligned L is with the spotlight's cone direction.
      // u_SpotDir points the same way the light aims (-Y = downward).
      // L points from fragment up toward the light, so we compare against -u_SpotDir.
      float theta = dot(L, -u_SpotDir);
      if (theta > u_SpotCutoff) {
        float fade  = smoothstep(u_SpotCutoff, u_SpotCutoff + 0.07, theta);
        result += fade * phongContrib(N, L, V, vec3(1.0, 0.92, 0.6), base.rgb);
      }
    }

    gl_FragColor = vec4(result, base.a);
  }
`;

var canvas, gl;

var a_Position, a_TexCoord, a_Normal;
var u_ModelMatrix, u_ViewMatrix, u_ProjMatrix, u_NormalMatrix;
var u_FragColor, u_whichTexture, u_Sampler0, u_Sampler1;
var u_LightingOn, u_NormalVis, u_PointLightOn, u_SpotLightOn;
var u_CameraPos, u_LightPos, u_LightColor;
var u_SpotPos, u_SpotDir, u_SpotCutoff;

var camera;

var g_lightAngle  = 0;
var g_lightHeight = 5.0;
var g_lightRadius = 5.0;
var g_lightColor  = [1.0, 1.0, 1.0];
var g_lightCenter = [16, 0, 16];
var g_lightingOn   = true;
var g_normalVis    = false;
var g_pointLightOn = true;
var g_spotLightOn  = true;
var g_animateLight = true;
var g_startTime    = performance.now() / 1000;
var g_seconds      = 0;
var g_lastFrame    = performance.now();
var g_fpsSmoothed  = 60;
var g_keys = {};
var g_kabu = null;
var g_worldBufs = {};
var g_groundBuf = null;
var g_groundVerts = 0;
var g_texLoaded = 0;

function setupWebGL() {
  canvas = document.getElementById('webgl');
  gl     = canvas.getContext('webgl', { preserveDrawingBuffer: true });
  if (!gl) { console.log('WebGL not available'); return; }
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0.5, 0.75, 0.9, 1.0);  // sky blue
}

function connectVariablesToGLSL() {
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Shader init failed');
    return;
  }

  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  a_TexCoord = gl.getAttribLocation(gl.program, 'a_TexCoord');
  a_Normal   = gl.getAttribLocation(gl.program, 'a_Normal');

  u_ModelMatrix  = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  u_ViewMatrix   = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  u_ProjMatrix   = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');

  u_FragColor     = gl.getUniformLocation(gl.program, 'u_FragColor');
  u_whichTexture  = gl.getUniformLocation(gl.program, 'u_whichTexture');
  u_Sampler0      = gl.getUniformLocation(gl.program, 'u_Sampler0');
  u_Sampler1      = gl.getUniformLocation(gl.program, 'u_Sampler1');

  u_LightingOn   = gl.getUniformLocation(gl.program, 'u_LightingOn');
  u_NormalVis    = gl.getUniformLocation(gl.program, 'u_NormalVis');
  u_PointLightOn = gl.getUniformLocation(gl.program, 'u_PointLightOn');
  u_SpotLightOn  = gl.getUniformLocation(gl.program, 'u_SpotLightOn');

  u_CameraPos  = gl.getUniformLocation(gl.program, 'u_CameraPos');
  u_LightPos   = gl.getUniformLocation(gl.program, 'u_LightPos');
  u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');

  u_SpotPos    = gl.getUniformLocation(gl.program, 'u_SpotPos');
  u_SpotDir    = gl.getUniformLocation(gl.program, 'u_SpotDir');
  u_SpotCutoff = gl.getUniformLocation(gl.program, 'u_SpotCutoff');

  gl.uniform1i(u_Sampler0, 0);
  gl.uniform1i(u_Sampler1, 1);
}

function loadTextures() {
  loadOneTex('textures/grass.png', gl.TEXTURE0, function() {
    loadOneTex('textures/dirt.png', gl.TEXTURE1, function() {
      buildWorldGeometry();
    });
  });
}

function loadOneTex(src, unit, onDone) {
  var tex = gl.createTexture();
  var img = new Image();
  img.onload = function() {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    onDone();
  };
  img.onerror = function() {
    gl.activeTexture(unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    var pixel = new Uint8Array([80, 120, 50, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    onDone();
  };
  img.src = src;
}

var g_map = [
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3],
  [3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3],
];

function pushFaceWithNormal(arr, faceVerts, nx, ny, nz, wx, wy, wz) {
  for (var i = 0; i < faceVerts.length; i += 5) {
    arr.push(
      faceVerts[i]   + wx,
      faceVerts[i+1] + wy,
      faceVerts[i+2] + wz,
      faceVerts[i+3],  // u
      faceVerts[i+4],  // v
      nx, ny, nz
    );
  }
}

// position + UV, no normals yet
var FACE_FRONT  = [0,0,0,0,0, 1,0,0,1,0, 1,1,0,1,1, 0,0,0,0,0, 1,1,0,1,1, 0,1,0,0,1];
var FACE_BACK   = [1,0,1,0,0, 0,0,1,1,0, 0,1,1,1,1, 1,0,1,0,0, 0,1,1,1,1, 1,1,1,0,1];
var FACE_TOP    = [0,1,0,0,0, 0,1,1,0,1, 1,1,1,1,1, 0,1,0,0,0, 1,1,1,1,1, 1,1,0,1,0];
var FACE_RIGHT  = [1,0,0,0,0, 1,0,1,1,0, 1,1,1,1,1, 1,0,0,0,0, 1,1,1,1,1, 1,1,0,0,1];
var FACE_LEFT   = [0,0,1,0,0, 0,0,0,1,0, 0,1,0,1,1, 0,0,1,0,0, 0,1,0,1,1, 0,1,1,0,1];

function buildWorldGeometry() {
  var wallVerts   = [];  // dirt
  var groundVerts = [];  // grass

  for (var x = 0; x < 32; x++) {
    for (var z = 0; z < 32; z++) {
      var h = g_map[x][z];
      for (var y = 0; y < h; y++) {
        var above = (y + 1 < h);
        var north = (z > 0  && g_map[x][z-1] > y);
        var south = (z < 31 && g_map[x][z+1] > y);
        var west  = (x > 0  && g_map[x-1][z] > y);
        var east  = (x < 31 && g_map[x+1][z] > y);

        if (!north) pushFaceWithNormal(wallVerts, FACE_FRONT, 0, 0,-1, x, y, z);
        if (!south) pushFaceWithNormal(wallVerts, FACE_BACK,  0, 0, 1, x, y, z);
        if (!above) pushFaceWithNormal(wallVerts, FACE_TOP,   0, 1, 0, x, y, z);
        if (!east)  pushFaceWithNormal(wallVerts, FACE_RIGHT, 1, 0, 0, x, y, z);
        if (!west)  pushFaceWithNormal(wallVerts, FACE_LEFT, -1, 0, 0, x, y, z);
      }
    }
  }

  // flat ground plane at y=0
  var gw = 32;
  groundVerts.push(
    0,0,0,  0,0,  0,1,0,
    gw,0,0, gw,0, 0,1,0,
    gw,0,gw,gw,gw,0,1,0,
    0,0,0,  0,0,  0,1,0,
    gw,0,gw,gw,gw,0,1,0,
    0,0,gw, 0,gw, 0,1,0
  );

  g_worldBufs.walls = makeBuffer(wallVerts);
  g_worldBufs.wallVerts = wallVerts.length / 8;

  g_groundBuf   = makeBuffer(groundVerts);
  g_groundVerts = 6;

  // load kabu once world is ready
  g_kabu = new Model('kabu.obj');

  requestAnimationFrame(tick);
}

function makeBuffer(data) {
  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
  return buf;
}

// bind a world-geometry buffer (8 floats/vertex)
function bindWorldBuf(buf) {
  var FS = Float32Array.BYTES_PER_ELEMENT;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FS * 8, 0);
  gl.enableVertexAttribArray(a_Position);
  gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FS * 8, FS * 3);
  gl.enableVertexAttribArray(a_TexCoord);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FS * 8, FS * 5);
  gl.enableVertexAttribArray(a_Normal);
}


function renderScene() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // upload per-frame uniforms
  var eye = camera.getEyePos();
  gl.uniformMatrix4fv(u_ViewMatrix, false, camera.viewMatrix.elements);
  gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projMatrix.elements);
  gl.uniform3fv(u_CameraPos, eye);

  // lighting state
  gl.uniform1i(u_LightingOn,   g_lightingOn   ? 1 : 0);
  gl.uniform1i(u_NormalVis,    g_normalVis    ? 1 : 0);
  gl.uniform1i(u_PointLightOn, g_pointLightOn ? 1 : 0);
  gl.uniform1i(u_SpotLightOn,  g_spotLightOn  ? 1 : 0);

  var lx = g_lightCenter[0] + g_lightRadius * Math.cos(g_lightAngle * Math.PI / 180);
  var lz = g_lightCenter[2] + g_lightRadius * Math.sin(g_lightAngle * Math.PI / 180);
  var ly = g_lightHeight;
  gl.uniform3f(u_LightPos, lx, ly, lz);
  gl.uniform3fv(u_LightColor, g_lightColor);

  // spotlight
  gl.uniform3f(u_SpotPos, 16, 15, 16);
  gl.uniform3f(u_SpotDir, 0, -1, 0);
  gl.uniform1f(u_SpotCutoff, Math.cos(25 * Math.PI / 180));

  // walls
  if (g_worldBufs.walls) {
    var identity = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix,  false, identity.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, identity.elements); // identity = no scaling, so nm = identity
    gl.uniform1i(u_whichTexture, 1);
    gl.uniform4f(u_FragColor, 1, 1, 1, 1);
    bindWorldBuf(g_worldBufs.walls);
    gl.drawArrays(gl.TRIANGLES, 0, g_worldBufs.wallVerts);
  }

  // ground
  if (g_groundBuf) {
    var identity = new Matrix4();
    gl.uniformMatrix4fv(u_ModelMatrix,  false, identity.elements);
    gl.uniformMatrix4fv(u_NormalMatrix, false, identity.elements);
    gl.uniform1i(u_whichTexture, 0);
    gl.uniform4f(u_FragColor, 1, 1, 1, 1);
    bindWorldBuf(g_groundBuf);
    gl.drawArrays(gl.TRIANGLES, 0, g_groundVerts);
  }

  // spheres
  drawSphere([14, 2, 14], 1.2, [0.85, 0.2, 0.15, 1.0]);
  drawSphere([18, 2, 14], 1.0, [0.15, 0.4, 0.85, 1.0]);
  drawSphere([16, 3.5, 18], 0.6, [0.2, 0.75, 0.35, 1.0]);

  // light marker
  drawLightMarker(lx, ly, lz);

  // OBJ model
  if (g_kabu) {
    g_kabu.matrix = new Matrix4();
    g_kabu.matrix.translate(16, 0, 16);
    g_kabu.matrix.scale(0.5, 0.5, 0.5);
    g_kabu.render();
  }

  drawDino(10, 0.5, 10);
}

function drawSphere(pos, scale, color) {
  var s = new Sphere();
  s.color = color;
  s.matrix.translate(pos[0], pos[1], pos[2]);
  s.matrix.scale(scale, scale, scale);
  s.render();
}

function drawLightMarker(x, y, z) {
  var saved_lighting = g_lightingOn;
  g_lightingOn = false;
  gl.uniform1i(u_LightingOn, 0);

  var c = new Cube();
  c.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1.0];
  c.matrix.translate(x - 0.15, y - 0.15, z - 0.15);
  c.matrix.scale(0.3, 0.3, 0.3);
  c.render();

  g_lightingOn = saved_lighting;
  gl.uniform1i(u_LightingOn, g_lightingOn ? 1 : 0);
}


// dino
var DINO_MAIN      = [0.2,  0.6,  0.55, 1.0];
var DINO_BELLY     = [0.5,  0.8,  0.7,  1.0];
var DINO_DARK      = [0.15, 0.45, 0.4,  1.0];
var DINO_NAIL      = [0.9,  0.85, 0.7,  1.0];
var DINO_EYE_WHITE = [1.0,  1.0,  1.0,  1.0];
var DINO_EYE_PUPIL = [0.1,  0.1,  0.1,  1.0];
var DINO_SPIKE     = [0.25, 0.5,  0.45, 1.0];

var g_bodyBounce         = 0;
var g_neckBaseAngle      = 0;
var g_neckMidAngle       = 0;
var g_neckTopAngle       = 0;
var g_headAngle          = 0;
var g_tailBaseAngle      = 0;
var g_tailMidAngle       = 0;
var g_tailTipAngle       = 0;
var g_frontLeftUpperLeg  = 0;
var g_frontLeftLowerLeg  = 0;
var g_frontRightUpperLeg = 0;
var g_frontRightLowerLeg = 0;
var g_backLeftUpperLeg   = 0;
var g_backLeftLowerLeg   = 0;
var g_backRightUpperLeg  = 0;
var g_backRightLowerLeg  = 0;

function drawDino(wx, wy, wz) {
  var body = new Cube();
  body.color = DINO_MAIN;
  body.matrix.translate(wx - 0.25, wy + (-0.1 + g_bodyBounce), wz - 0.15);
  body.matrix.scale(0.5, 0.35, 0.6);
  body.render();

  var body2 = new Cube();
  body2.color = DINO_MAIN;
  body2.matrix.translate(wx - 0.225, wy + (0.1 + g_bodyBounce), wz - 0.125);
  body2.matrix.scale(0.45, 0.2, 0.55);
  body2.render();

  var belly = new Cube();
  belly.color = DINO_BELLY;
  belly.matrix.translate(wx - 0.225, wy + (-0.101 + g_bodyBounce), wz - 0.155);
  belly.matrix.scale(0.45, 0.15, 0.55);
  belly.render();

  var spike1 = new Cone();
  spike1.color = DINO_SPIKE;
  spike1.matrix.translate(wx - 0.08, wy + (0.25 + g_bodyBounce), wz + 0.0);
  spike1.matrix.scale(0.08, 0.15, 0.08);
  spike1.render();

  var spike2 = new Cone();
  spike2.color = DINO_SPIKE;
  spike2.matrix.translate(wx - 0.08, wy + (0.27 + g_bodyBounce), wz + 0.12);
  spike2.matrix.scale(0.09, 0.18, 0.09);
  spike2.render();

  var spike3 = new Cone();
  spike3.color = DINO_SPIKE;
  spike3.matrix.translate(wx - 0.08, wy + (0.26 + g_bodyBounce), wz + 0.24);
  spike3.matrix.scale(0.085, 0.16, 0.085);
  spike3.render();

  var spike4 = new Cone();
  spike4.color = DINO_SPIKE;
  spike4.matrix.translate(wx - 0.08, wy + (0.23 + g_bodyBounce), wz + 0.35);
  spike4.matrix.scale(0.07, 0.12, 0.07);
  spike4.render();

  // Neck (chained – only the root needs the world offset)
  var neck1 = new Cube();
  neck1.color = DINO_MAIN;
  neck1.matrix.translate(wx - 0.08, wy + (0.2 + g_bodyBounce), wz - 0.05);
  neck1.matrix.rotate(-20 + g_neckBaseAngle, 1, 0, 0);
  var neck1Mat = new Matrix4(neck1.matrix);
  neck1.matrix.scale(0.16, 0.25, 0.12);
  neck1.render();

  var neck2 = new Cube();
  neck2.color = DINO_MAIN;
  neck2.matrix = new Matrix4(neck1Mat);
  neck2.matrix.translate(0.01, 0.23, 0.0);
  neck2.matrix.rotate(-15 + g_neckMidAngle, 1, 0, 0);
  var neck2Mat = new Matrix4(neck2.matrix);
  neck2.matrix.scale(0.14, 0.22, 0.1);
  neck2.render();

  var neck3 = new Cube();
  neck3.color = DINO_MAIN;
  neck3.matrix = new Matrix4(neck2Mat);
  neck3.matrix.translate(0.01, 0.2, 0.0);
  neck3.matrix.rotate(-10 + g_neckTopAngle, 1, 0, 0);
  var neck3Mat = new Matrix4(neck3.matrix);
  neck3.matrix.scale(0.12, 0.18, 0.09);
  neck3.render();

  // Head
  var head = new Cube();
  head.color = DINO_MAIN;
  head.matrix = new Matrix4(neck3Mat);
  head.matrix.translate(-0.02, 0.15, -0.06);
  head.matrix.rotate(g_headAngle, 1, 0, 0);
  var headMat = new Matrix4(head.matrix);
  head.matrix.scale(0.16, 0.12, 0.18);
  head.render();

  var snout = new Cube();
  snout.color = DINO_MAIN;
  snout.matrix = new Matrix4(headMat);
  snout.matrix.translate(0.02, 0.0, -0.12);
  snout.matrix.scale(0.12, 0.08, 0.14);
  snout.render();

  var jaw = new Cube();
  jaw.color = DINO_BELLY;
  jaw.matrix = new Matrix4(headMat);
  jaw.matrix.translate(0.02, -0.07, -0.05);
  jaw.matrix.rotate(-30, 1, 0, 0);
  jaw.matrix.scale(0.11, 0.04, 0.12);
  jaw.render();

  var eyeLeft = new Cube();
  eyeLeft.color = DINO_EYE_WHITE;
  eyeLeft.matrix = new Matrix4(headMat);
  eyeLeft.matrix.translate(-0.01, 0.05, -0.02);
  eyeLeft.matrix.scale(0.04, 0.04, 0.04);
  eyeLeft.render();

  var pupilLeft = new Cube();
  pupilLeft.color = DINO_EYE_PUPIL;
  pupilLeft.matrix = new Matrix4(headMat);
  pupilLeft.matrix.translate(-0.011, 0.055, -0.025);
  pupilLeft.matrix.scale(0.02, 0.025, 0.02);
  pupilLeft.render();

  var eyeRight = new Cube();
  eyeRight.color = DINO_EYE_WHITE;
  eyeRight.matrix = new Matrix4(headMat);
  eyeRight.matrix.translate(0.13, 0.05, -0.02);
  eyeRight.matrix.scale(0.04, 0.04, 0.04);
  eyeRight.render();

  var pupilRight = new Cube();
  pupilRight.color = DINO_EYE_PUPIL;
  pupilRight.matrix = new Matrix4(headMat);
  pupilRight.matrix.translate(0.131, 0.055, -0.025);
  pupilRight.matrix.scale(0.02, 0.025, 0.02);
  pupilRight.render();

  var nostrilLeft = new Cube();
  nostrilLeft.color = DINO_DARK;
  nostrilLeft.matrix = new Matrix4(headMat);
  nostrilLeft.matrix.translate(0.03, 0.04, -0.13);
  nostrilLeft.matrix.scale(0.02, 0.02, 0.02);
  nostrilLeft.render();

  var nostrilRight = new Cube();
  nostrilRight.color = DINO_DARK;
  nostrilRight.matrix = new Matrix4(headMat);
  nostrilRight.matrix.translate(0.09, 0.04, -0.13);
  nostrilRight.matrix.scale(0.02, 0.02, 0.02);
  nostrilRight.render();

  // Tail
  var tail1 = new Cube();
  tail1.color = DINO_MAIN;
  tail1.matrix.translate(wx - 0.08, wy + (0.0 + g_bodyBounce), wz + 0.4);
  tail1.matrix.rotate(g_tailBaseAngle, 0, 1, 0);
  tail1.matrix.rotate(10, 1, 0, 0);
  var tail1Mat = new Matrix4(tail1.matrix);
  tail1.matrix.scale(0.16, 0.14, 0.2);
  tail1.render();

  var tail2 = new Cube();
  tail2.color = DINO_MAIN;
  tail2.matrix = new Matrix4(tail1Mat);
  tail2.matrix.translate(0.02, 0.0, 0.18);
  tail2.matrix.rotate(g_tailMidAngle, 0, 1, 0);
  tail2.matrix.rotate(5, 1, 0, 0);
  var tail2Mat = new Matrix4(tail2.matrix);
  tail2.matrix.scale(0.12, 0.1, 0.18);
  tail2.render();

  var tail3 = new Cube();
  tail3.color = DINO_MAIN;
  tail3.matrix = new Matrix4(tail2Mat);
  tail3.matrix.translate(0.02, 0.0, 0.17);
  tail3.matrix.rotate(g_tailTipAngle, 0, 1, 0);
  tail3.matrix.rotate(5, 1, 0, 0);
  var tail3Mat = new Matrix4(tail3.matrix);
  tail3.matrix.scale(0.08, 0.06, 0.15);
  tail3.render();

  var tailSpike = new Cone();
  tailSpike.color = DINO_SPIKE;
  tailSpike.matrix = new Matrix4(tail3Mat);
  tailSpike.matrix.translate(0.01, 0.05, 0.15);
  tailSpike.matrix.rotate(90, 1, 0, 0);
  tailSpike.matrix.scale(0.06, 0.12, 0.06);
  tailSpike.render();

  // Front Left Leg
  var frontLeftUpper = new Cube();
  frontLeftUpper.color = DINO_MAIN;
  frontLeftUpper.matrix.translate(wx - 0.28, wy + (-0.1 + g_bodyBounce), wz - 0.08);
  frontLeftUpper.matrix.rotate(g_frontLeftUpperLeg, 1, 0, 0);
  var frontLeftUpperMat = new Matrix4(frontLeftUpper.matrix);
  frontLeftUpper.matrix.scale(0.1, -0.22, 0.1);
  frontLeftUpper.render();

  var frontLeftLower = new Cube();
  frontLeftLower.color = DINO_MAIN;
  frontLeftLower.matrix = new Matrix4(frontLeftUpperMat);
  frontLeftLower.matrix.translate(0.01, -0.22, 0.0);
  frontLeftLower.matrix.rotate(g_frontLeftLowerLeg, 1, 0, 0);
  var frontLeftLowerMat = new Matrix4(frontLeftLower.matrix);
  frontLeftLower.matrix.scale(0.08, -0.18, 0.08);
  frontLeftLower.render();

  var frontLeftFoot = new Cube();
  frontLeftFoot.color = DINO_MAIN;
  frontLeftFoot.matrix = new Matrix4(frontLeftLowerMat);
  frontLeftFoot.matrix.translate(-0.01, -0.18, -0.04);
  frontLeftFoot.matrix.scale(0.1, 0.05, 0.12);
  frontLeftFoot.render();

  var frontLeftNail = new Cube();
  frontLeftNail.color = DINO_NAIL;
  frontLeftNail.matrix = new Matrix4(frontLeftLowerMat);
  frontLeftNail.matrix.translate(0.01, -0.18, -0.06);
  frontLeftNail.matrix.scale(0.06, 0.03, 0.04);
  frontLeftNail.render();

  // Front Right Leg
  var frontRightUpper = new Cube();
  frontRightUpper.color = DINO_MAIN;
  frontRightUpper.matrix.translate(wx + 0.18, wy + (-0.1 + g_bodyBounce), wz - 0.08);
  frontRightUpper.matrix.rotate(g_frontRightUpperLeg, 1, 0, 0);
  var frontRightUpperMat = new Matrix4(frontRightUpper.matrix);
  frontRightUpper.matrix.scale(0.1, -0.22, 0.1);
  frontRightUpper.render();

  var frontRightLower = new Cube();
  frontRightLower.color = DINO_MAIN;
  frontRightLower.matrix = new Matrix4(frontRightUpperMat);
  frontRightLower.matrix.translate(0.01, -0.22, 0.0);
  frontRightLower.matrix.rotate(g_frontRightLowerLeg, 1, 0, 0);
  var frontRightLowerMat = new Matrix4(frontRightLower.matrix);
  frontRightLower.matrix.scale(0.08, -0.18, 0.08);
  frontRightLower.render();

  var frontRightFoot = new Cube();
  frontRightFoot.color = DINO_MAIN;
  frontRightFoot.matrix = new Matrix4(frontRightLowerMat);
  frontRightFoot.matrix.translate(-0.01, -0.18, -0.04);
  frontRightFoot.matrix.scale(0.1, 0.05, 0.12);
  frontRightFoot.render();

  var frontRightNail = new Cube();
  frontRightNail.color = DINO_NAIL;
  frontRightNail.matrix = new Matrix4(frontRightLowerMat);
  frontRightNail.matrix.translate(0.01, -0.18, -0.06);
  frontRightNail.matrix.scale(0.06, 0.03, 0.04);
  frontRightNail.render();

  // Back Left Leg
  var backLeftUpper = new Cube();
  backLeftUpper.color = DINO_MAIN;
  backLeftUpper.matrix.translate(wx - 0.25, wy + (-0.08 + g_bodyBounce), wz + 0.3);
  backLeftUpper.matrix.rotate(g_backLeftUpperLeg, 1, 0, 0);
  var backLeftUpperMat = new Matrix4(backLeftUpper.matrix);
  backLeftUpper.matrix.scale(0.12, -0.24, 0.12);
  backLeftUpper.render();

  var backLeftLower = new Cube();
  backLeftLower.color = DINO_MAIN;
  backLeftLower.matrix = new Matrix4(backLeftUpperMat);
  backLeftLower.matrix.translate(0.02, -0.24, 0.07);
  backLeftLower.matrix.rotate(g_backLeftLowerLeg, 1, 0, 0);
  var backLeftLowerMat = new Matrix4(backLeftLower.matrix);
  backLeftLower.matrix.scale(0.09, -0.18, 0.09);
  backLeftLower.render();

  var backLeftFoot = new Cube();
  backLeftFoot.color = DINO_MAIN;
  backLeftFoot.matrix = new Matrix4(backLeftLowerMat);
  backLeftFoot.matrix.translate(-0.01, -0.18, -0.04);
  backLeftFoot.matrix.scale(0.11, 0.05, 0.14);
  backLeftFoot.render();

  var backLeftNail = new Cube();
  backLeftNail.color = DINO_NAIL;
  backLeftNail.matrix = new Matrix4(backLeftLowerMat);
  backLeftNail.matrix.translate(0.02, -0.18, -0.06);
  backLeftNail.matrix.scale(0.06, 0.03, 0.04);
  backLeftNail.render();

  // Back Right Leg
  var backRightUpper = new Cube();
  backRightUpper.color = DINO_MAIN;
  backRightUpper.matrix.translate(wx + 0.13, wy + (-0.08 + g_bodyBounce), wz + 0.3);
  backRightUpper.matrix.rotate(g_backRightUpperLeg, 1, 0, 0);
  var backRightUpperMat = new Matrix4(backRightUpper.matrix);
  backRightUpper.matrix.scale(0.12, -0.24, 0.12);
  backRightUpper.render();

  var backRightLower = new Cube();
  backRightLower.color = DINO_MAIN;
  backRightLower.matrix = new Matrix4(backRightUpperMat);
  backRightLower.matrix.translate(0.02, -0.24, 0.07);
  backRightLower.matrix.rotate(g_backRightLowerLeg, 1, 0, 0);
  var backRightLowerMat = new Matrix4(backRightLower.matrix);
  backRightLower.matrix.scale(0.09, -0.18, 0.09);
  backRightLower.render();

  var backRightFoot = new Cube();
  backRightFoot.color = DINO_MAIN;
  backRightFoot.matrix = new Matrix4(backRightLowerMat);
  backRightFoot.matrix.translate(-0.01, -0.18, -0.04);
  backRightFoot.matrix.scale(0.11, 0.05, 0.14);
  backRightFoot.render();

  var backRightNail = new Cube();
  backRightNail.color = DINO_NAIL;
  backRightNail.matrix = new Matrix4(backRightLowerMat);
  backRightNail.matrix.translate(0.02, -0.18, -0.06);
  backRightNail.matrix.scale(0.06, 0.03, 0.04);
  backRightNail.render();
}

function tick() {
  var now = performance.now();
  var dt  = now - g_lastFrame;
  g_lastFrame = now;
  g_seconds   = now / 1000 - g_startTime;

  if (dt > 0) {
    g_fpsSmoothed = g_fpsSmoothed * 0.9 + (1000 / dt) * 0.1;
    if (g_seconds * 10 % 1 < 0.1) {
      var el = document.getElementById('fpsEl');
      if (el) el.textContent = 'FPS: ' + g_fpsSmoothed.toFixed(1);
    }
  }

  if (g_animateLight) {
    g_lightAngle = (g_lightAngle + dt * 0.04) % 360;
    var sl = document.getElementById('slideAngle');
    if (sl) sl.value = Math.round(g_lightAngle);
    var ev = document.getElementById('angleVal');
    if (ev) ev.textContent = Math.round(g_lightAngle) + '°';
  }

  handleKeys();
  renderScene();
  requestAnimationFrame(tick);
}

function handleKeys() {
  if (g_keys['KeyW'] || g_keys['ArrowUp'])    camera.moveForward();
  if (g_keys['KeyS'] || g_keys['ArrowDown'])  camera.moveBackwards();
  if (g_keys['KeyA'] || g_keys['ArrowLeft'])  camera.moveLeft();
  if (g_keys['KeyD'] || g_keys['ArrowRight']) camera.moveRight();
  if (g_keys['KeyQ']) camera.panLeft(2);
  if (g_keys['KeyE']) camera.panRight(2);
}

function addActionsForHtmlUI() {

  function makeToggle(btnId, label, getState, setState) {
    var btn = document.getElementById(btnId);
    if (!btn) return;
    function update() {
      var on = getState();
      btn.textContent = label + (on ? ': ON' : ': OFF');
      if (on) btn.classList.add('active');
      else    btn.classList.remove('active');
    }
    btn.onclick = function() {
      setState(!getState());
      update();
    };
    update();
  }

  makeToggle('btnLighting',   'Lighting',    function() { return g_lightingOn;   }, function(v) { g_lightingOn   = v; });
  makeToggle('btnNormals',    'Normals',     function() { return g_normalVis;    }, function(v) { g_normalVis    = v; });
  makeToggle('btnPointLight', 'Point Light', function() { return g_pointLightOn; }, function(v) { g_pointLightOn = v; });
  makeToggle('btnSpotLight',  'Spot Light',  function() { return g_spotLightOn;  }, function(v) { g_spotLightOn  = v; });
  makeToggle('btnAnimate',    'Animate',     function() { return g_animateLight; }, function(v) { g_animateLight = v; });

  // slider
  function connectSlider(id, displayId, onValue, unit) {
    var sl = document.getElementById(id);
    var dv = displayId ? document.getElementById(displayId) : null;
    if (!sl) return;
    sl.addEventListener('input', function() {
      var v = parseFloat(this.value);
      onValue(v);
      if (dv) dv.textContent = v.toFixed(unit === 'none' ? 0 : 1) + (unit || '');
    });
  }

  connectSlider('slideAngle',  'angleVal',  function(v) { g_lightAngle  = v; }, '°');
  connectSlider('slideHeight', 'heightVal', function(v) { g_lightHeight = v; }, '');
  connectSlider('slideRadius', 'radiusVal', function(v) { g_lightRadius = v; }, '');

  connectSlider('slideR', 'rVal', function(v) { g_lightColor[0] = v / 255; }, 'none');
  connectSlider('slideG', 'gVal', function(v) { g_lightColor[1] = v / 255; }, 'none');
  connectSlider('slideB', 'bVal', function(v) { g_lightColor[2] = v / 255; }, 'none');

  // keyboard
  document.addEventListener('keydown', function(e) { g_keys[e.code] = true;  });
  document.addEventListener('keyup',   function(e) { g_keys[e.code] = false; });

  // mouse
  canvas.addEventListener('click', function() {
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', function() {
    if (document.pointerLockElement === canvas) {
      document.addEventListener('mousemove', onMouseMove);
    } else {
      document.removeEventListener('mousemove', onMouseMove);
    }
  });

  document.addEventListener('keydown', function(e) {
    if (e.code === 'Escape' && document.pointerLockElement === canvas) {
      document.exitPointerLock();
    }
  });
}

function onMouseMove(e) {
  camera.panRight(e.movementX  * 0.15);
  camera.panVertical(-e.movementY * 0.15);
}

function main() {
  setupWebGL();
  connectVariablesToGLSL();

  camera = new Camera(canvas);

  addActionsForHtmlUI();
  gl.uniformMatrix4fv(u_ProjMatrix, false, camera.projMatrix.elements);

  loadTextures();
}
