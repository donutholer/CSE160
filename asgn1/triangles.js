class Triangle {
  constructor(x, y, color, size) {
    this.type = 'triangle';
    this.position = [x, y];
    this.color = color;
    this.size = size;
  }
  render() {
    const halfSide = 0.1 * (this.size / 10.0);
    const x = this.position[0];
    const y = this.position[1];

    const vertices = [
      x,             y + halfSide,
      x - halfSide,  y - halfSide,
      x + halfSide,  y - halfSide,
    ];

    const buf = gl.createBuffer();


    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    gl.uniform1f(u_Size, 1.0);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], 1.0);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
