# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D cellular automaton implementing Conway's Game of Life extended to three dimensions. Available as both a Unity project and a standalone WebGL application using Babylon.js.

## Quick Start

### WebGL Version (Recommended)
```bash
cd server
dotnet run -- --path=../web
# Open http://localhost:5000
```

### Unity Version
Open in Unity Editor (2022.1.0f1+) and run the `GameOfLife.unity` scene.

## Project Structure

```
├── web/                    # WebGL application (Babylon.js)
│   ├── js/
│   │   ├── main.js         # Entry point, coordinates all modules
│   │   ├── simulation.js   # Core 3D automaton engine
│   │   ├── rules.js        # Pluggable JSON-based rules
│   │   ├── renderer.js     # Babylon.js thin instances
│   │   ├── camera.js       # ArcRotateCamera + auto-orbit
│   │   └── ui.js           # Control panel, keyboard shortcuts
│   └── rules/              # Rule presets (JSON)
├── server/                 # ASP.NET static file server
├── Scripts/                # Unity C# scripts (legacy)
└── Objects/                # Unity prefabs
```

## Architecture

### Simulation Engine

Both versions share the same algorithm:

- **Grid Storage**: 1D typed array indexed via `calcIndex(x, y, z) = x + y * xMax + z * xMax * yMax`
- **Sparse Updates**: Only cells near live regions are processed (`updateList`)
- **Update Loop**: For each visible cell → increment all 26 neighbors → compile new visible set

### Adaptive Rules System

State-dependent survival/birth thresholds with automatic population balancing:

| State | Survival Range | Birth Threshold |
|-------|---------------|-----------------|
| Growth (+1) | 3-15 neighbors | 9+ neighbors |
| Decay (-1) | 7-13 neighbors | 12+ neighbors |
| Stable (0) | 4-14 neighbors | 11+ neighbors |

State transitions: Growth → Decay when population > `gridSize/300`, Decay → Growth when < `gridSize/2000`.

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

**Unity**: Object pooling with `UnusedBlockQueue_`. Same position-based coloring.

## Controls

| Key | Action |
|-----|--------|
| H | Hide/show control panel |
| Space | Pause/resume |
| R | Reset simulation |
| O | Toggle auto-orbit |
| A/D | Rotate camera |
| W/S | Zoom in/out |
| +/- | Adjust speed |

## Server CLI

```bash
dotnet run -- --path=<web-directory>
dotnet run -- ../web           # Positional argument also works
```

Serves static files with SPA fallback to index.html.
