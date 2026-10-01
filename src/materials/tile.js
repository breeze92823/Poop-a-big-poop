import { Color, MeshStandardMaterial } from 'three'
import { GROUT } from '../data/world.js'

// Porcelain-park surface: same trick as Stone-Skipping's lego material —
// everything is computed in world space from the surface normal, so adjacent
// boxes line up with no UV work and the pattern never stretches when a box is
// scaled. Here each cell is a glazed tile: a two-colour checker, a thin grout
// line between cells, a soft bevel highlight lit from the upper-left, and
// per-tile speckle so the floor doesn't read as flat vector colour.
//
// `top`/`top2` colour upward faces, `side`/`side2` everything else (default to
// top). `checker` is the cell size in metres (0 = plain colour). `grout` is
// the grout colour (omit for no grout). `mottle` (0-1) adds soft world-space
// value-noise blotches `mottleScale` metres across, for grass and rock that
// should read as painted texture rather than tiles. Materials are cached by
// options.
const cache = new Map()

const VERTEX_DECL = /* glsl */ `
varying vec3 vTilePos;
varying vec3 vTileNormal;
`

const VERTEX_BODY = /* glsl */ `
vec4 tlWP = vec4(transformed, 1.0);
vec3 tlObjN = objectNormal;
#ifdef USE_INSTANCING
  tlWP = instanceMatrix * tlWP;
  tlObjN = mat3(instanceMatrix) * tlObjN;
#endif
tlWP = modelMatrix * tlWP;
vTilePos = tlWP.xyz;
vTileNormal = normalize(mat3(modelMatrix) * tlObjN);
`

const FRAGMENT_DECL = /* glsl */ `
varying vec3 vTilePos;
varying vec3 vTileNormal;
uniform vec3 tileTopA;
uniform vec3 tileTopB;
uniform vec3 tileSideA;
uniform vec3 tileSideB;
uniform vec3 tileGrout;
uniform float tileChecker;
uniform float tileGroutW;
uniform float tileSpeckle;
uniform float tileGroutOn;
uniform float tileMottle;
uniform float tileMottleScale;

float tlHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tlNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(tlHash(i), tlHash(i + vec2(1.0, 0.0)), f.x),
             mix(tlHash(i + vec2(0.0, 1.0)), tlHash(i + vec2(1.0, 1.0)), f.x), f.y);
}
`

const FRAGMENT_BODY = /* glsl */ `
{
  vec3 tlN = normalize(vTileNormal);
  vec3 tlA = abs(tlN);
  vec2 tlUV = tlA.y > 0.5 ? vTilePos.xz : (tlA.x > tlA.z ? vTilePos.zy : vTilePos.xy);
  float tlTop = step(0.5, tlN.y);

  float tlCh = 0.0;
  vec2 tlCell = vec2(0.0);
  vec2 tlF = vec2(0.5);
  if (tileChecker > 0.0) {
    vec2 tlS = tlUV / tileChecker;
    tlCell = floor(tlS + 1e-3);
    tlF = fract(tlS + 1e-3);
    tlCh = mod(tlCell.x + tlCell.y, 2.0);
  }
  vec3 tlCol = mix(mix(tileSideA, tileSideB, tlCh), mix(tileTopA, tileTopB, tlCh), tlTop);

  // Speckle: a tiny per-tile brightness shift plus fine grain.
  float tlTile = tlHash(tlCell + tlTop * 17.0);
  tlCol *= 1.0 + tileSpeckle * ((tlTile - 0.5) * 0.10 + (tlHash(floor(tlUV * 24.0)) - 0.5) * 0.05);

  if (tileMottle > 0.0) {
    vec2 tlM = tlUV / tileMottleScale;
    float tlN = (tlNoise(tlM) - 0.5) * 0.55 + (tlNoise(tlM * 3.7 + 11.0) - 0.5) * 0.3 + (tlNoise(tlM * 11.0 - 7.0) - 0.5) * 0.15;
    tlCol *= 1.0 + tileMottle * tlN;
  }

  if (tileChecker > 0.0) {
    float tlW = fwidth(tlUV.x) + fwidth(tlUV.y);
    // Fade grout/bevel out once a cell is only a few pixels wide.
    float tlFade = 1.0 - smoothstep(0.08, 0.35, tlW / tileChecker * 6.0);
    vec2 tlE = min(tlF, 1.0 - tlF) * tileChecker; // metres to nearest cell edge
    float tlD = min(tlE.x, tlE.y);
    float tlLine = (1.0 - smoothstep(tileGroutW - tlW, tileGroutW + tlW, tlD)) * tileGroutOn;
    // Bevel: bright upper-left rim, dim lower-right rim, just inside the grout.
    float tlBev = 1.0 - smoothstep(tileGroutW, tileGroutW + 0.1, tlD);
    float tlLit = clamp(dot(normalize(tlF - 0.5 + 1e-4), vec2(-0.7071, 0.7071)), -1.0, 1.0);
    tlCol *= 1.0 + tlFade * tlBev * tlLit * 0.12 * tlTop;
    tlCol = mix(tlCol, tileGrout, tlLine * (0.3 + 0.7 * tlFade) * tlTop);
  }
  diffuseColor.rgb *= tlCol;
}
`

export function tileMaterial(options) {
  const key = JSON.stringify(options)
  const cached = cache.get(key)
  if (cached) return cached

  const {
    top = '#ffffff',
    top2,
    side,
    side2,
    checker = 0,
    grout,
    speckle = 1,
    mottle = 0,
    mottleScale = 2,
    roughness = 0.5,
    ...rest
  } = options
  const material = new MeshStandardMaterial({ color: '#ffffff', roughness, metalness: 0, ...rest })

  const uniforms = {
    tileTopA: { value: new Color(top) },
    tileTopB: { value: new Color(top2 ?? top) },
    tileSideA: { value: new Color(side ?? top) },
    tileSideB: { value: new Color(side2 ?? side ?? top2 ?? top) },
    tileGrout: { value: new Color(grout ?? '#000000') },
    tileChecker: { value: checker },
    tileGroutW: { value: GROUT },
    tileSpeckle: { value: speckle },
    tileGroutOn: { value: grout ? 1 : 0 },
    tileMottle: { value: mottle },
    tileMottleScale: { value: mottleScale },
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERTEX_DECL}`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAGMENT_DECL}`)
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_BODY}`)
  }
  material.customProgramCacheKey = () => 'tile-v2'

  cache.set(key, material)
  return material
}

export const PALETTE = {
  grass: '#4f7e2e',
  grassRim: '#3b6623',
  dirt: '#a65a36',
  dirt2: '#9a5232',
  rock: '#94573a',
  marble: '#eeeeea',
  stone: '#7d7f86',
  wood: '#6e4529',
  woodLight: '#9a6a43',
  poop: '#6b3f1d',
  npc: '#5a2f17',
  leaf: '#2b5a22',
  leafLight: '#4a7d3a',
  bark: '#5b3220',
  potty: '#d8b98c',
  pottyRoof: '#8a5a35',
  metal: '#9aa0a8',
  glass: '#dff3f6',
  glow: '#38a6ff',
}
