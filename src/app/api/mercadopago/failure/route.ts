import { NextRequest, NextResponse } from 'next/server';

// MercadoPago Failure redirect handler
export async function GET(request: NextRequest) {
  // Just redirect to the app with a failure flag
  return NextResponse.redirect(new URL('/?checkout=cancelled', request.url));
}
