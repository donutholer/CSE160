class Camera {
    constructor() {
        this.canvas = document.getElementById('webgl');
        this.fov = 60;
        this.eye = new Vector3([0, 0, -3]);
        this.at = new Vector3([0, 0, -1]);
        this.up = new Vector3([0, 1, 0]);
        this.speed = 0.1;
        this.alpha = 2;

        this.viewMatrix = new Matrix4();
        this.updateView();

        this.projectionMatrix = new Matrix4();
        this.projectionMatrix.setPerspective(
            this.fov,
            this.canvas.width / this.canvas.height,
            0.1,
            1000
        );
    }

    updateView() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0],
            this.eye.elements[1],
            this.eye.elements[2],
            this.at.elements[0],
            this.at.elements[1],
            this.at.elements[2],
            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );
    }

    updateProjection() {
        let x = this.eye.elements[0];
        let y = this.eye.elements[1];
        let z = this.eye.elements[2];
        let distance = Math.sqrt(x * x + y * y + z * z);
        let far = Math.max(100, distance * 2);
        this.projectionMatrix.setPerspective(
            this.fov,
            this.canvas.width / this.canvas.height,
            0.1,
            far
        );
    }

    moveForward() {
        let f = new Vector3(this.at.elements);
        f.sub(this.eye);

        f.normalize();

        f.mul(this.speed);

        this.eye.add(f);
        this.at.add(f);

        this.updateView();
        this.updateProjection();
    }

    moveBackwards() {
        let b = new Vector3(this.eye.elements);
        b.sub(this.at);

        b.normalize();

        b.mul(this.speed);

        this.eye.add(b);
        this.at.add(b);

        this.updateView();
        this.updateProjection();
    }

    moveLeft() {
        let f = new Vector3(this.at.elements);
        f.sub(this.eye);

        let s = Vector3.cross(this.up, f);
        s.normalize();

        s.mul(this.speed);

        this.eye.add(s);
        this.at.add(s);

        this.updateView();
        this.updateProjection();
    }

    moveRight() {
        let f = new Vector3(this.at.elements);
        f.sub(this.eye);

        let s = Vector3.cross(this.up, f);
        s.normalize();

        s.mul(this.speed);

        this.eye.sub(s);
        this.at.sub(s);

        this.updateView();
        this.updateProjection();
    }

    panLeft() {
        let f = new Vector3(this.at.elements);
        f.sub(this.eye);

        let rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(
            this.alpha,
            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );

        let f_prime = rotationMatrix.multiplyVector3(f);

        this.at = new Vector3(this.eye.elements);
        this.at.add(f_prime);

        this.updateView();
        this.updateProjection();
    }

    panRight() {
        let f = new Vector3(this.at.elements);
        f.sub(this.eye);

        let rotationMatrix = new Matrix4();
        rotationMatrix.setRotate(
            -1 * this.alpha,
            this.up.elements[0],
            this.up.elements[1],
            this.up.elements[2]
        );

        let f_prime = rotationMatrix.multiplyVector3(f);

        this.at = new Vector3(this.eye.elements);
        this.at.add(f_prime);

        this.updateView();
        this.updateProjection();
    }
}