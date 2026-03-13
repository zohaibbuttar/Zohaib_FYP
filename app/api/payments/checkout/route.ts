import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { bookingId, vehicleName, totalPrice } = await request.json()

  if (!bookingId || !vehicleName || !totalPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const secretKey = process.env.SAFEPAY_SECRET_KEY
  const publicKey = process.env.SAFEPAY_PUBLIC_KEY

  if (!secretKey || !publicKey) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

  try {
    // ── Step 1: Create a tracker (payment session) with Safepay ──
    const sessionRes = await fetch("https://sandbox.api.getsafepay.com/order/v1/init/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${secretKey}`,
      },
      body: JSON.stringify({
        client: publicKey,            // ✅ correct field (not merchant_api_key)
        intent: "CYBERSOURCE",
        mode: "payment",
        currency: "PKR",
        amount: Math.round(totalPrice * 100),  // in paisa
        order_id: bookingId,
      }),
    })

    // Read raw text first — Safepay sometimes returns HTML on auth errors
    const rawText = await sessionRes.text()
    console.log("Safepay raw response status:", sessionRes.status)
    console.log("Safepay raw response:", rawText.slice(0, 500))

    if (rawText.trim().startsWith("<")) {
      console.error("Safepay returned HTML (auth error):", rawText.slice(0, 300))
      return NextResponse.json(
        { error: "Safepay authentication failed. Check your API keys." },
        { status: 502 }
      )
    }

    let sessionData: any
    try {
      sessionData = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: "Invalid JSON from Safepay" }, { status: 502 })
    }

    if (!sessionRes.ok) {
      console.error("Safepay error response:", sessionData)
      return NextResponse.json(
        { error: sessionData?.message || sessionData?.error || "Safepay session creation failed" },
        { status: 502 }
      )
    }

    // Extract tracker token — try multiple possible paths
    const trackerToken =
      sessionData?.data?.tracker?.token ||
      sessionData?.tracker?.token ||
      sessionData?.token

    if (!trackerToken) {
      console.error("No tracker token in Safepay response:", sessionData)
      return NextResponse.json(
        { error: "No tracker token returned from Safepay" },
        { status: 502 }
      )
    }

    // ── Step 2: Build the Safepay hosted checkout URL ──
    const checkoutUrl =
      `https://sandbox.api.getsafepay.com/components?` +
      `beacon=${encodeURIComponent(trackerToken)}` +
      `&redirect_url=${encodeURIComponent(`${appUrl}/dashboard/bookings?success=true`)}` +
      `&cancel_url=${encodeURIComponent(`${appUrl}/dashboard/bookings?cancelled=true`)}` +
      `&order_id=${encodeURIComponent(bookingId)}`

    // ── Step 3: Save tracker token to booking ──
    await supabase
      .from("bookings")
      .update({
        safepay_tracker_token: trackerToken,
        payment_status: "unpaid",
      })
      .eq("id", bookingId)

    return NextResponse.json({ url: checkoutUrl, tracker_token: trackerToken })
  } catch (err: any) {
    console.error("Payment error:", err)
    return NextResponse.json({ error: err.message || "Payment failed" }, { status: 500 })
  }
}