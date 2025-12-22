# 3D Game of Life

A 3D implementation of Conway's Game of Life using WebGL (Babylon.js).

**[Live Demo](https://andrewboudreau.github.io/3dGameOfLife/)**

## Features

- **3D Cellular Automaton** - Conway's Game of Life extended to three dimensions
- **Adaptive Rules** - Automatic growth/decay phases based on population
- **Rule Editor** - Visual editor with sliders, bar charts, and live 2D preview
- **Pluggable Rules** - JSON-based rule system with presets
- **Auto-Orbit Camera** - Smooth orbital camera with manual override

## Controls

| Key | Action |
|-----|--------|
| `H` | Hide/show control panel |
| `E` | Toggle rule editor |
| `Space` | Pause/resume |
| `R` | Reset simulation |
| `O` | Toggle auto-orbit |
| `W/S` | Zoom in/out |
| `A/D` | Rotate camera |

## Run Locally

### Option 1: Static Server
Serve the `web/` folder with any static file server:
```bash
npx serve web
# or
python -m http.server -d web
```

### Option 2: .NET Server
```bash
cd server
dotnet run -- --path=../web
```

## Project Structure

```
├── web/                    # WebGL application
│   ├── js/
│   │   ├── main.js         # Entry point
│   │   ├── simulation.js   # 3D automaton engine
│   │   ├── rules.js        # Pluggable rules system
│   │   ├── renderer.js     # Babylon.js thin instances
│   │   ├── camera.js       # Orbital camera
│   │   ├── ui.js           # Control panel
│   │   └── ruleEditor.js   # Visual rule editor
│   └── rules/              # Rule presets (JSON)
├── server/                 # .NET static file server
└── Scripts/                # Original Unity scripts
```

## Rule Format

Rules are defined in JSON:
```json
{
  "name": "Custom Rule",
  "adaptive": false,
  "survive": [4, 14],
  "birth": 11
}
```

For adaptive rules with state-based thresholds:
```json
{
  "name": "Adaptive Rule",
  "adaptive": true,
  "states": {
    "growth": { "survive": [3, 15], "birth": 9 },
    "decay": { "survive": [7, 13], "birth": 12 },
    "stable": { "survive": [4, 14], "birth": 11 }
  }
}
```

## License

MIT
