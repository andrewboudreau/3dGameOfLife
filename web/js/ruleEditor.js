/**
 * Rule Editor with visual controls and 2D preview grid.
 */

export class RuleEditor {
    constructor(options = {}) {
        this.onRulesChange = options.onRulesChange || (() => {});
        this.visible = false;

        // Current rule state - default to simple static rules
        this.adaptive = false;
        this.currentState = 'growth'; // growth, decay, stable
        this.rules = {
            growth: { survive: [4, 5], birth: 5 },
            decay: { survive: [4, 5], birth: 5 },
            stable: { survive: [4, 5], birth: 5 }
        };

        // 2D Preview simulation
        this.previewSize = 40;
        this.previewGrid = null;
        this.previewGeneration = 0;
        this.previewInterval = null;

        this.cacheElements();
        this.createBarCharts();
        this.bindEvents();
        this.initPreview();
    }

    cacheElements() {
        this.panel = document.getElementById('ruleEditor');
        this.toggleBtn = document.getElementById('toggleRuleEditor');
        this.closeBtn = document.getElementById('closeRuleEditor');

        this.presetSelect = document.getElementById('presetSelect');
        this.surviveMin = document.getElementById('surviveMin');
        this.surviveMax = document.getElementById('surviveMax');
        this.surviveMinValue = document.getElementById('surviveMinValue');
        this.surviveMaxValue = document.getElementById('surviveMaxValue');
        this.birthThreshold = document.getElementById('birthThreshold');
        this.birthThresholdValue = document.getElementById('birthThresholdValue');
        this.survivalChart = document.getElementById('survivalChart');
        this.birthChart = document.getElementById('birthChart');

        this.adaptiveCheckbox = document.getElementById('adaptiveMode');
        this.stateTabs = document.getElementById('stateTabs');
        this.applyBtn = document.getElementById('applyRules');

        this.previewCanvas = document.getElementById('previewCanvas');
        this.previewCtx = this.previewCanvas.getContext('2d');
        this.previewPop = document.getElementById('previewPop');
        this.previewGen = document.getElementById('previewGen');
    }

    createBarCharts() {
        // Create 27 bars (0-26 neighbors) for each chart
        for (let i = 0; i <= 26; i++) {
            const surviveBar = document.createElement('div');
            surviveBar.className = 'bar';
            surviveBar.dataset.value = i;
            this.survivalChart.appendChild(surviveBar);

            const birthBar = document.createElement('div');
            birthBar.className = 'bar';
            birthBar.dataset.value = i;
            this.birthChart.appendChild(birthBar);
        }
        this.updateBarCharts();
    }

    updateBarCharts() {
        const rules = this.rules[this.currentState];
        const [surviveMin, surviveMax] = rules.survive;
        const birthThreshold = rules.birth;

        // Update survival chart
        const surviveBars = this.survivalChart.querySelectorAll('.bar');
        surviveBars.forEach((bar, i) => {
            bar.classList.toggle('active', i >= surviveMin && i <= surviveMax);
            bar.style.height = (i >= surviveMin && i <= surviveMax) ? '100%' : '30%';
        });

        // Update birth chart
        const birthBars = this.birthChart.querySelectorAll('.bar');
        birthBars.forEach((bar, i) => {
            bar.classList.remove('active');
            bar.classList.toggle('birth', i >= birthThreshold);
            bar.style.height = i >= birthThreshold ? '100%' : '30%';
        });
    }

    bindEvents() {
        // Toggle panel
        this.toggleBtn.addEventListener('click', () => this.toggle());
        this.closeBtn.addEventListener('click', () => this.hide());

        // Preset selection
        this.presetSelect.addEventListener('change', (e) => this.loadPreset(e.target.value));

        // Sliders
        this.surviveMin.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.surviveMinValue.textContent = val;
            this.rules[this.currentState].survive[0] = val;
            // Ensure min <= max
            if (val > parseInt(this.surviveMax.value)) {
                this.surviveMax.value = val;
                this.surviveMaxValue.textContent = val;
                this.rules[this.currentState].survive[1] = val;
            }
            this.updateBarCharts();
            this.presetSelect.value = 'custom';
        });

        this.surviveMax.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.surviveMaxValue.textContent = val;
            this.rules[this.currentState].survive[1] = val;
            // Ensure max >= min
            if (val < parseInt(this.surviveMin.value)) {
                this.surviveMin.value = val;
                this.surviveMinValue.textContent = val;
                this.rules[this.currentState].survive[0] = val;
            }
            this.updateBarCharts();
            this.presetSelect.value = 'custom';
        });

        this.birthThreshold.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            this.birthThresholdValue.textContent = val;
            this.rules[this.currentState].birth = val;
            this.updateBarCharts();
            this.presetSelect.value = 'custom';
        });

        // Adaptive mode toggle
        this.adaptiveCheckbox.addEventListener('change', (e) => {
            this.adaptive = e.target.checked;
            this.stateTabs.style.display = this.adaptive ? 'flex' : 'none';
        });

        // State tabs
        this.stateTabs.querySelectorAll('.state-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this.stateTabs.querySelectorAll('.state-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                this.currentState = tab.dataset.state;
                this.updateSlidersFromRules();
                this.updateBarCharts();
            });
        });

        // Apply button
        this.applyBtn.addEventListener('click', () => this.applyRules());

        // Keyboard shortcut
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            if (e.key.toLowerCase() === 'e') {
                this.toggle();
            }
        });
    }

    updateSlidersFromRules() {
        const rules = this.rules[this.currentState];
        this.surviveMin.value = rules.survive[0];
        this.surviveMinValue.textContent = rules.survive[0];
        this.surviveMax.value = rules.survive[1];
        this.surviveMaxValue.textContent = rules.survive[1];
        this.birthThreshold.value = rules.birth;
        this.birthThresholdValue.textContent = rules.birth;
    }

    loadPreset(name) {
        const presets = {
            'default': {
                adaptive: false,
                rules: {
                    growth: { survive: [4, 5], birth: 5 },
                    decay: { survive: [4, 5], birth: 5 },
                    stable: { survive: [4, 5], birth: 5 }
                }
            },
            'conway-classic': {
                adaptive: false,
                rules: {
                    growth: { survive: [5, 7], birth: 6 },
                    decay: { survive: [5, 7], birth: 6 },
                    stable: { survive: [5, 7], birth: 6 }
                }
            },
            'crystal': {
                adaptive: false,
                rules: {
                    growth: { survive: [4, 6], birth: 5 },
                    decay: { survive: [4, 6], birth: 5 },
                    stable: { survive: [4, 6], birth: 5 }
                }
            },
            'adaptive': {
                adaptive: true,
                rules: {
                    growth: { survive: [3, 15], birth: 9 },
                    decay: { survive: [7, 13], birth: 12 },
                    stable: { survive: [4, 14], birth: 11 }
                }
            }
        };

        if (presets[name]) {
            this.adaptive = presets[name].adaptive;
            this.rules = JSON.parse(JSON.stringify(presets[name].rules));
            this.adaptiveCheckbox.checked = this.adaptive;
            this.stateTabs.style.display = this.adaptive ? 'flex' : 'none';
            this.updateSlidersFromRules();
            this.updateBarCharts();
            this.resetPreview();
        }
    }

    // 2D Preview Grid
    initPreview() {
        this.previewGrid = new Uint8Array(this.previewSize * this.previewSize);
        this.resetPreview();
    }

    resetPreview() {
        this.previewGeneration = 0;
        this.previewGrid.fill(0);

        // Seed center region
        const mid = Math.floor(this.previewSize / 2);
        const radius = 4;
        for (let y = mid - radius; y <= mid + radius; y++) {
            for (let x = mid - radius; x <= mid + radius; x++) {
                const dist = Math.sqrt((x - mid) ** 2 + (y - mid) ** 2);
                if (dist <= radius) {
                    this.previewGrid[y * this.previewSize + x] = 1;
                }
            }
        }

        this.drawPreview();
    }

    stepPreview() {
        const size = this.previewSize;
        const newGrid = new Uint8Array(size * size);
        const rules = this.rules[this.currentState];
        let population = 0;

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                // Count 8 neighbors (2D Moore neighborhood)
                let neighbors = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = (x + dx + size) % size;
                        const ny = (y + dy + size) % size;
                        neighbors += this.previewGrid[ny * size + nx];
                    }
                }

                const wasAlive = this.previewGrid[y * size + x] === 1;
                let alive = false;

                if (wasAlive) {
                    // For 2D, scale down the 3D thresholds
                    const min = Math.max(0, Math.floor(rules.survive[0] / 3));
                    const max = Math.min(8, Math.ceil(rules.survive[1] / 3));
                    alive = neighbors >= min && neighbors <= max;
                } else {
                    const threshold = Math.max(1, Math.floor(rules.birth / 3));
                    alive = neighbors >= threshold;
                }

                if (alive) {
                    newGrid[y * size + x] = 1;
                    population++;
                }
            }
        }

        this.previewGrid = newGrid;
        this.previewGeneration++;
        this.previewPop.textContent = population;
        this.previewGen.textContent = this.previewGeneration;

        this.drawPreview();
    }

    drawPreview() {
        const canvas = this.previewCanvas;
        const ctx = this.previewCtx;
        const size = this.previewSize;
        const cellSize = canvas.width / size;

        ctx.fillStyle = '#0a0a12';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                if (this.previewGrid[y * size + x]) {
                    // Color based on position
                    const r = Math.floor(80 + 175 * (x / size));
                    const g = Math.floor(80 + 175 * (y / size));
                    const b = Math.floor(150 + 105 * ((x + y) / (size * 2)));
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect(x * cellSize, y * cellSize, cellSize - 0.5, cellSize - 0.5);
                }
            }
        }
    }

    startPreview() {
        if (this.previewInterval) return;
        this.previewInterval = setInterval(() => this.stepPreview(), 150);
    }

    stopPreview() {
        if (this.previewInterval) {
            clearInterval(this.previewInterval);
            this.previewInterval = null;
        }
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    show() {
        this.visible = true;
        this.panel.classList.remove('hidden');
        document.body.classList.add('rule-editor-open');
        this.resetPreview();
        this.startPreview();
    }

    hide() {
        this.visible = false;
        this.panel.classList.add('hidden');
        document.body.classList.remove('rule-editor-open');
        this.stopPreview();
    }

    applyRules() {
        const config = this.adaptive ? {
            name: 'Custom Adaptive',
            adaptive: true,
            states: this.rules
        } : {
            name: 'Custom Static',
            adaptive: false,
            survive: this.rules[this.currentState].survive,
            birth: this.rules[this.currentState].birth
        };

        this.onRulesChange(config);
        this.resetPreview();
    }

    getRules() {
        return {
            adaptive: this.adaptive,
            rules: this.rules
        };
    }
}
