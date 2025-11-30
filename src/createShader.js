export function createShader(gl, type, src) {
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
