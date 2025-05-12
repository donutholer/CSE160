class Triangle extends Geometry {
  constructor() {
    super();
    this.vertices = new Float32Array([-1.0, -1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0,
                                       1.0, -1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0,
                                       0.0,  1.0, 0.0, 1.0, 0.0, 0.0, 0.5, 1.0,]);
  }
}