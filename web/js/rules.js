/**
 * Pluggable Rules Engine for 3D Game of Life
 * Supports JSON-based rule configurations with both adaptive (state-based) and static modes.
 */

// Built-in rule presets
const PRESETS = {
    'default': {
        name: '3D Life',
        description: 'Simple 3D cellular automaton with balanced survival and birth rules',
        adaptive: false,
        survive: [4, 5],   // Survive with 4-5 neighbors
        birth: 5           // Born with exactly 5 neighbors
    },
    'conway-classic': {
        name: 'Conway Classic 3D',
        description: 'Traditional 2D rules adapted to 3D - tends toward extinction or explosion',
        adaptive: false,
        survive: [5, 7],   // Survive with 5-7 neighbors
        birth: 6           // Born with exactly 6 neighbors
    },
    'crystal': {
        name: 'Crystal Growth',
        description: 'Slow, structured growth patterns resembling crystal formation',
        adaptive: false,
        survive: [4, 6],
        birth: 5
    },
    'adaptive': {
        name: 'Adaptive',
        description: 'Growth/decay/stable phases with population-based state transitions',
        adaptive: true,
        states: {
            growth:  { survive: [3, 15], birth: 9 },
            decay:   { survive: [7, 13], birth: 12 },
            stable:  { survive: [4, 14], birth: 11 }
        }
    }
};

export class RuleEngine {
    constructor(presetName = 'default') {
        this.loadPreset(presetName);
    }

    loadPreset(name) {
        const preset = PRESETS[name];
        if (!preset) {
            console.warn(`Unknown preset "${name}", using default`);
            this.config = PRESETS['default'];
        } else {
            this.config = preset;
        }
        this.name = this.config.name;
    }

    loadCustom(jsonConfig) {
        // Convert states format to internal format if needed
        if (jsonConfig.states) {
            this.config = {
                name: jsonConfig.name || 'Custom Rules',
                adaptive: true,
                states: {
                    growth: { survive: jsonConfig.states.growth.survive, birth: jsonConfig.states.growth.birth },
                    decay: { survive: jsonConfig.states.decay.survive, birth: jsonConfig.states.decay.birth },
                    stable: { survive: jsonConfig.states.stable.survive, birth: jsonConfig.states.stable.birth }
                }
            };
        } else {
            this.config = jsonConfig;
        }
        this.name = this.config.name || 'Custom Rules';
    }

    /**
     * Determine if a cell should be alive next generation.
     * @param {boolean} wasAlive - Cell's previous state
     * @param {number} neighbors - Count of live neighbors (0-26)
     * @param {number} growthState - Current simulation state (1=growth, 0=stable, -1=decay)
     */
    isAlive(wasAlive, neighbors, growthState) {
        if (this.config.adaptive) {
            return this.evaluateAdaptive(wasAlive, neighbors, growthState);
        }
        return this.evaluateStatic(wasAlive, neighbors);
    }

    evaluateAdaptive(wasAlive, neighbors, growthState) {
        let stateRules;
        if (growthState > 0) {
            stateRules = this.config.states.growth;
        } else if (growthState < 0) {
            stateRules = this.config.states.decay;
        } else {
            stateRules = this.config.states.stable;
        }

        if (wasAlive) {
            const [min, max] = stateRules.survive;
            return neighbors >= min && neighbors <= max;
        }
        return neighbors >= stateRules.birth;
    }

    evaluateStatic(wasAlive, neighbors) {
        if (wasAlive) {
            const [min, max] = this.config.survive;
            return neighbors >= min && neighbors <= max;
        }
        return neighbors >= this.config.birth;
    }

    getAvailablePresets() {
        return Object.entries(PRESETS).map(([key, config]) => ({
            key,
            name: config.name,
            description: config.description
        }));
    }
}

export { PRESETS };
