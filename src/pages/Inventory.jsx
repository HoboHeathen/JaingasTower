import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowLeft, Package, Hammer, Trash2, Plus, RefreshCw, Sword } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CraftingModal from '@/components/inventory/CraftingModal';
import AddItemModal from '@/components/inventory/AddItemModal';
import WeaponUpgradesPanel from '@/components/inventory/WeaponUpgradesPanel';
import PlayerWeaponsPanel from '@/components/inventory/PlayerWeaponsPanel';

const ITEM_TYPE_COLORS = {
  consumable: 'border-green-500/40 bg-green-500/10 text-green-300',
  crafting_component: 'border-accent/40 bg-accent/10 text-accent-foreground',
  upgrade: 'border-primary/40 bg-primary/10 text-primary',
  gold: 'border-yellow-500/40 bg-yellow-500/10 text-yellow-300',
  skill_points: 'border-chart-2/40 bg-chart-2/10 text-foreground',
  special: 'border-chart-5/40 bg-chart-5/10 text-foreground'
};

const TABS = ['Consumables', 'Components', 'Upgrades', 'Weapons'];

export default function Inventory() {
  const urlParams = new URLSearchParams(window.location.search);
  const characterId = urlParams.get('id');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('Consumables');
  const [showCrafting, setShowCrafting] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);

  const { data: character } = useQuery({
    queryKey: ['character', characterId],
    queryFn: () => base44.entities.Character.filter({ id: characterId }),
    select: (d) => d[0],
    enabled: !!characterId
  });

  const { data: inventory = [], isLoading } = useQuery({
    queryKey: ['inventory', characterId],
    queryFn: () => base44.entities.CharacterInventory.filter({ character_id: characterId }),
    enabled: !!characterId
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CharacterInventory.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', characterId] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CharacterInventory.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory', characterId] })
  });

  const handleUseConsumable = (entry) => {
    if (entry.quantity <= 1) {
      deleteMutation.mutate(entry.id);
    } else {
      updateMutation.mutate({ id: entry.id, data: { quantity: entry.quantity - 1 } });
    }
    toast.success(`Used ${entry.item_name}!`);
  };

  const handleResetCharges = (entry) => {
    updateMutation.mutate({ id: entry.id, data: { current_charges: entry.max_charges } });
    toast.success(`Charges reset for ${entry.item_name}`);
  };

  const handleUseCharge = (entry) => {
    if (entry.current_charges <= 0) {toast.error('No charges remaining!');return;}
    updateMutation.mutate({ id: entry.id, data: { current_charges: entry.current_charges - 1 } });
  };

  const consumables = inventory.filter((i) => i.item_type === 'consumable');
  const components = inventory.filter((i) => i.item_type === 'crafting_component');
  const upgrades = inventory.filter((i) => i.item_type === 'upgrade');

  const tabItems = { Consumables: consumables, Components: components, Upgrades: upgrades };

  if (!characterId) return <div className="text-center py-20 text-muted-foreground">No character selected.</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/character?id=${characterId}`}>
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-foreground">
            {character?.name} — Inventory
          </h1>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowAddItem(true)}>
          <Plus className="w-4 h-4" /> Add Item
        </Button>
        <Button size="sm" className="gap-2" onClick={() => setShowCrafting(true)}>
          <Hammer className="w-4 h-4" /> Craft
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        {/* Mobile dropdown */}
        <div className="sm:hidden">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            
            {TABS.map((tab) =>
            <option key={tab} value={tab}>{tab}</option>
            )}
          </select>
        </div>
        {/* Desktop pills */}
        <div className="hidden sm:flex gap-1 bg-secondary/30 p-1 rounded-lg">
          {TABS.map((tab) =>
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
            activeTab === tab ?
            'bg-card text-foreground shadow-sm' :
            'text-muted-foreground hover:text-foreground'}`
            }>
            
              {tab}
              {tab !== 'Weapons' && tabItems[tab] &&
            <span className="ml-1.5 text-xs opacity-60">
                  ({tab === 'Components' ? tabItems[tab].reduce((a, i) => a + (i.quantity || 1), 0) : tabItems[tab].length})
                </span>
            }
            </button>
          )}
        </div>
      </div>

      {isLoading ?
      <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
        </div> :
      activeTab === 'Weapons' ?
      <div className="space-y-6">
          <PlayerWeaponsPanel characterId={characterId} />
          <div className="border-t border-border/30 pt-4 hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Weapon Upgrades</p>
            <WeaponUpgradesPanel characterId={characterId} upgrades={upgrades} onUseCharge={handleUseCharge} onResetCharges={handleResetCharges} />
          </div>
        </div> :

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(tabItems[activeTab] || []).length === 0 ?
        <div className="col-span-full text-center py-16 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>No {activeTab.toLowerCase()} in inventory.</p>
            </div> :

        (tabItems[activeTab] || []).map((entry) =>
        <InventoryCard
          key={entry.id}
          entry={entry}
          onUse={handleUseConsumable}
          onUseCharge={handleUseCharge}
          onResetCharges={handleResetCharges}
          onDelete={() => deleteMutation.mutate(entry.id)} />

        )
        }
        </div>
      }

      {showCrafting &&
      <CraftingModal
        characterId={characterId}
        inventory={inventory}
        onClose={() => setShowCrafting(false)}
        onCrafted={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory', characterId] });
          setShowCrafting(false);
        }} />

      }

      {showAddItem &&
      <AddItemModal
        characterId={characterId}
        onClose={() => setShowAddItem(false)}
        onAdded={() => {
          queryClient.invalidateQueries({ queryKey: ['inventory', characterId] });
          setShowAddItem(false);
        }} />

      }
    </div>);

}

function InventoryCard({ entry, onUse, onUseCharge, onResetCharges, onDelete }) {
  const colorClass = ITEM_TYPE_COLORS[entry.item_type] || ITEM_TYPE_COLORS.consumable;

  return (
    <div className={`relative border rounded-xl p-4 bg-card transition-all ${colorClass}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-heading font-semibold text-sm text-foreground leading-tight">{entry.item_name}</h3>
          {entry.item_type === 'crafting_component' &&
          <Badge variant="outline" className="text-[10px] mt-1 capitalize">{entry.component_category || 'component'}</Badge>
          }
          {entry.item_type === 'upgrade' &&
          <Badge variant="outline" className="text-[10px] mt-1">Upgrade {['I', 'II', 'III'][entry.upgrade_tier - 1] || 'I'}</Badge>
          }
        </div>
        {entry.quantity > 1 &&
        <span className="text-xs font-bold text-muted-foreground bg-secondary/60 rounded-full px-2 py-0.5">×{entry.quantity}</span>
        }
      </div>

      {entry.crafted_description &&
      <p className="text-xs text-muted-foreground mb-3 leading-relaxed">{entry.crafted_description}</p>
      }

      {/* Charge pips for upgrades */}
      {entry.item_type === 'upgrade' && entry.max_charges > 0 &&
      <div className="flex items-center gap-1.5 mb-3">
          <span className="text-xs text-muted-foreground">Charges:</span>
          {Array.from({ length: entry.max_charges }).map((_, i) =>
        <div key={i} className={`w-3 h-3 rounded-full border ${i < entry.current_charges ? 'bg-primary border-primary' : 'border-border bg-secondary/30'}`} />
        )}
        </div>
      }

      <div className="flex items-center gap-2 mt-auto">
        {entry.item_type === 'consumable' &&
        <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => onUse(entry)}>Use</Button>
        }
        {entry.item_type === 'upgrade' &&
        <>
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => onUseCharge(entry)}>
              Use Charge
            </Button>
            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => onResetCharges(entry)} title="Reset charges">
              <RefreshCw className="w-3 h-3" />
            </Button>
          </>
        }
        <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive" onClick={onDelete}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>);

}