class Square {
  constructor(x, y, color, size) {
    this.type = 'square';
    this.position = [x, y];
    this.color = color;
    this.size = size;
  }
  render() {
    gl.disableVertexAttribArray(a_Position);
    gl.vertexAttrib3f(a_Position, this.position[0], this.position[1], 0.0);
    gl.uniform1f(u_Size, this.size);
    gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], 1.0);
    gl.drawArrays(gl.POINTS, 0, 1);
  }
}
