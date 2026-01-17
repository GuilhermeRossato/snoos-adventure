import { sleep } from "../../utils/sleep.js";
import { loadImage } from "../loadImage.js";
import { getTexturePosition } from "../tiles/solid.js";
import { renderingState } from "./rendering.js";
import { SpriteBatch } from "./sprites.js";
import { textureLookup } from "./textures.js";
import { colorToTile, colorValues, tileMetadata } from "./tiles.js";

/**
 * @type {Object<string, Awaited<ReturnType<loadMap>>>}
 */
const maps = {
  "map-01": null,
};

export const mapsState = {
  maps,
}

export async function loadMaps() {
  mapsState.maps["map-01"] = await loadMap('./maps/map-01.png');

  return mapsState;
}

export async function loadMap(path) {
  const image = await loadImage(path);
  if (!image) {
    console.log('[loadMaps] Failed to load image: map/map-01.png');
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  canvas.style.width = (Math.floor(image.width) * 2) + 'px';
  canvas.style.height = (Math.floor(image.height) * 2) + 'px';
  canvas.style.imageRendering = 'pixelated';
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = image.width / rect.width;
    const scaleY = image.height / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    const ctx = canvas.getContext('2d');
    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const r = pixel[0];
    const g = pixel[1];
    const b = pixel[2];
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
    if (canvas.title === `({x}, ${y}): ${hex}`) {
      return;
    }
    canvas.title = `({x}, ${y}): ${hex}`;
  });
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  const missingColors = new Map();
  const logRec = {};
  const spriteChunks = [];
  const spritePosMap = new Map();
  const spriteMap = new Map();
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const idx = (y * image.width + x) * 4;
      const r = data[idx + 0];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (r > 250 && g > 250 && b > 250) {
        data[idx + 3] = 0;
        continue;
      }
      const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
      let sprite = colorToTile[hex];
      if (!sprite) {
        const distances = Object.entries(colorValues).map(([color, [cr, cg, cb]]) => [color, Math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)]).sort((a, b) => a[1] - b[1]);
        const [closestColor, closestDist] = distances[0];
        if (closestDist && typeof closestDist === 'number' && closestDist < 30) {
          sprite = colorToTile[closestColor];
        }
      }
      if (!sprite) {
        if (!logRec[hex]) {
          missingColors.set(hex, [x, y]);
          console.log(`[loadMaps] No sprite mapped for color ${hex} at (${x},${y}): 3x3 color block around`);
          const rows = [];
          for (let dy = -1; dy <= 1; dy++) {
            let row = '';
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) {
                row += '[----] ';
                continue;
              }
              const nidx = (ny * image.width + nx) * 4;
              const nr = data[nidx + 0];
              const ng = data[nidx + 1];
              const nb = data[nidx + 2];
              const nhex = '#' + [nr, ng, nb].map(v => v.toString(16).padStart(2, '0').toUpperCase()).join('');
              row += `[${nhex}] `;
            }
            rows.push(row);
            console.log(rows.join('\n'));
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx === 0) {
                console.log(`%c[loadMaps] Background color at ({x},${y}): ${hex}`, `background-color: ${hex}; font-weight: bold;`);
                console.log("  \"" + hex + "\": \"unknown\",");
              }
            }
          }
        }
        logRec[hex] = (logRec[hex] || 0) + 1;
        continue;
      }
      spriteChunks.push({ x, y, tile: sprite });
      let spriteArray = spriteMap.get(sprite);
      if (!spriteArray) {
        spriteArray = [];
        spriteMap.set(sprite, spriteArray);
      }
      spriteArray.push({ x, y });
      spritePosMap.set(`${x},${y}`, sprite);
    }
  }
  await sleep(10);
  for (const [hex, [x, y]] of missingColors.entries()) {
    console.log(`%c[loadMaps] Missing color at (${x},${y}): ${hex}`, `background-color: ${hex}; font-weight: bold;`);
  }
  ctx.putImageData(imageData, 0, 0);
  const spriteRecords = Object.fromEntries(spriteMap);
  const spriteMetadata = createMapSpriteMetadata();
  return {
    spriteMetadata,
    spriteChunks,
    spriteRecords,
    createSprites(batch = undefined) {
      if (!batch) {
        const maxSprites = (spriteChunks.length > 0 ? spriteChunks.length : 1280) + 128;
        batch = SpriteBatch.create(renderingState.displayGL, renderingState.displayGL.canvas.width, renderingState.displayGL.canvas.height, maxSprites);
      }
      batch.map = this;
      if (batch.clear) {
        batch.clear();
      } else {
        batch.spriteCount = 0;
      }
      console.log('[loadMap.createSprites] Creating sprites from map data, total chunks:', spriteChunks.length);
      
      for (const [tile, positions] of spriteMap.entries()) {
        if (['player'].includes(tile)) {
          this.px = positions[0].x;
          this.py = positions[0].y;
          console.log('[loadMap.createSprites] Player start position:', { x: this.px, y: this.py });
          continue;
        }
        if (['enemy', 'exit'].includes(tile)) {
          continue;
        }
        const metadata = tileMetadata[tile];
        const info = textureLookup[tile];
        if (!info) {
          console.warn(`[loadMap.applyToBatch] Missing textureInfo for tile: ${tile}`);
          continue;
        }
        for (const pos of positions) {
          let tx = info.x;
          let ty = info.y;
          spriteMetadata.set(pos.x, pos.y, 'tile', tile);
          if (tile === 'solid') {
            const obj = getTexturePosition(pos.x, pos.y, spritePosMap, spriteMetadata);
            if (obj) {
              spriteMetadata.set(pos.x, pos.y, 'texturePos', obj);
              console.log('getTexturePosition result:', pos.x, pos.y, obj);
            }
            if (obj && typeof obj === 'object') {
              if (typeof obj.x === 'number') {
                tx = obj.x;
              }
              if (typeof obj.y === 'number') {
                ty = obj.y;
              }
            }
          }
          batch.createSprite(
            pos.x * 16,
            pos.y * 16,
            metadata?.width || info.w, metadata?.height || info.h,
            tx, ty,
            metadata?.width || info.w, metadata?.height || info.h,
            [1, 1, 1, 0]
          );
        }
      }
      return batch;
    }
  }
}

export function createMapSpriteMetadata() {
  return {
    set(x, y, key, value) {
      if (key === 'get' || key === 'set') {
        throw new Error(`spriteMetadata.set: invalid key name: ${JSON.stringify(key)}`);
      }
      if (!this[`${x},${y}`]) {
        this[`${x},${y}`] = {};
      }
      if (key && typeof key === 'object') {
        for (const [k, v] of Object.entries(key)) {
          this.set(x, y, k, v);
        }
        return this;
      }
      this[`${x},${y}`][key] = value;
    },
    get(x, y, key) {
      if (key === 'get' || key === 'set') {
        throw new Error(`spriteMetadata.set: invalid key name: ${JSON.stringify(key)}`);
      }
      if (!this[`${x},${y}`]) {
        return undefined;
      }
      return key ? this[`${x},${y}`][key] : this[`${x},${y}`];
    }
  };
}
