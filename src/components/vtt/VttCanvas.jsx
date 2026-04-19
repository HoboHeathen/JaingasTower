import React, { useRef, useState, useEffect, useCallback } from 'react';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15',
};

// Size → fraction of one grid cell (diameter)
const SIZE_SCALE = {
  tiny: 0.3,
  small: 0.5,
  medium: 0.75,
  large: 2,
  huge: 3,
};

// Feet per grid square (5ft standard)
const FEET_PER_CELL = 5;

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

// Returns world pixel center for a grid cell
function cellToWorld(col, row, gs, ox, oy) {
  return { x: col * gs + ox, y: row * gs + oy };
}

// Returns grid col/row from world pixel
function worldToCell(wx, wy, gs, ox, oy) {
  return { col: Math.round((wx - ox) / gs), row: Math.round((wy - oy) / gs) };
}

// Chebyshev distance in cells
function cellDist(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export default function VttCanvas({
  map,
  isGM,
  user,
  groupCharacters,
  onUpdateTokens,
  initiativeOrder,   // sorted array of token ids
  activeTokenId,     // id of the token whose turn it is
  initiativeStarted,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const [draggingId, setDraggingId] = useState(null);
  const dragStart = useRef(null); // { col, row } grid pos at drag start
  const [localTokens, setLocalTokens] = useState(map.tokens || []);
  // movement trails: { tokenId: [{col,row}, ...] }
  const [trails, setTrails] = useState({});
  // distance label for currently dragging token
  const [moveInfo, setMoveInfo] = useState(null); // { feet, col, row }

  useEffect(() => { setLocalTokens(map.tokens || []); }, [map.tokens]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setCanvasSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load image
  useEffect(() => {
    if (!map.image_url) { imgRef.current = null; return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.image_url;
    img.onload = () => { imgRef.current = img; };
  }, [map.image_url]);

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

    // Movement trails
    Object.entries(trails).forEach(([tokenId, path]) => {
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

    // Tokens
    localTokens.forEach((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      const isActive = token.id === activeTokenId;

      // Active glow
      if (isActive) {
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 18;
      }

      // Circle
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color || TOKEN_COLORS[token.type] || '#888';
      ctx.fill();

      // Active ring
      if (isActive) {
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // HP bar
      if (token.max_hp && token.max_hp > 0) {
        const barW = Math.max(radius * 2, 20);
        const barH = 4;
        const barX = tx - barW / 2;
        const barY = ty + radius + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, barH);
        const pct = Math.max(0, Math.min(1, (token.current_hp ?? token.max_hp) / token.max_hp));
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(barX, barY, barW * pct, barH);
      }

      // Initials
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, gs * 0.22)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((token.name || '?').slice(0, 2).toUpperCase(), tx, ty);

      // Name label
      ctx.font = `${Math.max(9, gs * 0.16)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(token.name, tx, ty + radius + (token.max_hp ? 16 : 6));
    });

    // Move distance HUD
    if (moveInfo) {
      const { x: mx, y: my } = cellToWorld(moveInfo.col, moveInfo.row, gs, ox, oy);
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.beginPath();
      ctx.roundRect(mx - 28, my - radius - 22, 56, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#facc15';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${moveInfo.feet}ft`, mx, my - radius - 12);
    }

    ctx.restore();
  }, [pan, localTokens, map, trails, activeTokenId, moveInfo, gs, ox, oy]);

  useEffect(() => { draw(); }, [draw]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getWorldPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  };

  const findTokenAt = (worldPos) => {
    return [...localTokens].reverse().find((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      return Math.hypot(worldPos.x - tx, worldPos.y - ty) < radius + 4;
    });
  };

  const canMoveToken = (token) => {
    if (isGM) return true;
    if (initiativeStarted && token.id !== activeTokenId) return false;
    const char = groupCharacters?.find((c) => c.id === token.character_id);
    return char?.created_by === user?.email;
  };

  // ── Mouse / Touch ─────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    const world = getWorldPos(e);
    const token = findTokenAt(world);
    if (token && canMoveToken(token)) {
      dragStart.current = { col: token.x, row: token.y };
      setDraggingId(token.id);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const onMouseMove = (e) => {
    if (draggingId) {
      const world = getWorldPos(e);
      const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
      const dist = cellDist(dragStart.current.col, dragStart.current.row, col, row);
      const feet = dist * FEET_PER_CELL;
      setLocalTokens((prev) => prev.map((t) => t.id === draggingId ? { ...t, x: col, y: row } : t));
      setMoveInfo({ feet, col, row });
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  };

  const onMouseUp = () => {
    if (draggingId) {
      const movedToken = localTokens.find((t) => t.id === draggingId);
      if (movedToken && dragStart.current) {
        const { col: sc, row: sr } = dragStart.current;
        if (movedToken.x !== sc || movedToken.y !== sr) {
          // Append to trail
          setTrails((prev) => {
            const existing = prev[draggingId] || [{ col: sc, row: sr }];
            return { ...prev, [draggingId]: [...existing, { col: movedToken.x, row: movedToken.y }] };
          });
        }
      }
      onUpdateTokens(localTokens);
      setDraggingId(null);
      setMoveInfo(null);
      dragStart.current = null;
    }
    setIsPanning(false);
  };

  const onTouchStart = (e) => { if (e.touches.length === 1) { const t = e.touches[0]; onMouseDown({ clientX: t.clientX, clientY: t.clientY }); } };
  const onTouchMove = (e) => { e.preventDefault(); if (e.touches.length === 1) { const t = e.touches[0]; onMouseMove({ clientX: t.clientX, clientY: t.clientY }); } };

  // Clear trails for a token when a new round starts (call from parent via prop if needed)
  const clearTrails = () => setTrails({});

  return (
    <div
      ref={containerRef}
      className="relative w-full rounded-xl overflow-hidden bg-black border border-border/50"
      style={{ height: '65vh' }}
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.w}
        height={canvasSize.h}
        className="block w-full h-full"
        style={{ cursor: draggingId ? 'grabbing' : isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseUp}
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex gap-2 flex-wrap pointer-events-none">
        {Object.entries(TOKEN_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1 bg-black/60 rounded px-2 py-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-white capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Active turn badge */}
      {initiativeStarted && activeTokenId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-full pointer-events-none shadow-lg">
          {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
        </div>
      )}

      {/* Clear trails button (GM only, during initiative) */}
      {isGM && initiativeStarted && Object.keys(trails).length > 0 && (
        <button
          onClick={clearTrails}
          className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors"
        >
          Clear Trails
        </button>
      )}
    </div>
  );
}