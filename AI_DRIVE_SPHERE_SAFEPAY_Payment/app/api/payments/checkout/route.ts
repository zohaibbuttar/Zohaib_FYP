import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let body: any
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const { bookingId, vehicleName, totalPrice } = body

  if (!bookingId || !totalPrice) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
  }

  const secretKey = process.env.SAFEPAY_SECRET_KEY
  const publicKey = process.env.SAFEPAY_PUBLIC_KEY
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  const BASE = "https://sandbox.api.getsafepay.com"

  if (!secretKey || !publicKey) {
    return NextResponse.json({ error: "Payment gateway not configured" }, { status: 503 })
  }

  // Amount in paisas (PKR × 100)
  const amountInPaisas = Math.round(Number(totalPrice) * 100)
  console.log(`[safepay] booking=${bookingId} amount=PKR${totalPrice} paisas=${amountInPaisas}`)

  try {
    // ── STEP 1: Create tracker ─────────────────────────────────
    const sessionRes = await fetch(`${BASE}/order/v1/init`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": secretKey,
      },
      body: JSON.stringify({
        client: publicKey,
        amount: amountInPaisas,
        currency: "PKR",
        environment: "sandbox",
      }),
    })

    const sessionText = await sessionRes.text()
    console.log("[safepay] tracker status:", sessionRes.status)
    console.log("[safepay] tracker body:", sessionText.slice(0, 300))

    let sessionData: any
    try {
      sessionData = JSON.parse(sessionText)
    } catch {
      return NextResponse.json(
        { error: `Safepay returned invalid response: ${sessionText.slice(0, 100)}` },
        { status: 502 }
      )
    }

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: sessionData?.status?.errors?.[0] || "Tracker creation failed" },
        { status: 502 }
      )
    }

    const trackerToken = sessionData?.data?.token
    if (!trackerToken) {
      console.error("[safepay] full response:", JSON.stringify(sessionData))
      return NextResponse.json({ error: "No tracker token returned from Safepay" }, { status: 502 })
    }
    console.log("[safepay] ✅ tracker:", trackerToken)

    // ── STEP 2: Get auth token (tbt) ───────────────────────────
    const authRes = await fetch(`${BASE}/client/passport/v1/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SFPY-MERCHANT-SECRET": secretKey,
      },
      body: JSON.stringify({}),
    })

    const authText = await authRes.text()
    console.log("[safepay] auth status:", authRes.status)

    let authData: any
    try {
      authData = JSON.parse(authText)
    } catch {
      return NextResponse.json(
        { error: `Auth token invalid response: ${authText.slice(0, 100)}` },
        { status: 502 }
      )
    }

    if (!authRes.ok) {
      return NextResponse.json(
        { error: authData?.status?.errors?.[0] || "Auth token failed" },
        { status: 502 }
      )
    }

    const tbt = authData?.data
    if (!tbt || typeof tbt !== "string") {
      console.error("[safepay] full auth response:", JSON.stringify(authData))
      return NextResponse.json({ error: "No auth token (tbt) returned from Safepay" }, { status: 502 })
    }
    console.log("[safepay] ✅ tbt received")

    // ── STEP 3: Build checkout URL ─────────────────────────────
    const params = new URLSearchParams({
      env: "sandbox",
      beacon: trackerToken,
      tbt: tbt,
      source: "hosted",
      redirect_url: `${appUrl}/dashboard/bookings?success=true`,
      cancel_url: `${appUrl}/dashboard/bookings?cancelled=true`,
    })

    const checkoutUrl = `${BASE}/checkout?${params.toString()}`
    console.log("[safepay] ✅ checkout URL ready")

    // ── STEP 4: Save tracker to booking (non-fatal) ────────────
    try {
      await supabase
        .from("bookings")
        .update({
          safepay_tracker_token: trackerToken,
          payment_status: "unpaid",
        })
        .eq("id", bookingId)
    } catch (_) {}

    return NextResponse.json({ url: checkoutUrl, tracker_token: trackerToken })

  } catch (err: any) {
    console.error("[safepay] unexpected error:", err)
    return NextResponse.json({ error: `Server error: ${err.message}` }, { status: 500 })
  }
}
