class Circle {
  constructor(x, y, color, size, segments = 10) {
    this.type = 'circle';
    this.position = [x, y];
    this.color = color;
    this.size = size;
    this.segments = segments;
  }
  render() {
    const x = this.position[0];
    const y = this.position[1];
    const radius = 0.01 * this.size;

    const vertices = [];
    // center
    vertices.push(x, y);
    // ring
    for (let i = 0; i <= this.segments; i++) {
      let angle = (i * 2.0 * Math.PI) / this.segments;
      let rx = x + radius * Math.cos(angle);
      let ry = y + radius * Math.sin(angle);
      vertices.push(rx, ry);
    }

    const buf = gl.createBuffer();


    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    //gl.uniform1f(u_Size, 1.0);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], 1.0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, vertices.length / 2);
  }
}
