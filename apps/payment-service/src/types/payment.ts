export type PaymentRequest = {
  orderId: string;
  amount: number;
  currency: string;
  customerName?: string;
  address?: string;
};

export type PaymentResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
};
