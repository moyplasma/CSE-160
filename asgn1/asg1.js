// ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  uniform float u_Size;
  void main() {
    gl_Position = a_Position;
    gl_PointSize = u_Size;
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
// globals for UI elements
let g_selectedColor = [1.0, 1.0, 1.0, 1.0]
let g_selectedSize = 5;
let g_selectedType = POINT;
let g_segments = 10;
let g_symmetry = false;
let g_xsymmetry = false;
let g_stroke = 0;

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
  u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_Size');
    return;
  }
}

function addActionsForHtmlUI(){

  // Button events (Shape Type)
  document.getElementById('clear').onclick = function() { g_shapesList=[]; renderAllShapes(); document.getElementById('refImage').style.display = 'none';}
  document.getElementById('pointBttn').onclick = function() { g_selectedType = POINT; }
  document.getElementById('triangleBttn').onclick = function() { g_selectedType = TRIANGLE; }
  document.getElementById('circleBttn').onclick = function() { g_selectedType = CIRCLE; }
  document.getElementById('image').onclick = function() { 
    g_shapesList = []; 
    renderAllShapes(); 
    trianglePicture(); 
    document.getElementById('refImage').style.display = 'block';
  }
  document.getElementById('undo').onclick = function() { 
    if (g_shapesList.length > 0) {
      let lastStroke = g_shapesList[g_shapesList.length - 1].stroke;
      while (g_shapesList.length > 0 && g_shapesList[g_shapesList.length - 1].stroke === lastStroke) {
        g_shapesList.pop();
      }
      renderAllShapes(); 
    }
  }
  document.getElementById('ysymmetry').onclick = function() { 
    g_symmetry = !g_symmetry;
    this.textContent = g_symmetry ? 'SymmetryY: ON' : 'SymmetryY: OFF';
  }
  document.getElementById('xsymmetry').onclick = function() { 
    g_xsymmetry = !g_xsymmetry;
    this.textContent = g_xsymmetry ? 'SymmetryX: ON' : 'SymmetryX: OFF';
  }

  //Slider Events
  document.getElementById('redSlide').addEventListener('mouseup', function() { g_selectedColor[0] = this.value/100})
  document.getElementById('greenSlide').addEventListener('mouseup', function() { g_selectedColor[1] = this.value/100})
  document.getElementById('blueSlide').addEventListener('mouseup', function() { g_selectedColor[2] = this.value/100})
  document.getElementById('sizeSlide').addEventListener('mouseup', function() { g_selectedSize = this.value})
  document.getElementById('segSlide').addEventListener('mouseup', function() { g_segments = this.value})

}

function main() {

  // Set up canvas and gl variables
  setUpWebGL();

  // Set up GLSL shader programs amd connect GLSL variables
  connectVariablesToGLSL();

  // Set up actions for the HTML UI elements
  addActionsForHtmlUI();

  // Register function (event handler) to be called on a mouse press
  canvas.onmousedown =function(ev){ g_stroke++; click(ev)};
  canvas.onmousemove = function(ev){ if(ev.buttons == 1) { click(ev) } };

  // Specify the color for clearing <canvas>
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);
}

var g_shapesList = [];

function click(ev) {
  document.getElementById('refImage').style.display = 'none';
  
  // Extract thje event click and return it in WebGL coords
  let [x,y] = convertCoordsEventToGL(ev);

  // Create shape
  function createShape(posX, posY) {
    let point;
    if(g_selectedType == POINT){
      point = new Point();
    } else if(g_selectedType == TRIANGLE){
      point = new Triangle();
    } else {
      point = new Circle();
      point.segments = g_segments;
    }
    point.position = [posX, posY];
    point.color = g_selectedColor.slice();
    point.size = g_selectedSize;
    point.stroke = g_stroke;
    return point;
  }

  g_shapesList.push(createShape(x, y));

  if (g_symmetry) {
    g_shapesList.push(createShape(-x, y));
  }

  // X-axis symmetry (mirror top/bottom)
  if (g_xsymmetry) {
    g_shapesList.push(createShape(x, -y));
  }

  if (g_xsymmetry && g_symmetry) {
    g_shapesList.push(createShape(-x, -y));
  }

  // Draw every shape that is suypposed to be in the canvas
  renderAllShapes(ev);
}

function convertCoordsEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);

  return([x,y])
}

function renderAllShapes(ev){

  // check the time at the start of this function
  var startTime = performance.now();

  // Clear <canvas>
  gl.clear(gl.COLOR_BUFFER_BIT);

  var len = g_shapesList.length;
  for(var i = 0; i < len; i++) {
    g_shapesList[i].render()
  }

  var duration = performance.now() - startTime;
  sendTextToHtml("numdot: " + len + " ms: " + duration + " fps: " + Math.floor(10000/duration), "numdot")
}

function sendTextToHtml(text, htmlID) {
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm) {
    console.log("Failed to get " + htmlID + " from HTML");
    return;
  }
  htmlElm.innerHTML = text;
}

function trianglePicture(){
  
  drawColoredTriangle( [0, 0, -0.2*1.1, 0.325*1.1, 0.2*1.1, 0.325*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, -0.2*1.1, 0.325*1.1, -0.5*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, 0.2*1.1, 0.325*1.1, 0.5*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1]);
  drawColoredTriangle( [0, 0, -0.5*1.1, -0.1*1.1, -0.5*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, 0.5*1.1, -0.1*1.1, 0.5*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, -0.5*1.1, -0.1*1.1, -0.4*1.1, -0.2*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, 0.5*1.1, -0.1*1.1, 0.4*1.1, -0.2*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, -0.2*1.1, -0.33*1.1, -0.4*1.1, -0.2*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, 0.2*1.1, -0.33*1.1, 0.4*1.1, -0.2*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0, 0, -0.2*1.1, -0.33*1.1, 0.2*1.1, -0.33*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [-0.2*1.1, 0.325*1.1, -0.45*1.1, 0.3*1.1, -0.4*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [-0.2*1.1, 0.325*1.1, -0.45*1.1, 0.3*1.1, -0.3*1.1, 0.4*1.1], [255/255, 255/255, 255/255, 1] );
  drawColoredTriangle( [0.2*1.1, 0.325*1.1, 0.45*1.1, 0.3*1.1, 0.4*1.1, 0.1*1.1], [255/255, 255/255, 255/255, 1]);
  drawColoredTriangle( [0.2*1.1, 0.325*1.1, 0.45*1.1, 0.3*1.1, 0.3*1.1, 0.4*1.1], [255/255, 255/255, 255/255, 1] );
  
  drawColoredTriangle( [0, 0, -0.2, 0.325, 0.2, 0.325], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, -0.2, 0.325, -0.5, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, 0.2, 0.325, 0.5, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, -0.5, -0.1, -0.5, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, 0.5, -0.1, 0.5, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, -0.5, -0.1, -0.4, -0.2], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, 0.5, -0.1, 0.4, -0.2], [204/255, 250/255, 162/255, 1]);
  drawColoredTriangle( [0, 0, -0.2, -0.33, -0.4, -0.2], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, 0.2, -0.33, 0.4, -0.2], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0, 0, -0.2, -0.33, 0.2, -0.33], [204/255, 250/255, 162/255, 1] );

  drawColoredTriangle( [-0.2, 0.325, -0.45, 0.3, -0.4, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [-0.2, 0.325, -0.45, 0.3, -0.3, 0.4], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0.2, 0.325, 0.45, 0.3, 0.4, 0.1], [204/255, 250/255, 162/255, 1] );
  drawColoredTriangle( [0.2, 0.325, 0.45, 0.3, 0.3, 0.4], [204/255, 250/255, 162/255, 1] );

  drawColoredTriangle( [0, .3, 0, -0.3, 0.4, 0], [175/255, 200/255, 94/255, 1] );
  drawColoredTriangle( [0, .3, 0, -0.3, -0.4, 0], [175/255, 200/255, 94/255, 1] );

  drawColoredTriangle( [-0.2, 0.015, -0.15, 0.015, -0.15, 0.065], [0/255, 0/255, 0/255, 1] );
  drawColoredTriangle( [-0.2, 0.015, -0.2, 0.065, -0.15, 0.065], [0/255, 0/255, 0/255, 1] );
  drawColoredTriangle( [0.2, 0.015, 0.15, 0.015, 0.15, 0.065], [0/255, 0/255, 0/255, 1] );
  drawColoredTriangle( [0.2, 0.015, 0.2, 0.065, 0.15, 0.065], [0/255, 0/255, 0/255, 1] );

  drawColoredTriangle( [-0.12, -0.125, 0.12, -0.125, 0.12, -0.075], [0/255, 0/255, 0/255, 1] );
  drawColoredTriangle( [-0.12, -0.075, -0.12, -0.125, 0.12, -0.075], [0/255, 0/255, 0/255, 1] );

  for (let i = 0; i < 5; i++) {
    let angle1 = (i * 72) - 90;
    let angle2 = angle1 + 36;
    let centerX = 0;
    let centerY = 0.3;
    
    // Convert to radians and calculate the two outer points
    let pt1x = centerX + Math.cos(angle1 * Math.PI / 180) * 0.1;
    let pt1y = centerY + Math.sin(angle1 * Math.PI / 180) * 0.1;
    let pt2x = centerX + Math.cos(angle2 * Math.PI / 180) * 0.1;
    let pt2y = centerY + Math.sin(angle2 * Math.PI / 180) * 0.1;
    
    drawColoredTriangle([centerX, centerY, pt1x, pt1y, pt2x, pt2y], [216/255, 95/255, 114/255, 1]);
  }

  // drawColoredTriangle( [0, 0.325, -0.05, 0.225 ,0.05, 0.225], [216/255, 95/255, 114/255, 1] );
}