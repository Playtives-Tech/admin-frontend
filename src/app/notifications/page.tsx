'use client';

import {
  BellRing,
  Check,
  ChevronDown,
  CircleUserRound,
  FileText,
  LoaderCircle,
  Landmark,
  Mail,
  MessageSquareMore,
  Send,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { cn } from '@/lib/utils';
import { notify } from '@/lib/notify';
import { opportunityService, type Opportunity } from '@/lib/services/opportunity-service';
import {
  notificationService,
  type NotificationCampaign,
  type NotificationCampaignInput,
  type NotificationPreview,
} from '@/lib/services/notification-service';

type DeliveryChannel = 'inApp' | 'email';
type AudienceId =
  | 'all-active'
  | 'collective-members'
  | 'opportunity-subscribers'
  | 'kyc-incomplete'
  | 'specific-members';

const audiences: ReadonlyArray<{
  id: AudienceId;
  title: string;
  description: string;
  icon: typeof UsersRound;
}> = [
  {
    id: 'all-active',
    title: 'All active members',
    description: 'Reach every active account. This option is selected on its own.',
    icon: UsersRound,
  },
  {
    id: 'collective-members',
    title: 'Wealth Collective members',
    description: 'Members with a current or awaiting Collective position.',
    icon: Landmark,
  },
  {
    id: 'opportunity-subscribers',
    title: 'Opportunity subscribers',
    description: 'Members subscribed to a selected opportunity.',
    icon: BellRing,
  },
  {
    id: 'kyc-incomplete',
    title: 'KYC incomplete',
    description: 'Members who still need to finish account verification.',
    icon: ShieldCheck,
  },
  {
    id: 'specific-members',
    title: 'Specific members',
    description: 'Send only to the registered emails you enter below.',
    icon: CircleUserRound,
  },
];

const messageReasons = [
  'General update',
  'Wealth Collective update',
  'Opportunity update',
  'KYC reminder',
  'Wallet or payout update',
  'Custom message',
] as const;

const templates: ReadonlyArray<{
  reason: (typeof messageReasons)[number];
  subject: string;
  message: string;
}> = [
  {
    reason: 'General update',
    subject: 'An update from Playtives',
    message: 'We have an important update for you. Open Playtives to learn more.',
  },
  {
    reason: 'Wealth Collective update',
    subject: 'Your Wealth Collective update',
    message:
      'There is an update to the Playtives Wealth Collective. Open your dashboard to view the latest details.',
  },
  {
    reason: 'Opportunity update',
    subject: 'An opportunity you follow has an update',
    message:
      'There is a new update for an opportunity you follow. Open Playtives to review it.',
  },
  {
    reason: 'KYC reminder',
    subject: 'Complete your Playtives verification',
    message:
      'Complete your verification to unlock the full Playtives experience. Open your profile to continue.',
  },
  {
    reason: 'Wallet or payout update',
    subject: 'Your Playtives wallet update',
    message:
      'There is an update concerning your Playtives wallet. Open your dashboard for the details.',
  },
  { reason: 'Custom message', subject: '', message: '' },
];

export default function NotificationsPage(): React.JSX.Element {
  const [selectedAudiences, setSelectedAudiences] = useState<AudienceId[]>([]);
  const [channels, setChannels] = useState<DeliveryChannel[]>(['inApp']);
  const [reason, setReason] = useState<(typeof messageReasons)[number]>('General update');
  const [subject, setSubject] = useState('An update from Playtives');
  const [message, setMessage] = useState(
    'We have an important update for you. Open Playtives to learn more.',
  );
  const [opportunity, setOpportunity] = useState('');
  const [memberEmails, setMemberEmails] = useState('');
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [campaigns, setCampaigns] = useState<NotificationCampaign[]>([]);
  const [preview, setPreview] = useState<NotificationPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    void Promise.all([opportunityService.list(), notificationService.campaigns()])
      .then(([opportunityItems, campaignItems]) => {
        setOpportunities(opportunityItems);
        setCampaigns(campaignItems);
      })
      .catch((error: unknown) =>
        notify.error(error instanceof Error ? error.message : 'Unable to load notifications'),
      );
  }, []);

  const activeAudienceLabels = useMemo(
    () =>
      audiences
        .filter((audience) => selectedAudiences.includes(audience.id))
        .map((audience) => audience.title),
    [selectedAudiences],
  );
  const specificMemberEmails = useMemo(
    () =>
      Array.from(
        new Set(
          memberEmails
            .split(/[\n,;]/)
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean),
        ),
      ),
    [memberEmails],
  );
  const invalidSpecificMemberEmails = useMemo(
    () => specificMemberEmails.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)),
    [specificMemberEmails],
  );

  const campaignInput = useMemo<NotificationCampaignInput>(
    () => ({
      audiences: selectedAudiences,
      channels,
      reason,
      title: subject.trim(),
      message: message.trim(),
      ...(opportunity ? { opportunityId: opportunity } : {}),
      ...(specificMemberEmails.length ? { specificEmails: specificMemberEmails } : {}),
    }),
    [channels, message, opportunity, reason, selectedAudiences, specificMemberEmails, subject],
  );

  useEffect(() => setPreview(null), [campaignInput]);

  function toggleAudience(audienceId: AudienceId): void {
    setSelectedAudiences((current) => {
      if (current.includes(audienceId))
        return current.filter((currentAudience) => currentAudience !== audienceId);
      if (audienceId === 'all-active' || audienceId === 'specific-members') return [audienceId];
      if (current.includes('all-active') || current.includes('specific-members'))
        return [audienceId];
      return [...current, audienceId];
    });
  }

  function toggleChannel(channel: DeliveryChannel): void {
    setChannels((current) =>
      current.includes(channel)
        ? current.length === 1
          ? current
          : current.filter((currentChannel) => currentChannel !== channel)
        : [...current, channel],
    );
  }

  function selectReason(nextReason: (typeof messageReasons)[number]): void {
    setReason(nextReason);
    const template = templates.find((item) => item.reason === nextReason);
    if (template && nextReason !== 'Custom message') {
      setSubject(template.subject);
      setMessage(template.message);
    }
  }

  function validationMessage(): string | null {
    if (!selectedAudiences.length) return 'Choose at least one audience.';
    if (!channels.length) return 'Choose at least one delivery channel.';
    if (!subject.trim()) return 'Add a notification title.';
    if (!message.trim()) return 'Write a message before continuing.';
    if (invalidSpecificMemberEmails.length) return 'Correct the invalid member email addresses.';
    if (selectedAudiences.includes('specific-members') && !specificMemberEmails.length)
      return 'Enter at least one specific member email.';
    if (selectedAudiences.includes('opportunity-subscribers') && !opportunity)
      return 'Select an opportunity.';
    return null;
  }

  async function reviewCampaign(): Promise<void> {
    const error = validationMessage();
    if (error) {
      notify.error(error);
      return;
    }
    setLoadingPreview(true);
    try {
      const result = await notificationService.preview(campaignInput);
      setPreview(result);
      if (!result.recipientCount) notify.error('No eligible members match this audience.');
    } catch (cause: unknown) {
      notify.error(cause instanceof Error ? cause.message : 'Unable to preview campaign');
    } finally {
      setLoadingPreview(false);
    }
  }

  async function sendCampaign(): Promise<void> {
    if (!preview?.recipientCount) return;
    setSending(true);
    try {
      const result = await notificationService.send(campaignInput);
      notify.success(`Notification sent to ${result.recipientCount} member${result.recipientCount === 1 ? '' : 's'}.`, {
        description:
          result.emailFailedCount > 0
            ? `${result.emailFailedCount} email${result.emailFailedCount === 1 ? '' : 's'} could not be delivered; in-app delivery was preserved.`
            : 'Delivery was recorded successfully.',
      });
      setPreview(null);
      setCampaigns(await notificationService.campaigns());
    } catch (cause: unknown) {
      notify.error(cause instanceof Error ? cause.message : 'Unable to send campaign');
    } finally {
      setSending(false);
    }
  }

  return (
    <DashboardShell
      title="Notifications"
      description="Create targeted member messages across in-app notifications and email."
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand to-brand/80 text-brand-foreground shadow-sm">
          <div className="flex flex-col gap-5 px-6 py-7 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-foreground/70">
                Member communications
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                Reach the right members with the right update.
              </h2>
              <p className="mt-2 text-sm leading-6 text-brand-foreground/75">
                Build a campaign from reusable audiences, channels, and message templates. Preview
                the exact audience before sending and review every delivery afterward.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-full border border-brand-foreground/20 bg-brand-foreground/10 px-3 py-1.5 text-xs font-semibold lg:self-auto">
              <FileText className="size-3.5" />
              Live delivery workspace
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <section className="app-surface rounded-2xl border p-5 shadow-sm sm:p-6">
              <SectionHeading
                count="01"
                title="Choose your audience"
                description="Combine audiences when an update applies to more than one member group."
              />
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {audiences.map((audience) => {
                  const selected = selectedAudiences.includes(audience.id);
                  const Icon = audience.icon;
                  return (
                    <button
                      aria-pressed={selected}
                      className={cn(
                        'group flex min-h-24 items-start gap-3 rounded-xl border p-3.5 text-left transition',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        selected
                          ? 'border-brand bg-brand/5 shadow-sm'
                          : 'border-border bg-background hover:border-brand/35 hover:bg-muted/35',
                      )}
                      key={audience.id}
                      onClick={() => toggleAudience(audience.id)}
                      type="button"
                    >
                      <span
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-lg',
                          selected
                            ? 'bg-brand text-brand-foreground'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2 font-semibold text-foreground">
                          {audience.title}
                          <span
                            className={cn(
                              'grid size-5 shrink-0 place-items-center rounded-full border',
                              selected
                                ? 'border-brand bg-brand text-brand-foreground'
                                : 'border-muted-foreground/30',
                            )}
                          >
                            {selected ? <Check className="size-3" strokeWidth={3} /> : null}
                          </span>
                        </span>
                        <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                          {audience.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedAudiences.includes('opportunity-subscribers') ? (
                <label className="mt-4 block text-sm font-medium text-foreground">
                  Opportunity
                  <span className="relative mt-1.5 block">
                    <select
                      className="h-11 w-full appearance-none rounded-lg border bg-background px-3 pr-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                      onChange={(event) => setOpportunity(event.target.value)}
                      value={opportunity}
                    >
                      <option value="">Select an opportunity</option>
                      {opportunities.map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  </span>
                </label>
              ) : null}

              {selectedAudiences.includes('specific-members') ? (
                <div className="mt-4 rounded-xl border border-brand/20 bg-brand/5 p-4">
                  <label
                    className="block text-sm font-semibold text-foreground"
                    htmlFor="specific-member-emails"
                  >
                    Specific member email addresses
                  </label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Enter one or more registered member emails. Separate each address with a comma
                    or a new line.
                  </p>
                  <textarea
                    className="mt-3 min-h-24 w-full resize-y rounded-lg border bg-background px-3 py-2.5 text-sm outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
                    id="specific-member-emails"
                    onChange={(event) => setMemberEmails(event.target.value)}
                    placeholder={
                      'member@example.com, another.member@example.com\nor add one email per line'
                    }
                    value={memberEmails}
                  />
                  {specificMemberEmails.length ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="mr-1 text-xs font-semibold text-foreground">
                        {specificMemberEmails.length} recipient
                        {specificMemberEmails.length === 1 ? '' : 's'}
                      </span>
                      {specificMemberEmails.slice(0, 3).map((email) => (
                        <span
                          className="max-w-52 truncate rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground"
                          key={email}
                        >
                          {email}
                        </span>
                      ))}
                      {specificMemberEmails.length > 3 ? (
                        <span className="rounded-full bg-background px-2 py-1 text-[11px] text-muted-foreground">
                          +{specificMemberEmails.length - 3} more
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {invalidSpecificMemberEmails.length ? (
                    <p className="mt-3 text-xs font-medium text-red-600">
                      Check {invalidSpecificMemberEmails.length} email address
                      {invalidSpecificMemberEmails.length === 1 ? '' : 'es'} before sending.
                    </p>
                  ) : (
                    <p className="mt-3 text-xs leading-5 text-muted-foreground">
                      Emails will be matched to Playtives members before this campaign can be sent.
                    </p>
                  )}
                </div>
              ) : null}
            </section>

            <section className="app-surface rounded-2xl border p-5 shadow-sm sm:p-6">
              <SectionHeading
                count="02"
                title="Set delivery and purpose"
                description="Choose how members receive this campaign and start from a suitable message type."
              />
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ChannelCard
                  checked={channels.includes('inApp')}
                  description="Appears in the Playtives notification centre."
                  icon={MessageSquareMore}
                  onClick={() => toggleChannel('inApp')}
                  title="In-app message"
                />
                <ChannelCard
                  checked={channels.includes('email')}
                  description="Sends a branded email to eligible members."
                  icon={Mail}
                  onClick={() => toggleChannel('email')}
                  title="Email"
                />
              </div>
              <label className="mt-5 block text-sm font-medium text-foreground">
                Reason or message type
                <span className="relative mt-1.5 block">
                  <select
                    className="h-11 w-full appearance-none rounded-lg border bg-background px-3 pr-10 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) =>
                      selectReason(event.target.value as (typeof messageReasons)[number])
                    }
                    value={reason}
                  >
                    {messageReasons.map((messageReason) => (
                      <option key={messageReason}>{messageReason}</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                </span>
              </label>
            </section>

            <section className="app-surface rounded-2xl border p-5 shadow-sm sm:p-6">
              <SectionHeading
                count="03"
                title="Write your message"
                description="The member's first name and the existing Playtives email greeting are added automatically."
              />
              <label className="mt-5 block text-sm font-medium text-foreground">
                  Notification title {channels.includes('email') ? '/ email subject' : ''}
                  <input
                    className="mt-1.5 h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="Write a clear notification title"
                    value={subject}
                  />
              </label>
              <label className="mt-5 block text-sm font-medium text-foreground">
                Message
                <textarea
                  className="mt-1.5 min-h-40 w-full resize-y rounded-lg border bg-background px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground focus:border-brand focus:ring-2 focus:ring-brand/20"
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Write a clear update for members…"
                  value={message}
                />
              </label>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/55 px-4 py-3 text-xs text-muted-foreground">
                <span>The member receives this in the existing Playtives email format.</span>
                <span className="font-medium text-foreground">{message.length} characters</span>
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <section className="app-surface rounded-2xl border p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-lg bg-brand/10 text-brand">
                  <Send className="size-4" />
                </span>
                <div>
                  <h2 className="font-semibold">Campaign preview</h2>
                  <p className="text-xs text-muted-foreground">Review recipients before delivery.</p>
                </div>
              </div>

              <dl className="mt-5 space-y-4 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Audience
                  </dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {activeAudienceLabels.length ? (
                      activeAudienceLabels.map((label) => (
                        <span
                          className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand"
                          key={label}
                        >
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">Choose at least one audience.</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Delivery
                  </dt>
                  <dd className="mt-1.5 font-medium text-foreground">
                    {channels
                      .map((channel) => (channel === 'inApp' ? 'In-app' : 'Email'))
                      .join(' + ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Purpose
                  </dt>
                  <dd className="mt-1.5 font-medium text-foreground">{reason}</dd>
                </div>
              </dl>

              <div className="mt-5 rounded-xl border border-dashed bg-muted/25 p-3.5">
                {channels.includes('email') ? (
                  <p className="text-xs font-semibold text-muted-foreground">
                    {subject || 'Email subject'}
                  </p>
                ) : null}
                <p className="mt-2 whitespace-pre-line text-xs leading-5 text-foreground">
                  {message || 'Your message preview will appear here.'}
                </p>
              </div>

              {preview ? (
                <div className="mt-4 rounded-xl border border-brand/25 bg-brand/5 p-3.5 text-sm">
                  <p className="font-semibold text-foreground">
                    {preview.recipientCount} eligible recipient
                    {preview.recipientCount === 1 ? '' : 's'}
                  </p>
                  {preview.unmatchedSpecificEmails.length ? (
                    <p className="mt-1 text-xs leading-5 text-amber-700">
                      {preview.unmatchedSpecificEmails.length} specific email
                      {preview.unmatchedSpecificEmails.length === 1 ? '' : 's'} did not match an
                      active member and will be skipped.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Audience groups were combined and duplicate members removed.
                    </p>
                  )}
                </div>
              ) : null}

              <button
                disabled={loadingPreview || sending || Boolean(preview && !preview.recipientCount)}
                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground transition hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
                onClick={() => void (preview ? sendCampaign() : reviewCampaign())}
                type="button"
              >
                {loadingPreview || sending ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {sending ? 'Sending…' : preview ? 'Confirm & send' : 'Review audience'}
              </button>
            </section>

            <section className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
              <p className="text-sm font-semibold text-foreground">Delivery controls</p>
              <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  Audience count before approval
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  Duplicate recipients removed automatically
                </li>
                <li className="flex gap-2">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-brand" />
                  Delivery history and status tracking
                </li>
              </ul>
            </section>
          </aside>
        </div>

        <section className="app-surface rounded-2xl border p-5 text-sm shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-foreground">Notification history</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Recipient totals and channel delivery results for recent campaigns.
              </p>
            </div>
          </div>
          {campaigns.length ? (
            <div className="mt-4 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-muted/45 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Campaign</th>
                    <th className="px-4 py-3 font-semibold">Recipients</th>
                    <th className="px-4 py-3 font-semibold">Channels</th>
                    <th className="px-4 py-3 font-semibold">Delivery</th>
                    <th className="px-4 py-3 font-semibold">Sent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign) => (
                    <tr key={campaign._id}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{campaign.title}</p>
                        <p className="mt-0.5 text-muted-foreground">{campaign.reason}</p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {campaign.recipientCount}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {campaign.channels
                          .map((channel) => (channel === 'inApp' ? 'In-app' : 'Email'))
                          .join(' + ')}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'rounded-full px-2 py-1 text-[11px] font-semibold',
                          campaign.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : campaign.status === 'PARTIAL'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-red-50 text-red-700',
                        )}>
                          {campaign.status.toLowerCase()}
                        </span>
                        {campaign.emailFailedCount ? (
                          <p className="mt-1 text-[11px] text-red-600">
                            {campaign.emailFailedCount} email failed
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Intl.DateTimeFormat('en-NG', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(campaign.createdAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 rounded-xl bg-muted/35 px-4 py-5 text-center text-xs text-muted-foreground">
              No notification campaigns have been sent yet.
            </p>
          )}
        </section>
      </div>
    </DashboardShell>
  );
}

function SectionHeading({
  count,
  title,
  description,
}: Readonly<{ count: string; title: string; description: string }>): React.JSX.Element {
  return (
    <div className="flex gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand/10 text-[11px] font-bold text-brand">
        {count}
      </span>
      <div>
        <h2 className="font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

function ChannelCard({
  checked,
  description,
  icon: Icon,
  onClick,
  title,
}: Readonly<{
  checked: boolean;
  description: string;
  icon: typeof Mail;
  onClick: () => void;
  title: string;
}>): React.JSX.Element {
  return (
    <button
      aria-pressed={checked}
      className={cn(
        'flex items-start gap-3 rounded-xl border p-4 text-left transition',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        checked
          ? 'border-brand bg-brand/5'
          : 'bg-background hover:border-brand/35 hover:bg-muted/35',
      )}
      onClick={onClick}
      type="button"
    >
      <span
        className={cn(
          'grid size-9 place-items-center rounded-lg',
          checked ? 'bg-brand text-brand-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span>
        <span className="flex items-center gap-2 font-semibold text-foreground">
          {title}
          <span
            className={cn(
              'grid size-4 place-items-center rounded border',
              checked
                ? 'border-brand bg-brand text-brand-foreground'
                : 'border-muted-foreground/35',
            )}
          >
            {checked ? <Check className="size-3" strokeWidth={3} /> : null}
          </span>
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}
