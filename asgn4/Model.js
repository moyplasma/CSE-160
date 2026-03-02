class Model {
  constructor(filePath) {
    this.filePath = filePath;
    this.color = [1.0, 1.0, 1.0, 1.0];
    this.matrix = new Matrix4();

    this.vertices = null;
    this.normals = null;
    this.vertCount = 0;
    this.isLoaded = false;

    this.vertexBuffer = null;
    this.normalBuffer = null;

    this.getFileContent();
  }

  parseModel(fileContent) {
    var lines = fileContent.split('\n');
    var allVertices = [];
    var allNormals = [];
    var unpackedVertices = [];
    var unpackedNormals = [];

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var tokens = line.trim().split(/\s+/);

      if (tokens[0] == 'v') {
        allVertices.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] == 'vn') {
        allNormals.push(parseFloat(tokens[1]), parseFloat(tokens[2]), parseFloat(tokens[3]));
      } else if (tokens[0] == 'f') {
        for (var j = 1; j <= 3; j++) {
          var parts = tokens[j].split('/');
          var vi = (parseInt(parts[0]) - 1) * 3;
          var ni = (parseInt(parts[parts.length - 1]) - 1) * 3;

          unpackedVertices.push(allVertices[vi], allVertices[vi+1], allVertices[vi+2]);

          if (allNormals.length > 0) {
            unpackedNormals.push(allNormals[ni], allNormals[ni+1], allNormals[ni+2]);
          } else {
            unpackedNormals.push(0, 1, 0);
          }
        }
      }
    }

    this.vertCount = unpackedVertices.length / 3;

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedVertices), gl.STATIC_DRAW);

    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(unpackedNormals), gl.STATIC_DRAW);

    this.isLoaded = true;
    console.log('Loaded', this.filePath, '-', this.vertCount, 'vertices');
  }

  render() {
    if (!this.isLoaded) return;

    gl.uniform4fv(u_FragColor, this.color);
    gl.uniform1i(u_whichTexture, -1);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    var nm = new Matrix4().setInverseOf(this.matrix);
    nm.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, nm.elements);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.vertexAttribPointer(a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_TexCoord);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(gl.TRIANGLES, 0, this.vertCount);
  }

  async getFileContent() {
    try {
      const response = await fetch(this.filePath);
      if (!response.ok) throw new Error(`Could not load file "${this.filePath}". Are you sure the file name/path are correct?`);

      const fileContent = await response.text();
      this.parseModel(fileContent);
    } catch (e) {
      throw new Error(`Something went wrong when loading ${this.filePath}. Error: ${e}`);
    }
  }
}

