// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  void main() {
    gl_Position = u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
  }`

// Fragment shader program
// uniform required when using fragment shader
var FSHADER_SOURCE = `
  precision mediump float;
  uniform vec4 u_FragColor;
  void main() {
    gl_FragColor = u_FragColor;
  }`

// Constants
var POINT = 0;
var TRIANGLE = 1;
var CIRCLE = 2;

// global variables
let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_Size;
let u_ModelMatrix;
let u_GlobalRotateMatrix;

// globals for UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_globalYaw = 0;
let g_globalPitch = 0;

// mouse drag
let g_isDragging = false;
let g_lastX = 0;
let g_lastY = 0;
const DRAG_SENSITIVITY = 0.3;
const ANGLE_LIMIT = 90;

// Neck and Head
let g_neckBaseAngle = 0;
let g_neckMidAngle = 0;
let g_neckTopAngle = 0;
let g_headAngle = 0;    
let g_jawAngle = 0;

// Tail
let g_tailBaseAngle = 0;
let g_tailMidAngle = 0;
let g_tailTipAngle = 0;

// Front Legs
let g_frontLeftUpperLeg = 0;
let g_frontLeftLowerLeg = 0;
let g_frontRightUpperLeg = 0;
let g_frontRightLowerLeg = 0;

// Back Legs
let g_backLeftUpperLeg = 0;
let g_backLeftLowerLeg = 0;
let g_backRightUpperLeg = 0;
let g_backRightLowerLeg = 0;

// Animation
let g_startTime = performance.now() / 1000.0;
let g_seconds = 0;
let g_animationOn = false;      
let g_neckAnimationOn = false;  
let g_tailAnimationOn = false;
let g_legsAnimationOn = false;

// Poke Animation
let g_bodyBounce = 0;
let g_pokeAnimation = false;
let g_pokeStartTime = 0;
const POKE_DURATION = 2.0;

// Colors 
const DINO_MAIN = [0.2, 0.6, 0.55, 1.0];       // Teal/blue-green
const DINO_BELLY = [0.5, 0.8, 0.7, 1.0];       // Light mint
const DINO_DARK = [0.15, 0.45, 0.4, 1.0];      // Darker teal (patches)
const DINO_NAIL = [0.9, 0.85, 0.7, 1.0];       // Cream (nails)
const DINO_EYE_WHITE = [1.0, 1.0, 1.0, 1.0];   // Eye white
const DINO_EYE_PUPIL = [0.1, 0.1, 0.1, 1.0];   // Eye pupil
const DINO_SPIKE = [0.25, 0.5, 0.45, 1.0];        // Spike color

function clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }

function setUpWebGL() {
  // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  // magic flag
  gl = canvas.getContext('webgl', { preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }

  gl.enable(gl.DEPTH_TEST);
}

function connectVariablesToGLSL(){
  // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }

  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  // Get the storage location of u_Size
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!u_ModelMatrix) {
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if (!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements)

}

function addActionsForHtmlUI(){

  function connectSlider(sliderId, valueId, globalVarSetter) {
    var slider = document.getElementById(sliderId);
    var valueDisplay = document.getElementById(valueId);
    if (slider) {
      slider.addEventListener('input', function() {
        var val = Number(this.value);
        globalVarSetter(val);
        if (valueDisplay) {
          valueDisplay.textContent = val + '°';
        }
      });
    }
  }

  connectSlider('angleSlide', 'angleSlideVal', function(v) { g_globalYaw = v; });
  connectSlider('neckBaseSlide', 'neckBaseVal', function(v) { g_neckBaseAngle = v; });
  connectSlider('neckMidSlide', 'neckMidVal', function(v) { g_neckMidAngle = v; });
  connectSlider('neckTopSlide', 'neckTopVal', function(v) { g_neckTopAngle = v; });
  connectSlider('headSlide', 'headVal', function(v) { g_headAngle = v; });
  connectSlider('tailBaseSlide', 'tailBaseVal', function(v) { g_tailBaseAngle = v; });
  connectSlider('tailMidSlide', 'tailMidVal', function(v) { g_tailMidAngle = v; });
  connectSlider('tailTipSlide', 'tailTipVal', function(v) { g_tailTipAngle = v; });
  connectSlider('frontLeftUpperSlide', 'frontLeftUpperVal', function(v) { g_frontLeftUpperLeg = v; });
  connectSlider('frontLeftLowerSlide', 'frontLeftLowerVal', function(v) { g_frontLeftLowerLeg = v; });
  connectSlider('frontRightUpperSlide', 'frontRightUpperVal', function(v) { g_frontRightUpperLeg = v; });
  connectSlider('frontRightLowerSlide', 'frontRightLowerVal', function(v) { g_frontRightLowerLeg = v; });
  connectSlider('backLeftUpperSlide', 'backLeftUpperVal', function(v) { g_backLeftUpperLeg = v; });
  connectSlider('backLeftLowerSlide', 'backLeftLowerVal', function(v) { g_backLeftLowerLeg = v; });
  connectSlider('backRightUpperSlide', 'backRightUpperVal', function(v) { g_backRightUpperLeg = v; });
  connectSlider('backRightLowerSlide', 'backRightLowerVal', function(v) { g_backRightLowerLeg = v; });

  var animOnBtn = document.getElementById('animationOnBtn');
  if (animOnBtn) {
    animOnBtn.onclick = function() { 
      g_animationOn = true;
      g_neckAnimationOn = true;
      g_tailAnimationOn = true;
      g_legsAnimationOn = true;
    };
  }
  
  var animOffBtn = document.getElementById('animationOffBtn');
  if (animOffBtn) {
    animOffBtn.onclick = function() { 
      g_animationOn = false;
      g_neckAnimationOn = false;
      g_tailAnimationOn = false;
      g_legsAnimationOn = false;
    };
  }

  var neckAnimBtn = document.getElementById('neckAnimBtn');
  if (neckAnimBtn) {
    neckAnimBtn.onclick = function() { 
      g_neckAnimationOn = !g_neckAnimationOn;
    };
  }

  var tailAnimBtn = document.getElementById('tailAnimBtn');
  if (tailAnimBtn) {
    tailAnimBtn.onclick = function() { 
      g_tailAnimationOn = !g_tailAnimationOn;
    };
  }

  var legsAnimBtn = document.getElementById('legsAnimBtn');
  if (legsAnimBtn) {
    legsAnimBtn.onclick = function() { 
      g_legsAnimationOn = !g_legsAnimationOn;
    };
  }

  // Mouse drag to rotate
  canvas.addEventListener('mousedown', function(ev){
    if (ev.shiftKey) {
      g_pokeAnimation = true;
      g_pokeStartTime = g_seconds;
      return;
    }

    g_isDragging = true;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;
    ev.preventDefault();
  });

  window.addEventListener('mousemove', function(ev){
    if(!g_isDragging) return;
    const dx = ev.clientX - g_lastX;
    const dy = ev.clientY - g_lastY;
    g_lastX = ev.clientX;
    g_lastY = ev.clientY;

    // Invert signs so motion matches mouse direction
    g_globalYaw = clamp(g_globalYaw - dx * DRAG_SENSITIVITY, -ANGLE_LIMIT, ANGLE_LIMIT);
    g_globalPitch = clamp(g_globalPitch - dy * DRAG_SENSITIVITY, -ANGLE_LIMIT, ANGLE_LIMIT);
    renderAllShapes();
  });

  window.addEventListener('mouseup', function(ev){
    g_isDragging = false;
  });

}

function updateAnimationAngles() {
  if (g_pokeAnimation) {
    var pokeTime = g_seconds - g_pokeStartTime;
    
    if (pokeTime > POKE_DURATION) {
      g_pokeAnimation = false;
      g_bodyBounce = 0;
      g_jawAngle = 0;
    } else {
      var jumpDecay = Math.exp(-pokeTime * 3);
      
      // Jump up and down
      g_bodyBounce = 0.15 * Math.sin(pokeTime * 25) * jumpDecay;
      
      // Head whips back in surprise
      g_neckBaseAngle = -20 * Math.sin(pokeTime * 8) * jumpDecay;
      g_neckMidAngle = -15 * Math.sin(pokeTime * 10) * jumpDecay;
      g_neckTopAngle = 25 * Math.sin(pokeTime * 12) * jumpDecay;
      g_headAngle = 30 * Math.sin(pokeTime * 15) * jumpDecay;
      
      // Mouth opens
      g_jawAngle = 40 * jumpDecay;
      
      // Tail goes crazy
      g_tailBaseAngle = 40 * Math.sin(pokeTime * 20) * jumpDecay;
      g_tailMidAngle = 50 * Math.sin(pokeTime * 22) * jumpDecay;
      g_tailTipAngle = 60 * Math.sin(pokeTime * 25) * jumpDecay;
      
      // Legs scramble
      var legSpeed = 15;
      g_frontLeftUpperLeg = 35 * Math.sin(pokeTime * legSpeed) * jumpDecay;
      g_frontLeftLowerLeg = 25 * Math.sin(pokeTime * legSpeed + 1) * jumpDecay;
      g_frontRightUpperLeg = 35 * Math.sin(pokeTime * legSpeed + Math.PI) * jumpDecay;
      g_frontRightLowerLeg = 25 * Math.sin(pokeTime * legSpeed + Math.PI + 1) * jumpDecay;
      g_backLeftUpperLeg = 35 * Math.sin(pokeTime * legSpeed + Math.PI) * jumpDecay;
      g_backLeftLowerLeg = 25 * Math.sin(pokeTime * legSpeed + Math.PI + 1) * jumpDecay;
      g_backRightUpperLeg = 35 * Math.sin(pokeTime * legSpeed) * jumpDecay;
      g_backRightLowerLeg = 25 * Math.sin(pokeTime * legSpeed + 1) * jumpDecay;
      
      return;
    }
  }
  
  g_bodyBounce = 0;

  // Neck
  if (g_neckAnimationOn) {
    g_neckBaseAngle = 5 * Math.sin(g_seconds * 1.5);
    g_neckMidAngle = 7 * Math.sin(g_seconds * 2.0 + 0.5);
    g_neckTopAngle = 10 * Math.sin(g_seconds * 2.5 + 1.0);
    g_headAngle = 8 * Math.sin(g_seconds * 3.0);
  }
  
  // Tail
  if (g_tailAnimationOn) {
    g_tailBaseAngle = 15 * Math.sin(g_seconds * 3.0);
    g_tailMidAngle = 20 * Math.sin(g_seconds * 3.0 - 0.5);
    g_tailTipAngle = 25 * Math.sin(g_seconds * 3.0 - 1.0);
  }
  
  // Legs
  if (g_legsAnimationOn) {
    var walkSpeed = 4.0;
    var upperSwing = 20;
    var lowerSwing = 15;
    
    // Front Left & Back Right (same)
    g_frontLeftUpperLeg = upperSwing * Math.sin(g_seconds * walkSpeed);
    g_frontLeftLowerLeg = lowerSwing * Math.sin(g_seconds * walkSpeed + 0.5);  // Slight delay for knee
    g_backRightUpperLeg = upperSwing * Math.sin(g_seconds * walkSpeed);
    g_backRightLowerLeg = lowerSwing * Math.sin(g_seconds * walkSpeed + 0.5);
    
    // Front Right & Back Left (opposite)
    g_frontRightUpperLeg = upperSwing * Math.sin(g_seconds * walkSpeed + Math.PI);
    g_frontRightLowerLeg = lowerSwing * Math.sin(g_seconds * walkSpeed + Math.PI + 0.5);
    g_backLeftUpperLeg = upperSwing * Math.sin(g_seconds * walkSpeed + Math.PI);
    g_backLeftLowerLeg = lowerSwing * Math.sin(g_seconds * walkSpeed + Math.PI + 0.5);
  }
}

function tick() {
  g_seconds = performance.now() / 1000.0 - g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  requestAnimationFrame(tick);
}

function main() {

  // Set up canvas and gl variables
  setUpWebGL();

  // Set up GLSL shader programs amd connect GLSL variables
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  requestAnimationFrame(tick);
}

function renderAllShapes(ev){

  var startTime = performance.now();

  // Set up global rotation matrix
  var globalRotMat = new Matrix4().rotate(g_globalYaw, 0, 1, 0).rotate(g_globalPitch, 1, 0, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Main Body
  var body = new Cube();
  body.color = DINO_MAIN;
  body.matrix.translate(-0.25, -0.1 + g_bodyBounce, -0.15);  // Center the body
  body.matrix.scale(0.5, 0.35, 0.6);          // Chunky torso
  body.render();

  var body2 = new Cube();
  body2.color = DINO_MAIN;
  body2.matrix.translate(-0.225, 0.1 + g_bodyBounce, -0.125);  // Center the body
  body2.matrix.scale(0.45, 0.2, 0.55);          // Chunky torso
  body2.render();
  
  var belly = new Cube();
  belly.color = DINO_BELLY;
  belly.matrix.translate(-0.225, -0.101 + g_bodyBounce,-0.155);
  belly.matrix.scale(0.45, 0.15, 0.55);
  belly.render();

  var spike1 = new Cone();
  spike1.color = DINO_SPIKE;
  spike1.matrix.translate(-0.08, 0.25 + g_bodyBounce, 0.0);
  spike1.matrix.scale(0.08, 0.15, 0.08);
  spike1.render();
  
  var spike2 = new Cone();
  spike2.color = DINO_SPIKE;
  spike2.matrix.translate(-0.08, 0.27 + g_bodyBounce, 0.12);
  spike2.matrix.scale(0.09, 0.18, 0.09);
  spike2.render();
  
  var spike3 = new Cone();
  spike3.color = DINO_SPIKE;
  spike3.matrix.translate(-0.08, 0.26 + g_bodyBounce, 0.24);
  spike3.matrix.scale(0.085, 0.16, 0.085);
  spike3.render();
  
  var spike4 = new Cone();
  spike4.color = DINO_SPIKE;
  spike4.matrix.translate(-0.08, 0.23 + g_bodyBounce, 0.35);
  spike4.matrix.scale(0.07, 0.12, 0.07);
  spike4.render();


  // Neck 
  var neck1 = new Cube();
  neck1.color = DINO_MAIN;
  neck1.matrix.translate(-0.08, 0.2 + g_bodyBounce, -0.05);
  neck1.matrix.rotate(-20 + g_neckBaseAngle, 1, 0, 0);
  // Save matrix before scaling for other parts
  var neck1Mat = new Matrix4(neck1.matrix);
  neck1.matrix.scale(0.16, 0.25, 0.12);
  neck1.render();

  var neck2 = new Cube();
  neck2.color = DINO_MAIN;
  neck2.matrix = new Matrix4(neck1Mat);  // Start from past part matrix
  neck2.matrix.translate(0.01, 0.23, 0.0); 
  neck2.matrix.rotate(-15 + g_neckMidAngle, 1, 0, 0);
  var neck2Mat = new Matrix4(neck2.matrix); // repeat for next part
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

  // Eyes
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

  // Nostrils
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
  tail1.matrix.translate(-0.08, 0.0 + g_bodyBounce, 0.4);
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
  frontLeftUpper.matrix.translate(-0.28, -0.1 + g_bodyBounce, -0.08);
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
  frontRightUpper.matrix.translate(0.18, -0.1 + g_bodyBounce, -0.08);
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
  backLeftUpper.matrix.translate(-0.25, -0.08 + g_bodyBounce, 0.3);
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
  backRightUpper.matrix.translate(0.13, -0.08 + g_bodyBounce, 0.3);
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