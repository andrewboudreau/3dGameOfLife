/**
 * Main Entry Point for 3D Game of Life WebGL Application
 */

import { SimulationGrid } from './simulation.js';
import { RuleEngine } from './rules.js';
import { Renderer } from './renderer.js';
import { CameraController } from './camera.js';
import { UIController } from './ui.js';
import { RuleEditor } from './ruleEditor.js';
import { AudioController } from './audio.js';

class GameOfLife3D {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.paused = false;
        this.stepsPerSecond = 10;
        this.gridSize = 40;
        this.spawnRadius = 5;

        // Timing - separate simulation from render
        this.lastStepTime = 0;
        this.lastFrameTime = 0;
        this.cellsCache = [];
        this.needsRenderUpdate = true;

        this.init();
    }

    init() {
        // Initialize rule engine
        this.ruleEngine = new RuleEngine('default');

        // Initialize simulation
        this.simulation = new SimulationGrid(this.ruleEngine, this.gridSize);
        this.simulation.reset(this.spawnRadius);

        // Initialize renderer
        this.renderer = new Renderer(this.canvas);

        // Initialize camera
        this.cameraController = new CameraController(this.renderer.scene, this.canvas);
        this.renderer.setCamera(this.cameraController.getCamera());
        this.updateCameraTarget();

        // Initialize audio (defaults to muted)
        this.audio = new AudioController();

        // Initialize UI
        this.ui = new UIController({
            onSpeedChange: (speed) => this.setSpeed(speed),
            onGridSizeChange: (size) => this.setGridSize(size),
            onSpawnRadiusChange: (radius) => this.setSpawnRadius(radius),
            onRulesChange: (ruleName) => this.setRules(ruleName),
            onAutoOrbitChange: (enabled) => this.cameraController.setAutoOrbit(enabled),
            onPauseChange: (paused) => this.paused = paused,
            onReset: () => this.reset(),
            onCellSizeChange: (scale) => {
                this.renderer.setCellScale(scale);
                this.needsRenderUpdate = true;
            },
            onNearAlphaChange: (alpha) => {
                this.renderer.setNearAlpha(alpha);
                this.needsRenderUpdate = true;
            },
            onFarAlphaChange: (alpha) => {
                this.renderer.setFarAlpha(alpha);
                this.needsRenderUpdate = true;
            },
            onSliceModeChange: (enabled) => {
                this.renderer.setSliceEnabled(enabled);
                this.needsRenderUpdate = true;
            },
            onSliceLayerChange: (layer) => {
                this.renderer.setSliceLayer(layer);
                this.needsRenderUpdate = true;
            },
            onSliceThicknessChange: (thickness) => {
                this.renderer.setSliceThickness(thickness);
                this.needsRenderUpdate = true;
            },
            onSoundChange: (enabled) => this.audio.setMuted(!enabled)
        });

        // Initialize Rule Editor
        this.ruleEditor = new RuleEditor({
            onRulesChange: (config) => this.applyCustomRules(config)
        });

        // Initial render
        this.updateCells();

        // Start render loop
        this.lastFrameTime = performance.now();
        this.lastStepTime = this.lastFrameTime;
        this.renderer.startRenderLoop(() => this.onFrame());
    }

    onFrame() {
        const now = performance.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;

        // Update camera auto-orbit (always runs for smooth rotation)
        this.cameraController.update(deltaTime);

        // Update camera position for distance-based transparency
        this.renderer.updateCameraPosition();

        // Run simulation step based on speed setting
        const stepInterval = 1000 / this.stepsPerSecond;
        if (!this.paused && now - this.lastStepTime >= stepInterval) {
            this.simulation.step();
            this.audio.tick();
            this.needsRenderUpdate = true;
            this.lastStepTime = now;
        }

        // Update renderer when simulation changed or camera moved (for distance-based alpha)
        const usingTransparency = this.renderer.nearAlpha < 1.0 || this.renderer.farAlpha < 1.0;
        if (this.needsRenderUpdate || usingTransparency) {
            this.updateCells();
            this.needsRenderUpdate = false;
        }

        // Update stats display
        this.ui.updateStats(
            this.simulation.totalCount,
            this.simulation.getGrowthStateName(),
            this.renderer.getFPS()
        );
    }

    updateCells() {
        this.cellsCache = this.simulation.getVisibleCells();
        this.renderer.updateCells(this.cellsCache, this.gridSize);
    }

    updateCameraTarget() {
        const center = this.simulation.getCenter();
        this.cameraController.setCenter(center.x, center.y, center.z);
    }

    setSpeed(stepsPerSecond) {
        this.stepsPerSecond = stepsPerSecond;
    }

    setGridSize(size) {
        this.gridSize = size;
        this.simulation.resize(size);
        this.ui.updateGridSize(size);
        this.reset();
    }

    setSpawnRadius(radius) {
        this.spawnRadius = radius;
    }

    setRules(ruleName) {
        this.ruleEngine.loadPreset(ruleName);
        this.reset();
    }

    applyCustomRules(config) {
        this.ruleEngine.loadCustom(config);
        this.reset();
    }

    reset() {
        this.simulation.reset(this.spawnRadius);
        this.needsRenderUpdate = true;
        this.updateCameraTarget();
    }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new GameOfLife3D();
});
