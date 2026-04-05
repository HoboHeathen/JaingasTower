import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TreePine, Pencil, Trash2, GripVertical } from 'lucide-react';
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


export default function SkillTrees() {
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
      setForm({ name: '', description: '', category: 'primary' });
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
          <p className="text-muted-foreground mt-1">Define your game's skill progression</p>
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
          <Droppable droppableId="trees" direction="horizontal">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {orderedTrees.map((tree, index) => (
                  <Draggable key={tree.id} draggableId={tree.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`bg-card border rounded-xl p-5 transition-all group ${snapshot.isDragging ? 'border-primary/60 shadow-lg shadow-primary/10 rotate-1' : 'border-border/50 hover:border-primary/30'}`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                              title="Drag to reorder"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                              <TreePine className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <h3 className="font-heading font-semibold text-foreground">{tree.name}</h3>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                            onClick={() => setDeletingId(tree.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        {tree.description && (
                          <p className="text-sm text-muted-foreground mb-3">{tree.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mb-3">
                          {(tree.nodes || []).length} skill{(tree.nodes || []).length !== 1 ? 's' : ''}
                        </p>
                        <Link to={`/edit-tree?id=${tree.id}`}>
                          <Button variant="outline" size="sm" className="w-full gap-2">
                            <Pencil className="w-3 h-3" />
                            Edit Skills
                          </Button>
                        </Link>
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
              This will permanently delete the skill tree and all its skills. This cannot be undone.
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
    </div>
  );
}