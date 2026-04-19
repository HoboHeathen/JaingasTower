import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function VttMapSettings({ map, onUpdate }) {
  const [gridType, setGridType] = useState(map.grid_type || 'square');
  const [gridSize, setGridSize] = useState(map.grid_size || 60);
  const [offsetX, setOffsetX] = useState(map.grid_offset_x || 0);
  const [offsetY, setOffsetY] = useState(map.grid_offset_y || 0);
  const [imageScale, setImageScale] = useState(map.image_scale || 1);

  // Live-apply on any change (debounced via useEffect)
  useEffect(() => {
    const id = setTimeout(() => {
      onUpdate({
        grid_type: gridType,
        grid_size: Math.max(10, Number(gridSize) || 60),
        grid_offset_x: Number(offsetX) || 0,
        grid_offset_y: Number(offsetY) || 0,
        image_scale: Math.max(0.1, Number(imageScale) || 1),
      });
    }, 300);
    return () => clearTimeout(id);
  }, [gridType, gridSize, offsetX, offsetY, imageScale]);

  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex flex-wrap gap-4 items-end">
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Grid Type</label>
        <select
          className="rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground"
          value={gridType}
          onChange={(e) => setGridType(e.target.value)}
        >
          <option value="none">None</option>
          <option value="square">Square</option>
          <option value="hex">Hex</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Cell Size (px)</label>
        <Input type="number" min={10} max={200} value={gridSize} onChange={(e) => setGridSize(e.target.value)} className="w-24" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Grid Offset X</label>
        <Input type="number" value={offsetX} onChange={(e) => setOffsetX(e.target.value)} className="w-24" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Grid Offset Y</label>
        <Input type="number" value={offsetY} onChange={(e) => setOffsetY(e.target.value)} className="w-24" />
      </div>
      <div>
        <label className="text-xs text-muted-foreground block mb-1">Image Scale</label>
        <Input type="number" min={0.1} max={5} step={0.1} value={imageScale} onChange={(e) => setImageScale(e.target.value)} className="w-24" />
      </div>
      <p className="text-[10px] text-muted-foreground w-full -mt-2">Changes apply live (300ms debounce)</p>
    </div>
  );
}