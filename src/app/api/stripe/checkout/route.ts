import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateUser } from '@/lib/auth';

// Stripe Checkout Session creation
// This creates a Stripe Checkout Session for Pro plan subscription
export async function POST(request: NextRequest) {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { anonId, planType = 'pro_monthly' } = body;

    if (!anonId) {
      return NextResponse.json({ error: 'anonId requerido' }, { status: 400 });
    }

    // Get or create user
    const user = await getOrCreateUser(anonId);

    // Define pricing
    const prices: Record<string, { amount: number; name: string; description: string }> = {
      pro_monthly: {
        amount: 999, // $9.99 USD in cents
        name: 'Reddit Rule Scanner Pro — Mensual',
        description: 'Acceso ilimitado a búsquedas, reglas y exportaciones por 1 mes',
      },
      pro_yearly: {
        amount: 7999, // $79.99 USD in cents (33% discount)
        name: 'Reddit Rule Scanner Pro — Anual',
        description: 'Acceso ilimitado por 12 meses (33% descuento)',
      },
    };

    const selectedPlan = prices[planType];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    // Create Stripe Checkout Session using the API directly
    const origin = request.headers.get('origin') || 'https://reddit-rule-scanner.online';

    const sessionResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'mode': 'payment',
        'payment_method_types[0]': 'card',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': selectedPlan.name,
        'line_items[0][price_data][product_data][description]': selectedPlan.description,
        'line_items[0][price_data][unit_amount]': String(selectedPlan.amount),
        'line_items[0][quantity]': '1',
        'success_url': `${origin}/api/stripe/webhook?session_id={CHECKOUT_SESSION_ID}&user_id=${user.id}&plan=${planType}`,
        'cancel_url': `${origin}/?checkout=cancelled`,
        'metadata[user_id]': user.id,
        'metadata[anon_id]': anonId,
        'metadata[plan_type]': planType,
        'client_reference_id': user.id,
      }),
    });

    if (!sessionResponse.ok) {
      const errText = await sessionResponse.text();
      console.error('Stripe session creation failed:', errText);
      return NextResponse.json({ error: 'Error al crear sesión de pago' }, { status: 500 });
    }

    const session = await sessionResponse.json();

    // Create pending payment record
    await db.payment.create({
      data: {
        userId: user.id,
        provider: 'stripe',
        providerPaymentId: session.id,
        amount: selectedPlan.amount / 100,
        currency: 'USD',
        status: 'pending',
        planType,
      },
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (e) {
    console.error('Stripe checkout error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
