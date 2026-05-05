import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Search, ChevronRight, BookOpen, Pencil } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

// ── Static fallback rules (existing hardcoded content) ────────────────────────
const STATIC_SECTIONS = [
  {
    id: 'using-actions',
    title: 'Using Actions',
    category: 'Combat',
    content: `On your turn, you can typically use a primary, secondary, and tertiary action. These actions must be used in order.

You can use any of these actions to move or perform a general action. General actions include opening an unlocked door, picking something up, drawing a new weapon, or using an item. If a skill specifies differently, use the wording on the skill.

Skills will specify which ability they use, but generally a main weapon skill will progress so that it can be used by different actions. Augment skills, however, will generally only use primary actions.

Reactionary actions can be used only by skills that use them or to make a reactionary attack of opportunity. They cannot be used to perform general actions.`,
  },
  {
    id: 'attacking',
    title: 'Attacking',
    category: 'Combat',
    content: `If a skill allows you to make an attack as an action, before dealing damage or causing any effect, you must make an attack roll against the target creature. Roll a d20 and add the relevant skill modifier for the kind of weapon or skill you are using. If the total meets or beats the target's Defense, it counts as a hit.

Area of Effect skills are made against all targets in the area as a whole. One attack roll compared against the defense score of each creature inside individually. If your attack roll does not meet or beat their defense, they take no damage. This is themed as them evading the damage or shrugging it off.`,
  },
  {
    id: 'attacking-range',
    title: 'Attacking Range',
    category: 'Combat',
    content: `If an attack lists Melee as its range, it is the adjacent hex or grid square. This generally means 5 feet. If the attack is melee, but has a longer range, it will specify.

If an attack lists Ranged as its range, it will also list a distance. This is a hard distance measurement, meaning attacking something beyond that range is not accurate or powerful enough to deal meaningful damage. Disadvantage may be imposed on the attack if there are too many obstacles in the way (such as allies or rocks that don't provide full cover).`,
  },
  {
    id: 'dealing-damage',
    title: 'Dealing Damage',
    category: 'Combat',
    content: `After hitting a target, and if your chosen skill allows, you can deal damage. Damage comes in three categories: Light, Medium, and Heavy.

Light Attacks deal Light Damage, Medium Attacks deal Medium Damage, and Heavy Attacks deal Heavy Damage.

You do not add your ability modifier to your damage. Damage is determined solely by the dice. The different damage categories deal different numbers of dice.

Light damage is 1 die of damage. Medium damage is 2 dice of damage. Heavy damage is 3 dice of damage.

If damage is ever halved, the total is rolled and that number is halved. You do not halve the number of dice before rolling.`,
  },
  {
    id: 'area-of-effect',
    title: 'Area of Effect',
    category: 'Combat',
    content: `Area of effect (AOE) spells and abilities attack all targets within the designated area with one attack. That means you roll your attack once and compare the result to the defenses of all creatures within that area.

If hit, the spell or ability works as described in the attack or skill.

If this does not beat their defense, and it is a damaging AOE spell or skill, it still deals half damage unless otherwise specified.`,
  },
  {
    id: 'advantage-disadvantage',
    title: 'Advantage / Disadvantage',
    category: 'Combat',
    content: `When making a skill check or attack roll with advantage, roll two d20s and use the higher result. When making a skill check or attack roll with disadvantage, roll two d20s and use the lower result.`,
  },
  {
    id: 'critical-hits',
    title: 'Critical Hits',
    category: 'Combat',
    content: `A roll of a 20 on the d20 for any attack is considered a critical hit. You deal double the damage dice, plus any modifiers. Doubling the dice also applies to any added augments or other damaging dice to be rolled.

For example, a player uses the Weak Spot III skill as a primary action and scores a critical hit against their target. They would have normally dealt heavy damage plus extra heavy damage from Weak Spot III, totaling at 6d4. But now, since it is a critical hit, it deals 12d6 instead.`,
  },
  {
    id: 'skills',
    title: 'Skills',
    category: 'Skills',
    content: `You can only ever use one skill per action.

Most skill trees have a main skill progression and two smaller Skill Augment trees. For example, Daggers have Dagger I-IX as the main skills, and Weak Spot and Hamstring as the two smaller trees.

Each Augment allows the standard attack to do something it normally wouldn't be able to do.

Only one Augment can be used in a single turn.`,
  },
  {
    id: 'ability-checks',
    title: 'Ability Checks',
    category: 'General',
    content: `Many actions not detailed as a skill from a skill tree are termed Ability Checks. These range from the simple to the specific. For example, opening a jammed door, solving a cypher, jumping a gap, catching the edge before you fall, or navigating a trap.

When you are asked to make an Ability Check, you roll a d20 and add the relevant skill, usually determined by your GM. The GM typically determines a difficulty threshold which needs to be met or exceeded. If your roll meets or beats the GM's difficulty threshold, it usually succeeds, though the scale and scope of that success is up to the GM.

A critical success (a roll of a 20 on the d20) does not automatically succeed, though the GM is encouraged to take a critical roll into account when determining the outcome of the ability check.`,
  },
  {
    id: 'contests',
    title: 'Contests',
    category: 'General',
    content: `Sometimes you are asked to make a contest roll. This is when you are seeking to accomplish something in direct opposition to someone else. For example, trying to hold a door closed against an invader, arm wrestling, grappling, or deceiving someone.

In the case of a contest, the GM determines which ability scores each party should use if not already stated by the skill.

There can be only one winner of the contest.

A critical roll is typically considered a success despite the opposing roll, but it is up to GM discretion.`,
  },
  {
    id: 'being-attacked',
    title: 'Being Attacked',
    category: 'Combat',
    content: `When you are the target of an attack, the opponent typically rolls a d20 and adds their ability modifier in hopes of meeting or beating your Defense score.

You can raise your defense score by investing skill points into the armor tree or gaining a benefit from any other skill that raises your defense. These effects can stack.

Some skills also give the ability to attempt a contest roll, usually with Constitution or Dexterity. You make this roll against the incoming attack roll. In this case, their attack roll is the one taking the action, therefore they have the tie winning advantage. If their attack roll meets or beats your contest roll, you are hit by the attack regardless of your defense. It is an either or situation once you choose to use that skill.

AOE attacks which target you can also be evaded by the use of the contest roll skill mentioned above.

Typically, these AOE attacks are made to the group as a whole. One attack roll compared against all defense scores or contest rolls individually.`,
  },
  {
    id: 'taking-damage',
    title: 'Taking Damage',
    category: 'Combat',
    content: `When you are hit by an attack and damage is dealt you, subtract the total from your hp unless you have an ability or skill that lets you reduce that damage. If you have two or more skills that can be applied (remember, you only have one reactionary action), you decide in which order to apply them.`,
  },
  {
    id: 'attacks-of-opportunity',
    title: 'Attacks of Opportunity',
    category: 'Combat',
    content: `Sometimes you can use a reactionary action to make a light attack against a creature that moves away from you. Or you might be the target of such an attack. The rules are as follows.

You can make a single melee light attack as a reactionary action against a creature that moves out of melee range and who has not dealt damage to you during its turn.

An enemy creature can make a single melee light attack of opportunity against you as a reactionary action if you move out of melee range and have not dealt damage to them this turn.

An attack of opportunity is made like any other standard light attack and cannot be augmented with other skills.

Taking the Move action as a Primary action automatically exempts you from Attacks of Opportunity.`,
  },
  {
    id: 'combat-vs-out-of-combat',
    title: 'Combat vs Out of Combat Actions',
    category: 'General',
    content: `There is not usually a lot of distinction between combat actions and out of combat actions, but there are some actions that are too intensive or complex to be completed during a single combat action.

For example, checking for traps on a door is an Out of Combat action because it typically requires a longer time than a single combat action. Unlocking a door, writing a note, solving a puzzle, crafting anything, or putting on armor are some other examples.

It is up to the GM how these are handled, but some possible rules are as follows:

Out of Combat actions can only be completed out of combat.

Or: Actions that are too intensive for a single combat action take all three combat actions to complete.`,
  },
  {
    id: 'general-combat-actions',
    title: 'General Combat Actions',
    category: 'Combat',
    subsections: [
      { title: 'Move', content: `As any action, you can take the move action. You move up to your speed.` },
      { title: 'Hide', content: `As any action, you can take the hide action. If you are completely obscured, in total darkness, or behind total cover, you can attempt to hide and gain the hidden condition. This fails if you come into view. It is up to the GM if you lose the hidden condition if you are spotted by an ally of the creature you are hiding from.\n\nWhile hiding, you gain advantage on attacks made against creatures who have not noticed you.\n\nYou also cannot hide if you were the target of an attack during the last round and the creature who made the attack is still conscious. You cannot hide near the same spot where you last attacked from.\n\nIf you have complied with all the rules above, you typically do not have to make an ability check to hide, but if you are being searched for, you will have to make a dexterity contest against their wisdom ability check to find you.` },
      { title: 'Shove', content: `As any action, you can take the shove action. Make a Strength contest against their strength. If you succeed, they are moved 5 feet away from you in a straight line.` },
      { title: 'Grapple', content: `As any action, you can take the grapple action. Make a strength contest against their strength or dexterity. If you succeed, they receive the grappled condition.\n\nTheir speed is 0. They have disadvantage on attack rolls against creatures that are not you. You have advantage on melee attacks against them as long as you remain adjacent to them.\n\nYou can release the grappled creature as a free action. If you move, you drag the creature with you at half your speed (rounded down). They can escape the grapple by using an action and succeeding on a strength or dexterity contest against your strength.` },
    ],
  },
  {
    id: 'conditions',
    title: 'Conditions',
    category: 'Conditions',
    subsections: [
      { title: 'Blinded', content: `A blinded creature cannot see and automatically fails any ability check that requires sight. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.` },
      { title: 'Charmed', content: `A charmed creature cannot attack the charmer or target the charmer with harmful abilities or magical effects. The charmer has advantage on any ability check to interact socially with the creature.` },
      { title: 'Dazed', content: `A dazed creature can only take one action per turn instead of three.` },
      { title: 'Deafened', content: `A deafened creature cannot hear and automatically fails any ability check that requires hearing.` },
      { title: 'Frightened', content: `A frightened creature has disadvantage on ability checks and attack rolls while the source of its fear is within line of sight. The creature can't willingly move closer to the source of its fear.` },
      { title: 'Grappled', content: `A grappled creature's speed becomes 0 and it can't benefit from any bonus to its speed. The condition ends if the grappler is incapacitated, or if an effect removes the grappled creature from the reach of the grappler.` },
      { title: 'Incapacitated', content: `An incapacitated creature can't take actions or reactions.` },
      { title: 'Invisible', content: `An invisible creature is impossible to see without the aid of magic or a special sense. The creature's location can be detected by any noise it makes or tracks it leaves. Attack rolls against the creature have disadvantage, and the creature's attack rolls have advantage.` },
      { title: 'Knocked Out', content: `A knocked out creature is unconscious, can't move, and can't speak. The creature drops whatever it's holding and falls prone. Attack rolls against the creature have advantage. Any attack that hits the creature is a critical hit if the attacker is within 5 feet.` },
      { title: 'Poisoned', content: `A poisoned creature has disadvantage on attack rolls and ability checks.` },
      { title: 'Prone', content: `A prone creature's only movement option is to crawl or stand up. The creature has disadvantage on attack rolls. An attack roll against the creature has advantage if the attacker is within 5 feet of the creature. Otherwise, the attack roll has disadvantage.` },
      { title: 'Restrained', content: `A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed. Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.` },
      { title: 'Slowed', content: `A slowed creature's speed is halved and it cannot take tertiary actions.` },
      { title: 'Stunned', content: `A stunned creature is incapacitated, can't move, and can speak only falteringly. Attack rolls against the creature have advantage.` },
    ],
  },
];

function SectionContent({ content, subsections }) {
  if (subsections) {
    return (
      <div className="space-y-4">
        {subsections.map((sub) => (
          <div key={sub.title} className="bg-secondary/20 rounded-lg p-4">
            <h4 className="font-heading font-semibold text-primary mb-2">{sub.title}</h4>
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{sub.content}</p>
          </div>
        ))}
      </div>
    );
  }
  return <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>;
}

export default function Rules() {
  const [search, setSearch] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [activeCat, setActiveCat] = useState('All');
  const sectionRefs = useRef({});

  const { data: dbEntries = [] } = useQuery({
    queryKey: ['rule-entries'],
    queryFn: () => base44.entities.RuleEntry.list('sort_order', 500),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = user?.role === 'admin';

  // Build unified section list: DB entries first, then static fallbacks for anything not in DB
  const dbSections = dbEntries.filter((e) => e.entry_type === 'section' || e.entry_type === 'condition').map((e) => {
    const children = dbEntries.filter((c) => c.parent_id === e.id).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    return {
      id: e.id,
      title: e.title,
      category: e.category,
      content: e.content,
      subsections: children.length > 0 ? children.map((c) => ({ title: c.title, content: c.content })) : undefined,
      _fromDb: true,
    };
  });

  // Group conditions from DB into a virtual section if any exist
  const dbConditions = dbEntries.filter((e) => e.entry_type === 'condition' && !e.parent_id);

  const allSections = dbSections.length > 0 ? dbSections : STATIC_SECTIONS;

  const categories = ['All', ...new Set(allSections.map((s) => s.category).filter(Boolean))];

  const filteredSections = allSections.filter((section) => {
    const matchesCat = activeCat === 'All' || section.category === activeCat;
    if (!search.trim()) return matchesCat;
    const q = search.toLowerCase();
    if (section.title.toLowerCase().includes(q)) return matchesCat;
    if (section.content && section.content.toLowerCase().includes(q)) return matchesCat;
    if (section.subsections) {
      return matchesCat && section.subsections.some(
        (sub) => sub.title.toLowerCase().includes(q) || sub.content.toLowerCase().includes(q)
      );
    }
    return false;
  });

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { entries.forEach((entry) => { if (entry.isIntersecting) setActiveSection(entry.target.id); }); },
      { rootMargin: '-20% 0px -70% 0px' }
    );
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [filteredSections]);

  return (
    <div className="flex gap-6 relative">
      {/* Floating back button */}
      <Link to="/" className="fixed bottom-6 left-6 z-40">
        <Button variant="secondary" size="icon" className="shadow-lg rounded-full w-11 h-11">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </Link>

      {/* Sidebar index */}
      <aside className="hidden lg:block w-56 shrink-0 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
        <div className="bg-card border border-border/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <span className="font-heading text-sm font-semibold text-foreground">Index</span>
          </div>
          <nav className="space-y-1">
            {allSections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={`w-full text-left text-xs px-2 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeSection === section.id
                    ? 'bg-primary/10 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                }`}
              >
                <ChevronRight className={`w-3 h-3 shrink-0 transition-transform ${activeSection === section.id ? 'text-primary' : 'opacity-40'}`} />
                {section.title}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-1">Rules Reference</h1>
            <p className="text-muted-foreground text-sm">Jainga's Tower official rules dictionary</p>
          </div>
          {isAdmin && (
            <Link to="/edit-rules">
              <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
                <Pencil className="w-3.5 h-3.5" /> Edit Rules
              </Button>
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search rules..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                activeCat === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Mobile index */}
        <div className="lg:hidden mb-6 bg-card border border-border/50 rounded-xl p-4">
          <p className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Index
          </p>
          <div className="flex flex-wrap gap-2">
            {filteredSections.map((section) => (
              <button key={section.id} onClick={() => scrollToSection(section.id)}
                className="text-xs px-2 py-1 rounded bg-secondary/50 text-muted-foreground hover:text-foreground hover:bg-secondary transition-all">
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {filteredSections.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">No rules found matching "{search}".</div>
        ) : (
          <div className="space-y-6">
            {filteredSections.map((section) => (
              <div key={section.id} id={section.id} ref={(el) => (sectionRefs.current[section.id] = el)}
                className="bg-card border border-border/50 rounded-xl p-5 scroll-mt-20">
                <div className="flex items-start justify-between gap-3 mb-3 border-b border-border/50 pb-2">
                  <h2 className="font-heading text-xl font-bold text-foreground">{section.title}</h2>
                  <span className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-1.5 py-0.5 shrink-0 mt-1">{section.category}</span>
                </div>
                <SectionContent content={section.content} subsections={section.subsections} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}