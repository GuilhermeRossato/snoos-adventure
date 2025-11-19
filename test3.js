'use strict';

console.log = ()=>{}

const types = {
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

async function loadTextures() {
  // reuse existing atlas if present
  console.log('loadTextures: start', 'typeCount:', Object.keys(types).length);
  const textureLookup = {};
  const keys = Object.keys(types);
  if (keys.length === 0) {
    console.log('loadTextures: no types present', 'keysLen:', keys.length);
    return { canvas: null, lookup: textureLookup };
  }
  const images = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const texPath = types[key] && types[key].texture;
    if (!texPath) {
      console.error('loadTextures: missing texture path', 'key:', key);
      continue;
    }
    try {
      const img = await loadImage(texPath);
      images.push({ key, img });
      console.log('loadTextures: image loaded', 'index:', i, 'key:', key,
        'imgW:', img.width, 'imgH:', img.height, 'file:', JSON.stringify(texPath).slice(0,16), 'len:', texPath.length);
    } catch (err) {
      console.error('loadTextures: load failed', 'key:', key, 'file:', JSON.stringify(texPath).slice(0,16),
        'len:', texPath.length, 'errMsg:', err && err.message);
      continue;
    }
  }
  if (images.length === 0) {
    console.error('loadTextures: no images loaded', 'requested:', keys.length);
    return { canvas: null, lookup: textureLookup };
  }

  // Dynamic packing (16x16 cell grid)
  const CELL = 16;
  let totalCells = 0;
  const validImages = [];
  for (const it of images) {
    const w = it.img.width;
    const h = it.img.height;
    if ((w % CELL) !== 0 || (h % CELL) !== 0) {
      console.error('loadTextures: image size not multiple of 16 -> skipped', 'key:', it.key, 'w:', w, 'h:', h);
      continue;
    }
    const wc = w / CELL;
    const hc = h / CELL;
    totalCells += wc * hc;
    validImages.push({ key: it.key, img: it.img, w, h, wc, hc });
  }
  if (validImages.length === 0) {
    console.error('loadTextures: no valid images after size filtering', 'incoming:', images.length);
    return { canvas: null, lookup: textureLookup };
  }

  // Choose atlas width in cells (square-ish)
  const sideCells = Math.max(1, Math.ceil(Math.sqrt(totalCells)));
  const atlasCellsW = sideCells;
  const atlasW = atlasCellsW * CELL;
  console.log('loadTextures: packing params', 'totalCells:', totalCells, 'atlasCellsW:', atlasCellsW, 'atlasW:', atlasW);

  // Sort largest area first
  validImages.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  const occupancy = []; // rows of boolean[]
  let rows = 0;

  function ensureRows(r) {
    while (rows < r) {
      occupancy.push(new Array(atlasCellsW).fill(false));
      rows++;
      console.log('loadTextures: row added', 'rowsNow:', rows);
    }
  }

  function canPlace(x, y, wc, hc) {
    for (let ry = 0; ry < hc; ry++) {
      const row = occupancy[y + ry];
      if (!row) return false;
      for (let rx = 0; rx < wc; rx++) {
        if (row[x + rx]) return false;
      }
    }
    return true;
  }

  function markPlace(x, y, wc, hc) {
    for (let ry = 0; ry < hc; ry++) {
      const row = occupancy[y + ry];
      for (let rx = 0; rx < wc; rx++) {
        row[x + rx] = true;
      }
    }
  }

  const placements = [];
  for (let i = 0; i < validImages.length; i++) {
    const it = validImages[i];
    const wc = it.wc;
    const hc = it.hc;
    let placed = false;
    let attempts = 0;
    while (!placed) {
      attempts++;
      // Scan existing rows
      for (let y = 0; y <= Math.max(0, rows - hc); y++) {
        for (let x = 0; x <= atlasCellsW - wc; x++) {
          if (canPlace(x, y, wc, hc)) {
            markPlace(x, y, wc, hc);
            placements.push({ key: it.key, img: it.img, xPx: x * CELL, yPx: y * CELL, w: it.w, h: it.h });
            placed = true;
            console.log('loadTextures: placed', 'key:', it.key, 'xCell:', x, 'yCell:', y, 'wCells:', wc, 'hCells:', hc,
              'xPx:', x * CELL, 'yPx:', y * CELL, 'attempts:', attempts);
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
      // Need more rows
      ensureRows(rows + 1);
      console.log('loadTextures: expand rows for image', 'key:', it.key, 'rowsNow:', rows);
    }
  }

  const atlasH = rows * CELL;
  console.log('loadTextures: final atlas size', 'atlasW:', atlasW, 'atlasH:', atlasH, 'rows:', rows, 'placements:', placements.length);

  let atlasCanvas = document.getElementById('textureAtlas');
  if (atlasCanvas) {
    if (atlasCanvas.width !== atlasW || atlasCanvas.height !== atlasH) {
      atlasCanvas.width = atlasW;
      atlasCanvas.height = atlasH;
      console.log('loadTextures: reused canvas resized', 'atlasW:', atlasW, 'atlasH:', atlasH);
    } else {
      console.log('loadTextures: reused canvas same size', 'atlasW:', atlasW, 'atlasH:', atlasH);
    }
  } else {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.id = 'textureAtlas';
    atlasCanvas.width = atlasW;
    atlasCanvas.height = atlasH;
    if (document.body) {
      document.body.appendChild(atlasCanvas);
      console.log('loadTextures: new canvas appended', 'atlasW:', atlasW, 'atlasH:', atlasH);
    } else {
      console.error('loadTextures: document.body missing; cannot append canvas');
    }
  }
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) {
    console.error('loadTextures: 2d context creation failed');
    return { canvas: atlasCanvas, lookup: textureLookup };
  }
  ctx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  console.log('loadTextures: canvas cleared', 'w:', atlasCanvas.width, 'h:', atlasCanvas.height);

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    try {
      ctx.drawImage(p.img, p.xPx, p.yPx);
      console.log('loadTextures: image drawn', 'i:', i, 'key:', p.key, 'x:', p.xPx, 'y:', p.yPx, 'w:', p.w, 'h:', p.h);
    } catch (err) {
      console.error('loadTextures: drawImage failed', 'i:', i, 'key:', p.key, 'x:', p.xPx, 'y:', p.yPx, 'errMsg:', err && err.message);
      continue;
    }
    textureLookup[p.key] = {
      x: p.xPx, y: p.yPx, w: p.w, h: p.h,
      u0: p.xPx / atlasW, v0: p.yPx / atlasH,
      u1: (p.xPx + p.w) / atlasW, v1: (p.yPx + p.h) / atlasH
    };
    console.log('loadTextures: lookup stored', 'key:', p.key,
      'u0:', textureLookup[p.key].u0.toFixed(4), 'v0:', textureLookup[p.key].v0.toFixed(4),
      'u1:', textureLookup[p.key].u1.toFixed(4), 'v1:', textureLookup[p.key].v1.toFixed(4));
  }

  console.log('loadTextures: complete', 'drawnCount:', placements.length, 'lookupKeys:', Object.keys(textureLookup).length);
  return { canvas: atlasCanvas, lookup: textureLookup };
}

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
    this._sprites = []; // internal storage
    this._dirtyFlags = new Uint8Array(maxSprites); // 0/1 per sprite
    console.log('SpriteBatch: constructed', 'canvasW:', canvasW, 'canvasH:', canvasH, 'texW:', texW, 'texH:', texH, 'maxSprites:', maxSprites);
  }
  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) {
    if (this.spriteCount >= this.maxSprites) {
      console.error('SpriteBatch.createSprite: capacity full', 'spriteCount:', this.spriteCount, 'maxSprites:', this.maxSprites);
      return null;
    }
    const index = this.spriteCount++;
    const sprite = { index, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH };
    this._sprites.push(sprite);
    this.updateSprite(index);
    console.log('SpriteBatch.createSprite: sprite created', 'index:', index,
      'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH,
      'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH, 'spriteCount:', this.spriteCount);
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
    this._dirtyFlags[index] = 1;
    console.log('SpriteBatch.updateSprite: updated sprite', 'index:', index,
      'posBaseFloats:', base, 'dirtyCountSet:', this.dirty.size,
      'dstX:', spr.dstX, 'dstY:', spr.dstY, 'dstW:', spr.dstW, 'dstH:', spr.dstH,
      'srcX:', spr.srcX, 'srcY:', spr.srcY, 'srcW:', spr.srcW, 'srcH:', spr.srcH);
  }
  uploadDirty() {
    const gl = this.gl;
    if (this.dirty.size === 0) {
      console.log('SpriteBatch.uploadDirty: no dirty sprites');
      return;
    }
    const indices = Array.from(this.dirty).sort((a,b)=>a-b);
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
      console.log('SpriteBatch.uploadDirty: position range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
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
      console.log('SpriteBatch.uploadDirty: texcoord range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
      rangeStart = curr;
      prev = curr;
    }
    this.dirty.clear();
    this._dirtyFlags.fill(0);
    console.log('SpriteBatch.uploadDirty: completed', 'rangesProcessed:', indices.length);
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

  // Build atlas from types
  let atlasData;
  try {
    atlasData = await loadTextures();
    console.log('init: loadTextures completed', 'canvasW:', atlasData.canvas ? atlasData.canvas.width : null,
      'canvasH:', atlasData.canvas ? atlasData.canvas.height : null,
      'lookupCount:', Object.keys(atlasData.lookup || {}).length);
  } catch (err) {
    console.error('init: loadTextures failed', 'errMsg:', err && err.message);
    return;
  }
  if (!atlasData || !atlasData.canvas || !atlasData.lookup) {
    console.error('init: atlasData invalid', 'hasCanvas:', !!(atlasData && atlasData.canvas),
      'hasLookup:', !!(atlasData && atlasData.lookup));
    return;
  }
  const atlasCanvas = atlasData.canvas;
  const lookup = atlasData.lookup;
  const texW = atlasCanvas.width;
  const texH = atlasCanvas.height;
  console.log('init: atlas ready', 'texW:', texW, 'texH:', texH, 'typesCount:', Object.keys(lookup).length);

  const tex = gl.createTexture();
  if (!tex) {
    console.error('init: gl.createTexture failed');
    return;
  }
  console.log('init: texture object created', 'texObj:', !!tex);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    console.log('init: texImage2D atlas success', 'atlasW:', texW, 'atlasH:', texH);
  } catch (err) {
    console.error('init: texImage2D atlas failed', 'errMsg:', err && err.message);
    return;
  }

  const pot = isPowerOf2(texW) && isPowerOf2(texH);
  if (pot) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('init: atlas POT -> mipmaps generated', 'texW:', texW, 'texH:', texH);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('init: atlas NPOT -> clamp + linear', 'texW:', texW, 'texH:', texH);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  let program;
  try {
    program = createProgram(gl, vertexSrc, fragmentSrc);
    console.log('init: createProgram returned', 'programOk:', !!program);
  } catch (err) {
    console.error('init: createProgram threw', 'errMsg:', err && err.message);
    return;
  }
  if (!program) {
    console.error('init: program falsy after creation');
    return;
  }
  gl.useProgram(program);

  const posLoc = gl.getAttribLocation(program, 'a_position');
  const texLocAttr = gl.getAttribLocation(program, 'a_texcoord');
  if (posLoc === -1 || texLocAttr === -1) {
    console.error('init: attribute location failure', 'posLoc:', posLoc, 'texLocAttr:', texLocAttr);
    return;
  }
  console.log('init: attribute locations ok', 'posLoc:', posLoc, 'texLocAttr:', texLocAttr);

  const uTexLoc = gl.getUniformLocation(program, 'u_texture');
  if (!uTexLoc) {
    console.error('init: uniform u_texture missing');
    return;
  }
  gl.uniform1i(uTexLoc, 0);
  console.log('init: uniform u_texture set', 'value:', 0);

  // Create multiple batches
  const BATCH_COUNT = 16;
  const BATCH_SIZE = 64;
  const batches = [];
  const batchVelocities = []; // per-batch velocity arrays
  const keys = Object.keys(lookup);
  if (keys.length === 0) {
    console.error('init: no atlas lookup entries available');
    return;
  }

  for (let b = 0; b < BATCH_COUNT; b++) {
    const positionBuffer = gl.createBuffer();
    if (!positionBuffer) {
      console.error('init: positionBuffer failed for batch', 'batch:', b);
      return;
    }
    const texcoordBuffer = gl.createBuffer();
    if (!texcoordBuffer) {
      console.error('init: texcoordBuffer failed for batch', 'batch:', b);
      return;
    }
    console.log('init: buffers created for batch', 'batch:', b, 'positionOk:', !!positionBuffer, 'texcoordOk:', !!texcoordBuffer);

    const batch = new SpriteBatch(gl, canvas.width, canvas.height, texW, texH,
      BATCH_SIZE, positionBuffer, texcoordBuffer, posLoc, texLocAttr);
    if (!batch) {
      console.error('init: SpriteBatch construction failed', 'batch:', b);
      return;
    }
    batches.push(batch);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.positions.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, batch.texcoords.byteLength, gl.DYNAMIC_DRAW);
    console.log('init: buffers allocated for batch', 'batch:', b, 'posBytes:', batch.positions.byteLength, 'texBytes:', batch.texcoords.byteLength);

    const velocitiesForBatch = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      const k = keys[Math.floor(Math.random() * keys.length)];
      const info = lookup[k];
      if (!info) {
        console.error('init: lookup entry missing during batch fill', 'batch:', b, 'index:', i, 'key:', k);
        continue;
      }
      const w = info.w;
      const h = info.h;
      const x = Math.random() * Math.max(0, (canvas.width - w));
      const y = Math.random() * Math.max(0, (canvas.height - h));
      const spr = batch.createSprite(x, y, w, h, info.x, info.y, info.w, info.h);
      if (!spr) {
        console.error('init: sprite creation failed inside batch', 'batch:', b, 'index:', i);
        continue;
      }
      velocitiesForBatch.push({ vx: (Math.random() * 120 - 60), vy: (Math.random() * 120 - 60) });
    }
    batchVelocities.push(velocitiesForBatch);
    console.log('init: batch filled', 'batch:', b, 'sprites:', batch.spriteCount, 'velLen:', batchVelocities[b].length);
  }
  console.log('init: all batches created', 'batchCount:', batches.length);

  function gameLoopSetup() {
    let lastT = performance.now();
    function frame(t) {
      const dtMs = t - lastT;
      lastT = t;
      const dt = dtMs / 1000;
      if (!(dt > 0) || dt > 1) {
        console.log('frame: dt out-of-range', 'dtMs:', dtMs.toFixed(2), 'dt:', dt.toFixed(4));
        requestAnimationFrame(frame);
        return;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      console.log('frame: begin', 'batches:', batches.length, 'dtMs:', dtMs.toFixed(2));
 
       const cw = canvas.width;
       const ch = canvas.height;
-
-      for (let i = 0; i < sprites.length; i++) {
-        const spr = sprites[i];
-        if (!spr) {
-          console.log('frame: missing sprite', 'index:', i);
-          continue;
-        }
-        const vel = velocities[i];
-        if (!vel) {
-          console.log('frame: missing velocity', 'index:', i);
-          continue;
-        }
-
-        // Integrate
-        let newX = spr.dstX + vel.vx * dt;
-        let newY = spr.dstY + vel.vy * dt;
-
-        // Bounce X
-        if (newX < 0) {
-          newX = 0;
-          vel.vx = Math.abs(vel.vx);
-          console.log('frame:bounceX:left', 'i:', i, 'newX:', newX, 'vx:', vel.vx.toFixed(2));
-        } else if (newX + spr.dstW > cw) {
-          newX = cw - spr.dstW;
-          vel.vx = -Math.abs(vel.vx);
-          console.log('frame:bounceX:right', 'i:', i, 'newX:', newX, 'vx:', vel.vx.toFixed(2));
-        } else {
-          console.log('frame:noBounceX', 'i:', i, 'newX:', newX.toFixed(2));
-        }
-
-        // Bounce Y
-        if (newY < 0) {
-          newY = 0;
-          vel.vy = Math.abs(vel.vy);
-          console.log('frame:bounceY:top', 'i:', i, 'newY:', newY, 'vy:', vel.vy.toFixed(2));
-        } else if (newY + spr.dstH > ch) {
-          newY = ch - spr.dstH;
-          vel.vy = -Math.abs(vel.vy);
-          console.log('frame:bounceY:bottom', 'i:', i, 'newY:', newY, 'vy:', vel.vy.toFixed(2));
-        } else {
-          console.log('frame:noBounceY', 'i:', i, 'newY:', newY.toFixed(2));
-        }
-
-        // Commit once and mark dirty
-        spr.dstX = newX;
-        spr.dstY = newY;
-        batch.updateSprite(i);
-
-        console.log('frame:update', 'i:', i, 'dstX:', spr.dstX.toFixed(2), 'dstY:', spr.dstY.toFixed(2),
-          'vx:', vel.vx.toFixed(2), 'vy:', vel.vy.toFixed(2));
-      }
-
-      batch.render();
-      console.log('frame: rendered', 'verts:', batch.spriteCount * 6);
+      // Update every batch's sprites then render each batch
+      for (let b = 0; b < batches.length; b++) {
+        const batch = batches[b];
+        const vels = batchVelocities[b] || [];
+        for (let i = 0; i < batch.spriteCount; i++) {
+          const spr = batch._sprites[i];
+          if (!spr) {
+            console.log('frame: missing sprite in batch', 'batch:', b, 'index:', i);
+            continue;
+          }
+          const vel = vels[i];
+          if (!vel) {
+            console.log('frame: missing velocity in batch', 'batch:', b, 'index:', i);
+            continue;
+          }
+          let newX = spr.dstX + vel.vx * dt;
+          let newY = spr.dstY + vel.vy * dt;
+          if (newX < 0) {
+            newX = 0;
+            vel.vx = Math.abs(vel.vx);
+          } else if (newX + spr.dstW > cw) {
+            newX = cw - spr.dstW;
+            vel.vx = -Math.abs(vel.vx);
+          }
+          if (newY < 0) {
+            newY = 0;
+            vel.vy = Math.abs(vel.vy);
+          } else if (newY + spr.dstH > ch) {
+            newY = ch - spr.dstH;
+            vel.vy = -Math.abs(vel.vy);
+          }
+          spr.dstX = newX;
+          spr.dstY = newY;
+          batch.updateSprite(i);
+        }
+        batch.render();
+        console.log('frame: rendered batch', 'batch:', b, 'sprites:', batch.spriteCount, 'verts:', batch.spriteCount * 6);
+      }
 
       requestAnimationFrame(frame);
     }
     requestAnimationFrame(frame);
     console.log('gameLoopSetup: started');
   }
 
   gameLoopSetup();
   console.log('init: completed');
   return true;
 }