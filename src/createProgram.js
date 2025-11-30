import { createShader } from "./createShader.js";

export function createProgram(gl, vsSrc, fsSrc) {
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
