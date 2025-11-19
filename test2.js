'use strict';

console.log = () => { }

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

// Add: global world offset for scrolling
let worldOffset = { x: 0, y: 0 };
console.log('global: worldOffset initialized', 'x:', worldOffset.x, 'y:', worldOffset.y);

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
        'imgW:', img.width, 'imgH:', img.height, 'file:', JSON.stringify(texPath).slice(0, 16), 'len:', texPath.length);
    } catch (err) {
      console.error('loadTextures: load failed', 'key:', key, 'file:', JSON.stringify(texPath).slice(0, 16),
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
  // per-vertex tint: rgb + weight packed as vec4 (r,g,b,weight)
  attribute vec4 a_tint;
  varying vec2 v_texcoord;
  varying vec4 v_tint;
  void main() {
    v_texcoord = a_texcoord;
    v_tint = a_tint;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
`;

const fragmentSrc = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texcoord;
  varying vec4 v_tint; // rgb + weight
  void main() {
    vec4 tex = texture2D(u_texture, v_texcoord);
    // blend texture color with tint RGB using weight in v_tint.a
    // result = mix(tex.rgb, tint.rgb, weight), preserve original alpha
    float w = clamp(v_tint.a, 0.0, 1.0);
    vec3 blended = mix(tex.rgb, v_tint.rgb, w);
    gl_FragColor = vec4(blended, tex.a);
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
    console.error('gl.createShader failed', 'type:', type);
    return null;
  }
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  const ok = gl.getShaderParameter(sh, gl.COMPILE_STATUS);
  console.log('compile status', 'type:', type, 'ok:', ok);
  if (!ok) {
    const log = gl.getShaderInfoLog(sh);
    console.error('compilation failed', 'type:', type, 'log prefix:', JSON.stringify(log).slice(0, 20), 'log len:', log ? log.length : -1);
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
  // added tintBuffer and tintLoc parameters (tint buffer comes before attribute locations)
  constructor(gl, canvasW, canvasH, texW, texH, maxSprites, positionBuffer, texcoordBuffer, tintBuffer, posLoc, texLoc, tintLoc) {
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
    this.positions = new Float32Array(maxSprites * 6 * 2);
    this.texcoords = new Float32Array(maxSprites * 6 * 2);
    // per-vertex tint: 6 verts * 4 components (r,g,b,weight)
    this.tints = new Float32Array(maxSprites * 6 * 4);
    this.dirty = new Set();
    this._sprites = []; // internal storage
    this._dirtyFlags = new Uint8Array(maxSprites); // 0/1 per sprite
    // per-batch offset (group/world origin)
    this.offset = { x: 0, y: 0 };
    console.log('SpriteBatch: constructed', 'canvasW:', canvasW, 'canvasH:', canvasH, 'texW:', texW, 'texH:', texH, 'maxSprites:', maxSprites, 'offsetX:', this.offset.x, 'offsetY:', this.offset.y, 'tintLoc:', this.tintLoc);
  }
  createSprite(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint) {
    if (this.spriteCount >= this.maxSprites) {
      console.error('SpriteBatch.createSprite: capacity full', 'spriteCount:', this.spriteCount, 'maxSprites:', this.maxSprites);
      return null;
    }
    const index = this.spriteCount++;
    // tint: optional array [r,g,b,weight] default -> no tint (white,0)
    const t = Array.isArray(tint) && tint.length >= 4 ? tint.slice(0,4) : [1.0, 1.0, 1.0, 0.0];
    const sprite = { index, dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH, tint: t };
    this._sprites.push(sprite);
    this.updateSprite(index);
    console.log('SpriteBatch.createSprite: sprite created', 'index:', index,
      'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH,
      'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH, 'spriteCount:', this.spriteCount, 'tint:', t);
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
    const base = index * 12; // 6 verts * 2 components

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
    const tintBase = index * 24; // 6 * 4
    const t = spr.tint;
    // Fill all six vertices with same tint (r,g,b,weight)
    for (let v = 0; v < 6; v++) {
      const off = tintBase + v * 4;
      this.tints[off + 0] = t[0];
      this.tints[off + 1] = t[1];
      this.tints[off + 2] = t[2];
      this.tints[off + 3] = t[3];
    }

    this.dirty.add(index);
    this._dirtyFlags[index] = 1;
    console.log('SpriteBatch.updateSprite: updated sprite', 'index:', index,
      'localPosX:', spr.dstX.toFixed(2), 'localPosY:', spr.dstY.toFixed(2),
      'worldX:', worldX.toFixed(2), 'worldY:', worldY.toFixed(2),
      'batchOffsetX:', this.offset.x.toFixed(2), 'batchOffsetY:', this.offset.y.toFixed(2),
      'worldOffsetX:', (worldOffset && worldOffset.x) ? worldOffset.x.toFixed(2) : '0.00',
      'worldOffsetY:', (worldOffset && worldOffset.y) ? worldOffset.y.toFixed(2) : '0.00',
      'posBaseFloats:', base, 'dirtyCountSet:', this.dirty.size,
      'dstW:', spr.dstW, 'dstH:', spr.dstH, 'srcX:', spr.srcX, 'srcY:', spr.srcY, 'srcW:', spr.srcW, 'srcH:', spr.srcH, 'tint:', t);
  }
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
      console.log('SpriteBatch.uploadDirty: tint range', 'startIdx:', rangeStart, 'endIdx:', prev, 'sprites:', count);
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

    // Bind tint attribute
    if (typeof this.tintLoc === 'number' && this.tintLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.tintBuffer);
      gl.enableVertexAttribArray(this.tintLoc);
      // 4 floats: r,g,b,weight
      gl.vertexAttribPointer(this.tintLoc, 4, gl.FLOAT, false, 0, 0);
    } else {
      console.log('SpriteBatch.render: tintLoc invalid, skipping tint attribute bind', 'tintLoc:', this.tintLoc);
    }

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
  const tintLoc = gl.getAttribLocation(program, 'a_tint');
  if (posLoc === -1 || texLocAttr === -1 || tintLoc === -1) {
    console.error('init: attribute location failure', 'posLoc:', posLoc, 'texLocAttr:', texLocAttr, 'tintLoc:', tintLoc);
    return;
  }
  console.log('init: attribute locations ok', 'posLoc:', posLoc, 'texLocAttr:', texLocAttr, 'tintLoc:', tintLoc);

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
    // create tint buffer
    const tintBuffer = gl.createBuffer();
    if (!tintBuffer) {
      console.error('init: tintBuffer failed for batch', 'batch:', b);
      return;
    }
    console.log('init: buffers created for batch', 'batch:', b, 'positionOk:', !!positionBuffer, 'texcoordOk:', !!texcoordBuffer, 'tintOk:', !!tintBuffer);

    // allocate GL buffers (size in bytes): BATCH_SIZE * 6 verts * components * 4 bytes
    const posBytes = BATCH_SIZE * 6 * 2 * 4;
    const texBytes = BATCH_SIZE * 6 * 2 * 4;
    const tintBytes = BATCH_SIZE * 6 * 4 * 4;

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, posBytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texBytes, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, tintBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, tintBytes, gl.DYNAMIC_DRAW);
    console.log('init: buffers allocated for batch', 'batch:', b, 'posBytes:', posBytes, 'texBytes:', texBytes, 'tintBytes:', tintBytes);

    const batch = new SpriteBatch(gl, canvas.width, canvas.height, texW, texH,
      BATCH_SIZE, positionBuffer, texcoordBuffer, tintBuffer, posLoc, texLocAttr, tintLoc);
    if (!batch) {
      console.error('init: SpriteBatch construction failed', 'batch:', b);
      return;
    }

    // Give each batch its own offset (group offset). Example: small random offset to demonstrate group placement.
    batch.offset = { x: (Math.random() * 400 - 200), y: (Math.random() * 400 - 200) };
    console.log('init: batch offset assigned', 'batch:', b, 'offsetX:', batch.offset.x.toFixed(2), 'offsetY:', batch.offset.y.toFixed(2));

    batches.push(batch);

    // Fill sprites in batch
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
      // Keep sprite local positions (relative to batch.offset). Using visible canvas area for initial local placement.
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
      console.log('frame: begin', 'dtMs:', dtMs.toFixed(2));

      const cw = canvas.width;
      const ch = canvas.height;
      for (let b = 0; b < batches.length; b++) {
        const batch = batches[b];
        const velocities = batchVelocities[b];
        const sprites = batch._sprites;
        if (!batch || !velocities || !sprites) {
          console.log('frame: missing batch/velocities/sprites', 'batchIdx:', b,
            'batch:', !!batch, 'velocities:', !!velocities, 'sprites:', !!sprites);
          continue;
        }
        for (let i = 0; i < sprites.length; i++) {
          const spr = sprites[i];
          if (!spr) {
            console.log('frame: missing sprite', 'batchIdx:', b, 'spriteIdx:', i);
            continue;
          }
          const vel = velocities[i];
          if (!vel) {
            console.log('frame: missing velocity', 'batchIdx:', b, 'spriteIdx:', i);
            continue;
          }

          // Integrate in local coordinates
          let newLocalX = spr.dstX + vel.vx * dt;
          let newLocalY = spr.dstY + vel.vy * dt;

          // World positions taking batch offset + global worldOffset into account
          const batchOffX = batch.offset ? batch.offset.x : 0;
          const batchOffY = batch.offset ? batch.offset.y : 0;
          const globalOffX = worldOffset ? worldOffset.x : 0;
          const globalOffY = worldOffset ? worldOffset.y : 0;

          const worldNewX = batchOffX + globalOffX + newLocalX;
          const worldNewY = batchOffY + globalOffY + newLocalY;

          // Compute allowed local range so that world position fits inside canvas [0, cw/ch]
          const minLocalX = - (batchOffX + globalOffX);
          const maxLocalX = cw - spr.dstW - (batchOffX + globalOffX);
          const minLocalY = - (batchOffY + globalOffY);
          const maxLocalY = ch - spr.dstH - (batchOffY + globalOffY);

          // Bounce X
          if (worldNewX < 0) {
            newLocalX = minLocalX;
            vel.vx = Math.abs(vel.vx);
            console.log('frame:bounceX:left', 'batchIdx:', b, 'spriteIdx:', i,
              'newLocalX:', newLocalX.toFixed(2), 'worldNewX:', worldNewX.toFixed(2),
              'vx:', vel.vx.toFixed(2), 'minLocalX:', minLocalX.toFixed(2), 'batchOffX:', batchOffX.toFixed(2), 'globalOffX:', globalOffX.toFixed(2));
          } else if (worldNewX + spr.dstW > cw) {
            newLocalX = maxLocalX;
            vel.vx = -Math.abs(vel.vx);
            console.log('frame:bounceX:right', 'batchIdx:', b, 'spriteIdx:', i,
              'newLocalX:', newLocalX.toFixed(2), 'worldNewX:', (worldNewX + spr.dstW).toFixed(2),
              'vx:', vel.vx.toFixed(2), 'maxLocalX:', maxLocalX.toFixed(2), 'batchOffX:', batchOffX.toFixed(2), 'globalOffX:', globalOffX.toFixed(2));
          } else {
            console.log('frame:noBounceX', 'batchIdx:', b, 'spriteIdx:', i, 'newLocalX:', newLocalX.toFixed(2), 'worldNewX:', worldNewX.toFixed(2));
          }

          // Bounce Y
          if (worldNewY < 0) {
            newLocalY = minLocalY;
            vel.vy = Math.abs(vel.vy);
            console.log('frame:bounceY:top', 'batchIdx:', b, 'spriteIdx:', i,
              'newLocalY:', newLocalY.toFixed(2), 'worldNewY:', worldNewY.toFixed(2),
              'vy:', vel.vy.toFixed(2), 'minLocalY:', minLocalY.toFixed(2), 'batchOffY:', batchOffY.toFixed(2), 'globalOffY:', globalOffY.toFixed(2));
          } else if (worldNewY + spr.dstH > ch) {
            newLocalY = maxLocalY;
            vel.vy = -Math.abs(vel.vy);
            console.log('frame:bounceY:bottom', 'batchIdx:', b, 'spriteIdx:', i,
              'newLocalY:', newLocalY.toFixed(2), 'worldNewY:', (worldNewY + spr.dstH).toFixed(2),
              'vy:', vel.vy.toFixed(2), 'maxLocalY:', maxLocalY.toFixed(2), 'batchOffY:', batchOffY.toFixed(2), 'globalOffY:', globalOffY.toFixed(2));
          } else {
            console.log('frame:noBounceY', 'batchIdx:', b, 'spriteIdx:', i, 'newLocalY:', newLocalY.toFixed(2), 'worldNewY:', worldNewY.toFixed(2));
          }

          // Commit once and mark dirty (local positions)
          spr.dstX = newLocalX;
          spr.dstY = newLocalY;
          batch.updateSprite(i);

          console.log('frame:update', 'batchIdx:', b, 'spriteIdx:', i, 'localX:', spr.dstX.toFixed(2), 'localY:', spr.dstY.toFixed(2),
            'worldX:', (spr.dstX + batchOffX + globalOffX).toFixed(2), 'worldY:', (spr.dstY + batchOffY + globalOffY).toFixed(2),
            'vx:', vel.vx.toFixed(2), 'vy:', vel.vy.toFixed(2));
        }
        batch.render();
        console.log('frame: rendered', 'batchIdx:', b, 'verts:', batch.spriteCount * 6, 'batchOffsetX:', batch.offset.x.toFixed(2), 'batchOffsetY:', batch.offset.y.toFixed(2));
        
        if (Math.random() < 0.5) {
          batch.offset.y += 10 * Math.random();
        }
      }
      if (Math.random() < 0.5) {
        worldOffset.y -= Math.random() * 10;
        console.log('frame: worldOffset.y moved up', 'newY:', worldOffset.y.toFixed(2));
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    console.log('gameLoopSetup: started');
  }

  gameLoopSetup();
  console.log('init: completed');
  return true;
}