import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Plus, Upload, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import VttCanvas from '@/components/vtt/VttCanvas';
import VttMapSettings from '@/components/vtt/VttMapSettings';
import AddTokenModal from '@/components/vtt/AddTokenModal';
import InitiativePanel from '@/components/vtt/InitiativePanel';
import VttToolbar from '@/components/vtt/VttToolbar';

export default function VttTab({ activeGroup, isGM, user, groupCharacters }) {
  const queryClient = useQueryClient();
  const [showNewMap, setShowNewMap] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAddToken, setShowAddToken] = useState(false);
  const [selectedMapId, setSelectedMapId] = useState(null); // null = show list view
  const [activeTool, setActiveTool] = useState('select');
  const fileInputRef = useRef(null);

  // Initiative state (local – GM drives it, ideally would be persisted; kept simple)
  const [initiativeOrder, setInitiativeOrder] = useState([]); // [{tokenId, name, roll, type, color}]
  const [initiativeStarted, setInitiativeStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [round, setRound] = useState(1);

  const { data: maps = [] } = useQuery({
    queryKey: ['vtt-maps', activeGroup?.id],
    queryFn: () => base44.entities.VttMap.filter({ group_id: activeGroup.id }),
    enabled: !!activeGroup?.id,
    refetchInterval: 5000,
  });

  // If selectedMapId is set, use that map; otherwise show list view
  const activeMap = selectedMapId ? (maps.find((m) => m.id === selectedMapId) || null) : null;

  const updateMapMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.VttMap.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vtt-maps'] }),
  });

  const createMapMutation = useMutation({
    mutationFn: (data) => base44.entities.VttMap.create({ ...data, group_id: activeGroup.id }),
    onSuccess: async (newMap) => {
      await Promise.all(maps.map((m) => base44.entities.VttMap.update(m.id, { is_active: false })));
      await base44.entities.VttMap.update(newMap.id, { is_active: true });
      queryClient.invalidateQueries({ queryKey: ['vtt-maps'] });
      setShowNewMap(false);
      setNewMapName('');
      toast.success('Map created!');
    },
  });

  const deleteMapMutation = useMutation({
    mutationFn: (id) => base44.entities.VttMap.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vtt-maps'] });
      toast.success('Map deleted.');
    },
  });

  const handleUploadAndCreate = () => {
    if (!newMapName.trim()) { toast.error('Enter a map name first.'); return; }
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      createMapMutation.mutate({ name: newMapName.trim(), image_url: file_url });
    } catch { toast.error('Upload failed.'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const handleSetActive = (mapId) => {
    setSelectedMapId(mapId);
    // Reset initiative when switching maps
    setInitiativeOrder([]);
    setInitiativeStarted(false);
    setActiveIndex(0);
  };

  const handleUpdateMap = (data) => {
    if (!activeMap) return;
    updateMapMutation.mutate({ id: activeMap.id, data });
  };

  const handleUpdateTokens = (tokens) => {
    if (!activeMap) return;
    updateMapMutation.mutate({ id: activeMap.id, data: { tokens } });
  };

  const handleAddToken = (token) => {
    const existing = activeMap?.tokens || [];
    const gs = activeMap?.grid_size || 60;
    const ox = activeMap?.grid_offset_x || 0;
    const oy = activeMap?.grid_offset_y || 0;
    // Center of canvas viewport in grid coords (canvas approx 800x500)
    const centerCol = Math.round((400 - ox) / gs);
    const centerRow = Math.round((250 - oy) / gs);
    // Players default to visible; enemies/neutrals/friendly default to hidden for GM to reveal
    const defaultVisible = token.type === 'player';
    handleUpdateTokens([...existing, { ...token, id: crypto.randomUUID(), x: centerCol, y: centerRow, is_visible: defaultVisible }]);
    setShowAddToken(false);
  };

  // Initiative handlers
  const handleStartInitiative = () => {
    setActiveIndex(0);
    setRound(1);
    setInitiativeStarted(true);
  };

  const handleEndInitiative = () => {
    setInitiativeStarted(false);
    setActiveIndex(0);
    setRound(1);
    setInitiativeOrder([]);
  };

  const handleNextTurn = () => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % initiativeOrder.length;
      if (next === 0 && initiativeOrder.length > 0) {
        setRound((r) => {
          toast(`Round ${r + 1} begins!`, { icon: '⚔️' });
          return r + 1;
        });
      }
      return next;
    });
  };

  const activeTokenId = initiativeStarted && initiativeOrder.length > 0
    ? initiativeOrder[activeIndex]?.tokenId
    : null;

  const tokens = activeMap?.tokens || [];

  // ── Map List View ─────────────────────────────────────────────────────────
  if (!activeMap) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Map className="w-4 h-4 text-primary" /> Maps
          </h2>
          {isGM && !showNewMap && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowNewMap(true)}>
              <Plus className="w-4 h-4" /> New Map
            </Button>
          )}
        </div>

        {isGM && showNewMap && (
          <div className="flex items-center gap-2 flex-wrap bg-card border border-border/50 rounded-xl p-3">
            <Input placeholder="Map name..." value={newMapName} onChange={(e) => setNewMapName(e.target.value)}
              className="h-8 text-sm flex-1 min-w-0" autoFocus />
            <Button size="sm" className="gap-1.5 h-8" onClick={handleUploadAndCreate} disabled={uploading || createMapMutation.isPending}>
              <Upload className="w-3 h-3" />{uploading ? 'Uploading…' : 'Upload Image'}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowNewMap(false); setNewMapName(''); }}>Cancel</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {maps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Map className="w-12 h-12 opacity-30" />
            <p className="text-sm">{isGM ? 'No maps yet. Create one above.' : 'No maps available yet.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {maps.map((m) => (
              <div key={m.id} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3 hover:bg-secondary/20 transition-colors">
                <button className="flex-1 text-left" onClick={() => handleSetActive(m.id)}>
                  <p className="font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{m.tokens?.length || 0} token{m.tokens?.length !== 1 ? 's' : ''} · {m.grid_type || 'no'} grid</p>
                </button>
                <Button size="sm" onClick={() => handleSetActive(m.id)}>Open</Button>
                {isGM && (
                  <button onClick={() => deleteMapMutation.mutate(m.id)} className="text-destructive hover:opacity-70 ml-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Active Map View ────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setSelectedMapId(null)}>
          <ArrowLeft className="w-4 h-4" /> Maps
        </Button>
        <span className="font-heading font-semibold text-foreground text-sm">{activeMap.name}</span>

        <div className="ml-auto flex items-center gap-2">
          {isGM && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSettings((v) => !v)}>
              <Settings className="w-4 h-4" /> Grid
            </Button>
          )}
          <Button size="sm" className="gap-1.5" onClick={() => setShowAddToken(true)}>
            <Plus className="w-4 h-4" /> Token
          </Button>
        </div>
      </div>

      {/* VTT Toolbar */}
      <VttToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        isGM={isGM}
        fogCellCount={activeMap?.fog_cells?.length || 0}
        wallCount={activeMap?.walls?.length || 0}
        onClearFog={() => handleUpdateMap({ fog_cells: [] })}
        onClearWalls={() => handleUpdateMap({ walls: [] })}
      />

      {/* Grid settings */}
      {isGM && showSettings && (
        <VttMapSettings map={activeMap} onUpdate={handleUpdateMap} />
      )}

      {/* Initiative panel */}
      {tokens.length > 0 && (
        <InitiativePanel
          tokens={tokens}
          groupCharacters={groupCharacters}
          isGM={isGM}
          initiativeStarted={initiativeStarted}
          initiativeOrder={initiativeOrder}
          activeIndex={activeIndex}
          round={round}
          onStart={handleStartInitiative}
          onEnd={handleEndInitiative}
          onNextTurn={handleNextTurn}
          onSetOrder={setInitiativeOrder}
        />
      )}

      {/* Canvas */}
      <VttCanvas
        map={activeMap}
        isGM={isGM}
        user={user}
        groupCharacters={groupCharacters}
        onUpdateTokens={handleUpdateTokens}
        onUpdateMap={handleUpdateMap}
        initiativeOrder={initiativeOrder}
        activeTokenId={activeTokenId}
        initiativeStarted={initiativeStarted}
        activeTool={activeTool}
      />

      {showAddToken && (
        <AddTokenModal
          groupCharacters={groupCharacters}
          isGM={isGM}
          user={user}
          onAdd={handleAddToken}
          onClose={() => setShowAddToken(false)}
        />
      )}
    </div>
  );
}