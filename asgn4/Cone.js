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
    var baseCenter = [0.5, 0.0, 0.5];
    var radius = 0.5;
    var h = 1.0;

    var angleStep = 360 / this.segments;

    // Side triangles
    for (var angle = 0; angle < 360; angle += angleStep) {
      var a1 = angle * Math.PI / 180;
      var a2 = (angle + angleStep) * Math.PI / 180;

      var x1 = baseCenter[0] + radius * Math.cos(a1);
      var z1 = baseCenter[2] + radius * Math.sin(a1);
      var x2 = baseCenter[0] + radius * Math.cos(a2);
      var z2 = baseCenter[2] + radius * Math.sin(a2);

      // outward normals on the cone surface
      var nx1 = h * Math.cos(a1), nz1 = h * Math.sin(a1);
      var nx2 = h * Math.cos(a2), nz2 = h * Math.sin(a2);
      var ny = radius;

      // tip, base1, base2  (x y z  u v  nx ny nz)
      verts.push(tip[0], tip[1], tip[2],       0.5, 1.0,  (nx1+nx2)*0.5, ny, (nz1+nz2)*0.5);
      verts.push(x1,     0,      z1,            0.0, 0.0,  nx1, ny, nz1);
      verts.push(x2,     0,      z2,            1.0, 0.0,  nx2, ny, nz2);
    }

    // Base triangles
    for (var angle = 0; angle < 360; angle += angleStep) {
      var a1 = angle * Math.PI / 180;
      var a2 = (angle + angleStep) * Math.PI / 180;

      var x1 = baseCenter[0] + radius * Math.cos(a1);
      var z1 = baseCenter[2] + radius * Math.sin(a1);
      var x2 = baseCenter[0] + radius * Math.cos(a2);
      var z2 = baseCenter[2] + radius * Math.sin(a2);

      verts.push(baseCenter[0], 0, baseCenter[2],  0.5, 0.5,  0, -1, 0);
      verts.push(x2,            0, z2,             0.0, 0.0,  0, -1, 0);
      verts.push(x1,            0, z1,             1.0, 0.0,  0, -1, 0);
    }

    this.vertices = new Float32Array(verts);
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniform1i(u_whichTexture, -1);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // normal matrix
    var nm = new Matrix4().setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

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

    var FSIZE = this.vertices.BYTES_PER_ELEMENT;

    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 8, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 8, FSIZE * 3);
    gl.enableVertexAttribArray(a_TexCoord);

    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FSIZE * 8, FSIZE * 5);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 8);
  }
}
