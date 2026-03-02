class Camera {
  constructor(canvas) {
    this.fov    = 60;
    this.speed  = 0.15;

    // start pos
    this.eye = new Vector3([16, 2, 22]);
    this.at  = new Vector3([16, 1.5, 16]);
    this.up  = new Vector3([0, 1, 0]);

    this.yaw   = 0;
    this.pitch = 0;

    this.viewMatrix = new Matrix4();
    this.projMatrix = new Matrix4();
    this.projMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 500);

    this.rebuildAt();
  }

  rebuildAt() {
    var yr = this.yaw   * Math.PI / 180;
    var pr = this.pitch * Math.PI / 180;
    var e  = this.eye.elements;

    this.at.elements[0] = e[0] + Math.sin(yr) * Math.cos(pr);
    this.at.elements[1] = e[1] + Math.sin(pr);
    this.at.elements[2] = e[2] - Math.cos(yr) * Math.cos(pr);

    var a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0], e[1], e[2], a[0], a[1], a[2], u[0], u[1], u[2]);
  }

  moveForward()   { var yr = this.yaw * Math.PI / 180; this._move( Math.sin(yr), -Math.cos(yr)); }
  moveBackwards() { var yr = this.yaw * Math.PI / 180; this._move(-Math.sin(yr),  Math.cos(yr)); }
  moveLeft()      { var yr = (this.yaw - 90) * Math.PI / 180; this._move(Math.sin(yr), -Math.cos(yr)); }
  moveRight()     { var yr = (this.yaw + 90) * Math.PI / 180; this._move(Math.sin(yr), -Math.cos(yr)); }

  _move(dx, dz) {
    this.eye.elements[0] += dx * this.speed;
    this.eye.elements[2] += dz * this.speed;
    this.rebuildAt();
  }

  panLeft(deg)  { this.yaw -= (deg !== undefined ? deg : 5); this.rebuildAt(); }
  panRight(deg) { this.yaw += (deg !== undefined ? deg : 5); this.rebuildAt(); }
  panVertical(deg) {
    this.pitch = Math.max(-75, Math.min(75, this.pitch + deg));
    this.rebuildAt();
  }

  getEyePos() {
    return this.eye.elements;
  }
}
