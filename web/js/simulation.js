/**
 * 3D Game of Life Simulation Engine
 * Ported from Unity C# implementation with performance optimizations for WebGL.
 * Uses typed arrays and sparse update lists to handle large grids efficiently.
 */

export class SimulationGrid {
    constructor(ruleEngine, size = 50) {
        this.ruleEngine = ruleEngine;
        this.resize(size);
    }

    resize(size) {
        this.xMax = size;
        this.yMax = size;
        this.zMax = size;
        this.maxIndex = size * size * size;

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

        const midX = Math.floor(this.xMax / 2);
        const midY = Math.floor(this.yMax / 2);
        const midZ = Math.floor(this.zMax / 2);

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
     * Thresholds for state transitions based on grid volume.
     * Decay kicks in at high population, growth at low.
     */
    get decayUpperLimit() {
        return Math.floor(this.maxIndex / 300);
    }

    get growthLowerLimit() {
        return Math.floor(this.maxIndex / 2000);
    }

    /**
     * Execute one simulation step.
     */
    step() {
        // Update growth state based on population thresholds
        if (this.totalCount > this.decayUpperLimit) {
            this.growthState = -1; // Decay phase
        } else if (this.totalCount < this.growthLowerLimit) {
            this.growthState = 1;  // Growth phase
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
     * Get all visible cell positions for rendering.
     * Reuses objects to reduce GC pressure.
     */
    getVisibleCells() {
        // Reuse or create cell objects array
        if (!this._cellObjects) {
            this._cellObjects = [];
        }

        const cells = this._cellObjects;
        const count = this.visibleCells.length;

        // Ensure array is large enough
        while (cells.length < count) {
            cells.push({ x: 0, y: 0, z: 0, index: 0 });
        }

        // Update cell objects
        for (let i = 0; i < count; i++) {
            const index = this.visibleCells[i];
            const cell = cells[i];
            const coords = this.getCoords(index);
            cell.x = coords.x;
            cell.y = coords.y;
            cell.z = coords.z;
            cell.index = index;
        }

        // Return slice of active cells
        return cells.slice(0, count);
    }

    getCenter() {
        return {
            x: this.xMax / 2,
            y: this.yMax / 2,
            z: this.zMax / 2
        };
    }

    getGrowthStateName() {
        if (this.growthState > 0) return 'Growth';
        if (this.growthState < 0) return 'Decay';
        return 'Stable';
    }
}
