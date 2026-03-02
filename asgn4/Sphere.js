class Sphere {
  constructor() {
    this.color      = [1.0, 1.0, 1.0, 1.0];
    this.matrix     = new Matrix4();
    this.textureNum = -1;

    if (Sphere.buffer === null) {
      var data = Sphere.buildVerts(20, 20);
      Sphere.vertCount = data.length / 8;

      Sphere.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    }
  }

  static buildVerts(rows, cols) {
    var verts = [];

    for (var r = 0; r < rows; r++) {
      var theta0 = (r / rows) * Math.PI;
      var theta1 = ((r + 1) / rows) * Math.PI;

      for (var c = 0; c < cols; c++) {
        var phi0 = (c / cols) * 2 * Math.PI;
        var phi1 = ((c + 1) / cols) * 2 * Math.PI;

        // four corners of this quad patch
        var corners = [
          Sphere.calcPoint(theta0, phi0),
          Sphere.calcPoint(theta1, phi0),
          Sphere.calcPoint(theta1, phi1),
          Sphere.calcPoint(theta0, phi1),
        ];

        var tris = [[0,1,2], [0,2,3]];
        for (var t = 0; t < 2; t++) {
          for (var k = 0; k < 3; k++) {
            var v = corners[tris[t][k]];
            verts.push(v[0], v[1], v[2]);
            verts.push((c + (k === 2 ? 1 : 0)) / cols, (r + (t === 1 && k === 0 ? 0 : k > 0 ? 0.5 : 0)) / rows);
            verts.push(v[0], v[1], v[2]);
          }
        }
      }
    }

    return new Float32Array(verts);
  }

  static calcPoint(theta, phi) {
    return [
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi),
    ];
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var nm = new Matrix4().setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    var FS = Float32Array.BYTES_PER_ELEMENT;
    gl.bindBuffer(gl.ARRAY_BUFFER, Sphere.buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, FS * 8, 0);
    gl.enableVertexAttribArray(a_Position);
    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, FS * 8, FS * 3);
    gl.enableVertexAttribArray(a_TexCoord);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, FS * 8, FS * 5);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, Sphere.vertCount);
  }
}

Sphere.buffer   = null;
Sphere.vertCount = 0;
