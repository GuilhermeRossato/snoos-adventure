import { b, bc, ib, ibc } from "../utils/bezier.js";
import { drawHTML5 } from "../utils/drawHTML5.js";
import { expoEase } from "../utils/expoEase.js";
import { handleGameMenu } from "./menu.js";
import { keys } from "./keys.js";

let last = 0;
let initialized = 0;
/** @type {HTMLCanvasElement} */
let canvas;
/** @type {CanvasRenderingContext2D} */
let ctx;
let width = 480;
let height = 480;

let ms = 0;

keys.onKeyDown('up', (event) => {
  console.log('Resetting HTML5 logo animation');
});

keys.onKeyDown('KeyR', (event) => {
  console.log('Resetting HTML5 logo animation');
  if (event.shift) {
    console.log('Resetting HTML5 logo animation');
    ms = 0;
  }
});

let loop = true;
keys.onMouseMove((event) => {
  if (keys.states.shift) {
    loop = false;
    ms = event.x * 4000;
    renderHtml5Logo(ms);
  } else if (!loop) {
    loop = true;
    requestAnimationFrame(showHtml5Logo);
  }
});

function showHtml5Logo(time) {
  const delta = -(last - (last = time));
  ms += delta > 100 ? 16 : delta;
  renderHtml5Logo(ms);
}

function renderHtml5Logo(time) {
  const t = Math.min(1, expoEase(b(0, 1, ib(0, 2000, time))));
  const scale = bc(0.7, 1.05, bc(0, 1.0, expoEase(ibc(100, 2500, time))));
  drawHTML5(ctx, width / 2 - 90 * scale, height / 2 - ((255 + 30) / 2) * scale, scale, t);
  if (time >= 1700) {
      ctx.fillStyle = `rgba(240,240,240,${bc(0, 1, ib(2000, 2500, time))})`;
      ctx.strokeStyle = `#ccc`;
      const stage = b(0, 255, ib(2000, 3250, time));
      const x = (canvas.width / 2) - 150 + 2;
      const y = 0.2 + (canvas.height / 2 - 255 / 2) + 266 + 2;
      const progress = Math.min(1, stage / 255);
      ctx.fillRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 296 * progress, 14 + 0.5);
      ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, 296 + 0.5, 14 + 0.5);
  }
  if (time > 3000) {
    ctx.globalAlpha = 1 - Math.min(1, expoEase(b(0, 1, ib(3250, 3500, time))));
  }
  if (time > 3500 && loop) {
    requestAnimationFrame(handleGameMenu);
  } else if (loop) {
    requestAnimationFrame(showHtml5Logo);
  }
}

requestAnimationFrame(function prepareHtml5Logo(time) {
  if (initialized >= 10) {
    initialized = time;
    return requestAnimationFrame(showHtml5Logo);
  }
  canvas = document.querySelector('canvas');
  if (!canvas) return requestAnimationFrame(prepareHtml5Logo);
  if (window['canvas']) {
    window["canvas"] = canvas;
    width = canvas.width;
    height = canvas.height;
    ctx = canvas.getContext('2d');
    window["ctx"] = ctx;
  }
  if (time < 500) {
    const rect = canvas.getBoundingClientRect();
    if (rect.bottom > window.innerHeight) return requestAnimationFrame(prepareHtml5Logo);
  }
  initialized = initialized <= 0.5 ? 1 : Math.max(1, initialized + (time - last > 100 ? -1 : 2));
  last = time;
  return requestAnimationFrame(prepareHtml5Logo);
});