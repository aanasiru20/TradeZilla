import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

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

    const event = JSON.parse(body);

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Handle charge.success event
    if (event.event === 'charge.success') {
      // Best practice: Extract the user ID from the metadata passed during checkout
      const userId = event.data.metadata?.custom_fields?.find(
        (f: any) => f.variable_name === 'user_id'
      )?.value;
      
      const email = event.data.customer.email;
      const customerCode = event.data.customer.customer_code;

      console.log('Payment successful for:', email, userId ? `(User: ${userId})` : '');

      if (userId) {
         // Update the user's profile to active status
         const { error } = await supabaseAdmin
           .from('profiles') // Adjust if your table is named differently
           .update({
             subscription_status: 'active',
             plan_type: 'pro',
             paystack_customer_code: customerCode
           })
           .eq('id', userId);

         if (error) {
           console.error('Supabase update error:', error);
           return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
         }
         
         console.log('Successfully updated profile for user:', userId);
      } else {
         console.warn('Payment succeeded, but no user_id found in metadata.');
      }
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
