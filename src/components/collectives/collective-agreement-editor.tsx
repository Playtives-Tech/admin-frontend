'use client';

import { Eye, FileCode2, FileText, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { notify } from '@/lib/notify';
import {
  wealthCollectiveService,
  type WealthCollectiveProgramme,
} from '@/lib/services/wealth-collective-service';
import { CollectiveContentPreview, type CollectiveAboutFormat } from './collective-content-preview';

const formats: ReadonlyArray<{
  id: CollectiveAboutFormat;
  label: string;
  icon: typeof FileText;
}> = [
  { id: 'TEXT', label: 'Text', icon: FileText },
  { id: 'MARKDOWN', label: 'Markdown', icon: FileCode2 },
  { id: 'HTML', label: 'HTML', icon: FileCode2 },
];

export function CollectiveAgreementEditor({
  programme,
  refresh,
}: Readonly<{
  programme: WealthCollectiveProgramme;
  refresh: () => Promise<void>;
}>): React.JSX.Element {
  const [format, setFormat] = useState<CollectiveAboutFormat>(
    programme.agreementFormat ?? 'MARKDOWN',
  );
  const [content, setContent] = useState(programme.agreementContent ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFormat(programme.agreementFormat ?? 'MARKDOWN');
    setContent(programme.agreementContent ?? '');
  }, [programme.agreementContent, programme.agreementFormat]);

  const save = (): void => {
    setBusy(true);
    void wealthCollectiveService
      .updateAgreement({ format, content })
      .then(async () => {
        notify.success(
          'Member agreement saved. Members must accept the latest version to participate.',
        );
        await refresh();
      })
      .catch((cause: unknown) =>
        notify.error(cause instanceof Error ? cause.message : 'Unable to save the agreement.'),
      )
      .finally(() => setBusy(false));
  };

  return (
    <section className="bg-card rounded-2xl border p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand">
            Version {programme.agreementVersion ?? 1}
          </p>
          <h2 className="mt-1 text-xl font-semibold">Member agreement</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
            Members review and sign this before contributing to a month. Editing the terms creates a
            new version and requires members to accept it again.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground disabled:opacity-50"
          disabled={busy || !content.trim()}
          onClick={save}
          type="button"
        >
          <Save className="size-4" /> {busy ? 'Saving…' : 'Save agreement'}
        </button>
      </div>

      <div className="mt-5 inline-flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1">
        {formats.map(({ id, label, icon: Icon }) => (
          <button
            aria-pressed={format === id}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition ${format === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            key={id}
            onClick={() => setFormat(id)}
            type="button"
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <label className="grid min-w-0 gap-2 text-sm font-semibold">
          Agreement text
          <textarea
            className="min-h-80 w-full resize-y rounded-xl border bg-background p-4 font-mono text-sm leading-6 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
            maxLength={30000}
            onChange={(event) => setContent(event.target.value)}
            placeholder={
              format === 'HTML'
                ? '<h2>Wealth Collective Agreement</h2>\n<p>Enter the terms members must accept.</p>'
                : format === 'MARKDOWN'
                  ? '# Wealth Collective Agreement\n\nEnter the terms members must accept.'
                  : 'Enter the terms members must accept.'
            }
            value={content}
          />
          <span className="text-xs font-normal text-muted-foreground">
            {content.length.toLocaleString()} / 30,000 characters
          </span>
        </label>
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Eye className="size-4 text-brand" /> Member preview
          </div>
          {content.trim() ? (
            <CollectiveContentPreview content={content} format={format} />
          ) : (
            <div className="grid h-80 place-items-center rounded-xl border border-dashed bg-muted/20 px-6 text-center text-sm text-muted-foreground">
              Agreement preview appears here.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
