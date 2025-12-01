
export async function initGL() {
  const canvas = document.querySelector('canvas#canvas_webgl');
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('initGL: Could not find canvas#canvas_webgl');
  }
  const gl = canvas.getContext('webgl');
  if (!gl) {
    throw new Error('initGL: Could not get WebGL context');
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(106/255, 166/255, 110/255, 1);
  console.log('initGL: Context ready:', 'viewport:', canvas.width, 'x', canvas.height);
  return gl;
}