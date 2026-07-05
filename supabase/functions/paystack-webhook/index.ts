import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import * as crypto from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paystack-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const signature = req.headers.get('x-paystack-signature')
    if (!signature) {
      return new Response('Missing signature', { status: 400 })
    }

    const payload = await req.text()
    
    // Verify signature
    const secret = Deno.env.get('PAYSTACK_SECRET_KEY')
    if (!secret) {
      throw new Error("Missing PAYSTACK_SECRET_KEY in environment variables")
    }

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    )
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    if (signature !== expectedSignature) {
      return new Response('Invalid signature', { status: 401 })
    }

    const event = JSON.parse(payload)

    if (event.event === 'charge.success') {
      const data = event.data
      
      // Extract user_id from metadata
      let userId = null
      if (data.metadata?.custom_fields) {
        const userField = data.metadata.custom_fields.find((f: any) => f.variable_name === 'user_id')
        if (userField) {
          userId = userField.value
        }
      }

      if (userId) {
        // Initialize Supabase Admin Client
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
        
        if (!supabaseUrl || !serviceRoleKey) {
          throw new Error("Missing Supabase environment variables")
        }

        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey)

        // Update user profile in database
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: 'active',
            plan_type: 'pro',
            paystack_customer_code: data.customer?.customer_code,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)

        if (error) throw error
      }
    }

    return new Response(JSON.stringify({ message: 'Success' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Webhook error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
