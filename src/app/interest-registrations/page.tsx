'use client';

import { ChevronDown, ChevronUp, Download, UsersRound } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import {
  opportunityService,
  type OpportunityInterestRegistration,
} from '@/lib/services/opportunity-service';

export default function InterestRegistrationsPage(): React.JSX.Element {
  const [items, setItems] = useState<OpportunityInterestRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  useEffect(() => {
    void opportunityService
      .interests()
      .then(setItems)
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Could not load registrations'),
      )
      .finally(() => setLoading(false));
  }, []);
  const opportunities = useMemo(
    () =>
      Array.from(
        new Map(items.map((item) => [item.opportunityId._id, item.opportunityId])).values(),
      ).sort((left, right) => left.title.localeCompare(right.title)),
    [items],
  );
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          (!opportunityId || item.opportunityId._id === opportunityId) &&
          `${item.userId.name} ${item.userId.email} ${item.opportunityId.title}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [items, opportunityId, query],
  );
  const summaries = useMemo(() => {
    const byCurrency = new Map<
      string,
      { total: number; members: number; unknown: number; minimum: number }
    >();
    for (const item of visible) {
      if (item.status !== 'interest_registered' && item.status !== 'invited') continue;
      const currency = item.currency ?? item.opportunityId.interestCurrency ?? 'NGN';
      const summary = byCurrency.get(currency) ?? { total: 0, members: 0, unknown: 0, minimum: 0 };
      summary.members += 1;
      if (item.participationAmount == null) summary.unknown += 1;
      else summary.total += item.participationAmount;
      if (item.participationAmountKind === 'minimum') summary.minimum += 1;
      byCurrency.set(currency, summary);
    }
    return [...byCurrency.entries()];
  }, [visible]);
  const download = () => {
    const rows = [
      [
        'Member',
        'Email',
        'Phone',
        'Opportunity',
        'Currency',
        'Indicative participation',
        'Amount type',
        'Status',
        'Opening capital',
        'Monthly commitment',
        'Readiness',
        'Custom answers',
        'Registered',
      ],
      ...visible.map((item) => [
        item.userId.name,
        item.userId.email,
        item.userId.phone ?? '',
        item.opportunityId.title,
        item.currency ?? item.opportunityId.interestCurrency ?? 'NGN',
        item.participationAmount == null ? '' : String(item.participationAmount),
        item.participationAmountKind ?? '',
        item.status,
        item.answers?.length ? '' : String(item.openingCapital),
        item.answers?.length || item.recurringAmount == null ? '' : String(item.recurringAmount),
        !item.answers?.length && item.capitalReadiness ? label(item.capitalReadiness) : '',
        (item.answers ?? [])
          .map(
            (answer) =>
              `${answer.question}: ${answer.answer}${answer.customAmount ? ` (${money(answer.customAmount, item.currency)})` : ''}`,
          )
          .join(' | '),
        new Date(item.createdAt).toLocaleString('en-NG'),
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.map((row) => row.map(csv).join(',')).join('\n')], { type: 'text/csv' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'playtives-interest-registrations.csv';
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <DashboardShell
      title="Interest Registrations"
      description="Members who have expressed interest in pre-launch opportunities."
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Interest registrations</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {items.length} total member expression{items.length === 1 ? '' : 's'} of interest.
            </p>
          </div>
          <button
            onClick={download}
            disabled={!visible.length}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-50"
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <select
            value={opportunityId}
            onChange={(event) => setOpportunityId(event.target.value)}
            aria-label="Filter by opportunity"
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand"
          >
            <option value="">All interest opportunities ({items.length})</option>
            {opportunities.map((opportunity) => (
              <option key={opportunity._id} value={opportunity._id}>
                {opportunity.title} (
                {items.filter((item) => item.opportunityId._id === opportunity._id).length})
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search member, email, or opportunity"
            className="w-full rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand"
          />
        </div>
        {summaries.length ? (
          <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summaries.map(([currency, summary]) => (
              <div key={currency} className="rounded-xl border bg-background p-4">
                <p className="text-xs font-semibold text-muted-foreground">
                  {currency} · {summary.members} active registrations
                </p>
                <p className="mt-1 text-lg font-bold text-brand">
                  {summary.unknown === summary.members
                    ? 'Amounts not yet available'
                    : `${summary.minimum || summary.unknown ? 'At least ' : ''}${money(summary.total, currency as 'NGN' | 'GBP' | 'USD')}`}
                </p>
                {summary.unknown ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {summary.unknown} without a specified amount
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {loading ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Loading registrations…</p>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            <UsersRound className="mx-auto mb-3 size-7" />
            No matching interest registrations.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border bg-background">
            <div className="divide-y lg:hidden">
              {visible.map((item) => (
                <div key={item._id} className="p-4">
                  <p className="font-semibold">{item.userId.name}</p>
                  <p className="break-all text-xs text-muted-foreground">{item.userId.email}</p>
                  <p className="mt-2 text-sm">{item.opportunityId.title}</p>
                  <p className="mt-2 font-semibold text-brand">{participationLabel(item)}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{statusLabel(item.status)}</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand"
                    onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                    aria-expanded={expandedId === item._id}
                  >
                    {expandedId === item._id ? 'Hide answers' : 'View answers'}
                    {expandedId === item._id ? (
                      <ChevronUp className="size-4" />
                    ) : (
                      <ChevronDown className="size-4" />
                    )}
                  </button>
                  {expandedId === item._id ? <RegistrationDetails item={item} /> : null}
                </div>
              ))}
            </div>
            <table className="hidden w-full table-fixed text-left text-sm lg:table">
              <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {[
                    'Member',
                    'Opportunity',
                    'Indicative amount',
                    'Status',
                    'Registered',
                    'Details',
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-3 font-semibold">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <Fragment key={item._id}>
                    <tr className="border-b align-top last:border-0">
                      <td className="min-w-0 px-4 py-4">
                        <p className="font-semibold">{item.userId.name}</p>
                        <p className="mt-1 break-all text-xs text-muted-foreground">
                          {item.userId.email}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-medium">{item.opportunityId.title}</td>
                      <td className="px-4 py-4 font-semibold text-brand">
                        {participationLabel(item)}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {statusLabel(item.status)}
                      </td>
                      <td className="px-4 py-4 text-xs text-muted-foreground">
                        {new Date(item.createdAt).toLocaleString('en-NG')}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-brand"
                          onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                          aria-expanded={expandedId === item._id}
                        >
                          {expandedId === item._id ? 'Hide' : 'View'}
                          {expandedId === item._id ? (
                            <ChevronUp className="size-4" />
                          ) : (
                            <ChevronDown className="size-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                    {expandedId === item._id ? (
                      <tr className="border-b bg-muted/20">
                        <td colSpan={6} className="p-4">
                          <RegistrationDetails item={item} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
function RegistrationDetails({
  item,
}: {
  item: OpportunityInterestRegistration;
}): React.JSX.Element {
  return (
    <div className="grid gap-4 text-sm sm:grid-cols-2">
      <div>
        <p className="text-xs text-muted-foreground">Registered</p>
        <p>{new Date(item.createdAt).toLocaleString('en-NG')}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Currency</p>
        <p>{item.currency ?? item.opportunityId.interestCurrency ?? 'NGN'}</p>
      </div>
      {!item.answers?.length ? (
        <div>
          <p className="text-xs text-muted-foreground">Opening capital</p>
          <p>{money(item.openingCapital, item.currency)}</p>
        </div>
      ) : null}
      {!item.answers?.length && item.recurringAmount != null ? (
        <div>
          <p className="text-xs text-muted-foreground">Monthly commitment</p>
          <p>{money(item.recurringAmount, item.currency)}</p>
        </div>
      ) : null}
      {!item.answers?.length && item.capitalReadiness ? (
        <div>
          <p className="text-xs text-muted-foreground">Readiness</p>
          <p>{label(item.capitalReadiness)}</p>
        </div>
      ) : null}
      {(item.answers ?? [])
        .filter((answer) => answer.answer)
        .map((answer) => (
          <div key={answer.questionId} className="min-w-0">
            <p className="break-words text-xs text-muted-foreground">{answer.question}</p>
            <p className="break-words font-medium">
              {answer.answer}
              {answer.customAmount ? ` · ${money(answer.customAmount, item.currency)}` : ''}
            </p>
          </div>
        ))}
    </div>
  );
}
function participationLabel(item: OpportunityInterestRegistration): string {
  if (item.participationAmount == null) return 'Not specified';
  return `${item.participationAmountKind === 'minimum' ? 'At least ' : ''}${money(item.participationAmount, item.currency)}`;
}
function statusLabel(status: string): string {
  return status === 'interest_registered'
    ? 'Registered'
    : status === 'invited'
      ? 'Invited'
      : status === 'converted'
        ? 'Converted'
        : status === 'withdrawn'
          ? 'Withdrawn'
          : status;
}
function money(value: number, currency: 'NGN' | 'GBP' | 'USD' = 'NGN'): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}
function label(value: OpportunityInterestRegistration['capitalReadiness']): string {
  return value === 'available_now'
    ? 'Available now'
    : value === 'within_7_days'
      ? 'Within 7 days'
      : 'Not sure yet';
}
function csv(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
