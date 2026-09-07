'use client';

import { Eye, FileCheck2, Search, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/dashboard/shell';
import { notify } from '@/lib/notify';
import { listKyc, openKycDocument, reviewKyc, type AdminKycSubmission } from '@/lib/services/kyc-service';

export default function KycReviewsPage(): React.JSX.Element {
  const [items, setItems] = useState<AdminKycSubmission[]>([]);
  const [selected, setSelected] = useState<AdminKycSubmission | null>(null);
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { try { setItems(await listKyc(status, search)); } catch (error) { notify.error(error instanceof Error ? error.message : 'Unable to load KYC reviews'); } }, [search, status]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 250); return () => window.clearTimeout(timer); }, [load]);

  async function decide(action: string) {
    if (!selected) return;
    setSaving(true);
    try { const updated = await reviewKyc(selected.id, action, note); setSelected(updated); setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); setNote(''); notify.success('KYC review updated'); }
    catch (error) { notify.error(error instanceof Error ? error.message : 'Unable to update review'); }
    finally { setSaving(false); }
  }

  return <DashboardShell title="KYC reviews" description="Review member identity submissions and private evidence.">
    <div className="mx-auto grid max-w-7xl gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section className="app-surface overflow-hidden rounded-xl border">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><label className="flex h-10 flex-1 items-center gap-2 rounded-lg border px-3"><Search className="size-4 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search member" className="w-full bg-transparent text-sm outline-none" /></label><select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border bg-background px-3 text-sm">{['ALL', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_RESUBMISSION', 'VERIFIED', 'REJECTED'].map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="divide-y">{items.map((item) => <button key={item.id} onClick={() => { setSelected(item); setNote(item.reviewNote ?? ''); }} className="flex w-full items-center gap-3 p-4 text-left hover:bg-muted/30"><span className="grid size-10 place-items-center rounded-full bg-brand/10 font-semibold text-brand">{initials(item.userId.name)}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{item.userId.name}</strong><small className="text-muted-foreground">{item.documentType.replaceAll('_', ' ')} · {new Date(item.createdAt).toLocaleDateString('en-NG')}</small></span><Badge status={item.status} /></button>)}{items.length === 0 ? <p className="p-12 text-center text-sm text-muted-foreground">No matching KYC submissions.</p> : null}</div>
      </section>
      <section className="app-surface rounded-xl border p-5">{selected ? <><div className="flex items-start gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand/10 text-brand"><ShieldCheck className="size-5" /></span><div><h2 className="font-semibold">{selected.legalName}</h2><p className="text-xs text-muted-foreground">{selected.userId.email} · {selected.userId.phone ?? 'No phone'}</p></div></div><dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><Detail label="Date of birth" value={new Date(selected.dateOfBirth).toLocaleDateString('en-NG')} /><Detail label="Document" value={selected.documentType.replaceAll('_', ' ')} /><Detail label="Document number" value={selected.documentNumberMasked} /><Detail label="Location" value={`${selected.state}, ${selected.country}`} /><div className="sm:col-span-2"><Detail label="Residential address" value={selected.residentialAddress} /></div></dl><div className="mt-5 flex flex-wrap gap-2"><button onClick={() => void openKycDocument(selected.id, 'front')} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold"><Eye className="size-4" />View front</button>{selected.hasDocumentBack ? <button onClick={() => void openKycDocument(selected.id, 'back')} className="inline-flex h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold"><Eye className="size-4" />View back</button> : null}</div><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Review note (required for rejection or resubmission)" rows={4} className="mt-5 w-full rounded-lg border bg-background p-3 text-sm" /><div className="mt-3 flex flex-wrap gap-2"><Action disabled={saving} onClick={() => void decide('APPROVE')} label="Approve" primary /><Action disabled={saving} onClick={() => void decide('START_REVIEW')} label="Start review" /><Action disabled={saving} onClick={() => void decide('REQUEST_RESUBMISSION')} label="Request resubmission" /><Action disabled={saving} onClick={() => void decide('REJECT')} label="Reject" /></div></> : <div className="grid min-h-80 place-items-center text-center text-muted-foreground"><div><FileCheck2 className="mx-auto size-9" /><p className="mt-3 text-sm">Select a submission to review all details.</p></div></div>}</section>
    </div>
  </DashboardShell>;
}

function Badge({ status }: Readonly<{ status: AdminKycSubmission['status'] }>) { return <span className="rounded-full bg-brand/10 px-2 py-1 text-[10px] font-semibold text-brand">{status.replaceAll('_', ' ')}</span>; }
function Detail({ label, value }: Readonly<{ label: string; value: string }>) { return <div><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 font-medium">{value}</dd></div>; }
function Action({ label, onClick, disabled, primary = false }: Readonly<{ label: string; onClick: () => void; disabled: boolean; primary?: boolean }>) { return <button disabled={disabled} onClick={onClick} className={`h-9 rounded-lg px-3 text-xs font-semibold disabled:opacity-50 ${primary ? 'bg-brand text-white' : 'border'}`}>{label}</button>; }
function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join(''); }
