'use strict';

function isPowerOf2(v) {
    return (v & (v - 1)) === 0 && v !== 0;
  }


const vertexSrc = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    v_texcoord = a_texcoord;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSrc = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texcoord;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
  }
`;


  init().then(r => (r !== undefined) && console.log("init() return:", r)).catch(err => { console.error(err); });

function loadImage(filePath) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.onload = () => {
      console.log('loadImage: success', 'file:', JSON.stringify(filePath).slice(0, 20), 'len:', filePath.length);
      resolve(img);
    };
    img.onerror = (ev) => {
      console.error('loadImage: error', 'file:', JSON.stringify(filePath).slice(0, 20), 'len:', filePath.length, 'event:', ev && ev.type);
      reject(new Error(`Could not load asset "${filePath}"`));
    };
    img.src = filePath;
  });
}

function createShader(gl, type, src) {
  const sh = gl.createShader(type);
  if (!sh) {
    console.error('createShader: gl.createShader failed', 'type:', type);
    return null;
  }
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
  console.log('createShader: compile status', 'type:', type, 'ok:', ok);
  if (!ok) {
    const log = gl.getShaderInfoLog(sh);
    console.error('createShader: compilation failed', 'type:', type, 'log prefix:', JSON.stringify(log).slice(0, 20), 'log len:', log ? log.length : -1);
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function createProgram(gl, vsSrc, fsSrc) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSrc);
  if (!vs) {
    console.error('createProgram: vertex shader failed');
    return null;
  }
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!fs) {
    console.error('createProgram: fragment shader failed');
    gl.deleteShader(vs);
    return null;
  }
  const prog = gl.createProgram();
  if (!prog) {
    console.error('createProgram: gl.createProgram failed');
    gl.deleteShader(vs); gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  const ok = gl.getProgramParameter(prog, gl.LINK_STATUS);
  console.log('createProgram: link status', 'ok:', ok);
  if (!ok) {
    const log = gl.getProgramInfoLog(prog);
    console.error('createProgram: link failed', 'log prefix:', JSON.stringify(log).slice(0, 20), 'log len:', log ? log.length : -1);
    gl.deleteProgram(prog); gl.deleteShader(vs); gl.deleteShader(fs);
    return null;
  }
  gl.deleteShader(vs); gl.deleteShader(fs);
  return prog;
}

class SpriteBatch {
  constructor(gl, canvasW, canvasH, texW, texH, maxSprites, positionBuffer, texcoordBuffer, posLoc, texLoc) {
    this.gl = gl;
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.texW = texW;
    this.texH = texH;
    this.maxSprites = maxSprites;
    this.positionBuffer = positionBuffer;
    this.texcoordBuffer = texcoordBuffer;
    this.posLoc = posLoc;
    this.texLoc = texLoc;
    this.spriteCount = 0;
    this.positions = new Float32Array(maxSprites * 6 * 2);
    this.texcoords = new Float32Array(maxSprites * 6 * 2);
    this.dirty = new Set();
    console.log('SpriteBatch: constructed', 'canvasW:', canvasW, 'canvasH:', canvasH, 'texW:', texW, 'texH:', texH, 'maxSprites:', maxSprites);
  }
  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) {
    if (this.spriteCount >= this.maxSprites) {
      console.error('SpriteBatch.createSprite: capacity full', 'spriteCount:', this.spriteCount, 'maxSprites:', this.maxSprites);
      return null;
    }
    const index = this.spriteCount++;
    const sprite = new Sprite(this, index, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH);
    this.updateSprite(index);
    console.log('SpriteBatch.createSprite: sprite created', 'index:', index, 'spriteCount:', this.spriteCount);
    return sprite;
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
    const left = (spr.dstX / this.canvasW) * 2 - 1;
    const right = ((spr.dstX + spr.dstW) / this.canvasW) * 2 - 1;
    const top = - (spr.dstY / this.canvasH) * 2 + 1;
    const bottom = - ((spr.dstY + spr.dstH) / this.canvasH) * 2 + 1;
    const u0 = spr.srcX / this.texW;
    const u1 = (spr.srcX + spr.srcW) / this.texW;
    const v0 = spr.srcY / this.texH;
    const v1 = (spr.srcY + spr.srcH) / this.texH;
    const base = index * 12; // 6 verts * 2 components
    // Positions (6 vertices)
    this.positions.set([
      left,  bottom,
      right, bottom,
      left,  top,
      right, bottom,
      right, top,
      left,  top
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
    this.dirty.add(index);
    console.log('SpriteBatch.updateSprite: updated sprite', 'index:', index,
      'posBaseFloats:', base, 'dirtyCount:', this.dirty.size,
      'dstX:', spr.dstX, 'dstY:', spr.dstY, 'dstW:', spr.dstW, 'dstH:', spr.dstH,
      'srcX:', spr.srcX, 'srcY:', spr.srcY, 'srcW:', spr.srcW, 'srcH:', spr.srcH);
  }
  _getSprite(index) {
    return this._sprites ? this._sprites[index] : null;
  }
  attachSpritesArray(arr) {
    this._sprites = arr;
    console.log('SpriteBatch.attachSpritesArray: sprites array attached', 'length:', arr.length);
  }
  uploadDirty() {
    const gl = this.gl;
    if (this.dirty.size === 0) {
      console.log('SpriteBatch.uploadDirty: no dirty sprites');
      return;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    for (const idx of this.dirty) {
      const byteOffset = idx * 12 * 4; // 12 floats * 4 bytes
      gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, this.positions.subarray(idx * 12, idx * 12 + 12));
      console.log('SpriteBatch.uploadDirty: position subdata', 'index:', idx, 'byteOffset:', byteOffset);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    for (const idx of this.dirty) {
      const byteOffset = idx * 12 * 4;
      gl.bufferSubData(gl.ARRAY_BUFFER, byteOffset, this.texcoords.subarray(idx * 12, idx * 12 + 12));
      console.log('SpriteBatch.uploadDirty: texcoord subdata', 'index:', idx, 'byteOffset:', byteOffset);
    }
    this.dirty.clear();
    console.log('SpriteBatch.uploadDirty: completed');
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
    gl.drawArrays(gl.TRIANGLES, 0, this.spriteCount * 6);
    console.log('SpriteBatch.render: drawArrays issued', 'spriteCount:', this.spriteCount, 'verts:', this.spriteCount * 6);
  }
}

class Sprite {
  constructor(batch, index, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) {
    this._batch = batch;
    this.index = index;
    this._dstX = dstX; this._dstY = dstY; this._dstW = dstW; this._dstH = dstH;
    this._srcX = srcX; this._srcY = srcY; this._srcW = srcW; this._srcH = srcH;
    this._defineProps();
    console.log('Sprite: constructed', 'index:', index,
      'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH,
      'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH);
  }
  _defineProps() {
    const defs = [
      ['dstX','_dstX'],
      ['dstY','_dstY'],
      ['dstW','_dstW'],
      ['dstH','_dstH'],
      ['srcX','_srcX'],
      ['srcY','_srcY'],
      ['srcW','_srcW'],
      ['srcH','_srcH']
    ];
    for (const [pub, priv] of defs) {
      Object.defineProperty(this, pub, {
        get: () => this[priv],
        set: v => {
          const old = this[priv];
            this[priv] = v;
            if (old !== v) {
              this._batch.updateSprite(this.index);
              console.log('Sprite.setter:', pub, 'index:', this.index, 'old:', old, 'new:', v);
            } else {
              console.log('Sprite.setter:nochange', pub, 'index:', this.index, 'value:', v);
            }
        },
        enumerable: true
      });
    }
  }
}

async function init() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    console.error('init: canvas element not found');
    return;
  }
  console.log('init: found canvas', 'id:', canvas.id || null, 'clientW:', canvas.clientWidth, 'clientH:', canvas.clientHeight);

  const gl = canvas.getContext('webgl');
  if (!gl) {
    console.error('init: WebGL not supported');
    return;
  }
  console.log('init: obtained WebGL context');

  // Resize canvas to display size (avoid stretched viewport)
  const dpr = window.devicePixelRatio || 1;
  const displayW = Math.max(1, Math.floor(canvas.clientWidth * dpr));
  const displayH = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== displayW || canvas.height !== displayH) {
    canvas.width = displayW;
    canvas.height = displayH;
    console.log('init: resized canvas', 'width:', canvas.width, 'height:', canvas.height, 'dpr:', dpr);
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  let img;
  try {
    img = await loadImage('./assets/tiles.png');
  } catch (err) {
    console.error('init: loadImage failed', err.message);
    return;
  }

  const tex = gl.createTexture();
  if (!tex) {
    console.error('init: Failed to create texture object');
    return;
  }
  console.log('init: texture object created', tex);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    console.log('init: texImage2D succeeded', 'imgW:', img.width, 'imgH:', img.height);
  } catch (err) {
    console.error('init: texImage2D failed', err && err.message);
    return;
  }

  const pot = isPowerOf2(img.width) && isPowerOf2(img.height);
  if (pot) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('init: Texture is POT; mipmaps generated', 'imgW:', img.width, 'imgH:', img.height);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('init: Texture is NPOT; using CLAMP_TO_EDGE', 'imgW:', img.width, 'imgH:', img.height);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Create program and use it
  let program;
  try {
    program = createProgram(gl, vertexSrc, fragmentSrc);
  } catch (err) {
    console.error('init: createProgram failed', err && err.message);
    return;
  }
  if (!program) {
    console.error('init: createProgram returned falsy program');
    return;
  }
  gl.useProgram(program);

  // Setup geometry (two buffers: positions and texcoords)
  const posLoc = gl.getAttribLocation(program, 'a_position');
  const texLocAttr = gl.getAttribLocation(program, 'a_texcoord');
  console.log('init: attribute locations', 'a_position:', posLoc, 'a_texcoord:', texLocAttr);
  if (posLoc === -1 || texLocAttr === -1) {
    console.error('init: missing attribute locations', 'a_position:', posLoc, 'a_texcoord:', texLocAttr);
    return;
  }

  const uTexLoc = gl.getUniformLocation(program, 'u_texture');
  if (!uTexLoc) {
    console.error('init: uniform location u_texture not found');
    return;
  }
  gl.uniform1i(uTexLoc, 0);
  console.log('init: uniform u_texture set to texture unit 0');

  // Replace original static full-screen buffers with dynamic quad buffers
  const positionBuffer = gl.createBuffer();
  if (!positionBuffer) {
    console.error('init: positionBuffer creation failed');
    return;
  }
  const texcoordBuffer = gl.createBuffer();
  if (!texcoordBuffer) {
    console.error('init: texcoordBuffer creation failed');
    return;
  }
  console.log('init: created dynamic buffers');

  // Setup sprite batch
  const maxSprites = 256;
  const batch = new SpriteBatch(gl, canvas.width, canvas.height, img.width, img.height,
    maxSprites, positionBuffer, texcoordBuffer, posLoc, texLocAttr);

  // Pre-fill GPU buffers with max size (empty) once
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.positions.byteLength, gl.DYNAMIC_DRAW);
  console.log('init: position buffer allocated', 'bytes:', batch.positions.byteLength);

  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, batch.texcoords.byteLength, gl.DYNAMIC_DRAW);
  console.log('init: texcoord buffer allocated', 'bytes:', batch.texcoords.byteLength);

  /** @type {Sprite[]} */
  const sprites = [];
  batch.attachSpritesArray(sprites);

  // Create sample sprites
  const s0 = batch.createSprite(32, 32, 128, 128, 0, 0, 64, 64);
  const s1 = batch.createSprite(200, 50, 96, 160, 64, 0, 64, 128);
  const s2 = batch.createSprite(360, 180, 150, 90, 0, 64, 128, 64);
  if (s0) sprites.push(s0);
  if (s1) sprites.push(s1);
  if (s2) sprites.push(s2);
  console.log('init: sprites created', 'count:', sprites.length);

  // Remove prior single frame render + timeout example
  // gl.clear(gl.COLOR_BUFFER_BIT);
  // console.log('init: frame cleared before batch render');
  // batch.render();
  // setTimeout(... old example ...) -- removed

  // Setup velocities (pixels/sec)
  const velocities = sprites.map((spr, i) => {
    const vx = (Math.random() * 120 - 60);
    const vy = (Math.random() * 120 - 60);
    console.log('init: velocity assigned', 'index:', i, 'vx:', vx.toFixed(2), 'vy:', vy.toFixed(2));
    return { vx, vy };
  });

  function gameLoopSetup() {
    let lastT = performance.now();
    function frame(t) {
      const dtMs = t - lastT;
      lastT = t;
      const dt = dtMs / 1000;
      if (!(dt > 0) || dt > 1) {
        console.log('frame: dt invalid or large', 'dtMs:', dtMs.toFixed(2), 'dt:', dt.toFixed(4));
        requestAnimationFrame(frame);
        return;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      console.log('frame: start', 'spriteCount:', sprites.length, 'dtMs:', dtMs.toFixed(2), 'dt:', dt.toFixed(4));

      const cw = canvas.width;
      const ch = canvas.height;

      for (let i = 0; i < sprites.length; i++) {
        const spr = sprites[i];
        if (!spr) {
          console.log('frame: sprite missing', 'index:', i);
          continue;
        }
        const vel = velocities[i];
        if (!vel) {
          console.log('frame: velocity missing', 'index:', i);
          continue;
        }

        // Move
        spr.dstX = spr.dstX + vel.vx * dt;
        spr.dstY = spr.dstY + vel.vy * dt;

        // Bounds bounce X
        const rightEdge = spr.dstX + spr.dstW;
        if (spr.dstX < 0) {
          spr.dstX = 0;
          spr.dstW -= 10;
          vel.vx = Math.abs(vel.vx);
          console.log('frame:bounceX:left', 'index:', i, 'newVx:', vel.vx.toFixed(2));
        } else if (rightEdge > cw) {
          spr.dstW -= 10;
          spr.dstX = cw - spr.dstW;
          vel.vx = -Math.abs(vel.vx);
          console.log('frame:bounceX:right', 'index:', i, 'newVx:', vel.vx.toFixed(2));
        } else {
          console.log('frame:noBounceX', 'index:', i, 'dstX:', spr.dstX.toFixed(2), 'rightEdge:', rightEdge.toFixed(2));
        }

        // Bounds bounce Y
        const bottomEdge = spr.dstY + spr.dstH;
        if (spr.dstY < 0) {
          spr.dstH -= 10;
          spr.dstY = 0;
          vel.vy = Math.abs(vel.vy);
          console.log('frame:bounceY:top', 'index:', i, 'newVy:', vel.vy.toFixed(2));

        } else if (bottomEdge > ch) {
          spr.dstH -= 10;
          spr.dstY = ch - spr.dstH;
          vel.vy = -Math.abs(vel.vy);
          console.log('frame:bounceY:bottom', 'index:', i, 'newVy:', vel.vy.toFixed(2));
        } else {
          console.log('frame:noBounceY', 'index:', i, 'dstY:', spr.dstY.toFixed(2), 'bottomEdge:', bottomEdge.toFixed(2));
        }

        console.log('frame:postUpdate', 'index:', i,
          'dstX:', spr.dstX.toFixed(2), 'dstY:', spr.dstY.toFixed(2),
          'vx:', vel.vx.toFixed(2), 'vy:', vel.vy.toFixed(2));
      }

      batch.render();
      // console.log('frame: render complete', 'totalVerts:', batch.spriteCount * 6);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    console.log('gameLoopSetup: started');
  }

  gameLoopSetup();
  console.log('init: game loop initialized');
  return true;
}