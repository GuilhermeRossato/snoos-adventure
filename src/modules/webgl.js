
export async function initGL() {
  const canvas = document.querySelector('canvas#canvas_webgl');
  if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
    throw new Error('initGL: Could not find canvas#canvas_webgl');
  }
  const gl = canvas.getContext('webgl');
  if (!gl) {
    console.error('init: WebGL not supported');
    return;
  }
  
// const gl = new Proxy(gl2, {
//   get(target, prop, receiver) {
//     const list = (window['_order'] = (window['_order'] || []));
//     list.push(prop);
//     const value = Reflect.get(target, prop, receiver);
//     if (typeof value === 'function') {
//       return function (...args) {
//         const list = (window['_args'] = (window['_args'] || []));
//         list.push({prop, args});
//         if (!target||!prop||!receiver) {
//           console.error('Proxy: invalid context for method', 'name:', prop);
//         }
//         console.log('Proxy: method access', 'name:', prop, 'args:', args);
//         try {
//           const result = value.apply(gl2, args);
//           console.log('Proxy: method result', 'name:', prop, 'result:', result);
//           return result;
//         } catch (err) {
//           console.error('Proxy: method error', 'name:', prop, 'errMsg:', err && err.message);
//           throw err;
//         }
//       };
//     }
//     console.log('Proxy: property access', 'name:', prop, 'value:', value);
//     return value;
//   }
// });

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(106/255, 166/255, 110/255, 1);
  console.log('initGL: Context ready:', 'viewport:', canvas.width, 'x', canvas.height);
  return gl;
}