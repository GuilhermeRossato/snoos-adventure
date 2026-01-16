import { g } from "../../utils/g.js";
import { keys } from "./keys.js";
import { loadMaps } from "./maps.js";
import { renderingState } from "./rendering.js";
import { createCanvasTexture, textureLookup } from "./textures.js";

export const worldOffset = { x: 0, y: 0 };

let multi = null;

g('multi', multi);

export function addBatch(batch, velocities) {
  if (!multi) {
    multi = { batches: [], velocities: [] };
  }
  multi.batches.push(batch);
  multi.velocities.push(velocities || []);
}

const spriteHover = {
  target: null,
  active: null,
  batch: null,
}

export function initSpriteMouseHover() {
  keys.onKeyDown("F3", ()=>{
    keys.ignoreMouseEvent = !keys.ignoreMouseEvent;
    console.log('Mouse hover toggle, ignoreMouseEvent:', keys.ignoreMouseEvent);
  })
  keys.onMouseMove(function (evt) {
    if (evt.x < 0 || evt.y < 0 || evt.x > 1 || evt.y > 1) {
      if (spriteHover.target !== null) {
        console.log('sprite hover cleared from out of bounds', spriteHover.target);
        spriteHover.target = null;
        spriteHover.batch = null;
      }
      return;
    }
    for (let b = multi.batches.length - 1; b >= 0; b--) {
      const batch = multi.batches[b];
      if (!batch) {
        continue;
      }
      const sprites = batch._sprites;
      if (!sprites) {
        continue;
      }
      const displayCanvas = renderingState.displayGL.canvas;
      const canvasX = evt.x * displayCanvas.width;
      const canvasY = evt.y * displayCanvas.height;
      for (let i = 0; i < sprites.length; i++) {
        const spr = sprites[i];
        if (canvasX >= spr.dstX && canvasX <= spr.dstX + spr.dstW &&
          canvasY >= spr.dstY && canvasY <= spr.dstY + spr.dstH) {
          if (spriteHover.target !== spr) {
            console.log('sprite hover enter', spr);
            spriteHover.target = spr;
            spriteHover.batch = batch;
          }
          return;
        }
      }
    }
    if (spriteHover.target !== null) {
      console.log('sprite hover cleared', spriteHover.target);
      spriteHover.target = null;
      spriteHover.batch = null;
    }
  });
}

function setStatusSpriteInfo(x, y, meta) {
document.querySelector('#status_text').textContent = x !== undefined && y !== undefined ? `Sprite ({x}, ${y})\n${meta ? JSON.stringify(meta) : ''}` : '';
}

export function render() {
  const displayGL = renderingState.displayGL;
  const displayCanvas = renderingState.displayGL.canvas;
  try {
    displayGL.clear(displayGL.COLOR_BUFFER_BIT);
    if (spriteHover.target !== spriteHover.active) {
      spriteHover.active = spriteHover.target;
      if (spriteHover.batch?.map) {
        const metadata = spriteHover.batch.map.spriteMetadata.get(spriteHover.target.dstX / 16, spriteHover.target.dstY / 16);
        console.log('sprite hover changed, map:', metadata);
        setStatusSpriteInfo(spriteHover.target.dstX / 16, spriteHover.target.dstY / 16, metadata);
      } else {
        setStatusSpriteInfo(undefined, undefined, undefined);
      }
    }
    for (let b = 0; b < multi.batches.length; b++) {
      const batch = multi.batches[b];
      if (!batch) {
        console.error('renderLoop: missing batch', 'batchIndex:', b);
        continue;
      }
      const velocities = multi.velocities[b];
      if (!velocities) {
        continue;
      }
      const sprites = batch._sprites;
      if (!batch || !velocities || !sprites) {
        console.log('frame: missing batch/velocities/sprites', 'batchIdx:', b,
          'batch:', !!batch, 'velocities:', !!velocities, 'sprites:', !!sprites);
        continue;
      }
      for (let i = 0; i < sprites.length; i++) {
        if (velocities && velocities[i]) {
          const spr = sprites[i];
          spr.dstX += (velocities[i].vx * (1 / 60));
          spr.dstY += (velocities[i].vy * (1 / 60));
          if (spr.dstX < 0 || spr.dstX + spr.dstW > displayCanvas.width) {
            velocities[i].vx = -velocities[i].vx;
            spr.dstX = Math.max(0, Math.min(spr.dstX, displayCanvas.width - spr.dstW));
          }
          if (spr.dstY < 0 || spr.dstY + spr.dstH > displayCanvas.height) {
            velocities[i].vy = -velocities[i].vy;
            spr.dstY = Math.max(0, Math.min(spr.dstY, displayCanvas.height - spr.dstH));
          }
        }
        batch.updateSprite(i);
      }
      batch.render();
    }
    requestAnimationFrame(render);
  } catch (error) {
    console.error('renderLoop: error during render', 'message:', error && error.message);
  }

}

/**
 * 
 * @param {typeof import('./../init.js').initState} initState 
 * @returns 
 */
export async function initSprites(initState) {
  const displayGL = renderingState.displayGL;
  const displayCanvas = renderingState.displayGL.canvas;
  const atlasCanvas = renderingState.atlasCtx.canvas;

  console.log('initSprites: starting', 'atlasCanvas:', atlasCanvas.width, 'x', atlasCanvas.height, 'displayCanvas:', displayCanvas.width, 'x', displayCanvas.height);
  const atlasTexture = await createCanvasTexture(atlasCanvas, displayGL);

  SpriteBatch.textureCache.set(displayGL, {
    texture: atlasTexture,
    width: atlasCanvas.width,
    height: atlasCanvas.height
  });
  const maps = await loadMaps();
  initState.maps = maps;

  multi = createMultipleBatches(displayGL, maps["map-01"]);

  g('batches', multi.batches);
  g('velocities', multi.velocities);

  // Expose created batches for external creation of sprites (e.g., maps)
  multi.batches = multi && Array.isArray(multi.batches) ? multi.batches : [];
  const sampleBatch = multi.batches.length > 0 ? multi.batches[0] : null;
  console.log('initSprites: sample batches exposed', 'batches:', multi.batches.length, 'hasSampleBatch:', !!sampleBatch);
}

function createMultipleBatches(gl, mapData) {
  const displayCanvas = gl.canvas;

  if (!gl || !displayCanvas || !textureLookup) {
    console.error('createMultipleBatches: missing params', 'glOk:', !!gl, 'displayCanvasOk:', !!displayCanvas, 'lookupKeys:', Object.keys(textureLookup).length);
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
  const batchCount = 3;
  for (let i = 0; i < batchCount; i++) {
    const batch = createBatch(gl, displayCanvas, i === 0 ? 1024 : 1024 * 4);
    if (!batch) {
      console.error('createMultipleBatches: batch create failed', 'i:', i);
      continue;
    }
    const vel = createSampleSprites(batch, displayCanvas, mapData ? mapData.spriteChunks : null);
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
    if (!gl) {
      throw new Error('SpriteBatch: missing WebGL context');
    }
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
    this._initializeTextures();
    this._initializeBuffers();

    console.log('SpriteBatch: constructed', 'canvasW:', canvasW, 'canvasH:', canvasH, 'maxSprites:', maxSprites);
  }

  _initializeProgram() {
    if (SpriteBatch.programCache.has(this.gl)) {
      console.log('SpriteBatch: using cached program');
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
        vec3 blended = mix(tex.rgb, v_tint.rgb, w);
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
      const o = SpriteBatch.textureCache.get(this.gl);
      this.texture = o && o.texture;

      if (!this.texture) {
        console.error('SpriteBatch._initializeTextures: texture missing in cache');
        throw new Error('Texture not found in cache');
      }
      this.texW = o.width;
      this.texH = o.height;
      if (!this.texH || !this.texW) {
        console.error('SpriteBatch._initializeTextures: texture size empty', 'width:', this.texW, 'height:', this.texH);
        throw new Error(['Texture not found', 'width:', this.texW, 'height:', this.texH].join(' '));
      }
      // this.gl.activeTexture(this.gl.TEXTURE0);
      // this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
      console.log('SpriteBatch._initializeTextures: texture bound', 'width:', this.texW, 'height:', this.texH);
    } catch (err) {
      console.error('SpriteBatch._initializeTextures: failed to initialize texture', 'error:', err && err.message);
      throw err;
    }

    // const uTexLoc = this.gl.getUniformLocation(this.program, 'u_texture');
    // if (!uTexLoc) {
    //   console.error('init: uniform u_texture missing');
    //   throw new Error('Attribute location failure');
    // }
    // console.log('Updated u text loc');
    // this.gl.uniform1i(uTexLoc, 0);
    // console.log('init: uniform u_texture set', 'value:', 0);
  }

  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint) {
    if (isNaN(this.texW) || isNaN(this.texH)) {
      const obj = SpriteBatch.textureCache.get(this.gl);
      const tex = obj && obj.texture;
      if (!tex) {
        throw new Error('SpriteBatch.createSprite: missing texture in cache');
      }
      this.texture = tex;
      debugger;
      this.texW = obj.width;
      this.texH = obj.height;
      console.log('Initialized texture with size', { width: obj.width, height: obj.height })
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
    const base = index * this._floatsPerPosSprite; // 6 verts * 2 components
    if (this._floatsPerPosSprite != 12) {
      throw new Error('SpriteBatch.updateSprite: unexpected floatsPerPosSprite value');
    }

    // Positions (6 vertices)
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

    // Tints: 6 verts * 4 components
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
      const floatStart = rangeStart * 12;
      const floatCount = count * 12;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.positions.subarray(floatStart, floatStart + floatCount));
      // console.log('SpriteBatch.uploadDirty: position range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
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
      const floatStart = rangeStart * 12;
      const floatCount = count * 12;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.texcoords.subarray(floatStart, floatStart + floatCount));
      // console.log('SpriteBatch.uploadDirty: texcoord range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
      rangeStart = curr;
      prev = curr;
    }
    // Upload tint ranges (6 verts * 4 floats per sprite)
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
      const floatStart = rangeStart * 24;
      const floatCount = count * 24;
      gl.bufferSubData(gl.ARRAY_BUFFER, floatStart * 4, this.tints.subarray(floatStart, floatStart + floatCount));
      // console.log('SpriteBatch.uploadDirty: tint range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
      rangeStart = curr;
      prev = curr;
    }

    this.dirty.clear();
    this._dirtyFlags.fill(0);
    // console.log('SpriteBatch.uploadDirty: completed', 'rangesProcessed:', indices.length);
  }
  render() {
    const gl = this.gl;
    const program = this.program;
    gl.useProgram(program);
    if (!this.initRender) {
      this.initRender = true;
      const posLoc = gl.getAttribLocation(program, 'a_position');
      const texLoc = gl.getAttribLocation(program, 'a_texcoord');
      const tintLoc = gl.getAttribLocation(program, 'a_tint');
      if (posLoc === -1 || texLoc === -1 || tintLoc === -1) {
        console.error('init: attribute location failure', 'posLoc:', posLoc, 'texLoc:', texLoc, 'tintLoc:', tintLoc);
        return;
      }
      if (posLoc === -1 || texLoc === -1 || tintLoc === -1) {
        console.error('init: attribute location failure', 'posLoc:', posLoc, 'texLoc:', texLoc, 'tintLoc:', tintLoc);
        return;
      }
      this.posLoc = posLoc;
      this.texLoc = texLoc;
      this.tintLoc = tintLoc;

      const uTexLoc = gl.getUniformLocation(program, 'u_texture');
      if (!uTexLoc) {
        console.error('init: uniform u_texture missing');
        throw new Error('Attribute location failure');
      }
      gl.uniform1i(uTexLoc, 0);
    }
    this.uploadDirty();
    if (this.spriteCount === 0) {
      console.log('SpriteBatch.render: no sprites');
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.posLoc);
    gl.vertexAttribPointer(this.posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.enableVertexAttribArray(this.texLoc);
    gl.vertexAttribPointer(this.texLoc, 2, gl.FLOAT, false, 0, 0);

    if (typeof this.tintLoc === 'number' && this.tintLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
      gl.enableVertexAttribArray(this.tintLoc);
      gl.vertexAttribPointer(this.tintLoc, 4, gl.FLOAT, false, 0, 0);
    } else {
      console.log('SpriteBatch.render: tintLoc invalid, skipping tint attribute bind', 'tintLoc:', this.tintLoc);
    }

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

const logRec = {};

function createSampleSprites(batch, displayCanvas, spriteChunks) {
  if (!batch || !textureLookup || !displayCanvas) {
    console.error('createSampleSprites: missing params', 'batchOk:', !!batch, 'lookupKeys:', Object.keys(textureLookup).length, 'displayCanvasOk:', !!displayCanvas);
    return [];
  }
  const keys = Object.keys(textureLookup);
  if (keys.length === 0) {
    console.error('createSampleSprites: empty lookup');
    return [];
  }
  const velocities = [];
  const count = spriteChunks && Array.isArray(spriteChunks) && spriteChunks.length > 0 ? spriteChunks.length : 128;
  // console.log('createSampleSprites: creating sprites', 'count:', count, 'lookupKeys:', keys.length);
  for (let i = 0; i < count; i++) {
    const key = spriteChunks && spriteChunks[i] ? spriteChunks[i].tile : keys[i % keys.length];
    const info = textureLookup[key];
    if (!info) {
      if (!logRec[key]) {
        logRec[key] = 1;
        console.error('createSampleSprites: missing texture info', 'key:', key);
      }
      continue;
    }
    if (spriteChunks && spriteChunks[i]) {
      const x = spriteChunks[i].x * 16;
      const y = spriteChunks[i].y * 16;
      const spr = batch.createSprite(x, y, info.w, info.h, info.x, info.y, info.w, info.h, [1, 1, 1, 0.5]);
      if (!spr) {
        console.error('createSampleSprites: sprite create failed', 'i:', i, 'key:', key);
        continue;
      }
      velocities.push({ vx: (Math.random() * 120 - 60), vy: (Math.random() * 120 - 60) });
    } else {
      const x = Math.floor(Math.random() * Math.max(0, displayCanvas.width - info.w));
      const y = Math.floor(Math.random() * Math.max(0, displayCanvas.height - info.h));
      const spr = batch.createSprite(x, y, info.w, info.h, info.x, info.y, info.w, info.h, [1, 1, 1, 0.5]);
      if (!spr) {
        console.error('createSampleSprites: sprite create failed', 'i:', i);
        continue;
      }
      velocities.push({ vx: (Math.random() * 120 - 60), vy: (Math.random() * 120 - 60) });
    }
  }
  // console.log('createSampleSprites: done', 'created:', velocities.length);
  return velocities;
}
