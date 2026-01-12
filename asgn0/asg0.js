function drawVector(v, color) {
  // Get canvas and context
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  
  // Center of canvas (400x400)
  let cx = canvas.width / 2;   // 200
  let cy = canvas.height / 2;  // 200
  
  // Scale factor
  let scale = 20;
  
  // Calculate endpoint (note: y is flipped in canvas coordinates)
  let endX = cx + v.elements[0] * scale;
  let endY = cy - v.elements[1] * scale;  // subtract because canvas y-axis points down
  
  // Draw the vector
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy);      // Start at center
  ctx.lineTo(endX, endY);  // Draw to endpoint
  ctx.stroke();
}

function clearCanvas(){
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);  // Clear everything first
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function areaTriangle(v1, v2) {
  var crossProduct = Vector3.cross(v1, v2);
  var parallelogramArea = crossProduct.magnitude();
  var triangleArea = parallelogramArea / 2;
  return triangleArea;
}

function angleBetween(v1, v2) {
  var dotProduct = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();
  
  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }
  
  var cosAngle = dotProduct / (mag1 * mag2)
  var angleRadians = Math.acos(cosAngle);
  var angleDegrees = angleRadians * (180 / Math.PI);
  
  return angleDegrees;
}

function handleDrawEvent(){
  clearCanvas();

  var v1_x = document.getElementById('v1-x-coord').value;
  var v1_y = document.getElementById('v1-y-coord').value;

  var v2_x = document.getElementById('v2-x-coord').value
  var v2_y = document.getElementById('v2-y-coord').value
  
  // Create v1 vector
  var v1 = new Vector3([v1_x, v1_y, 0]);
  var v2 = new Vector3([v2_x, v2_y, 0]);

  // Draw the vector
  drawVector(v1, "red");
  drawVector(v2, "blue");
}

function handleDrawOperationEvent() {
  // Clear canvas
  clearCanvas();
  
  // Read values for v1 and draw
  var x1 = document.getElementById('v1-x-coord').value;
  var y1 = document.getElementById('v1-y-coord').value;
  var v1 = new Vector3([x1, y1, 0]);
  drawVector(v1, "red");
  
  // Read values for v2 and draw
  var x2 = document.getElementById('v2-x-coord').value;
  var y2 = document.getElementById('v2-y-coord').value;
  var v2 = new Vector3([x2, y2, 0]);
  drawVector(v2, "blue");

  // Read operation and scalar
  var operation = document.getElementById('operation').value;
  var scalar = document.getElementById('scalar').value;
  
  // Do the operation and draw result in green
  if (operation === "add") {
    // v3 = v1 + v2
    var v3 = new Vector3([x1, y1, 0]);
    v3.add(v2);
    drawVector(v3, "green");
  } 
  else if (operation === "sub") {
    // v3 = v1 - v2
    var v3 = new Vector3([x1, y1, 0]);
    v3.sub(v2);
    drawVector(v3, "green");
  } 
  else if (operation === "mul") {
    // v3 = v1 * s and v4 = v2 * s
    var v3 = new Vector3([x1, y1, 0]);
    v3.mul(scalar);
    drawVector(v3, "green");
    
    var v4 = new Vector3([x2, y2, 0]);
    v4.mul(scalar);
    drawVector(v4, "green");
  } 
  else if (operation === "div") {
    // v3 = v1 / s and v4 = v2 / s
    var v3 = new Vector3([x1, y1, 0]);
    v3.div(scalar);
    drawVector(v3, "green");
    
    var v4 = new Vector3([x2, y2, 0]);
    v4.div(scalar);
    drawVector(v4, "green");
  }
  else if(operation === "mag") {
    var m1 = v1.magnitude()
    var m2 = v2.magnitude()
    console.log("Magnitude v1: " + m1); 
    console.log("Magnitude v2: " + m2); 
  }
  else if(operation === "norm") {
    var v3 = new Vector3([x1, y1, 0]);
    var v4 = new Vector3([x2, y2, 0]);
    v3.normalize();
    v4.normalize();
    drawVector(v3, "green")
    drawVector(v4, "green")
  }
  else if(operation === "dot") {
    var angle = angleBetween(v1, v2);
    console.log("Angle: " + angle);
  }
  else if (operation === "area") {
    var area = areaTriangle(v1, v2);
    console.log("Area of the triangle: " + area);
  }
}

// DrawTriangle.js (c) 2012 matsuda
function main() {  
  // Retrieve <canvas> element
  var canvas = document.getElementById('example');  
  if (!canvas) { 
    console.log('Failed to retrieve the <canvas> element');
    return false; 
  } 

  clearCanvas();
}

