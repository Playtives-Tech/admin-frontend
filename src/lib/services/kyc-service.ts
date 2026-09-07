import { api, apiBlob } from '@/lib/api';

export type AdminKycSubmission = Readonly<{
  id: string;
  userId: { _id: string; name: string; email: string; phone?: string | null };
  legalName: string; dateOfBirth: string; residentialAddress: string; state: string; country: string;
  documentType: string; documentNumberMasked: string; documentFrontFileName: string;
  documentBackFileName?: string | null; hasDocumentBack: boolean;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_RESUBMISSION' | 'VERIFIED' | 'REJECTED';
  reviewNote?: string | null; createdAt: string; updatedAt: string;
}>;

export function listKyc(status = 'ALL', search = '') { return api<AdminKycSubmission[]>(`/v1/admin/kyc?status=${encodeURIComponent(status)}&search=${encodeURIComponent(search)}`, { cache: 'no-store' }); }
export function reviewKyc(id: string, action: string, note?: string) { return api<AdminKycSubmission>(`/v1/admin/kyc/${id}/review`, { method: 'PATCH', body: JSON.stringify({ action, note }) }); }
export async function openKycDocument(id: string, side: 'front' | 'back') {
  const preview = window.open();
  if (preview) preview.opener = null;
  const blob = await apiBlob(`/v1/admin/kyc/${id}/documents/${side}`);
  const url = URL.createObjectURL(blob);
  if (preview) preview.location.href = url;
  else window.open(url, '_blank', 'noopener,noreferrer');
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
