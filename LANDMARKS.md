# Island Landmarks

Use these names when you ask for changes to the island. Each entry gives the
landmark's position, the constant in [src/data/world.js](src/data/world.js)
that places it, and the component that draws it.

**Coordinates:** metres. **+X = east**, **+Z = south**, **Y = up**.
Positions are `(x, z)` ground centres. The player spawns on the Swirl Pad
facing **north**, toward the Market.

**How to read the map:** top-down, north up, drawn to scale (1 column = 1 m
east-west, 1 row = 2 m north-south, so it looks slightly wide). The `x` numbers
run along the top and the `z` numbers down the left edge, in metres from the
island centre. `#` is the island rim (approximate; the real shape is a 20-gon)
and `:` is the Swirl Pad.

```
            -20       -10        0        10        20       
                        ###################
                    ####     t             ####
 -20             ###            b             k###
               ##                               k ##
             ##                 P                  k##
            #             R  h     s  B             k #
           #            V                M       b   EE#EE
 -10      #                     $                  EEEEE#EE
         #      T            :::::::::             EEEEEE#EE
        #  N      F        :::       :::       C r  EEEEEE#
        #  d              ::           ::         r  eeee #
        b                 ::           ::           eeeee #
   0   W#WWWWW            ::           ::                 b
      WW#WWWWW            :::         :::           J     #
      WW#WWWWc              :::  @  :::                   #
        #WWWW b                :::::                      #
         #                                               #
  10      #     N                                       #
           #      d                           Y        #
            #                              K          #
             ##                            b        ##
               ##                         t       ##
  20             ###             t  b          ###
                    ####                   ####
                        ###################
```

| Mark | Landmark | Mark | Landmark |
|---|---|---|---|
| `@` | Spawn (pad centre is 1.5 m north) | `R` `B` | Red Stall, Blue Stall |
| `Y` | Yellow Stall | `T` | Teal Stall |
| `V` `M` | Value Sign, Money Sign | `F` `K` | Save Food Sign, Boost Sign |
| `P` | Potty | `$` | Cash Pile |
| `h` `s` | SHOP Sign, SELL Sign | `t` | Trees (North, South, Boost) |
| `b` | Bushes | `W` | West Cliff (footprint) |
| `E` `e` | East Cliff, East Step (footprints) | `k` | NE Blocks 1-4 |
| `N` `d` | Reward NPC, its board (South) | `c` `C` | Marble Column, Toppled Column |
| `r` | Rim Rocks | `J` | Locked Jar |

---

## The island itself

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **Island** | centre (0, 0) | `ISLAND` | [Island.jsx](src/components/Island.jsx) | 20-sided slab, radius 26, 8 m deep, narrows to 23.5 at the bottom. Grass top, dirt sides. |
| **Grass Rim** | island edge | `ISLAND` | Island.jsx | Darker green band wrapping over the top of the dirt wall. |
| **Island Edge Wall** | radius ≈ 25.1 | `ISLAND.rimInset` | [playerMovement.js](src/systems/playerMovement.js) | Invisible wall that keeps the player on the island. |
| **Swirl Pad** | (0, -1.5), radius 7 | `PAD` | Island.jsx | Grey disc with a dark ring and a three-tier poop swirl drawing (`padTexture` in [textures.js](src/utils/textures.js)). |
| **Spawn** | (0, 3), facing north | `SPAWN`, `SPAWN_FACING` | [main.jsx](src/main.jsx) | On the south half of the Swirl Pad. |

## North: the Market

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **Red Stall** | (-7.1, -14) | `STALLS[0]` | [Market.jsx](src/components/Market.jsx) | Food stand (`VendorStall`): square wooden posts, flat red/white striped awning, two-plank fence with a grey counter rail. Faces the pad. |
| **Food Vendor** | behind the Red Stall counter | `STALLS[0].vendor`, `.look` | Market.jsx (`Vendor`) | Blocky shopkeeper with long ginger hair and a navy shirt, green "BUY FOOD" tag overhead. |
| **Poop Value Sign** | (-9.4, -11.2) | `VALUE_SIGN` | Market.jsx (`BigSign`) | Big plank board reading "INCREASE POOP VALUE", west of the Red Stall, angled toward it. |
| **Blue Stall** | (4.9, -13.7) | `STALLS[1]` | Market.jsx (`VendorStall`) | Sell stand: square wooden posts, flat blue/white striped awning, two-plank fence with a grey counter rail. Faces the pad. |
| **Poop Buyer** | behind the Blue Stall counter | `STALLS[1].vendor` | Market.jsx (`Vendor`) | Blocky shopkeeper in a denim shirt with short brown hair, white "SELL POOP" tag overhead. |
| **Make Money Sign** | (8.5, -12.6) | `MONEY_SIGN` | Market.jsx (`BigSign`) | Big plank board reading "MAKE MONEY", east of the Blue Stall, angled toward it. |
| **Potty** | (-1.1, -15.6) | `POTTY` | Market.jsx | Tan porta-potty, door with an orange moon. |
| **Cash Pile** | (-1.1, -10.6) | `CASH` | Market.jsx | Mound of green banknote bundles. |
| **SELL Sign** | (1.8, -14.4) | `SIGNS[0]` | Market.jsx | Small picket sign between the Potty and the Blue Stall. |
| **SHOP Sign** | (-4.2, -14.6) | `SIGNS[1]` | Market.jsx | Small picket sign between the Red Stall and the Potty. |
| **North Tree** | (-4, -22) | `TREES[0]` | [Vegetation.jsx](src/components/Vegetation.jsx) | Bare, leafless tree on the north edge. |
| **North Bush** | (-1.2, -20.6) | `TREES[0].bush` | Vegetation.jsx | Leafy bush beside the North Tree. |

## West: the West Cliff

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **West Cliff** | (-23.2, 2.6) | `CLIFFS[0]` | [Cliffs.jsx](src/components/Cliffs.jsx) | Rock pillar 10 m tall with a grass top. |
| **Cliff Board** | on top of the West Cliff | — | Cliffs.jsx (`CliffBoard`) | Dark leaderboard on two posts, facing the pad. |
| **Marble Column** | (-19.9, 5) | `COLUMNS[0]` | [Landmarks.jsx](src/components/Landmarks.jsx) | White Ionic column, 5.2 m, standing at the cliff's foot. |
| **Column Bush** | (-19.4, 6.8) | `BUSHES[0]` | Vegetation.jsx | Bush at the base of the Marble Column. |
| **West Rim Bush** | (-25.2, -1.4) | `BUSHES[3]` | Vegetation.jsx | Small bush behind the West Cliff. |
| **Teal Stall** | (-16.6, -8.6) | `STALLS[3]` | Market.jsx (`VendorStall`) | Limited-time food stand: square wooden posts, flat teal/white striped awning, two-plank fence with a grey counter rail. Faces the pad. |
| **Deal Vendor** | behind the Teal Stall counter | `STALLS[3].vendor`, `.look` | Market.jsx (`Vendor`) | Ginger long-haired shopkeeper in navy, teal "24 HOURS ONLY" tag overhead. |
| **Save Food Sign** | (-14.8, -5.4) | `FOOD_SIGN` | Market.jsx (`BigSign`) | Big plank board reading "SAVE FOOD EFFECTS" in teal letters, south-east of the Teal Stall (toward the pad), angled toward it. |
| **Reward NPC** | (-16.6, 9.8) | `NPCS[0]` | Landmarks.jsx (`Npc`) | Brown blocky figure, arm held out, with a "CLAIM ONCE PER 24 HOURS" tag overhead, south-east of the West Cliff. |
| **Reward Board** | (-14.8, 11.2) | `NPCS[0].board` | Landmarks.jsx (`RewardBoard`) | Wooden "DAILY REWARD" board. The lettered side faces the pad. |

## East: the East Cliff

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **East Cliff** | (21.8, -8.6) | `CLIFFS[1]` | Cliffs.jsx | Tallest pillar on the island (11 m), grass top. |
| **East Step** | (21.2, -2.6) | `CLIFFS[2]` | Cliffs.jsx | Short 4.6 m pillar just south of the East Cliff. |
| **NE Blocks** | rim at -35°, -42°, -49°, -56° (≈ (19.3, -13.5) → (13.2, -19.6)) | `BLOCKS` | Cliffs.jsx | Four wide brown terrace blocks along the north-east edge. Number them **NE Block 1–4**, from the cliff outward. |
| **Toppled Column** | base (13.9, -6.6) | `COLUMNS[1]` | Landmarks.jsx | Fallen white column leaning against the East Cliff. |
| **Rim Rocks** | (16.9, -5), (17.9, -4.1), (15.8, -5.9) | `ROCKS` | Cliffs.jsx | Three grey boulders under the Toppled Column. |
| **Cliff Bush** | (16.4, -11.4) | `BUSHES[1]` | Vegetation.jsx | Bush at the East Cliff's north-west foot. |
| **East Bush** | (25, 1) | `BUSHES[2]` | Vegetation.jsx | Bush on the east edge behind the Locked Jar. |
| **Locked Jar** | (19.2, 2.6) | `JAR` | [ChainedJar.jsx](src/components/ChainedJar.jsx) | Glass jar with a slowly spinning poop inside, wrapped in chains, with a yellow padlock facing the pad. |
| **Glow Ring** | under the Locked Jar | `JAR` | ChainedJar.jsx | White disc with a pulsing blue segmented halo and a blue point light. |

## South

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **South Tree** | (0.2, 20.4) | `TREES[1]` | Vegetation.jsx | Bare tree on the south edge. |
| **South Bush** | (3.2, 19) | `TREES[1].bush` | Vegetation.jsx | Bush beside the South Tree. |

## South-east: the Size Boost corner

| Name | Position | Constant | Component | Notes |
|---|---|---|---|---|
| **Yellow Stall** | (13, 11.5) | `STALLS[2]` | Market.jsx (`VendorStall`) | Daily size-boost stand: same build as the Blue Stall with a yellow/white striped awning. Faces the pad. |
| **Boost Vendor** | behind the Yellow Stall counter | `STALLS[2].vendor`, `.look` | Market.jsx (`Vendor`, `Cap`) | Blocky shopkeeper in navy with a peaked officer's cap (gold badge), yellow "SIZE BOOST" tag overhead. |
| **Boost Sign** | (10.5, 13.4) | `BOOST_SIGN` | Market.jsx (`BigSign`) | Dark-brown board with yellow "DAILY SIZE BOOST" lettering, on the Yellow Stall's right as seen from the pad. |
| **Boost Tree** | (9.3, 17.1) | `TREES[2]` | Vegetation.jsx | Bare tree behind the Boost Sign. |
| **Boost Bush** | (10.4, 15.6) | `TREES[2].bush` | Vegetation.jsx | Leafy bush between the Boost Sign and the Boost Tree. |

## Sky & dynamic objects

| Name | Where | Component | Notes |
|---|---|---|---|
| **Sky** | dome around the camera | [Sky.jsx](src/components/Sky.jsx) | Cyan zenith over rows of cartoon clouds (`skyTexture` in textures.js). |
| **Dropped Poops** | behind the player on each tap | [Poops.jsx](src/components/Poops.jsx), [poop.js](src/systems/poop.js) | Pop in, stay 8 s, shrink away. At most 48 at once. |

## UI (HUD)

All in [Hud.jsx](src/components/Hud.jsx) and styled in [index.css](src/index.css).

| Name | Where | Class | Notes |
|---|---|---|---|
| **Home Button** | top-left, first | `.hud-btn-round` | Opens the Bloxity menu. |
| **Menu/Chat Pill** | top-left, second | `.hud-pill` | Hamburger opens the menu. The chat bubble toggles the **Chat Box** and clears the blue **Chat Badge**. |
| **Backpack Button** | top-left, third | `.hud-btn-pack` | Opens the avatar editor when signed in, otherwise sign-in. |
| **Chat Box** | under the top-left buttons | `.hud-chat` | One system welcome line. |
| **Tutorial Banner** | top centre | `.hud-banner` | "Tutorial: Tap To Poop 💩" on a dark blurred cloud. |
| **Money Counter** | bottom-left | `.hud-money` | `$0.00`, +$0.01 per poop (`POOP_VALUE`), bumps on change. |
| **FPS Meter** | top-right | `.hud-fps` | Only shows when the `show_fps` setting is on. |

### Touch controls

Shown only on touch sessions (coarse pointer or first `touchstart`; `<html>` gets `.touch-mode`). All in [TouchControls.jsx](src/components/TouchControls.jsx), state in [input.js](src/systems/input.js).

| Name | Where | Class | Notes |
|---|---|---|---|
| **Move Stick** | lower-left 45% x 58%, floats to the thumb | `.touch-stick-zone` | Analog; walks camera-relative. |
| **Look Zone** | right 54% of the screen | `.touch-look` | Drag orbits the camera, pinch zooms, quick tap poops. |
| **Poop Button** | bottom-right, big | `.touch-btn-big` | Same as tapping. |
| **Jump Button** | bottom-right, left of Poop | `.touch-btn-small` | |
| **Rotate Prompt** | full screen, portrait touch only | `.rotate-prompt` | [RotatePrompt.jsx](src/components/RotatePrompt.jsx); asks for landscape and tries `screen.orientation.lock`. |

---

**Collision:** every solid landmark has a circle in `OBSTACLES` at the bottom
of world.js. If you move a landmark, its collision circle moves with it,
because the circles are built from the same constants.
