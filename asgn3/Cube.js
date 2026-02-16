class Cube {
  constructor() {
    this.type = 'cube';
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();

    this.textureNum = -1;

    if (Cube.buffer === null) {
      Cube.buffer = gl.createBuffer();
      if (!Cube.buffer) {
        console.log('Failed to create cube buffer');
        return;
      }
      gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, Cube.vertices, gl.STATIC_DRAW);
    }
  }

  render() {
    var rgba = this.color;

    // Set color
    gl.uniform4f(u_baseColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Set texture vs color mode
    if (this.textureNum >= 0) {
      gl.uniform1f(u_texColorWeight, 1.0);
      gl.uniform1i(u_whichTexture, this.textureNum);
    } else {
      gl.uniform1f(u_texColorWeight, 0.0);
    }

    // Set model matrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Bind the shared buffer
    var FSIZE = Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, Cube.buffer);

    // Position attribute (3 floats, stride 5, offset 0)
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FSIZE * 5, 0);
    gl.enableVertexAttribArray(a_Position);

    // UV attribute (2 floats, stride 5, offset 3)
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FSIZE * 5, FSIZE * 3);
    gl.enableVertexAttribArray(a_TexCoord);

    // Draw (36 vertices = 12 triangles = 6 faces)
    gl.drawArrays(gl.TRIANGLES, 0, 36);
  }
}

// Shared buffer, used by all Cube instances
Cube.buffer = null;

// Vertices + UVs
Cube.vertices = new Float32Array([
  // Front face (z = 0)
  0,0,0, 0,0,  1,0,0, 1,0,  1,1,0, 1,1,
  0,0,0, 0,0,  1,1,0, 1,1,  0,1,0, 0,1,

  // Back face (z = 1)
  1,0,1, 0,0,  0,0,1, 1,0,  0,1,1, 1,1,
  1,0,1, 0,0,  0,1,1, 1,1,  1,1,1, 0,1,

  // Top face (y = 1)
  0,1,0, 0,0,  0,1,1, 0,1,  1,1,1, 1,1,
  0,1,0, 0,0,  1,1,1, 1,1,  1,1,0, 1,0,

  // Bottom face (y = 0)
  0,0,0, 0,0,  1,0,0, 1,0,  1,0,1, 1,1,
  0,0,0, 0,0,  1,0,1, 1,1,  0,0,1, 0,1,

  // Right face (x = 1)
  1,0,0, 0,0,  1,0,1, 1,0,  1,1,1, 1,1,
  1,0,0, 0,0,  1,1,1, 1,1,  1,1,0, 0,1,

  // Left face (x = 0)
  0,0,1, 0,0,  0,0,0, 1,0,  0,1,0, 1,1,
  0,0,1, 0,0,  0,1,0, 1,1,  0,1,1, 0,1,
]);