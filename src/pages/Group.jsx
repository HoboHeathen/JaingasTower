import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Users, Plus, Copy, Check, Send, MessageCircle, Dices,
  Shield, Heart, Swords, BookOpen, ChevronRight, Settings, Crown
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TABS = [
  { key: 'party', label: 'Party', icon: Users },
  { key: 'rolls', label: 'Rolls', icon: Dices },
  { key: 'chat', label: 'Chat', icon: MessageCircle },
  { key: 'bestiary', label: 'Bestiary', icon: BookOpen },
];

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const CONDITIONS = ['Blinded', 'Charmed', 'Dazed', 'Frightened', 'Grappled', 'Poisoned', 'Prone', 'Restrained', 'Slowed', 'Stunned'];

export default function Group() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('party');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', description: '' });
  const [joinCode, setJoinCode] = useState('');
  const [joinCharacterId, setJoinCharacterId] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [beastForm, setBeastForm] = useState({ monster_name: '', description: '', hp: '', armor: '', special_abilities: '' });
  const [showAddBeast, setShowAddBeast] = useState(false);
  const chatEndRef = useRef(null);

  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-groups', user?.email],
    queryFn: () => base44.entities.Group.filter({ gm_email: user.email }),
    enabled: !!user?.email,
  });

  // Characters belonging to user (for joining a group)
  const { data: myCharacters = [] } = useQuery({
    queryKey: ['characters', user?.email],
    queryFn: () => base44.entities.Character.filter({ created_by: user.email }),
    enabled: !!user?.email,
  });

  // Active group = first group user is GM of, OR character's group
  const myCharactersInGroup = myCharacters.filter((c) => c.group_id);
  const activeGroupId = myGroups[0]?.id || myCharactersInGroup[0]?.group_id || null;

  const { data: activeGroup } = useQuery({
    queryKey: ['group', activeGroupId],
    queryFn: () => base44.entities.Group.filter({ id: activeGroupId }),
    select: (d) => d[0],
    enabled: !!activeGroupId,
  });

  const { data: groupCharacters = [] } = useQuery({
    queryKey: ['group-characters', activeGroupId],
    queryFn: () => base44.entities.Character.filter({ group_id: activeGroupId }),
    enabled: !!activeGroupId,
    refetchInterval: 10000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['group-messages', activeGroupId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_id: activeGroupId }),
    enabled: !!activeGroupId && tab === 'chat',
    refetchInterval: 5000,
  });

  const { data: rollMessages = [] } = useQuery({
    queryKey: ['group-rolls', activeGroupId],
    queryFn: () => base44.entities.GroupMessage.filter({ group_id: activeGroupId }),
    select: (d) => d.filter((m) => m.message_type === 'roll'),
    enabled: !!activeGroupId && tab === 'rolls',
    refetchInterval: 5000,
  });

  const { data: bestiary = [] } = useQuery({
    queryKey: ['group-bestiary', activeGroupId],
    queryFn: () => base44.entities.GroupBestiary.filter({ group_id: activeGroupId }),
    enabled: !!activeGroupId && tab === 'bestiary',
  });

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createGroupMutation = useMutation({
    mutationFn: (data) => base44.entities.Group.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-groups'] });
      setShowCreateGroup(false);
      setGroupForm({ name: '', description: '' });
      toast.success('Group created!');
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async ({ code, characterId }) => {
      const groups = await base44.entities.Group.filter({ invite_code: code.toUpperCase() });
      if (!groups.length) throw new Error('Invalid invite code');
      const group = groups[0];
      return base44.entities.Character.update(characterId, { group_id: group.id, group_name: group.name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters'] });
      setShowJoinGroup(false);
      setJoinCode('');
      setJoinCharacterId('');
      toast.success('Character joined the group!');
    },
    onError: (e) => toast.error(e.message),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.GroupMessage.create({
        group_id: activeGroupId,
        sender_email: user.email,
        sender_name: user.full_name || user.email,
        content,
        message_type: 'chat',
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['group-messages'] }),
  });

  const addBeastMutation = useMutation({
    mutationFn: (data) => base44.entities.GroupBestiary.create({ ...data, group_id: activeGroupId, added_by_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-bestiary'] });
      setShowAddBeast(false);
      setBeastForm({ monster_name: '', description: '', hp: '', armor: '', special_abilities: '' });
      toast.success('Monster added to bestiary!');
    },
  });

  const handleCreateGroup = (e) => {
    e.preventDefault();
    if (!groupForm.name.trim()) return;
    createGroupMutation.mutate({ ...groupForm, gm_email: user.email, invite_code: generateCode() });
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinCharacterId) return;
    joinGroupMutation.mutate({ code: joinCode, characterId: joinCharacterId });
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    sendMessageMutation.mutate(chatInput.trim());
    setChatInput('');
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(activeGroup?.invite_code || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isGM = activeGroup?.gm_email === user?.email;

  // No group
  if (!activeGroupId && !myGroups.length) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-2xl font-bold text-foreground mb-2">No Group Yet</h1>
        <p className="text-muted-foreground mb-6">Create a group as a GM or join one with an invite code.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Create Group (GM)
          </Button>
          <Button variant="outline" onClick={() => setShowJoinGroup(true)} className="gap-2">
            <ChevronRight className="w-4 h-4" /> Join with Code
          </Button>
        </div>

        {/* Create Group Dialog */}
        <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Create New Group</DialogTitle></DialogHeader>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <Input placeholder="Group name..." value={groupForm.name} onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })} autoFocus />
              <Textarea placeholder="Description (optional)..." value={groupForm.description} onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowCreateGroup(false)}>Cancel</Button>
                <Button type="submit" disabled={!groupForm.name.trim()}>Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Join Group Dialog */}
        <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">Join Group</DialogTitle></DialogHeader>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Invite Code</label>
                <Input placeholder="e.g. AB3XY7" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="text-sm text-muted-foreground block mb-1">Select Character to Join With</label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={joinCharacterId}
                  onChange={(e) => setJoinCharacterId(e.target.value)}
                >
                  <option value="">— Select character —</option>
                  {myCharacters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowJoinGroup(false)}>Cancel</Button>
                <Button type="submit" disabled={!joinCode.trim() || !joinCharacterId}>Join</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div>
      {/* Group Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-heading text-2xl font-bold text-foreground">{activeGroup?.name || 'My Group'}</h1>
            {isGM && <Badge className="bg-primary/10 text-primary border-primary/30 text-xs gap-1"><Crown className="w-3 h-3" />GM</Badge>}
          </div>
          {activeGroup?.description && <p className="text-sm text-muted-foreground mt-0.5">{activeGroup.description}</p>}
          {activeGroup?.invite_code && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">Invite Code:</span>
              <code className="text-xs bg-secondary/60 px-2 py-0.5 rounded font-mono text-primary">{activeGroup.invite_code}</code>
              <button onClick={handleCopyCode} className="text-muted-foreground hover:text-primary transition-colors">
                {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowJoinGroup(true)}>
          <Plus className="w-3 h-3" /> Add Character
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-secondary/30 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all',
              tab === key ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Party Tab */}
      {tab === 'party' && (
        <div className="space-y-3">
          {groupCharacters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No characters in this group yet.</div>
          ) : (
            groupCharacters.map((char) => {
              const maxHp = (char.base_health || 10);
              const currentHp = char.current_hp ?? maxHp;
              const hpPct = Math.max(0, Math.min(100, (currentHp / maxHp) * 100));
              return (
                <div key={char.id} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-semibold text-foreground">{char.name}</h3>
                        {char.created_by === activeGroup?.gm_email && (
                          <Badge variant="outline" className="text-[10px] text-primary border-primary/30">GM</Badge>
                        )}
                      </div>
                      {char.race_selections?.length > 0 && (
                        <p className="text-xs italic text-muted-foreground">
                          {char.race_selections.map((r) => r.race_name).filter(Boolean).join(' / ')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1.5 text-red-400">
                        <Heart className="w-4 h-4" />
                        <span className="font-semibold">{currentHp}/{maxHp}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-400">
                        <Shield className="w-4 h-4" />
                        <span className="font-semibold">{char.base_armor || 10}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-green-400">
                        <Swords className="w-4 h-4" />
                        <span className="font-semibold">{char.base_speed || 30}ft</span>
                      </div>
                    </div>
                  </div>
                  {/* HP bar */}
                  <div className="mt-3 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all', hpPct > 50 ? 'bg-green-500' : hpPct > 25 ? 'bg-yellow-500' : 'bg-red-500')}
                      style={{ width: `${hpPct}%` }}
                    />
                  </div>
                  {/* Conditions */}
                  {char.conditions?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {char.conditions.map((c) => (
                        <Badge key={c} variant="outline" className="text-[10px] text-destructive border-destructive/30">{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Rolls Tab */}
      {tab === 'rolls' && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Rolls shared by group members appear here.</p>
          {rollMessages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No shared rolls yet.</div>
          ) : (
            <div className="space-y-2">
              {rollMessages.map((msg) => (
                <div key={msg.id} className="bg-card border border-border/50 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm text-foreground">{msg.sender_name}</span>
                    <span className="text-xs text-muted-foreground">{new Date(msg.created_date).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-sm text-primary font-semibold mt-1">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chat Tab */}
      {tab === 'chat' && (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 22rem)' }}>
          <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
            {messages.filter((m) => m.message_type === 'chat').length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">No messages yet. Say hello!</div>
            ) : (
              messages.filter((m) => m.message_type === 'chat').map((msg) => {
                const isMe = msg.sender_email === user?.email;
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-xs rounded-xl px-4 py-2.5', isMe ? 'bg-primary/20 text-primary' : 'bg-card border border-border/50 text-foreground')}>
                      {!isMe && <p className="text-[10px] text-muted-foreground mb-0.5">{msg.sender_name}</p>}
                      <p className="text-sm">{msg.content}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={!chatInput.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Bestiary Tab */}
      {tab === 'bestiary' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Monsters encountered and shared by the GM.</p>
            {isGM && (
              <Button size="sm" className="gap-1.5" onClick={() => setShowAddBeast(true)}>
                <Plus className="w-3 h-3" /> Add Monster
              </Button>
            )}
          </div>
          {bestiary.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No monsters recorded yet.</div>
          ) : (
            <div className="space-y-3">
              {bestiary.map((m) => (
                <div key={m.id} className="bg-card border border-border/50 rounded-xl p-4">
                  <h3 className="font-heading font-semibold text-foreground mb-1">{m.monster_name}</h3>
                  {m.description && <p className="text-xs text-muted-foreground mb-2">{m.description}</p>}
                  <div className="flex flex-wrap gap-3 text-sm">
                    {m.hp && <span className="flex items-center gap-1 text-red-400"><Heart className="w-3.5 h-3.5" />{m.hp}</span>}
                    {m.armor && <span className="flex items-center gap-1 text-blue-400"><Shield className="w-3.5 h-3.5" />{m.armor}</span>}
                    {['str', 'dex', 'con', 'int', 'wis', 'cha'].filter((s) => m[s]).map((s) => (
                      <span key={s} className="text-muted-foreground text-xs">{s.toUpperCase()}: {m[s]}</span>
                    ))}
                  </div>
                  {m.special_abilities && (
                    <p className="text-xs text-accent-foreground mt-2 bg-accent/10 rounded-lg px-3 py-2">{m.special_abilities}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Join Dialog */}
      <Dialog open={showJoinGroup} onOpenChange={setShowJoinGroup}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Add Character to Group</DialogTitle></DialogHeader>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Invite Code</label>
              <Input placeholder="e.g. AB3XY7" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-sm text-muted-foreground block mb-1">Select Character</label>
              <select className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" value={joinCharacterId} onChange={(e) => setJoinCharacterId(e.target.value)}>
                <option value="">— Select character —</option>
                {myCharacters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowJoinGroup(false)}>Cancel</Button>
              <Button type="submit" disabled={!joinCode.trim() || !joinCharacterId}>Join</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Beast Dialog */}
      <Dialog open={showAddBeast} onOpenChange={setShowAddBeast}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-heading">Add Monster to Bestiary</DialogTitle></DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); addBeastMutation.mutate({ ...beastForm, hp: Number(beastForm.hp) || undefined, armor: Number(beastForm.armor) || undefined }); }} className="space-y-3">
            <Input placeholder="Monster name *" value={beastForm.monster_name} onChange={(e) => setBeastForm({ ...beastForm, monster_name: e.target.value })} autoFocus />
            <Textarea placeholder="Description..." value={beastForm.description} onChange={(e) => setBeastForm({ ...beastForm, description: e.target.value })} rows={2} />
            <div className="grid grid-cols-2 gap-2">
              <Input type="number" placeholder="HP" value={beastForm.hp} onChange={(e) => setBeastForm({ ...beastForm, hp: e.target.value })} />
              <Input type="number" placeholder="Armor" value={beastForm.armor} onChange={(e) => setBeastForm({ ...beastForm, armor: e.target.value })} />
            </div>
            <Textarea placeholder="Special abilities..." value={beastForm.special_abilities} onChange={(e) => setBeastForm({ ...beastForm, special_abilities: e.target.value })} rows={2} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddBeast(false)}>Cancel</Button>
              <Button type="submit" disabled={!beastForm.monster_name.trim()}>Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}