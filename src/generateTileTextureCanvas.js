import { sleep } from "../utils/sleep.js";
import { loadImage } from "./loadImage.js";

export async function loadTileImages(tileLookup) {
  const debug = false;
  const tileNames = Object.keys(tileLookup);
  if (tileNames.length === 0) {
    debug && console.log('no types present', 'keysLen:', tileNames.length);
    throw new Error('Could not generate tile texture canvas');
  }
  const chunkSize = 8;
  const loadImageChunks = [];

  for (let i = 0; i < tileNames.length; i += chunkSize) {
    const chunkKeys = tileNames.slice(i, i + chunkSize);
    const chunkPromises = chunkKeys.map(async names => {
      const texPath = typeof tileLookup[names] === 'string' || (tileLookup[names] && tileLookup[names] instanceof Array) ? tileLookup[names] : tileLookup[names] && (tileLookup[names].texture || tileLookup[names].textures);
      if (!texPath) {
        console.error('loadTextures: missing texture path', 'key:', names);
        return null;
      }
      try {
        const namesArr = texPath instanceof Array ? texPath : [texPath];
        const paths = namesArr.map(p => p.includes('/') ? p : `./assets/tiles/${p}`);
        const imgs = await Promise.all(paths.map(path => loadImage(path)));
        return { key: names, imgs };
      } catch (err) {
        console.error('loadTextures: load failed', 'key:', names, 'file:', JSON.stringify(texPath).slice(0, 16),
          'len:', texPath.length, 'errMsg:', err && err.message);
        return null;
      }
    });

    loadImageChunks.push(Promise.all(chunkPromises));
  }

  const validImages = [];
  // Dynamic packing (16x16 cell grid)
  const cellSize = 16;
  let totalCells = 0;
  try {
    const chunkedResults = await Promise.all(loadImageChunks);
    const images = chunkedResults.flat().filter(Boolean);

    if (images.length === 0) {
      console.error('loadTextures: no images loaded', 'requested:', tileNames.length);
      throw new Error('Could not generate tile texture canvas');
    }

    for (const { imgs, key } of images) {
      for (let index = 0; index < imgs.length; index++) {
        const img = imgs[index];
        const w = img?.width;
        const h = img?.height;
        if ((w % cellSize) !== 0 || (h % cellSize) !== 0) {
          console.error('loadTextures: image size not multiple of 16 -> skipped', 'key:', key, 'w:', w, 'h:', h);
          continue;
        }
        const wc = w / cellSize;
        const hc = h / cellSize;
        totalCells += wc * hc;
        validImages.push({ key, index, img, w, h, wc, hc });
      }
    }
  } catch (error) {
    console.error('Error loading images:', error);
    throw error;
  }

  if (validImages.length === 0) {
    console.error('loadTextures: no valid images after size filtering', 'incoming:', tileNames.length);
    throw new Error('Could not generate tile texture canvas');
  }

  return { validImages, totalCells, cellSize };
}

export async function generateTileTextureCanvas(validImages, totalCells, CELL, textureLookup = {}) {
  const debug = false;
  // Choose atlas width in cells (square-ish)
  const sideCells = Math.max(1, Math.ceil(Math.sqrt(totalCells)));
  const atlasCellsW = sideCells;
  const atlasW = atlasCellsW * CELL;
  debug && console.log('packing params', 'totalCells:', totalCells, 'atlasCellsW:', atlasCellsW, 'atlasW:', atlasW);

  // Sort largest area first
  validImages.sort((a, b) => (b.w * b.h) - (a.w * a.h));

  const occupancy = []; // rows of boolean[]
  let rows = 0;

  function ensureRows(r) {
    while (rows < r) {
      console.log('adding row', 'rowsNow:', rows);
      occupancy.push(new Array(atlasCellsW).fill(false));
      rows++;
      debug && console.log('row added', 'rowsNow:', rows);
    }
  }

  function canPlace(x, y, wc, hc) {
    for (let ry = 0; ry < hc; ry++) {
      const row = occupancy[y + ry];
      if (!row) return false;
      for (let rx = 0; rx < wc; rx++) {
        if (row[x + rx]) return false;
      }
    }
    return true;
  }

  function markPlace(x, y, wc, hc) {
    for (let ry = 0; ry < hc; ry++) {
      const row = occupancy[y + ry];
      for (let rx = 0; rx < wc; rx++) {
        row[x + rx] = true;
      }
    }
  }

  const placements = [];
  for (let i = 0; i < validImages.length; i++) {
    const it = validImages[i];
    const wc = it.wc;
    const hc = it.hc;
    let placed = false;
    let attempts = 0;
    while (!placed) {
      attempts++;
      // Scan existing rows
      for (let y = 0; y <= Math.max(0, rows - hc); y++) {
        for (let x = 0; x <= atlasCellsW - wc; x++) {
          if (canPlace(x, y, wc, hc)) {
            markPlace(x, y, wc, hc);
            placements.push({ key: it.key, img: it.img, xPx: x * CELL, yPx: y * CELL, w: it.w, h: it.h });
            placed = true;
            debug && console.log('placed', 'key:', it.key, 'xCell:', x, 'yCell:', y, 'wCells:', wc, 'hCells:', hc,
              'xPx:', x * CELL, 'yPx:', y * CELL, 'attempts:', attempts);
            break;
          }
        }
        if (placed) break;
      }
      if (placed) break;
      // Need more rows
      ensureRows(rows + 1);
      debug && console.log('expand rows for image', 'key:', it.key, 'rowsNow:', rows);
    }
  }
  const atlasH = rows * CELL;
  debug && console.log('final atlas size', 'atlasW:', atlasW, 'atlasH:', atlasH, 'rows:', rows, 'placements:', placements.length);
  /** @type {HTMLCanvasElement} */ // @ts-ignore
  let atlasCanvas = document.getElementById('canvas_atlas');
  if (atlasCanvas) {
    if (atlasCanvas.width !== atlasW || atlasCanvas.height !== atlasH) {
      atlasCanvas.width = atlasW;
      atlasCanvas.height = atlasH;
      debug && console.log('reused canvas resized', 'atlasW:', atlasW, 'atlasH:', atlasH);
    } else {
      debug && console.log('reused canvas same size', 'atlasW:', atlasW, 'atlasH:', atlasH);
    }
  } else {
    atlasCanvas = document.createElement('canvas');
    atlasCanvas.id = 'canvas_atlas';
    atlasCanvas.width = atlasW;
    atlasCanvas.height = atlasH;
    if (document.body) {
      document.body.appendChild(atlasCanvas);
      debug && console.log('new canvas appended', 'atlasW:', atlasW, 'atlasH:', atlasH);
    } else {
      console.error('loadTextures: document.body missing; cannot append canvas');
    }
  }
  const ctx = atlasCanvas.getContext('2d');
  if (!ctx) {
    console.error('loadTextures: 2d context creation failed');
    return { atlasCanvas, textureLookup };
  }
  ctx.clearRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  debug && console.log('canvas cleared', 'w:', atlasCanvas.width, 'h:', atlasCanvas.height);

  for (let i = 0; i < placements.length; i++) {
    const p = placements[i];
    try {
      ctx.drawImage(p.img, p.xPx, p.yPx);
      debug && console.log('image drawn', 'i:', i, 'key:', p.key, 'x:', p.xPx, 'y:', p.yPx, 'w:', p.w, 'h:', p.h);
    } catch (err) {
      console.error('loadTextures: drawImage failed', 'i:', i, 'key:', p.key, 'x:', p.xPx, 'y:', p.yPx, 'errMsg:', err && err.message);
      continue;
    }
    textureLookup[p.key] = {
      x: p.xPx, y: p.yPx, w: p.w, h: p.h,
      u0: p.xPx / atlasW, v0: p.yPx / atlasH,
      u1: (p.xPx + p.w) / atlasW, v1: (p.yPx + p.h) / atlasH
    };
    debug && console.log('lookup stored', 'key:', p.key,
      'u0:', textureLookup[p.key].u0.toFixed(4), 'v0:', textureLookup[p.key].v0.toFixed(4),
      'u1:', textureLookup[p.key].u1.toFixed(4), 'v1:', textureLookup[p.key].v1.toFixed(4));
  }
  await sleep(10);
  debug && console.log('complete', 'drawnCount:', placements.length, 'lookupKeys:', Object.keys(textureLookup).length);
  return { atlasCanvas, textureLookup };
}
