// camera.js
// Define Camera globally; depends on Vector3 & Matrix4

class Camera {
    constructor(canvas) {
      // Camera parameters
      this.fov   = 60.0;
      this.speed = 0.2;
  
      // Place camera back at z=5 looking at origin
      this.eye = new Vector3([0.0, 0.0, 5.0]);
      this.at  = new Vector3([0.0, 0.0, 0.0]);
      this.up  = new Vector3([0.0, 1.0, 0.0]);
  
      // Build view matrix
      this.viewMatrix = new Matrix4();
      this.viewMatrix.setLookAt(
        this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
        this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
        this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
      );
  
      // Build projection matrix
      this.projectionMatrix = new Matrix4();
      const aspect = canvas.width / canvas.height;
      this.projectionMatrix.setPerspective(
        this.fov, aspect, 0.1, 100.0
      );
    }
  
    updateView() {
      this.viewMatrix.setLookAt(
        this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
        this.at.elements[0],  this.at.elements[1],  this.at.elements[2],
        this.up.elements[0],  this.up.elements[1],  this.up.elements[2]
      );
    }
  
    // movement methods unchanged
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
        // 1) build forward vector f = at − eye
        const f = new Vector3(this.at.elements);
        f.sub(this.eye);
      
        // 2) make a rotation matrix around up
        const rotMat = new Matrix4().setRotate(
          alpha,
          this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
      
        // 3) apply it, *capturing* the result*
        const f_prime = rotMat.multiplyVector3(f);
      
        // 4) set at = eye + f_prime
        this.at = new Vector3(this.eye.elements);
        this.at.add(f_prime);
      
        this.updateView();
      }
      
  
    panRight(alpha = 5.0) {
      this.panLeft(-alpha);
    }
  }
  