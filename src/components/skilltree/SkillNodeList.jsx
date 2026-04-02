import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Plus, Search, GitBranch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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

export default function SkillNodeList({ nodes, onEdit, onDelete, onAdd }) {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const filtered = nodes.filter((n) =>
    n.name.toLowerCase().includes(search.toLowerCase()) ||
    (n.description || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group by tier
  const byTier = {};
  filtered.forEach((n) => {
    const t = n.tier ?? 0;
    if (!byTier[t]) byTier[t] = [];
    byTier[t].push(n);
  });
  const tierKeys = Object.keys(byTier).sort((a, b) => Number(a) - Number(b));

  const nodeToDelete = nodes.find((n) => n.id === deletingId);

  return (
    <div className="bg-card border border-border/50 rounded-xl flex flex-col h-full min-h-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-heading font-semibold text-foreground">
            All Skills
            <span className="ml-2 text-sm font-normal text-muted-foreground">({nodes.length})</span>
          </h2>
          <Button size="sm" onClick={onAdd} className="gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            Add
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
          />
        </div>
      </div>

      {/* Node list grouped by tier */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground">
              {search ? 'No skills match your search.' : 'No skills yet.'}
            </p>
          </div>
        ) : (
          <div className="p-3 space-y-4">
            {tierKeys.map((tierKey) => (
              <div key={tierKey}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 mb-2">
                  {tierKey === '0' ? 'Root Skills' : `Tier ${tierKey}`}
                </p>
                <div className="space-y-1.5">
                  {byTier[tierKey].map((node) => (
                    <div
                      key={node.id}
                      className="group flex items-center justify-between bg-secondary/30 hover:bg-secondary/60 border border-border/30 rounded-lg px-3 py-2.5 transition-all"
                    >
                      <div className="flex-1 min-w-0 mr-2">
                      <p className="text-sm font-medium text-foreground truncate">{node.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{node.cost} pt{node.cost !== 1 ? 's' : ''}</span>
                          {node.category && (
                            <span className={`text-xs font-medium ${
                              node.category === 'primary' ? 'text-primary' :
                              node.category === 'secondary' ? 'text-accent' : 'text-chart-3'
                            }`}>
                              {node.category}
                            </span>
                          )}
                          {node.attack_sub_category && (
                            <span className={`text-xs font-medium ${
                              node.attack_sub_category === 'heavy' ? 'text-red-400' :
                              node.attack_sub_category === 'medium' ? 'text-orange-400' : 'text-yellow-400'
                            }`}>
                              {node.attack_sub_category}
                            </span>
                          )}
                          {(node.prerequisites || []).length > 0 && (
                            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                              <GitBranch className="w-3 h-3" />
                              {node.prerequisites.length} req
                            </span>
                          )}
                      </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => onEdit(node)}
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => setDeletingId(node.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{nodeToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This skill will be permanently removed. Any skills that require it as a prerequisite will have that dependency removed automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                onDelete(deletingId);
                setDeletingId(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}