import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET!;

const HANDLED_EVENTS = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_expired',
  'subscription_payment_success',
  'subscription_payment_failed',
]);

function verifySignature(rawBody: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = hmac.update(rawBody).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') ?? '';

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
  }

  let isValid: boolean;
  try {
    isValid = verifySignature(rawBody, signature);
  } catch {
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
  }

  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventName = (payload?.meta as Record<string, unknown>)?.event_name as string | undefined;

  if (!eventName || !HANDLED_EVENTS.has(eventName)) {
    return NextResponse.json({ received: true });
  }

  console.log(`[LemonSqueezy] Event: ${eventName}`, JSON.stringify(payload, null, 2));

  // TODO: Add database handling for each event type
  switch (eventName) {
    case 'subscription_created':
      console.log('[LemonSqueezy] New subscription created');
      break;
    case 'subscription_updated':
      console.log('[LemonSqueezy] Subscription updated');
      break;
    case 'subscription_cancelled':
      console.log('[LemonSqueezy] Subscription cancelled');
      break;
    case 'subscription_expired':
      console.log('[LemonSqueezy] Subscription expired');
      break;
    case 'subscription_payment_success':
      console.log('[LemonSqueezy] Payment successful');
      break;
    case 'subscription_payment_failed':
      console.log('[LemonSqueezy] Payment failed');
      break;
  }

  return NextResponse.json({ received: true });
}
