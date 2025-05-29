class Geometry {
    constructor() {
        this.vertices = null;
        this.modelMatrix = new Matrix4();
        this.translationMatrix = new Matrix4();
        this.rotationZMatrix = new Matrix4();
        this.scaleMatrix = new Matrix4();
    }
    scale(x, y, z) {
        this.scaleMatrix.setScale(x, y, z);
    }
}