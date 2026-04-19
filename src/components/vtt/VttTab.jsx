import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Plus, Upload, Trash2, ChevronDown, Settings, Check } from 'lucide-react';
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
  const [showMapList, setShowMapList] = useState(false);
  const [activeTool, setActiveTool] = useState('select');
  const fileInputRef = useRef(null);

  // Initiative state (local – GM drives it, ideally would be persisted; kept simple)
  const [initiativeOrder, setInitiativeOrder] = useState([]); // [{tokenId, name, roll, type, color}]
  const [initiativeStarted, setInitiativeStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const { data: maps = [] } = useQuery({
    queryKey: ['vtt-maps', activeGroup?.id],
    queryFn: () => base44.entities.VttMap.filter({ group_id: activeGroup.id }),
    enabled: !!activeGroup?.id,
    refetchInterval: 5000,
  });

  const activeMap = maps.find((m) => m.is_active) || maps[0] || null;

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

  const handleSetActive = async (mapId) => {
    await Promise.all(maps.map((m) => base44.entities.VttMap.update(m.id, { is_active: m.id === mapId })));
    queryClient.invalidateQueries({ queryKey: ['vtt-maps'] });
    setShowMapList(false);
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
    handleUpdateTokens([...existing, { ...token, id: crypto.randomUUID(), x: centerCol, y: centerRow }]);
    setShowAddToken(false);
  };

  // Initiative handlers
  const handleStartInitiative = () => {
    setActiveIndex(0);
    setInitiativeStarted(true);
  };

  const handleEndInitiative = () => {
    setInitiativeStarted(false);
    setActiveIndex(0);
    setInitiativeOrder([]);
  };

  const handleNextTurn = () => {
    setActiveIndex((prev) => {
      const next = (prev + 1) % initiativeOrder.length;
      return next;
    });
  };

  const activeTokenId = initiativeStarted && initiativeOrder.length > 0
    ? initiativeOrder[activeIndex]?.tokenId
    : null;

  const tokens = activeMap?.tokens || [];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Map selector */}
        <div className="relative">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowMapList((v) => !v)}>
            <Map className="w-4 h-4" />
            {activeMap ? activeMap.name : 'No Map'}
            <ChevronDown className="w-3 h-3" />
          </Button>
          {showMapList && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-xl shadow-xl min-w-48 py-1">
              {maps.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No maps yet.</p>}
              {maps.map((m) => (
                <div key={m.id} className="flex items-center gap-2 px-3 py-2 hover:bg-secondary/40 transition-colors">
                  <button className="flex-1 text-left text-sm text-foreground" onClick={() => handleSetActive(m.id)}>
                    {m.is_active && <Check className="w-3 h-3 inline mr-1 text-primary" />}
                    {m.name}
                  </button>
                  {isGM && (
                    <button onClick={() => deleteMapMutation.mutate(m.id)} className="text-destructive hover:opacity-70">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* New Map (GM only) */}
        {isGM && !showNewMap && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowNewMap(true)}>
            <Plus className="w-4 h-4" /> New Map
          </Button>
        )}
        {isGM && showNewMap && (
          <div className="flex items-center gap-2">
            <Input placeholder="Map name..." value={newMapName} onChange={(e) => setNewMapName(e.target.value)}
              className="h-8 text-sm w-36" autoFocus />
            <Button size="sm" className="gap-1.5 h-8" onClick={handleUploadAndCreate} disabled={uploading || createMapMutation.isPending}>
              <Upload className="w-3 h-3" />{uploading ? 'Uploading…' : 'Upload Image'}
            </Button>
            <Button size="sm" variant="ghost" className="h-8" onClick={() => { setShowNewMap(false); setNewMapName(''); }}>Cancel</Button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {isGM && activeMap && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowSettings((v) => !v)}>
              <Settings className="w-4 h-4" /> Grid
            </Button>
          )}
          {activeMap && (
            <Button size="sm" className="gap-1.5" onClick={() => setShowAddToken(true)}>
              <Plus className="w-4 h-4" /> Token
            </Button>
          )}
        </div>
      </div>

      {/* VTT Toolbar */}
      {activeMap && (
        <VttToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          isGM={isGM}
          fogCellCount={activeMap?.fog_cells?.length || 0}
          wallCount={activeMap?.walls?.length || 0}
          onClearFog={() => {
            handleUpdateMap({ fog_cells: [] });
          }}
          onClearWalls={() => {
            handleUpdateMap({ walls: [] });
          }}
        />
      )}

      {/* Grid settings */}
      {isGM && showSettings && activeMap && (
        <VttMapSettings map={activeMap} onUpdate={handleUpdateMap} />
      )}

      {/* Initiative panel */}
      {activeMap && tokens.length > 0 && (
        <InitiativePanel
          tokens={tokens}
          groupCharacters={groupCharacters}
          isGM={isGM}
          initiativeStarted={initiativeStarted}
          initiativeOrder={initiativeOrder}
          activeIndex={activeIndex}
          onStart={handleStartInitiative}
          onEnd={handleEndInitiative}
          onNextTurn={handleNextTurn}
          onSetOrder={setInitiativeOrder}
        />
      )}

      {/* Canvas */}
      {activeMap ? (
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
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
          <Map className="w-12 h-12 opacity-30" />
          <p className="text-sm">{isGM ? 'Create a map to get started.' : 'No map loaded yet.'}</p>
        </div>
      )}

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