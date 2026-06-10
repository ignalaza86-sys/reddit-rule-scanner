import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upgradeToPro } from '@/lib/auth';

// Stripe Webhook / Success handler
// Handles both webhook events and redirect-based success
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const userId = searchParams.get('user_id');
    const planType = searchParams.get('plan') || 'pro_monthly';

    if (!sessionId || !userId) {
      return NextResponse.redirect(new URL('/?checkout=error', request.url));
    }

    // Verify the session with Stripe
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
    if (!STRIPE_SECRET_KEY) {
      return NextResponse.redirect(new URL('/?checkout=error', request.url));
    }

    const sessionRes = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    });

    if (!sessionRes.ok) {
      console.error('Failed to verify Stripe session');
      return NextResponse.redirect(new URL('/?checkout=error', request.url));
    }

    const session = await sessionRes.json();

    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL('/?checkout=pending', request.url));
    }

    // Update payment record
    const payment = await db.payment.findFirst({
      where: { providerPaymentId: sessionId, provider: 'stripe' },
    });

    if (payment) {
      await db.payment.update({
        where: { id: payment.id },
        data: { status: 'completed' },
      });
    }

    // Upgrade user to Pro
    await upgradeToPro(userId, session.customer_details?.email);

    // Set plan expiration
    const months = planType === 'pro_yearly' ? 12 : 1;
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + months);

    await db.user.update({
      where: { id: userId },
      data: {
        planExpiresAt: expiresAt,
        stripeCustomerId: session.customer as string,
        email: session.customer_details?.email || undefined,
      },
    });

    // Redirect to success page
    return NextResponse.redirect(new URL('/?checkout=success', request.url));
  } catch (e) {
    console.error('Stripe webhook GET error:', e);
    return NextResponse.redirect(new URL('/?checkout=error', request.url));
  }
}

// Webhook POST handler for Stripe events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const event = JSON.parse(body);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.user_id || session.client_reference_id;

        if (userId && session.payment_status === 'paid') {
          await upgradeToPro(userId, session.customer_details?.email);

          // Update payment record
          await db.payment.updateMany({
            where: { providerPaymentId: session.id, provider: 'stripe' },
            data: { status: 'completed' },
          });

          // Set expiration
          const planType = session.metadata?.plan_type || 'pro_monthly';
          const months = planType === 'pro_yearly' ? 12 : 1;
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + months);

          await db.user.update({
            where: { id: userId },
            data: {
              planExpiresAt: expiresAt,
              stripeCustomerId: session.customer as string,
            },
          });
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object;
        await db.payment.updateMany({
          where: { providerPaymentId: session.id, provider: 'stripe' },
          data: { status: 'failed' },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (e) {
    console.error('Stripe webhook POST error:', e);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
