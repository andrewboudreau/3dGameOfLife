/**
 * Camera Controller for 3D Game of Life
 * Smooth orbital camera with auto-rotate.
 */

export class CameraController {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.autoOrbit = true;
        this.orbitSpeed = 0.15;
        this.center = new BABYLON.Vector3(25, 25, 25);

        this.initCamera();
    }

    initCamera() {
        // ArcRotateCamera for smooth orbital controls
        this.camera = new BABYLON.ArcRotateCamera(
            'camera',
            Math.PI / 4,      // Alpha (horizontal angle)
            Math.PI / 3,      // Beta (vertical angle)
            100,              // Radius
            this.center,
            this.scene
        );

        // Limits
        this.camera.lowerRadiusLimit = 20;
        this.camera.upperRadiusLimit = 300;
        this.camera.lowerBetaLimit = 0.1;
        this.camera.upperBetaLimit = Math.PI - 0.1;

        // Smooth movement
        this.camera.inertia = 0.85;
        this.camera.panningInertia = 0.85;

        // Wheel zoom speed
        this.camera.wheelPrecision = 20;

        // Touch/mouse controls
        this.camera.attachControl(this.canvas, true);

        // Keyboard zoom
        this.setupKeyboardControls();
    }

    setupKeyboardControls() {
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            const zoomSpeed = 5;
            switch (e.key) {
                case '=':
                case '+':
                    this.camera.radius = Math.max(
                        this.camera.lowerRadiusLimit,
                        this.camera.radius - zoomSpeed
                    );
                    break;
                case '-':
                case '_':
                    this.camera.radius = Math.min(
                        this.camera.upperRadiusLimit,
                        this.camera.radius + zoomSpeed
                    );
                    break;
                case 'w':
                case 'W':
                    this.camera.radius = Math.max(
                        this.camera.lowerRadiusLimit,
                        this.camera.radius - zoomSpeed
                    );
                    break;
                case 's':
                case 'S':
                    this.camera.radius = Math.min(
                        this.camera.upperRadiusLimit,
                        this.camera.radius + zoomSpeed
                    );
                    break;
                case 'a':
                case 'A':
                    if (!this.autoOrbit) {
                        this.camera.alpha += 0.1;
                    }
                    break;
                case 'd':
                case 'D':
                    if (!this.autoOrbit) {
                        this.camera.alpha -= 0.1;
                    }
                    break;
            }
        });
    }

    setCenter(x, y, z) {
        this.center = new BABYLON.Vector3(x, y, z);
        this.camera.target = this.center;

        // Adjust radius based on grid size
        const maxDim = Math.max(x, y, z) * 2;
        this.camera.radius = Math.min(maxDim * 1.8, this.camera.upperRadiusLimit);
    }

    setAutoOrbit(enabled) {
        this.autoOrbit = enabled;
    }

    toggleAutoOrbit() {
        this.autoOrbit = !this.autoOrbit;
        return this.autoOrbit;
    }

    update(deltaTime) {
        if (this.autoOrbit) {
            this.camera.alpha += this.orbitSpeed * deltaTime;
        }
    }

    getCamera() {
        return this.camera;
    }

    setOrbitSpeed(speed) {
        this.orbitSpeed = speed;
    }
}
