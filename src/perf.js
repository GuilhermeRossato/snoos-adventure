import { b, bc, ib } from "../utils/bezier.js";
import { g } from "../utils/g.js";
import { sleep } from "../utils/sleep.js";
import { draw5x3 } from "./draw5x3.js";

export const w = 64;
export const h = 32;

const c = document.createElement('canvas');
c.width = w;
c.height = h;
c.style.position = 'fixed';
c.style.bottom = '0px';
c.style.left = '0px';
c.style.width = (w * 2) + 'px';
c.style.height = (h * 2) + 'px';
c.style.imageRendering = 'pixelated';
c.style.zIndex = '10000';
c.style.backgroundColor = 'rgba(0,0,0,1)';
c.style.opacity = '0.75';
c.style.border = 'solid 4px rgba(0,255,0,0.25)';
c.classList.add('perf-monitor');
export const ctx = c.getContext('2d');

let [lx, lt, ls, ct, lm, dlt, dmt] = [0, 0, 0, 0, 0, 0, 0];

/** @type {ImageData} */
export let ld;

/**
 * Calculates badness at a given height based on specified parameters.
 * @param {number} v - Value (zero to one) indicating badness.
 * @param {number} y - Height parameter.
 * @param {number} h - Total height.
 * @param {number} gradientHeight - Height of the gradient.
 * @returns {number} - Returns the calculated badness value.
 */
function getBadnessAtHeight(v, y, h, gradientHeight = 4) {
  const gh = (h * gradientHeight) / 64;
  const div = b(h - 4, 1, ib(0, 1, v));
  return Math.min(1, Math.max(0, ib(div - gh, div + gh, y)));
}

document.body.appendChild(c);
let running = false;
let mode = localStorage.getItem('perf-mode') || 'fps';

export async function logPerf(t, special = false) {
  if (special) return;
  if (!lt) {
    console.log('perf: init');
    lx = 0;
    lt = t;
    ls = 0;
    lm = 0
    ld = ctx.getImageData(0, 0, w, h);
    return;
  }
  if (running) {
    return;
  }
  running = true;
  await sleep(1);
  try {
    const dt = t - lt;
    lt = t;
    lx = (lx + 1) % w;
    dlt = dt * 0.3 + dlt * 0.7;
    const mem = performance.memory ? performance.memory.usedJSHeapSize / 1024 / 1024 : 0;
    dmt = mem * 0.3 + dmt * 0.7;

    /** @type {any} */
    const bads = [
      b(h, 0, ib(10, 100, dlt)),
      b(h, 0, ib(4, 64, dmt)),
    ];
    for (let y = 0; y < h; y++) {
      if (y < bads[0]) {
        ld.data[(y * w + lx) * 4 + 0] = 0;
        ld.data[(y * w + lx) * 4 + 1] = 0;
        ld.data[(y * w + lx) * 4 + 2] = 0;
        ld.data[(y * w + lx) * 4 + 3] = 255;
        continue;
      }
      if (y >= bads[0]) {
        ld.data[(y * w + lx) * 4 + 0] = 255;
        ld.data[(y * w + lx) * 4 + 1] = 0;
        ld.data[(y * w + lx) * 4 + 2] = 0;
        ld.data[(y * w + lx) * 4 + 3] = 255;
        continue;
      }
    }
    if (Math.abs(ls - t) >= 33) {
      ls = t;
      ct++;
      console.log(dlt);
      (ct % 3 === 0) && draw5x3(1, 1, `${dlt.toFixed(1)} MS`.padEnd(8, ' '));
      (ct % 3 === 2) && draw5x3(1, 1, ` ${dmt.toFixed(1)} MB`.padEnd(8, ' '));
    }

    ctx.putImageData(ld, 0, 0);
    running = false;
  } catch (error) {
    console.error('logPerf: error', error);
    setTimeout(() => {
      running = false;
    }, 1000);
  }
}


