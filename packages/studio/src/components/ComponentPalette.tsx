import React, { useState } from 'react';
import { 
  Square, 
  CreditCard, 
  List, 
  Tag, 
  Search, 
  ToggleLeft, 
  Copy, 
  Plus, 
  Check, 
  ChevronRight,
  ChevronDown
} from 'lucide-react';

interface ComponentItem {
  name: string;
  tag: string;
  description: string;
  snippet: string;
  icon: any;
}

const IONIC_CATALOG: { category: string; items: ComponentItem[] }[] = [
  {
    category: 'Buttons & Badges',
    items: [
      {
        name: 'Primary Button',
        tag: 'ion-button',
        description: 'Standard block action button',
        snippet: '<ion-button expand="block" color="primary">Click Me</ion-button>',
        icon: Square
      },
      {
        name: 'Outline Pill Button',
        tag: 'ion-button',
        description: 'Secondary rounded outline button',
        snippet: '<ion-button fill="outline" shape="round" color="secondary">Action</ion-button>',
        icon: Square
      },
      {
        name: 'Badge',
        tag: 'ion-badge',
        description: 'Status or notification counter',
        snippet: '<ion-badge color="success">New</ion-badge>',
        icon: Tag
      },
      {
        name: 'Chip',
        tag: 'ion-chip',
        description: 'Compact tag with icon',
        snippet: '<ion-chip color="tertiary"><ion-icon name="pin" slot="start"></ion-icon><ion-label>Location</ion-label></ion-chip>',
        icon: Tag
      }
    ]
  },
  {
    category: 'Cards & Lists',
    items: [
      {
        name: 'Content Card',
        tag: 'ion-card',
        description: 'Card with title, subtitle, and body',
        snippet: `<ion-card>
  <ion-card-header>
    <ion-card-subtitle>Category</ion-card-subtitle>
    <ion-card-title>Card Title</ion-card-title>
  </ion-card-header>
  <ion-card-content>
    Here's a small text description for the card content.
  </ion-card-content>
</ion-card>`,
        icon: CreditCard
      },
      {
        name: 'List Item with Icon',
        tag: 'ion-item',
        description: 'Clickable list entry with start icon',
        snippet: `<ion-item button detail="true">
  <ion-icon name="person" slot="start" color="primary"></ion-icon>
  <ion-label>User Profile</ion-label>
</ion-item>`,
        icon: List
      }
    ]
  },
  {
    category: 'Inputs & Controls',
    items: [
      {
        name: 'Searchbar',
        tag: 'ion-searchbar',
        description: 'Interactive search input',
        snippet: '<ion-searchbar placeholder="Search items..."></ion-searchbar>',
        icon: Search
      },
      {
        name: 'Toggle Switch',
        tag: 'ion-toggle',
        description: 'Interactive switch with label',
        snippet: '<ion-toggle color="primary" [checked]="true">Enable Notifications</ion-toggle>',
        icon: ToggleLeft
      }
    ]
  }
];

interface ComponentPaletteProps {
  onInsertSnippet: (snippet: string, name: string) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onInsertSnippet }) => {
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    'Buttons & Badges': true,
    'Cards & Lists': true,
    'Inputs & Controls': true
  });

  const handleCopy = (snippet: string, tag: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedTag(tag);
    setTimeout(() => setCopiedTag(null), 2000);
  };

  const toggleCategory = (cat: string) => {
    setOpenCategories((prev) => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto select-none">
      <div className="p-3 border-b border-slate-800">
        <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Ionic Components</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">Quick snippets to insert or prompt</p>
      </div>

      <div className="p-2 space-y-3">
        {IONIC_CATALOG.map((cat) => {
          const isOpen = openCategories[cat.category] ?? true;
          return (
            <div key={cat.category} className="space-y-1">
              <button
                onClick={() => toggleCategory(cat.category)}
                className="w-full flex items-center justify-between px-2 py-1 text-slate-400 hover:text-slate-200 text-xs font-semibold"
              >
                <span>{cat.category}</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {isOpen && (
                <div className="space-y-1 pl-1">
                  {cat.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.name}
                        className="group flex flex-col p-2 rounded-lg border border-slate-800 bg-slate-800/40 hover:bg-slate-800 hover:border-slate-700 transition-all text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-3.5 h-3.5 text-blue-400" />
                            <span className="font-medium text-slate-200">{item.name}</span>
                          </div>

                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(item.snippet, item.name)}
                              title="Copy snippet"
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                            >
                              {copiedTag === item.name ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => onInsertSnippet(item.snippet, item.name)}
                              title="Prompt LLM to insert this component"
                              className="p-1 rounded hover:bg-blue-600 text-slate-400 hover:text-white"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">
                          {item.description}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
