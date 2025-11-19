const lastCheck = {};
const lastState = {
  centered: null,
};

function getCanvasDistance() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return NaN;
  }
  const rect = canvas.getBoundingClientRect();
  return Math.round(Math.floor(rect.top + rect.height / 2) - Math.floor(window.innerHeight / 2));
}
window["getCanvasDistance"] = getCanvasDistance;

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.querySelector('canvas');
  canvas.addEventListener('mousedown', () => {
    const distance = getCanvasDistance();
    if (Math.abs(distance) > 2) {
      lastState.centered = Date.now();
      console.log('Centering canvas on click');
      window.scrollBy({ top: distance, left: 0, behavior: 'smooth' });
    }
  });
  // console.log('Preparing to slide header images if needed');
  const slide = sessionStorage.getItem('last-header-slide');
  if (slide && Math.abs(Date.now() - parseInt(slide)) < 0) {
    // console.log('Skipping header slide animation');
    document.querySelectorAll('.header-image').forEach(e => (e.style.marginLeft = `-0vw`));
    return;
  }
  // console.log('Starting header slide animation');
  document.querySelectorAll('.header-image').forEach(e => (e.style.marginLeft = `-20vw`));
  const latest = [0, 0, 0, 0, 0];

  function handler(t) {
    latest.shift();
    latest.push(t);
    for (let i = 1; i < latest.length; i++) {
      const delta = Math.abs(latest[i] - latest[i - 1]);
      if (delta > 66) {
        // console.log('Waiting to slide header images because of frame delay:', delta, 'ms', 'at', i);
        requestAnimationFrame(handler);
        return;
      }
    }
    // console.log('Sliding header image');
    sessionStorage.setItem('last-header-slide', String(Date.now()));
    document.querySelectorAll('.header-image').forEach(e => (e.style.marginLeft = `-0vw`));
  }

  requestAnimationFrame(handler);
})