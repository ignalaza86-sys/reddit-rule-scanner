import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { upgradeToPro } from '@/lib/auth';

// MercadoPago Success redirect handler
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const planType = searchParams.get('plan') || 'pro_monthly';
    const isPending = searchParams.get('pending') === 'true';

    if (!userId) {
      return NextResponse.redirect(new URL('/?checkout=error', request.url));
    }

    if (isPending) {
      return NextResponse.redirect(new URL('/?checkout=pending', request.url));
    }

    // Payment was approved on the MP side — upgrade user
    // The webhook should have already handled this, but just in case
    const user = await db.user.findUnique({ where: { id: userId } });

    if (user && user.plan !== 'pro') {
      await upgradeToPro(userId);

      const months = planType === 'pro_yearly' ? 12 : 1;
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + months);

      await db.user.update({
        where: { id: userId },
        data: { planExpiresAt: expiresAt },
      });

      // Update pending payments
      await db.payment.updateMany({
        where: { userId, provider: 'mercadopago', status: 'pending' },
        data: { status: 'completed' },
      });
    }

    return NextResponse.redirect(new URL('/?checkout=success', request.url));
  } catch (e) {
    console.error('MP success handler error:', e);
    return NextResponse.redirect(new URL('/?checkout=error', request.url));
  }
}
