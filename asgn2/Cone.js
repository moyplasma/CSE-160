class Cone {
  constructor() {
    this.type = 'cone';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.segments = 8;
    
    this.buffer = null;
    this.vertices = null;
  }

  generateVertices() {
    var verts = [];
    var tip = [0.5, 1.0, 0.5];
    var baseY = 0.0;
    var baseCenter = [0.5, 0.0, 0.5];
    var radius = 0.5;
    
    var angleStep = 360 / this.segments;
    
    // Side triangles 
    for (var angle = 0; angle < 360; angle += angleStep) {
      var angle1Rad = angle * Math.PI / 180;
      var angle2Rad = (angle + angleStep) * Math.PI / 180;
      
      var x1 = baseCenter[0] + radius * Math.cos(angle1Rad);
      var z1 = baseCenter[2] + radius * Math.sin(angle1Rad);
      var x2 = baseCenter[0] + radius * Math.cos(angle2Rad);
      var z2 = baseCenter[2] + radius * Math.sin(angle2Rad);
   
      verts.push(tip[0], tip[1], tip[2]);
      verts.push(x1, baseY, z1);
      verts.push(x2, baseY, z2);
    }
    
    // Base triangles
    for (var angle = 0; angle < 360; angle += angleStep) {
      var angle1Rad = angle * Math.PI / 180;
      var angle2Rad = (angle + angleStep) * Math.PI / 180;
      
      var x1 = baseCenter[0] + radius * Math.cos(angle1Rad);
      var z1 = baseCenter[2] + radius * Math.sin(angle1Rad);
      var x2 = baseCenter[0] + radius * Math.cos(angle2Rad);
      var z2 = baseCenter[2] + radius * Math.sin(angle2Rad);
      
      verts.push(baseCenter[0], baseY, baseCenter[2]);
      verts.push(x2, baseY, z2);
      verts.push(x1, baseY, z1);
    }

    this.vertices = new Float32Array(verts);
  }

  render() {
    var rgba = this.color;

    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    if (this.vertices === null) {
      this.generateVertices();
    }

    if (this.buffer === null) {
      this.buffer = gl.createBuffer();
      if (!this.buffer) {
        console.log('Failed to create the buffer object');
        return -1;
      }
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(a_Position);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
  }
}