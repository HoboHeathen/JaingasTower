import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, TreePine, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
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

const categoryLabels = {
  primary: 'Primary',
  secondary: 'Secondary',
  tertiary: 'Tertiary',
};

const categoryBadge = {
  primary: 'bg-primary/20 text-primary border-primary/30',
  secondary: 'bg-accent/20 text-accent border-accent/30',
  tertiary: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
};

export default function SkillTrees() {
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: 'primary' });
  const [deletingId, setDeletingId] = useState(null);
  const queryClient = useQueryClient();

  const { data: trees = [], isLoading } = useQuery({
    queryKey: ['skill-trees'],
    queryFn: () => base44.entities.SkillTree.list('-created_date'),
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
    createMutation.mutate({ ...form, nodes: [] });
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
      ) : trees.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground mb-4">No skill trees created yet.</p>
          <Button onClick={() => setShowCreate(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" />
            Create Skill Tree
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trees.map((tree) => (
            <div
              key={tree.id}
              className="bg-card border border-border/50 rounded-xl p-5 hover:border-primary/30 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <TreePine className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-foreground">{tree.name}</h3>
                    <Badge variant="outline" className={`text-xs mt-1 ${categoryBadge[tree.category]}`}>
                      {categoryLabels[tree.category]}
                    </Badge>
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
          ))}
        </div>
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
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Primary Actions</SelectItem>
                <SelectItem value="secondary">Secondary Actions</SelectItem>
                <SelectItem value="tertiary">Tertiary Actions</SelectItem>
              </SelectContent>
            </Select>
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