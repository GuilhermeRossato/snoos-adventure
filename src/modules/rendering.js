
export const renderingState = {
  displayGL: null,
  menuCtx: null,
  atlasCtx: null,
  activate(name) {
    this.menuCtx.canvas.style.opacity = name === 'display' ? '0' : '1';
    this.displayGL.canvas.style.opacity = name === 'display' ? '1' : '0';
  },
}

export async function initRendering() {
  const menuCanvas = document.querySelector('canvas#canvas_ctx');
  if (!menuCanvas || !(menuCanvas instanceof HTMLCanvasElement)) {
    throw new Error('initGL: Could not find canvas#canvas_ctx');
  }
  const menuCtx = menuCanvas.getContext('2d');
  if (!menuCtx) {
    throw new Error('2D context not supported');
  }
  const displayCanvas = document.querySelector('canvas#canvas_webgl');
  if (!displayCanvas || !(displayCanvas instanceof HTMLCanvasElement)) {
    throw new Error('Could not find canvas#canvas_webgl');
  }
  const width = (displayCanvas.width || 480);
  const height = (displayCanvas.height || 480);
  
  displayCanvas.width = Math.floor(width / 2);
  displayCanvas.height = Math.floor(height / 2);
  
  displayCanvas.style.width = `${Math.floor(width)}px`;
  displayCanvas.style.height = `${Math.floor(height)}px`;

  const displayGL = displayCanvas.getContext('webgl');
  if (!displayGL) {
    throw new Error('WebGL not supported');
  }

  let atlasCanvas = document.querySelector('canvas#canvas_atlas');
  if (!atlasCanvas || !(atlasCanvas instanceof HTMLCanvasElement)) {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.id = 'canvas_atlas';
    document.body.appendChild(atlasCanvas);
  }
  if (!atlasCanvas || !(atlasCanvas instanceof HTMLCanvasElement)) {
    throw new Error('Could not find canvas#canvas_atlas');
  }
  const atlasCtx = renderingState.atlasCtx || atlasCanvas.getContext('2d');
  if (!atlasCtx) {
    throw new Error('2D rendering context not supported');
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
  //           console.error('Proxy: invalid rendering context for method', 'name:', prop);
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

  displayGL.viewport(0, 0, displayCanvas.width, displayCanvas.height);
  displayGL.clearColor(106 / 255, 166 / 255, 110 / 255, 1);

  console.log('initGL: Context ready:', 'viewport:', displayCanvas.width, 'x', displayCanvas.height);
  renderingState.menuCtx = menuCtx;
  renderingState.displayGL = displayGL;
  renderingState.atlasCtx = atlasCtx;
  renderingState.activate('display');
  return renderingState;
}