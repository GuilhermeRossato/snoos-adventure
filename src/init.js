import { b, ib } from "../utils/bezier.js";
import { drawHTML5 } from "../utils/drawHTML5.js";
import { expoEase } from "../utils/expoEase.js";
import { keys } from "./keys.js";

let last = 0;
let initialized = 0;
let canvas;
let ctx;
let width = 480;
let height = 480;

let ms = 0;

keys.onKeyDown('up', (event) => {
  console.log('Resetting HTML5 logo animation');
});

keys.onKeyDown('KeyR', (event) => {
  if (event.shift) {
    console.log('Resetting HTML5 logo animation');
    ms = 0;
  }
});

function showHtml5Logo(time) {
	const delta = -(last - ( last = time ));
  ms += delta > 100 ? 16 : delta;
  const t = Math.min(1, expoEase(b(0, 1, ib(0, 2000, ms))));
  if (t <= 1) {
    const scale = 1;
    drawHTML5(ctx, width / 2 - 90 * scale, height / 2 - ((255 + 30) / 2) * scale, scale, t);

  }
  requestAnimationFrame(showHtml5Logo);
}


requestAnimationFrame(function prepareHtml5Logo(time) {
  if (initialized >= 10) {
    initialized = time;
    return requestAnimationFrame(showHtml5Logo);
  }
  if (window.scrollY <= 0) return requestAnimationFrame(prepareHtml5Logo);
  canvas = document.querySelector('canvas');
  if (!canvas) return requestAnimationFrame(prepareHtml5Logo);
  if (window['canvas']) {
    window["canvas"] = canvas;
    width = canvas.width;
    height = canvas.height;
    ctx = canvas.getContext('2d');
    window["ctx"] = ctx;
  }
  const rect = canvas.getBoundingClientRect();
  if (rect.bottom > window.innerHeight) return requestAnimationFrame(prepareHtml5Logo);
  initialized = initialized <= 0.5 ? 1 : Math.max(1, initialized + (time - last > 100 ? -1 : 2));
  last = time;
  return requestAnimationFrame(prepareHtml5Logo);
});