import React, { useRef, useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

const TOKEN_COLORS = {
  player: '#4ade80',
  enemy: '#f87171',
  friendly: '#60a5fa',
  neutral: '#facc15',
};

const SIZE_SCALE = {
  tiny: 0.3,
  small: 0.5,
  medium: 0.75,
  large: 2,
  huge: 3,
};

function drawSquareGrid(ctx, width, height, gridSize, offsetX, offsetY) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const startX = ((offsetX % gridSize) + gridSize) % gridSize;
  const startY = ((offsetY % gridSize) + gridSize) % gridSize;
  for (let x = startX; x <= width; x += gridSize) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = startY; y <= height; y += gridSize) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }
}

function drawHexGrid(ctx, width, height, gridSize, offsetX, offsetY) {
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  const r = gridSize / 2;
  const h = r * Math.sqrt(3);
  const cols = Math.ceil(width / (r * 1.5)) + 2;
  const rows = Math.ceil(height / h) + 2;
  for (let col = -1; col < cols; col++) {
    for (let row = -1; row < rows; row++) {
      const cx = col * r * 1.5 + offsetX;
      const cy = row * h + (col % 2 === 0 ? 0 : h / 2) + offsetY;
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

function snapToGrid(x, y, gridSize, offsetX, offsetY, gridType) {
  if (gridType === 'none') return { x, y };
  const ox = ((offsetX % gridSize) + gridSize) % gridSize;
  const oy = ((offsetY % gridSize) + gridSize) % gridSize;
  const col = Math.round((x - ox) / gridSize);
  const row = Math.round((y - oy) / gridSize);
  return { x: col * gridSize + ox, y: row * gridSize + oy };
}

export default function VttCanvas({ map, isGM, user, groupCharacters, onUpdateTokens }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef(null);
  const [draggingToken, setDraggingToken] = useState(null);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [localTokens, setLocalTokens] = useState(map.tokens || []);

  useEffect(() => { setLocalTokens(map.tokens || []); }, [map.tokens]);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setCanvasSize({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Load image
  useEffect(() => {
    if (!map.image_url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.image_url;
    img.onload = () => { imgRef.current = img; draw(); };
  }, [map.image_url]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(pan.x, pan.y);

    // Draw image
    if (imgRef.current) {
      const scale = map.image_scale || 1;
      ctx.drawImage(imgRef.current, 0, 0, imgRef.current.width * scale, imgRef.current.height * scale);
    }

    // Draw grid
    if (map.grid_type && map.grid_type !== 'none') {
      const gs = map.grid_size || 60;
      const ox = map.grid_offset_x || 0;
      const oy = map.grid_offset_y || 0;
      if (map.grid_type === 'square') drawSquareGrid(ctx, canvas.width + Math.abs(pan.x) + gs, canvas.height + Math.abs(pan.y) + gs, gs, ox, oy);
      if (map.grid_type === 'hex') drawHexGrid(ctx, canvas.width + Math.abs(pan.x) + gs * 2, canvas.height + Math.abs(pan.y) + gs * 2, gs, ox, oy);
    }

    // Draw tokens
    localTokens.forEach((token) => {
      const gs = map.grid_size || 60;
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const tx = token.x * gs + (map.grid_offset_x || 0);
      const ty = token.y * gs + (map.grid_offset_y || 0);

      // Shadow
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;

      // Circle
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.fillStyle = token.color || TOKEN_COLORS[token.type] || '#888';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // HP bar
      if (token.max_hp && token.max_hp > 0) {
        const barW = radius * 2;
        const barH = 4;
        const barX = tx - radius;
        const barY = ty + radius + 3;
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(barX, barY, barW, barH);
        const pct = Math.max(0, Math.min(1, (token.current_hp || 0) / token.max_hp));
        ctx.fillStyle = pct > 0.5 ? '#4ade80' : pct > 0.25 ? '#facc15' : '#f87171';
        ctx.fillRect(barX, barY, barW * pct, barH);
      }

      // Label
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(10, gs * 0.2)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const initials = token.name?.slice(0, 2).toUpperCase() || '?';
      ctx.fillText(initials, tx, ty);

      // Name below
      ctx.font = `${Math.max(9, gs * 0.16)}px Inter, sans-serif`;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillText(token.name, tx, ty + radius + (token.max_hp ? 14 : 5));
    });

    ctx.restore();
  }, [pan, localTokens, map, canvasSize]);

  useEffect(() => { draw(); }, [draw]);

  // Mouse handlers
  const getCanvasPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left - pan.x, y: e.clientY - rect.top - pan.y };
  };

  const findTokenAt = (pos) => {
    const gs = map.grid_size || 60;
    return [...localTokens].reverse().find((token) => {
      const scale = SIZE_SCALE[token.size] || 0.75;
      const radius = (gs * scale) / 2;
      const tx = token.x * gs + (map.grid_offset_x || 0);
      const ty = token.y * gs + (map.grid_offset_y || 0);
      return Math.hypot(pos.x - tx, pos.y - ty) < radius;
    });
  };

  const canMoveToken = (token) => {
    if (isGM) return true;
    const char = groupCharacters?.find((c) => c.id === token.character_id);
    return char?.created_by === user?.email;
  };

  const onMouseDown = (e) => {
    const pos = getCanvasPos(e);
    const token = findTokenAt(pos);
    if (token && canMoveToken(token)) {
      const gs = map.grid_size || 60;
      const tx = token.x * gs + (map.grid_offset_x || 0);
      const ty = token.y * gs + (map.grid_offset_y || 0);
      dragOffset.current = { x: pos.x - tx, y: pos.y - ty };
      setDraggingToken(token.id);
    } else {
      setIsPanning(true);
      panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const onMouseMove = (e) => {
    if (draggingToken) {
      const pos = getCanvasPos(e);
      const gs = map.grid_size || 60;
      const ox = map.grid_offset_x || 0;
      const oy = map.grid_offset_y || 0;
      const rawX = pos.x - dragOffset.current.x;
      const rawY = pos.y - dragOffset.current.y;
      const col = Math.round((rawX - ox) / gs);
      const row = Math.round((rawY - oy) / gs);
      setLocalTokens((prev) => prev.map((t) => t.id === draggingToken ? { ...t, x: col, y: row } : t));
    } else if (isPanning) {
      setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
    }
  };

  const onMouseUp = () => {
    if (draggingToken) {
      onUpdateTokens(localTokens);
      setDraggingToken(null);
    }
    setIsPanning(false);
  };

  // Touch support
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onMouseDown({ clientX: t.clientX, clientY: t.clientY });
    }
  };
  const onTouchMove = (e) => {
    if (e.touches.length === 1) {
      const t = e.touches[0];
      onMouseMove({ clientX: t.clientX, clientY: t.clientY });
    }
  };

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
        style={{ cursor: draggingToken ? 'grabbing' : isPanning ? 'grabbing' : 'grab' }}
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
          <div key={type} className="flex items-center gap-1 bg-black/50 rounded px-2 py-0.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
            <span className="text-[10px] text-white capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}