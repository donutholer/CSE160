class Camera {
  constructor(canvas) {
    // Camera parameters
    this.fov = 60.0;
    this.speed = 3.0;
    this.mouseSensitivity = 0.1;
    
    // Camera vectors
    this.eye = new Vector3([0.0, 0.0, 5.0]);
    this.at = new Vector3([0.0, 0.0, 0.0]);
    this.up = new Vector3([0.0, 1.0, 0.0]);
    
    // Rotation angles
    this.yaw = -90;   // Left/right rotation
    this.pitch = 0;   // Up/down rotation
    
    // For mouse movement tracking
    this.lastX = 0;
    this.lastY = 0;
    this.firstMouse = true;

    // Initialize matrices FIRST
    this.viewMatrix = new Matrix4();  // Initialize before using
    this.projectionMatrix = new Matrix4();

    // Then update them
    this.updateView();
    this.updateProjection(canvas);
  }

  updateView() {
    if (!this.viewMatrix || !(this.viewMatrix instanceof Matrix4)) {
      console.error("viewMatrix is not properly initialized!");
      this.viewMatrix = new Matrix4();
    }
    // Calculate new front vector based on yaw and pitch
    const front = new Vector3([
        Math.cos(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180),
        Math.sin(this.pitch * Math.PI / 180),
        Math.sin(this.yaw * Math.PI / 180) * Math.cos(this.pitch * Math.PI / 180)
    ]);
    front.normalize();
    
    // Update at position based on eye and front direction
    this.at = new Vector3(this.eye.elements);
    this.at.add(front);
    
    // Now this.viewMatrix is guaranteed to exist
    this.viewMatrix.setLookAt(
        this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
        this.at.elements[0], this.at.elements[1], this.at.elements[2],
        this.up.elements[0], this.up.elements[1], this.up.elements[2]
    );
  }

  updateProjection(canvas) {
      const aspect = canvas.width / canvas.height;
      this.projectionMatrix.setPerspective(this.fov, aspect, 0.1, 5000.0);
  }

  // Add this new method for mouse movement
  onMove(xpos, ypos) {
      if (this.firstMouse) {
          this.lastX = xpos;
          this.lastY = ypos;
          this.firstMouse = false;
      }

      let xoffset = xpos - this.lastX;
      let yoffset = this.lastY - ypos; // Reversed since y-coordinates go from bottom to top
      this.lastX = xpos;
      this.lastY = ypos;

      const sensitivity = 0.1;
      xoffset *= sensitivity;
      yoffset *= sensitivity;

      this.yaw += xoffset;
      this.pitch += yoffset;

      // Constrain pitch to avoid screen flipping
      if (this.pitch > 89.0) this.pitch = 89.0;
      if (this.pitch < -89.0) this.pitch = -89.0;

      this.updateView();
  }

  // Existing movement methods remain the same...
  moveForward() {
      const f = new Vector3(this.at.elements);
      f.sub(this.eye);
      f.normalize();
      f.mul(this.speed);
      this.eye.add(f);
      this.at.add(f);
      this.updateView();
  }

  moveBackwards() {
      const b = new Vector3(this.eye.elements);
      b.sub(this.at);
      b.normalize();
      b.mul(this.speed);
      this.eye.add(b);
      this.at.add(b);
      this.updateView();
  }

  moveLeft() {
      const f = new Vector3(this.at.elements);
      f.sub(this.eye);
      const s = Vector3.cross(this.up, f);
      s.normalize();
      s.mul(this.speed);
      this.eye.add(s);
      this.at.add(s);
      this.updateView();
  }

  moveRight() {
      const f = new Vector3(this.at.elements);
      f.sub(this.eye);
      const s = Vector3.cross(this.up, f);
      s.normalize();
      s.mul(this.speed);
      this.eye.sub(s);
      this.at.sub(s);
      this.updateView();
  }

  panLeft(alpha = 5.0) {
      const f = new Vector3(this.at.elements);
      f.sub(this.eye);
      const rotMat = new Matrix4().setRotate(
          alpha,
          this.up.elements[0], this.up.elements[1], this.up.elements[2]
      );
      const f_prime = rotMat.multiplyVector3(f);
      this.at = new Vector3(this.eye.elements);
      this.at.add(f_prime);
      this.updateView();
  }

  panRight(alpha = 5.0) {
      this.panLeft(-alpha);
  }
}