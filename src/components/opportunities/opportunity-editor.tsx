'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdChevronRight, MdDeleteOutline, MdFileUpload } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  Opportunity,
  OpportunityPayload,
  opportunityService,
  ReturnSchedule,
} from '@/lib/services/opportunity-service';

type FormState = {
  title: string;
  category: string;
  summary: string;
  about: string;
  agreement: string;
  price: string;
  minimumUnits: string;
  totalUnits: string;
  durationMonths: string;
  returnRate: string;
  returnSchedule: ReturnSchedule;
  ownershipModel: 'CO_OWNERSHIP' | 'FULL_OWNERSHIP';
  rolloverAllowed: boolean;
  rolloverCompoundsReturns: boolean;
  principalReleaseDate: string;
  location: string;
  imageUrl: string;
  imageKey: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt: string;
};

const emptyForm: FormState = {
  title: '',
  category: '',
  summary: '',
  about: '',
  agreement: '',
  price: '',
  minimumUnits: '1',
  totalUnits: '',
  durationMonths: '',
  returnRate: '',
  returnSchedule: 'MONTHLY',
  ownershipModel: 'CO_OWNERSHIP',
  rolloverAllowed: false,
  rolloverCompoundsReturns: false,
  principalReleaseDate: '',
  location: '',
  imageUrl: '',
  imageKey: '',
  imageAlt: '',
};

const inputClass =
  'min-h-10 rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand';
const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(minor / 100);
const numberOrUndefined = (value: string) => (value === '' ? undefined : Number(value));

function toForm(opportunity: Opportunity): FormState {
  return {
    title: opportunity.title,
    category: opportunity.category,
    summary: opportunity.summary,
    about: opportunity.about ?? '',
    agreement: opportunity.agreement ?? '',
    price: String(opportunity.pricePerUnitMinorUnits / 100),
    minimumUnits: String(opportunity.minimumUnits),
    totalUnits: String(opportunity.totalUnits),
    durationMonths: opportunity.durationMonths == null ? '' : String(opportunity.durationMonths),
    returnRate: String(opportunity.projectedReturnRatePercent),
    returnSchedule: opportunity.returnSchedule,
    ownershipModel: opportunity.ownershipModel,
    rolloverAllowed: opportunity.rolloverAllowed,
    rolloverCompoundsReturns: opportunity.rolloverCompoundsReturns,
    principalReleaseDate: opportunity.principalReleaseDate?.slice(0, 10) ?? '',
    location: opportunity.location ?? '',
    imageUrl: opportunity.imageUrl ?? '',
    imageKey: opportunity.imageKey ?? '',
    imageWidth: opportunity.imageWidth,
    imageHeight: opportunity.imageHeight,
    imageAlt: opportunity.imageAlt ?? '',
  };
}

export function OpportunityEditor({
  opportunityId,
}: {
  opportunityId?: string;
}): React.JSX.Element {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(Boolean(opportunityId));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [revision, setRevision] = useState(1);

  useEffect(() => {
    if (!opportunityId) return;
    opportunityService
      .get(opportunityId)
      .then((value) => {
        setForm(toForm(value));
        setRevision(value.revision);
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to load opportunity'),
      )
      .finally(() => setLoading(false));
  }, [opportunityId]);

  const projection = useMemo(() => {
    const principal = Math.round((Number(form.price) || 0) * 100);
    const profit = Math.round((principal * (Number(form.returnRate) || 0)) / 100);
    const duration = Number(form.durationMonths) || 0;
    const monthly =
      form.returnSchedule === 'MONTHLY' && duration > 0 ? Math.round(profit / duration) : null;
    const nextPrincipal = form.rolloverAllowed
      ? principal + (form.rolloverCompoundsReturns ? profit : 0)
      : null;
    return {
      profit,
      monthly,
      nextPrincipal,
      nextProfit:
        nextPrincipal == null
          ? null
          : Math.round((nextPrincipal * (Number(form.returnRate) || 0)) / 100),
    };
  }, [
    form.durationMonths,
    form.price,
    form.returnRate,
    form.returnSchedule,
    form.rolloverAllowed,
    form.rolloverCompoundsReturns,
  ]);

  const payload = (status: 'DRAFT' | 'PUBLISHED'): OpportunityPayload => ({
    title: form.title.trim(),
    category: form.category.trim(),
    summary: form.summary.trim(),
    about: form.about.trim(),
    agreement: form.agreement.trim(),
    pricePerUnitMinorUnits: Math.round((Number(form.price) || 0) * 100),
    minimumUnits: numberOrUndefined(form.minimumUnits),
    totalUnits: numberOrUndefined(form.totalUnits),
    durationMonths: numberOrUndefined(form.durationMonths),
    projectedReturnRatePercent: numberOrUndefined(form.returnRate),
    returnSchedule: form.returnSchedule,
    ownershipModel: form.ownershipModel,
    rolloverAllowed: form.rolloverAllowed,
    rolloverCompoundsReturns: form.rolloverAllowed && form.rolloverCompoundsReturns,
    principalReleaseDate: form.principalReleaseDate || undefined,
    location: form.location.trim(),
    imageUrl: form.imageUrl || undefined,
    imageKey: form.imageKey || undefined,
    imageWidth: form.imageWidth,
    imageHeight: form.imageHeight,
    imageAlt: form.imageAlt.trim(),
    status,
  });

  async function save(status: 'DRAFT' | 'PUBLISHED') {
    if (!form.title.trim() || !form.category.trim() || !form.summary.trim())
      return notify.error('Title, category and summary are required.');
    setSaving(true);
    try {
      if (opportunityId) await opportunityService.update(opportunityId, revision, payload(status));
      else await opportunityService.create(payload(status));
      notify.success(status === 'PUBLISHED' ? 'Opportunity published.' : 'Draft saved.');
      router.push('/opportunities');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to save opportunity');
    } finally {
      setSaving(false);
    }
  }

  async function upload(file?: File) {
    if (!file) return;
    setUploading(true);
    try {
      const image = await opportunityService.uploadImage(file);
      setForm((current) => ({ ...current, ...image }));
      notify.success('Image optimized and uploaded.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));
  if (loading)
    return (
      <DashboardShell title="Opportunity" description="Loading">
        <div className="p-12 text-center">Loading opportunity…</div>
      </DashboardShell>
    );

  return (
    <DashboardShell
      title={opportunityId ? 'Edit Opportunity' : 'New Opportunity'}
      description="Set the member-facing details, commercial terms, and payout settings."
    >
      <div className="mx-auto max-w-6xl">
        <nav className="mb-5 flex items-center gap-2 text-xs text-muted-foreground">
          <Link href="/opportunities">Opportunities</Link>
          <MdChevronRight />
          <span>{opportunityId ? 'Edit' : 'New'}</span>
        </nav>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {form.title || 'Untitled opportunity'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Fields marked * are required to save. Publishing requires complete member-facing
              details.
            </p>
          </div>
          <div className="flex gap-2">
            {opportunityId && (
              <Link
                href={`/opportunities/${opportunityId}/delete`}
                className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600"
              >
                <MdDeleteOutline /> Delete
              </Link>
            )}
            <button
              disabled={saving}
              onClick={() => save('DRAFT')}
              className="rounded-xl border px-4 py-2 text-sm font-semibold"
            >
              Save draft
            </button>
            <button
              disabled={saving}
              onClick={() => save('PUBLISHED')}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
            >
              Publish
            </button>
          </div>
        </div>
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]">
          <div className="grid gap-4">
            <Section title="Opportunity details" description="What members see before they decide to participate.">
              <Field label="Opportunity title *" wide>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>
              <Field label="Category *">
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="Enter any category"
                />
              </Field>
              <Field label="Summary *" wide>
                <textarea
                  className={inputClass}
                  rows={3}
                  value={form.summary}
                  onChange={(e) => set('summary', e.target.value)}
                />
              </Field>
              <Field label="About" wide>
                <textarea
                  className={inputClass}
                  rows={6}
                  value={form.about}
                  onChange={(e) => set('about', e.target.value)}
                />
              </Field>
              <Field label="Member agreement (Markdown supported)" wide>
                <textarea
                  className={inputClass}
                  rows={12}
                  value={form.agreement}
                  onChange={(e) => set('agreement', e.target.value)}
                  placeholder={'# Member agreement\n\nUse headings, bullet lists, **bold text**, and normal paragraphs. Members see a short preview and can open the complete agreement.'}
                />
              </Field>
            </Section>
            <Section title="Commercial terms" description="Use the agreed unit price and return terms.">
              <Field label="Price per unit (NGN)">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.price}
                  onChange={(e) => set('price', e.target.value)}
                />
              </Field>
              <Field label="Minimum units">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.minimumUnits}
                  onChange={(e) => set('minimumUnits', e.target.value)}
                />
              </Field>
              <Field label="Total units">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.totalUnits}
                  onChange={(e) => set('totalUnits', e.target.value)}
                />
              </Field>
              <Field label="Duration (months)">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.durationMonths}
                  onChange={(e) => set('durationMonths', e.target.value)}
                />
              </Field>
              <Field label="Projected return (%)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={form.returnRate}
                  onChange={(e) => set('returnRate', e.target.value)}
                />
              </Field>
              <Field label="Return schedule">
                <select
                  className={inputClass}
                  value={form.returnSchedule}
                  onChange={(e) => set('returnSchedule', e.target.value as ReturnSchedule)}
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="YEARLY">Yearly</option>
                  <option value="AT_MATURITY">At maturity</option>
                </select>
              </Field>
              <Field label="Ownership model">
                <select
                  className={inputClass}
                  value={form.ownershipModel}
                  onChange={(e) =>
                    set('ownershipModel', e.target.value as FormState['ownershipModel'])
                  }
                >
                  <option value="CO_OWNERSHIP">Co-ownership</option>
                  <option value="FULL_OWNERSHIP">Full ownership</option>
                </select>
              </Field>
              <Field label="Location">
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </Field>
              <Field label="Principal release date">
                <input
                  type="date"
                  className={inputClass}
                  value={form.principalReleaseDate}
                  onChange={(e) => set('principalReleaseDate', e.target.value)}
                />
              </Field>
            </Section>
            <Section title="Rollover at maturity" description="Only enable this if the offer can continue after maturity.">
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.rolloverAllowed}
                  onChange={(e) => set('rolloverAllowed', e.target.checked)}
                />
                Allow members to roll the principal into another cycle at maturity
              </label>
              {form.rolloverAllowed && (
                <label className="flex gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={form.rolloverCompoundsReturns}
                    onChange={(e) => set('rolloverCompoundsReturns', e.target.checked)}
                  />
                  Add profit to principal before calculating the next cycle&apos;s return
                </label>
              )}
            </Section>
            <Section title="Cover image" description="One optimised image used across the member app.">
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-6 text-sm">
                <MdFileUpload />
                {uploading ? 'Optimizing and uploading…' : 'Choose JPEG, PNG, WebP or AVIF'}
                <input
                  hidden
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  disabled={uploading}
                  onChange={(e) => upload(e.target.files?.[0])}
                />
              </label>
              <Field label="Image alt text" wide>
                <input
                  className={inputClass}
                  value={form.imageAlt}
                  onChange={(e) => set('imageAlt', e.target.value)}
                />
              </Field>
            </Section>
          </div>
          <aside className="sticky top-6 overflow-hidden rounded-xl border bg-background">
            <div className="border-b px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Live HTML preview
              </p>
            </div>
            {form.imageUrl ? (
              <div className="relative aspect-[16/9]">
                <Image
                  src={form.imageUrl}
                  alt={form.imageAlt || ''}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex aspect-[16/9] items-center justify-center bg-muted text-sm text-muted-foreground">
                Cover image preview
              </div>
            )}
            <div className="space-y-6 p-6">
              <div>
                <p className="text-xs font-bold uppercase text-brand">
                  {form.category || 'Category'}
                </p>
                <h2 className="mt-2 text-2xl font-semibold">{form.title || 'Opportunity title'}</h2>
                <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {form.summary || 'Member-facing summary will appear here.'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Fact
                  label="Unit price"
                  value={money(Math.round((Number(form.price) || 0) * 100))}
                />
                <Fact label="Projected profit" value={money(projection.profit)} />
                <Fact
                  label="Return schedule"
                  value={form.returnSchedule.replaceAll('_', ' ').toLowerCase()}
                />
                <Fact
                  label="Duration"
                  value={form.durationMonths ? `${form.durationMonths} months` : '—'}
                />
                {projection.monthly != null && (
                  <Fact label="Projected monthly profit" value={money(projection.monthly)} />
                )}
              </div>
              {form.about && <PreviewText title="About" text={form.about} />}{' '}
              {form.agreement && <PreviewText title="Agreement" text={form.agreement} />}{' '}
              {projection.nextPrincipal != null && (
                <div className="rounded-xl bg-brand/5 p-4 text-sm">
                  <p className="font-semibold">Rollover projection</p>
                  <p className="mt-1 text-muted-foreground">
                    Next principal: {money(projection.nextPrincipal)} · Next projected profit:{' '}
                    {money(projection.nextProfit ?? 0)}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </DashboardShell>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-xl border bg-background p-5">
      <div className="border-b pb-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
function Field({
  label,
  wide = false,
  children,
}: {
  label: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${wide ? 'sm:col-span-2' : ''}`}>
      {label}
      {children}
    </label>
  );
}
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border p-3">
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold capitalize">{value}</p>
    </div>
  );
}
function PreviewText({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{text}</p>
    </section>
  );
}
