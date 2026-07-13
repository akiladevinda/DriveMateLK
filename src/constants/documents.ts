export const DocumentType = {
  REGISTRATION_CERTIFICATE: 'registration_certificate',
  INSURANCE_CERTIFICATE: 'insurance_certificate',
  REVENUE_LICENCE: 'revenue_licence',
  EMISSION_CERTIFICATE: 'emission_certificate',
  LEASE_AGREEMENT: 'lease_agreement',
  SERVICE_INVOICE: 'service_invoice',
  REPAIR_RECEIPT: 'repair_receipt',
  WARRANTY: 'warranty',
  TIRE_WARRANTY: 'tire_warranty',
  BATTERY_WARRANTY: 'battery_warranty',
  DRIVING_LICENCE: 'driving_licence',
  OTHER: 'other',
} as const;

export type DocumentTypeValue = (typeof DocumentType)[keyof typeof DocumentType];

export const DOCUMENT_TYPES: readonly DocumentTypeValue[] = [
  DocumentType.REGISTRATION_CERTIFICATE,
  DocumentType.INSURANCE_CERTIFICATE,
  DocumentType.REVENUE_LICENCE,
  DocumentType.EMISSION_CERTIFICATE,
  DocumentType.LEASE_AGREEMENT,
  DocumentType.SERVICE_INVOICE,
  DocumentType.REPAIR_RECEIPT,
  DocumentType.WARRANTY,
  DocumentType.TIRE_WARRANTY,
  DocumentType.BATTERY_WARRANTY,
  DocumentType.DRIVING_LICENCE,
  DocumentType.OTHER,
] as const;

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeValue, string> = {
  [DocumentType.REGISTRATION_CERTIFICATE]: 'Registration Certificate',
  [DocumentType.INSURANCE_CERTIFICATE]: 'Insurance Certificate',
  [DocumentType.REVENUE_LICENCE]: 'Revenue Licence',
  [DocumentType.EMISSION_CERTIFICATE]: 'Emission Certificate',
  [DocumentType.LEASE_AGREEMENT]: 'Lease Agreement',
  [DocumentType.SERVICE_INVOICE]: 'Service Invoice',
  [DocumentType.REPAIR_RECEIPT]: 'Repair Receipt',
  [DocumentType.WARRANTY]: 'Warranty',
  [DocumentType.TIRE_WARRANTY]: 'Tire Warranty',
  [DocumentType.BATTERY_WARRANTY]: 'Battery Warranty',
  [DocumentType.DRIVING_LICENCE]: 'Driving Licence',
  [DocumentType.OTHER]: 'Other',
};

/** Document types that typically carry an expiry date. */
export const EXPIRABLE_DOCUMENT_TYPES: readonly DocumentTypeValue[] = [
  DocumentType.INSURANCE_CERTIFICATE,
  DocumentType.REVENUE_LICENCE,
  DocumentType.EMISSION_CERTIFICATE,
  DocumentType.LEASE_AGREEMENT,
  DocumentType.WARRANTY,
  DocumentType.TIRE_WARRANTY,
  DocumentType.BATTERY_WARRANTY,
  DocumentType.DRIVING_LICENCE,
] as const;

export type DocumentExpiryStatus =
  | 'valid'
  | 'expiring_soon'
  | 'expired'
  | 'no_expiry'
  | 'pending_confirmation';

export const DOCUMENT_EXPIRY_STATUS_LABELS: Record<DocumentExpiryStatus, string> =
  {
    valid: 'Valid',
    expiring_soon: 'Expiring Soon',
    expired: 'Expired',
    no_expiry: 'No Expiry',
    pending_confirmation: 'Pending Confirmation',
  };
