class Cube {
    constructor() {
      this.matrix     = new Matrix4();
      this.color      = [1,1,1,1];
      this.faceColors = null;
      this.textureNum = -2;

      this.vertices = new Float32Array([
        // front (+Z)
        0,0,1,  1,0,1,  1,1,1,   0,0,1,  1,1,1,  0,1,1,
        // back (-Z)
        1,0,0,  0,0,0,  0,1,0,   1,0,0,  0,1,0,  1,1,0,
        // right (+X)
        1,0,1,  1,0,0,  1,1,0,   1,0,1,  1,1,0,  1,1,1,
        // left (-X)
        0,0,0,  0,0,1,  0,1,1,   0,0,0,  0,1,1,  0,1,0,
        // top (+Y)
        0,1,1,  1,1,1,  1,1,0,   0,1,1,  1,1,0,  0,1,0,
        // bottom (-Y)
        0,0,0,  1,0,0,  1,0,1,   0,0,0,  1,0,1,  0,0,1,
      ]);
  
      const faceUV = [0,0, 1,0, 1,1,  0,0, 1,1, 0,1];
      this.uvs = new Float32Array([
        ...faceUV, ...faceUV, ...faceUV,
        ...faceUV, ...faceUV, ...faceUV,
      ]);
  
      const faceNormalsData = [
        [ 0,  0,  1],  // front
        [ 0,  0, -1],  // back
        [ 1,  0,  0],  // right
        [-1,  0,  0],  // left
        [ 0,  1,  0],  // top
        [ 0, -1,  0],  // bottom
      ];
      let norms = [];
      faceNormalsData.forEach(n => {
        for (let i = 0; i < 6; i++) norms.push(...n);
      });
      this.normals = new Float32Array(norms);
  
      this.vertexBuffer = gl.createBuffer();
      if (!this.vertexBuffer) { console.error('Failed to create the vertex buffer object'); return -1; }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
  
      this.uvBuffer = gl.createBuffer();
      if (!this.uvBuffer) { console.error('Failed to create the UV buffer object'); return -1; }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
  
      this.normalBuffer = gl.createBuffer();
      if (!this.normalBuffer) { console.error('Failed to create the normal buffer object'); return -1; }
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    }
  
    render() {
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
      gl.uniform1i(u_whichTexture, this.textureNum);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
  

      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
  

      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
  
      if (this.faceColors && Array.isArray(this.faceColors) && this.faceColors.length === 6) {
        
        for (let i = 0; i < 6; i++) {
          gl.uniform4fv(u_FragColor, this.faceColors[i]);
          gl.drawArrays(gl.TRIANGLES, i * 6, 6);
        }
      } else {
        gl.uniform4fv(u_FragColor, this.color);
        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
      }
    }
}