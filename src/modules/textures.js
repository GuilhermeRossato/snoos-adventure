import { generateTileTextureCanvas } from "../generateTileTextureCanvas.js";
import { tileTextures } from "./tiles.js";

export const textureLookup = {};

export async function initTextures() {
  const atlasCanvas = await generateTileTextureCanvas(tileTextures, textureLookup);
  console.log('initTextures: atlasCanvas created', 'width:', atlasCanvas.width, 'height:', atlasCanvas.height);
  return {                                                                
    atlasCanvas,
    textureLookup,
  };
}

function isPowerOf2(v) {
  return (v & (v - 1)) === 0 && v !== 0;
}

export async function createCanvasTexture(canvas, gl) {
  if (!gl) {
    gl = canvas.getContext('webgl');
  }
  if (!canvas) {
    canvas = gl.canvas;
  }
  if (!gl) {
    console.error('createCanvasTexture: missing gl context');
    return null;
  }
  const tex = gl.createTexture();
  if (!tex) {
    console.error('gl.createTexture failed');
    return null;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    console.log('texImage2D success', 'w:', canvas.width, 'h:', canvas.height);
  } catch (err) {
    console.error('texImage2D failed', 'errMsg:', err && err.message);
    return null;
  }
  const pot = isPowerOf2(canvas.width) && isPowerOf2(canvas.height);
  
  if (pot) {
    console.log('image dimensions are power of two');
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('non-ideal image dimension: mipmaps generated (POT)');
  } else {
    console.log('image dimensions are not power of two');
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('ideal image dimension: NPOT clamp + linear');
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}

export const assets = {
  menu: './assets/menuicons.png',
  objects: './assets/objects.png',
  tiles: './assets/tiles.png',
  green: './assets/green.png',
};
