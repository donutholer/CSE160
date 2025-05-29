function drawTriangle3DUVNormal(vertices, uv, normals) {
  const n = 3;

  // — position buffer —
  const vbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Position);

  // — uv buffer —
  const uvbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_UV);

  // — normal buffer —
  const nbuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_Normal);

  // — draw —
  gl.drawArrays(gl.TRIANGLES, 0, n);
}

// ————————————————————————————————————————————————————————
// Triangle class (optional — you only need this if you want to
// render standalone triangles the same way as cubes do)
//————————————————————————————————————————————————————————
class Triangle {
  /**
   * p0,p1,p2 – each [x,y,z]
   * uv0,uv1,uv2 – each [u,v]
   * color – [r,g,b,a]
   */
  constructor(p0, p1, p2, uv0, uv1, uv2, color = [1,1,1,1]) {
    this.matrix     = new Matrix4();
    this.color      = color;
    this.textureNum = -2;             // force flat‐shade
    this.vertices   = [...p0, ...p1, ...p2];
    this.uv         = [...uv0, ...uv1, ...uv2];
    // all three normals the same for a flat triangle
    this.normals    = [0,0,1,  0,0,1,  0,0,1];
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform1i(u_whichTexture, this.textureNum);
    drawTriangle3DUVNormal(this.vertices, this.uv, this.normals);
  }
}
