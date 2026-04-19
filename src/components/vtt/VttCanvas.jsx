import React, { useRef, useState, useEffect, useCallback } from 'react';
import TokenContextMenu from '@/components/vtt/TokenContextMenu';
import EditHpModal from '@/components/vtt/EditHpModal';
import RenameTokenModal from '@/components/vtt/RenameTokenModal';
import { Eye, EyeOff } from 'lucide-react';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15',
};

const SIZE_SCALE = { tiny: 0.3, small: 0.5, medium: 0.75, large: 2, huge: 3 };
const FEET_PER_CELL = 5;

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

function cellToWorld(col, row, gs, ox, oy) {
  return { x: col * gs + ox, y: row * gs + oy };
}

function worldToCell(wx, wy, gs, ox, oy) {
  return { col: Math.round((wx - ox) / gs), row: Math.round((wy - oy) / gs) };
}

function cellDist(ax, ay, bx, by) {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

// ── Fog helper: encode/decode a Set of "col,row" strings ─────────────────────
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
  const [trails, setTrails] = useState({});
  const [moveInfo, setMoveInfo] = useState(null);

  // Fog of war: Set of "col,row" strings that are hidden
  const [fogCells, setFogCells] = useState(() => new Set(map.fog_cells || []));
  const [fogMode, setFogMode] = useState(false); // GM toggle: paint/erase fog
  const [fogBrush, setFogBrush] = useState('add'); // 'add' | 'erase'
  const isPaintingFog = useRef(false);

  // Pings: [{id, x, y, born}]
  const [pings, setPings] = useState([]);

  // Context menu
  const [contextMenu, setContextMenu] = useState(null); // {token, screenX, screenY}
  const [editHpToken, setEditHpToken] = useState(null);
  const [renameToken, setRenameToken] = useState(null);

  useEffect(() => { setLocalTokens(map.tokens || []); }, [map.tokens]);
  useEffect(() => { setFogCells(new Set(map.fog_cells || [])); }, [map.fog_cells]);

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

    // Tokens
    localTokens.forEach((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const { x: tx, y: ty } = cellToWorld(token.x, token.y, gs, ox, oy);
      const isActive = token.id === activeTokenId;

      if (isActive) { ctx.shadowColor = '#facc15'; ctx.shadowBlur = 18; }

      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color || TOKEN_COLORS[token.type] || '#888';
      ctx.fill();

      if (isActive) {
        ctx.strokeStyle = '#facc15'; ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
      }

      // HP bar
      if (token.max_hp && token.max_hp > 0) {
        const barW = Math.max(radius * 2, 20);
        const barX = tx - barW / 2;
        const barY = ty + radius + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(barX, barY, barW, 4);
        const pct = Math.max(0, Math.min(1, (token.current_hp ?? token.max_hp) / token.max_hp));
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(barX, barY, barW * pct, 4);
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
    });

    // Fog of war overlay (players always see fog; GM sees translucent)
    if (fogCells.size > 0) {
      const alpha = isGM ? 0.45 : 1;
      ctx.fillStyle = `rgba(0,0,0,${alpha})`;
      fogCells.forEach((key) => {
        const [col, row] = key.split(',').map(Number);
        const { x: fx, y: fy } = cellToWorld(col, row, gs, ox, oy);
        ctx.fillRect(fx - gs / 2, fy - gs / 2, gs, gs);
      });
    }

    // Fog brush preview (GM fog mode)
    // (handled via canvas overlay in JSX)

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

    // Pings
    const now = Date.now();
    pings.forEach((ping) => {
      const age = now - ping.born;
      const t = age / 2500;
      const alpha = Math.max(0, 1 - t);
      const r1 = 8 + t * 30;
      const r2 = 14 + t * 20;
      ctx.strokeStyle = `rgba(250,204,21,${alpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(ping.x - pan.x, ping.y - pan.y, r1, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(ping.x - pan.x, ping.y - pan.y, r2, 0, Math.PI * 2); ctx.stroke();
    });

    ctx.restore();
  }, [pan, localTokens, map, trails, activeTokenId, moveInfo, gs, ox, oy, fogCells, isGM, pings]);

  useEffect(() => { draw(); }, [draw]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getWorldPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  };

  const getScreenPos = (e) => ({ x: e.clientX, y: e.clientY });

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

  // ── Fog painting ──────────────────────────────────────────────────────────
  const applyFogBrush = (e) => {
    if (!fogMode || !isGM) return;
    const world = getWorldPos(e);
    const { col, row } = worldToCell(world.x, world.y, gs, ox, oy);
    setFogCells((prev) => {
      const next = new Set(prev);
      const key = fogKey(col, row);
      if (fogBrush === 'add') next.add(key); else next.delete(key);
      return next;
    });
  };

  const saveFog = useCallback(() => {
    if (!isGM || !onUpdateMap) return;
    onUpdateMap({ fog_cells: [...fogCells] });
  }, [fogCells, isGM, onUpdateMap]);

  // ── Mouse / Touch ─────────────────────────────────────────────────────────
  const onMouseDown = (e) => {
    if (e.button === 2) return; // handled by onContextMenu
    const world = getWorldPos(e);
    if (fogMode && isGM) {
      isPaintingFog.current = true;
      applyFogBrush(e);
      return;
    }
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
    if (isPaintingFog.current && fogMode && isGM) { applyFogBrush(e); return; }
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

  const onMouseUp = (e) => {
    if (isPaintingFog.current) {
      isPaintingFog.current = false;
      saveFog();
      return;
    }
    if (draggingId) {
      const movedToken = localTokens.find((t) => t.id === draggingId);
      if (movedToken && dragStart.current) {
        const { col: sc, row: sr } = dragStart.current;
        if (movedToken.x !== sc || movedToken.y !== sr) {
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

  const onContextMenu = (e) => {
    e.preventDefault();
    const world = getWorldPos(e);
    const token = findTokenAt(world);
    if (token) {
      setContextMenu({ token, screenX: e.clientX, screenY: e.clientY });
    } else {
      // Ping on empty right-click
      addPing(e.clientX, e.clientY);
    }
  };

  // ── Pings ─────────────────────────────────────────────────────────────────
  const addPing = (screenX, screenY) => {
    setPings((prev) => [...prev, { id: Date.now(), x: screenX, y: screenY, born: Date.now() }]);
  };

  // ── Context menu actions ──────────────────────────────────────────────────
  const handleDeleteToken = () => {
    if (!contextMenu) return;
    const updated = localTokens.filter((t) => t.id !== contextMenu.token.id);
    setLocalTokens(updated);
    onUpdateTokens(updated);
  };

  const handleEditHP = () => {
    if (!contextMenu) return;
    setEditHpToken(contextMenu.token);
  };

  const handleRename = () => {
    if (!contextMenu) return;
    setRenameToken(contextMenu.token);
  };

  const handlePingFromMenu = () => {
    if (!contextMenu) return;
    addPing(contextMenu.screenX, contextMenu.screenY);
  };

  const handleSaveHP = ({ current_hp, max_hp }) => {
    const updated = localTokens.map((t) =>
      t.id === editHpToken.id ? { ...t, current_hp, max_hp } : t
    );
    setLocalTokens(updated);
    onUpdateTokens(updated);
    setEditHpToken(null);
  };

  const handleSaveName = (name) => {
    const updated = localTokens.map((t) =>
      t.id === renameToken.id ? { ...t, name } : t
    );
    setLocalTokens(updated);
    onUpdateTokens(updated);
    setRenameToken(null);
  };

  const onTouchStart = (e) => { if (e.touches.length === 1) { const t = e.touches[0]; onMouseDown({ button: 0, clientX: t.clientX, clientY: t.clientY }); } };
  const onTouchMove = (e) => { e.preventDefault(); if (e.touches.length === 1) { const t = e.touches[0]; onMouseMove({ clientX: t.clientX, clientY: t.clientY }); } };

  const clearTrails = () => setTrails({});
  const clearFog = () => { setFogCells(new Set()); if (onUpdateMap) onUpdateMap({ fog_cells: [] }); };

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
        style={{ cursor: fogMode ? (fogBrush === 'add' ? 'crosshair' : 'cell') : draggingId ? 'grabbing' : isPanning ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onContextMenu={onContextMenu}
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

      {/* GM Controls (top-right) */}
      {isGM && (
        <div className="absolute top-3 right-3 flex gap-1.5 items-center">
          {initiativeStarted && Object.keys(trails).length > 0 && (
            <button onClick={clearTrails} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
              Clear Trails
            </button>
          )}
          {fogCells.size > 0 && !fogMode && (
            <button onClick={clearFog} className="bg-black/60 text-white text-xs px-2 py-1 rounded hover:bg-black/80 transition-colors">
              Clear Fog
            </button>
          )}
          {/* Fog mode toggle */}
          <button
            onClick={() => setFogMode((v) => !v)}
            className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded transition-colors ${fogMode ? 'bg-primary/80 text-primary-foreground' : 'bg-black/60 text-white hover:bg-black/80'}`}
          >
            {fogMode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {fogMode ? 'Painting Fog' : 'Fog of War'}
          </button>
          {fogMode && (
            <>
              <button
                onClick={() => setFogBrush('add')}
                className={`text-xs px-2 py-1 rounded transition-colors ${fogBrush === 'add' ? 'bg-gray-600 text-white' : 'bg-black/60 text-gray-400 hover:bg-black/80'}`}
              >Add</button>
              <button
                onClick={() => setFogBrush('erase')}
                className={`text-xs px-2 py-1 rounded transition-colors ${fogBrush === 'erase' ? 'bg-green-700 text-white' : 'bg-black/60 text-gray-400 hover:bg-black/80'}`}
              >Erase</button>
            </>
          )}
        </div>
      )}

      {/* Active turn badge */}
      {initiativeStarted && activeTokenId && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-yellow-500/90 text-black text-xs font-bold px-3 py-1 rounded-full pointer-events-none shadow-lg">
          {localTokens.find((t) => t.id === activeTokenId)?.name ?? ''}'s Turn
        </div>
      )}

      {/* Fog mode instructions */}
      {isGM && fogMode && (
        <div className="absolute bottom-3 right-3 bg-black/70 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
          Drag to paint • Right-click empty = Ping
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
        />
      )}

      {/* Edit HP modal */}
      {editHpToken && (
        <EditHpModal
          token={editHpToken}
          onSave={handleSaveHP}
          onClose={() => setEditHpToken(null)}
        />
      )}

      {/* Rename modal */}
      {renameToken && (
        <RenameTokenModal
          token={renameToken}
          onSave={handleSaveName}
          onClose={() => setRenameToken(null)}
        />
      )}
    </div>
  );
}