/**
 * Audio Controller for 3D Game of Life
 * Generates subtle tick sounds using Web Audio API.
 */

export class AudioController {
    constructor() {
        this.context = null;
        this.muted = true; // Default to muted
        this.volume = 0.15; // Subtle volume
    }

    /**
     * Initialize audio context (must be called after user interaction).
     */
    init() {
        if (this.context) return;
        this.context = new (window.AudioContext || window.webkitAudioContext)();
    }

    /**
     * Play a subtle tick sound.
     */
    tick() {
        if (this.muted || !this.context) return;

        // Resume context if suspended (browser autoplay policy)
        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        const now = this.context.currentTime;

        // Create oscillator for tick
        const osc = this.context.createOscillator();
        const gain = this.context.createGain();

        osc.connect(gain);
        gain.connect(this.context.destination);

        // Soft, high-pitched tick
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

        // Quick envelope for a soft click
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(this.volume, now + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
    }

    setMuted(muted) {
        this.muted = muted;
        // Initialize context on first unmute (user interaction required)
        if (!muted && !this.context) {
            this.init();
        }
    }

    isMuted() {
        return this.muted;
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
}
