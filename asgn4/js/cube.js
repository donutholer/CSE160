// cube.js
class Cube {
    constructor() {
      this.matrix     = new Matrix4();
      this.color      = [1,1,1,1];
      this.textureNum = -2;  // flat‐shade fallback
  
      // 1) vertex data
      this.vertices = new Float32Array([
        // front (+Z)
        0,0,1,  1,0,1,  1,1,1,   0,0,1,  1,1,1,  0,1,1,
        // back (−Z)
        1,0,0,  0,0,0,  0,1,0,   1,0,0,  0,1,0,  1,1,0,
        // right (+X)
        1,0,1,  1,0,0,  1,1,0,   1,0,1,  1,1,0,  1,1,1,
        // left (−X)
        0,0,0,  0,0,1,  0,1,1,   0,0,0,  0,1,1,  0,1,0,
        // top (+Y)
        0,1,1,  1,1,1,  1,1,0,   0,1,1,  1,1,0,  0,1,0,
        // bottom (−Y)
        0,0,0,  1,0,0,  1,0,1,   0,0,0,  1,0,1,  0,0,1,
      ]);
  
      // 2) UVs
      const faceUV = [0,0, 1,0, 1,1,  0,0, 1,1, 0,1];
      this.uvs = new Float32Array([
        ...faceUV, ...faceUV, ...faceUV,
        ...faceUV, ...faceUV, ...faceUV,
      ]);
  
      // 3) normals matching the above order
      const faceNormals = [
        [ 0,  0,  1],  // front
        [ 0,  0, -1],  // back
        [ 1,  0,  0],  // right
        [-1,  0,  0],  // left
        [ 0,  1,  0],  // top
        [ 0, -1,  0],  // bottom
      ];
      let norms = [];
      faceNormals.forEach(n => {
        for (let i = 0; i < 6; i++) norms.push(...n);
      });
      this.normals = new Float32Array(norms);
  
      // 4) create & fill buffers ONCE
      this.vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
  
      this.uvBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
  
      this.normalBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
    }
  
    render() {
      // uniforms
      gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
      gl.uniform1i(u_whichTexture, this.textureNum);
      gl.uniform4fv(u_FragColor, this.color);
  
      // bind & enable once per frame
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Position);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
      gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_UV);
  
      gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
      gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(a_Normal);
  
      // draw all 36 verts
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
  }
  