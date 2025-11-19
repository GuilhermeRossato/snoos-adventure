
w
init().then(r => (r !== undefined) && console.log("init() return:", r)).catch(err => { console.error(err); });


function loadImage(filePath) {
  return new Promise((resolve, reject) => {
    var img = new Image();
    img.onload = resolve.bind(this, img);
    img.onerror = reject.bind(this, new Error(`Could not load asset "${filePath}"`));
    img.src = filePath;
  });
}

async function init() {
  const canvas = document.querySelector('canvas');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    console.log('WebGL not supported');
    throw new Error('WebGL not supported');
  }
  /**
   * @type {HTMLImageElement} img
   */
  const img = await loadImage('./assets/tiles.png');

  const tex = gl.createTexture();
  if (!tex) {
    console.log('Failed to create texture object for', JSON.stringify(assetPath.slice(0, 16)), assetPath.length);
    return;
  }

  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
  } catch (err) {
    console.log('texImage2D failed for', JSON.stringify(assetPath.slice(0, 16)), 'length:', assetPath.length, 'error:', err && err.message);
    return;
  }

  const pot = isPowerOf2(img.width) && isPowerOf2(img.height);
  if (pot) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('Texture is POT; mipmaps generated', 'imgW:', img.width, 'imgH:', img.height);
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('Texture is NPOT; using CLAMP_TO_EDGE', 'imgW:', img.width, 'imgH:', img.height);
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Bind texture unit and set uniform
  const uTexLoc = gl.getUniformLocation(program, 'u_texture');
  if (uTexLoc === null) {
    console.log('Uniform u_texture not found in program');
    return;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.uniform1i(uTexLoc, 0);
  console.log('Texture bound to unit 0 and uniform set');

  const vertexSrc = `
attribute vec2 a_position;
attribute vec2 a_texPos;
varying vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0, 1);
  v_texCoord = a_texPos;
}
`;
  const fragmentSrc = `
precision mediump float;
varying vec2 v_texCoord;
uniform sampler2D u_texture;
void main() {
  gl_FragColor = texture2D(u_texture, v_texCoord);
}
`;

  function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    console.log('Shader compile status:', compiled, 'type:', type);
    if (!compiled) {
      const err = gl.getShaderInfoLog(shader);
      console.log('Shader compile error:', err);
      gl.deleteShader(shader);
      throw new Error('Shader compile error: ' + err);
    }
    return shader;
  }

  function createProgram(gl, vsSource, fsSource) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    console.log('Program link status:', linked);
    if (!linked) {
      const err = gl.getProgramInfoLog(program);
      console.log('Program link error:', err);
      gl.deleteProgram(program);
      throw new Error('Program link error: ' + err);
    }
    return program;
  }

  const program = createProgram(gl, vertexSrc, fragmentSrc);
  gl.useProgram(program);

  // Define vertices and texture coordinates for a triangle
  const positions = new Float32Array([
    0, 0,
    100, 0,
    50, 100
  ]);

  const texPositions = new Float32Array([
    0, 0,
    1, 0,
    0.5, 1
  ]);


  function createBuffer(gl, data, attrib, size) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, attrib);
    if (loc < 0) {
      console.log('Attrib location not found:', attrib, 'loc:', loc);
      return;
    }
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    console.log('Buffer created for', attrib, 'length:', data.length);
  }

  createBuffer(gl, positions, 'a_position', 2);
  createBuffer(gl, texPositions, 'a_texPos', 2);

  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);


  function isPowerOf2(v) {
    return (v & (v - 1)) === 0 && v !== 0;
  }


  // --- Replace immediate draw loop with render() invoked after texture setup ---
  function render() {
    gl.clear(gl.COLOR_BUFFER_BIT);
    for (let i = 0; i < positions.length / 2; ++i) {
      // draw 4 vertices per sprite as intended by original code
      gl.drawArrays(gl.TRIANGLE_STRIP, i * 4, 4);
      // Print prefix/length style for arrays: show first 16 items' JSON and lengths
      const posSlice = Array.prototype.slice.call(positions, i * 2, i * 2 + 2);
      const sizeSlice = Array.prototype.slice.call(sizes, i * 2, i * 2 + 2);
      console.log('Draw square idx:', i, 'posPrefix:', JSON.stringify(posSlice.slice(0, 16)), 'posLen:', posSlice.length, 'sizePrefix:', JSON.stringify(sizeSlice.slice(0, 16)), 'sizeLen:', sizeSlice.length);
    }
  }
}
