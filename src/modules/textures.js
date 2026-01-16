import { generateTileTextureCanvas, loadTileImages } from "../generateTileTextureCanvas.js";
import { tileTextures } from "./tiles.js";

export const textureState = {
  images: [],
  totalCells: 0,
  cellSize: 0,
};

/**
 * @type {Record<string, { x: number; y: number; w: number; h: number; u0: number; v0: number; u1: number; v1: number; }>}
 */
export const textureLookup = {};

export async function initTextures() {
  const { validImages, totalCells, cellSize } = await loadTileImages(tileTextures);
  textureState.images = validImages;
  textureState.totalCells = totalCells;
  if (!totalCells) {
    throw new Error('initTextures: no tile textures total cells')
  }
  textureState.cellSize = cellSize;
  if (!cellSize) {
    throw new Error('initTextures: no cell size')
  }
}

export async function loadTextures() {
  const obj = await generateTileTextureCanvas(textureState.images,
    textureState.totalCells,
    textureState.cellSize,
    textureLookup,
  );
  textureState.atlasCanvas = obj.atlasCanvas;
  if (obj.textureLookup !== textureLookup) {
    Object.assign(textureLookup, obj.textureLookup);
  }
  console.log('initTextures: atlasCanvas created', 'width:', obj.atlasCanvas.width, 'height:', obj.atlasCanvas.height);
  return {
    atlasCanvas: obj.atlasCanvas,
    textureLookup,
  };
};

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
  (canvas.width % 16 !== 0) && console.warn('createCanvasTexture: canvas width is not multiple of 16', 'width:', canvas.width);
  (canvas.height % 16 !== 0) && console.warn('createCanvasTexture: canvas height is not multiple of 16', 'height:', canvas.height);
  const texW = canvas.width;
  const texH = canvas.height;
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
  } catch (err) {
    console.error('texImage2D failed', 'errMsg:', err && err.message);
    return null;
  }
  const pot = isPowerOf2(texW) && isPowerOf2(texH);

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
