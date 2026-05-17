# Sashit Vijay Portfolio

Static portfolio site with two presentation modes:

- `/` is a fast, elegant portfolio inspired by editorial/code-forward sites.
- `/world.html` preserves the interactive Three.js sakura house prototype.

## Run locally

```powershell
python -m http.server 5173
```

Open:

```text
http://localhost:5173
```

## Main Portfolio

- Light and dark theme toggle with local preference storage
- Smooth anchor navigation
- Selected projects with GitHub links
- Experience timeline
- Education, awards, and tech stack
- Contact links and current resume PDF at `assets/SV_CV_26.pdf`
- Link into the interactive portfolio world

## Interactive World Controls

- `W/S`: move forward and backward
- `A/D` or arrow keys: turn camera
- `Q/E`: strafe left and right
- `Shift`: move faster
- `F`: open/close a nearby door
- Click a wall exhibit or press `F` nearby to view portfolio content; press `F` again to close it
- Press `F` near the main table map to enter or exit a focused overhead map view
- `Space`: jump
- Mouse / click-drag: look around

## Current Layout

- Bridge approach over water
- Gate and lantern entry
- Warm voxel-inspired house exterior
- Main hall
- West room
- East room
- Rear room annex
- Personalized entry heading for Sashit Vijay
- Portfolio-first navigation labels with room locations as subtitles
- Tabletop house map in the main hall with a focused overhead camera view
- Side-wall portfolio exhibits that keep the central walking route clear
- Wall-mounted exhibits for Mission, Education, Tech Stack, Experience, Projects, and Contact
- Current resume PDF copied to `assets/SV_CV_26.pdf`
- Larger single-floor house footprint with clearer room zoning
- Sliding shoji-style doors for the west room, east room, rear room, garden, and front entry
- Walkable interior route that uses doors instead of open partition gaps
- Warm interior furnishings: lanterns, shelves, cabinets, planters, tables, cushions, books, and vases
- Connected bridge landing that leads visually into the front gate and house entry
- Single-floor Japanese house layout with lighter wood and paper tones
- Brighter light-wood plank flooring throughout the interior
- Continuous playable route from the starting bridge through the gate and into the house
- Expanded lightweight back garden with sparse sakura trees and fallen petals
- More active water shader with stronger sine-wave motion
- Front entry rail removed so the door and bridge path stay unobstructed
- Brighter interior lighting on the first floor
- Lower scene density, capped pixel ratio, and shared box geometry for smoother movement
- Scenic water, sakura trees, horizon, and fast time-of-day cycle
- Lightweight gradient skydome with visible sun/moon movement
- Continuous lake around the bridge and house, with shoreline tree rings
- Distant layered mountain ridges behind the house instead of enclosing cone peaks
- Slower time-of-day cycle with brighter daytime and stronger evening lanterns
- Lightweight water shader with subtle vertex waves, reflection bands, and color movement

The playable boundary is intentionally restricted to the bridge, entry platform,
and house interior. The scenery beyond that is decorative.
