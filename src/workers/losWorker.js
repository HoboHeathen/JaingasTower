// Web Worker for Line of Sight calculations — runs off the main thread
// Walls are now line segments: {id, type, x1, y1, x2, y2, is_open}

function cellDist(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// Segment intersection test (returns true if segments AB and CD intersect)
function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-9) return false; // parallel
  const dx2 = cx - ax, dy2 = cy - ay;
  const t = (dx2 * d2y - dy2 * d2x) / cross;
  const u = (dx2 * d1y - dy2 * d1x) / cross;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

// Convert grid cell center to world pixels
function cellCenter(col, row, gs, ox, oy) {
  return { x: col * gs + ox + gs / 2, y: row * gs + oy + gs / 2 };
}

// Build list of blocking segments once per LOS calculation batch
function buildBlockingSegments(walls) {
  return walls.filter((w) => {
    if (w.type === 'wall' || w.type === 'obstacle') return true;
    if (w.type === 'door' && !w.is_open) return true;
    return false;
  });
}

function getLineOfSightCells(fromCol, fromRow, toCol, toRow, blockingSegs, gs, ox, oy) {
  // Ray from center of from-cell to center of to-cell
  const from = cellCenter(fromCol, fromRow, gs, ox, oy);
  const to = cellCenter(toCol, toRow, gs, ox, oy);

  for (const seg of blockingSegs) {
    if (segmentsIntersect(from.x, from.y, to.x, to.y, seg.x1, seg.y1, seg.x2, seg.y2)) {
      return false;
    }
  }
  return true;
}

function calculateTokenVisibility(tokenCol, tokenRow, range, blockingSegs, gs, ox, oy) {
  const visible = new Set();
  visible.add(`${tokenCol},${tokenRow}`);

  for (let col = tokenCol - range; col <= tokenCol + range; col++) {
    for (let row = tokenRow - range; row <= tokenRow + range; row++) {
      const dist = cellDist(tokenCol, tokenRow, col, row);
      if (dist > 0 && dist <= range) {
        if (getLineOfSightCells(tokenCol, tokenRow, col, row, blockingSegs, gs, ox, oy)) {
          visible.add(`${col},${row}`);
        }
      }
    }
  }
  return visible;
}

self.onmessage = function(e) {
  const { tokens, range, walls, requestId, gs = 60, ox = 0, oy = 0 } = e.data;

  const blockingSegs = buildBlockingSegments(walls || []);

  const results = {};
  for (const token of tokens) {
    results[token.id] = Array.from(
      calculateTokenVisibility(token.x, token.y, range, blockingSegs, gs, ox, oy)
    );
  }

  self.postMessage({ results, requestId });
};