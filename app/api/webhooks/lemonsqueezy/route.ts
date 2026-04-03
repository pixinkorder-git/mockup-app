import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

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
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');
  return hmac === signature;
}

function getPlanFromVariant(variantName = '', productName = ''): 'basic' | 'pro' {
  const combined = `${variantName} ${productName}`.toLowerCase();
  if (combined.includes('pro')) return 'pro';
  if (combined.includes('basic')) return 'basic';
  return 'basic'; // default any paid subscription to basic
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get('x-signature') ?? request.headers.get('X-Signature') ?? '';

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

  const data = payload.data as Record<string, unknown>;
  const attributes = data?.attributes as Record<string, unknown>;
  const customerEmail = attributes?.user_email as string | undefined;
  const variantName = attributes?.variant_name as string | undefined;
  const productName = attributes?.product_name as string | undefined;
  const lemonSubscriptionId = data?.id as string | undefined;
  const lemonCustomerId = attributes?.customer_id as string | number | undefined;

  console.log(`[LemonSqueezy] Event: ${eventName}`, { customerEmail, variantName, productName });

  if (!customerEmail) {
    console.error('[LemonSqueezy] No customer email in payload');
    return NextResponse.json({ received: true });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  switch (eventName) {
    case 'subscription_created':
    case 'subscription_updated':
    case 'subscription_payment_success': {
      const plan = getPlanFromVariant(variantName, productName);
      const { error } = await supabase
        .from('profiles')
        .update({
          plan,
          lemon_customer_id: String(lemonCustomerId ?? ''),
          lemon_subscription_id: String(lemonSubscriptionId ?? ''),
        })
        .eq('email', customerEmail);
      if (error) console.error(`[LemonSqueezy] DB error on ${eventName}:`, error.message);
      else console.log(`[LemonSqueezy] Updated ${customerEmail} → plan: ${plan}`);
      break;
    }
    case 'subscription_cancelled':
    case 'subscription_expired': {
      const { error } = await supabase
        .from('profiles')
        .update({ plan: 'free' })
        .eq('email', customerEmail);
      if (error) console.error(`[LemonSqueezy] DB error on ${eventName}:`, error.message);
      else console.log(`[LemonSqueezy] Downgraded ${customerEmail} → plan: free`);
      break;
    }
    case 'subscription_payment_failed':
      console.log(`[LemonSqueezy] Payment failed for ${customerEmail} — no plan change`);
      break;
  }

  return NextResponse.json({ received: true });
}
