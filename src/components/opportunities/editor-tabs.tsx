'use client';

import { cn } from '@/lib/utils';
import { MdErrorOutline } from 'react-icons/md';

interface Tab {
  id: string;
  label: string;
  hasError?: boolean;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'key-facts', label: 'Key facts' },
  { id: 'documents', label: 'Media & Documents' },
];

interface EditorTabsProps {
  activeTab: string;
  onChange: (id: string) => void;
}

export function EditorTabs({ activeTab, onChange }: EditorTabsProps): React.JSX.Element {
  return (
    <div className="flex w-full items-center gap-6 overflow-x-auto border-b px-2 pb-[-1px] scrollbar-hide">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              'relative flex items-center gap-1.5 whitespace-nowrap pb-3 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2',
              isActive
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.hasError && (
              <MdErrorOutline className="size-3.5" />
            )}
            {isActive && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 bg-foreground" />
            )}
          </button>
        );
      })}
    </div>
  );
}
