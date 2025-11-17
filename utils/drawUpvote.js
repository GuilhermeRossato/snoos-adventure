export function drawUpvote(ctx, ax, ay, scale, angle, white, typez) {
  ctx.save();
  ctx.translate(ax, ay);
  if (white) {
    ctx.fillStyle = "#FFF";
    ctx.shadowColor = "#FFF";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 5;
  } else {
    //var g = ctx.createLinearGradient(0,-6.125,0,6.125);
    ctx.fillStyle = typez;
  }
  ctx.rotate(angle);
  ctx.scale(scale * 0.8, scale);
  ctx.beginPath();
  ctx.moveTo(0.25, -5);
  ctx.lineTo(7.25, 1.5);
  ctx.lineTo(2.25, 1.5);
  ctx.lineTo(2.25, 5.7);
  ctx.lineTo(-2.25, 5.7);
  ctx.lineTo(-2.25, 1.5);
  ctx.lineTo(-6.75, 1.5);
  ctx.fill();
  ctx.restore();
}
