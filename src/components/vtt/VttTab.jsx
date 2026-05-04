import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Map, Plus, Upload, Trash2, Settings, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import VttCanvas from '@/components/vtt/VttCanvas';
import VttMapSettings from '@/components/vtt/VttMapSettings';
import AddTokenModal from '@/components/vtt/AddTokenModal';

import VttToolbar from '@/components/vtt/VttToolbar';
import VttActionsPanel from '@/components/vtt/VttActionsPanel';
import EncounterSidebar from '@/components/vtt/EncounterSidebar';

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
  const [showEncounterSidebar, setShowEncounterSidebar] = useState(false);
  const [activeEncounterTokenId, setActiveEncounterTokenId] = useState(null);
  const [encounterRound, setEncounterRound] = useState(1);
  const [activeEncounter, setActiveEncounter] = useState(null);
  const addParticipantRef = useRef(null);

  // Skill trees for actions panel
  const { data: allTrees = [] } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list(),
    enabled: !isGM,
  });
  const { data: racialTrees = [] } = useQuery({
    queryKey: ['racial-trees'],
    queryFn: () => base44.entities.RacialTree.list(),
    enabled: !isGM,
  });

  // The current player's character in this group
  const playerCharacter = !isGM ? (groupCharacters.find((c) => c.created_by === user?.email) ?? null) : null;

  const { data: maps = [] } = useQuery({
    queryKey: ['vtt-maps', activeGroup?.id],
    queryFn: () => base44.entities.VttMap.filter({ group_id: activeGroup.id }),
    enabled: !!activeGroup?.id,
    refetchInterval: 10000,
  });

  // If selectedMapId is set, use that map; otherwise show list view
  const activeMap = selectedMapId ? (maps.find((m) => m.id === selectedMapId) || null) : null;

  // ── VttToken entity — fetch and subscribe ─────────────────────────────────
  const { data: vttTokens = [], refetch: refetchTokens } = useQuery({
    queryKey: ['vtt-tokens', selectedMapId],
    queryFn: () => base44.entities.VttToken.filter({ map_id: selectedMapId }),
    enabled: !!selectedMapId,
  });

  // Real-time subscription to VttToken changes for the active map
  useEffect(() => {
    if (!selectedMapId) return;
    const unsubscribe = base44.entities.VttToken.subscribe((event) => {
      if (event.data?.map_id === selectedMapId || !event.data) {
        refetchTokens();
      }
    });
    return unsubscribe;
  }, [selectedMapId, refetchTokens]);

  const updateCharacterMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Character.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-characters'] }),
  });

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
    setActiveEncounterTokenId(null);
    setEncounterRound(1);
    // Auto-enter fullscreen
    setTimeout(() => {
      const el = document.querySelector('[data-vtt-container]');
      if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
    }, 300);
  };

  const handleUpdateMap = (data) => {
    if (!activeMap) return;
    updateMapMutation.mutate({ id: activeMap.id, data });
  };

  // handleUpdateTokens: reconcile local token state back to VttToken entities.
  // Called by VttCanvas after drag-drop for non-position fields (hp, visibility, etc.)
  const handleUpdateTokens = async (tokens) => {
    if (!selectedMapId) return;
    // For each token: if it has an `id` matching an existing VttToken, update it.
    // If it's new (not in vttTokens), create it.
    const existingIds = new Set(vttTokens.map((t) => t.id));
    const serverIds = new Set(tokens.map((t) => t.id));

    // Deletions
    const toDelete = vttTokens.filter((t) => !serverIds.has(t.id));
    // Updates / Creations
    await Promise.all([
      ...toDelete.map((t) => base44.entities.VttToken.delete(t.id)),
      ...tokens.map((t) => {
        const { id, ...fields } = t;
        if (existingIds.has(id)) {
          return base44.entities.VttToken.update(id, fields);
        } else {
          return base44.entities.VttToken.create({ ...fields, map_id: selectedMapId, group_id: activeGroup.id });
        }
      }),
    ]);
    refetchTokens();
  };

  const handleAddToken = async (token) => {
    // Players default to visible; enemies/neutrals/friendly default to hidden for GM to reveal
    const defaultVisible = token.type === 'player';
    await base44.entities.VttToken.create({
      ...token,
      map_id: selectedMapId,
      group_id: activeGroup.id,
      x: 0,
      y: 0,
      is_visible: defaultVisible,
    });
    refetchTokens();
    setShowAddToken(false);
  };

  const activeTokenId = activeEncounterTokenId;
  const tokens = vttTokens;

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
                  <p className="text-xs text-muted-foreground mt-0.5">{m.grid_type || 'no'} grid</p>
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
        onToggleEncounterSidebar={isGM ? () => setShowEncounterSidebar((v) => !v) : undefined}
        showEncounterSidebar={showEncounterSidebar}
        encounterActive={activeEncounter?.is_active || false}
      />

      {/* Grid settings */}
      {isGM && showSettings && (
        <VttMapSettings map={activeMap} onUpdate={handleUpdateMap} />
      )}

      {/* Canvas + Encounter Sidebar */}
      <div className="flex gap-3 items-start">
      <div className="flex-1 min-w-0">
      <VttCanvas
        map={activeMap}
        tokens={tokens}
        isGM={isGM}
        user={user}
        groupCharacters={groupCharacters}
        activeGroup={activeGroup}
        onUpdateTokens={handleUpdateTokens}
        onUpdateMap={handleUpdateMap}
        activeTokenId={activeTokenId}
        initiativeStarted={!!activeEncounterTokenId}
        activeTool={activeTool}
        onToolChange={setActiveTool}
        round={encounterRound}
        fogCellCount={activeMap?.fog_cells?.length || 0}
        wallCount={activeMap?.walls?.length || 0}
        onClearFog={() => handleUpdateMap({ fog_cells: [] })}
        onClearWalls={() => handleUpdateMap({ walls: [] })}
        activeEncounter={activeEncounter}
        onAddEncounterParticipant={(data) => addParticipantRef.current?.(data)}
        onToggleEncounterSidebar={isGM ? () => setShowEncounterSidebar((v) => !v) : undefined}
        showEncounterSidebar={showEncounterSidebar}
        encounterActive={activeEncounter?.is_active || false}
        actionsPanel={!isGM && playerCharacter ? (
          <VttActionsPanel
            character={playerCharacter}
            trees={allTrees}
            racialTrees={racialTrees}
            onUpdateCharacter={(data) => updateCharacterMutation.mutate({ id: playerCharacter.id, data })}
          />
        ) : null}
      />
      </div>
      {isGM && (
        <div className="shrink-0">
          <EncounterSidebar
            activeGroup={activeGroup}
            activeMap={activeMap}
            isGM={isGM}
            user={user}
            groupCharacters={groupCharacters}
            vttTokens={tokens}
            isOpen={showEncounterSidebar}
            onToggle={() => setShowEncounterSidebar((v) => !v)}
            onActiveTokenChange={setActiveEncounterTokenId}
            onRoundChange={setEncounterRound}
            onEncounterChange={setActiveEncounter}
            onAddParticipantRef={addParticipantRef}
          />
        </div>
      )}
      </div>

      {showAddToken && (
        <AddTokenModal
          groupCharacters={groupCharacters}
          isGM={isGM}
          user={user}
          activeGroup={activeGroup}
          onAdd={handleAddToken}
          onClose={() => setShowAddToken(false)}
        />
      )}
    </div>
  );
}