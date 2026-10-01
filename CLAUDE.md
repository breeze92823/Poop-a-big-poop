# Poop a Big Poop

3D park game. Vite + React 18 + @react-three/fiber 8 + three 0.171 + zustand, plain JS/JSX. Same architecture as ../Stone-Skipping.

- `npm run dev` / `npm run build`; `.env.example` documents `VITE_DEV_MODE` (skips the Bloxity SDK/CDN).
- `systems/` is framework-free (no React); all SDK calls go through `systems/bloxity.js` and must never throw.
- World layout lives in `data/world.js` (metres, +X east, +Z south): a floating 20-gon island, radius 26, with every prop position and the `OBSTACLES` collision circles. Surfaces use `materials/tile.js` (world-space checker + grout + `mottle` noise shader); procedural canvas textures (sky, pad swirl, signs) live in `utils/textures.js`.
- `LANDMARKS.md` names every island prop and HUD element (with position, world.js constant and component); use those names and keep it updated when props move or are added.

## Multiplayer / saving
All Colyseus traffic goes through `systems/net.js` (server: `../Poop-a-big-poop-backend`, `lobby` room); it never blocks gameplay when the server is absent. `VITE_SERVER_URL_DEV` / `VITE_SERVER_URL_MAIN` (repo variables `SERVER_URL_DEV` / `SERVER_URL_MAIN` in the deploy workflow) pick the URL. `move` relays position, yaw, gait and `grounded`; `components/RemotePlayers.jsx` renders every other session with the same character as `Player.jsx` (+ `Nametag.jsx`). Signed-in players are saved (`saveProgress`, debounced) and restored (`progress`): money, lifetime counters, the poop inventory (`poop.js` `getProgress`/`hydrate`), the daily boost (`boost.js`) and the Save Food Effects stall (`foodFx.js`). The pantry is deliberately not saved, since surviving a reload is what Save Food Effects sells. Saves wait until the server has answered (`progress`/`noProgress`), so starting values never overwrite a save. No poop-drop event is synced (the world `poops` array is not filled), and the Cliff Board doesn't draw `subscribeLeaderboard` data yet.
