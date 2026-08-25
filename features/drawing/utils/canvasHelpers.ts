export function drawSelectionBox(ctx: CanvasRenderingContext2D, minX: number, minY: number, maxX: number, maxY: number) {
  ctx.save();
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 1 / ctx.getTransform().a; // 保持 1px 视觉宽度
  ctx.setLineDash([4 / ctx.getTransform().a, 4 / ctx.getTransform().a]);
  ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
  ctx.setLineDash([]);
  
  // 绘制控制点
  const size = 6 / ctx.getTransform().a;
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#3b82f6';
  const corners = [
    [minX, minY], [maxX, minY], [minX, maxY], [maxX, maxY],
    [(minX + maxX) / 2, minY], [(minX + maxX) / 2, maxY],
    [minX, (minY + maxY) / 2], [maxX, (minY + maxY) / 2]
  ];
  corners.forEach(([x, y]) => {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
    ctx.strokeRect(x - size / 2, y - size / 2, size, size);
  });
  ctx.restore();
}

export function drawArrow(ctx: CanvasRenderingContext2D, fromx: number, fromy: number, tox: number, toy: number, headlen: number = 10) {
  const dx = tox - fromx;
  const dy = toy - fromy;
  const angle = Math.atan2(dy, dx);
  ctx.moveTo(fromx, fromy);
  ctx.lineTo(tox, toy);
  ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(tox, toy);
  ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
}