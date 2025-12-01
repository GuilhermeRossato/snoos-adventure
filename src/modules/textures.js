import { loadAndPackTileTextures } from "../loadAndPackTileTextures.js";
import { tileLookup } from "./sprites.js";

export const textureLookup = {};

export async function initTextures() {
  return await loadAndPackTileTextures(textureLookup, tileLookup);
}

function isPowerOf2(v) {
  return (v & (v - 1)) === 0 && v !== 0;
}

export async function createAtlasTexture(atlasCanvas, gl) {
  const tex = gl.createTexture();
  if (!tex) {
    console.error('gl.createTexture failed');
    return null;
  }
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, tex);
  try {
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
    console.log('texImage2D success', 'w:', atlasCanvas.width, 'h:', atlasCanvas.height);
  } catch (err) {
    console.error('texImage2D failed', 'errMsg:', err && err.message);
    return null;
  }
  const pot = isPowerOf2(atlasCanvas.width) && isPowerOf2(atlasCanvas.height);
  if (pot) {
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    console.log('mipmaps generated (POT)');
  } else {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    console.log('NPOT clamp + linear');
  }
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return tex;
}