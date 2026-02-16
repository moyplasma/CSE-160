class Camera {
  constructor(canvas) {
    this.fov = 60;
    this.eyeHeight = 1.5;
    this.speed = 0.3;
    this.radius = 0.25;

    // Start position
    this.eye = new Vector3([15.5, this.eyeHeight, 9.5]);
    this.at  = new Vector3([15.5, this.eyeHeight, 8.5]);
    this.up  = new Vector3([0, 1, 0]);

    this.yaw   = 0;
    this.pitch  = 0;

    this.viewMatrix       = new Matrix4();
    this.projectionMatrix = new Matrix4();
    this.projectionMatrix.setPerspective(this.fov, canvas.width / canvas.height, 0.1, 1000);

    this.rebuildAt();
  }

  // Helper: update "at" based on yaw/pitch, and recalculate view matrix
  rebuildAt() {
    var yr = this.yaw * Math.PI / 180;
    var pr = this.pitch * Math.PI / 180;
    this.at.elements[0] = this.eye.elements[0] + Math.sin(yr) * Math.cos(pr);
    this.at.elements[1] = this.eye.elements[1] + Math.sin(pr);
    this.at.elements[2] = this.eye.elements[2] - Math.cos(yr) * Math.cos(pr);
    var e = this.eye.elements, a = this.at.elements, u = this.up.elements;
    this.viewMatrix.setLookAt(e[0],e[1],e[2], a[0],a[1],a[2], u[0],u[1],u[2]);
  }

  // Collision for walls, with radius. Checks if all 4 corners are open.
  canMoveTo(nx, nz) {
    var r = this.radius;
    var corners = [[nx-r,nz-r],[nx+r,nz-r],[nx-r,nz+r],[nx+r,nz+r]];
    for (var i = 0; i < 4; i++) {
      var gx = Math.floor(corners[i][0]);
      var gz = Math.floor(corners[i][1]);
      if (gx < 0 || gx >= 32 || gz < 0 || gz >= 32) return false;
      if (g_map[gx][gz] > 0) return false;
    }
    return true;
  }

  // Helper: try to move by (dx,dz)
  tryMove(dx, dz) {
    var cx = this.eye.elements[0], cz = this.eye.elements[2];
    if      (this.canMoveTo(cx+dx, cz+dz)) { this.eye.elements[0]+=dx; this.eye.elements[2]+=dz; }
    else if (this.canMoveTo(cx+dx, cz))     { this.eye.elements[0]+=dx; }
    else if (this.canMoveTo(cx, cz+dz))     { this.eye.elements[2]+=dz; }
    this.eye.elements[1] = this.eyeHeight;
    this.rebuildAt();
  }

  // Movement
  moveForward()   { var yr=this.yaw*Math.PI/180; this.tryMove( Math.sin(yr)*this.speed, -Math.cos(yr)*this.speed); }
  moveBackwards() { var yr=this.yaw*Math.PI/180; this.tryMove(-Math.sin(yr)*this.speed,  Math.cos(yr)*this.speed); }
  moveLeft()      { var yr=(this.yaw-90)*Math.PI/180; this.tryMove(Math.sin(yr)*this.speed, -Math.cos(yr)*this.speed); }
  moveRight()     { var yr=(this.yaw+90)*Math.PI/180; this.tryMove(Math.sin(yr)*this.speed, -Math.cos(yr)*this.speed); }

  // Rotation
  panLeft(deg)  { this.yaw -= (deg !== undefined ? deg : 5); this.rebuildAt(); }
  panRight(deg) { this.yaw += (deg !== undefined ? deg : 5); this.rebuildAt(); }
  panVertical(deg) {
    this.pitch += deg;
    if (this.pitch > 75)  this.pitch = 75;
    if (this.pitch < -75) this.pitch = -75;
    this.rebuildAt();
  }

  // Minecraft: get block coordinates in front of camera
  getBlockInFront() {
    var yr = this.yaw * Math.PI / 180;
    return [Math.floor(this.eye.elements[0] + Math.sin(yr)*2.5),
            Math.floor(this.eye.elements[2] - Math.cos(yr)*2.5)];
  }
}
