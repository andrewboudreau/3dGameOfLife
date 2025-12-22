/**
 * UI Controller for 3D Game of Life
 * Handles control panel, keyboard shortcuts, and stats display.
 */

export class UIController {
    constructor(options) {
        this.onSpeedChange = options.onSpeedChange || (() => {});
        this.onGridSizeChange = options.onGridSizeChange || (() => {});
        this.onSpawnRadiusChange = options.onSpawnRadiusChange || (() => {});
        this.onRulesChange = options.onRulesChange || (() => {});
        this.onAutoOrbitChange = options.onAutoOrbitChange || (() => {});
        this.onPauseChange = options.onPauseChange || (() => {});
        this.onReset = options.onReset || (() => {});

        this.controlsVisible = true;
        this.paused = false;

        this.cacheElements();
        this.bindEvents();
        this.bindKeyboard();
    }

    cacheElements() {
        this.controls = document.getElementById('controls');
        this.stats = document.getElementById('stats');
        this.toggleBtn = document.getElementById('toggleControls');

        // Sliders
        this.speedSlider = document.getElementById('speedSlider');
        this.speedValue = document.getElementById('speedValue');
        this.gridSize = document.getElementById('gridSize');
        this.gridSizeValue = document.getElementById('gridSizeValue');
        this.spawnRadius = document.getElementById('spawnRadius');
        this.spawnRadiusValue = document.getElementById('spawnRadiusValue');

        // Other controls
        this.rulesSelect = document.getElementById('rulesSelect');
        this.autoOrbitCheckbox = document.getElementById('autoOrbit');
        this.pauseCheckbox = document.getElementById('pauseSimulation');
        this.resetBtn = document.getElementById('resetBtn');

        // Stats
        this.populationCount = document.getElementById('populationCount');
        this.growthState = document.getElementById('growthState');
        this.fpsCounter = document.getElementById('fpsCounter');
    }

    bindEvents() {
        // Speed slider
        this.speedSlider.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.speedValue.textContent = value;
            this.onSpeedChange(value);
        });

        // Grid size slider
        this.gridSize.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.gridSizeValue.textContent = value;
        });
        this.gridSize.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            this.onGridSizeChange(value);
        });

        // Spawn radius slider
        this.spawnRadius.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.spawnRadiusValue.textContent = value;
        });
        this.spawnRadius.addEventListener('change', (e) => {
            const value = parseInt(e.target.value);
            this.onSpawnRadiusChange(value);
        });

        // Rules dropdown
        this.rulesSelect.addEventListener('change', (e) => {
            this.onRulesChange(e.target.value);
        });

        // Auto-orbit checkbox
        this.autoOrbitCheckbox.addEventListener('change', (e) => {
            this.onAutoOrbitChange(e.target.checked);
        });

        // Pause checkbox
        this.pauseCheckbox.addEventListener('change', (e) => {
            this.paused = e.target.checked;
            this.onPauseChange(this.paused);
        });

        // Reset button
        this.resetBtn.addEventListener('click', () => this.onReset());

        // Toggle controls button
        this.toggleBtn.addEventListener('click', () => this.toggleControls());
    }

    bindKeyboard() {
        window.addEventListener('keydown', (e) => {
            // Ignore if user is typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

            switch (e.key.toLowerCase()) {
                case 'h':
                    this.toggleControls();
                    break;
                case ' ':
                    e.preventDefault();
                    this.togglePause();
                    break;
                case 'r':
                    this.onReset();
                    break;
                case 'o':
                    this.toggleAutoOrbit();
                    break;
            }
        });
    }

    toggleControls() {
        this.controlsVisible = !this.controlsVisible;
        this.controls.classList.toggle('hidden', !this.controlsVisible);
        this.stats.classList.toggle('hidden', !this.controlsVisible);
    }

    togglePause() {
        this.paused = !this.paused;
        this.pauseCheckbox.checked = this.paused;
        this.onPauseChange(this.paused);
    }

    toggleAutoOrbit() {
        this.autoOrbitCheckbox.checked = !this.autoOrbitCheckbox.checked;
        this.onAutoOrbitChange(this.autoOrbitCheckbox.checked);
    }

    updateStats(population, growthState, fps) {
        this.populationCount.textContent = population.toLocaleString();
        this.growthState.textContent = growthState;
        this.fpsCounter.textContent = fps;
    }

    setAutoOrbit(enabled) {
        this.autoOrbitCheckbox.checked = enabled;
    }

    getSpeed() {
        return parseInt(this.speedSlider.value);
    }

    getGridSize() {
        return parseInt(this.gridSize.value);
    }

    getSpawnRadius() {
        return parseInt(this.spawnRadius.value);
    }

    getSelectedRules() {
        return this.rulesSelect.value;
    }
}
