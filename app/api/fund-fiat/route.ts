import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Environment variable holding the Chainrails API key.
const CHAINRAILS_API_KEY = process.env.CHAINRAILS_API_KEY;

if (!CHAINRAILS_API_KEY) {
  console.warn('CHAINRAILS_API_KEY is not set – fiat integration will fail');
}

/**
 * POST /api/fund-fiat
 * Body:
 * {
 *   fiatCurrency: string;
 *   amount: number; // fiat amount the user wants to send
 *   destinationChain: string; // e.g. "ARBITRUM_SEPOLIA"
 *   recipientAddress: string; // user's wallet address on destination chain
 *   countryCode?: string; // optional, required for multi‑country currencies
 * }
 *
 * Returns payment details for a direct provider (no widget URL).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fiatCurrency, amount, destinationChain, recipientAddress, countryCode } = body;

    if (!fiatCurrency || !amount || !destinationChain || !recipientAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1️⃣ Get the best direct quote
    const quoteUrl = new URL('https://api.chainrails.io/api/v1/ramp/quotes');
    quoteUrl.searchParams.append('fiatCurrency', fiatCurrency);
    quoteUrl.searchParams.append('cryptoAmount', amount.toString()); // request USDC amount based on fiat
    quoteUrl.searchParams.append('destinationChain', destinationChain);
    if (countryCode) quoteUrl.searchParams.append('countryCode', countryCode);
    // directOnly ensures we only get providers that give payment details
    quoteUrl.searchParams.append('directOnly', 'true');

    const quoteRes = await fetch(quoteUrl.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CHAINRAILS_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!quoteRes.ok) {
      const err = await quoteRes.text();
      return NextResponse.json({ error: 'Failed to fetch quotes', details: err }, { status: 502 });
    }

    const quoteData = await quoteRes.json();
    if (!quoteData.quotes || quoteData.quotes.length === 0) {
      return NextResponse.json({ error: 'No quotes returned' }, { status: 404 });
    }

    // Pick the first (cheapest) direct quote
    const bestQuote = quoteData.quotes[0];

    // 2️⃣ Create the ramp order using the same parameters plus the selected provider
    const orderPayload = {
      provider: bestQuote.provider,
      fiatCurrency,
      cryptoAmount: bestQuote.cryptoAmount, // USDC amount from quote
      destinationChain,
      recipientAddress,
      countryCode: countryCode ?? undefined,
    };

    const orderRes = await fetch('https://api.chainrails.io/api/v1/ramp/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${CHAINRAILS_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    if (!orderRes.ok) {
      const err = await orderRes.text();
      return NextResponse.json({ error: 'Failed to create order', details: err }, { status: 502 });
    }

    const orderData = await orderRes.json();

    // Direct providers include a `paymentDetails` field (structure may vary).
    // Forward the entire response – the front‑end can render whatever fields are present.
    return NextResponse.json({ order: orderData }, { status: 200 });
  } catch (e) {
    console.error('Unexpected error in /api/fund-fiat', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
