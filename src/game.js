import { g } from "../utils/g.js";
import { initState } from "./init.js";
import { initProgram } from "./initProgram.js";
import { loadTextures } from "./loadTextures.js";
import { logPerf } from "./perf.js";

export const textures = {
  "stone": {
    "texture": "./assets/stone.png",
  },
  "ice": {
    "texture": "./assets/ice.png",
  },
  "wood": {
    "texture": "./assets/wood.png",
  },
}

const promise = loadTextures();

export const textureLookup = {};

export const worldOffset = { x: 0, y: 0 };

export default function startGameLoop(update) {
  if (typeof update !== 'function') {
    console.error('startGameLoop: invalid update callback', 'type:', typeof update);
    return {
      run: () => { console.error('startGameLoop.run: aborted, bad update'); },
      stop: () => { console.error('startGameLoop.stop: no-op, bad update'); }
    };
  }
  let running = false;
  let lastTime = 0;
  initState.loop = false;

  function frame(t) {
    if (!running) {
      console.log('startGameLoop: frame exit (not running)', 't:', t);
      return;
    }
    logPerf(t);
    const dt = lastTime ? (t - lastTime) / 1000 : 0;
    lastTime = t;
    try {
      const res = update(t, dt); 
      if (res === false) {
        console.log('startGameLoop: update requested stop', 't:', t.toFixed(2));
        running = false;
        return;
      }
    } catch (err) {
      console.error('startGameLoop: update threw', 'errMsg:', err && err.message);
      running = false;
      return;
    }
    if (running) {
      window.customRequestAnimationFrame(frame);
    }
  }

  return {
    run() {
      if (running) {
        console.log('startGameLoop.run: already running');
        return;
      }
      running = true;
      lastTime = 0;
      console.log('startGameLoop.run: starting');
      window.customRequestAnimationFrame(frame);
    },
    stop() {
      if (!running) {
        console.log('startGameLoop.stop: already stopped');
        return;
      }
      running = false;
      console.log('startGameLoop.stop: flag set');
    }
  };
}

class SpriteBatch {
  // added tintBuffer and tintLoc parameters (tint buffer comes before attribute locations)
  constructor(gl, canvasW, canvasH, texW, texH, maxSprites, positionBuffer, texcoordBuffer, tintBuffer, posLoc, texLoc, tintLoc) {
    console.log('SpriteBatch: constructing', maxSprites);
    // Constants to avoid magic numbers (optimization from test3.js style)
    this.VERTS_PER_SPRITE = 6;
    this.POS_COMPONENTS = 2;
    this.UV_COMPONENTS = 2;
    this.TINT_COMPONENTS = 4;
    this._floatsPerPosSprite = this.VERTS_PER_SPRITE * this.POS_COMPONENTS;      // 12
    this._floatsPerUvSprite = this.VERTS_PER_SPRITE * this.UV_COMPONENTS;        // 12
    this._floatsPerTintSprite = this.VERTS_PER_SPRITE * this.TINT_COMPONENTS;    // 24
    this.gl = gl;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.texW = texW;
    this.texH = texH;
    this.maxSprites = maxSprites;
    this.positionBuffer = positionBuffer;
    this.texcoordBuffer = texcoordBuffer;
    this.tintBuffer = tintBuffer;
    this.posLoc = posLoc;
    this.texLoc = texLoc;
    this.tintLoc = tintLoc;
    this.spriteCount = 0;
    // Allocate typed arrays using computed sizes
    this.positions = new Float32Array(maxSprites * this._floatsPerPosSprite);
    this.texcoords = new Float32Array(maxSprites * this._floatsPerUvSprite);
    this.tints = new Float32Array(maxSprites * this._floatsPerTintSprite);
    this.dirty = new Set();
    this._sprites = [];
    this._dirtyFlags = new Uint8Array(maxSprites);
    this.offset = { x: 0, y: 0 };
    console.log('SpriteBatch: constructed',
      'canvasW:', canvasW, 'canvasH:', canvasH,
      'texW:', texW, 'texH:', texH,
      'maxSprites:', maxSprites,
      'floatsPosPerSprite:', this._floatsPerPosSprite,
      'floatsUvPerSprite:', this._floatsPerUvSprite,
      'floatsTintPerSprite:', this._floatsPerTintSprite,
      'tintLoc:', this.tintLoc);
  }
  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint) {
    console.log('SpriteBatch.createSprite: creating sprite', this.spriteCount);
    if (this.spriteCount >= this.maxSprites) {
      console.error('SpriteBatch.createSprite: capacity full', 'spriteCount:', this.spriteCount, 'maxSprites:', this.maxSprites);
      return null;
    }
    const index = this.spriteCount++;
    // tint: optional array [r,g,b,weight] default -> no tint (white,0)
    const t = Array.isArray(tint) && tint.length >= 4 ? tint.slice(0, 4) : [1.0, 1.0, 1.0, 0.0];
    const sprite = { index, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint: t };
    this._sprites.push(sprite);
    this.updateSprite(index);
    // console.log('SpriteBatch.createSprite: sprite created', 'index:', index, 'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH,       'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH, 'spriteCount:', this.spriteCount, 'tint:', t);
    return sprite;
  }
  _getSprite(index) {
    return this._sprites[index] || null;
  }
  attachSpritesArray(arr) {
    console.log('SpriteBatch.attachSpritesArray: deprecated call ignored', 'incomingLen:', arr.length);
  }
  updateSprite(index) {
    if (index < 0 || index >= this.spriteCount) {
      console.error('SpriteBatch.updateSprite: index out of range', 'index:', index, 'spriteCount:', this.spriteCount);
      return;
    }
    const spr = this._getSprite(index);
    if (!spr) {
      console.error('SpriteBatch.updateSprite: sprite missing', 'index:', index);
      return;
    }
    if (spr.dstW <= 0 || spr.dstH <= 0 || spr.srcW <= 0 || spr.srcH <= 0) {
      console.error('SpriteBatch.updateSprite: invalid sizes', 'index:', index,
        'dstW:', spr.dstW, 'dstH:', spr.dstH, 'srcW:', spr.srcW, 'srcH:', spr.srcH);
      return;
    }

    // Apply batch offset and global world offset to compute final world position
    const worldX = spr.dstX + this.offset.x + (worldOffset && worldOffset.x ? worldOffset.x : 0);
    const worldY = spr.dstY + this.offset.y + (worldOffset && worldOffset.y ? worldOffset.y : 0);

    const left = (worldX / this.canvasW) * 2 - 1;
    const right = ((worldX + spr.dstW) / this.canvasW) * 2 - 1;
    const top = - (worldY / this.canvasH) * 2 + 1;
    const bottom = - ((worldY + spr.dstH) / this.canvasH) * 2 + 1;
    const u0 = spr.srcX / this.texW;
    const u1 = (spr.srcX + spr.srcW) / this.texW;
    const v0 = spr.srcY / this.texH;
    const v1 = (spr.srcY + spr.srcH) / this.texH;
    const base = index * this._floatsPerPosSprite;
    // Positions
    this.positions.set([
      left, bottom,
      right, bottom,
      left, top,
      right, bottom,
      right, top,
      left, top
    ], base);
    // Texcoords
    this.texcoords.set([
      u0, v1,
      u1, v1,
      u0, v0,
      u1, v1,
      u1, v0,
      u0, v0
    ], base);
    // Tints
    const tintBase = index * this._floatsPerTintSprite;
    const t = spr.tint;
    for (let v = 0; v < this.VERTS_PER_SPRITE; v++) {
      const off = tintBase + v * this.TINT_COMPONENTS;
      this.tints[off + 0] = t[0];
      this.tints[off + 1] = t[1];
      this.tints[off + 2] = t[2];
      this.tints[off + 3] = t[3];
    }
    this.dirty.add(index);
    this._dirtyFlags[index] = 1;
    /*
    console.log('SpriteBatch.updateSprite: updated sprite', 'index:', index,
      'localPosX:', spr.dstX.toFixed(2), 'localPosY:', spr.dstY.toFixed(2),
      'worldX:', worldX.toFixed(2), 'worldY:', worldY.toFixed(2),
      'batchOffsetX:', this.offset.x.toFixed(2), 'batchOffsetY:', this.offset.y.toFixed(2),
      'worldOffsetX:', (worldOffset && worldOffset.x) ? worldOffset.x.toFixed(2) : '0.00',
      'worldOffsetY:', (worldOffset && worldOffset.y) ? worldOffset.y.toFixed(2) : '0.00',
      'posBaseFloats:', base, 'dirtyCountSet:', this.dirty.size,
      'dstW:', spr.dstW, 'dstH:', spr.dstH, 'srcX:', spr.srcX, 'srcY:', spr.srcY, 'srcW:', spr.srcW, 'srcH:', spr.srcH, 'tint:', t);
  */  }
  uploadDirty() {
    const gl = this.gl;
    if (this.dirty.size === 0) {
      console.log('SpriteBatch.uploadDirty: no dirty sprites');
      return;
    }
    const indices = Array.from(this.dirty).sort((a, b) => a - b);
    let rangeStart = indices[0];
    let prev = rangeStart;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    for (let i = 1; i <= indices.length; i++) {
      const curr = indices[i];
      if (curr === prev + 1) {
        prev = curr;
        continue;
      }
      const count = (prev - rangeStart + 1);
      const floatStart = rangeStart * this._floatsPerPosSprite;
      const floatCount = count * this._floatsPerPosSprite;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.positions.subarray(floatStart, floatStart + floatCount));
      rangeStart = curr;
      prev = curr;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    rangeStart = indices[0];
    prev = rangeStart;
    for (let i = 1; i <= indices.length; i++) {
      const curr = indices[i];
      if (curr === prev + 1) {
        prev = curr;
        continue;
      }
      const count = (prev - rangeStart + 1);
      const floatStart = rangeStart * this._floatsPerUvSprite;
      const floatCount = count * this._floatsPerUvSprite;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.texcoords.subarray(floatStart, floatStart + floatCount));
      rangeStart = curr;
      prev = curr;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
    rangeStart = indices[0];
    prev = rangeStart;
    for (let i = 1; i <= indices.length; i++) {
      const curr = indices[i];
      if (curr === prev + 1) {
        prev = curr;
        continue;
      }
      const count = (prev - rangeStart + 1);
      const floatStart = rangeStart * this._floatsPerTintSprite;
      const floatCount = count * this._floatsPerTintSprite;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.tints.subarray(floatStart, floatStart + floatCount));
      rangeStart = curr;
      prev = curr;
    }

    this.dirty.clear();
    this._dirtyFlags.fill(0);
    // console.log('SpriteBatch.uploadDirty: completed', 'rangesProcessed:', indices.length);
  }
  render() {
    const gl = this.gl;
    if (this.spriteCount === 0) {
      console.log('SpriteBatch.render: no sprites');
      return;
    }
    this.uploadDirty();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.enableVertexAttribArray(this.texLoc);
    gl.vertexAttribPointer(this.texLoc, 2, gl.FLOAT, false, 0, 0);

    // Bind tint attribute
    if (typeof this.tintLoc === 'number' && this.tintLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
      gl.enableVertexAttribArray(this.tintLoc);
      gl.vertexAttribPointer(this.tintLoc, 4, gl.FLOAT, false, 0, 0);
    } else {
      console.log('SpriteBatch.render: tintLoc invalid, skipping tint attribute bind', 'tintLoc:', this.tintLoc);
    }

    gl.drawArrays(gl.TRIANGLES, 0, this.spriteCount * 6);
    // console.log('SpriteBatch.render: drawArrays issued', 'spriteCount:', this.spriteCount, 'verts:', this.spriteCount * 6);
  }
}

// Added helpers
function isPowerOf2(v) {
  return (v & (v - 1)) === 0 && v !== 0;
}

async function initGL(canvas, retry = true) {
  if (!canvas) {
    console.error('initGL: missing canvas');
    return null;
  }
  const gl = canvas.getContext('webgl');
  if (!gl) {
    if (retry) {
      const parent = canvas.parentElement;
      const html = parent.innerHTML;
      while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
      }
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          parent.innerHTML = html;
          setTimeout(() => {
            initGL(document.querySelector('canvas'), false).then(resolve, reject);
          }, 100);
        }, 100);
        console.warn('initGL: webgl context creation failed, canvas reset attempted');
      });
    }
    return null;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(106/255, 166/255, 110/255, 1);
  
  console.log('initGL: context ready', 'viewportW:', canvas.width, 'viewportH:', canvas.height);
  return gl;
}

function createAtlasTexture(gl, atlasCanvas) {
  if (!gl || !atlasCanvas) {
    console.error('missing gl/atlasCanvas', 'glOk:', !!gl, 'canvasOk:', !!atlasCanvas);
    return null;
  }
  const tex = gl.createTexture();
  if (!tex) {
    console.error('gl.createTexture failed');
    return null;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    console.log('texImage2D success', 'w:', atlasCanvas.width, 'h:', atlasCanvas.height);
  } catch (err) {
    console.error('texImage2D failed', 'errMsg:', err && err.message);
    return null;
  }
  const pot = isPowerOf2(atlasCanvas.width) && isPowerOf2(atlasCanvas.height);
  if (pot) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('mipmaps generated (POT)');
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('NPOT clamp + linear');
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

function createBatch(gl, canvas, atlasCanvas, posLoc, texLoc, tintLoc) {
  if (!gl || !canvas || !atlasCanvas) {
    console.error('createBatch: missing params', 'glOk:', !!gl, 'canvasOk:', !!canvas, 'atlasOk:', !!atlasCanvas);
    return null;
  }
  const maxSprites = 128;
  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    console.error('createBatch: positionBuffer failed');
    return null;
  }
  const texcoordBuffer = gl.createBuffer();
  if (!texcoordBuffer) {
    console.error('createBatch: texcoordBuffer failed');
    return null;
  }
  const tintBuffer = gl.createBuffer();
  if (!tintBuffer) {
    console.error('createBatch: tintBuffer failed');
    return null;
  }
  // Construct batch first (optimization: allocate buffers using actual byteLength like test3.js)
  const batch = new SpriteBatch(gl, canvas.width, canvas.height, atlasCanvas.width, atlasCanvas.height,
    maxSprites, positionBuffer, texcoordBuffer, tintBuffer, posLoc, texLoc, tintLoc);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.positions.byteLength, gl.DYNAMIC_DRAW);
  console.log('createBatch: positionBuffer allocated', 'bytes:', batch.positions.byteLength);
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.texcoords.byteLength, gl.DYNAMIC_DRAW);
  console.log('createBatch: texcoordBuffer allocated', 'bytes:', batch.texcoords.byteLength);
  gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.tints.byteLength, gl.DYNAMIC_DRAW);
  console.log('createBatch: tintBuffer allocated', 'bytes:', batch.tints.byteLength);
  batch.offset = { x: 0, y: 0 };
  console.log('createBatch: batch ready', 'maxSprites:', maxSprites);
  return batch;
}

export let sampleBatches = [];
export let sampleBatch = null; // first batch kept for backward compatibility
let sampleVelocitiesLists = []; // array of velocity arrays (per batch)

function createSampleSprites(batch, lookup, canvas) {
  if (!batch || !lookup || !canvas) {
    console.error('createSampleSprites: missing params', 'batchOk:', !!batch, 'lookupKeys:', Object.keys(lookup).length, 'canvasOk:', !!canvas);
    return [];
  }
  const keys = Object.keys(lookup);
  if (keys.length === 0) {
    console.error('createSampleSprites: empty lookup');
    return [];
  }
  const velocities = [];
  const COUNT = Math.min(16, keys.length * 10);
  console.log('createSampleSprites: creating sprites', 'count:', COUNT, 'lookupKeys:', keys.length);
  for (let i = 0; i < COUNT; i++) {
    const key = keys[i % keys.length];
    const info = lookup[key];
    if (!info) {
      console.error('createSampleSprites: info missing', 'key:', key);
      continue;
    }
    const x = Math.floor(Math.random() * Math.max(0, canvas.width - info.w));
    const y = Math.floor(Math.random() * Math.max(0, canvas.height - info.h));
    const spr = batch.createSprite(x, y, info.w, info.h, info.x, info.y, info.w, info.h, [1, 1, 1, 0]);
    if (!spr) {
      console.error('createSampleSprites: sprite create failed', 'i:', i);
      continue;
    }
    velocities.push({ vx: (Math.random() * 120 - 60), vy: (Math.random() * 120 - 60) });
  }
  // console.log('createSampleSprites: done', 'created:', velocities.length);
  return velocities;
}

function updateSprites(batch, velocities, dt, canvas) {
  if (!(batch && velocities && dt && canvas)) {
    // console.log('updateSprites: missing args', 'batchOk:', !!batch, 'velOk:', !!velocities, 'dt:', dt, 'canvasOk:', !!canvas);
    return;
  }
  const sprites = batch._sprites;
  if (!sprites) {
    // console.log('updateSprites: sprites missing');
    return;
  }
  for (let i = 0; i < sprites.length; i++) {
    const spr = sprites[i];
    const vel = velocities[i];
    if (!spr || !vel) {
      // console.log('updateSprites: skip', 'i:', i, 'sprOk:', !!spr, 'velOk:', !!vel);
      continue;
    }
    let nx = spr.dstX + vel.vx * dt;
    let ny = spr.dstY + vel.vy * dt;
    const worldX = nx + batch.offset.x + worldOffset.x;
    const worldY = ny + batch.offset.y + worldOffset.y;
    if (worldX < 0) {
      nx = - (batch.offset.x + worldOffset.x);
      vel.vx = Math.abs(vel.vx);
      // console.log('updateSprites:bounceX:left', 'i:', i, 'nx:', nx.toFixed(2));
    } else if (worldX + spr.dstW > canvas.width) {
      nx = canvas.width - spr.dstW - (batch.offset.x + worldOffset.x);
      vel.vx = -Math.abs(vel.vx);
      // console.log('updateSprites:bounceX:right', 'i:', i, 'nx:', nx.toFixed(2));
    }
    if (worldY < 0) {
      ny = - (batch.offset.y + worldOffset.y);
      vel.vy = Math.abs(vel.vy);
      // console.log('updateSprites:bounceY:top', 'i:', i, 'ny:', ny.toFixed(2));
    } else if (worldY + spr.dstH > canvas.height) {
      ny = canvas.height - spr.dstH - (batch.offset.y + worldOffset.y);
      vel.vy = -Math.abs(vel.vy);
      // console.log('updateSprites:bounceY:bottom', 'i:', i, 'ny:', ny.toFixed(2));
    }
    spr.dstX = Math.floor(nx * 2) / 2;
    spr.dstY = Math.floor(ny * 2) / 2;
    batch.updateSprite(i);
  }
}

function startRenderLoop(gl, canvas) {
  if (!gl || !canvas) {
    console.error('startRenderLoop: missing gl/canvas', 'glOk:', !!gl, 'canvasOk:', !!canvas);
    return;
  }
  if (!(sampleBatches && sampleBatches.length)) {
    console.error('startRenderLoop: no batches', 'batchCount:', sampleBatches ? sampleBatches.length : -1);
    return;
  }
  const loop = startGameLoop((t, dt) => {
    if (!(dt > 0)) {
      console.log('renderLoop: skip frame', 'dt:', dt);
      return true;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
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
      updateSprites(batch, velocities, dt, canvas);
      batch.render();
      // console.log('renderLoop: batch rendered', 'batchIndex:', b, 'spriteCount:', batch.spriteCount);
    }
    return true;
  });
  loop.run();
  console.log('startRenderLoop: multi-batch running', 'batchCount:', sampleBatches.length);
}

promise.then(async ({ canvas, lookup }) => {
  console.log('Textures loaded:', 'canvas:', canvas, 'lookupKeys:', Object.keys(lookup).length);
  Object.assign(textureLookup, lookup);
  g('textureLookup', textureLookup);
  g('textureAtlas', canvas);
  const displayCanvas = document.querySelector('canvas');
  if (!displayCanvas) {
    console.error('postTextureLoad: displayCanvas init failed');
    return;
  }
  if (!window.sessionStorage.getItem('has-loaded')) {
    return;
  }
  const gl = await initGL(displayCanvas, true);
  if (!gl) {
    console.error('postTextureLoad: gl init failed');
    return;
  }
  const tex = createAtlasTexture(gl, canvas);
  if (!tex) {
    console.error('postTextureLoad: atlas texture failed');
    return;
  }
  const program = initProgram(gl);
  if (!program) {
    console.error('postTextureLoad: program failed');
    return;
  }
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const texLoc = gl.getAttribLocation(program, 'a_texcoord');
  const tintLoc = gl.getAttribLocation(program, 'a_tint');
  if (posLoc === -1 || texLoc === -1 || tintLoc === -1) {
    console.error('postTextureLoad: attrib locate fail', 'posLoc:', posLoc, 'texLoc:', texLoc, 'tintLoc:', tintLoc);
    return;
  }
  const uTexLoc = gl.getUniformLocation(program, 'u_texture');
  if (!uTexLoc) {
    console.error('postTextureLoad: uniform u_texture missing');
    return;
  }
  gl.uniform1i(uTexLoc, 0);
  sampleBatches = [];
  sampleBatch = null;
  sampleVelocitiesLists = [];
  const multi = createMultipleBatches(gl, displayCanvas, canvas, posLoc, texLoc, tintLoc, lookup);
  if (!multi || !multi.batches.length) {
    console.error('postTextureLoad: multi-batch creation failed', 'batchesOk:', !!multi, 'count:', multi && multi.batches ? multi.batches.length : -1);
    return;
  }
  sampleBatches = multi.batches;
  sampleBatch = sampleBatches[0];
  sampleVelocitiesLists = multi.velocitiesLists;
  if (!sampleVelocitiesLists.length) {
    console.error('postTextureLoad: velocity lists empty');
    return;
  }
  console.log('postTextureLoad: multi-batch prepared', 'batchCount:', sampleBatches.length);
  startRenderLoop(gl, displayCanvas);
}).catch(err => {
  console.error('Texture load promise failed', 'errMsg:', err && err.message);
  console.error(err);
});

function createMultipleBatches(gl, displayCanvas, atlasCanvas, posLoc, texLoc, tintLoc, lookup) {
  if (!gl || !displayCanvas || !atlasCanvas || !lookup) {
    console.error('createMultipleBatches: missing params', 'glOk:', !!gl, 'displayCanvasOk:', !!displayCanvas, 'atlasOk:', !!atlasCanvas, 'lookupKeys:', Object.keys(lookup).length);
    return null;
  }
  const batches = [];
  const velocitiesLists = [];
  const BATCH_COUNT = 4;
  for (let i = 0; i < BATCH_COUNT; i++) {
    const batch = createBatch(gl, displayCanvas, atlasCanvas, posLoc, texLoc, tintLoc);
    if (!batch) {
      console.error('createMultipleBatches: batch create failed', 'i:', i);
      continue;
    }
    const velocities = createSampleSprites(batch, lookup, displayCanvas);
    if (!velocities || !velocities.length) {
      console.error('createMultipleBatches: sample sprites create failed  ', 'i:', i);
      continue;
    }
    batches.push(batch);
    velocitiesLists.push(velocities);
    console.log('createMultipleBatches: batch created', 'i:', i, 'spriteCount:', batch.spriteCount);
  }
  if (batches.length === 0) {
    console.error('createMultipleBatches: no batches created');
    return null;
  }
  console.log('createMultipleBatches: done', 'batchesCreated:', batches.length);
  return { batches, velocitiesLists };
} 