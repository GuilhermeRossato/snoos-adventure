export function processPlayerOnIce(player, tiles, dt, time) {
  const friction = 0.98;
  player.vx *= friction;
  player.vy *= friction;
}