import { createProgram } from "./webgl/createProgram.js";

export async function initProgram(gl) {
  if (!gl) {
    console.error('initProgram: gl missing');
    return null;
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

  const program = createProgram(gl, vertexSrc, fragmentSrc);
  if (!program) {
    console.error('initProgram: program creation failed');
    return null;
  }
  gl.useProgram(program);
  console.log('initProgram: program bound');
  return program;
}
