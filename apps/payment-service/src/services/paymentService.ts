import { ulid } from 'ulid';

type PaymentRequest = {
  orderId: string;
  amount: number;
  currency: string;
  customerName?: string;
  address?: string;
};

type PaymentResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
};

export async function processPayment(payload: PaymentRequest): Promise<PaymentResult> {
  const { orderId, amount, currency } = payload;

  await new Promise((resolve) => setTimeout(resolve, 500));
  
  // For testing: Fail based on currency threshold
  if (currency === 'INR' && amount > 5000) {
    return {
      success: false,
      error: 'Payment declined by simulator (INR amount exceeds 5000 threshold)',
    };
  }
  if (currency === 'USD' && amount > 55) {
    return {
      success: false,
      error: 'Payment declined by simulator (USD amount exceeds 55 threshold)',
    };
  }
  
  return {
    success: true,
    transactionId: ulid(),
  };
}
