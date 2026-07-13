import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { isSupabaseConfigured } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { formatDisplayDate } from '@/utils/dates';
import { formatMoney, sumMinor } from '@/utils/money';

export type PassportSection = 'profile' | 'documents' | 'services' | 'expenses' | 'health';

export type ReportServiceError = { message: string; code?: string };
export type ReportResult<T> = { data: T; error: null } | { data: null; error: ReportServiceError };

type PassportData = {
  vehicle: Record<string, unknown>;
  documents: Array<Record<string, unknown>>;
  services: Array<Record<string, unknown>>;
  expenses: Array<Record<string, unknown>>;
  health: Record<string, unknown> | null;
};

async function fetchPassportData(userId: string, vehicleId: string): Promise<ReportResult<PassportData>> {
  if (!isSupabaseConfigured()) {
    return { data: null, error: { message: 'Supabase is not configured', code: 'config_error' } };
  }

  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', vehicleId)
    .eq('user_id', userId)
    .maybeSingle();

  if (vehicleError || !vehicle) {
    return { data: null, error: { message: 'Vehicle not found', code: 'not_found' } };
  }

  const [docs, services, expenses, healthRes] = await Promise.all([
    supabase.from('vehicle_documents').select('title,document_type,expiry_date,status').eq('vehicle_id', vehicleId).limit(20),
    supabase.from('service_records').select('service_date,service_type,total_cost_minor,currency').eq('vehicle_id', vehicleId).limit(20),
    supabase.from('expenses').select('title,category,amount_minor,currency,expense_date').eq('vehicle_id', vehicleId).limit(50),
    supabase.from('vehicle_health_scores').select('total_score,status_label,calculated_at').eq('vehicle_id', vehicleId).order('calculated_at', { ascending: false }).limit(1),
  ]);

  return {
    data: {
      vehicle,
      documents: docs.data ?? [],
      services: services.data ?? [],
      expenses: expenses.data ?? [],
      health: healthRes.data?.[0] ?? null,
    },
    error: null,
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;color:#555">${escapeHtml(label)}</td><td style="padding:6px 12px">${escapeHtml(value)}</td></tr>`;
}

export async function buildVehiclePassportHtml(
  userId: string,
  vehicleId: string,
  sections: PassportSection[] = ['profile', 'documents', 'services', 'expenses', 'health'],
): Promise<ReportResult<string>> {
  const fetched = await fetchPassportData(userId, vehicleId);
  if (!fetched.data) return { data: null, error: fetched.error! };

  const { vehicle, documents, services, expenses, health } = fetched.data;
  const reg = String(vehicle.registration_number ?? '');
  const makeModel = `${String(vehicle.make ?? '')} ${String(vehicle.model ?? '')}`.trim();
  const parts: string[] = [];

  parts.push(`<h1>Digital Vehicle Passport</h1><p><strong>${escapeHtml(makeModel)}</strong> · ${escapeHtml(reg)}</p>`);
  parts.push(`<p style="color:#666;font-size:12px">Generated ${formatDisplayDate(new Date().toISOString())} · DriveMate LK</p>`);

  if (sections.includes('profile')) {
    parts.push('<h2>Vehicle profile</h2><table style="width:100%;border-collapse:collapse">');
    parts.push(row('Year', String(vehicle.manufacture_year ?? '—')));
    parts.push(row('Fuel', String(vehicle.fuel_type ?? '—')));
    parts.push(row('Odometer', `${Number(vehicle.current_odometer ?? 0).toLocaleString('en-LK')} km`));
    parts.push('</table>');
  }

  if (sections.includes('documents') && documents.length > 0) {
    parts.push('<h2>Documents</h2><ul>');
    for (const doc of documents) {
      parts.push(`<li>${escapeHtml(String(doc.title ?? ''))} — ${escapeHtml(String(doc.status ?? ''))}</li>`);
    }
    parts.push('</ul>');
  }

  if (sections.includes('services') && services.length > 0) {
    parts.push('<h2>Service history</h2><ul>');
    for (const svc of services) {
      const cost = formatMoney(Number(svc.total_cost_minor ?? 0), String(svc.currency ?? 'LKR'));
      parts.push(`<li>${escapeHtml(String(svc.service_date ?? ''))}: ${escapeHtml(String(svc.service_type ?? ''))} (${cost})</li>`);
    }
    parts.push('</ul>');
  }

  if (sections.includes('expenses') && expenses.length > 0) {
    const total = sumMinor(...expenses.map((e) => Number(e.amount_minor ?? 0)));
    parts.push(`<h2>Expenses summary</h2><p>Total recorded: ${formatMoney(total)} (${expenses.length} entries)</p>`);
  }

  if (sections.includes('health') && health) {
    parts.push(`<h2>Health score</h2><p>${Number(health.total_score ?? 0)}/100 — ${escapeHtml(String(health.status_label ?? ''))}</p>`);
  }

  parts.push('<p style="margin-top:24px;font-size:11px;color:#888">Informational report from owner-entered data. Not a certified inspection or legal fitness certificate.</p>');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto}h1{font-size:22px}h2{font-size:16px;margin-top:20px}</style></head><body>${parts.join('')}</body></html>`;
  return { data: html, error: null };
}

export async function exportVehiclePassportPdf(
  userId: string,
  vehicleId: string,
  sections?: PassportSection[],
): Promise<ReportResult<string>> {
  const htmlResult = await buildVehiclePassportHtml(userId, vehicleId, sections);
  if (!htmlResult.data) return htmlResult;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlResult.data });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share vehicle passport' });
    }
    return { data: uri, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return { data: null, error: { message, code: 'export_failed' } };
  }
}

export type AccidentPackageInput = {
  vehicleLabel: string;
  registrationNumber: string;
  incidentDate: string;
  locationText: string;
  safetyChecklist: Array<{ label: string; checked: boolean }>;
  photoNotes: string;
  claimDraftId?: string | null;
};

export async function buildAccidentPackageHtml(input: AccidentPackageInput): Promise<ReportResult<string>> {
  const checklistHtml = input.safetyChecklist
    .map(
      (item) =>
        `<li>${item.checked ? '✓' : '○'} ${escapeHtml(item.label)}</li>`,
    )
    .join('');

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:system-ui,sans-serif;padding:24px;max-width:720px;margin:0 auto}
    h1{font-size:22px}h2{font-size:16px;margin-top:20px}
    .disclaimer{font-size:11px;color:#888;margin-top:24px}
  </style></head><body>
    <h1>Accident assistance package</h1>
    <p><strong>${escapeHtml(input.vehicleLabel)}</strong> · ${escapeHtml(input.registrationNumber)}</p>
    <p>Incident date: ${escapeHtml(input.incidentDate)}</p>
    <p>Location: ${escapeHtml(input.locationText || 'Not recorded')}</p>
    <h2>Safety checklist</h2><ul>${checklistHtml}</ul>
    <h2>Photo &amp; scene notes</h2><p>${escapeHtml(input.photoNotes || '—')}</p>
    ${input.claimDraftId ? `<p>Insurance claim draft ID: ${escapeHtml(input.claimDraftId)}</p>` : ''}
    <p class="disclaimer">Informational draft for your records. Not a police report, insurer submission, or legal document. Contact emergency services (119) if anyone is injured.</p>
  </body></html>`;

  return { data: html, error: null };
}

export async function exportAccidentPackagePdf(
  input: AccidentPackageInput,
): Promise<ReportResult<string>> {
  const htmlResult = await buildAccidentPackageHtml(input);
  if (!htmlResult.data) return htmlResult;

  try {
    const { uri } = await Print.printToFileAsync({ html: htmlResult.data });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share accident package',
      });
    }
    return { data: uri, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export failed';
    return { data: null, error: { message, code: 'export_failed' } };
  }
}
