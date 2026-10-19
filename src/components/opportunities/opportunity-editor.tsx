'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MdChevronRight, MdDeleteOutline, MdFileUpload } from 'react-icons/md';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  Opportunity,
  OpportunityPayload,
  DurationUnit,
  opportunityService,
  OpportunityStructure,
  ProjectionType,
  ReturnModel,
  ReturnSchedule,
  TermType,
} from '@/lib/services/opportunity-service';
import { ExecutionProgressPanel } from './execution-progress-panel';
import { OpportunityUpdatesPanel } from './opportunity-updates-panel';

type FormState = {
  title: string;
  category: string;
  summary: string;
  about: string;
  agreement: string;
  agreementResourceUrl: string;
  price: string;
  minimumUnits: string;
  totalUnits: string;
  sponsorUnits: string;
  maximumUnitsPerMember: string;
  opportunityStructure: OpportunityStructure;
  returnModel: ReturnModel;
  projectionType: ProjectionType;
  projectedDistribution: string;
  projectedDistributionMinimum: string;
  projectedDistributionMaximum: string;
  termType: TermType;
  durationValue: string;
  durationUnit: DurationUnit;
  capitalExitDescription: string;
  projectionDisclaimer: string;
  returnRate: string;
  returnSchedule: ReturnSchedule;
  rolloverAllowed: boolean;
  rolloverCompoundsReturns: boolean;
  memberAvailabilityDate: string;
  offerClosesAt: string;
  commencementDate: string;
  assetLifecycleEnabled: boolean;
  assetLifecycleStatus:
    | 'FUNDING'
    | 'ACQUISITION_IN_PROGRESS'
    | 'ASSET_ACQUIRED'
    | 'COMPLIANCE_IN_PROGRESS'
    | 'OPERATOR_SETUP'
    | 'OPERATIONAL'
    | 'DISTRIBUTIONS_ACTIVE'
    | 'ASSET_SOLD';
  fundingClosedAt: string;
  assetAcquiredAt: string;
  operationalAt: string;
  distributionStartAt: string;
  expectedActivationMinDays: string;
  expectedActivationMaxDays: string;
  currentMilestone: string;
  nextMilestone: string;
  location: string;
  imageUrl: string;
  imageKey: string;
  imageWidth?: number;
  imageHeight?: number;
  imageAlt: string;
  interestModeEnabled: boolean;
  interestCurrency: 'NGN' | 'GBP' | 'USD';
  interestTargetAmount: string;
  interestAcknowledgementText: string;
  interestQuestions: Array<{
    id: string;
    label: string;
    options: string[];
    required: boolean;
    purpose?: 'participation_amount' | null;
    amountOptions?: Array<{ amount: number | null; minimum: boolean }>;
  }>;
};

const emptyForm: FormState = {
  title: '',
  category: '',
  summary: '',
  about: '',
  agreement: '',
  agreementResourceUrl: '',
  price: '',
  minimumUnits: '1',
  totalUnits: '',
  sponsorUnits: '0',
  maximumUnitsPerMember: '',
  opportunityStructure: 'CO_OWNERSHIP',
  returnModel: 'PROJECTED_MONTHLY_RETURN',
  projectionType: 'PERCENTAGE',
  projectedDistribution: '',
  projectedDistributionMinimum: '',
  projectedDistributionMaximum: '',
  termType: 'FIXED_TERM',
  durationValue: '',
  durationUnit: 'MONTHS',
  capitalExitDescription: '',
  projectionDisclaimer:
    'Projected distribution figures are provided for planning only and are not guaranteed.',
  returnRate: '',
  returnSchedule: 'MONTHLY',
  rolloverAllowed: false,
  rolloverCompoundsReturns: false,
  memberAvailabilityDate: '',
  offerClosesAt: '',
  commencementDate: '',
  assetLifecycleEnabled: false,
  assetLifecycleStatus: 'FUNDING',
  fundingClosedAt: '',
  assetAcquiredAt: '',
  operationalAt: '',
  distributionStartAt: '',
  expectedActivationMinDays: '',
  expectedActivationMaxDays: '',
  currentMilestone: '',
  nextMilestone: '',
  location: '',
  imageUrl: '',
  imageKey: '',
  imageAlt: '',
  interestModeEnabled: false,
  interestCurrency: 'NGN',
  interestTargetAmount: '',
  interestAcknowledgementText:
    'I understand this is an expression of interest only. No payment is required now, and submitting this does not mean that my position has been funded.',
  interestQuestions: [],
};

const inputClass =
  'min-h-10 rounded-lg border bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-1 focus:ring-brand';
const money = (minor: number) =>
  new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(minor / 100);
const numberOrUndefined = (value: string) => (value === '' ? undefined : Number(value));
const draftStoragePrefix = 'playtives-admin:opportunity-editor-draft:';

type StoredDraft = { form: FormState; baseRevision?: number };

function readDraft(key: string): StoredDraft | null {
  try {
    const stored = window.localStorage.getItem(key);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as { form?: FormState; baseRevision?: number };
    return parsed.form && typeof parsed.form === 'object'
      ? { form: { ...emptyForm, ...parsed.form }, baseRevision: parsed.baseRevision }
      : null;
  } catch {
    return null;
  }
}

function toForm(opportunity: Opportunity): FormState {
  return {
    title: opportunity.title,
    category: opportunity.category,
    summary: opportunity.summary,
    about: opportunity.about ?? '',
    agreement: opportunity.agreement ?? '',
    agreementResourceUrl: opportunity.agreementResourceUrl ?? '',
    price: String(opportunity.pricePerUnitMinorUnits / 100),
    minimumUnits: String(opportunity.minimumUnits),
    totalUnits: String(opportunity.totalUnits),
    sponsorUnits: String(opportunity.sponsorUnits ?? 0),
    maximumUnitsPerMember:
      opportunity.maximumUnitsPerMember == null ? '' : String(opportunity.maximumUnitsPerMember),
    opportunityStructure: opportunity.opportunityStructure ?? 'CO_OWNERSHIP',
    returnModel: opportunity.returnModel ?? 'PROJECTED_MONTHLY_RETURN',
    projectionType: opportunity.projectionType ?? 'PERCENTAGE',
    projectedDistribution:
      opportunity.projectedDistributionPerUnitMinorUnits == null
        ? ''
        : String(opportunity.projectedDistributionPerUnitMinorUnits / 100),
    projectedDistributionMinimum:
      opportunity.projectedDistributionPerUnitMinimumMinorUnits == null
        ? ''
        : String(opportunity.projectedDistributionPerUnitMinimumMinorUnits / 100),
    projectedDistributionMaximum:
      opportunity.projectedDistributionPerUnitMaximumMinorUnits == null
        ? ''
        : String(opportunity.projectedDistributionPerUnitMaximumMinorUnits / 100),
    termType: opportunity.termType ?? 'FIXED_TERM',
    durationValue:
      opportunity.durationValue == null
        ? opportunity.durationMonths == null
          ? ''
          : String(opportunity.durationMonths)
        : String(opportunity.durationValue),
    durationUnit: opportunity.durationUnit ?? 'MONTHS',
    capitalExitDescription: opportunity.capitalExitDescription ?? '',
    projectionDisclaimer:
      opportunity.projectionDisclaimer ??
      'Projected distribution figures are provided for planning only and are not guaranteed.',
    returnRate: String(opportunity.projectedReturnRatePercent),
    returnSchedule: opportunity.returnSchedule ?? 'MONTHLY',
    rolloverAllowed: opportunity.rolloverAllowed ?? false,
    rolloverCompoundsReturns: opportunity.rolloverCompoundsReturns ?? false,
    memberAvailabilityDate: opportunity.memberAvailabilityDate?.slice(0, 10) ?? '',
    offerClosesAt: opportunity.offerClosesAt?.slice(0, 10) ?? '',
    commencementDate: opportunity.commencementDate?.slice(0, 10) ?? '',
    assetLifecycleEnabled: opportunity.assetLifecycleEnabled ?? false,
    assetLifecycleStatus: opportunity.assetLifecycleStatus ?? 'FUNDING',
    fundingClosedAt: opportunity.fundingClosedAt?.slice(0, 10) ?? '',
    assetAcquiredAt: opportunity.assetAcquiredAt?.slice(0, 10) ?? '',
    operationalAt: opportunity.operationalAt?.slice(0, 10) ?? '',
    distributionStartAt: opportunity.distributionStartAt?.slice(0, 10) ?? '',
    expectedActivationMinDays:
      opportunity.expectedActivationMinDays == null
        ? ''
        : String(opportunity.expectedActivationMinDays),
    expectedActivationMaxDays:
      opportunity.expectedActivationMaxDays == null
        ? ''
        : String(opportunity.expectedActivationMaxDays),
    currentMilestone: opportunity.currentMilestone ?? '',
    nextMilestone: opportunity.nextMilestone ?? '',
    location: opportunity.location ?? '',
    imageUrl: opportunity.imageUrl ?? '',
    imageKey: opportunity.imageKey ?? '',
    imageWidth: opportunity.imageWidth,
    imageHeight: opportunity.imageHeight,
    imageAlt: opportunity.imageAlt ?? '',
    interestModeEnabled: opportunity.interestModeEnabled ?? false,
    interestCurrency: opportunity.interestCurrency ?? 'NGN',
    interestTargetAmount:
      opportunity.interestTargetAmount == null ? '' : String(opportunity.interestTargetAmount),
    interestAcknowledgementText:
      opportunity.interestAcknowledgementText ?? emptyForm.interestAcknowledgementText,
    interestQuestions: opportunity.interestQuestions ?? [],
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
  const [loadedOpportunity, setLoadedOpportunity] = useState<Opportunity | null>(null);
  const [currentStatus, setCurrentStatus] = useState<
    'DRAFT' | 'PUBLISHED' | 'INTEREST_OPEN' | 'INTEREST_CLOSED'
  >('DRAFT');
  const [draftReady, setDraftReady] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const suppressDraftPersistence = useRef(false);
  const draftKey = `${draftStoragePrefix}${opportunityId ?? 'new'}`;

  useEffect(() => {
    const draft = readDraft(draftKey);
    if (!opportunityId) {
      if (draft) {
        setForm(draft.form);
        setIsDirty(true);
        notify.info('Restored your local opportunity draft.');
      }
      setDraftReady(true);
      return;
    }

    opportunityService
      .get(opportunityId)
      .then((value) => {
        setLoadedOpportunity(value);
        setRevision(value.revision);
        setCurrentStatus(
          ['PUBLISHED', 'INTEREST_OPEN', 'INTEREST_CLOSED'].includes(value.status)
            ? (value.status as 'PUBLISHED' | 'INTEREST_OPEN' | 'INTEREST_CLOSED')
            : 'DRAFT',
        );
        if (draft?.baseRevision === value.revision) {
          setForm(draft.form);
          setIsDirty(true);
          notify.info('Restored your local opportunity draft.');
        } else {
          if (draft) window.localStorage.removeItem(draftKey);
          setForm(toForm(value));
        }
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to load opportunity'),
      )
      .finally(() => {
        setLoading(false);
        setDraftReady(true);
      });
  }, [draftKey, opportunityId]);

  useEffect(() => {
    if (!draftReady || !isDirty || suppressDraftPersistence.current) return;
    window.localStorage.setItem(
      draftKey,
      JSON.stringify({
        form,
        baseRevision: opportunityId ? revision : undefined,
        savedAt: new Date().toISOString(),
      }),
    );
  }, [draftKey, draftReady, form, isDirty, opportunityId, revision]);

  const projection = useMemo(() => {
    const principal = Math.round((Number(form.price) || 0) * 100);
    const profit = Math.round((principal * (Number(form.returnRate) || 0)) / 100);
    const duration = Number(form.durationValue) || 0;
    const monthly =
      form.returnSchedule === 'MONTHLY' && duration > 0 ? Math.round(profit / duration) : null;
    const nextPrincipal = form.rolloverAllowed ? principal + profit : null;
    return {
      profit,
      monthly,
      nextPrincipal,
      nextProfit:
        nextPrincipal == null
          ? null
          : Math.round((nextPrincipal * (Number(form.returnRate) || 0)) / 100),
    };
  }, [form.durationValue, form.price, form.returnRate, form.returnSchedule, form.rolloverAllowed]);

  const payload = (
    status: 'DRAFT' | 'PUBLISHED' | 'INTEREST_OPEN' | 'INTEREST_CLOSED',
  ): OpportunityPayload => ({
    title: form.title.trim(),
    category: form.category.trim(),
    summary: form.summary.trim(),
    about: form.about.trim(),
    agreement: form.agreement.trim(),
    agreementVersion: loadedOpportunity?.agreementVersion || '1.0',
    agreementStatus:
      status === 'PUBLISHED' ? 'ACTIVE' : loadedOpportunity?.agreementStatus || 'DRAFT',
    agreementEffectiveDate:
      status === 'PUBLISHED'
        ? loadedOpportunity?.agreementEffectiveDate || new Date().toISOString()
        : loadedOpportunity?.agreementEffectiveDate || undefined,
    agreementResourceUrl: form.agreementResourceUrl.trim() || undefined,
    pricePerUnitMinorUnits: Math.round((Number(form.price) || 0) * 100),
    minimumUnits: numberOrUndefined(form.minimumUnits),
    totalUnits: numberOrUndefined(form.totalUnits),
    memberFundedUnits: numberOrUndefined(form.totalUnits),
    sponsorUnits: numberOrUndefined(form.sponsorUnits),
    maximumUnitsPerMember: numberOrUndefined(form.maximumUnitsPerMember),
    opportunityStructure: form.opportunityStructure,
    returnModel: form.returnModel,
    projectionType: form.projectionType,
    projectedDistributionPerUnitMinorUnits:
      form.projectedDistribution === ''
        ? undefined
        : Math.round(Number(form.projectedDistribution) * 100),
    projectedDistributionPerUnitMinimumMinorUnits:
      form.projectedDistributionMinimum === ''
        ? undefined
        : Math.round(Number(form.projectedDistributionMinimum) * 100),
    projectedDistributionPerUnitMaximumMinorUnits:
      form.projectedDistributionMaximum === ''
        ? undefined
        : Math.round(Number(form.projectedDistributionMaximum) * 100),
    termType: form.termType,
    durationValue:
      form.termType === 'FIXED_TERM' ? numberOrUndefined(form.durationValue) : undefined,
    durationUnit: form.termType === 'FIXED_TERM' ? form.durationUnit : undefined,
    durationMonths:
      form.termType === 'FIXED_TERM' && form.durationUnit === 'MONTHS'
        ? numberOrUndefined(form.durationValue)
        : undefined,
    capitalExitDescription: form.capitalExitDescription.trim() || undefined,
    projectionDisclaimer: form.projectionDisclaimer.trim() || undefined,
    projectedReturnRatePercent: numberOrUndefined(form.returnRate),
    returnSchedule: form.returnSchedule,
    rolloverAllowed: form.rolloverAllowed,
    rolloverCompoundsReturns: false,
    memberAvailabilityDate: form.memberAvailabilityDate || undefined,
    offerClosesAt: form.offerClosesAt || undefined,
    commencementDate: form.commencementDate || undefined,
    assetLifecycleEnabled: form.assetLifecycleEnabled,
    assetLifecycleStatus: form.assetLifecycleEnabled ? form.assetLifecycleStatus : undefined,
    fundingClosedAt: form.fundingClosedAt || undefined,
    assetAcquiredAt: form.assetAcquiredAt || undefined,
    operationalAt: form.operationalAt || undefined,
    distributionStartAt: form.distributionStartAt || undefined,
    expectedActivationMinDays: numberOrUndefined(form.expectedActivationMinDays),
    expectedActivationMaxDays: numberOrUndefined(form.expectedActivationMaxDays),
    currentMilestone: form.currentMilestone.trim() || undefined,
    nextMilestone: form.nextMilestone.trim() || undefined,
    location: form.location.trim(),
    imageUrl: form.imageUrl || undefined,
    imageKey: form.imageKey || undefined,
    imageWidth: form.imageWidth,
    imageHeight: form.imageHeight,
    imageAlt: form.imageAlt.trim(),
    interestModeEnabled: form.interestModeEnabled,
    interestCurrency: form.interestCurrency,
    interestTargetAmount: numberOrUndefined(form.interestTargetAmount),
    showInterestProgress: form.interestModeEnabled,
    collectOpeningCapital: form.interestModeEnabled,
    collectRecurringAmount: form.interestModeEnabled,
    recurringFrequency: form.interestModeEnabled ? 'monthly' : null,
    collectCapitalReadiness: form.interestModeEnabled,
    interestAcknowledgementText: form.interestAcknowledgementText.trim(),
    interestAcknowledgementVersion: 'v1',
    interestQuestions: form.interestModeEnabled
      ? form.interestQuestions.map((question) => ({
          ...question,
          label: question.label.trim(),
          options: question.options.map((option) => option.trim()),
        }))
      : [],
    status,
  });

  async function save(status: 'DRAFT' | 'PUBLISHED' | 'INTEREST_OPEN' | 'INTEREST_CLOSED') {
    if (!form.title.trim() || !form.category.trim() || !form.summary.trim())
      return notify.error('Title, category and summary are required.');
    if (
      form.interestModeEnabled &&
      form.interestQuestions.some(
        (question) =>
          !question.label.trim() ||
          question.options.some((option) => !option.trim()) ||
          question.options.length < 2 ||
          new Set(question.options.map((option) => option.trim().toLowerCase()).filter(Boolean))
            .size !== question.options.length,
      )
    )
      return notify.error('Each custom question needs a title and at least two unique options.');
    const amountQuestions = form.interestQuestions.filter(
      (question) => question.purpose === 'participation_amount',
    );
    if (
      form.interestModeEnabled &&
      (amountQuestions.length > 1 ||
        amountQuestions.some(
          (question) =>
            !question.required ||
            question.amountOptions?.length !== question.options.length ||
            question.amountOptions.some(
              (option) =>
                option.amount !== null &&
                (!Number.isSafeInteger(option.amount) || option.amount <= 0),
            ) ||
            question.amountOptions.filter((option) => option.amount === null).length > 1,
        ))
    )
      return notify.error(
        'Configure one required amount question with a numeric value for each fixed option.',
      );
    if (status === 'PUBLISHED') {
      if (
        !form.memberAvailabilityDate ||
        !form.offerClosesAt ||
        (!form.assetLifecycleEnabled && !form.commencementDate)
      )
        return notify.error(
          'Offer open and offer close dates are required. Non-asset deals also require a deal start date.',
        );
      if (form.offerClosesAt <= form.memberAvailabilityDate)
        return notify.error('Offer close date must be after the offer open date.');
      if (form.commencementDate && form.commencementDate < form.offerClosesAt)
        return notify.error('Deal start date must be on or after the offer close date.');
    }
    setSaving(true);
    try {
      if (opportunityId) await opportunityService.update(opportunityId, revision, payload(status));
      else await opportunityService.create(payload(status));
      // Prevent a queued persistence effect from recreating the just-saved draft
      // before navigation completes (more visible on slower production networks).
      suppressDraftPersistence.current = true;
      window.localStorage.removeItem(draftKey);
      setIsDirty(false);
      notify.success(
        opportunityId
          ? 'Opportunity updated.'
          : status === 'PUBLISHED'
            ? 'Opportunity published.'
            : 'Draft saved.',
      );
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
      setIsDirty(true);
      notify.success('Image optimized and uploaded.');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : 'Unable to upload image');
    } finally {
      setUploading(false);
    }
  }

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    suppressDraftPersistence.current = false;
    setIsDirty(true);
    setForm((current) => ({ ...current, [key]: value }));
  };

  const discardLocalDraft = (): void => {
    suppressDraftPersistence.current = true;
    window.localStorage.removeItem(draftKey);
    setIsDirty(false);
    window.location.reload();
  };
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
      <div>
        <div className="sticky top-16 z-20 -mx-5 mb-6 border-b bg-background/95 px-5 py-4 shadow-sm backdrop-blur lg:-mx-10 lg:px-10">
          <div className="mx-auto max-w-6xl">
            <nav className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Link href="/opportunities">Opportunities</Link>
              <MdChevronRight />
              <span>{opportunityId ? 'Edit' : 'New'}</span>
            </nav>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold">{form.title || 'Untitled opportunity'}</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Fields marked * are required to save. Publishing requires complete member-facing
                  details.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {isDirty
                    ? 'Your changes are saved locally on this device.'
                    : 'Draft recovery is ready for any changes you make.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {isDirty ? (
                  <button
                    type="button"
                    onClick={discardLocalDraft}
                    className="rounded-xl border px-4 py-2 text-sm font-semibold text-muted-foreground"
                  >
                    Discard local changes
                  </button>
                ) : null}
                {opportunityId && (
                  <Link
                    href={`/opportunities/${opportunityId}/delete`}
                    className="flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-600"
                  >
                    <MdDeleteOutline /> Delete
                  </Link>
                )}
                {currentStatus !== 'DRAFT' ? (
                  <button
                    disabled={saving}
                    onClick={() => save(currentStatus)}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? 'Saving opportunity…' : 'Save opportunity'}
                  </button>
                ) : (
                  <>
                    <button
                      disabled={saving}
                      onClick={() => save('DRAFT')}
                      className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Saving draft…' : 'Save draft'}
                    </button>
                    <button
                      disabled={saving}
                      onClick={() => save('PUBLISHED')}
                      className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saving ? 'Publishing…' : 'Publish opportunity'}
                    </button>
                  </>
                )}
                {form.interestModeEnabled ? (
                  <button
                    disabled={saving}
                    onClick={() => save('INTEREST_OPEN')}
                    className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground"
                  >
                    Open interest
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]">
          <div className="grid gap-4">
            {loadedOpportunity && !form.assetLifecycleEnabled ? (
              <ExecutionProgressPanel
                opportunity={loadedOpportunity}
                onUpdated={(value) => {
                  setLoadedOpportunity(value);
                  setRevision(value.revision);
                }}
              />
            ) : null}
            <Section
              title="Opportunity details"
              description="What members see before they decide to participate."
            >
              <Field label="Opportunity title *" wide>
                <input
                  className={inputClass}
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                />
              </Field>
              <Field label="Sector / industry *">
                <input
                  className={inputClass}
                  value={form.category}
                  onChange={(e) => set('category', e.target.value)}
                  placeholder="e.g. Agriculture, Property, Logistics"
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
                  placeholder={
                    '# Member agreement\n\nUse headings, bullet lists, **bold text**, and normal paragraphs. Members see a short preview and can open the complete agreement.'
                  }
                />
              </Field>
              <Field label="Downloadable agreement resource (optional)">
                <input
                  type="url"
                  className={inputClass}
                  value={form.agreementResourceUrl}
                  onChange={(e) => set('agreementResourceUrl', e.target.value)}
                  placeholder="https://…/agreement.pdf"
                />
              </Field>
            </Section>
            <Section
              title="Commercial terms"
              description="Use the agreed unit price and return terms."
            >
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
              <Field label="Member-funded units">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.totalUnits}
                  onChange={(e) => set('totalUnits', e.target.value)}
                />
              </Field>
              <Field label="Opportunity structure">
                <select
                  className={inputClass}
                  value={form.opportunityStructure}
                  onChange={(e) =>
                    set('opportunityStructure', e.target.value as OpportunityStructure)
                  }
                >
                  <option value="CO_OWNERSHIP">Co-ownership</option>
                  <option value="CO_FUNDING">Co-funding</option>
                  <option value="FULL_OWNERSHIP">Full ownership</option>
                </select>
              </Field>
              <Field label="Sponsor / sweat-equity units">
                <input
                  type="number"
                  min="0"
                  className={inputClass}
                  value={form.sponsorUnits}
                  onChange={(e) => set('sponsorUnits', e.target.value)}
                />
              </Field>
              <Field label="Maximum units per member">
                <input
                  type="number"
                  min="1"
                  className={inputClass}
                  value={form.maximumUnitsPerMember}
                  onChange={(e) => set('maximumUnitsPerMember', e.target.value)}
                />
              </Field>
              <Field label="Return model">
                <select
                  className={inputClass}
                  value={form.returnModel}
                  onChange={(e) => set('returnModel', e.target.value as ReturnModel)}
                >
                  <option value="PROFIT_SHARING_VARIABLE">Profit sharing — variable</option>
                  <option value="REVENUE_SHARING_VARIABLE">Revenue sharing — variable</option>
                  <option value="PROJECTED_MONTHLY_RETURN">Projected monthly return</option>
                  <option value="CAPITAL_APPRECIATION">Capital appreciation</option>
                  <option value="HYBRID">Hybrid</option>
                  <option value="NO_PERIODIC_INCOME">No periodic income</option>
                </select>
              </Field>
              <Field label="Projection type">
                <select
                  className={inputClass}
                  value={form.projectionType}
                  onChange={(e) => set('projectionType', e.target.value as ProjectionType)}
                >
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="AMOUNT">Amount</option>
                  <option value="RANGE">Amount range</option>
                  <option value="PERCENTAGE_RANGE">Percentage range</option>
                  <option value="AMOUNT_AND_PERCENTAGE_RANGE">Amount + percentage range</option>
                  <option value="NOT_APPLICABLE">Not applicable</option>
                </select>
              </Field>
              {['AMOUNT', 'RANGE', 'AMOUNT_AND_PERCENTAGE_RANGE'].includes(form.projectionType) ? (
                <>
                  <Field label="Projected distribution per unit (NGN)">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.projectedDistribution}
                      onChange={(e) => set('projectedDistribution', e.target.value)}
                    />
                  </Field>
                  <Field label="Projected minimum per unit (NGN)">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.projectedDistributionMinimum}
                      onChange={(e) => set('projectedDistributionMinimum', e.target.value)}
                    />
                  </Field>
                  <Field label="Projected maximum per unit (NGN)">
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.projectedDistributionMaximum}
                      onChange={(e) => set('projectedDistributionMaximum', e.target.value)}
                    />
                  </Field>
                </>
              ) : null}
              <Field label="Term type">
                <select
                  className={inputClass}
                  value={form.termType}
                  onChange={(e) => set('termType', e.target.value as TermType)}
                >
                  <option value="FIXED_TERM">Fixed term</option>
                  <option value="LIFE_OF_ASSET">Life of asset / open-ended</option>
                </select>
              </Field>
              {form.termType === 'FIXED_TERM' && (
                <>
                  <Field label="Duration (months)">
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.durationValue}
                      onChange={(e) => set('durationValue', e.target.value)}
                    />
                  </Field>
                  <Field label="Duration unit">
                    <select
                      className={inputClass}
                      value={form.durationUnit}
                      onChange={(e) => set('durationUnit', e.target.value as DurationUnit)}
                    >
                      <option value="DAYS">Days</option>
                      <option value="MONTHS">Months</option>
                      <option value="YEARS">Years</option>
                    </select>
                  </Field>
                </>
              )}
              <Field
                label="Capital return terms"
                hint={
                  form.termType === 'LIFE_OF_ASSET'
                    ? 'Explain the qualifying event that returns members’ capital. This is shown to members.'
                    : 'Optional context shown alongside the fixed-term principal return date.'
                }
                wide
              >
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  value={form.capitalExitDescription}
                  onChange={(e) => set('capitalExitDescription', e.target.value)}
                  placeholder={
                    form.termType === 'LIFE_OF_ASSET'
                      ? 'Capital is returned upon sale of the truck or another qualifying exit event.'
                      : 'Capital is returned at the end of the fixed term.'
                  }
                />
              </Field>
              {['PERCENTAGE', 'PERCENTAGE_RANGE', 'AMOUNT_AND_PERCENTAGE_RANGE'].includes(
                form.projectionType,
              ) && (
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
              )}
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
              <Field
                label="Projection disclaimer"
                hint="Explain that projected distributions are estimates, not guaranteed returns."
                wide
              >
                <textarea
                  className={`${inputClass} min-h-20 resize-y`}
                  value={form.projectionDisclaimer}
                  onChange={(e) => set('projectionDisclaimer', e.target.value)}
                />
              </Field>
              <Field label="Location">
                <input
                  className={inputClass}
                  value={form.location}
                  onChange={(e) => set('location', e.target.value)}
                />
              </Field>
              <Field
                label="Offer opens"
                hint="Members can discover and own this opportunity from this date."
              >
                <input
                  type="date"
                  className={inputClass}
                  value={form.memberAvailabilityDate}
                  onChange={(e) => set('memberAvailabilityDate', e.target.value)}
                />
              </Field>
              <Field
                label="Offer closes"
                hint="Members cannot own this opportunity after this date."
              >
                <input
                  type="date"
                  className={inputClass}
                  value={form.offerClosesAt}
                  onChange={(e) => set('offerClosesAt', e.target.value)}
                />
              </Field>
              <Field
                label="Deal start date"
                hint="The deal begins and the monthly return schedule starts from this date."
              >
                <input
                  type="date"
                  className={inputClass}
                  value={form.commencementDate}
                  onChange={(e) => set('commencementDate', e.target.value)}
                />
              </Field>
            </Section>
            <Section
              title="Asset lifecycle"
              description="Use this for physical assets that become operational after funding closes."
            >
              <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.assetLifecycleEnabled}
                  onChange={(e) => set('assetLifecycleEnabled', e.target.checked)}
                />
                Enable asset lifecycle and activation-gated distributions
              </label>
              {form.assetLifecycleEnabled ? (
                <>
                  <Field label="Current lifecycle stage">
                    <select
                      className={inputClass}
                      value={form.assetLifecycleStatus}
                      onChange={(e) =>
                        set(
                          'assetLifecycleStatus',
                          e.target.value as FormState['assetLifecycleStatus'],
                        )
                      }
                    >
                      <option value="FUNDING">Funding</option>
                      <option value="ACQUISITION_IN_PROGRESS">Acquisition in progress</option>
                      <option value="ASSET_ACQUIRED">Asset acquired</option>
                      <option value="COMPLIANCE_IN_PROGRESS">Compliance in progress</option>
                      <option value="OPERATOR_SETUP">Operator / lease setup</option>
                      <option value="OPERATIONAL">Operational</option>
                      <option value="DISTRIBUTIONS_ACTIVE">Distributions active</option>
                      <option value="ASSET_SOLD">Asset sold</option>
                    </select>
                  </Field>
                  <Field label="Funding closed">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.fundingClosedAt}
                      onChange={(e) => set('fundingClosedAt', e.target.value)}
                    />
                  </Field>
                  <Field label="Asset acquired">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.assetAcquiredAt}
                      onChange={(e) => set('assetAcquiredAt', e.target.value)}
                    />
                  </Field>
                  <Field label="Operational since">
                    <input
                      type="date"
                      className={inputClass}
                      value={form.operationalAt}
                      onChange={(e) => set('operationalAt', e.target.value)}
                    />
                  </Field>
                  <Field
                    label="Distribution start"
                    hint="Saving this date creates the same earnings schedule for every owner."
                  >
                    <input
                      type="date"
                      className={inputClass}
                      value={form.distributionStartAt}
                      onChange={(e) => set('distributionStartAt', e.target.value)}
                    />
                  </Field>
                  <Field label="Expected activation minimum days">
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.expectedActivationMinDays}
                      onChange={(e) => set('expectedActivationMinDays', e.target.value)}
                    />
                  </Field>
                  <Field label="Expected activation maximum days">
                    <input
                      type="number"
                      min="1"
                      className={inputClass}
                      value={form.expectedActivationMaxDays}
                      onChange={(e) => set('expectedActivationMaxDays', e.target.value)}
                    />
                  </Field>
                  <Field label="Current milestone" wide>
                    <input
                      className={inputClass}
                      value={form.currentMilestone}
                      onChange={(e) => set('currentMilestone', e.target.value)}
                    />
                  </Field>
                  <Field label="Next milestone" wide>
                    <input
                      className={inputClass}
                      value={form.nextMilestone}
                      onChange={(e) => set('nextMilestone', e.target.value)}
                    />
                  </Field>
                </>
              ) : null}
            </Section>
            {opportunityId && form.assetLifecycleEnabled ? (
              <OpportunityUpdatesPanel opportunityId={opportunityId} />
            ) : null}
            <Section
              title="Interest / pre-launch"
              description="Use this for opportunities that gather interest before funding opens."
            >
              <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
                <input
                  type="checkbox"
                  checked={form.interestModeEnabled}
                  onChange={(e) => set('interestModeEnabled', e.target.checked)}
                />
                Enable interest stage
              </label>
              {form.interestModeEnabled ? (
                <>
                  <Field label="Interest currency">
                    <select
                      className={inputClass}
                      value={form.interestCurrency}
                      onChange={(e) =>
                        set('interestCurrency', e.target.value as 'NGN' | 'GBP' | 'USD')
                      }
                    >
                      <option value="NGN">Nigerian naira (NGN)</option>
                      <option value="GBP">British pound (GBP)</option>
                      <option value="USD">US dollar (USD)</option>
                    </select>
                  </Field>
                  <Field label={`Interest target amount (${form.interestCurrency})`}>
                    <input
                      type="number"
                      min="0"
                      className={inputClass}
                      value={form.interestTargetAmount}
                      onChange={(e) => set('interestTargetAmount', e.target.value)}
                      placeholder="100000000"
                    />
                  </Field>
                  <Field label="Interest acknowledgement" wide>
                    <textarea
                      className={`${inputClass} min-h-20 resize-y`}
                      value={form.interestAcknowledgementText}
                      onChange={(e) => set('interestAcknowledgementText', e.target.value)}
                    />
                  </Field>
                  <div className="rounded-xl border p-4 sm:col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">Custom interest questions</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          When added, these replace the standard capital and readiness questions.
                          Mark one question as the participation amount to include it in progress.
                        </p>
                      </div>
                      <button
                        type="button"
                        className="rounded-lg border px-3 py-2 text-xs font-semibold"
                        onClick={() =>
                          set('interestQuestions', [
                            ...form.interestQuestions,
                            {
                              id: crypto.randomUUID(),
                              label: '',
                              options: ['', ''],
                              required: true,
                            },
                          ])
                        }
                      >
                        Add question
                      </button>
                    </div>
                    <div className="mt-4 grid gap-4">
                      {form.interestQuestions.map((question, questionIndex) => (
                        <div key={question.id} className="rounded-xl bg-muted/30 p-4">
                          <div className="flex gap-2">
                            <input
                              className={`${inputClass} flex-1`}
                              value={question.label}
                              maxLength={240}
                              placeholder="Question, e.g. Which type of store would you prefer?"
                              onChange={(event) =>
                                set(
                                  'interestQuestions',
                                  form.interestQuestions.map((item, index) =>
                                    index === questionIndex
                                      ? { ...item, label: event.target.value }
                                      : item,
                                  ),
                                )
                              }
                            />
                            <button
                              type="button"
                              className="rounded-lg border px-3 text-xs font-semibold text-red-600"
                              onClick={() =>
                                set(
                                  'interestQuestions',
                                  form.interestQuestions.filter(
                                    (_, index) => index !== questionIndex,
                                  ),
                                )
                              }
                            >
                              Remove
                            </button>
                          </div>
                          <label className="mt-3 flex items-center gap-2 text-xs font-semibold">
                            <input
                              type="checkbox"
                              checked={question.purpose === 'participation_amount'}
                              onChange={(event) =>
                                set(
                                  'interestQuestions',
                                  form.interestQuestions.map((item, index) =>
                                    index === questionIndex
                                      ? {
                                          ...item,
                                          required: event.target.checked ? true : item.required,
                                          purpose: event.target.checked
                                            ? 'participation_amount'
                                            : null,
                                          amountOptions: event.target.checked
                                            ? item.options.map(suggestAmountOption)
                                            : [],
                                        }
                                      : item,
                                  ),
                                )
                              }
                            />
                            This question asks how much the member may participate with (
                            {form.interestCurrency})
                          </label>
                          <div className="mt-3 grid gap-2">
                            {question.options.map((option, optionIndex) => (
                              <div
                                className="flex flex-wrap gap-2"
                                key={`${question.id}-${optionIndex}`}
                              >
                                <input
                                  className={`${inputClass} min-w-48 flex-1`}
                                  value={option}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  onChange={(event) =>
                                    set(
                                      'interestQuestions',
                                      form.interestQuestions.map((item, index) =>
                                        index === questionIndex
                                          ? {
                                              ...item,
                                              options: item.options.map((value, currentIndex) =>
                                                currentIndex === optionIndex
                                                  ? event.target.value
                                                  : value,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                />
                                {question.purpose === 'participation_amount' ? (
                                  <>
                                    <input
                                      type="number"
                                      min="1"
                                      aria-label={`Amount for ${option || `option ${optionIndex + 1}`}`}
                                      placeholder="Amount; blank = custom"
                                      className={`${inputClass} w-44`}
                                      value={question.amountOptions?.[optionIndex]?.amount ?? ''}
                                      onChange={(event) =>
                                        set(
                                          'interestQuestions',
                                          form.interestQuestions.map((item, index) =>
                                            index === questionIndex
                                              ? {
                                                  ...item,
                                                  amountOptions: item.options.map(
                                                    (_, currentIndex) =>
                                                      currentIndex === optionIndex
                                                        ? {
                                                            amount: event.target.value
                                                              ? Number(event.target.value)
                                                              : null,
                                                            minimum: event.target.value
                                                              ? (item.amountOptions?.[currentIndex]
                                                                  ?.minimum ?? false)
                                                              : false,
                                                          }
                                                        : (item.amountOptions?.[currentIndex] ?? {
                                                            amount: null,
                                                            minimum: false,
                                                          }),
                                                  ),
                                                }
                                              : item,
                                          ),
                                        )
                                      }
                                    />
                                    <label className="flex items-center gap-1 text-xs">
                                      <input
                                        type="checkbox"
                                        disabled={
                                          question.amountOptions?.[optionIndex]?.amount == null
                                        }
                                        checked={
                                          question.amountOptions?.[optionIndex]?.minimum ?? false
                                        }
                                        onChange={(event) =>
                                          set(
                                            'interestQuestions',
                                            form.interestQuestions.map((item, index) =>
                                              index === questionIndex
                                                ? {
                                                    ...item,
                                                    amountOptions: item.options.map(
                                                      (_, currentIndex) =>
                                                        currentIndex === optionIndex
                                                          ? {
                                                              amount:
                                                                item.amountOptions?.[currentIndex]
                                                                  ?.amount ?? null,
                                                              minimum: event.target.checked,
                                                            }
                                                          : (item.amountOptions?.[currentIndex] ?? {
                                                              amount: null,
                                                              minimum: false,
                                                            }),
                                                    ),
                                                  }
                                                : item,
                                            ),
                                          )
                                        }
                                      />
                                      Minimum (+)
                                    </label>
                                  </>
                                ) : null}
                                <button
                                  type="button"
                                  disabled={question.options.length <= 2}
                                  className="rounded-lg border px-3 text-xs disabled:opacity-40"
                                  onClick={() =>
                                    set(
                                      'interestQuestions',
                                      form.interestQuestions.map((item, index) =>
                                        index === questionIndex
                                          ? {
                                              ...item,
                                              options: item.options.filter(
                                                (_, currentIndex) => currentIndex !== optionIndex,
                                              ),
                                              amountOptions: item.amountOptions?.filter(
                                                (_, currentIndex) => currentIndex !== optionIndex,
                                              ),
                                            }
                                          : item,
                                      ),
                                    )
                                  }
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <label className="flex items-center gap-2 text-xs">
                              <input
                                type="checkbox"
                                disabled={question.purpose === 'participation_amount'}
                                checked={question.required}
                                onChange={(event) =>
                                  set(
                                    'interestQuestions',
                                    form.interestQuestions.map((item, index) =>
                                      index === questionIndex
                                        ? { ...item, required: event.target.checked }
                                        : item,
                                    ),
                                  )
                                }
                              />{' '}
                              Required
                            </label>
                            <button
                              type="button"
                              disabled={question.options.length >= 12}
                              className="rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-40"
                              onClick={() =>
                                set(
                                  'interestQuestions',
                                  form.interestQuestions.map((item, index) =>
                                    index === questionIndex
                                      ? {
                                          ...item,
                                          options: [...item.options, ''],
                                          amountOptions:
                                            item.purpose === 'participation_amount'
                                              ? [
                                                  ...(item.amountOptions ?? []),
                                                  { amount: null, minimum: false },
                                                ]
                                              : item.amountOptions,
                                        }
                                      : item,
                                  ),
                                )
                              }
                            >
                              Add option
                            </button>
                          </div>
                        </div>
                      ))}
                      {!form.interestQuestions.length ? (
                        <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                          No custom questions. Members will see the standard interest questions.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : null}
            </Section>
            <Section
              title="Member profit rollover"
              description="Enable this only when members may choose to add approved monthly profit to their contribution."
            >
              <label className="flex gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={form.rolloverAllowed}
                  onChange={(e) => set('rolloverAllowed', e.target.checked)}
                />
                Let members choose whether approved monthly profit is paid to their wallet or rolled
                into their contribution
              </label>
            </Section>
            <Section
              title="Cover image"
              description="One optimised image used across the member app."
            >
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
                  {form.category || 'Sector / industry'}
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
                  value={(form.returnSchedule ?? 'MONTHLY').replaceAll('_', ' ').toLowerCase()}
                />
                <Fact
                  label="Duration"
                  value={
                    form.termType === 'LIFE_OF_ASSET'
                      ? 'Life of asset'
                      : form.durationValue
                        ? `${form.durationValue} ${(form.durationUnit ?? 'MONTHS').toLowerCase()}`
                        : '—'
                  }
                />
                {projection.monthly != null && (
                  <Fact label="Projected monthly profit" value={money(projection.monthly)} />
                )}
              </div>
              {form.about && <PreviewText title="About" text={form.about} />}{' '}
              {form.agreement && <PreviewText title="Agreement" text={form.agreement} />}{' '}
              {projection.nextPrincipal != null && (
                <div className="rounded-xl bg-brand/5 p-4 text-sm">
                  <p className="font-semibold">Member rollover illustration</p>
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
  hint,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`grid gap-1.5 text-sm font-medium ${wide ? 'sm:col-span-2' : ''}`}>
      <span>{label}</span>
      {hint ? (
        <span className="-mt-1 text-xs font-normal text-muted-foreground">{hint}</span>
      ) : null}
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

function suggestAmountOption(label: string): { amount: number | null; minimum: boolean } {
  const match = label.match(/\d[\d,]*(?:\.\d+)?/);
  const amount = match ? Number(match[0].replaceAll(',', '')) : null;
  return {
    amount: amount && Number.isSafeInteger(amount) ? amount : null,
    minimum: label.includes('+'),
  };
}
