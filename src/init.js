import { b, bc, ib, ibc } from "../utils/bezier.js";
import { drawHTML5 } from "../utils/drawHTML5.js";
import { expoEase } from "../utils/expoEase.js";
import { initMaps } from "./modules/maps.js";
import { startGameMenu } from "./menu.js";
import { initKeys } from "./modules/keys.js";
import { initGL } from "./modules/webgl.js";
import { initTextures } from "./modules/textures.js";
import { initSprites } from "./modules/sprites.js";
import { executeConcurrently as executeConcurrently } from "../utils/executeConcurrently.js";
import { sleep } from "../utils/sleep.js";

const width = 480;
const height = 480;

/** @type {HTMLCanvasElement} */
let canvas;

/** @type {CanvasRenderingContext2D} */
let ctx;

/** @type {WebGL2RenderingContext} */
let gl;

export const initState = {
  gl,
  active: false,
  start: 0,
  time: 0,
  last: 0,
}

async function init() {
  if (canvas) {
    throw new Error('init: already initialized');
  }
  canvas = document.querySelector('canvas#canvas_ctx');
  if (canvas && canvas instanceof HTMLCanvasElement) {
    ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgb(106, 166, 110)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      initState.active = true;
      requestAnimationFrame(showHtml5Logo);
    }
  }
  const initialRecord = {
    keys: initKeys,
    maps: initMaps,
    textures: initTextures,
    gl: initGL
  };
  const loadedInitialEntries = await executeConcurrently(Object.entries(initialRecord).map(([key, func]) => async () => [key, await func()]));
  const initialRecordLoaded = Object.fromEntries(loadedInitialEntries);
for (const key in initialRecordLoaded) {
  if (!initialRecordLoaded[key] && initialRecordLoaded[key] !== false) {
    console.error(`init: module initialization failed`, 'module:', key);
    throw new Error(`Module initialization failed: ${key}`);
  }
}
  gl = initialRecordLoaded.gl;
  if (!gl) {
    console.error('init: gl initialization failed');
    return;
  }
  initState.gl = gl;
  const {
    atlasCanvas,
    textureLookup,
  } = await initTextures(gl);
  await sleep(100);
  await maps.loadAllMaps();
  const render = await initSprites(gl, atlasCanvas, textureLookup);
  console.log('init: All modules initialized');
  initState.active = false;
  let t = setInterval(() => {
    if (!initState.done) {
      return;
    }
    clearInterval(t);
    requestAnimationFrame(render);
  }, 100);
}

init().then(r => (r !== undefined) && console.log("init() return:", r)).catch(err => { console.log(err);  });

function showHtml5Logo(time) {
  if (!initState.start) {
    initState.start = time;
    initState.time = 0;
    initState.last = time;
  }
  if (initState.done) {
    throw new Error('showHtml5Logo: already done');
  }
  let delta = -(initState.last - (initState.last = time));
  if (delta > 200) delta = 16;
  if (!initState.active) delta *= 3;
  initState.time += delta;
  renderHtml5Logo(initState.time);
  if (initState.time > 3600) {
    initState.time = 3600;
    initState.done = true;
    try {
      startGameMenu(time, initState.gl);
    } catch (err) {
      console.error('showHtml5Logo: startGameMenu failed', 'errMsg:', err && err.message);
    }
    return;
  }
  requestAnimationFrame(showHtml5Logo);
}

function renderHtml5Logo(time) {
  const t = Math.min(1, expoEase(b(0, 1, ib(-1000, 2000, time))));
  const scale = bc(0.7, 1.05, bc(0, 1.0, expoEase(ibc(100, 2500, time))));
  drawHTML5(ctx, width / 2 - 90 * scale, height / 2 - ((255 + 30) / 2) * scale, scale, t);
  if (time >= 1700) {
    ctx.fillStyle = `rgba(240,240,240,${bc(0, 1, ib(2000, 2500, time))})`;
    ctx.strokeStyle = `#ccc`;
    const stage = b(0, 255, ib(2000, 3250, time));
    const x = (width / 2) - 150 + 2;
    const y = 0.2 + (height / 2 - 255 / 2) + 266 + 2;
    const progress = Math.min(1, stage / 255);
    ctx.fillRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 296 * progress, 14 + 0.5);
    ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 296 + 0.5, 14 + 0.5);
  }
  if (time > 3000) {
    ctx.globalAlpha = 1 - Math.min(1, expoEase(b(0, 1, ib(3250, 3500, time))));
  }
}

