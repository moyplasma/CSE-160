class Cube{
  constructor() {
    this.type='cube';
    this.color = [1.0, 1.0, 1.0, 1.0]
    this.matrix = new Matrix4();

    this.buffer = null;
    this.vertices = new Float32Array([
      // Front face (z = 0)
      0,0,0,  1,1,0,  1,0,0,
      0,0,0,  0,1,0,  1,1,0,
      
      // Back face (z = 1)
      0,0,1,  1,0,1,  1,1,1,
      0,0,1,  1,1,1,  0,1,1,
      
      // Top face (y = 1)
      0,1,0,  0,1,1,  1,1,1,
      0,1,0,  1,1,1,  1,1,0,
      
      // Bottom face (y = 0)
      0,0,0,  1,0,0,  1,0,1,
      0,0,0,  1,0,1,  0,0,1,
      
      // Right face (x = 1)
      1,0,0,  1,1,0,  1,1,1,
      1,0,0,  1,1,1,  1,0,1,
      
      // Left face (x = 0)
      0,0,0,  0,0,1,  0,1,1,
      0,0,0,  0,1,1,  0,1,0
    ]);
  }

  render() {
    var rgba = this.color;

    // Pass the color of a point to u_FragColor variable
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements)

    // Generate vertices if not done yet
    if (this.vertices === null) {
      this.generateVertices();
    }

    // Create buffer if not done yet
    if (this.buffer === null) {
      this.buffer = gl.createBuffer();
      if (!this.buffer) {
        console.log('Failed to create the buffer object');
        return -1;
      }
    }

    // Bind the buffer object to target
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    // Write data into the buffer object
    gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);

    // Assign the buffer object to a_Position variable
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);

    // Enable the assignment to a_Position variable
    gl.enableVertexAttribArray(a_Position);

    // Draw the cube (36 vertices = 12 triangles)
    gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);

    // Before optimizing with buffer:
    
    // // Draw front of cube
    // drawTriangle3D( [0,0,0,  1,1,0,  1,0,0] );
    // drawTriangle3D( [0,0,0,  0,1,0,  1,1,0] );

    // // Pass the color of a point to u_FragColor variable
    // gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    //  // Draw top of cube
    // drawTriangle3D( [0,1,0,  0,1,1,  1,1,1] );
    // drawTriangle3D( [0,1,0,  1,1,1,  1,1,0] );

    // gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    // // draw left side of cube
    // drawTriangle3D( [0,0,0,  0,0,1,  0,1,1] );
    // drawTriangle3D( [0,0,0,  0,1,1,  0,1,0] );

    // gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    // // draw right side of cube
    // drawTriangle3D( [1,0,0,  1,1,1,  1,0,1] );
    // drawTriangle3D( [1,0,0,  1,1,0,  1,1,1] );

    // gl.uniform4f(u_FragColor, rgba[0]*0.9, rgba[1]*0.9, rgba[2]*0.9, rgba[3]);
    // // draw bottom of cube
    // drawTriangle3D( [0,0,1,  1,0,1,  1,1,1] );
    // drawTriangle3D( [0,0,1,  1,1,1,  0,1,1] );

    // gl.uniform4f(u_FragColor, rgba[0]*0.8, rgba[1]*0.8, rgba[2]*0.8, rgba[3]);
    // // draw back of cube
    // drawTriangle3D( [0,0,0,  1,0,1,  0,0,1] );
    // drawTriangle3D( [0,0,0,  1,0,0,  1,0,1] );

  }
}