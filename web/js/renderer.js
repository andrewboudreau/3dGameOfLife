/**
 * Babylon.js Renderer for 3D Game of Life
 * Uses Thin Instances for maximum performance - single draw call for all cubes.
 */

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.engine = new BABYLON.Engine(canvas, true, {
            preserveDrawingBuffer: false,
            antialias: true
        });
        this.scene = null;
        this.cube = null;
        this.maxInstances = 50000;
        this.activeCount = 0;
        this.gridSize = 40;

        // Visibility settings
        this.cellScale = 0.9;      // 0.1 to 1.0
        this.nearAlpha = 1.0;      // Alpha for cells closest to camera
        this.farAlpha = 1.0;       // Alpha for cells farthest from camera
        this.sliceEnabled = false;
        this.sliceLayer = 0;       // Current Z layer to show
        this.sliceThickness = 1;   // How many layers to show
        this.cameraPosition = { x: 0, y: 0, z: 0 };

        this.initScene();
        this.initLighting();
        this.initCube();

        window.addEventListener('resize', () => this.engine.resize());
    }

    initScene() {
        this.scene = new BABYLON.Scene(this.engine);
        this.scene.clearColor = new BABYLON.Color4(0.015, 0.015, 0.025, 1);
    }

    initLighting() {
        // Ambient light
        const ambient = new BABYLON.HemisphericLight(
            'ambient',
            new BABYLON.Vector3(0, 1, 0),
            this.scene
        );
        ambient.intensity = 0.6;
        ambient.diffuse = new BABYLON.Color3(1, 1, 1);
        ambient.groundColor = new BABYLON.Color3(0.2, 0.2, 0.3);

        // Key light
        const key = new BABYLON.DirectionalLight(
            'key',
            new BABYLON.Vector3(-1, -2, -1).normalize(),
            this.scene
        );
        key.intensity = 0.7;

        // Fill light
        const fill = new BABYLON.DirectionalLight(
            'fill',
            new BABYLON.Vector3(1, 0.5, 1).normalize(),
            this.scene
        );
        fill.intensity = 0.25;
    }

    initCube() {
        // Create single cube mesh that will be instanced (unit size, scaled per-instance)
        this.cube = BABYLON.MeshBuilder.CreateBox('cube', { size: 1.0 }, this.scene);

        // Material with vertex colors and transparency support
        const material = new BABYLON.StandardMaterial('cubeMat', this.scene);
        material.diffuseColor = new BABYLON.Color3(1, 1, 1);
        material.specularColor = new BABYLON.Color3(0.2, 0.2, 0.3);
        material.specularPower = 16;
        material.backFaceCulling = true;

        // Enable transparency with depth pre-pass to fix sorting issues
        material.alpha = 1.0;
        material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
        material.needDepthPrePass = true;
        this.cube.material = material;

        // Register color as a per-instance attribute (RGBA)
        this.cube.thinInstanceRegisterAttribute('color', 4);

        // Hide initially - no instances
        this.cube.isVisible = false;
    }

    /**
     * Update rendered cells. Rebuilds instance buffers each frame.
     */
    updateCells(cells, gridSize) {
        this.gridSize = gridSize;

        // Filter cells if slicing is enabled
        let visibleCells = cells;
        if (this.sliceEnabled) {
            const minZ = this.sliceLayer;
            const maxZ = this.sliceLayer + this.sliceThickness;
            visibleCells = cells.filter(c => c.z >= minZ && c.z < maxZ);
        }

        const count = Math.min(visibleCells.length, this.maxInstances);
        this.activeCount = count;

        if (count === 0) {
            this.cube.isVisible = false;
            this.cube.thinInstanceCount = 0;
            return;
        }

        // Create fresh buffers each time to ensure clean state
        const matrices = new Float32Array(count * 16);
        const colors = new Float32Array(count * 4);

        const scale = this.cellScale;
        const camX = this.cameraPosition.x;
        const camY = this.cameraPosition.y;
        const camZ = this.cameraPosition.z;

        // Calculate min/max distances for normalization
        let minDist = Infinity;
        let maxDist = 0;
        for (let i = 0; i < count; i++) {
            const cell = visibleCells[i];
            const dx = cell.x - camX;
            const dy = cell.y - camY;
            const dz = cell.z - camZ;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            if (dist < minDist) minDist = dist;
            if (dist > maxDist) maxDist = dist;
        }
        const distRange = maxDist - minDist || 1;

        // Fill buffers
        for (let i = 0; i < count; i++) {
            const cell = visibleCells[i];
            const matOffset = i * 16;
            const colOffset = i * 4;

            // Scaled matrix with translation (column-major order)
            matrices[matOffset + 0] = scale;
            matrices[matOffset + 1] = 0;
            matrices[matOffset + 2] = 0;
            matrices[matOffset + 3] = 0;
            matrices[matOffset + 4] = 0;
            matrices[matOffset + 5] = scale;
            matrices[matOffset + 6] = 0;
            matrices[matOffset + 7] = 0;
            matrices[matOffset + 8] = 0;
            matrices[matOffset + 9] = 0;
            matrices[matOffset + 10] = scale;
            matrices[matOffset + 11] = 0;
            matrices[matOffset + 12] = cell.x;
            matrices[matOffset + 13] = cell.y;
            matrices[matOffset + 14] = cell.z;
            matrices[matOffset + 15] = 1;

            // Calculate distance-based alpha
            const dx = cell.x - camX;
            const dy = cell.y - camY;
            const dz = cell.z - camZ;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const t = (dist - minDist) / distRange; // 0 = near, 1 = far
            const alpha = this.nearAlpha + (this.farAlpha - this.nearAlpha) * t;

            // Color based on position with distance-based alpha
            colors[colOffset + 0] = 0.25 + 0.75 * (cell.x / gridSize);
            colors[colOffset + 1] = 0.25 + 0.75 * (cell.y / gridSize);
            colors[colOffset + 2] = 0.25 + 0.75 * (cell.z / gridSize);
            colors[colOffset + 3] = alpha;
        }

        // Set buffers - passing true to mark as static (will be replaced next frame anyway)
        this.cube.thinInstanceSetBuffer('matrix', matrices, 16, true);
        this.cube.thinInstanceSetBuffer('color', colors, 4, true);

        // Update material transparency mode based on whether any transparency is used
        const needsTransparency = this.nearAlpha < 1.0 || this.farAlpha < 1.0;
        if (needsTransparency) {
            this.cube.material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
            this.cube.material.needDepthPrePass = true;
        } else {
            this.cube.material.transparencyMode = BABYLON.Material.MATERIAL_OPAQUE;
            this.cube.material.needDepthPrePass = false;
        }

        this.cube.isVisible = true;
    }

    setCamera(camera) {
        this.camera = camera;
        this.scene.activeCamera = camera;
        camera.attachControl(this.canvas, true);
    }

    startRenderLoop(onRender) {
        this.engine.runRenderLoop(() => {
            if (onRender) onRender();
            this.scene.render();
        });
    }

    getFPS() {
        return Math.round(this.engine.getFps());
    }

    setCellScale(scale) {
        this.cellScale = Math.max(0.1, Math.min(1.0, scale));
    }

    setNearAlpha(alpha) {
        this.nearAlpha = Math.max(0.0, Math.min(1.0, alpha));
    }

    setFarAlpha(alpha) {
        this.farAlpha = Math.max(0.0, Math.min(1.0, alpha));
    }

    updateCameraPosition() {
        if (this.camera) {
            this.cameraPosition.x = this.camera.position.x;
            this.cameraPosition.y = this.camera.position.y;
            this.cameraPosition.z = this.camera.position.z;
        }
    }

    setSliceEnabled(enabled) {
        this.sliceEnabled = enabled;
    }

    setSliceLayer(layer) {
        this.sliceLayer = Math.max(0, layer);
    }

    setSliceThickness(thickness) {
        this.sliceThickness = Math.max(1, thickness);
    }

    dispose() {
        this.cube.dispose();
        this.engine.dispose();
    }
}
