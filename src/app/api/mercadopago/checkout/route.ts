import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getOrCreateUser } from '@/lib/auth';

// MercadoPago Checkout — creates a preference and redirects to MP
export async function POST(request: NextRequest) {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      return NextResponse.json({ error: 'MercadoPago no configurado' }, { status: 500 });
    }

    const body = await request.json();
    const { anonId, planType = 'pro_monthly' } = body;

    if (!anonId) {
      return NextResponse.json({ error: 'anonId requerido' }, { status: 400 });
    }

    const user = await getOrCreateUser(anonId);

    // Pricing in ARS (Argentine Pesos)
    const prices: Record<string, { amount: number; name: string }> = {
      pro_monthly: {
        amount: 4999, // ~$5 USD equivalent in ARS
        name: 'Reddit Rule Scanner Pro — Mensual',
      },
      pro_yearly: {
        amount: 39999, // ~$40 USD equivalent in ARS
        name: 'Reddit Rule Scanner Pro — Anual',
      },
    };

    const selectedPlan = prices[planType];
    if (!selectedPlan) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || 'https://reddit-rule-scanner.online';

    // Create MercadoPago preference
    const preferenceRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MP_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            title: selectedPlan.name,
            description: `Acceso Pro al Reddit Rule Scanner — ${planType === 'pro_yearly' ? '12 meses' : '1 mes'}`,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: selectedPlan.amount,
          },
        ],
        back_urls: {
          success: `${origin}/api/mercadopago/success?user_id=${user.id}&plan=${planType}`,
          failure: `${origin}/api/mercadopago/failure?user_id=${user.id}`,
          pending: `${origin}/api/mercadopago/success?user_id=${user.id}&plan=${planType}&pending=true`,
        },
        auto_return: 'approved',
        external_reference: `${user.id}|${planType}`,
        metadata: {
          user_id: user.id,
          anon_id: anonId,
          plan_type: planType,
        },
        notification_url: `${origin}/api/mercadopago/webhook`,
      }),
    });

    if (!preferenceRes.ok) {
      const errText = await preferenceRes.text();
      console.error('MercadoPago preference creation failed:', errText);
      return NextResponse.json({ error: 'Error al crear preferencia de pago' }, { status: 500 });
    }

    const preference = await preferenceRes.json();

    // Create pending payment record
    await db.payment.create({
      data: {
        userId: user.id,
        provider: 'mercadopago',
        providerPaymentId: preference.id,
        amount: selectedPlan.amount,
        currency: 'ARS',
        status: 'pending',
        planType,
      },
    });

    return NextResponse.json({
      url: preference.init_point,
      sandboxUrl: preference.sandbox_init_point,
      preferenceId: preference.id,
    });
  } catch (e) {
    console.error('MercadoPago checkout error:', e);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
