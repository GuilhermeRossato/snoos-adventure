export function drawHTML5(ctx, x, y, scale, perc)/* (180,255) */ {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (perc !== 1) {
    ctx.beginPath();
    if (perc > 0) {
      ctx.moveTo(-0.5, -4);
      ctx.lineTo(180, -4);
      ctx.lineTo(180, 291 * perc - 3);
      ctx.lineTo(-0.5, 961 * perc - 3);
    } else {
      ctx.moveTo(-0.5, 289 * -perc);
      ctx.lineTo(180, 289 * -perc);
      ctx.lineTo(180, 289);
      ctx.lineTo(-0.5, 289);
    }
    ctx.clip();
  }
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.moveTo(17, 0);
  ctx.lineTo(27.5, 0);
  ctx.lineTo(27.5, 11.5);
  ctx.lineTo(39.5, 11.5);
  ctx.lineTo(39.5, 0);
  ctx.lineTo(50, 0);
  ctx.lineTo(50, 34.5);
  ctx.lineTo(50, 34.5);
  ctx.lineTo(39.5, 34.5);
  ctx.lineTo(39.5, 23);
  ctx.lineTo(27.5, 23);
  ctx.lineTo(27.5, 34.5);
  ctx.lineTo(27.5, 34.5);
  ctx.lineTo(17, 34.5);

  ctx.moveTo(56, 0);
  ctx.lineTo(86.5, 0);
  ctx.lineTo(86.5, 0);
  ctx.lineTo(86.5, 10);
  ctx.lineTo(77, 10);
  ctx.lineTo(77, 33.5);
  ctx.lineTo(66, 33.5);
  ctx.lineTo(66, 10);
  ctx.lineTo(56, 10);

  ctx.moveTo(93, 0);
  ctx.lineTo(104, 0);
  ctx.lineTo(112, 11);
  ctx.lineTo(120, 0);
  ctx.lineTo(130.5, 0);
  ctx.lineTo(130.5, 33.5);
  ctx.lineTo(120, 33.5);
  ctx.lineTo(120, 17);
  ctx.lineTo(112, 28);
  ctx.lineTo(104, 17);
  ctx.lineTo(104, 33.5);
  ctx.lineTo(93, 33.5);

  ctx.moveTo(137.5, 0);
  ctx.lineTo(137.5, 33.5);
  ctx.lineTo(164, 33.5);
  ctx.lineTo(164, 23);
  ctx.lineTo(148, 23);
  ctx.lineTo(148, 0);
  ctx.fill();

  ctx.fillStyle = "#E44D26";
  ctx.beginPath();
  ctx.moveTo(0, 50);
  ctx.lineTo(180, 50);
  ctx.lineTo(164, 235);
  ctx.lineTo(90, 255);
  ctx.lineTo(17, 235);
  ctx.fill();

  ctx.fillStyle = "#F16529";
  ctx.beginPath();
  ctx.moveTo(92, 65.5);
  ctx.lineTo(164, 65.5);
  ctx.lineTo(151, 222);
  ctx.lineTo(92, 239);
  ctx.fill();

  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.moveTo(91, 88);
  ctx.lineTo(147, 88);
  ctx.lineTo(145, 110);
  ctx.lineTo(91, 110);

  ctx.moveTo(91, 134);
  ctx.lineTo(143, 134);
  ctx.lineTo(136, 203);
  ctx.lineTo(91, 216);
  ctx.lineTo(91, 193);
  ctx.lineTo(116, 186);
  ctx.lineTo(116, 156);
  ctx.lineTo(91, 156);
  ctx.fill();

  ctx.fillStyle = "#EBEBEB";
  ctx.beginPath();
  ctx.moveTo(92.5, 88);
  ctx.lineTo(92.5, 110);
  ctx.lineTo(58, 110);
  ctx.lineTo(60, 134);
  ctx.lineTo(92.5, 134);
  ctx.lineTo(92.5, 156);
  ctx.lineTo(40, 156);
  ctx.lineTo(34, 88);

  ctx.moveTo(92.5, 193);
  ctx.lineTo(92.5, 216);
  ctx.lineTo(44, 203);
  ctx.lineTo(41, 168);
  ctx.lineTo(64, 168);
  ctx.lineTo(65, 186);
  ctx.fill();

  ctx.restore();
}
