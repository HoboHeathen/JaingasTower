import React, { useRef, useState, useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import TokenContextMenu from '@/components/vtt/TokenContextMenu';
import EditHpModal from '@/components/vtt/EditHpModal';
import RenameTokenModal from '@/components/vtt/RenameTokenModal';
import LinkCharacterModal from '@/components/vtt/LinkCharacterModal';
import VttToolbar from '@/components/vtt/VttToolbar';
import SurvivalToolbar from '@/components/vtt/SurvivalToolbar';
import WaveGeneratorModal from '@/components/vtt/WaveGeneratorModal';
import AddParticipantModal from '@/components/encounter/AddParticipantModal';
import { base44 } from '@/api/base44Client';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15'
};

const SIZE_SCALE = { tiny: 0.3, small: 0.5, medium: 0.75, large: 2, huge: 3 };
const WALL_FORT_TOOLS = new Set(['wall', 'door', 'window', 'obstacle', 'erase_wall', 'spawn_point']);

// ── Line-segment wall helpers ──────────────────────────────────────────────
function segmentsIntersect(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1x = bx - ax, d1y = by - ay;
  const d2x = dx - cx, d2y = dy - cy;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-9) return false;
  const ex = cx - ax, ey = cy - ay;
  const t = (ex * d2y - ey * d2x) / cross;
  const u = (ex * d1y - ey * d1x) / cross;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function tokenCrossesWall(fromCol, fromRow, toCol, toRow, walls, gs, ox, oy) {
  const fx = fromCol * gs + ox + gs / 2;
  const fy = fromRow * gs + oy + gs / 2;
  const tx = toCol * gs + ox + gs / 2;
  const ty = toRow * gs + oy + gs / 2;
  for (const w of walls) {
    if (w.type === 'spawn_point') continue;
    if (w.type === 'door' && w.is_open) continue;
    if (segmentsIntersect(fx, fy, tx, ty, w.x1, w.y1, w.x2, w.y2)) return true;
  }
  return false;
}

function pointToSegmentDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
const FEET_PER_CELL = 5;

// ── Wall snapping helper ──────────────────────────────────────────────────
function snapToGrid(wx, wy, gs, ox, oy) {
  // Candidate snap points: cell vertices, cell centers, and edge midpoints
  const col = Math.floor((wx - ox) / gs);
  const row = Math.floor((wy - oy) / gs);
  const candidates = [];
  for (let dc = 0; dc <= 1; dc++) {
    for (let dr = 0; dr <= 1; dr++) {
      // Vertices
      candidates.push({ x: (col + dc) * gs + ox, y: (row + dr) * gs + oy });
    }
  }
  // Cell center
  candidates.push({ x: col * gs + ox + gs / 2, y: row * gs + oy + gs / 2 });
  // Edge midpoints
  candidates.push({ x: col * gs + ox + gs / 2, y: row * gs + oy });
  candidates.push({ x: col * gs + ox + gs / 2, y: (row + 1) * gs + oy });
  candidates.push({ x: col * gs + ox,           y: row * gs + oy + gs / 2 });
  candidates.push({ x: (col + 1) * gs + ox,     y: row * gs + oy + gs / 2 });

  let best = null, bestDist = Infinity;
  for (const c of candidates) {
    const d = Math.hypot(wx - c.x, wy - c.y);
    if (d < bestDist) { bestDist = d; best = c; }
  }
  return best || { x: wx, y: wy };
}

const WALL_COLORS = {
  wall: 'rgba(100,120,160,0.85)',
  door: 'rgba(180,100,30,0.9)',
  window: 'rgba(80,180,220,0.8)',
  obstacle: 'rgba(150,60,200,0.85)',
  spawn_point: 'rgba(100,200,100,0.4)'
};

// ── Grid helpers ──────────────────────────────────────────────────────────────
function drawSquareGrid(ctx, width, height, gs, ox, oy) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const sx = (ox % gs + gs) % gs;
  const sy = (oy % gs + gs) % gs;
  for (let x = sx - gs; x <= width + gs; x += gs) {
    ctx.beginPath();ctx.moveTo(x, 0);ctx.lineTo(x, height);ctx.stroke();
  }
  for (let y = sy - gs; y <= height + gs; y += gs) {
    ctx.beginPath();ctx.moveTo(0, y);ctx.lineTo(width, y);ctx.stroke();
  }
}

function drawHexGrid(ctx, width, height, gs, ox, oy) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const r = gs / 2;
  const w = 1.5 * r * 1.15;
  const v = Math.sqrt(3) * r * 0.87;
  const cols = Math.ceil(width / w) + 4;
  const rows = Math.ceil(height / v) + 4;

  for (let row = -2; row < rows; row++) {
    const rowOffsetX = row % 2 !== 0 ? w / 2 : 0;
    for (let col = -2; col < cols; col++) {
      const cx = col * w + rowOffsetX + ox;
      const cy = row * v + oy;

      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = Math.PI / 180 * (60 * i - 30);
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

// (LOS calculations are now handled by the Web Worker — see src/workers/losWorker.js)

function fogKey(col, row) {return `${col},${row}`;}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const VttCanvasInner = ({
  map,
  tokens: tokensProp,
  isGM,
  user,
  groupCharacters,
  activeGroup,
  onUpdateTokens,
  onUpdateMap,
  activeTokenId,
  initiativeStarted,
  activeTool,
  onToolChange,
  fogCellCount,
  wallCount,
  onClearFog,
  onClearWalls,
  round,
  actionsPanel,
  activeEncounter,
  onAddEncounterParticipant,
  onToggleEncounterSidebar,
  showEncounterSidebar,
  encounterActive,
  encounterSidebar,
  showAddModal,
  setShowAddModal
}, ref) => {
  const bgCanvasRef = useRef(null);
  const wallsCanvasRef = useRef(null);
  const tokensCanvasRef = useRef(null);
  const canvasRef = tokensCanvasRef; // keep legacy ref for event handlers
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // State declarations first
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [localTokens, setLocalTokens] = useState(tokensProp || []);
  const [trails, setTrails] = useState({});
  const [moveInfo, setMoveInfo] = useState(null);
  const [fogCells, setFogCells] = useState(() => new Set(map.fog_cells || []));
  const [walls, setWalls] = useState(() => map.walls || []);

  const [pings, setPings] = useState([]);
  const [visibleCells, setVisibleCells] = useState(new Set());
  const [gmTokenLOS, setGmTokenLOS] = useState({});
  const [zoom, setZoom] = useState(1);
  const [wallsVisible, setWallsVisible] = useState(true);
  const [losEnabled, setLosEnabled] = useState(!isGM);
  const [isSurvivalMode, setIsSurvivalMode] = useState(false);
  const [showWaveGenerator, setShowWaveGenerator] = useState(false);
  const [measureStart, setMeasureStart] = useState(null);
  const [measureEnd, setMeasureEnd] = useState(null);
  const [measureMode, setMeasureMode] = useState('line'); // 'line' | 'cone' | 'circle'
  // For cone/circle: measureStart is origin, measureEnd is target world pos (not cell)
  const [measureEndWorld, setMeasureEndWorld] = useState(null);
  // Wall drawing preview state
  const [tempWallStart, setTempWallStart] = useState(null); // { x, y } world coords (snapped)
  const [tempWallEnd, setTempWallEnd] = useState(null);     // { x, y } world coords (snapped)
  const [wallSnapEnabled, setWallSnapEnabled] = useState(true);
  const [gmSelectedTokenId, setGmSelectedTokenId] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [editHpToken, setEditHpToken] = useState(null);
  const [renameToken, setRenameToken] = useState(null);
  const [linkToken, setLinkToken] = useState(null);
  const [noLinkWarning, setNoLinkWarning] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFsToolbar, setShowFsToolbar] = useState(false);

  // Refs for mutable state
  const panStart = useRef(null);
  const dragStart = useRef(null);
  const movementState = useRef({});
  const isPainting = useRef(false);
  const paintedCells = useRef(new Set());
  const pendingSave = useRef(false);
  const currentWallStroke = useRef([]); // world points for in-progress wall segment
  const losRange = 30; // 30 cells = 150 feet

  // Expose centerOnToken and getViewportCenterCell via imperative handle
  useImperativeHandle(ref, () => ({
    centerOnToken: (tokenId) => {
      const token = localTokens.find((t) => t.id === tokenId);
      if (!token || !canvasRef.current) return;
      const gs = map.grid_size || 60;
      const ox = map.grid_offset_x || 0;
      const oy = map.grid_offset_y || 0;
      const { x: worldX, y: worldY } = cellToWorld(token.x, token.y, gs, ox, oy);
      const centerX = canvasSize.w / 2 / zoom;
      const centerY = canvasSize.h / 2 / zoom;
      setPan({ x: centerX - worldX, y: centerY - worldY });
    },
    getViewportCenterCell: () => {
      const gs = map.grid_size || 60;
      const ox = map.grid_offset_x || 0;
      const oy = map.grid_offset_y || 0;
      const worldX = canvasSize.w / 2 / zoom - pan.x;
      const worldY = canvasSize.h / 2 / zoom - pan.y;
      return { col: Math.floor((worldX - ox) / gs), row: Math.floor((worldY - oy) / gs) };
    }
  }), [localTokens, canvasSize, zoom, pan, map]);

  // ── Web Worker for LOS ────────────────────────────────────────────────────
  const losWorkerRef = useRef(null);
  const losRequestIdRef = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('/src/workers/losWorker.js', import.meta.url), { type: 'module' });
    losWorkerRef.current = worker;
    worker.onmessage = (e) => {
      const { results, requestId } = e.data;
      // Ignore stale responses
      if (requestId !== losRequestIdRef.current) return;
      // results: { [tokenId]: string[] } — convert arrays back to Sets
      if (isGM) {
        const gmLos = {};
        for (const [id, cells] of Object.entries(results)) {
          gmLos[id] = new Set(cells);
        }
        setGmTokenLOS(gmLos);
      } else {
        const combined = new Set();
        for (const cells of Object.values(results)) {
          for (const c of cells) combined.add(c);
        }
        setVisibleCells(combined);
      }
    };
    return () => worker.terminate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGM]);

  // ── Token update batching ─────────────────────────────────────────────────
  const tokenUpdateQueue = useRef({});
  const batchTimer = useRef(null);

  const flushTokenUpdates = useCallback(() => {
    const queue = tokenUpdateQueue.current;
    if (Object.keys(queue).length === 0) return;
    const updates = Object.entries(queue).map(([id, pos]) => ({ id, ...pos }));
    tokenUpdateQueue.current = {};
    base44.functions.invoke('updateTokensBatch', { updates }).catch((err) => {
      console.warn('updateTokensBatch failed:', err);
    });
  }, []);

  // Wrapper that sets pendingSave flag so refetch doesn't overwrite local wall state mid-save
  const saveWalls = useCallback((updated) => {
    pendingSave.current = true;
    onUpdateMap?.({ walls: updated });
    // Clear flag after a generous debounce (save + refetch cycle)
    setTimeout(() => {pendingSave.current = false;}, 3000);
  }, [onUpdateMap]);

  useEffect(() => {setLocalTokens(tokensProp || []);}, [tokensProp]);
  useEffect(() => {setFogCells(new Set(map.fog_cells || []));}, [map.fog_cells]);
  // Only sync walls from server if we don't have a save in-flight (prevents HP reset on refetch)
  useEffect(() => {
    if (!pendingSave.current) {
      setWalls(map.walls || []);
    }
  }, [map.walls]);

  // Clear movement tracking and trails when the turn changes
  useEffect(() => {
    setMoveInfo(null);
    movementState.current = {};
    setTrails({});
  }, [activeTokenId]);

  // Dispatch LOS calculations to the Web Worker
  useEffect(() => {
    if (!losWorkerRef.current) return;
    if (isGM && !losEnabled) {setGmTokenLOS({});return;}

    const relevant = isGM ?
    localTokens.filter((t) => t.type !== 'innocent') :
    localTokens.filter((t) => t.type === 'player');

    if (relevant.length === 0) {
      if (isGM) setGmTokenLOS({});else
      setVisibleCells(new Set());
      return;
    }

    losRequestIdRef.current += 1;
    losWorkerRef.current.postMessage({
      tokens: relevant.map((t) => ({ id: t.id, x: t.x, y: t.y })),
      range: losRange,
      walls,
      gs,
      ox,
      oy,
      requestId: losRequestIdRef.current
    });
  }, [localTokens, walls, isGM, losEnabled]);

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
    if (!map.image_url) {imgRef.current = null;setImgLoaded(false);return;}
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.image_url;
    img.onload = () => {imgRef.current = img;setImgLoaded(true);};
  }, [map.image_url]);

  // Portrait image cache: { [characterId]: HTMLImageElement }
  const portraitCache = useRef({});
  const [portraitTick, setPortraitTick] = useState(0);
  useEffect(() => {
    if (!groupCharacters) return;
    groupCharacters.forEach((c) => {
      if (!c.portrait_url) return;
      if (portraitCache.current[c.id]) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = c.portrait_url;
      img.onload = () => {portraitCache.current[c.id] = img;setPortraitTick((t) => t + 1);};
    });
  }, [groupCharacters]);

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



  // ── Draw Background Layer ─────────────────────────────────────────────────
  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    if (imgRef.current) {
      const scale = map.image_scale || 1;
      ctx.drawImage(imgRef.current, 0, 0, imgRef.current.width * scale, imgRef.current.height * scale);
    } else {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(-pan.x, -pan.y, canvas.width, canvas.height);
    }

    if (map.grid_type && map.grid_type !== 'none') {
      if (map.grid_type === 'square') drawSquareGrid(ctx, canvas.width - pan.x + gs, canvas.height - pan.y + gs, gs, ox, oy);
      if (map.grid_type === 'hex') drawHexGrid(ctx, canvas.width - pan.x + gs * 2, canvas.height - pan.y + gs * 2, gs, ox, oy);
    }

    ctx.restore();
  }, [pan, zoom, map, gs, ox, oy]);

  // ── Draw Walls Layer (line-segment model) ────────────────────────────────
  const drawWallsFort = useCallback(() => {
    const canvas = wallsCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!wallsVisible && !WALL_FORT_TOOLS.has(activeTool)) return;

    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

    const lineWidth = Math.max(4, gs * 0.12);

    walls.forEach((wall) => {
      if (wall.x1 == null) return; // skip legacy cell-based entries
      const color = WALL_COLORS[wall.type] || WALL_COLORS.wall;

      ctx.strokeStyle = color;
      ctx.lineWidth = wall.type === 'spawn_point' ? gs : lineWidth;
      ctx.lineCap = 'round';

      if (wall.type === 'door' && wall.is_open) {
        ctx.setLineDash([lineWidth, lineWidth * 0.8]);
      } else {
        ctx.setLineDash([]);
      }

      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Label at midpoint for doors/windows/obstacles/spawn
      if (wall.type !== 'wall') {
        const mx = (wall.x1 + wall.x2) / 2;
        const my = (wall.y1 + wall.y2) / 2;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `bold ${Math.max(9, gs * 0.16)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (wall.type === 'door') ctx.fillText(wall.is_open ? '🚪' : 'D', mx, my - lineWidth);
        else if (wall.type === 'window') ctx.fillText('W', mx, my - lineWidth);
        else if (wall.type === 'obstacle') ctx.fillText('O', mx, my - lineWidth);
        else if (wall.type === 'spawn_point' && isGM) ctx.fillText('☠', mx, my - lineWidth);
      }
    });

    // Draw temp wall preview (snapped start → current mouse position)
    if (tempWallStart && tempWallEnd) {
      ctx.strokeStyle = WALL_COLORS[activeTool] || WALL_COLORS.wall;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.setLineDash([lineWidth * 0.6, lineWidth * 0.6]);
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(tempWallStart.x, tempWallStart.y);
      ctx.lineTo(tempWallEnd.x, tempWallEnd.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      // Draw snap indicators at both endpoints
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath(); ctx.arc(tempWallStart.x, tempWallStart.y, 4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(tempWallEnd.x, tempWallEnd.y, 4, 0, Math.PI * 2); ctx.fill();
    }

    ctx.restore();
  }, [pan, zoom, walls, activeTool, gs, ox, oy, isGM, wallsVisible, tempWallStart, tempWallEnd]);

  // ── Draw Tokens Layer ─────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = tokensCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(zoom, zoom);
    ctx.translate(pan.x, pan.y);

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

    // Tokens (skip hidden ones for non-GMs, skip innocents from being active tokens)
    const visibleTokens = localTokens.filter((t) => isGM || t.is_visible !== false);
    visibleTokens.forEach((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = gs * scale / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      const isActive = token.id === activeTokenId && token.type !== 'innocent';

      if (isActive) {ctx.shadowColor = '#facc15';ctx.shadowBlur = 18;}

      const isHidden = token.is_visible === false;
      ctx.globalAlpha = isHidden ? 0.35 : 1;

      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color || TOKEN_COLORS[token.type] || '#888';
      ctx.fill();

      // Draw portrait if available
      const portraitImg = token.character_id ? portraitCache.current[token.character_id] : null;
      if (portraitImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tx, ty, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(portraitImg, tx - radius, ty - radius, radius * 2, radius * 2);
        ctx.restore();
      }

      if (isActive) {
        ctx.strokeStyle = '#facc15';ctx.lineWidth = 3;ctx.stroke();ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = isHidden ? 'rgba(255,80,80,0.8)' : 'rgba(255,255,255,0.5)';
        ctx.lineWidth = isHidden ? 2 : 1.5;
        ctx.stroke();
      }

      // HP bar + defense
      // For player tokens linked to a character, prefer live character current_hp
      const linkedCharForHp = token.character_id ? groupCharacters?.find((c) => c.id === token.character_id) : null;
      const displayCurrentHp = linkedCharForHp ? linkedCharForHp.current_hp ?? linkedCharForHp.base_health ?? token.current_hp : token.current_hp;
      const displayMaxHp = linkedCharForHp ? linkedCharForHp.base_health ?? token.max_hp : token.max_hp;
      if (displayMaxHp && displayMaxHp > 0) {
        const barW = Math.max(radius * 2, 20);
        const barX = tx - barW / 2;
        const barY = ty + radius + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, 4);
        const pct = Math.max(0, Math.min(1, (displayCurrentHp ?? displayMaxHp) / displayMaxHp));
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(barX, barY, barW * pct, 4);

        // Defense from linked character
        const defense = linkedCharForHp?.base_armor;
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
      if (!portraitImg) {
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, gs * 0.22)}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText((token.name || '?').slice(0, 2).toUpperCase(), tx, ty);
      }
      ctx.font = `${Math.max(9, gs * 0.16)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(token.name, tx, ty + radius + (displayMaxHp ? 16 : 6));
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

    // Line of sight darkness (non-GM players only) — viewport-culled version
    if (!isGM && losEnabled && visibleCells.size > 0) {
      // Determine which cells are currently on screen
      const viewLeft = -pan.x;
      const viewTop = -pan.y;
      const viewRight = viewLeft + canvas.width / zoom;
      const viewBottom = viewTop + canvas.height / zoom;
      const colMin = Math.floor((viewLeft - ox) / gs) - 1;
      const colMax = Math.ceil((viewRight - ox) / gs) + 1;
      const rowMin = Math.floor((viewTop - oy) / gs) - 1;
      const rowMax = Math.ceil((viewBottom - oy) / gs) + 1;

      ctx.fillStyle = 'rgba(0,0,0,0.92)';
      for (let col = colMin; col <= colMax; col++) {
        for (let row = rowMin; row <= rowMax; row++) {
          if (!visibleCells.has(`${col},${row}`)) {
            const { x: fx, y: fy } = cellToWorld(col, row, gs, ox, oy);
            ctx.fillRect(fx - gs / 2, fy - gs / 2, gs, gs);
          }
        }
      }
    }

    // GM visualization of token LOS (bright color overlays) — only for selected token
    if (isGM && losEnabled && gmSelectedTokenId && Object.keys(gmTokenLOS).length > 0) {
      localTokens.filter((t) => t.id === gmSelectedTokenId).forEach((token) => {
        const los = gmTokenLOS[token.id];
        if (!los || los.size === 0) return;
        const color = token.color || TOKEN_COLORS[token.type] || '#888';
        // Bright overlay for visibility
        ctx.fillStyle = hexToRgba(color, 0.15);
        los.forEach((key) => {
          const [col, row] = key.split(',').map(Number);
          const { x: lx, y: ly } = cellToWorld(col, row, gs, ox, oy);
          ctx.fillRect(lx - gs / 2, ly - gs / 2, gs, gs);
        });
        // Subtle border around the LOS edge
        ctx.strokeStyle = hexToRgba(color, 0.4);
        ctx.lineWidth = 1;
        const boundary = new Set();
        los.forEach((key) => {
          const [col, row] = key.split(',').map(Number);
          // Check if adjacent to non-visible cell
          for (let dc = -1; dc <= 1; dc++) {
            for (let dr = -1; dr <= 1; dr++) {
              if (Math.abs(dc) + Math.abs(dr) === 1) {
                if (!los.has(`${col + dc},${row + dr}`)) {
                  boundary.add(key);
                  break;
                }
              }
            }
          }
        });
        boundary.forEach((key) => {
          const [col, row] = key.split(',').map(Number);
          const { x: bx, y: by } = cellToWorld(col, row, gs, ox, oy);
          ctx.strokeRect(bx - gs / 2, by - gs / 2, gs, gs);
        });
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
    if (measureStart && measureEndWorld) {
      const { x: sx, y: sy } = cellToWorld(measureStart.col, measureStart.row, gs, ox, oy);
      const ex = measureEndWorld.x, ey = measureEndWorld.y;
      const dx = ex - sx, dy = ey - sy;
      const pixelDist = Math.hypot(dx, dy);
      const feet = Math.round((pixelDist / gs) * FEET_PER_CELL);

      ctx.save();
      ctx.fillStyle = 'rgba(250,204,21,0.15)';
      ctx.strokeStyle = 'rgba(250,204,21,0.9)';
      ctx.lineWidth = 2;

      if (measureMode === 'line') {
        ctx.setLineDash([6, 3]);
        ctx.beginPath();ctx.moveTo(sx, sy);ctx.lineTo(ex, ey);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#facc15';
        ctx.beginPath();ctx.arc(sx, sy, 5, 0, Math.PI * 2);ctx.fill();
        ctx.beginPath();ctx.arc(ex, ey, 5, 0, Math.PI * 2);ctx.fill();
        const lx = (sx + ex) / 2, ly = (sy + ey) / 2;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();ctx.roundRect(lx - 28, ly - 12, 56, 20, 4);ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';ctx.textBaseline = 'middle';
        ctx.fillText(`${feet}ft`, lx, ly - 2);

      } else if (measureMode === 'circle') {
        // Circle with radius = distance; label shows diameter in feet
        ctx.beginPath();ctx.arc(sx, sy, pixelDist, 0, Math.PI * 2);
        ctx.fill();ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();ctx.arc(sx, sy, 5, 0, Math.PI * 2);ctx.fill();
        const diameter = feet * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();ctx.roundRect(sx - 36, sy - 12, 72, 20, 4);ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';ctx.textBaseline = 'middle';
        ctx.fillText(`r:${feet}ft (ø${diameter}ft)`, sx, sy - 2);

      } else if (measureMode === 'cone') {
        // 53-degree cone (standard D&D)
        const angle = Math.atan2(dy, dx);
        const halfAngle = (53 * Math.PI) / 180 / 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.arc(sx, sy, pixelDist, angle - halfAngle, angle + halfAngle);
        ctx.closePath();
        ctx.fill();ctx.stroke();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();ctx.arc(sx, sy, 5, 0, Math.PI * 2);ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.beginPath();ctx.roundRect(ex - 28, ey - 12, 56, 20, 4);ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 12px Inter, sans-serif';
        ctx.textAlign = 'center';ctx.textBaseline = 'middle';
        ctx.fillText(`${feet}ft`, ex, ey - 2);
      }
      ctx.restore();
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
      ctx.beginPath();ctx.arc(ping.x, ping.y, r1, 0, Math.PI * 2);ctx.stroke();
      ctx.beginPath();ctx.arc(ping.x, ping.y, r2, 0, Math.PI * 2);ctx.stroke();
    });

    ctx.restore();
  }, [pan, zoom, localTokens, map, trails, activeTokenId, moveInfo, gs, ox, oy, fogCells, isGM, pings, measureStart, measureEndWorld, measureMode, groupCharacters, gmSelectedTokenId, gmTokenLOS, visibleCells, losEnabled]);

  useEffect(() => {
    drawBackground();
    drawWallsFort();
    draw();
  }, [drawBackground, drawWallsFort, draw, imgLoaded, canvasSize, portraitTick]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getWorldPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / zoom - pan.x,
      y: (e.clientY - rect.top) / zoom - pan.y
    };
  };

  const findTokenAt = (worldPos) => {
    return [...localTokens].reverse().find((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = gs * scale / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      return Math.hypot(worldPos.x - tx, worldPos.y - ty) < radius + 4;
    });
  };

  const findWallSegmentAt = (worldX, worldY) => {
    return walls.find((w) => w.x1 != null && pointToSegmentDist(worldX, worldY, w.x1, w.y1, w.x2, w.y2) < gs * 0.4);
  };

  const canMoveToken = (token) => {
    if (isGM) return true;
    if (initiativeStarted && token.id !== activeTokenId) return false;
    const char = groupCharacters?.find((c) => c.id === token.character_id);
    return char?.created_by === user?.email;
  };

  // ── Painting helpers ──────────────────────────────────────────────────────
  const getSnappedWorldPos = (e) => {
    const world = getWorldPos(e);
    if (wallSnapEnabled && WALL_FORT_TOOLS.has(activeTool) && activeTool !== 'erase_wall') {
      return snapToGrid(world.x, world.y, gs, ox, oy);
    }
    return world;
  };

  const applyPaint = (e) => {
    const world = getWorldPos(e);
    const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
    const key = fogKey(col, row);

    if (activeTool === 'fog_add') {
      if (paintedCells.current.has(key)) return;
      paintedCells.current.add(key);
      setFogCells((prev) => {const n = new Set(prev);n.add(key);return n;});
    } else if (activeTool === 'fog_erase') {
      if (paintedCells.current.has(key)) return;
      paintedCells.current.add(key);
      setFogCells((prev) => {const n = new Set(prev);n.delete(key);return n;});
    } else if (activeTool === 'erase_wall') {
      setWalls((prev) => prev.filter((w) => {
        if (w.x1 == null) return true;
        return pointToSegmentDist(world.x, world.y, w.x1, w.y1, w.x2, w.y2) > gs * 0.6;
      }));
    }
    // Wall drawing is now handled via tempWallStart/End in onMouseDown/Move/Up
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
    } else if (['wall', 'door', 'window', 'obstacle', 'spawn_point'].includes(activeTool)) {
      // Commit the temp wall preview as a permanent segment
      setTempWallStart((start) => {
        setTempWallEnd((end) => {
          if (start && end && (Math.abs(start.x - end.x) > 2 || Math.abs(start.y - end.y) > 2)) {
            const seg = {
              id: crypto.randomUUID(),
              type: activeTool,
              is_open: false,
              x1: start.x, y1: start.y,
              x2: end.x,   y2: end.y
            };
            setWalls((prev) => {
              const updated = [...prev, seg];
              saveWalls(updated);
              return updated;
            });
          }
          return null;
        });
        return null;
      });
    } else if (activeTool === 'erase_wall') {
      setWalls((prev) => {
        saveWalls(prev);
        return prev;
      });
    }
  }, [activeTool, onUpdateMap, saveWalls]);

  // ── Spacebar shortcut: permanently switches to 'select' tool ────────────
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.code === 'Space' && !e.repeat) {
        if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
        e.preventDefault();
        onToolChange?.('select');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => { window.removeEventListener('keydown', onKeyDown); };
  }, [onToolChange]);

  // ── Wheel zoom (mouse-centered) ───────────────────────────────────────────
  // Slower zoom: 0.05 per tick. Ctrl+wheel zooms; plain scroll pans vertically.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handler = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom((prevZoom) => {
        const delta = e.deltaY < 0 ? 0.05 : -0.05;
        const newZoom = Math.min(4, Math.max(0.25, prevZoom + delta));
        setPan((prevPan) => ({
          x: mx / newZoom - (mx / prevZoom - prevPan.x),
          y: my / newZoom - (my / prevZoom - prevPan.y)
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

    // Ctrl+click always pans regardless of active tool
    if (e.ctrlKey) {
      setIsPanning(true);
      panStart.current = { x: e.clientX / zoom - pan.x, y: e.clientY / zoom - pan.y };
      return;
    }

    // Measurement tool
    if (activeTool === 'measure') {
      const cell = worldToCell(world.x, world.y, gs, ox, oy);
      setMeasureStart(cell);
      setMeasureEndWorld({ x: world.x, y: world.y });
      return;
    }

    // Wall drawing tools: start temp preview
    if (isGM && ['wall', 'door', 'window', 'obstacle', 'spawn_point'].includes(activeTool)) {
      const snapped = getSnappedWorldPos(e);
      setTempWallStart(snapped);
      setTempWallEnd(snapped);
      isPainting.current = true;
      return;
    }

    if (activeTool !== 'select' && isGM && (activeTool === 'fog_add' || activeTool === 'fog_erase' || activeTool === 'erase_wall')) {
      isPainting.current = true;
      paintedCells.current = new Set();
      applyPaint(e);
      return;
    }

    const token = findTokenAt(world);
    if (token && canMoveToken(token)) {
      dragStart.current = { col: token.x, row: token.y };
      setDraggingId(token.id);
      if (isGM) setGmSelectedTokenId(token.id);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX / zoom - pan.x, y: e.clientY / zoom - pan.y };
    }
  };

  const onMouseMove = (e) => {
    if (activeTool === 'measure' && measureStart) {
      const world = getWorldPos(e);
      setMeasureEndWorld({ x: world.x, y: world.y });
      return;
    }
    // Wall drawing: update temp preview end point
    if (isPainting.current && isGM && ['wall', 'door', 'window', 'obstacle', 'spawn_point'].includes(activeTool)) {
      const snapped = getSnappedWorldPos(e);
      setTempWallEnd(snapped);
      return;
    }

    if (isPainting.current && activeTool !== 'select' && isGM && (activeTool === 'fog_add' || activeTool === 'fog_erase' || activeTool === 'erase_wall')) {
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

      // Update trail in real-time
      setTrails((prev) => {
        const existing = prev[draggingId] || [dragStart.current];
        return { ...prev, [draggingId]: [...existing.slice(0, state.waypoints.length - 1), ...state.waypoints] };
      });

      // Queue position for batched backend update (throttled)
      tokenUpdateQueue.current[draggingId] = { x: col, y: row };
      clearTimeout(batchTimer.current);
      batchTimer.current = setTimeout(flushTokenUpdates, 80);

      // LOS during drag handled by useEffect above (worker dispatched on localTokens change)
    } else if (isPanning) {
      setPan({ x: e.clientX / zoom - panStart.current.x, y: e.clientY / zoom - panStart.current.y });
    }
  };

  const onMouseUp = (e) => {
    if (activeTool === 'measure') return; // keep measure line until tool switch
    if (isPainting.current) {finishPaint();return;}
    // Clear GM LOS selection on empty click (no drag, no pan movement)
    if (isGM && !draggingId && isPanning) {
      const movedX = Math.abs(e.clientX / zoom - panStart.current?.x - pan.x);
      const movedY = Math.abs(e.clientY / zoom - panStart.current?.y - pan.y);
      if (movedX < 2 && movedY < 2) setGmSelectedTokenId(null);
    }
    if (draggingId) {
      const movedToken = localTokens.find((t) => t.id === draggingId);
      if (movedToken && dragStart.current) {
        const { col: sc, row: sr } = dragStart.current;
        // Wall collision: if movement crosses a blocking wall, snap back to start
        if (movedToken.x !== sc || movedToken.y !== sr) {
          if (tokenCrossesWall(sc, sr, movedToken.x, movedToken.y, walls, gs, ox, oy)) {
            // Snap back
            setLocalTokens((prev) => prev.map((t) => t.id === draggingId ? { ...t, x: sc, y: sr } : t));
            tokenUpdateQueue.current[draggingId] = { x: sc, y: sr };
          } else {
            setTrails((prev) => {
              const existing = prev[draggingId] || [{ col: sc, row: sr }];
              return { ...prev, [draggingId]: [...existing, { col: movedToken.x, row: movedToken.y }] };
            });
          }
        }
      }
      clearTimeout(batchTimer.current);
      flushTokenUpdates();
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
      const rect = containerRef.current?.getBoundingClientRect();
      const relX = rect ? e.clientX - rect.left : e.clientX;
      const relY = rect ? e.clientY - rect.top : e.clientY;
      setContextMenu({ token, screenX: relX, screenY: relY });
      return;
    }
    // Check wall segments — door toggling
    if (isGM) {
      const wall = findWallSegmentAt(world.x, world.y);
      if (wall && wall.type === 'door') {
        setWalls((prev) => {
          const updated = prev.map((w) => w.id === wall.id ? { ...w, is_open: !w.is_open } : w);
          saveWalls(updated);
          return updated;
        });
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

  const handleEditHP = () => {setEditHpToken(contextMenu.token);setContextMenu(null);};
  const handleRename = () => {setRenameToken(contextMenu.token);setContextMenu(null);};
  const handlePingFromMenu = () => {addPing(contextMenu.screenX, contextMenu.screenY);setContextMenu(null);};
  const handleLinkChar = () => {setLinkToken(contextMenu.token);setContextMenu(null);};
  const handleToggleVisibility = () => {
    if (!contextMenu) return;
    const updated = localTokens.map((t) =>
    t.id === contextMenu.token.id ? { ...t, is_visible: t.is_visible === false ? true : false } : t
    );
    setLocalTokens(updated);onUpdateTokens(updated);setContextMenu(null);
  };

  const handleSaveHP = ({ current_hp, max_hp }) => {
    const updated = localTokens.map((t) => t.id === editHpToken.id ? { ...t, current_hp, max_hp } : t);
    setLocalTokens(updated);onUpdateTokens(updated);setEditHpToken(null);
  };

  // Wall cell HP handlers removed (line-segment model; walls no longer have per-cell HP)

  const handleSaveName = (name) => {
    const updated = localTokens.map((t) => t.id === renameToken.id ? { ...t, name } : t);
    setLocalTokens(updated);onUpdateTokens(updated);setRenameToken(null);
  };

  const handleLinkSave = (characterId) => {
    const char = groupCharacters?.find((c) => c.id === characterId);
    const updated = localTokens.map((t) => t.id === linkToken.id ? {
      ...t, character_id: characterId,
      name: char?.name || t.name,
      max_hp: char?.base_health || t.max_hp,
      current_hp: char?.current_hp ?? char?.base_health ?? t.current_hp
    } : t);
    setLocalTokens(updated);onUpdateTokens(updated);setLinkToken(null);
  };

  const clearTrails = () => setTrails({});

  const spawnPointCount = walls.filter((w) => w.type === 'spawn_point').length;

  const clearSpawnPoints = () => {
    const updated = walls.filter((w) => w.type !== 'spawn_point');
    setWalls(updated);
    saveWalls(updated);
  };

  // ── Touch handling ────────────────────────────────────────────────────────
  const touchStartRef = useRef(null);
  const longPressTimer = useRef(null);
  const pinchStartRef = useRef(null); // { dist, zoom, midX, midY }

  const getTouchDist = (t1, t2) => Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      // Two-finger pinch-to-zoom OR two-finger pan
      if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
      const [t1, t2] = e.touches;
      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      pinchStartRef.current = { dist: getTouchDist(t1, t2), zoom, midX, midY, panX: pan.x, panY: pan.y };
      touchStartRef.current = null;
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    touchStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now() };

    // Long press → context menu (after 500ms)
    longPressTimer.current = setTimeout(() => {
      const rect = canvasRef.current.getBoundingClientRect();
      const world = { x: t.clientX - rect.left - pan.x, y: t.clientY - rect.top - pan.y };
      const token = findTokenAt(world);
      if (token) {
        const containerRect = containerRef.current?.getBoundingClientRect();
        const relX = containerRect ? t.clientX - containerRect.left : t.clientX;
        const relY = containerRect ? t.clientY - containerRect.top : t.clientY;
        setContextMenu({ token, screenX: relX, screenY: relY });
      }
      longPressTimer.current = null;
    }, 500);

    onMouseDown({ button: 0, clientX: t.clientX, clientY: t.clientY });
  };

  const onTouchMove = (e) => {
    e.preventDefault();

    // Pinch-to-zoom (2 fingers)
    if (e.touches.length === 2 && pinchStartRef.current) {
      const [t1, t2] = e.touches;
      const newDist = getTouchDist(t1, t2);
      const scale = newDist / pinchStartRef.current.dist;
      const newZoom = Math.min(4, Math.max(0.25, pinchStartRef.current.zoom * scale));
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const midX = (t1.clientX + t2.clientX) / 2 - rect.left;
        const midY = (t1.clientY + t2.clientY) / 2 - rect.top;
        // Pan so that the pinch midpoint stays fixed in world space
        const worldMidX = midX / pinchStartRef.current.zoom - pinchStartRef.current.panX;
        const worldMidY = midY / pinchStartRef.current.zoom - pinchStartRef.current.panY;
        setPan({ x: midX / newZoom - worldMidX, y: midY / newZoom - worldMidY });
      }
      setZoom(newZoom);
      return;
    }

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
    if (e.touches.length < 2) pinchStartRef.current = null;

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

  const toggleFullscreen = () => setIsFullscreen((v) => !v);

  // Clear measure when tool changes away
  useEffect(() => {
    if (activeTool !== 'measure') {setMeasureStart(null);setMeasureEnd(null);setMeasureEndWorld(null);}
  }, [activeTool]);

  return (
    <>
    <div
        ref={containerRef}
        data-vtt-container
        className="relative w-full rounded-xl overflow-hidden bg-black border border-border/50 block"
        style={isFullscreen ? { position: 'fixed', inset: 0, zIndex: 9999, height: '100vh', width: '100vw', borderRadius: 0 } : { height: '65vh' }}>
        
      {/* Background layer: map image + grid */}
      <canvas
          ref={bgCanvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }} />
        
      {/* Walls / Fortifications layer */}
      <canvas
          ref={wallsCanvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute inset-0 w-full h-full"
          style={{ pointerEvents: 'none' }} />
        
      {/* Tokens layer — receives all pointer events */}
      <canvas
          ref={tokensCanvasRef}
          width={canvasSize.w}
          height={canvasSize.h} className="absolute inset-0 w-full h-full\n"

          style={{ cursor: getCursor(), touchAction: 'none' }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          onContextMenu={onContextMenu}
          onDoubleClick={(e) => {
            if (activeTool !== 'select') return;
            const world = getWorldPos(e);
            const token = findTokenAt(world);
            if (token) setEditHpToken(token);
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd} />
        

      {/* Top-right HUD controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        {initiativeStarted && Object.keys(trails).length > 0 &&
          <button onClick={clearTrails} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
            Clear Trails
          </button>
          }
        {/* Wall visibility toggle */}
        {isGM &&
          <button
            onClick={() => setWallsVisible((v) => !v)}
            title={wallsVisible ? 'Hide Walls' : 'Show Walls'}
            className={`text-xs px-2 py-1 rounded transition-colors ${wallsVisible ? 'bg-cyan-700/80 text-white' : 'bg-black/60 text-muted-foreground'}`}>
            
            {wallsVisible ? 'Hide Walls' : 'Show Walls'}
          </button>
          }
        {/* Zoom controls */}
        <div className="flex items-center bg-black/60 rounded-lg overflow-hidden">
          <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.1))} className="text-white text-sm px-2 py-1 hover:bg-black/80">−</button>
          <span className="text-white text-xs px-1 min-w-[3rem] text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => Math.min(4, z + 0.1))} className="text-white text-sm px-2 py-1 hover:bg-black/80">+</button>
        </div>
        {/* Hamburger toolbar menu — always shown so tools are accessible on mobile/fullscreen */}
        {onToolChange &&
          <div className="relative">
            <button
              onClick={() => setShowFsToolbar((v) => !v)}
              className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
              
              ☰
            </button>
            {showFsToolbar &&
            <div className="absolute top-full right-0 mt-1 z-50 bg-black/90 rounded-xl p-2 min-w-[220px] shadow-xl space-y-2">
                <VttToolbar
                activeTool={activeTool}
                onToolChange={(t) => {onToolChange(t);setShowFsToolbar(false);}}
                isGM={isGM}
                fogCellCount={fogCellCount || 0}
                wallCount={wallCount || 0}
                onClearFog={() => {onClearFog?.();}}
                onClearWalls={() => {onClearWalls?.();}}
                isSurvivalMode={isSurvivalMode}
                onToggleSurvivalMode={() => setIsSurvivalMode(!isSurvivalMode)}
                onToggleEncounterSidebar={() => {onToggleEncounterSidebar?.();setShowFsToolbar(false);}}
                showEncounterSidebar={showEncounterSidebar}
                encounterActive={encounterActive}
                onAddToken={() => { setShowFsToolbar(false); setShowAddModal(true); }}
                onCenterOnActive={activeTokenId ? () => { const tok = localTokens.find(t => t.id === activeTokenId); if (tok) { const {x:wx,y:wy} = cellToWorld(tok.x,tok.y,gs,ox,oy); setPan({ x: canvasSize.w/2/zoom - wx, y: canvasSize.h/2/zoom - wy }); } setShowFsToolbar(false); } : undefined}
                hasActiveToken={!!activeTokenId}
                forceShowLabels />
              
                {isSurvivalMode && isGM &&
              <div className="border-t border-border/30 pt-2">
                    <SurvivalToolbar
                  activeTool={activeTool}
                  onToolChange={(t) => {onToolChange(t);}}
                  isGM={isGM}
                  onOpenWaveGenerator={() => {setShowWaveGenerator(true);setShowFsToolbar(false);}}
                  onClearSpawnPoints={clearSpawnPoints}
                  spawnPointCount={spawnPointCount} />
                
                  </div>
              }
              </div>
            }
          </div>
          }
        {/* Fullscreen toggle */}
        <button onClick={toggleFullscreen} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
          {isFullscreen ? '⤡' : '⤢'}
        </button>
      </div>

      {/* Initiative HUD — shown in fullscreen for all users */}
      {isFullscreen && initiativeStarted &&
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-xl px-3 py-2 shadow-xl border border-yellow-500/30 z-10">
          <span className="text-yellow-400 text-xs font-bold">Round {typeof round === 'number' ? round : ''}</span>
          {activeTokenId &&
          <span className="text-white text-xs font-semibold">
              ⚔️ {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
            </span>
          }
          
        </div>
        }

      {/* Player actions panel — lives inside the canvas so it works in fullscreen */}
      {actionsPanel &&
        <div className="absolute bottom-3 left-3 z-30">
          {actionsPanel}
        </div>
        }

      {/* Encounter Sidebar — lives inside the canvas */}
      {encounterSidebar}

      {/* Wall snap picker */}
      {['wall', 'door', 'window', 'obstacle', 'spawn_point'].includes(activeTool) && isGM && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 rounded-xl px-3 py-1.5 z-20 border border-cyan-500/30">
          <span className="text-xs text-cyan-300 font-medium">Snap to Grid:</span>
          <button
            onClick={() => setWallSnapEnabled(true)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${wallSnapEnabled ? 'bg-cyan-500 text-black' : 'text-cyan-300 hover:bg-cyan-500/20'}`}
          >On</button>
          <button
            onClick={() => setWallSnapEnabled(false)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${!wallSnapEnabled ? 'bg-cyan-500 text-black' : 'text-cyan-300 hover:bg-cyan-500/20'}`}
          >Off</button>
        </div>
      )}

      {/* Measure mode picker */}
      {activeTool === 'measure' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 rounded-xl px-2 py-1.5 z-20 border border-yellow-500/30">
          {['line', 'cone', 'circle'].map((m) => (
            <button
              key={m}
              onClick={() => setMeasureMode(m)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${measureMode === m ? 'bg-yellow-500 text-black' : 'text-yellow-300 hover:bg-yellow-500/20'}`}
            >
              {m === 'line' ? '↔ Line' : m === 'cone' ? '▷ Cone' : '◎ Circle'}
            </button>
          ))}
        </div>
      )}

      {/* Active turn badge (non-fullscreen) */}
      {!isFullscreen && initiativeStarted && activeTokenId &&
        <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-full pointer-events-none shadow-lg">
          {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
        </div>
        }

      {/* Context menu — rendered inside canvas container so it works in fullscreen */}
      {contextMenu &&
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
          losEnabled={losEnabled}
          onToggleLos={() => {setLosEnabled((v) => !v);setContextMenu(null);}}
          containerWidth={canvasSize.w}
          containerHeight={canvasSize.h} />
        }

      {editHpToken &&
        <EditHpModal token={editHpToken} onSave={handleSaveHP} onClose={() => setEditHpToken(null)} />
        }


      {renameToken &&
        <RenameTokenModal token={renameToken} onSave={handleSaveName} onClose={() => setRenameToken(null)} />
        }
      {linkToken &&
        <LinkCharacterModal
          token={linkToken}
          groupCharacters={groupCharacters}
          onSave={handleLinkSave}
          onClose={() => setLinkToken(null)} />

        }

      {showWaveGenerator &&
        <WaveGeneratorModal
          existingTokens={localTokens}
          spawnCells={walls
            .filter((w) => w.type === 'spawn_point' && w.x1 != null)
            .map((w) => {
              const midX = (w.x1 + w.x2) / 2;
              const midY = (w.y1 + w.y2) / 2;
              return { col: Math.floor((midX - ox) / gs), row: Math.floor((midY - oy) / gs) };
            })}
          walls={walls}
          activeGroup={activeGroup}
          activeEncounter={activeEncounter}
          onAddEncounterParticipant={onAddEncounterParticipant}
          onSpawnTokens={(newTokens) => {
            const updated = [...localTokens, ...newTokens];
            setLocalTokens(updated);
            onUpdateTokens(updated);
          }}
          onClose={() => setShowWaveGenerator(false)} />

        }

      {showAddModal && activeEncounter &&
        <AddParticipantModal
          activeGroup={activeGroup}
          groupCharacters={groupCharacters}
          vttTokens={localTokens}
          onAdd={(data) => {
            onAddEncounterParticipant?.(data);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
          userEmail={user?.email} />

        }
    </div>
    </>);

};

const VttCanvas = React.forwardRef(VttCanvasInner);
VttCanvas.displayName = 'VttCanvas';
export default VttCanvas;