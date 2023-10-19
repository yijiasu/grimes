export interface InvoicePaymentInfo {
  id: string;
  unit: string;
  amount: string;
  createdAt: string;
  internalId: string;
  callbackUrl: string;
  description: string;
  expiresAt: string;
  confirmedAt: string;
  status: string;
}

export interface Invoice {
  seq?: number;
  createdAt: string;
  amount: string;
  id: string;
  request: string;
  paymentInfo?: InvoicePaymentInfo
}