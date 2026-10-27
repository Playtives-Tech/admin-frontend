'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Info, X } from 'lucide-react';
import { DashboardShell } from '@/components/dashboard/shell';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { notify } from '@/lib/notify';
import {
  legacyService,
  type LegacyOpportunity,
  type LegacyPeriod,
  type LegacyPosition,
} from '@/lib/services/legacy-service';

type Member = { _id: string; name: string; email: string; memberCode?: string };
const field =
  'w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-brand';
const button = 'rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50';
const dateOnly = (value: string | null) => (value ? value.slice(0, 10) : '');
const minor = (value: string) => Math.round(Number(value) * 100);
const money = (value: number | null, currency: LegacyOpportunity['currency']) =>
  value == null
    ? 'Unconfirmed'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency }).format(value / 100);
const problem = (error: unknown) =>
  error instanceof Error ? error.message : 'Unable to save legacy record';

const assignmentHelp = {
  member: {
    title: 'Member',
    paragraphs: [
      'Search by name or email, then select the correct Playtives member from the results. Typing a name without selecting a result does not assign anyone.',
      'The selected member must have a member code. That code becomes the source investor ID automatically.',
    ],
  },
  opportunity: {
    title: 'Opportunity',
    paragraphs: [
      'Choose the historical opportunity created in the Opportunity Editor. Its start date, monthly schedule, and total units are shared by every assigned member.',
      'Historical opportunities are owner-only and are not published as open offers.',
    ],
  },
  units: {
    title: 'Units owned',
    paragraphs: [
      'Enter the number of ownership units this member held in the original opportunity. Use your ownership agreement or source records; the investor CSV does not always contain this figure.',
      'Assignments cannot exceed the opportunity’s total available units.',
    ],
  },
  firstCycle: {
    title: 'First participating month',
    paragraphs: [
      'Enter the first opportunity month this member participated in, counting from the opportunity’s shared start date. Month 1 is the first scheduled return month.',
      'For example, a member who joined at the beginning of an eight-month opportunity starts at month 1, even if three months were already paid outside Playtives.',
    ],
  },
  lastCycle: {
    title: 'Last participating month',
    paragraphs: [
      'Enter the final opportunity month covered by this member’s position, not the last month already paid.',
      'For an eight-month position with three past payments and five months still to run, enter month 8. Review months 1–3 as historical payments after saving.',
    ],
  },
  memberCode: {
    title: 'Source investor ID',
    paragraphs: [
      'This is filled automatically from the selected member’s Playtives member code and cannot be edited here.',
      'It identifies the investor in this import. Assign a member code to the user first if this field is empty.',
    ],
  },
  positionId: {
    title: 'Source position ID',
    paragraphs: [
      'Enter a unique identifier for this specific historical investment position, such as the position_id in your source CSV.',
      'If one member held two separate positions, give each its own source position ID so their records remain distinguishable.',
    ],
  },
  principal: {
    title: 'Original principal',
    paragraphs: [
      'Enter the amount originally invested for this position in naira, such as 100000 for ₦100,000. Do not enter kobo or include previously paid profit.',
      'This is an externally funded historical amount. Saving it does not debit or credit a Playtives wallet.',
    ],
  },
  rate: {
    title: 'Return rate',
    paragraphs: [
      'Enter the agreed monthly return percentage if the source terms specify one. For example, enter 2 for a 2% return; the expected return on ₦100,000 is ₦2,000 per month.',
      'Choose either a return rate or a fixed return per period, not both. Actual past payments are recorded separately in the monthly ledger.',
    ],
  },
  fixed: {
    title: 'Fixed return per period',
    paragraphs: [
      'Use this when the agreement specifies a fixed naira return for each month instead of a percentage. Enter naira, not kobo.',
      'Leave the return rate empty when using this field. The amount is an expected return; review actual past payments in the monthly ledger.',
    ],
  },
  preference: {
    title: 'Preference',
    paragraphs: [
      'Pay to account means future approved returns are credited to the member’s Playtives earnings wallet. Roll over means eligible future profit is added to their invested capital instead.',
      'This preference does not change how past external payments are recorded. Select Unknown only while preparing the record; a documented choice is required before activation.',
    ],
  },
  notes: {
    title: 'Source notes',
    paragraphs: [
      'Record where these figures came from, discrepancies, or facts still needing verification. Do not place bank account numbers or other sensitive payment details here.',
      'Past payment amounts, dates, and references are entered against their individual months after the position is saved.',
    ],
  },
  status: {
    title: 'Position status',
    paragraphs: [
      'Unverified means the historical record still needs review. Active means the member has future months remaining. Completed means all participating months have finished. Exited means the member has left and their full capital has been returned.',
      'For three paid months out of an eight-month position with five future months remaining, select Active. Before activation, review every month already due on the opportunity calendar. A completed or exited import also needs the full external capital return recorded.',
    ],
  },
  capital: {
    title: 'Capital returned',
    paragraphs: [
      'Enter only the original invested capital, plus any documented rolled-over profit, that was actually returned to the member outside Playtives. Do not include monthly profit paid to their account; record those payments in the monthly return ledger.',
      'Leave this at 0 while the position remains active. A fully completed or exited import requires the full capital return, its date, and a payment reference before activation. This entry does not credit a Playtives wallet.',
    ],
  },
  capitalDate: {
    title: 'Capital return date',
    paragraphs: [
      'Enter the date the external capital repayment was actually made, based on your bank statement or other source record.',
      'Leave this blank if no capital has been returned. This is not the opportunity end date or a monthly profit payment date.',
    ],
  },
  capitalReference: {
    title: 'Capital return payment reference',
    paragraphs: [
      'Enter the transaction or statement reference that proves the external capital repayment. It is required whenever Capital returned is greater than zero.',
      'Use a traceable reference, but do not enter the member’s bank account number or other sensitive account details.',
    ],
  },
  internalNote: {
    title: 'Internal note',
    paragraphs: [
      'Record the source of the position status, why it changed, and anything still unresolved. This is for the admin audit record, not a monthly payment entry.',
      'Use the monthly return ledger below to record each past payment or rollover separately.',
    ],
  },
  terms: {
    title: 'Correct position terms',
    paragraphs: [
      'Use this section to correct the imported principal, return formula, dates where editable, or future payout preference before activation. Every change requires a reason and is recorded in the audit history.',
      'Already reviewed monthly ledger entries keep their own principal and expected-return snapshots. Correct affected months separately; changing terms here does not rewrite past payments or credit a wallet.',
    ],
  },
  termsPrincipal: {
    title: 'Correct principal',
    paragraphs: [
      'Enter the verified original investment amount in naira, not kobo. This corrects the position total but does not debit or credit a wallet.',
      'It cannot be less than capital already recorded as returned. Existing monthly ledger amounts are not automatically recalculated.',
    ],
  },
  termsRate: {
    title: 'Correct return rate',
    paragraphs: [
      'Enter the verified monthly percentage, such as 2 for 2%. Use either a percentage or a fixed return, not both.',
      'This changes the position terms for remaining months; review past monthly entries separately if their expected amounts were wrong.',
    ],
  },
  termsFixed: {
    title: 'Correct fixed return',
    paragraphs: [
      'Enter the verified fixed return per month in naira if the agreement did not use a percentage. Leave Rate % empty.',
      'This does not automatically replace expected returns already saved in the monthly ledger.',
    ],
  },
  termsDuration: {
    title: 'Duration months',
    paragraphs: [
      'For a position linked to a standard historical opportunity, participation months come from that opportunity and cannot be changed here. This field is read-only.',
      'Older unlinked records may be corrected here before they are linked and activated.',
    ],
  },
  termsStart: {
    title: 'Start date',
    paragraphs: [
      'For a linked historical position, this is when the member’s first participating month begins. Month 1 starts with the opportunity; month 2 starts after month 1 ends. The date is derived from the shared opportunity calendar and cannot be edited for one member.',
      'For an older unlinked record, correct the source date here before linking it to the proper opportunity months.',
    ],
  },
  termsEnd: {
    title: 'End date',
    paragraphs: [
      'For a linked historical position, the end date comes from its last participating opportunity month and is read-only.',
      'For an older unlinked record, this can be corrected before mapping it to the standard opportunity schedule.',
    ],
  },
  termsPreference: {
    title: 'Correct preference',
    paragraphs: [
      'Choose the member’s documented treatment for future approved returns: pay to their Playtives earnings wallet or roll over into invested capital where the opportunity permits it.',
      'Changing this does not rewrite past external payments. Their actual treatment must be recorded month by month in the ledger.',
    ],
  },
  termsReason: {
    title: 'Reason for correction',
    paragraphs: [
      'State why the original terms were wrong and which agreement, statement, or other source confirms the corrected values. A meaningful reason is required for the audit trail.',
      'For example: “Corrected principal to match signed agreement dated 10 June 2026.” Do not include bank account numbers.',
    ],
  },
} as const;

type AssignmentHelpTopic = keyof typeof assignmentHelp;

function AssignmentFieldLabel({
  htmlFor,
  topic,
  children,
  onHelp,
}: {
  htmlFor: string;
  topic: AssignmentHelpTopic;
  children: ReactNode;
  onHelp: (topic: AssignmentHelpTopic) => void;
}): React.JSX.Element {
  return (
    <div className="mb-1 flex items-center gap-1.5 text-sm">
      <label htmlFor={htmlFor}>{children}</label>
      <button
        type="button"
        aria-label={`About ${assignmentHelp[topic].title}`}
        onClick={() => onHelp(topic)}
        className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        <Info className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

function LegacyHelpDialog({
  topic,
  onClose,
}: {
  topic: AssignmentHelpTopic | null;
  onClose: () => void;
}): React.JSX.Element | null {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (topic && dialog.current && !dialog.current.open) dialog.current.showModal();
  }, [topic]);
  if (!topic) return null;
  return (
    <dialog
      ref={dialog}
      aria-labelledby="legacy-help-title"
      onClose={onClose}
      className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/45"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h3 id="legacy-help-title" className="text-lg font-semibold">
            {assignmentHelp[topic].title}
          </h3>
          <button
            type="button"
            aria-label="Close explanation"
            onClick={() => dialog.current?.close()}
            className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-3 space-y-3 text-sm leading-6 text-muted-foreground">
          {assignmentHelp[topic].paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </dialog>
  );
}

export default function LegacyPage(): React.JSX.Element {
  const [opportunities, setOpportunities] = useState<LegacyOpportunity[]>([]);
  const [positions, setPositions] = useState<LegacyPosition[]>([]);
  const [selected, setSelected] = useState<LegacyPosition | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<'assign' | 'records'>('assign');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const refresh = async () => {
    const result = await legacyService.positions({ opportunityId: filter, page, limit: 20 });
    setPositions(result.items);
    setPagination(result.pagination);
    setSelected((current) => result.items.find((item) => item._id === current?._id) ?? null);
  };
  useEffect(() => {
    void legacyService
      .opportunities()
      .then(setOpportunities)
      .catch((error: unknown) => notify.error(problem(error)));
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void legacyService
      .positions({ opportunityId: filter, page, limit: 20 })
      .then((result) => {
        if (!active) return;
        setPositions(result.items);
        setPagination(result.pagination);
        setSelected(null);
      })
      .catch((error: unknown) => {
        if (active) notify.error(problem(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, page]);
  const save = async (task: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await task();
      await refresh();
      notify.success('Legacy record saved');
    } catch (error) {
      notify.error(problem(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <DashboardShell
      title="Legacy Ownerships"
      description="Import external history, then activate remaining months under admin-approved payouts"
    >
      <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        Past payments were made outside Playtives and are recorded without wallet credits. Only verified future months enter the normal distribution approval flow.
      </div>
      <nav
        aria-label="Legacy ownership sections"
        className="mb-6 flex gap-2 rounded-2xl border bg-muted/40 p-1.5"
      >
        <button
          type="button"
          onClick={() => setTab('assign')}
          aria-current={tab === 'assign' ? 'page' : undefined}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'assign' ? 'bg-background text-brand shadow-sm' : 'text-muted-foreground'}`}
        >
          Assign ownership
        </button>
        <button
          type="button"
          onClick={() => setTab('records')}
          aria-current={tab === 'records' ? 'page' : undefined}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'records' ? 'bg-background text-brand shadow-sm' : 'text-muted-foreground'}`}
        >
          Recorded positions ({pagination.totalItems})
        </button>
      </nav>
      {tab === 'assign' && (
        <div className="max-w-3xl space-y-5">
          <div className="rounded-2xl border bg-background p-5 text-sm">
            <h2 className="font-semibold">Choose an opportunity from the editor</h2>
            <p className="mt-1 text-muted-foreground">
              Create historical opportunities in the Opportunity Editor, then select one below.
              These remain separate from live offers.
            </p>
            <Link
              href="/opportunities/legacy/new"
              className="mt-3 inline-flex rounded-xl border border-brand px-4 py-2 font-semibold text-brand hover:bg-brand/5"
            >
              Create historical opportunity
            </Link>
          </div>
          <PositionForm opportunities={opportunities} busy={busy} save={save} />
        </div>
      )}
      {tab === 'records' && (
        <section className="rounded-2xl border bg-background p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Recorded positions</h2>
              <p className="text-sm text-muted-foreground">
                {pagination.totalItems} positions recorded
              </p>
            </div>
            <select
              className={`${field} max-w-72`}
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All legacy opportunities</option>
              {opportunities.map((item) => (
                <option key={item._id} value={item._id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 grid gap-3">
            {positions.map((item) => (
              <button
                key={item._id}
                type="button"
                onClick={() => setSelected(item)}
                className="grid gap-1 rounded-xl border p-4 text-left transition hover:border-brand sm:grid-cols-[1fr_1fr_auto] sm:items-center"
              >
                <span className="min-w-0">
                  <strong className="block truncate">
                    {item.userId?.name ?? 'Missing member'}
                  </strong>
                  <small className="text-muted-foreground">
                    {item.sourceInvestorId} / {item.sourcePositionId} · {item.opportunityId?.title}
                  </small>
                </span>
                <span>
                  {money(item.principalMinorUnits, item.opportunityId?.currency ?? 'NGN')}
                </span>
                <span className="text-xs font-semibold text-brand">
                  {item.status} · {item.periods.length} periods
                </span>
              </button>
            ))}
            {!loading && positions.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No legacy positions recorded yet.
              </p>
            )}
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm">
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-xl border px-4 py-2 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={loading || page >= pagination.totalPages}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border px-4 py-2 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </section>
      )}
      {selected && (
        <PositionEditor
          key={selected._id}
          position={selected}
          opportunities={opportunities}
          busy={busy}
          save={save}
          close={() => setSelected(null)}
        />
      )}
    </DashboardShell>
  );
}

function PositionForm({
  opportunities,
  busy,
  save,
}: {
  opportunities: LegacyOpportunity[];
  busy: boolean;
  save: (task: () => Promise<unknown>) => Promise<void>;
}): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [matches, setMatches] = useState<Member[]>([]);
  const [userId, setUserId] = useState('');
  const [memberCode, setMemberCode] = useState('');
  const [opportunityId, setOpportunityId] = useState('');
  const [reference, setReference] = useState('');
  const [principal, setPrincipal] = useState('');
  const [units, setUnits] = useState('');
  const [firstCycle, setFirstCycle] = useState('1');
  const [lastCycle, setLastCycle] = useState('');
  const [rate, setRate] = useState('');
  const [fixed, setFixed] = useState('');
  const [preference, setPreference] = useState<LegacyPosition['preference']>('UNKNOWN');
  const [note, setNote] = useState('');
  const [helpTopic, setHelpTopic] = useState<AssignmentHelpTopic | null>(null);
  const selectedOpportunity = opportunities.find((item) => item._id === opportunityId);
  useEffect(() => {
    if (search.trim().length < 2) {
      setMatches([]);
      return;
    }
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        search,
        page: '1',
        limit: '20',
        range: 'custom',
        from: '2020-01-01',
        to: new Date().toISOString().slice(0, 10),
      });
      void api<{ items: Member[] }>(`/v1/admin/users?${params}`)
        .then((result) => setMatches(result.items))
        .catch((error: unknown) => notify.error(problem(error)));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!userId) {
      notify.error('Select a member from search results');
      return;
    }
    if (!memberCode) {
      notify.error('The selected member needs a member code before assignment');
      return;
    }
    void save(async () => {
      await legacyService.createPosition({
        userId,
        opportunityId,
        sourcePositionId: reference,
        sourceInvestorId: memberCode,
        principalMinorUnits: minor(principal),
        units: Number(units),
        firstCycle: Number(firstCycle),
        lastCycle: Number(lastCycle),
        ratePercent: rate ? Number(rate) : undefined,
        fixedReturnMinorUnits: fixed ? minor(fixed) : undefined,
        preference,
        note,
      });
      setReference('');
      setPrincipal('');
      setUnits('');
      setNote('');
    });
  };
  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-background p-5">
      <h2 className="font-semibold">Assign a historical position</h2>
      <div>
        <AssignmentFieldLabel htmlFor="legacy-member" topic="member" onHelp={setHelpTopic}>
          Member
        </AssignmentFieldLabel>
        <input
          id="legacy-member"
          className={field}
          placeholder="Search member name or email"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setUserId('');
            setMemberCode('');
          }}
        />
      </div>
      {matches.length > 0 && !userId && (
        <div className="max-h-40 overflow-auto rounded-xl border">
          {matches.map((member) => (
            <button
              type="button"
              key={member._id}
              className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-muted"
              onClick={() => {
                setUserId(member._id);
                setMemberCode(member.memberCode?.trim() ?? '');
                setSearch(`${member.name} · ${member.email}`);
                setMatches([]);
              }}
            >
              {member.name} · {member.email}
            </button>
          ))}
        </div>
      )}
      <div>
        <AssignmentFieldLabel htmlFor="legacy-opportunity" topic="opportunity" onHelp={setHelpTopic}>
          Opportunity
        </AssignmentFieldLabel>
        <select
          id="legacy-opportunity"
          className={field}
          required
          value={opportunityId}
          onChange={(event) => {
            setOpportunityId(event.target.value);
            setFirstCycle('1');
            setLastCycle(String(opportunities.find((item) => item._id === event.target.value)?.totalCycles ?? ''));
          }}
        >
          <option value="">Select opportunity</option>
          {opportunities.map((item) => (
            <option key={item._id} value={item._id}>
              {item.title} ({item.currency})
            </option>
          ))}
        </select>
      </div>
      {selectedOpportunity && (
        <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">
          Opportunity starts {dateOnly(selectedOpportunity.startDate)} · {selectedOpportunity.totalCycles} monthly cycles · {selectedOpportunity.totalUnits} total units. Past months are generated on the shared opportunity calendar.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <AssignmentFieldLabel htmlFor="legacy-units" topic="units" onHelp={setHelpTopic}>Units owned</AssignmentFieldLabel>
          <input id="legacy-units" className={field} type="number" min="1" max={selectedOpportunity?.totalUnits} required value={units} onChange={(event) => setUnits(event.target.value)} />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-first-cycle" topic="firstCycle" onHelp={setHelpTopic}>First participating month</AssignmentFieldLabel>
          <input id="legacy-first-cycle" className={field} type="number" min="1" max={selectedOpportunity?.totalCycles} required value={firstCycle} onChange={(event) => setFirstCycle(event.target.value)} />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-last-cycle" topic="lastCycle" onHelp={setHelpTopic}>Last participating month</AssignmentFieldLabel>
          <input id="legacy-last-cycle" className={field} type="number" min={firstCycle} max={selectedOpportunity?.totalCycles} required value={lastCycle} onChange={(event) => setLastCycle(event.target.value)} />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-member-code" topic="memberCode" onHelp={setHelpTopic}>Source investor ID (member code)</AssignmentFieldLabel>
          <input
            id="legacy-member-code"
            className={field}
            readOnly
            value={memberCode}
            placeholder="Select a member with a code"
          />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-position-id" topic="positionId" onHelp={setHelpTopic}>Source position ID</AssignmentFieldLabel>
          <input
            id="legacy-position-id"
            className={field}
            required
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-principal" topic="principal" onHelp={setHelpTopic}>Original principal (NGN)</AssignmentFieldLabel>
          <input
            id="legacy-principal"
            className={field}
            type="number"
            min="0.01"
            step="0.01"
            required
            value={principal}
            onChange={(event) => setPrincipal(event.target.value)}
          />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-rate" topic="rate" onHelp={setHelpTopic}>Return rate % (optional)</AssignmentFieldLabel>
          <input
            id="legacy-rate"
            className={field}
            type="number"
            min="0"
            step="0.0001"
            value={rate}
            onChange={(event) => setRate(event.target.value)}
          />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-fixed" topic="fixed" onHelp={setHelpTopic}>Fixed return per period (optional)</AssignmentFieldLabel>
          <input
            id="legacy-fixed"
            className={field}
            type="number"
            min="0"
            step="0.01"
            value={fixed}
            onChange={(event) => setFixed(event.target.value)}
          />
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-preference" topic="preference" onHelp={setHelpTopic}>Preference</AssignmentFieldLabel>
          <select
            id="legacy-preference"
            className={field}
            value={preference}
            onChange={(event) => setPreference(event.target.value as LegacyPosition['preference'])}
          >
            <option value="UNKNOWN">Unknown</option>
            <option value="PAY_TO_ACCOUNT">Pay to account</option>
            <option value="ROLL_OVER">Roll over</option>
          </select>
        </div>
      </div>
      <div>
        <AssignmentFieldLabel htmlFor="legacy-notes" topic="notes" onHelp={setHelpTopic}>
          Source notes
        </AssignmentFieldLabel>
        <textarea
          id="legacy-notes"
          className={field}
          placeholder="Source notes and unresolved questions"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>
      <button className={button} disabled={busy || !opportunityId || !memberCode}>
        Save historical position
      </button>
      <LegacyHelpDialog topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </form>
  );
}

function LinkPositionForm({
  position,
  opportunities,
  busy,
  save,
}: {
  position: LegacyPosition;
  opportunities: LegacyOpportunity[];
  busy: boolean;
  save: (task: () => Promise<unknown>) => Promise<void>;
}): React.JSX.Element {
  const [opportunityId, setOpportunityId] = useState('');
  const [units, setUnits] = useState('');
  const [firstCycle, setFirstCycle] = useState('1');
  const [lastCycle, setLastCycle] = useState('');
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const selectedOpportunity = opportunities.find((item) => item._id === opportunityId);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (position.periods.some((period) => !mappings[period._id])) {
      notify.error('Map every existing period to its matching opportunity month');
      return;
    }
    if (!window.confirm('Link this record to the selected opportunity calendar? Existing payments will stay external.'))
      return;
    void save(() => legacyService.linkPosition(position._id, {
      opportunityId,
      units: Number(units),
      firstCycle: Number(firstCycle),
      lastCycle: Number(lastCycle),
      periodMappings: position.periods.map((period) => ({
        periodId: period._id,
        cycleNumber: Number(mappings[period._id]),
      })),
      revision: position.revision,
    }));
  };
  return (
    <form onSubmit={submit} className="mt-5 space-y-3 rounded-xl border border-brand/30 bg-brand/5 p-4">
      <h3 className="font-semibold">Link older record to a standard opportunity</h3>
      <p className="text-xs text-muted-foreground">
        Select the opportunity and exact participation months. Map each existing payment record
        explicitly; its original date is retained for audit while the new calendar is shared by all members.
      </p>
      <select
        className={field}
        required
        aria-label="Historical opportunity"
        value={opportunityId}
        onChange={(event) => {
          setOpportunityId(event.target.value);
          setLastCycle('');
          setMappings({});
        }}
      >
        <option value="">Select historical opportunity</option>
        {opportunities.map((item) => <option key={item._id} value={item._id}>{item.title}</option>)}
      </select>
      {selectedOpportunity && (
        <p className="text-xs text-muted-foreground">
          Begins {dateOnly(selectedOpportunity.startDate)} · {selectedOpportunity.totalCycles} months · {selectedOpportunity.totalUnits} total units
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm">Units
          <input className={field} type="number" min="1" max={selectedOpportunity?.totalUnits} required value={units} onChange={(event) => setUnits(event.target.value)} />
        </label>
        <label className="text-sm">First month
          <input className={field} type="number" min="1" max={selectedOpportunity?.totalCycles} required value={firstCycle} onChange={(event) => setFirstCycle(event.target.value)} />
        </label>
        <label className="text-sm">Last month
          <input className={field} type="number" min="1" max={selectedOpportunity?.totalCycles} required value={lastCycle} onChange={(event) => setLastCycle(event.target.value)} />
        </label>
      </div>
      {position.periods.map((period) => (
        <label key={period._id} className="grid gap-2 text-sm sm:grid-cols-[1fr_12rem] sm:items-center">
          <span>{period.label} · {dateOnly(period.dueAt)} · {period.status.replaceAll('_', ' ').toLowerCase()}</span>
          <select className={field} required value={mappings[period._id] ?? ''} onChange={(event) => setMappings((current) => ({ ...current, [period._id]: event.target.value }))}>
            <option value="">Map to month</option>
            {Array.from({ length: selectedOpportunity?.totalCycles ?? 0 }, (_, index) => index + 1).map((cycle) => (
              <option key={cycle} value={cycle}>Month {cycle}</option>
            ))}
          </select>
        </label>
      ))}
      <button className={button} disabled={busy || !selectedOpportunity}>Link historical record</button>
    </form>
  );
}

function PositionEditor({
  position,
  opportunities,
  busy,
  save,
  close,
}: {
  position: LegacyPosition;
  opportunities: LegacyOpportunity[];
  busy: boolean;
  save: (task: () => Promise<unknown>) => Promise<void>;
  close: () => void;
}): React.JSX.Element {
  const { user } = useAuth();
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') ?? false;
  const [label, setLabel] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [expected, setExpected] = useState('');
  const [periodNote, setPeriodNote] = useState('');
  const [status, setStatus] = useState(position.status);
  const [capital, setCapital] = useState(String(position.capitalReturnedMinorUnits / 100));
  const [capitalDate, setCapitalDate] = useState(dateOnly(position.capitalReturnedAt));
  const [capitalReference, setCapitalReference] = useState(position.capitalReturnReference ?? '');
  const [note, setNote] = useState(position.note);
  const [helpTopic, setHelpTopic] = useState<AssignmentHelpTopic | null>(null);
  const currency = position.opportunityId.currency ?? 'NGN';
  const add = (event: FormEvent) => {
    event.preventDefault();
    void save(() =>
      legacyService
        .addPeriod(position._id, {
          label,
          dueAt,
          principalMinorUnits: principal ? minor(principal) : undefined,
          ratePercent: rate ? Number(rate) : undefined,
          expectedReturnMinorUnits: expected ? minor(expected) : undefined,
          note: periodNote,
          revision: position.revision,
        })
        .then(() => {
          setLabel('');
          setDueAt('');
          setExpected('');
          setPeriodNote('');
        }),
    );
  };
  const update = (event: FormEvent) => {
    event.preventDefault();
    void save(() =>
      legacyService.updatePosition(position._id, {
        status,
        capitalReturnedMinorUnits: minor(capital),
        capitalReturnedAt: capitalDate || undefined,
        capitalReturnReference: capitalReference,
        note,
        revision: position.revision,
      }),
    );
  };
  return (
    <section className="mt-6 rounded-2xl border bg-background p-5">
      <div className="flex justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">
            {position.userId.name} · {position.sourceInvestorId} / {position.sourcePositionId}
          </h2>
          <p className="text-sm text-muted-foreground">
            {position.opportunityId.title} · {money(position.principalMinorUnits, currency)}{' '}
            principal · {position.units || 'Unknown'} units · months {position.firstCycle ?? '?'}–{position.lastCycle ?? '?'} · {position.preference.replaceAll('_', ' ')}
          </p>
        </div>
        <button type="button" className="text-sm text-brand" onClick={close}>
          Close
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Participation starts {dateOnly(position.participationStartAt ?? position.startAt)} · Ends {dateOnly(position.endAt) || 'unconfirmed'} · Rate{' '}
        {position.ratePercent ?? 'unconfirmed'}%
      </p>
      {isSuperAdmin && position.opportunityModel !== 'Opportunity' && !position.activatedAt && (
        <LinkPositionForm position={position} opportunities={opportunities} busy={busy} save={save} />
      )}
      {position.activatedAt ? (
        <p className="mt-4 rounded-xl bg-brand/10 p-3 text-sm font-semibold text-brand">Import activated. Historical payments remain external; remaining months use reviewed distributions.</p>
      ) : (
        <div className="mt-4 rounded-xl border border-brand/30 bg-brand/5 p-4 text-sm">
          <p>{position.activationStartedAt ? 'Activation is in progress. Retry activation to resume safely; edits are locked.' : 'Review every elapsed month and confirm any external capital return before activating. Activation never credits past payments to a wallet.'}</p>
          {isSuperAdmin ? <button type="button" disabled={busy || position.opportunityModel !== 'Opportunity'} onClick={() => {
            if (window.confirm('Activate this verified historical import and schedule only remaining months?'))
              void save(() => legacyService.activatePosition(position._id, position.revision));
          }} className={`${button} mt-3`}>Activate verified import</button> : null}
        </div>
      )}
      {isSuperAdmin && !position.activatedAt && !position.activationStartedAt && <TermsEditor position={position} busy={busy} save={save} />}
      {isSuperAdmin && !position.activatedAt && !position.activationStartedAt && <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {position.opportunityModel !== 'Opportunity' && <form onSubmit={add} className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Add a monthly period</h3>
          <p className="text-xs text-muted-foreground">
            Add only periods supported by historical records. Leave return blank if terms are
            unknown.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              Trade or month label
              <input
                className={field}
                placeholder="e.g. T3 or Month 3"
                required
                value={label}
                onChange={(event) => setLabel(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Period due date
              <input
                className={field}
                type="date"
                required
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Principal override
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                placeholder="Use position principal"
                value={principal}
                onChange={(event) => setPrincipal(event.target.value)}
              />
            </label>
            <label className="text-sm">
              Rate override %
              <input
                className={field}
                type="number"
                min="0"
                step="0.0001"
                placeholder="Use position rate"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Expected return override ({currency})
              <input
                className={field}
                type="number"
                min="0"
                step="0.01"
                placeholder="Calculate from rate or leave unconfirmed"
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
              />
            </label>
          </div>
          <input
            className={field}
            placeholder="Reason for expected-return override (if different)"
            aria-label="Period override reason"
            value={periodNote}
            onChange={(event) => setPeriodNote(event.target.value)}
          />
          <button className={button} disabled={busy}>
            Add unverified period
          </button>
        </form>}
        <form onSubmit={update} className="space-y-3 rounded-xl border p-4">
          <h3 className="font-semibold">Position and capital exit</h3>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-position-status" topic="status" onHelp={setHelpTopic}>Status</AssignmentFieldLabel>
            <select
              id="legacy-position-status"
              className={field}
              value={status}
              onChange={(event) => setStatus(event.target.value as LegacyPosition['status'])}
            >
              <option value="UNVERIFIED">Unverified</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="EXITED">Exited</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <AssignmentFieldLabel htmlFor="legacy-capital-returned" topic="capital" onHelp={setHelpTopic}>Capital returned ({currency})</AssignmentFieldLabel>
              <input
                id="legacy-capital-returned"
                className={field}
                type="number"
                min="0"
                step="0.01"
                value={capital}
                onChange={(event) => setCapital(event.target.value)}
              />
            </div>
            <div>
              <AssignmentFieldLabel htmlFor="legacy-capital-date" topic="capitalDate" onHelp={setHelpTopic}>Capital return date</AssignmentFieldLabel>
              <input
                id="legacy-capital-date"
                className={field}
                type="date"
                value={capitalDate}
                onChange={(event) => setCapitalDate(event.target.value)}
              />
            </div>
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-capital-reference" topic="capitalReference" onHelp={setHelpTopic}>Capital return payment reference</AssignmentFieldLabel>
            <input
              id="legacy-capital-reference"
              className={field}
              value={capitalReference}
              onChange={(event) => setCapitalReference(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-internal-note" topic="internalNote" onHelp={setHelpTopic}>Internal note</AssignmentFieldLabel>
            <textarea
              id="legacy-internal-note"
              className={field}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <button className={button} disabled={busy}>
            Save position status
          </button>
        </form>
      </div>}
      <LegacyHelpDialog topic={helpTopic} onClose={() => setHelpTopic(null)} />
      <h3 className="mb-3 mt-6 font-semibold">Monthly return ledger</h3>
      <div className="grid gap-3">
        {position.periods.map((period) => (
          <PeriodEditor
            key={period._id}
            period={period}
            position={position}
            busy={busy}
            save={save}
            readOnly={Boolean(position.activatedAt) || !isSuperAdmin}
          />
        ))}
        {!position.periods.length && (
          <p className="text-sm text-muted-foreground">No monthly periods recorded yet.</p>
        )}
      </div>
      <details className="mt-6 rounded-xl border p-4 text-sm">
        <summary className="cursor-pointer font-semibold">Change history</summary>
        <div className="mt-3 space-y-2 text-muted-foreground">
          {(position.changes ?? []).map((change, index) => (
            <p key={`${change.at}-${index}`} className="break-words">
              {new Date(change.at).toLocaleString('en-NG')} · {change.action} · {change.details}
            </p>
          ))}
        </div>
      </details>
    </section>
  );
}

function TermsEditor({
  position,
  busy,
  save,
}: {
  position: LegacyPosition;
  busy: boolean;
  save: (task: () => Promise<unknown>) => Promise<void>;
}): React.JSX.Element {
  const [principal, setPrincipal] = useState(String(position.principalMinorUnits / 100));
  const [rate, setRate] = useState(
    position.ratePercent == null ? '' : String(position.ratePercent),
  );
  const [fixed, setFixed] = useState(
    position.fixedReturnMinorUnits == null ? '' : String(position.fixedReturnMinorUnits / 100),
  );
  const [startAt, setStartAt] = useState(
    dateOnly(position.participationStartAt ?? position.startAt),
  );
  const [endAt, setEndAt] = useState(dateOnly(position.endAt));
  const [duration, setDuration] = useState(
    position.durationMonths == null ? '' : String(position.durationMonths),
  );
  const [preference, setPreference] = useState(position.preference);
  const [reason, setReason] = useState('');
  const [helpTopic, setHelpTopic] = useState<AssignmentHelpTopic | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(() =>
      legacyService
        .updateTerms(position._id, {
          principalMinorUnits: minor(principal),
          ratePercent: rate ? Number(rate) : null,
          fixedReturnMinorUnits: fixed ? minor(fixed) : null,
          startAt,
          endAt: endAt || null,
          durationMonths: duration ? Number(duration) : null,
          preference,
          reason,
          revision: position.revision,
        })
        .then(() => setReason('')),
    );
  };
  return (
    <>
      <details className="mt-5 rounded-xl border p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Correct position terms
        <button
          type="button"
          aria-label="About correcting position terms"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setHelpTopic('terms');
          }}
          className="ml-2 inline-grid size-6 align-middle place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          <Info className="size-4" aria-hidden="true" />
        </button>
      </summary>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Existing monthly periods retain their reviewed principal and return snapshots. Correct
          those periods separately if needed.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-principal" topic="termsPrincipal" onHelp={setHelpTopic}>Principal</AssignmentFieldLabel>
            <input
              id="legacy-terms-principal"
              className={field}
              type="number"
              min="0.01"
              step="0.01"
              required
              value={principal}
              onChange={(event) => setPrincipal(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-rate" topic="termsRate" onHelp={setHelpTopic}>Rate %</AssignmentFieldLabel>
            <input
              id="legacy-terms-rate"
              className={field}
              type="number"
              min="0"
              step="0.0001"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-fixed" topic="termsFixed" onHelp={setHelpTopic}>Fixed return</AssignmentFieldLabel>
            <input
              id="legacy-terms-fixed"
              className={field}
              type="number"
              min="0"
              step="0.01"
              value={fixed}
              onChange={(event) => setFixed(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-duration" topic="termsDuration" onHelp={setHelpTopic}>Duration months</AssignmentFieldLabel>
            <input
              id="legacy-terms-duration"
              className={field}
              type="number"
              min="1"
              max="120"
              disabled={position.opportunityModel === 'Opportunity'}
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-start" topic="termsStart" onHelp={setHelpTopic}>Start date</AssignmentFieldLabel>
            <input
              id="legacy-terms-start"
              className={field}
              type="date"
              required
              disabled={position.opportunityModel === 'Opportunity'}
              value={startAt}
              onChange={(event) => setStartAt(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-end" topic="termsEnd" onHelp={setHelpTopic}>End date</AssignmentFieldLabel>
            <input
              id="legacy-terms-end"
              className={field}
              type="date"
              disabled={position.opportunityModel === 'Opportunity'}
              value={endAt}
              onChange={(event) => setEndAt(event.target.value)}
            />
          </div>
          <div>
            <AssignmentFieldLabel htmlFor="legacy-terms-preference" topic="termsPreference" onHelp={setHelpTopic}>Preference</AssignmentFieldLabel>
            <select
              id="legacy-terms-preference"
              className={field}
              value={preference}
              onChange={(event) =>
                setPreference(event.target.value as LegacyPosition['preference'])
              }
            >
              <option value="UNKNOWN">Unknown</option>
              <option value="PAY_TO_ACCOUNT">Pay to account</option>
              <option value="ROLL_OVER">Roll over</option>
            </select>
          </div>
        </div>
        <div>
          <AssignmentFieldLabel htmlFor="legacy-terms-reason" topic="termsReason" onHelp={setHelpTopic}>Reason for correcting terms</AssignmentFieldLabel>
          <input
            id="legacy-terms-reason"
            className={field}
            required
            minLength={3}
            placeholder="What source confirms this correction?"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <button className={button} disabled={busy}>
          Save corrected terms
        </button>
      </form>
      </details>
      <LegacyHelpDialog topic={helpTopic} onClose={() => setHelpTopic(null)} />
    </>
  );
}

function PeriodEditor({
  period,
  position,
  busy,
  save,
  readOnly,
}: {
  period: LegacyPeriod;
  position: LegacyPosition;
  busy: boolean;
  save: (task: () => Promise<unknown>) => Promise<void>;
  readOnly: boolean;
}): React.JSX.Element {
  const [status, setStatus] = useState(period.status);
  const [paid, setPaid] = useState(String(period.paidMinorUnits / 100));
  const [rolled, setRolled] = useState(String(period.rolledOverMinorUnits / 100));
  const [settledAt, setSettledAt] = useState(dateOnly(period.settledAt));
  const [reference, setReference] = useState(period.reference);
  const [note, setNote] = useState(period.note);
  const [expected, setExpected] = useState(
    period.expectedReturnMinorUnits == null ? '' : String(period.expectedReturnMinorUnits / 100),
  );
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void save(() =>
      legacyService.updatePeriod(position._id, period._id, {
        status,
        expectedReturnMinorUnits: expected ? minor(expected) : undefined,
        paidMinorUnits: minor(paid),
        rolledOverMinorUnits: minor(rolled),
        settledAt: settledAt || undefined,
        reference,
        note,
        revision: position.revision,
      }),
    );
  };
  return (
    <form onSubmit={submit} className="rounded-xl border p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <strong>
          {position.opportunityModel === 'Opportunity' && period.cycleNumber
            ? `Month ${period.cycleNumber}`
            : period.label}{' '}
          · {dateOnly(period.dueAt)}
        </strong>
        <span className="text-sm text-muted-foreground">
          Expected {money(period.expectedReturnMinorUnits, position.opportunityId.currency ?? 'NGN')} ·{' '}
          {period.ratePercent ?? 'no rate'}%
        </span>
      </div>
      <fieldset disabled={readOnly} className="mt-3 grid gap-3 disabled:opacity-70 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">
          Corrected expected return
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            placeholder="Unconfirmed"
            value={expected}
            onChange={(event) => setExpected(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Actual status
          <select
            className={field}
            value={status}
            onChange={(event) => setStatus(event.target.value as LegacyPeriod['status'])}
          >
            <option value="UNVERIFIED">Unverified</option>
            <option value="UNPAID">Confirmed unpaid</option>
            <option value="PARTIAL">Partially settled</option>
            <option value="PAID">Paid to account</option>
            <option value="ROLLED_OVER">Rolled over</option>
          </select>
        </label>
        <label className="text-sm">
          Paid to account
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            value={paid}
            onChange={(event) => setPaid(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Rolled over
          <input
            className={field}
            type="number"
            min="0"
            step="0.01"
            value={rolled}
            onChange={(event) => setRolled(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Settlement date
          <input
            className={field}
            type="date"
            value={settledAt}
            onChange={(event) => setSettledAt(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Statement / payment reference
          <input
            className={field}
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </label>
        <label className="text-sm">
          Evidence note
          <input className={field} value={note} onChange={(event) => setNote(event.target.value)} />
        </label>
      </fieldset>
      <button className={`${button} mt-3`} disabled={busy || readOnly}>
        Save period
      </button>
    </form>
  );
}
