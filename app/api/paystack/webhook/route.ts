import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';

type PaystackCustomField = {
  variable_name?: string;
  value?: string;
};

type PaystackEvent = {
  event?: string;
  data?: {
    customer?: {
      email?: string;
      customer_code?: string;
    };
    metadata?: {
      custom_fields?: PaystackCustomField[];
    };
  };
};

type Profile = {
  id: string;
  user_id: string;
  paystack_customer_code: string | null;
  plan_type: string;
  subscription_status: string;
};

async function resolveProfile(
  supabaseAdmin: SupabaseClient,
  userId?: string | null,
  customerCode?: string | null
): Promise<Profile | null> {
  if (userId) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, paystack_customer_code, plan_type, subscription_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as Profile;
    }
  }

  if (customerCode) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, user_id, paystack_customer_code, plan_type, subscription_status')
      .eq('paystack_customer_code', customerCode)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return data as Profile;
    }
  }

  return null;
}

async function updateSubscriptionStatus(
  supabaseAdmin: SupabaseClient,
  userId: string,
  payload: {
    subscription_status: string;
    plan_type?: string;
    paystack_customer_code?: string | null;
  }
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-paystack-signature');

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    const secret = process.env.PAYSTACK_SECRET_KEY as string;
    
    // Validate signature
    const hash = crypto.createHmac('sha512', secret).update(body).digest('hex');
    
    if (hash !== signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(body) as PaystackEvent;

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const customerCode = event.data?.customer?.customer_code ?? null;
    const email = event.data?.customer?.email ?? 'unknown';
    const customFields = event.data?.metadata?.custom_fields ?? [];
    const userId = customFields.find((field) => field.variable_name === 'user_id')?.value ?? null;

    const profile = await resolveProfile(supabaseAdmin, userId, customerCode);

    console.log(`Paystack webhook received: ${event.event} for ${email}`, {
      userId,
      customerCode,
      matchedUserId: profile?.user_id ?? null,
    });

    if (!profile && (event.event === 'charge.success' || event.event === 'charge.failed' || event.event === 'subscription.disable' || event.event === 'subscription.not_renew')) {
      console.warn('No matching profile found for webhook event.');
      return NextResponse.json({ status: 'ignored', reason: 'profile not found' }, { status: 200 });
    }

    if (event.event === 'charge.success') {
      await updateSubscriptionStatus(supabaseAdmin, profile!.user_id, {
        subscription_status: 'active',
        plan_type: 'pro',
        paystack_customer_code: customerCode ?? profile?.paystack_customer_code ?? null,
      });

      console.log('Successfully marked subscription active for user:', profile!.user_id);
    }

    if (event.event === 'charge.failed') {
      await updateSubscriptionStatus(supabaseAdmin, profile!.user_id, {
        subscription_status: 'past_due',
        plan_type: profile?.plan_type ?? 'pro',
        paystack_customer_code: customerCode ?? profile?.paystack_customer_code ?? null,
      });

      console.log('Marked subscription past due for user:', profile!.user_id);
    }

    if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
      await updateSubscriptionStatus(supabaseAdmin, profile!.user_id, {
        subscription_status: 'inactive',
        plan_type: profile?.plan_type ?? 'pro',
        paystack_customer_code: customerCode ?? profile?.paystack_customer_code ?? null,
      });

      console.log('Marked subscription inactive for user:', profile!.user_id);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
