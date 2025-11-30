import startGameLoop from "./game.js";

let initialized = false;

function updateGame() {
console.log('Game loop updating...');
}

export function handleGameMenu(time) {
  if (!initialized) {
    initialized = true;
    startGameLoop(updateGame);
    window.sessionStorage.setItem('has-loaded', "1");
  }
}
