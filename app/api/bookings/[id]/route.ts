import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await context.params

  if (!bookingId || bookingId === "undefined") {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  // Delete related records first
  await supabase.from("agreements").delete().eq("booking_id", bookingId)
  await supabase.from("payments").delete().eq("booking_id", bookingId)

  const { error, count } = await supabase
    .from("bookings")
    .delete({ count: "exact" })
    .eq("id", bookingId)
    .eq("status", "cancelled")

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (count === 0) return NextResponse.json(
    { error: "Booking not found or not cancelled" },
    { status: 404 }
  )

  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: bookingId } = await context.params

  if (!bookingId || bookingId === "undefined") {
    return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("id", user.id).single()
  if (profile?.role !== "admin")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const body = await request.json()
  const { data, error } = await supabase
    .from("bookings").update(body).eq("id", bookingId).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
