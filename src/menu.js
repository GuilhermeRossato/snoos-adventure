import {initState} from './init.js';
import {renderingState} from './modules/rendering.js';
import {initSprites, SpriteBatch} from './modules/sprites.js';
const menuState = {
  active: false,
  last: 0,
}

/** @type {HTMLCanvasElement} */
let canvas;

/** @type {WebGLRenderingContext} */
let gl;

/** @type {SpriteBatch} */
let spriteBatch;

function initializeSpriteBatch(gl, canvas) {
  const maxSprites = 1000;
  // Example value
  spriteBatch = new SpriteBatch(gl,canvas.width,canvas.height,maxSprites);
  console.log('SpriteBatch initialized:', spriteBatch);

  // Add a few sprites
  const spriteSize = 32;
  // Example sprite size
  for (let i = 0; i < 5; i++) {
    const x = Math.random() * (canvas.width - spriteSize);
    const y = Math.random() * (canvas.height - spriteSize);
    const sprite = spriteBatch.createSprite(x, y, spriteSize, spriteSize, 0, 0, spriteSize, spriteSize, [Math.random(), Math.random(), Math.random(), 1]);
    if (!sprite) {
      console.error('Failed to create sprite', 'index:', i);
    } else {
      console.log('Sprite created:', sprite);
    }
  }
}

function renderLoop(time) {
  debugger ;const dt = menuState.last ? (time - menuState.last) / 1000 : 0;
  console.log('renderLoop: dt:', dt);
  menuState.last = time;
  menuState.active = true;

  gl.clear(gl.COLOR_BUFFER_BIT);
  const sampleBatches = [spriteBatch];
  // Example array of sprite batches
  const sampleVelocitiesLists = [new Array(spriteBatch.spriteCount).fill(0).map( () => ({
    x: Math.random() * 100 - 50,
    y: Math.random() * 100 - 50
  }))];
  // Example velocities
  for (let b = 0; b < sampleBatches.length; b++) {
    const batch = sampleBatches[b];
    if (!batch) {
      console.error('renderLoop: missing batch', 'batchIndex:', b);
      continue;
    }
    const velocities = sampleVelocitiesLists[b];
    if (!velocities) {
      console.error('renderLoop: missing velocities array', 'batchIndex:', b);
      continue;
    }
    batch.render();
  }
  requestAnimationFrame(renderLoop);
}

export async function startGameMenu(time, glExt) {
  if (glExt) {
    gl = glExt;
  }
  if (menuState.active) {
    return;
  }
  menuState.last = time;
  menuState.time = 0;
  menuState.active = true;
  menuState.done = false;
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    canvas = document.querySelector('canvas#canvas_webgl');
  }
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('Canvas webgl element not found');
  }
  if (!gl) {
    gl = canvas.getContext('webgl');
  }
  if (!gl) {
    throw new Error('WebGL context not available');
  }
  canvas.style.opacity = '1';
  canvas.style.pointerEvents = 'all';
  // initializeSpriteBatch(gl, canvas);
  const otherCanvas = document.querySelector('canvas#canvas_ctx');
  if (otherCanvas && otherCanvas instanceof HTMLCanvasElement) {
    otherCanvas.style.opacity = '0';
    otherCanvas.style.pointerEvents = 'none';
  }
  const render = await initSprites(initState, renderingState);
  console.log('init: All modules initialized');
  requestAnimationFrame(render);
}
