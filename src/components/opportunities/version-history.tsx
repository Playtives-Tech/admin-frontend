'use client';

import { MdCheckCircle } from 'react-icons/md';
import { cn } from '@/lib/utils';

interface HistoryItem {
  id: string;
  time: string;
  action: string;
  version: string;
  author: string;
  isLatest?: boolean;
}

const historyData: HistoryItem[] = [
  {
    id: '1',
    time: '15:08',
    action: 'Capacity updated',
    version: 'v0.6',
    author: 'G. Olatunji',
    isLatest: true,
  },
  {
    id: '2',
    time: '13:42',
    action: 'Due diligence added',
    version: 'v0.5',
    author: 'N. Yusuf',
  },
  {
    id: '3',
    time: 'Yesterday',
    action: 'Draft created',
    version: 'v0.1',
    author: 'S. Bello',
  },
];

export function VersionHistory(): React.JSX.Element {
  return (
    <div className="app-surface rounded-2xl border p-5 shadow-sm">
      <h3 className="mb-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        Version History
      </h3>
      <div className="relative pl-14">
        {/* Vertical line */}
        <div className="absolute left-[3.35rem] top-2 bottom-4 w-px bg-border" />

        <div className="grid gap-6">
          {historyData.map((item) => (
            <div key={item.id} className="relative flex items-start gap-4">
              <div className="absolute -left-14 top-0 w-10 text-right text-xs font-medium text-muted-foreground">
                {item.time}
              </div>
              <div className="relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full bg-background mt-0.5">
                {item.isLatest ? (
                  <MdCheckCircle className="size-4 text-emerald-500" />
                ) : (
                  <div className="size-2 rounded-full bg-border" />
                )}
              </div>
              <div className="-mt-1 grid gap-0.5">
                <p className={cn("text-sm font-semibold", item.isLatest ? 'text-foreground' : 'text-muted-foreground')}>
                  {item.action}
                </p>
                <p className="text-xs text-muted-foreground">
                  {item.version} · {item.author}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
