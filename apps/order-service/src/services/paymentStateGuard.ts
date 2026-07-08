export function shouldAcceptPaymentResult(currentStatus?: string | null): boolean {
  if (!currentStatus) return true;

  const terminalStatuses = new Set(['PAID', 'PAYMENT_FAILED', 'CANCELLED', 'PAYMENT_CANCELLED']);
  return !terminalStatuses.has(currentStatus);
}
