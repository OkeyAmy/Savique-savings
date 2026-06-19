import { Chainrails, crapi } from "@chainrails/sdk";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { destinationChain, token, amount, recipient } = await request.json();

    // Configure Chainrails SDK with your secret API key (server‑side only)
    Chainrails.config({
      api_key: process.env.CHAINRAILS_API_KEY || "",
      env: "production",
    });

    // Create a payment session via the SDK. The SDK returns an object with a session token.
    // Using the low‑level client (crapi) to create a session.
    const session = await crapi.auth.getSessionToken({
  amount,
  recipient,
  destinationChain,
  token,
});

   return NextResponse.json(session);


  } catch (error) {
    console.error("[create‑session] error", error);
    // Return a 500 so the client can handle the failure gracefully.
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
