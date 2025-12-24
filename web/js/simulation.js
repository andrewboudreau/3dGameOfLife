/**
 * 3D Game of Life Simulation Engine
 * Ported from Unity C# implementation with performance optimizations for WebGL.
 * Uses typed arrays and sparse update lists to handle large grids efficiently.
 */

export class SimulationGrid {
    constructor(ruleEngine, size = 50) {
        this.ruleEngine = ruleEngine;
        this.padding = 2; // Extra cells on each side for proper neighbor counting
        this.resize(size);
    }

    resize(size) {
        // Visible size (what gets rendered)
        this.visibleSize = size;

        // Actual simulation size (includes padding)
        const simSize = size + this.padding * 2;
        this.xMax = simSize;
        this.yMax = simSize;
        this.zMax = simSize;
        this.maxIndex = simSize * simSize * simSize;

        // Typed arrays for performance - visibility and neighbor counts
        this.visibility = new Uint8Array(this.maxIndex);
        this.neighbors = new Uint8Array(this.maxIndex);
        this.inUpdateList = new Uint8Array(this.maxIndex);

        // Sparse lists for active cells
        this.visibleCells = [];
        this.updateList = [];

        // Adaptive state machine: 1=growth, 0=stable, -1=decay
        this.growthState = 1;
        this.totalCount = 0;
    }

    /**
     * Calculate 1D array index from 3D coordinates.
     * Formula: x + y * xMax + z * xMax * yMax
     */
    calcIndex(x, y, z) {
        return x + y * this.xMax + z * this.xMax * this.yMax;
    }

    /**
     * Extract 3D coordinates from 1D index.
     */
    getCoords(index) {
        const zMult = this.xMax * this.yMax;
        const z = Math.floor(index / zMult);
        const yMult = this.xMax;
        const y = Math.floor((index - z * zMult) / yMult);
        const x = index - y * yMult - z * zMult;
        return { x, y, z };
    }

    isInRange(x, y, z) {
        return x >= 0 && y >= 0 && z >= 0 &&
               x < this.xMax && y < this.yMax && z < this.zMax;
    }

    isIndexInRange(index) {
        return index >= 0 && index < this.maxIndex;
    }

    /**
     * Reset simulation with cells seeded in a sphere of given radius.
     */
    reset(radius = 5) {
        // Clear all state
        this.visibility.fill(0);
        this.neighbors.fill(0);
        this.inUpdateList.fill(0);
        this.visibleCells = [];
        this.updateList = [];
        this.growthState = 1;
        this.totalCount = 0;

        // Center is in the middle of the visible region (offset by padding)
        const midX = this.padding + Math.floor(this.visibleSize / 2);
        const midY = this.padding + Math.floor(this.visibleSize / 2);
        const midZ = this.padding + Math.floor(this.visibleSize / 2);

        // Seed cells within spherical region
        for (let x = 0; x < this.xMax; x++) {
            for (let y = 0; y < this.yMax; y++) {
                for (let z = 0; z < this.zMax; z++) {
                    const dx = x - midX;
                    const dy = y - midY;
                    const dz = z - midZ;
                    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    if (dist <= radius) {
                        const index = this.calcIndex(x, y, z);
                        this.visibility[index] = 1;
                        this.visibleCells.push(index);
                        this.totalCount++;
                    }
                }
            }
        }
    }

    /**
     * Thresholds for state transitions based on visible grid volume.
     * Decay kicks in at high population, growth at low.
     */
    get decayUpperLimit() {
        const visibleVolume = this.visibleSize * this.visibleSize * this.visibleSize;
        return Math.floor(visibleVolume / 300);
    }

    get growthLowerLimit() {
        const visibleVolume = this.visibleSize * this.visibleSize * this.visibleSize;
        return Math.floor(visibleVolume / 2000);
    }

    /**
     * Execute one simulation step.
     */
    step() {
        // Update growth state only for adaptive rules
        if (this.ruleEngine.config.adaptive) {
            if (this.totalCount > this.decayUpperLimit) {
                this.growthState = -1; // Decay phase
            } else if (this.totalCount < this.growthLowerLimit) {
                this.growthState = 1;  // Growth phase
            }
        }

        // Run rules on all visible cells - increments neighbor counts
        for (const index of this.visibleCells) {
            this.runRule(index);
        }

        // Compile new visible set based on neighbor counts
        this.compileVisibleSet();
        this.totalCount = this.visibleCells.length;
    }

    /**
     * For each visible cell, increment neighbor count for all 26 adjacent cells.
     */
    runRule(index) {
        const { x, y, z } = this.getCoords(index);

        // All 26 neighbors in a 3x3x3 cube (excluding center)
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    this.addNeighbor(x + dx, y + dy, z + dz);
                }
            }
        }
    }

    addNeighbor(x, y, z) {
        if (!this.isInRange(x, y, z)) return;

        const index = this.calcIndex(x, y, z);
        this.neighbors[index]++;

        if (!this.inUpdateList[index]) {
            this.updateList.push(index);
            this.inUpdateList[index] = 1;
        }
    }

    /**
     * Determine which cells live or die based on current neighbor counts.
     */
    compileVisibleSet() {
        const newVisible = [];

        for (const index of this.updateList) {
            const wasAlive = this.visibility[index] === 1;
            const neighborCount = this.neighbors[index];

            if (this.ruleEngine.isAlive(wasAlive, neighborCount, this.growthState)) {
                this.visibility[index] = 1;
                newVisible.push(index);
            } else {
                this.visibility[index] = 0;
            }

            // Reset for next iteration
            this.neighbors[index] = 0;
            this.inUpdateList[index] = 0;
        }

        this.visibleCells = newVisible;
        this.updateList = [];
    }

    /**
     * Check if coordinates are within the visible region (excluding padding).
     */
    isInVisibleRegion(x, y, z) {
        return x >= this.padding && x < this.padding + this.visibleSize &&
               y >= this.padding && y < this.padding + this.visibleSize &&
               z >= this.padding && z < this.padding + this.visibleSize;
    }

    /**
     * Get all visible cell positions for rendering.
     * Only returns cells within the visible region (not padding).
     * Coordinates are adjusted to be 0-based within visible region.
     */
    getVisibleCells() {
        // Reuse or create cell objects array
        if (!this._cellObjects) {
            this._cellObjects = [];
        }

        const cells = this._cellObjects;
        let outputIndex = 0;

        // Filter to only cells in visible region
        for (let i = 0; i < this.visibleCells.length; i++) {
            const index = this.visibleCells[i];
            const coords = this.getCoords(index);

            // Only include cells within visible bounds
            if (this.isInVisibleRegion(coords.x, coords.y, coords.z)) {
                // Ensure array is large enough
                if (outputIndex >= cells.length) {
                    cells.push({ x: 0, y: 0, z: 0, index: 0 });
                }

                const cell = cells[outputIndex];
                // Adjust coordinates to be 0-based within visible region
                cell.x = coords.x - this.padding;
                cell.y = coords.y - this.padding;
                cell.z = coords.z - this.padding;
                cell.index = index;
                outputIndex++;
            }
        }

        // Return slice of active visible cells
        return cells.slice(0, outputIndex);
    }

    getCenter() {
        // Return center of visible region (0-based coordinates)
        return {
            x: this.visibleSize / 2,
            y: this.visibleSize / 2,
            z: this.visibleSize / 2
        };
    }

    getGrowthStateName() {
        if (!this.ruleEngine.config.adaptive) return null;
        if (this.growthState > 0) return 'Growth';
        if (this.growthState < 0) return 'Decay';
        return 'Stable';
    }

    isAdaptive() {
        return this.ruleEngine.config.adaptive;
    }
}
