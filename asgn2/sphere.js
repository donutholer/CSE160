class Sphere {
  constructor(latBands = 24, longBands = 24, radius = 0.3) {
    this.type  = 'sphere';
    this.color = [0.3, 0.7, 1.0, 1.0];
    this.matrix = new Matrix4();
    this.verts  = [];
    this.latBands = latBands;
    this.longBands = longBands;
    this.radius = radius;
    this.initVertices();
  }

  initVertices() {
    const r = this.radius;
    for (let lat = 0; lat <= this.latBands; ++lat) {
      const θ = lat * Math.PI / this.latBands;
      const sinθ = Math.sin(θ), cosθ = Math.cos(θ);

      for (let lon = 0; lon <= this.longBands; ++lon) {
        const φ = lon * 2 * Math.PI / this.longBands;
        const sinφ = Math.sin(φ), cosφ = Math.cos(φ);

        const x = r * cosφ * sinθ;
        const y = r * cosθ;
        const z = r * sinφ * sinθ;
        this.verts.push(x, y, z);
      }
    }
    this.indices = [];
    for (let lat = 0; lat < this.latBands; ++lat) {
      for (let lon = 0; lon < this.longBands; ++lon) {
        const first  =  lat      * (this.longBands + 1) + lon;
        const second = (lat + 1) * (this.longBands + 1) + lon;
        this.indices.push(first, second, first + 1);
        this.indices.push(second, second + 1, first + 1);
      }
    }
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.verts), gl.STATIC_DRAW);

    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(this.indices), gl.STATIC_DRAW);
  }

  render() {
    gl.uniform4fv(u_FragColor, this.color);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);
  }
}
