# Sakura Estate Prototype

Static Three.js environment prototype for a voxel-inspired Japanese sakura
house. This restart focuses only on modeling, mood, movement, and boundaries.
Portfolio content can be assigned to rooms later.

## Run locally

```powershell
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Controls

- `W/S`: move forward and backward
- `A/D` or arrow keys: turn camera
- `Q/E`: strafe left and right
- `Shift`: move faster
- Mouse / click-drag: look around

## Current Layout

- Bridge approach over water
- Gate and lantern entry
- Warm voxel-inspired house exterior
- Main hall
- West room
- East room
- Rear room annex
- Walkable interior doorways connecting the hall and rooms
- Warm interior furnishings: lanterns, shelves, cabinets, planters, tables, cushions, books, and vases
- Connected bridge landing that leads visually into the front gate and house entry
- Taller two-story Japanese house silhouette with lighter wood and paper tones
- Brighter light-wood plank flooring throughout the interior
- Scenic water, sakura trees, horizon, and fast time-of-day cycle
- Lightweight gradient skydome with visible sun/moon movement
- Continuous lake around the bridge and house, with shoreline tree rings
- Distant layered mountain ridges behind the house instead of enclosing cone peaks
- Slower time-of-day cycle with brighter daytime and stronger evening lanterns
- Lightweight water shader with subtle vertex waves, reflection bands, and color movement

The playable boundary is intentionally restricted to the bridge, entry platform,
and house interior. The scenery beyond that is decorative.
