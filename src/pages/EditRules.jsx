import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const ENTRY_TYPES = ['section', 'subsection', 'condition'];

const EMPTY_FORM = {
  title: '',
  content: '',
  category: '',
  entry_type: 'section',
  parent_id: '',
  sort_order: 0,
};

function RuleForm({ initial = EMPTY_FORM, sections = [], onSave, onCancel, isNew }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.category.trim()) {
      toast.error('Title and category are required.');
      return;
    }
    onSave({ ...form, sort_order: Number(form.sort_order) || 0 });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
      <h3 className="font-heading font-semibold text-foreground">{isNew ? 'New Entry' : 'Edit Entry'}</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Title *</label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Attacking, Blinded" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Category *</label>
          <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Combat, Conditions, Movement" />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={form.entry_type} onValueChange={(v) => set('entry_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ENTRY_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Sort Order</label>
          <Input type="number" value={form.sort_order} onChange={(e) => set('sort_order', e.target.value)} placeholder="0" />
        </div>
        {(form.entry_type === 'subsection' || form.entry_type === 'condition') && (
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground">Parent Section</label>
            <Select value={form.parent_id || ''} onValueChange={(v) => set('parent_id', v === 'none' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="None (top-level)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (top-level)</SelectItem>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Content</label>
        <Textarea
          value={form.content}
          onChange={(e) => set('content', e.target.value)}
          placeholder="Write the rule text here..."
          className="min-h-[160px] font-body text-sm leading-relaxed"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">Save</Button>
      </div>
    </form>
  );
}

function EntryRow({ entry, sections, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const parent = sections.find((s) => s.id === entry.parent_id);

  return (
    <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical className="w-4 h-4 text-muted-foreground/40 shrink-0" />
        <button onClick={() => setOpen((v) => !v)} className="flex-1 text-left flex items-center gap-2 min-w-0">
          {open ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm truncate">{entry.title}</p>
            <p className="text-[11px] text-muted-foreground">
              {entry.category} · <span className="capitalize">{entry.entry_type}</span>
              {parent ? ` · under "${parent.title}"` : ''}
              {' · '}order {entry.sort_order ?? 0}
            </p>
          </div>
        </button>
        <div className="flex gap-1 shrink-0">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(entry)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => onDelete(entry.id)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {open && entry.content && (
        <div className="px-10 pb-4 text-xs text-muted-foreground leading-relaxed whitespace-pre-line border-t border-border/30 pt-3">
          {entry.content}
        </div>
      )}
    </div>
  );
}

export default function EditRules() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filterCat, setFilterCat] = useState('');
  const [search, setSearch] = useState('');

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['rule-entries'],
    queryFn: () => base44.entities.RuleEntry.list('sort_order', 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.RuleEntry.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rule-entries'] }); setShowForm(false); toast.success('Entry created!'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RuleEntry.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rule-entries'] }); setEditing(null); toast.success('Entry updated!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RuleEntry.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['rule-entries'] }); toast.success('Entry deleted.'); },
  });

  const topLevelSections = entries.filter((e) => e.entry_type === 'section');
  const categories = [...new Set(entries.map((e) => e.category).filter(Boolean))].sort();

  const filtered = entries.filter((e) => {
    const matchesCat = !filterCat || e.category === filterCat;
    const matchesSearch = !search.trim() || e.title.toLowerCase().includes(search.toLowerCase()) || (e.content || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handleDelete = (id) => {
    if (window.confirm('Delete this entry?')) deleteMutation.mutate(id);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/rules">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="font-heading text-2xl font-bold text-foreground">Edit Rule Book</h1>
            <p className="text-xs text-muted-foreground">{entries.length} entries</p>
          </div>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Entry
        </Button>
      </div>

      {(showForm || editing) && (
        <RuleForm
          isNew={!editing}
          initial={editing || EMPTY_FORM}
          sections={topLevelSections}
          onSave={(data) => {
            if (editing) {
              const { id, ...rest } = data;
              updateMutation.mutate({ id: editing.id, data: rest });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Input
          placeholder="Search entries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-sm flex-1 min-w-[160px]"
        />
        <Select value={filterCat || 'all'} onValueChange={(v) => setFilterCat(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 text-sm w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">No entries yet. Add your first rule above.</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              sections={topLevelSections}
              onEdit={(e) => { setEditing(e); setShowForm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}