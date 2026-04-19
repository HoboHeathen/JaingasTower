import React, { useRef, useState, useEffect, useCallback } from 'react';
import TokenContextMenu from '@/components/vtt/TokenContextMenu';
import EditHpModal from '@/components/vtt/EditHpModal';
import RenameTokenModal from '@/components/vtt/RenameTokenModal';
import LinkCharacterModal from '@/components/vtt/LinkCharacterModal';
import VttToolbar from '@/components/vtt/VttToolbar';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15',
};

const SIZE_SCALE = { tiny: 0.3, small: 0.5, medium: 0.75, large: 2, huge: 3 };
const FEET_PER_CELL = 5;

const WALL_COLORS = {
  wall: 'rgba(100,120,160,0.85)',
  door: 'rgba(180,100,30,0.9)',
  window: 'rgba(80,180,220,0.8)',
  obstacle: 'rgba(150,60,200,0.85)',
};

// ── Grid helpers ──────────────────────────────────────────────────────────────
function drawSquareGrid(ctx, width, height, gs, ox, oy) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const sx = ((ox % gs) + gs) % gs;
  const sy = ((oy % gs) + gs) % gs;
  for (let x = sx - gs; x <= width + gs; x += gs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = sy - gs; y <= height + gs; y += gs) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
}

function drawHexGrid(ctx, width, height, gs, ox, oy) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const r = gs / 2;
  const h = r * Math.sqrt(3);
  const cols = Math.ceil(width / (r * 1.5)) + 3;
  const rows = Math.ceil(height / h) + 3;
  for (let col = -2; col < cols; col++) {
    for (let row = -2; row < rows; row++) {
      const cx = col * r * 1.5 + ox;
      const cy = row * h + (col % 2 === 0 ? 0 : h / 2) + oy;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i - 30);
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    }
  }
}

// Cells are centered: cell (col,row) center is at (col*gs + ox + gs/2, row*gs + oy + gs/2)
function cellToWorld(col, row, gs, ox, oy) {
  return { x: col * gs + ox + gs / 2, y: row * gs + oy + gs / 2 };
}

function worldToCell(wx, wy, gs, ox, oy) {
  return { col: Math.floor((wx - ox) / gs), row: Math.floor((wy - oy) / gs) };
}

function cellDist(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

function fogKey(col, row) { return `${col},${row}`; }

export default function VttCanvas({
  map,
  isGM,
  user,
  groupCharacters,
  onUpdateTokens,
  onUpdateMap,
  initiativeOrder,
  activeTokenId,
  initiativeStarted,
  activeTool,
  onToolChange,
  onNextTurn,
  fogCellCount,
  wallCount,
  onClearFog,
  onClearWalls,
  round,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragStart = useRef(null);
  const [localTokens, setLocalTokens] = useState(map.tokens || []);
  const [trails, setTrails] = useState({}); // {tokenId: [{col,row}, ...]}
  const [moveInfo, setMoveInfo] = useState(null); // {feet, col, row} - current hover position + cumulative distance
  
  // Movement tracking per token (persists across multiple drags in one turn)
  const movementState = useRef({}); // {tokenId: {totalFeet: number, waypoints: [{col,row}]}}

  // Fog of war
  const [fogCells, setFogCells] = useState(() => new Set(map.fog_cells || []));
  const isPainting = useRef(false);

  // Walls: array of {id, type, is_open, cells:[{col,row}]}
  const [walls, setWalls] = useState(() => map.walls || []);
  // Current stroke being painted
  const paintedCells = useRef(new Set());

  // Pings
  const [pings, setPings] = useState([]);

  // Zoom
  const [zoom, setZoom] = useState(1);

  // Measurement tool
  const [measureStart, setMeasureStart] = useState(null); // {col, row}
  const [measureEnd, setMeasureEnd] = useState(null);     // {col, row}

  // Context menu
  const [contextMenu, setContextMenu] = useState(null);
  const [editHpToken, setEditHpToken] = useState(null);
  const [renameToken, setRenameToken] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [noLinkWarning, setNoLinkWarning] = useState(null);

  useEffect(() => { setLocalTokens(map.tokens || []); }, [map.tokens]);
  useEffect(() => { setFogCells(new Set(map.fog_cells || [])); }, [map.fog_cells]);
  useEffect(() => { setWalls(map.walls || []); }, [map.walls]);

  // Clear movement tracking and trails when the turn changes
  useEffect(() => {
    setMoveInfo(null);
    movementState.current = {};
    setTrails({});
  }, [activeTokenId]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load image
  const [imgLoaded, setImgLoaded] = useState(false);
  useEffect(() => {
    if (!map.image_url) { imgRef.current = null; setImgLoaded(false); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.image_url;
    img.onload = () => { imgRef.current = img; setImgLoaded(true); };
  }, [map.image_url]);

  // Ping cleanup
  useEffect(() => {
    if (pings.length === 0) return;
    const id = setInterval(() => {
      const now = Date.now();
      setPings((prev) => prev.filter((p) => now - p.born < 2500));
    }, 100);
    return () => clearInterval(id);
  }, [pings.length]);

  const gs = map.grid_size || 60;
  const ox = map.grid_offset_x || 0;
  const oy = map.grid_offset_y || 0;

  // ── Draw ──────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    // Map image
    if (imgRef.current) {
      const scale = map.image_scale || 1;
      ctx.drawImage(imgRef.current, 0, 0, imgRef.current.width * scale, imgRef.current.height * scale);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-pan.x, -pan.y, canvas.width, canvas.height);
    }

    // Grid
    if (map.grid_type && map.grid_type !== 'none') {
      if (map.grid_type === 'square') drawSquareGrid(ctx, canvas.width - pan.x + gs, canvas.height - pan.y + gs, gs, ox, oy);
      if (map.grid_type === 'hex') drawHexGrid(ctx, canvas.width - pan.x + gs * 2, canvas.height - pan.y + gs * 2, gs, ox, oy);
    }

    // Walls
    walls.forEach((wall) => {
      if (!wall.cells?.length) return;
      const color = WALL_COLORS[wall.type] || WALL_COLORS.wall;
      wall.cells.forEach(({ col, row }) => {
        const { x: wx, y: wy } = cellToWorld(col, row, gs, ox, oy);
        ctx.fillStyle = color;
        ctx.fillRect(wx - gs / 2, wy - gs / 2, gs, gs);

        // Door open indicator
        if (wall.type === 'door' && wall.is_open) {
          ctx.strokeStyle = 'rgba(255,220,80,0.9)';
          ctx.lineWidth = 2;
          ctx.setLineDash([3, 3]);
          ctx.strokeRect(wx - gs / 2 + 2, wy - gs / 2 + 2, gs - 4, gs - 4);
          ctx.setLineDash([]);
        }

        // Label
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = `bold ${Math.max(8, gs * 0.14)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wall.type === 'door') ctx.fillText(wall.is_open ? '🚪' : 'D', wx, wy);
        else if (wall.type === 'window') ctx.fillText('W', wx, wy);
        else if (wall.type === 'obstacle') ctx.fillText('O', wx, wy);
      });
    });

    // Movement trails
    Object.entries(trails).forEach(([, path]) => {
      if (path.length < 2) return;
      ctx.strokeStyle = 'rgba(255,220,60,0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      path.forEach(({ col, row }, i) => {
        const { x, y } = cellToWorld(col, row, gs, ox, oy);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
    });

    // Tokens (skip hidden ones for non-GMs)
    const visibleTokens = localTokens.filter((t) => isGM || t.is_visible !== false);
    visibleTokens.forEach((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      const isActive = token.id === activeTokenId;

      if (isActive) { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 18; }

      const isHidden = token.is_visible === false;
      ctx.globalAlpha = isHidden ? 0.35 : 1;

      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color || TOKEN_COLORS[token.type] || '#888';
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = isHidden ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isHidden ? 2 : 1.5;
        ctx.stroke();
      }

      // HP bar + defense
      if (token.max_hp && token.max_hp > 0) {
        const barW = Math.max(radius * 2, 20);
        const barX = tx - barW / 2;
        const barY = ty + radius + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, 4);
        const pct = Math.max(0, Math.min(1, (token.current_hp ?? token.max_hp) / token.max_hp));
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(barX, barY, barW * pct, 4);

        // Defense from linked character
        const linkedChar = groupCharacters?.find((c) => c.id === token.character_id);
        const defense = linkedChar?.base_armor;
        if (defense != null) {
          ctx.fillStyle = 'rgba(0,0,0,0.65)';
          ctx.beginPath();
          ctx.roundRect(tx + barW / 2 + 5, barY - 2, 22, 10, 3);
          ctx.fill();
          ctx.fillStyle = '#60a5fa';
          ctx.font = `bold ${Math.max(7, gs * 0.12)}px Inter, sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(`🛡${defense}`, tx + barW / 2 + 7, barY + 3);
          ctx.textAlign = 'center';
        }
      }

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, gs * 0.22)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((token.name || '?').slice(0, 2).toUpperCase(), tx, ty);
      ctx.font = `${Math.max(9, gs * 0.16)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(token.name, tx, ty + radius + (token.max_hp ? 16 : 6));
      // Hidden label for GM
      if (isHidden) {
        ctx.font = `${Math.max(8, gs * 0.13)}px Inter, sans-serif`;
        ctx.fillStyle = 'rgba(255,80,80,0.9)';
        ctx.fillText('[hidden]', tx, ty + radius + (token.max_hp ? 26 : 14));
      }
      ctx.globalAlpha = 1;
    });

    // Fog of war overlay
    if (fogCells.size > 0) {
      const alpha = isGM ? 0.45 : 1;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      fogCells.forEach((key) => {
        const [col, row] = key.split(',').map(Number);
        const { x: fx, y: fy } = cellToWorld(col, row, gs, ox, oy);
        ctx.fillRect(fx - gs / 2, fy - gs / 2, gs, gs);
      });
    }

    // Move distance HUD
    if (moveInfo) {
      const { x: mx, y: my } = cellToWorld(moveInfo.col, moveInfo.row, gs, ox, oy);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(mx - 28, my - 42, 56, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${moveInfo.feet}ft`, mx, my - 32);
    }

    // Measurement overlay
    if (measureStart && measureEnd) {
      const { x: sx, y: sy } = cellToWorld(measureStart.col, measureStart.row, gs, ox, oy);
      const { x: ex, y: ey } = cellToWorld(measureEnd.col, measureEnd.row, gs, ox, oy);
      const dist = cellDist(measureStart.col, measureStart.row, measureEnd.col, measureEnd.row);
      const feet = dist * FEET_PER_CELL;
      ctx.strokeStyle = 'rgba(250,204,21,0.9)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 3]);
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.setLineDash([]);
      // Dots at endpoints
      ctx.fillStyle = '#facc15';
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
      // Distance label
      const mx2 = (sx + ex) / 2;
      const my2 = (sy + ey) / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.beginPath(); ctx.roundRect(mx2 - 28, my2 - 12, 56, 20, 4); ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${feet}ft`, mx2, my2 - 2);
    }

    // Pings (stored as world coords)
    const now = Date.now();
    pings.forEach((ping) => {
      const age = now - ping.born;
      const t = age / 2500;
      const alpha = Math.max(0, 1 - t);
      const r1 = 8 + t * 30;
      const r2 = 14 + t * 20;
      ctx.strokeStyle = `rgba(250,204,21,${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(ping.x, ping.y, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ping.x, ping.y, r2, 0, Math.PI * 2); ctx.stroke();
    });

    ctx.restore();
  }, [pan, zoom, localTokens, map, trails, activeTokenId, moveInfo, gs, ox, oy, fogCells, isGM, pings, walls, measureStart, measureEnd, groupCharacters]);

  useEffect(() => { draw(); }, [draw, imgLoaded, canvasSize]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getWorldPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y,
    };
  };

  const findTokenAt = (worldPos) => {
    return [...localTokens].reverse().find((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      return Math.hypot(worldPos.x - tx, worldPos.y - ty) < radius + 4;
    });
  };

  const findWallCellAt = (col, row) => {
    return walls.find((w) => w.cells?.some((c) => c.col === col && c.row === row));
  };

  const canMoveToken = (token) => {
    if (isGM) return true;
    if (initiativeStarted && token.id !== activeTokenId) return false;
    const char = groupCharacters?.find((c) => c.id === token.character_id);
    return char?.created_by === user?.email;
  };

  // ── Painting helpers ──────────────────────────────────────────────────────
  const applyPaint = (e) => {
    const world = getWorldPos(e);
    const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
    const key = fogKey(col, row);
    if (paintedCells.current.has(key)) return; // avoid re-painting same cell in one stroke
    paintedCells.current.add(key);

    if (activeTool === 'fog_add') {
      setFogCells((prev) => { const n = new Set(prev); n.add(key); return n; });
    } else if (activeTool === 'fog_erase') {
      setFogCells((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } else if (['wall', 'door', 'window', 'obstacle'].includes(activeTool)) {
      setWalls((prev) => {
        // Check if cell is already occupied by another wall — skip
        if (prev.some((w) => w.cells?.some((c) => c.col === col && c.row === row))) return prev;
        // Try to extend the current stroke's segment (last wall if same type from this stroke)
        const last = prev[prev.length - 1];
        if (last && last.type === activeTool && last._stroke === 'current') {
          return [...prev.slice(0, -1), { ...last, cells: [...last.cells, { col, row }] }];
        }
        // New wall segment
        return [...prev, { id: crypto.randomUUID(), type: activeTool, is_open: false, cells: [{ col, row }], _stroke: 'current' }];
      });
    } else if (activeTool === 'erase_wall') {
      setWalls((prev) => {
        return prev.map((w) => ({
          ...w,
          cells: w.cells?.filter((c) => !(c.col === col && c.row === row)),
        })).filter((w) => w.cells?.length > 0);
      });
    }
  };

  const finishPaint = useCallback(() => {
    if (!isPainting.current) return;
    isPainting.current = false;
    paintedCells.current = new Set();

    if (activeTool === 'fog_add' || activeTool === 'fog_erase') {
      setFogCells((prev) => {
        onUpdateMap?.({ fog_cells: [...prev] });
        return prev;
      });
    } else if (['wall', 'door', 'window', 'obstacle', 'erase_wall'].includes(activeTool)) {
      setWalls((prev) => {
        // Clean up _stroke marker
        const cleaned = prev.map(({ _stroke, ...w }) => w);
        onUpdateMap?.({ walls: cleaned });
        return cleaned;
      });
    }
  }, [activeTool, onUpdateMap]);

  // ── Wheel zoom (mouse-centered) ───────────────────────────────────────────
  // Attach on the container with passive:false so we can preventDefault on
  // ctrl+wheel (trackpad pinch). Plain scroll (no ctrlKey) passes through.
  // Zoom is centered on the mouse cursor by adjusting pan so the world point
  // under the cursor stays fixed.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      // Mouse position relative to container
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((prevZoom) => {
        const delta = e.deltaY < 0 ? 0.1 : -0.1;
        const newZoom = Math.min(4, Math.max(0.25, prevZoom + delta));
        // Adjust pan so world point under cursor stays fixed:
        // worldX = mx/prevZoom - panX  =>  panX_new = mx/newZoom - worldX
        setPan((prevPan) => ({
          x: mx / newZoom - (mx / prevZoom - prevPan.x),
          y: my / newZoom - (my / prevZoom - prevPan.y),
        }));
        return newZoom;
      });
    };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  // ── Mouse ─────────────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button === 2) return;
    const world = getWorldPos(e);

    // Measurement tool
    if (activeTool === 'measure') {
      const cell = worldToCell(world.x, world.y, gs, ox, oy);
      setMeasureStart(cell);
      setMeasureEnd(cell);
      return;
    }

    if (activeTool !== 'select' && isGM) {
      isPainting.current = true;
      paintedCells.current = new Set();
      applyPaint(e);
      return;
    }

    const token = findTokenAt(world);
    if (token && canMoveToken(token)) {
      dragStart.current = { col: token.x, row: token.y };
      setDraggingId(token.id);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX / zoom - pan.x, y: e.clientY / zoom - pan.y };
    }
  };

  const onMouseMove = (e) => {
    if (activeTool === 'measure' && measureStart) {
      const world = getWorldPos(e);
      setMeasureEnd(worldToCell(world.x, world.y, gs, ox, oy));
      return;
    }
    if (isPainting.current && activeTool !== 'select' && isGM) {
      applyPaint(e);
      return;
    }
    if (draggingId) {
      const world = getWorldPos(e);
      const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
      
      // Initialize movement state for this token on first drag
      if (!movementState.current[draggingId]) {
        movementState.current[draggingId] = { totalFeet: 0, waypoints: [dragStart.current] };
      }
      
      const state = movementState.current[draggingId];
      const lastWaypoint = state.waypoints[state.waypoints.length - 1];
      const currentCell = { col, row };
      
      // Add waypoint and accumulate distance only when entering a new cell
      if (currentCell.col !== lastWaypoint.col || currentCell.row !== lastWaypoint.row) {
        const legDist = cellDist(lastWaypoint.col, lastWaypoint.row, col, row);
        state.totalFeet += legDist * FEET_PER_CELL;
        state.waypoints.push(currentCell);
      }
      
      setLocalTokens((prev) => prev.map((t) => t.id === draggingId ? { ...t, x: col, y: row } : t));
      setMoveInfo({ feet: state.totalFeet, col, row });
    } else if (isPanning) {
      setPan({ x: e.clientX / zoom - panStart.current.x, y: e.clientY / zoom - panStart.current.y });
    }
  };

  const onMouseUp = (e) => {
    if (activeTool === 'measure') return; // keep measure line until tool switch
    if (isPainting.current) { finishPaint(); return; }
    if (draggingId) {
      const movedToken = localTokens.find((t) => t.id === draggingId);
      if (movedToken && dragStart.current) {
        const { col: sc, row: sr } = dragStart.current;
        if (movedToken.x !== sc || movedToken.y !== sr) {
          // Update trails for visual path display
          setTrails((prev) => {
            const existing = prev[draggingId] || [{ col: sc, row: sr }];
            return { ...prev, [draggingId]: [...existing, { col: movedToken.x, row: movedToken.y }] };
          });
        }
      }
      onUpdateTokens(localTokens);
      setDraggingId(null);
      dragStart.current = null;
    }
    setIsPanning(false);
  };

  const onContextMenu = (e) => {
    e.preventDefault();
    const world = getWorldPos(e);
    const token = findTokenAt(world);
    if (token) {
      setContextMenu({ token, screenX: e.clientX, screenY: e.clientY });
      return;
    }
    // Check wall cells for door toggling
    if (isGM) {
      const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
      const wall = findWallCellAt(col, row);
      if (wall && wall.type === 'door') {
        const updated = walls.map((w) => w.id === wall.id ? { ...w, is_open: !w.is_open } : w);
        setWalls(updated);
        onUpdateMap?.({ walls: updated });
        return;
      }
    }
    // Ping on empty right-click
    addPing(e.clientX, e.clientY);
  };

  const addPing = (screenX, screenY) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Store as world coords so the ping stays fixed on the map regardless of pan/zoom
    const wx = (screenX - rect.left) / zoom - pan.x;
    const wy = (screenY - rect.top) / zoom - pan.y;
    setPings((prev) => [...prev, { id: Date.now(), x: wx, y: wy, born: Date.now(), isWorld: true }]);
  };

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleDeleteToken = () => {
    if (!contextMenu) return;
    const updated = localTokens.filter((t) => t.id !== contextMenu.token.id);
    setLocalTokens(updated);
    onUpdateTokens(updated);
    setContextMenu(null);
  };

  const handleEditHP = () => { setEditHpToken(contextMenu.token); setContextMenu(null); };
  const handleRename = () => { setRenameToken(contextMenu.token); setContextMenu(null); };
  const handlePingFromMenu = () => { addPing(contextMenu.screenX, contextMenu.screenY); setContextMenu(null); };
  const handleLinkChar = () => { setLinkToken(contextMenu.token); setContextMenu(null); };
  const handleToggleVisibility = () => {
    if (!contextMenu) return;
    const updated = localTokens.map((t) =>
      t.id === contextMenu.token.id ? { ...t, is_visible: t.is_visible === false ? true : false } : t
    );
    setLocalTokens(updated); onUpdateTokens(updated); setContextMenu(null);
  };

  const handleSaveHP = ({ current_hp, max_hp }) => {
    const updated = localTokens.map((t) => t.id === editHpToken.id ? { ...t, current_hp, max_hp } : t);
    setLocalTokens(updated); onUpdateTokens(updated); setEditHpToken(null);
  };

  const handleSaveName = (name) => {
    const updated = localTokens.map((t) => t.id === renameToken.id ? { ...t, name } : t);
    setLocalTokens(updated); onUpdateTokens(updated); setRenameToken(null);
  };

  const handleLinkSave = (characterId) => {
    const char = groupCharacters?.find((c) => c.id === characterId);
    const updated = localTokens.map((t) => t.id === linkToken.id ? {
      ...t, character_id: characterId,
      name: char?.name || t.name,
      max_hp: char?.base_health || t.max_hp,
      current_hp: char?.current_hp ?? char?.base_health ?? t.current_hp,
    } : t);
    setLocalTokens(updated); onUpdateTokens(updated); setLinkToken(null);
  };

  const clearTrails = () => setTrails({});

  // ── Touch handling ────────────────────────────────────────────────────────
  const touchStartRef = useRef(null);
  const longPressTimer = useRef(null);

  const onTouchStart = (e) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };

    // Long press → context menu (after 500ms)
    longPressTimer.current = setTimeout(() => {
      const rect = canvasRef.current.getBoundingClientRect();
      const world = { x: t.clientX - rect.left - pan.x, y: t.clientY - rect.top - pan.y };
      const token = findTokenAt(world);
      if (token) {
        setContextMenu({ token, screenX: t.clientX, screenY: t.clientY });
      }
      longPressTimer.current = null;
    }, 500);

    onMouseDown({ button: 0, clientX: t.clientX, clientY: t.clientY });
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    // Cancel long press if moved more than 10px
    if (touchStartRef.current) {
      const dx = Math.abs(t.clientX - touchStartRef.current.x);
      const dy = Math.abs(t.clientY - touchStartRef.current.y);
      if ((dx > 10 || dy > 10) && longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
    onMouseMove({ clientX: t.clientX, clientY: t.clientY });
  };

  const onTouchEnd = (e) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      // Short tap → open HP modal
      if (touchStartRef.current) {
        const elapsed = Date.now() - touchStartRef.current.time;
        if (elapsed < 500) {
          const t = touchStartRef.current;
          const rect = canvasRef.current?.getBoundingClientRect();
          if (rect) {
            const world = { x: t.x - rect.left - pan.x, y: t.y - rect.top - pan.y };
            const token = findTokenAt(world);
            if (token) setEditHpToken(token);
          }
        }
      }
    }
    touchStartRef.current = null;
    onMouseUp(e);
  };

  const getCursor = () => {
    if (activeTool === 'measure') return 'crosshair';
    if (activeTool === 'select') return draggingId ? 'grabbing' : isPanning ? 'grabbing' : 'grab';
    if (activeTool === 'erase_wall') return 'cell';
    return 'crosshair';
  };

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsToolbar, setShowFsToolbar] = useState(false);

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!isFullscreen) {
      el.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen((v) => !v);
  };

  // Sync fullscreen state with browser events
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // Clear measure when tool changes away
  useEffect(() => {
    if (activeTool !== 'measure') { setMeasureStart(null); setMeasureEnd(null); }
  }, [activeTool]);

  return (
    <div
      ref={containerRef}
      data-vtt-container
      className="relative w-full rounded-xl overflow-hidden bg-black border border-border/50"
      style={{ height: isFullscreen ? '100vh' : '65vh' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="block w-full h-full"
        style={{ cursor: getCursor(), touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={onContextMenu}
        // onWheel is handled via useEffect below (non-passive for ctrl+pinch)
        
        onDoubleClick={(e) => {
          if (activeTool !== 'select') return;
          const world = getWorldPos(e);
          const token = findTokenAt(world);
          if (token) setEditHpToken(token);
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      />

      {/* Top-right HUD controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {initiativeStarted && Object.keys(trails).length > 0 && (
          <button onClick={clearTrails} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
            Clear Trails
          </button>
        )}
        {/* Zoom controls */}
        <div className="flex items-center bg-black/60 rounded-lg overflow-hidden">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))} className="text-white text-sm px-2 py-1 hover:bg-black/80">−</button>
          <span className="text-white text-xs px-1 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.1))} className="text-white text-sm px-2 py-1 hover:bg-black/80">+</button>
        </div>
        {/* Hamburger toolbar menu — always shown so tools are accessible on mobile/fullscreen */}
        {onToolChange && (
          <div className="relative">
            <button
              onClick={() => setShowFsToolbar((v) => !v)}
              className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors"
            >
              ☰
            </button>
            {showFsToolbar && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-black/90 rounded-xl p-2 min-w-[180px] shadow-xl">
                <VttToolbar
                  activeTool={activeTool}
                  onToolChange={(t) => { onToolChange(t); setShowFsToolbar(false); }}
                  isGM={isGM}
                  fogCellCount={fogCellCount || 0}
                  wallCount={wallCount || 0}
                  onClearFog={() => { onClearFog?.(); setShowFsToolbar(false); }}
                  onClearWalls={() => { onClearWalls?.(); setShowFsToolbar(false); }}
                  compact
                />
              </div>
            )}
          </div>
        )}
        {/* Fullscreen toggle */}
        <button onClick={toggleFullscreen} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
          {isFullscreen ? '⤡' : '⤢'}
        </button>
      </div>

      {/* Initiative HUD — shown in fullscreen for all users */}
      {isFullscreen && initiativeStarted && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-xl px-3 py-2 shadow-xl border border-yellow-500/30 z-10">
          <span className="text-yellow-400 text-xs font-bold">Round {typeof round === 'number' ? round : ''}</span>
          {activeTokenId && (
            <span className="text-white text-xs font-semibold">
              ⚔️ {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
            </span>
          )}
          {isGM && onNextTurn && (
            <button onClick={onNextTurn} className="bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-lg hover:bg-yellow-400 transition-colors ml-1">
              Next Turn ▶
            </button>
          )}
        </div>
      )}

      {/* Active turn badge (non-fullscreen) */}
      {!isFullscreen && initiativeStarted && activeTokenId && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-full pointer-events-none shadow-lg">
          {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <TokenContextMenu
          token={contextMenu.token}
          x={contextMenu.screenX}
          y={contextMenu.screenY}
          isGM={isGM}
          onClose={() => setContextMenu(null)}
          onDelete={handleDeleteToken}
          onEditHP={handleEditHP}
          onRename={handleRename}
          onPing={handlePingFromMenu}
          onLinkCharacter={handleLinkChar}
          onToggleVisibility={handleToggleVisibility}
        />
      )}

      {editHpToken && (
        <EditHpModal token={editHpToken} onSave={handleSaveHP} onClose={() => setEditHpToken(null)} />
      )}
      {renameToken && (
        <RenameTokenModal token={renameToken} onSave={handleSaveName} onClose={() => setRenameToken(null)} />
      )}
      {linkToken && (
        <LinkCharacterModal
          token={linkToken}
          groupCharacters={groupCharacters}
          onSave={handleLinkSave}
          onClose={() => setLinkToken(null)}
        />
      )}
    </div>
  );
}