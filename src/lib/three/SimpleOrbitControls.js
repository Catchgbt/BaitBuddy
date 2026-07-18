import * as THREE from 'three';

// Leichtgewichtige Orbit-Controls ohne den three/examples-Addon-Import,
// damit der three-Chunk klein bleibt. Ursprünglich inline in ARWater3D.jsx;
// hier zentral, weil auch die 3D-Köderanimation (lures3d) sie nutzt.
export class SimpleOrbitControls {
  constructor(camera, domElement, { minDistance = 10, maxDistance = 1000 } = {}) {
    this.camera = camera;
    this.domElement = domElement;
    this.target = new THREE.Vector3();
    this.enabled = true;
    this.enableDamping = true;
    this.dampingFactor = 0.05;
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;

    this.rotateSpeed = 1.0;
    this.zoomSpeed = 1.0;

    this._state = { NONE: -1, ROTATE: 0, ZOOM: 1, PAN: 2 };
    this._currentState = this._state.NONE;

    this._rotateStart = new THREE.Vector2();
    this._rotateEnd = new THREE.Vector2();
    this._rotateDelta = new THREE.Vector2();

    this._zoomStart = new THREE.Vector2();
    this._zoomEnd = new THREE.Vector2();
    this._zoomDelta = new THREE.Vector2();

    this._spherical = new THREE.Spherical();
    this._sphericalDelta = new THREE.Spherical();

    this._scale = 1;
    this._offset = new THREE.Vector3();

    this._bindEvents();
  }

  _bindEvents() {
    this._handlers = {
      pointerdown: (e) => this._onPointerDown(e),
      pointermove: (e) => this._onPointerMove(e),
      pointerup: () => this._onPointerUp(),
      wheel: (e) => this._onWheel(e),
      contextmenu: (e) => e.preventDefault(),
    };
    this.domElement.addEventListener('pointerdown', this._handlers.pointerdown);
    this.domElement.addEventListener('pointermove', this._handlers.pointermove);
    this.domElement.addEventListener('pointerup', this._handlers.pointerup);
    this.domElement.addEventListener('wheel', this._handlers.wheel);
    this.domElement.addEventListener('contextmenu', this._handlers.contextmenu);
  }

  _onPointerDown(e) {
    if (!this.enabled) return;

    if (e.pointerType === 'touch' && e.touches && e.touches.length > 1) {
      this._currentState = this._state.ZOOM;
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      this._zoomStart.set(0, Math.sqrt(dx * dx + dy * dy));
    } else {
      this._currentState = this._state.ROTATE;
      this._rotateStart.set(e.clientX, e.clientY);
    }
  }

  _onPointerMove(e) {
    if (!this.enabled || this._currentState === this._state.NONE) return;

    if (this._currentState === this._state.ROTATE) {
      this._rotateEnd.set(e.clientX, e.clientY);
      this._rotateDelta.subVectors(this._rotateEnd, this._rotateStart).multiplyScalar(this.rotateSpeed);

      this._sphericalDelta.theta -= 2 * Math.PI * this._rotateDelta.x / this.domElement.clientHeight;
      this._sphericalDelta.phi -= 2 * Math.PI * this._rotateDelta.y / this.domElement.clientHeight;

      this._rotateStart.copy(this._rotateEnd);
    } else if (this._currentState === this._state.ZOOM && e.touches && e.touches.length > 1) {
      const dx = e.touches[0].pageX - e.touches[1].pageX;
      const dy = e.touches[0].pageY - e.touches[1].pageY;
      this._zoomEnd.set(0, Math.sqrt(dx * dx + dy * dy));
      this._zoomDelta.set(0, Math.pow(this._zoomEnd.y / this._zoomStart.y, this.zoomSpeed));
      this._scale /= this._zoomDelta.y;
      this._zoomStart.copy(this._zoomEnd);
    }
  }

  _onPointerUp() {
    this._currentState = this._state.NONE;
  }

  _onWheel(e) {
    if (!this.enabled) return;
    e.preventDefault();

    if (e.deltaY < 0) {
      this._scale /= 0.95;
    } else if (e.deltaY > 0) {
      this._scale *= 0.95;
    }
  }

  update() {
    if (!this.enabled) return;

    this._offset.copy(this.camera.position).sub(this.target);
    this._spherical.setFromVector3(this._offset);

    if (this.enableDamping) {
      this._spherical.theta += this._sphericalDelta.theta * this.dampingFactor;
      this._spherical.phi += this._sphericalDelta.phi * this.dampingFactor;
      this._sphericalDelta.theta *= (1 - this.dampingFactor);
      this._sphericalDelta.phi *= (1 - this.dampingFactor);
    } else {
      this._spherical.theta += this._sphericalDelta.theta;
      this._spherical.phi += this._sphericalDelta.phi;
      this._sphericalDelta.set(0, 0, 0);
    }

    this._spherical.radius *= this._scale;
    this._spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this._spherical.radius));

    if (this.enableDamping) {
      this._scale = 1 + (this._scale - 1) * (1 - this.dampingFactor);
    } else {
      this._scale = 1;
    }

    this._spherical.makeSafe();
    this._offset.setFromSpherical(this._spherical);
    this.camera.position.copy(this.target).add(this._offset);
    this.camera.lookAt(this.target);
  }

  dispose() {
    this.enabled = false;
    if (this._handlers) {
      this.domElement.removeEventListener('pointerdown', this._handlers.pointerdown);
      this.domElement.removeEventListener('pointermove', this._handlers.pointermove);
      this.domElement.removeEventListener('pointerup', this._handlers.pointerup);
      this.domElement.removeEventListener('wheel', this._handlers.wheel);
      this.domElement.removeEventListener('contextmenu', this._handlers.contextmenu);
    }
  }
}

export default SimpleOrbitControls;
