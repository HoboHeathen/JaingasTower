// Web Worker for Line of Sight calculations — runs off the main thread

function cellDist(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function isCellBlockedByWall(col, row, wallSet) {
  return wallSet.has(`${col},${row}`);
}

function getLineOfSightCells(fromCol, fromRow, toCol, toRow) {
  const cells = [];
  let x0 = fromCol, y0 = fromRow;
  const x1 = toCol, y1 = toRow;
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0, y = y0;
  while (true) {
    cells.push({ col: x, row: y });
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x += sx; }
    if (e2 < dx) { err += dx; y += sy; }
  }
  return cells;
}

// Build a fast Set of blocking wall cells for O(1) lookup instead of O(walls*cells) per check
function buildWallSet(walls) {
  const set = new Set();
  for (const wall of walls) {
    if (!wall.cells) continue;
    const isBlocking = wall.type === 'wall' || wall.type === 'obstacle' || (wall.type === 'door' && !wall.is_open);
    if (!isBlocking) continue;
    for (const c of wall.cells) {
      set.add(`${c.col},${c.row}`);
    }
  }
  return set;
}

function calculateTokenVisibility(tokenCol, tokenRow, range, wallSet) {
  const visible = new Set();
  visible.add(`${tokenCol},${tokenRow}`);

  for (let col = tokenCol - range; col <= tokenCol + range; col++) {
    for (let row = tokenRow - range; row <= tokenRow + range; row++) {
      const dist = cellDist(tokenCol, tokenRow, col, row);
      if (dist <= range && dist > 0) {
        const path = getLineOfSightCells(tokenCol, tokenRow, col, row);
        let blocked = false;
        // Check all but the last cell (the target itself can be seen even if it IS a wall)
        for (let i = 1; i < path.length - 1; i++) {
          if (isCellBlockedByWall(path[i].col, path[i].row, wallSet)) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          visible.add(`${col},${row}`);
        }
      }
    }
  }
  return visible;
}

self.onmessage = function(e) {
  const { tokens, range, walls, requestId } = e.data;

  // Build wall set once for all tokens
  const wallSet = buildWallSet(walls);

  const results = {};
  for (const token of tokens) {
    // Convert Set to Array for postMessage transfer (Sets can't be structured-cloned directly in all envs)
    results[token.id] = Array.from(calculateTokenVisibility(token.x, token.y, range, wallSet));
  }

  self.postMessage({ results, requestId });
};