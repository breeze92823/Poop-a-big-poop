# Poop a Big Poop

3D park game. Vite + React 18 + @react-three/fiber 8 + three 0.171 + zustand, plain JS/JSX. Same architecture as ../Stone-Skipping.

- `npm run dev` / `npm run build`; `.env.example` documents `VITE_DEV_MODE` (skips the Bloxity SDK/CDN).
- `systems/` is framework-free (no React); all SDK calls go through `systems/bloxity.js` and must never throw.
- World layout lives in `data/world.js` (metres, +X east, +Z south): a floating 20-gon island, radius 26, with every prop position and the `OBSTACLES` collision circles. Surfaces use `materials/tile.js` (world-space checker + grout + `mottle` noise shader); procedural canvas textures (sky, pad swirl, signs) live in `utils/textures.js`.
- `LANDMARKS.md` names every island prop and HUD element (with position, world.js constant and component); use those names and keep it updated when props move or are added.
