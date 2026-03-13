import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get("x-sfpy-signature") || ""
  const webhookSecret = process.env.SAFEPAY_WEBHOOK_SECRET

  // Verify webhook HMAC-SHA256 signature
  if (webhookSecret) {
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(body)
      .digest("hex")
    if (expected !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const supabase = await createClient()
  const eventType = event?.type || event?.notification_type

  // ── Handle successful payment ──
  if (
    eventType === "payment:created" ||
    eventType === "payment:success" ||
    event?.payload?.state === "PAID"
  ) {
    const trackerToken = event?.payload?.tracker?.token || event?.token
    const referenceNumber = event?.payload?.reference_number || event?.reference || trackerToken

    if (!trackerToken) {
      return NextResponse.json({ error: "No tracker token" }, { status: 400 })
    }

    // Find booking — first by order_id (bookingId), then by tracker token
    const orderId = event?.payload?.order_id || event?.order_id
    let booking = null

    if (orderId) {
      const { data } = await supabase
        .from("bookings")
        .select("id, user_id, total_price")
        .eq("id", orderId)
        .single()
      booking = data
    }

    if (!booking) {
      const { data } = await supabase
        .from("bookings")
        .select("id, user_id, total_price")
        .eq("safepay_tracker_token", trackerToken)
        .single()
      booking = data
    }

    if (booking) {
      await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          status: "confirmed",
          safepay_reference_number: referenceNumber,
        })
        .eq("id", booking.id)

      await supabase
        .from("payments")
        .upsert(
          {
            booking_id: booking.id,
            user_id: booking.user_id,
            safepay_tracker_token: trackerToken,
            safepay_reference_number: referenceNumber,
            amount: booking.total_price,
            currency: "pkr",
            status: "succeeded",
          },
          { onConflict: "safepay_tracker_token" }
        )
    }
    // Return 200 even if booking not found — prevents Safepay retry loops
  }

  // ── Handle failed payment ──
  if (eventType === "payment:failed" || event?.payload?.state === "FAILED") {
    const trackerToken = event?.payload?.tracker?.token || event?.token
    if (trackerToken) {
      await supabase
        .from("bookings")
        .update({ payment_status: "unpaid", status: "pending" })
        .eq("safepay_tracker_token", trackerToken)
    }
  }

  return NextResponse.json({ received: true })
}

// GET for webhook verification ping
export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint active" })
}