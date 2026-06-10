import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upgradeToPro } from '@/lib/auth';

// MercadoPago Webhook — receives payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // MercadoPago sends different notification types
    const { type, data } = body;

    if (type !== 'payment' || !data?.id) {
      return NextResponse.json({ received: true });
    }

    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!MP_ACCESS_TOKEN) {
      console.error('MERCADOPAGO_ACCESS_TOKEN not configured');
      return NextResponse.json({ error: 'Not configured' }, { status: 500 });
    }

    // Fetch payment details from MercadoPago API
    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { 'Authorization': `Bearer ${MP_ACCESS_TOKEN}` },
    });

    if (!paymentRes.ok) {
      console.error('Failed to fetch MP payment details');
      return NextResponse.json({ error: 'Failed to verify' }, { status: 500 });
    }

    const mpPayment = await paymentRes.json();

    // Only process approved payments
    if (mpPayment.status !== 'approved') {
      // Update payment status
      const externalRef = mpPayment.external_reference;
      if (externalRef) {
        const [userId] = externalRef.split('|');
        await db.payment.updateMany({
          where: { userId, provider: 'mercadopago', status: 'pending' },
          data: { status: mpPayment.status === 'rejected' ? 'failed' : 'pending' },
        });
      }
      return NextResponse.json({ received: true });
    }

    // Payment approved — upgrade user
    const externalRef = mpPayment.external_reference;
    if (!externalRef) {
      console.error('No external_reference in MP payment');
      return NextResponse.json({ received: true });
    }

    const [userId, planType] = externalRef.split('|');
    if (!userId) {
      console.error('No userId in MP external_reference');
      return NextResponse.json({ received: true });
    }

    // Upgrade to Pro
    await upgradeToPro(userId, mpPayment.payer?.email);

    // Set plan expiration
    const months = planType === 'pro_yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await db.user.update({
      where: { id: userId },
      data: {
        planExpiresAt: expiresAt,
        mercadopagoEmail: mpPayment.payer?.email || undefined,
        email: mpPayment.payer?.email || undefined,
      },
    });

    // Update payment record
    await db.payment.updateMany({
      where: { userId, provider: 'mercadopago', status: 'pending' },
      data: {
        status: 'completed',
        providerPaymentId: String(mpPayment.id),
        periodStart: new Date(),
        periodEnd: expiresAt,
      },
    });

    console.log(`[MP Webhook] User ${userId} upgraded to Pro (${planType})`);

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('MercadoPago webhook error:', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
