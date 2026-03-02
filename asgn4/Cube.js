class Cube {
  constructor() {
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;  // -1 = use color, 0 = tex0, 1 = tex1

    if (Cube.buffer === null) {
      Cube.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.verts, gl.STATIC_DRAW);
    }
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // normal matrix = transpose of inverse of model matrix
    var nm = new Matrix4().setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    var FS = Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FS * 8, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FS * 8, FS * 3);
    gl.enableVertexAttribArray(a_TexCoord);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FS * 8, FS * 5);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

Cube.buffer = null;

Cube.verts = new Float32Array([
  // Front face (z=0) normal (0, 0, -1)
  0,0,0, 0,0, 0,0,-1,
  1,0,0, 1,0, 0,0,-1,
  1,1,0, 1,1, 0,0,-1,
  0,0,0, 0,0, 0,0,-1,
  1,1,0, 1,1, 0,0,-1,
  0,1,0, 0,1, 0,0,-1,

  // Back face (z=1) normal (0, 0, 1)
  1,0,1, 0,0, 0,0,1,
  0,0,1, 1,0, 0,0,1,
  0,1,1, 1,1, 0,0,1,
  1,0,1, 0,0, 0,0,1,
  0,1,1, 1,1, 0,0,1,
  1,1,1, 0,1, 0,0,1,

  // Top face (y=1) normal (0, 1, 0)
  0,1,0, 0,0, 0,1,0,
  0,1,1, 0,1, 0,1,0,
  1,1,1, 1,1, 0,1,0,
  0,1,0, 0,0, 0,1,0,
  1,1,1, 1,1, 0,1,0,
  1,1,0, 1,0, 0,1,0,

  // Bottom face (y=0) normal (0, -1, 0)
  0,0,1, 0,0, 0,-1,0,
  0,0,0, 0,1, 0,-1,0,
  1,0,0, 1,1, 0,-1,0,
  0,0,1, 0,0, 0,-1,0,
  1,0,0, 1,1, 0,-1,0,
  1,0,1, 1,0, 0,-1,0,

  // Right face (x=1) normal (1, 0, 0)
  1,0,0, 0,0, 1,0,0,
  1,0,1, 1,0, 1,0,0,
  1,1,1, 1,1, 1,0,0,
  1,0,0, 0,0, 1,0,0,
  1,1,1, 1,1, 1,0,0,
  1,1,0, 0,1, 1,0,0,

  // Left face (x=0) normal (-1, 0, 0)
  0,0,1, 0,0, -1,0,0,
  0,0,0, 1,0, -1,0,0,
  0,1,0, 1,1, -1,0,0,
  0,0,1, 0,0, -1,0,0,
  0,1,0, 1,1, -1,0,0,
  0,1,1, 0,1, -1,0,0,
]);
