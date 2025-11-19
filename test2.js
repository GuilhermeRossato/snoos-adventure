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

  // Helper to update buffers for a single textured quad (two triangles via TRIANGLE_STRIP)
  function setQuad(glCtx, canvasW, canvasH, dstX, dstY, dstW, dstH,
                   srcX, srcY, srcW, srcH, texW, texH) {
    // Compute clip-space positions (y flipped from top-left pixel space)
    const left = (dstX / canvasW) * 2 - 1;
    const right = ((dstX + dstW) / canvasW) * 2 - 1;
    const top = - (dstY / canvasH) * 2 + 1;
    const bottom = - ((dstY + dstH) / canvasH) * 2 + 1;

    const posArr = new Float32Array([
      left,  bottom,
      right, bottom,
      left,  top,
      right, top
    ]);

    // Texture coordinates (image origin top-left)
    const u0 = srcX / texW;
    const u1 = (srcX + srcW) / texW;
    const v0 = srcY / texH;
    const v1 = (srcY + srcH) / texH;

    const texArr = new Float32Array([
      u0, v1,
      u1, v1,
      u0, v0,
      u1, v0
    ]);

    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, positionBuffer);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, posArr, glCtx.DYNAMIC_DRAW);
    console.log('setQuad: position buffer updated', 'bytes:', posArr.byteLength, 'verts:', posArr.length / 2,
      'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH);

    glCtx.bindBuffer(glCtx.ARRAY_BUFFER, texcoordBuffer);
    glCtx.bufferData(glCtx.ARRAY_BUFFER, texArr, glCtx.DYNAMIC_DRAW);
    console.log('setQuad: texcoord buffer updated', 'bytes:', texArr.byteLength, 'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH);
  }

  function drawQuad(dstX, dstY, dstW, dstH, srcX, srcY, srcW, srcH) {
    if (dstW <= 0 || dstH <= 0) {
      console.error('drawQuad: invalid dst size', 'dstW:', dstW, 'dstH:', dstH);
      return;
    }
    if (srcW <= 0 || srcH <= 0) {
      console.error('drawQuad: invalid src size', 'srcW:', srcW, 'srcH:', srcH);
      return;
    }
    setQuad(gl, canvas.width, canvas.height, dstX, dstY, dstW, dstH,
            srcX, srcY, srcW, srcH, img.width, img.height);

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
    gl.enableVertexAttribArray(texLocAttr);
    gl.vertexAttribPointer(texLocAttr, 2, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    console.log('drawQuad: issued drawArrays TRIANGLE_STRIP', 'dstX:', dstX, 'dstY:', dstY, 'dstW:', dstW, 'dstH:', dstH,
      'srcX:', srcX, 'srcY:', srcY, 'srcW:', srcW, 'srcH:', srcH);
  }

  gl.clear(gl.COLOR_BUFFER_BIT);
  console.log('init: frame cleared');
  // Example draws for 16x16 texture
  drawQuad(32, 32, 128, 128, 0, 0, 32, 32);
  drawQuad(200, 50, 96, 160, 0, 0, 16, 16);
  drawQuad(360, 180, 150, 90, 0, 0, 16, 16);

  console.log('init: completed draws');
  return true;
}