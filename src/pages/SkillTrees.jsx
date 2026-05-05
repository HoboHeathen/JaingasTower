import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, TreePine, Pencil, Trash2, GripVertical, RotateCcw, Copy, Users } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useAuth } from '@/lib/AuthContext';
import { useEffectiveTrees } from '@/hooks/useEffectiveTrees';
import { toast } from 'sonner';

export default function SkillTrees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  if (isAdmin) return <AdminSkillTrees />;
  return <UserSkillTrees />;
}

// ─── Admin view ──────────────────────────────────────────────────────────────

function AdminSkillTrees() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [orderedTrees, setOrderedTrees] = useState([]);
  const queryClient = useQueryClient();

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list('sort_order'),
  });

  useEffect(() => {
    if (trees.length) setOrderedTrees(trees);
  }, [trees]);

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.SkillTree.update(id, data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SkillTree.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-trees'] });
      setShowCreate(false);
      setForm({ name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.SkillTree.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['skill-trees'] }),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    createMutation.mutate({ ...form, nodes: [], sort_order: trees.length });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(orderedTrees);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setOrderedTrees(reordered);
    reordered.forEach((tree, idx) => {
      if (tree.sort_order !== idx) updateMutation.mutate({ id: tree.id, data: { sort_order: idx } });
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading text-3xl font-bold text-foreground">Skill Trees</h1>
          <p className="text-muted-foreground mt-1">Default skill trees (admin)</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          New Tree
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div>
      ) : orderedTrees.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No skill trees created yet.</p>
          <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Skill Tree
          </Button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="trees" direction="vertical">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex flex-col gap-0">
                {orderedTrees.map((tree, index) => (
                  <Draggable key={tree.id} draggableId={tree.id} index={index}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} className="py-1">
                        <div className={`bg-card border rounded-xl p-4 transition-all group flex items-center gap-4 ${
                          snapshot.isDragging
                            ? 'border-primary shadow-lg shadow-primary/20 opacity-90 scale-[1.01]'
                            : 'border-border/50 hover:border-primary/30'
                        }`}>
                          <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0">
                            <GripVertical className="w-5 h-5" />
                          </div>
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <TreePine className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-heading font-semibold text-foreground leading-tight">{tree.name}</h3>
                            {tree.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tree.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {(tree.nodes || []).length} skill{(tree.nodes || []).length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Link to={`/edit-tree?id=${tree.id}`}>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <Pencil className="w-3 h-3" />
                                Edit
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive h-8 w-8"
                              onClick={() => setDeletingId(tree.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this skill tree?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the default skill tree and all its skills. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { deleteMutation.mutate(deletingId); setDeletingId(null); }}
            >
              Delete Tree
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-heading">New Skill Tree</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input
              placeholder="Tree name..."
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
            <Textarea
              placeholder="Description (optional)..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.name.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Racial Trees Section */}
      <AdminRacialTrees />
    </div>
  );
}

// ─── Admin Racial Trees section ───────────────────────────────────────────────

function AdminRacialTrees() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ race_name: '', tree_name: '', description: '' });
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: racialTrees = [], isLoading } = useQuery({
    queryKey: ['racial-trees'],
    queryFn: () => base44.entities.RacialTree.list('race_name'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RacialTree.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racial-trees'] });
      setShowCreate(false);
      setForm({ race_name: '', tree_name: '', description: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RacialTree.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['racial-trees'] }),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!form.race_name.trim() || !form.tree_name.trim()) return;
    createMutation.mutate({ ...form, nodes: [] });
  };

  return (
    <div className="mt-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" /> Racial Trees
          </h2>
          <p className="text-muted-foreground text-sm mt-0.5">Racial skill trees (admin)</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="gap-2" variant="outline">
          <Plus className="w-4 h-4" /> New Racial Tree
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><div className="w-6 h-6 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : racialTrees.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm bg-card border border-dashed border-border rounded-xl">
          No racial trees yet. Create one above.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {racialTrees.map((tree) => (
            <div key={tree.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 group hover:border-accent/30 transition-all">
              <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Users className="w-4 h-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-heading font-semibold text-foreground leading-tight">{tree.tree_name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{tree.race_name}{tree.description ? ` · ${tree.description}` : ''}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{(tree.nodes || []).length} node{(tree.nodes || []).length !== 1 ? 's' : ''}{tree.is_standalone_skill ? ' · standalone' : ''}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Link to={`/edit-racial-tree?id=${tree.id}`}>
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <Pencil className="w-3 h-3" /> Edit
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive h-8 w-8"
                  onClick={() => setDeletingId(tree.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this racial tree?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the racial tree and all its nodes. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteMutation.mutate(deletingId); setDeletingId(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">New Racial Tree</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <Input placeholder="Race name (e.g. Elf)..." value={form.race_name} onChange={(e) => setForm({ ...form, race_name: e.target.value })} autoFocus />
            <Input placeholder="Tree name (e.g. Forest Magic)..." value={form.tree_name} onChange={(e) => setForm({ ...form, tree_name: e.target.value })} />
            <Textarea placeholder="Description (optional)..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={!form.race_name.trim() || !form.tree_name.trim()}>Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── User view ────────────────────────────────────────────────────────────────

function UserSkillTrees() {
  const { effectiveTrees, isLoading, resetMutation, ensureUserCopy } = useEffectiveTrees();
  const [resettingId, setResettingId] = useState(null); // source_tree_id pending reset confirmation

  const handleEdit = async (tree) => {
    // Ensure user has a copy before navigating to edit
    const defaultTree = tree._isUserCopy ? tree._defaultTree : tree;
    const copy = await ensureUserCopy(defaultTree);
    window.location.href = `/edit-my-tree?id=${copy.id}`;
  };

  const handleReset = async () => {
    const tree = effectiveTrees.find((t) => (t.source_tree_id || t.id) === resettingId);
    if (!tree || !tree._isUserCopy) { setResettingId(null); return; }
    await resetMutation.mutateAsync({ userTreeId: tree.id, defaultTree: tree._defaultTree });
    toast.success('Tree reset to default');
    setResettingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-heading text-3xl font-bold text-foreground">Skill Trees</h1>
        <p className="text-muted-foreground mt-1">Your personal skill tree customizations</p>
      </div>

      {effectiveTrees.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No skill trees available yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {effectiveTrees.map((tree) => {
            const sourceId = tree.source_tree_id || tree.id;
            return (
              <div key={tree.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-4 group hover:border-primary/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <TreePine className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-semibold text-foreground leading-tight">{tree.name}</h3>
                    {tree._isUserCopy && !tree._isResetToDefault && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground border border-accent/30">
                        customized
                      </span>
                    )}
                  </div>
                  {tree.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{tree.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {(tree.nodes || []).length} skill{(tree.nodes || []).length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {tree._isUserCopy && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => setResettingId(sourceId)}
                      title="Reset to default"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => handleEdit(tree)}
                  >
                    {tree._isUserCopy ? <Pencil className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {tree._isUserCopy ? 'Edit' : 'Customize'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={!!resettingId} onOpenChange={(open) => !open && setResettingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset to default?</AlertDialogTitle>
            <AlertDialogDescription>
              This will discard all your customizations for this tree and restore the default nodes and settings.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleReset}
            >
              Reset to Default
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}