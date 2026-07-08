import dotenv from 'dotenv';
import twilio from 'twilio';
import { logger } from '../config/logger.js';

dotenv.config();

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = twilio(accountSid, authToken);

console.log(client);

export async function sendNotification({ type, orderId, customerPhone, message }: any) {
  try {
    const from = `whatsapp:+${process.env.TWILIO_FROM_NUM}`;
    const to = `whatsapp:${customerPhone}`;

    const finalMessage = message || `Order ${orderId} update: ${type}`;

    const result = await client.messages.create({
      from,
      to,
      body: finalMessage,
    });

    const successMsg = `Twilio notification sent successfully for order ${orderId}: ${result.sid}`;
    logger.info(successMsg);
    console.log(successMsg);

    return { success: true, sid: result.sid };
  } catch (error: any) {
    const errorMsg = `Twilio notification failed for order ${orderId}: ${error?.message ?? error}`;
    logger.error(errorMsg);
    console.error(errorMsg, error);
    throw error;
  }
}