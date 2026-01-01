# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D cellular automaton implementing Conway's Game of Life extended to three dimensions. Available as a WebGL application using Babylon.js, with the original Unity project preserved.

## Quick Start

### WebGL Version
```bash
# Option 1: Any static server
npx serve web

# Option 2: .NET server
dotnet run -- --path=web
```
Open http://localhost:5000 (or port shown)

### Unity Version
Open `unity3d/` folder in Unity Editor (2022.1.0f1+) and run the `GameOfLife.unity` scene.

## Project Structure

```
├── web/                    # WebGL application (Babylon.js)
│   ├── js/
│   │   ├── main.js         # Entry point, coordinates all modules
│   │   ├── simulation.js   # Core 3D automaton engine
│   │   ├── rules.js        # Pluggable JSON-based rules
│   │   ├── renderer.js     # Babylon.js thin instances
│   │   ├── camera.js       # ArcRotateCamera + auto-orbit
│   │   ├── ui.js           # Control panel, keyboard shortcuts
│   │   ├── audio.js        # Web Audio API tick sounds
│   │   └── ruleEditor.js   # Visual rule editor with 2D preview
│   └── rules/              # Rule presets (JSON)
├── Program.cs              # .NET static file server
├── server.csproj
└── unity3d/                # Original Unity project
```

## Architecture

### Simulation Engine

Both versions share the same algorithm:

- **Grid Storage**: 1D typed array indexed via `calcIndex(x, y, z) = x + y * xMax + z * xMax * yMax`
- **Sparse Updates**: Only cells near live regions are processed (`updateList`)
- **Update Loop**: For each visible cell → increment all 26 neighbors → compile new visible set

### Default Rules (3D Life)

Simple Conway-esque rules adapted to 3D:
- **Survival**: 4-5 neighbors (cell stays alive)
- **Birth**: 5+ neighbors (new cell is born)

### Adaptive Rules (Optional)

Available as the "Adaptive" preset. Uses state-dependent survival/birth thresholds with automatic population balancing:

| State | Survival Range | Birth Threshold |
|-------|---------------|-----------------|
| Growth (+1) | 3-15 neighbors | 9+ neighbors |
| Decay (-1) | 7-13 neighbors | 12+ neighbors |
| Stable (0) | 4-14 neighbors | 11+ neighbors |

State transitions based on population relative to visible grid volume:
- **Decay**: population > `visibleVolume/300`
- **Growth**: population < `visibleVolume/2000`
- **Stable**: population between these thresholds

### Pluggable Rules (WebGL)

Rules are defined in JSON (`web/rules/*.json`):
```json
{
  "name": "Custom Rule",
  "adaptive": false,
  "survive": [4, 6],
  "birth": 5
}
```

Load via `RuleEngine.loadPreset(name)` or `RuleEngine.loadCustom(json)`.

### Rendering

**WebGL**: Babylon.js thin instances for single draw call. Position-based RGB coloring.

## Controls

| Key | Action |
|-----|--------|
| H | Hide/show control panel |
| E | Toggle rule editor |
| Space | Pause/resume |
| R | Reset simulation |
| O | Toggle auto-orbit |
| M | Toggle sound (muted by default) |
| A/D | Rotate camera |
| W/S | Zoom in/out |

## Server CLI

```bash
dotnet run -- --path=<web-directory>
dotnet run -- web              # Serve web folder
```

Serves static files with SPA fallback to index.html.
