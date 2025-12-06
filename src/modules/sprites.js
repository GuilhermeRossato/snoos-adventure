
import { createCanvasTexture } from "./textures.js";

export const worldOffset = { x: 0, y: 0 };

export async function initSprites(gl, atlasCanvas, textureLookup) {
  console.log(gl.canvas.id, 'initSprites: starting');
  const atlasTexture = await createCanvasTexture(atlasCanvas, gl);
  SpriteBatch.textureCache.set(gl, atlasTexture);
  const multi = createMultipleBatches(gl, textureLookup, atlasCanvas);

  return function render() {
    try {
      for (let b = 0; b < multi.batches.length; b++) {
        const batch = multi.batches[b];
        if (!batch) {
          console.error('renderLoop: missing batch', 'batchIndex:', b);
          continue;
        }
        const velocities = multi.velocities[b];
        if (!velocities) {
          console.error('renderLoop: missing velocities array', 'batchIndex:', b);
          continue;
        }
        batch.render();
      }
      requestAnimationFrame(render);
    } catch (error) {
      console.error('renderLoop: error during render', 'message:', error && error.message);
    }
  };
}

function createMultipleBatches(gl, lookup, atlasCanvas) {
  const displayCanvas = gl.canvas;
  if (!gl || !displayCanvas || !lookup) {
    console.error('createMultipleBatches: missing params', 'glOk:', !!gl, 'displayCanvasOk:', !!displayCanvas, 'lookupKeys:', Object.keys(lookup).length);
    throw new Error('Invalid params');
  }

  if (!gl.getExtension('OES_texture_float')) {
    console.error('createMultipleBatches: Required WebGL extension OES_texture_float not supported');
    throw new Error('Invalid state');
  }

  if (!gl.getParameter(gl.MAX_TEXTURE_SIZE)) {
    console.error('createMultipleBatches: Unable to retrieve MAX_TEXTURE_SIZE');
    throw new Error('Invalid state');
  }

  const batches = [];
  const velocities = [];
  const BATCH_COUNT = 1;
  for (let i = 0; i < BATCH_COUNT; i++) {
    const batch = createBatch(gl, displayCanvas);
    if (!batch) {
      console.error('createMultipleBatches: batch create failed', 'i:', i);
      continue;
    }
    const vel = createSampleSprites(batch, lookup, atlasCanvas);
    if (!vel || !vel.length) {
      console.error('createMultipleBatches: sample sprites create failed', 'i:', i);
      continue;
    }
    batches.push(batch);
    velocities.push(vel);
    console.log('createMultipleBatches: batch created', 'i:', i, 'spriteCount:', batch.spriteCount);
  }
  if (batches.length === 0) {
    console.error('createMultipleBatches: no batches created');
    throw new Error('Invalid batches length');
  }
  console.log('createMultipleBatches: done', 'batchesCreated:', batches.length);
  return { batches, velocities };
}

export class SpriteBatch {
  static programCache = new Map();
  static textureCache = new Map();

  // Constants
  static VERTS_PER_SPRITE = 6;
  static POS_COMPONENTS = 2;
  static UV_COMPONENTS = 2;
  static TINT_COMPONENTS = 4;

  constructor(gl, canvasW, canvasH, maxSprites) {
    console.log('SpriteBatch: constructing', maxSprites);

    this.gl = gl;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.texW = NaN;
    this.texH = NaN;
    this.maxSprites = maxSprites;

    this._floatsPerPosSprite = SpriteBatch.VERTS_PER_SPRITE * SpriteBatch.POS_COMPONENTS;
    this._floatsPerUvSprite = SpriteBatch.VERTS_PER_SPRITE * SpriteBatch.UV_COMPONENTS;
    this._floatsPerTintSprite = SpriteBatch.VERTS_PER_SPRITE * SpriteBatch.TINT_COMPONENTS;

    this.spriteCount = 0;
    this.positions = new Float32Array(maxSprites * this._floatsPerPosSprite);
    this.texcoords = new Float32Array(maxSprites * this._floatsPerUvSprite);
    this.tints = new Float32Array(maxSprites * this._floatsPerTintSprite);
    this.dirty = new Set();
    this._sprites = [];
    this._dirtyFlags = new Uint8Array(maxSprites);
    this.offset = { x: 0, y: 0 };

    this._initializeProgram();
    this._initializeBuffers();
    this._initializeTextures();

    console.log('SpriteBatch: constructed', 'canvasW:', canvasW, 'canvasH:', canvasH, 'maxSprites:', maxSprites);
  }

  _initializeProgram() {
    if (SpriteBatch.programCache.has(this.gl)) {
      this.program = SpriteBatch.programCache.get(this.gl);
      return;
    }

    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texcoord;
      attribute vec4 a_tint;
      varying vec2 v_texcoord;
      varying vec4 v_tint;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texcoord = a_texcoord;
        v_tint = a_tint;
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      varying vec2 v_texcoord;
      varying vec4 v_tint;
      uniform sampler2D u_texture;
      void main() {
        vec4 tex = texture2D(u_texture, v_texcoord);
        // blend texture color with tint RGB using weight in v_tint.a
        // result = mix(tex.rgb, tint.rgb, weight), preserve original alpha
        float w = clamp(v_tint.a, 0.0, 1.0);
        vec3 blended = mix(tex.rgb, v_tint.rgb, 0.5);
        gl_FragColor = vec4(blended, tex.a);
      }
    `;

    const vertexShader = this._compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this._compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    this.program = this._linkProgram(vertexShader, fragmentShader);
    SpriteBatch.programCache.set(this.gl, this.program);
  }

  _compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('Shader compile failed:', this.gl.getShaderInfoLog(shader));
      this.gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  _linkProgram(vertexShader, fragmentShader) {
    const program = this.gl.createProgram();
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);
    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      console.error('Program link failed:', this.gl.getProgramInfoLog(program));
      this.gl.deleteProgram(program);
      return null;
    }
    return program;
  }

  _initializeBuffers() {
    this.positionBuffer = this.gl.createBuffer();
    this.texcoordBuffer = this.gl.createBuffer();
    this.tintBuffer = this.gl.createBuffer();

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.positions.byteLength, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texcoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.texcoords.byteLength, this.gl.DYNAMIC_DRAW);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.tintBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, this.tints.byteLength, this.gl.DYNAMIC_DRAW);
  }

  _initializeTextures() {
    console.log('SpriteBatch: initializing textures');

    this.gl.useProgram(this.program);

    try {
      this.texture = SpriteBatch.textureCache.get(this.gl);
      if (!this.texture) {
        console.error('SpriteBatch._initializeTextures: texture missing in cache');
        throw new Error('Texture not found in cache');
      }
      this.texW = this.texture.width;
      this.texH = this.texture.height;
      this.gl.activeTexture(this.gl.TEXTURE0);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      console.log('SpriteBatch._initializeTextures: texture bound', 'width:', this.texW, 'height:', this.texH);
    } catch (err) {
      console.error('SpriteBatch._initializeTextures: failed to initialize texture', 'error:', err && err.message);
      throw err;
    }

    const uTexLoc = this.gl.getUniformLocation(this.program, 'u_texture');
    if (!uTexLoc) {
      console.error('init: uniform u_texture missing');
      throw new Error('Attribute location failure');
    }
    this.gl.uniform1i(uTexLoc, 0);
    console.log('init: uniform u_texture set', 'value:', 0);
  }

  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint) {
    if (isNaN(this.texW) || isNaN(this.texH)) {
      const tex = SpriteBatch.textureCache.get(this.gl);
      if (!tex) {
        throw new Error('SpriteBatch.createSprite: missing texture in cache');
      }
      this.texture = tex;
      this.texW = tex.width;
      this.texH = tex.height;
    }
    // console.log('SpriteBatch.createSprite: creating sprite', this.spriteCount);
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
    for (let v = 0; v < SpriteBatch.VERTS_PER_SPRITE; v++) {
      const off = tintBase + v * SpriteBatch.TINT_COMPONENTS;
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
    if (this.dirty.size === 0) {
      return;
    }
    const gl = this.gl;
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

    gl.useProgram(this.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    const texLoc = gl.getAttribLocation(this.program, 'a_texcoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
    const tintLoc = gl.getAttribLocation(this.program, 'a_tint');
    gl.enableVertexAttribArray(tintLoc);
    gl.vertexAttribPointer(tintLoc, 4, gl.FLOAT, false, 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    const uTexLoc = gl.getUniformLocation(this.program, 'u_texture');
    gl.uniform1i(uTexLoc, 0);

    gl.drawArrays(gl.TRIANGLES, 0, this.spriteCount * 6);
  }

  static create(gl, canvasW, canvasH, maxSprites) {
    return new SpriteBatch(gl, canvasW, canvasH, maxSprites);
  }
}

function createBatch(gl, canvas, maxSprites = 128) {
  if (!gl || !canvas) {
    console.error('createBatch: missing params', 'glOk:', !!gl, 'canvasOk:', !!canvas);
    return null;
  }
  const atlasTexture = SpriteBatch.textureCache.get(gl);
  if (!atlasTexture) {
    console.error('createBatch: atlasTexture missing in cache');
    return null;
  }
  const batch = SpriteBatch.create(gl, canvas.width, canvas.height, maxSprites);

  console.log('createBatch: batch ready', 'maxSprites:', maxSprites);
  return batch;
}

export let sampleBatches = [];
export let sampleBatch = null; // first batch kept for backward compatibility

function createSampleSprites(batch, lookup, atlasCanvas) {
  if (!batch || !lookup || !atlasCanvas) {
    console.error('createSampleSprites: missing params', 'batchOk:', !!batch, 'lookupKeys:', Object.keys(lookup).length, 'atlasCanvasOk:', !!atlasCanvas);
    return [];
  }
  const keys = Object.keys(lookup);
  if (keys.length === 0) {
    console.error('createSampleSprites: empty lookup');
    return [];
  }
  const velocities = [];
  const COUNT = Math.min(16, keys.length * 10);
  // console.log('createSampleSprites: creating sprites', 'count:', COUNT, 'lookupKeys:', keys.length);
  for (let i = 0; i < COUNT; i++) {
    const key = keys[i % keys.length];
    const info = lookup[key];
    if (!info) {
      console.error('createSampleSprites: info missing', 'key:', key);
      continue;
    }
    const x = Math.floor(Math.random() * Math.max(0, atlasCanvas.width - info.w));
    const y = Math.floor(Math.random() * Math.max(0, atlasCanvas.height - info.h));
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

// function spriteLoop(time) {
//   gl.clear(gl.COLOR_BUFFER_BIT);
//   for (let b = 0; b < sampleBatches.length; b++) {
//     const batch = sampleBatches[b];
//     if (!batch) {
//       console.error('renderLoop: missing batch', 'batchIndex:', b);
//       continue;
//     }
//     const velocities = samplevelocities[b];
//     if (!velocities) {
//       console.error('renderLoop: missing velocities array', 'batchIndex:', b);
//       continue;
//     }
//     updateSprites(batch, velocities, dt, canvas);
//     batch.render();
//     // console.log('renderLoop: batch rendered', 'batchIndex:', b, 'spriteCount:', batch.spriteCount);
//   }
// }
