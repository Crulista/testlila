# Architecture

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Data Processing | Python + PyArrow + Pandas | Best parquet support, fast batch processing, familiar ecosystem |
| Frontend | React + Vite | Fast dev server, modern bundling, component model fits the interactive UI |
| Rendering | HTML5 Canvas (2D) | Direct pixel control needed for path rendering, heatmaps, and overlay compositing. WebGL would be overkill for 2D map visualization |
| Heatmaps | Custom radial gradient renderer | Lightweight, no extra dependency, renders directly on canvas with configurable color/radius |
| Hosting | Vercel | Zero-config deployment for Vite/React, free tier, instant CDN |

## Data Flow

```
Raw Parquet Files (1,243 files, ~89K events)
        │
        ▼
  process_data.py
  ├── Reads all .nakama-0 parquet files
  ├── Decodes event bytes → strings
  ├── Detects bots (numeric ID) vs humans (UUID)
  ├── Converts world coords (x, z) → minimap UV → pixel coords
  ├── Calculates relative timestamps per match
  └── Outputs:
        │
        ├── match_index.json      (match metadata for filters/list)
        ├── heatmaps.json         (aggregated kill/death/loot/traffic points per map)
        ├── daily_stats.json      (per-day aggregate stats)
        └── matches/<id>.json     (per-match: player paths + events)
                │
                ▼
          React Frontend
          ├── Loads match_index.json on startup (sidebar, filters)
          ├── Loads heatmaps.json on startup (overlay data)
          ├── Lazy-loads individual match JSON on selection
          └── Renders everything on HTML5 Canvas
```

## Coordinate Mapping (The Tricky Part)

The README provides world-to-minimap conversion parameters per map:

| Map | Scale | Origin X | Origin Z |
|-----|-------|----------|----------|
| AmbroseValley | 900 | -370 | -473 |
| GrandRift | 581 | -290 | -290 |
| Lockdown | 1000 | -500 | -500 |

**Conversion formula:**
```
u = (world_x - origin_x) / scale        → UV horizontal (0–1)
v = (world_z - origin_z) / scale        → UV vertical (0–1)
pixel_x = u * 1024                       → Minimap X
pixel_y = (1 - v) * 1024                → Minimap Y (flipped, image origin is top-left)
```

**Key detail:** The `y` column in the data is elevation (3D height), NOT a map coordinate. Only `x` and `z` are used for 2D mapping. The Y-flip on `v` accounts for the image coordinate system having origin at top-left vs the game's bottom-left.

**Image scaling:** The actual minimap images are larger than 1024×1024 (AmbroseValley is 4320×4320, Lockdown is 9000×9000). I normalize all pixel coordinates to a 0–1024 space in preprocessing, then scale to actual canvas size at render time using `scale = canvasSize / 1024`. This keeps the data portable regardless of display resolution.

## Assumptions

- **Timestamps are match-relative:** `ts` values are time elapsed within a match, not wall-clock time. I subtract the minimum `ts` per match to get seconds-from-start.
- **Bot detection by user_id format:** Numeric user_ids = bots, UUIDs = humans (as documented in README).
- **Event bytes encoding:** All event values are UTF-8 encoded bytes in parquet, decoded during preprocessing.
- **February 14 is partial:** Treated as a normal day in the UI but with fewer matches.

## Trade-offs

| Decision | Alternative Considered | Why I Chose This |
|----------|----------------------|------------------|
| Pre-process to JSON vs. load parquet in browser | In-browser parquet reading (DuckDB-WASM) | JSON is simpler, faster to load, and avoids a 3MB WASM dependency. Trade-off: larger total file size, but with match-level lazy loading it stays fast |
| Canvas 2D vs. deck.gl/WebGL | deck.gl for GPU-accelerated rendering | Canvas 2D is sufficient for this data volume (~89K events). deck.gl adds complexity and a large bundle. Canvas gives pixel-level control for heatmaps and path rendering |
| Individual match JSON files vs. single large file | One monolithic data file | Lazy loading per-match keeps initial load under 1 second. Only the match the user selects gets fetched. Trade-off: more HTTP requests, but each is tiny (<50KB) |
| Custom heatmap vs. heatmap.js library | heatmap.js or h337 | Custom implementation is ~30 lines, renders directly on the same canvas, and avoids another dependency. Trade-off: less sophisticated interpolation, but sufficient for the use case |

## What I'd Do With More Time

1. **Zoom and pan** on the minimap for detailed inspection of specific areas
2. **Player search** - find a specific player across all their matches
3. **Side-by-side map comparison** - compare heatmaps across days to see behavioral shifts
4. **Storm visualization** - animate the storm boundary moving across the map over time
5. **Cluster analysis** - automatically detect and label hotspots (fight zones, camping spots, dead zones)
6. **Export** - let designers export specific views as images or data for team presentations
