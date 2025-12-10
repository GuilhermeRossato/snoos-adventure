import { loadImage } from "../loadImage.js";
import { textureLookup } from "./textures.js";

export const mapsState = {
  maps: {
    "map-01": null,
  },

}

export async function loadMaps() {
  
  const maps = {
    "map-01": await loadMap('./maps/map-01.png'),
  };
  return maps;
}

export async function createSpriteChunkFromList(list) {
  const tileSize = 32;
  try {
    if (!Array.isArray(list)) {
      console.error('createSpriteChunkFromList: invalid list (not array)', 'type:', typeof list);
      return 0;
    }
    if (list.length === 0) {
      console.log('createSpriteChunkFromList: empty list, nothing to create');
      return 0;
    }
    let created = 0;
    let skipped = 0;

    for (let i = 0; i < list.length; i++) {
      const it = list[i];
      if (!it || typeof it.x !== 'number' || typeof it.y !== 'number' || typeof it.sprite !== 'string') {
        console.error('createSpriteChunkFromList: invalid item', 'index:', i, 'item:', it);
        skipped++;
        continue;
      }
      const name = it.sprite;
      const region = textureLookup && textureLookup[name] ? textureLookup[name] : null;
      let sx, sy, sw, sh;
      if (!region) {
        // Changed: placeholder scales with tileSize
        sx = 0; sy = 0; sw = tileSize; sh = tileSize;
        console.warn('createSpriteChunkFromList: atlas region missing, using placeholder', 'name:', name, 'index:', i, 'fallback:', { sx, sy, sw, sh });
      } else {
        sx = region.x; sy = region.y; sw = region.w; sh = region.h;
      }

      const dx = it.x * tileSize;
      const dy = it.y * tileSize;
      const spr = createSprite(dx, dy, sw, sh, sx, sy, sw, sh, [1, 1, 1, 0]);
      if (!spr) {
        console.error('createSpriteChunkFromList: failed to create sprite', 'index:', i, 'dx:', dx, 'dy:', dy, 'src:', { sx, sy, sw, sh }, 'name:', name);
        skipped++;
        continue;
      }
      created++;
    }

    try {
      sampleBatch.uploadDirty();
      console.log('createSpriteChunkFromList: uploadDirty completed', 'created:', created, 'skipped:', skipped, 'total:', list.length);
    } catch (err) {
      console.error('createSpriteChunkFromList: uploadDirty failed', 'errMsg:', err && err.message, 'created:', created, 'skipped:', skipped);
    }

    return created;
  } catch (err) {
    console.error('createSpriteChunkFromList: unexpected failure', 'errMsg:', err && err.message);
    return 0;
  }
}

export async function loadMap(path) {
  const image = await loadImage(path);
  if (!image) {
    console.log('[loadMaps] Failed to load image: map/map-01.png');
    return;
  }
  console.log('[loadMaps] Image loaded successfully:', image.width, image.height);

  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);

  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  const data = imageData.data;

  const colorToSprite = {
    '#000000': 'player',
    '#FF7F27': 'stone',
    '#0000FF': 'water',
    '#FF0000': 'lava',
    '#ED1C24': 'lava',
    '#22B14C': 'enemy',
    "#C3C3C3": "exit",
  };
  const logRec = {};
  const spriteChunks = [];
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
      const sprite = colorToSprite[hex];
      if (!sprite) {
        if (!logRec[hex]) {
          console.log(`[loadMaps] No sprite mapped for color ${hex} at (${x},${y}): 3x3 color block around`);
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
            console.log(row);
            for (let dx = -1; dx <= 1; dx++) {
              if (dy === 0 && dx === 0) {
                console.log(`%c[loadMaps] Background color at (${x},${y}): ${hex}`, `color: ${hex}; font-weight: bold;`);
                console.log("  \"" + hex + "\": \"unknown\",");
              }
            }
          }
        }
        logRec[hex] = (logRec[hex] || 0) + 1;
        continue;
      }
      spriteChunks.push({ x, y, sprite });
    }
  }
  ctx.putImageData(imageData, 0, 0);
  const sortedLogRec = Object.entries(logRec)
    .sort((a, b) => b[1] - a[1]);
  console.log('[loadMaps] Top 5 unmapped colors:', sortedLogRec.slice(0, 5));
  console.log('[loadMaps] Map loaded with', spriteChunks.length, 'sprites');
  
}
