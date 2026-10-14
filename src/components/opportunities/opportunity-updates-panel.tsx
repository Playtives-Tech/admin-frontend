'use client';

import { useEffect, useState } from 'react';
import { notify } from '@/lib/notify';
import {
  opportunityService,
  type OpportunityUpdate,
} from '@/lib/services/opportunity-service';

const inputClass =
  'min-h-10 rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand';

export function OpportunityUpdatesPanel({ opportunityId }: { opportunityId: string }) {
  const [updates, setUpdates] = useState<OpportunityUpdate[]>([]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [milestone, setMilestone] = useState('');
  const [attachment, setAttachment] = useState('');
  const [visibility, setVisibility] = useState<'PUBLIC' | 'COOWNERS_ONLY'>('COOWNERS_ONLY');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    opportunityService
      .updates(opportunityId)
      .then(setUpdates)
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to load updates'),
      );
  }, [opportunityId]);

  async function publish() {
    if (!title.trim() || !body.trim()) {
      notify.error('Add an update title and message.');
      return;
    }
    setSaving(true);
    try {
      const update = await opportunityService.publishUpdate(opportunityId, {
        title: title.trim(),
        body: body.trim(),
        milestone: milestone.trim() || undefined,
        visibility,
        attachments: attachment.trim() ? [attachment.trim()] : undefined,
      });
      setUpdates((current) => [update, ...current]);
      setTitle('');
      setBody('');
      setMilestone('');
      setAttachment('');
      notify.success('Co-ownership update published.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to publish update');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border bg-card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Co-Ownership Updates</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Publish asset progress separately from general member activity.
      </p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input
          className={inputClass}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Update title"
        />
        <input
          className={inputClass}
          value={milestone}
          onChange={(event) => setMilestone(event.target.value)}
          placeholder="Milestone (optional)"
        />
        <textarea
          className={`${inputClass} sm:col-span-2`}
          rows={4}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What should members know?"
        />
        <input
          className={inputClass}
          type="url"
          value={attachment}
          onChange={(event) => setAttachment(event.target.value)}
          placeholder="Approved photo or document URL (optional)"
        />
        <select
          className={inputClass}
          value={visibility}
          onChange={(event) =>
            setVisibility(event.target.value as 'PUBLIC' | 'COOWNERS_ONLY')
          }
        >
          <option value="COOWNERS_ONLY">Co-owners only</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>
      <button
        type="button"
        disabled={saving}
        onClick={publish}
        className="mt-4 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:opacity-60"
      >
        {saving ? 'Publishing…' : 'Publish update'}
      </button>
      {updates.length ? (
        <div className="mt-6 grid gap-3">
          {updates.map((update) => (
            <article key={update._id} className="rounded-xl border bg-muted/30 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{update.title}</p>
                <span className="text-xs text-muted-foreground">
                  {update.visibility === 'COOWNERS_ONLY' ? 'Co-owners only' : 'Public'}
                </span>
              </div>
              {update.milestone ? (
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-brand">
                  {update.milestone}
                </p>
              ) : null}
              <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{update.body}</p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
