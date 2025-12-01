import { bc, ib } from "../utils/bezier.js";

function getCanvasDistance() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return NaN;
  }
  const rect = canvas.getBoundingClientRect();
  return Math.round(Math.floor(rect.top + rect.height / 2) - Math.floor(window.innerHeight / 2));
}

window["getCanvasDistance"] = getCanvasDistance;
let lastScrollTime = 0;
window.addEventListener('load', () => {
  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', () => {
    if (Math.abs(lastScrollTime - Date.now()) < 500) return;
    const distance = getCanvasDistance();
    if (Math.abs(distance) > 2) {
      lastScrollTime = Date.now();
      console.log('Centering canvas on click');
      window.scrollBy({ top: distance, left: 0, behavior: 'smooth' });
    }
  });

  const overlayCache = [0, 0];
  const updateOverlayOpacity = (evt) => {
    const now = Date.now();
    if (now - overlayCache[0] < 50 && evt&&evt.type !== 'scroll') {
      return;
    }
    overlayCache[0] = now;
    let opacity;
    const distance = Math.abs(getCanvasDistance());
    if (distance > 150) {
      opacity = 0;
    } else if (distance < 75) {
      opacity = 0.47;
    } else {
      opacity = 0.47 * (1 - ((distance - 75) / 75));
    }
    // @ts-ignore
    document.querySelectorAll('.overlay-centerize').forEach((el) => el.style.opacity = opacity.toFixed(4));
  };
  setTimeout(updateOverlayOpacity, 200);
  window.addEventListener('scroll', updateOverlayOpacity);
  window.addEventListener('wheel', updateOverlayOpacity);
  window.addEventListener('touchmove', updateOverlayOpacity);
  document.addEventListener('scroll', updateOverlayOpacity);
  document.addEventListener('wheel', updateOverlayOpacity);
  document.addEventListener('touchmove', updateOverlayOpacity);
  setInterval(updateOverlayOpacity, 400);
})