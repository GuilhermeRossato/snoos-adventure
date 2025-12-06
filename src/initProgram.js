import { createProgram } from "./webgl/createProgram.js";

export async function initProgram(gl) {
  throw new Error('initProgram: disabled');
  if (!gl) {
    console.error('initProgram: gl missing');
    return null;
  }
  console.log('initProgram: starting\n\n');

  const vertexShaderPath = './src/webgl/vert.glsl';
  const fragmentShaderPath = './src/webgl/frag.glsl';

  // Fetch vertex shader source code
  let [vertexSrc, fragmentSrc] = await Promise.all([
    fetch(vertexShaderPath).then(response => response.text()),
    fetch(fragmentShaderPath).then(response => response.text()),
  ]);

  if (!vertexSrc) {
    vertexSrc = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  attribute vec4 a_tint;
  varying vec2 v_texcoord;
  varying vec4 v_tint;
  void main() {
    v_texcoord = a_texcoord;
    v_tint = a_tint;
    gl_Position = vec4(a_position, 0.0, 1.0);
  }
  `;
  }
  if (!fragmentSrc) {
    fragmentSrc = `
  precision mediump float;
  uniform sampler2D u_texture;
  varying vec2 v_texcoord;
  varying vec4 v_tint; // rgb + weight
  void main() {
    vec4 tex = texture2D(u_texture, v_texcoord);
    // blend texture color with tint RGB using weight in v_tint.a
    // result = mix(tex.rgb, tint.rgb, weight), preserve original alpha
    vec3 blended = mix(tex.rgb, v_tint.rgb, 0.5);
    gl_FragColor = vec4(blended, tex.a);
  }
  `;
  }
  console.log('initProgram: shader sources fetched:', 'vertexSrc length:', vertexSrc.length, 'fragmentSrc length:', fragmentSrc.length);

  const program = createProgram(gl, vertexSrc, fragmentSrc);
  if (!program) {
    console.error('initProgram: program creation failed');
    return null;
  }

  gl.useProgram(program);
  console.log('initProgram: program bound');
  return program;
}
