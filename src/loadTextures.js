import { textures } from "./game.js";
import { loadImage } from "./loadImage.js";

export async function loadTextures() {
  const debug = false;

  debug && console.log('start', 'typeCount:', Object.keys(textures).length);

  const textureLookup = {};
  const keys = Object.keys(textures);
  if (keys.length === 0) {
    debug && console.log('no types present', 'keysLen:', keys.length);
    return { canvas: null, lookup: textureLookup };
  }
  const images = [];
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const texPath = textures[key] && textures[key].texture;
    if (!texPath) {
      console.error('loadTextures: missing texture path', 'key:', key);
      continue;
    }
    try {
      const img = await loadImage(texPath);
      images.push({ key, img });
      debug && console.log('image loaded', 'index:', i, 'key:', key,
        'imgW:', img.width, 'imgH:', img.height, 'file:', JSON.stringify(texPath).slice(0, 16), 'len:', texPath.length);
    } catch (err) {
      console.error('loadTextures: load failed', 'key:', key, 'file:', JSON.stringify(texPath).slice(0, 16),
        'len:', texPath.length, 'errMsg:', err && err.message);
      continue;
    }
  }
  if (images.length === 0) {
    console.error('loadTextures: no images loaded', 'requested:', keys.length);
    return { canvas: null, lookup: textureLookup };
  }

  // Dynamic packing (16x16 cell grid)
  const CELL = 16;
  let totalCells = 0;
  const validImages = [];
  for (const it of images) {
    const w = it.img.width;
    const h = it.img.height;
    if ((w % CELL) !== 0 || (h % CELL) !== 0) {
      console.error('loadTextures: image size not multiple of 16 -> skipped', 'key:', it.key, 'w:', w, 'h:', h);
      continue;
    }
    const wc = w / CELL;
    const hc = h / CELL;
    totalCells += wc * hc;
    validImages.push({ key: it.key, img: it.img, w, h, wc, hc });
  }
  if (validImages.length === 0) {
    console.error('loadTextures: no valid images after size filtering', 'incoming:', images.length);
    return { canvas: null, lookup: textureLookup };
  }

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
  let atlasCanvas = document.getElementById('textureAtlas');
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
    atlasCanvas.id = 'textureAtlas';
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
    return { canvas: atlasCanvas, lookup: textureLookup };
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

  debug && console.log('complete', 'drawnCount:', placements.length, 'lookupKeys:', Object.keys(textureLookup).length);
  return { canvas: atlasCanvas, lookup: textureLookup };
}
