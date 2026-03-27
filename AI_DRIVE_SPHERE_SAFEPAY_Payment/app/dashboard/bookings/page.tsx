import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays, CheckCircle2, FileText, CreditCard } from "lucide-react"
import Link from "next/link"
import { CancelBookingButton } from "@/components/dashboard/cancel-booking-button"
import { PayBookingButton } from "@/components/dashboard/pay-booking-button"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", active: "default",
  completed: "secondary", cancelled: "destructive",
}

const paymentColors: Record<string, string> = {
  unpaid: "text-amber-500", paid: "text-green-400", refunded: "text-blue-400",
}

export default async function BookingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, vehicles(name, type, plate_number, image_url)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const { data: agreements } = await supabase
    .from("agreements")
    .select("id, booking_id, status")
    .eq("user_id", user!.id)

  // Check CNIC verification status
  const { data: cnicDoc } = await supabase
    .from("cnic_documents")
    .select("status, front_url, back_url")
    .eq("user_id", user!.id)
    .single()

  const cnicVerified = cnicDoc?.status === "verified"
  const cnicUploaded = !!cnicDoc?.front_url && !!cnicDoc?.back_url

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">My Bookings</h1>
          <p className="mt-1 text-sm text-muted-foreground">View and manage all your vehicle rentals</p>
        </div>
        <Link
          href="/dashboard/vehicles"
          className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          New Booking
        </Link>
      </div>

      {/* CNIC warning banner */}
      {!cnicVerified && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <CreditCard className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-500">CNIC Verification Required</p>
            <p className="text-xs text-amber-500/80 mt-0.5">
              {!cnicUploaded
                ? "Upload your CNIC to unlock payments. "
                : "Your CNIC is pending admin verification. "}
              <Link href="/dashboard/agreements" className="underline">
                Go to Agreements →
              </Link>
            </p>
          </div>
        </div>
      )}

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No bookings yet.{" "}
              <Link href="/dashboard/vehicles" className="text-accent hover:underline">
                Browse vehicles
              </Link>{" "}
              to make your first booking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking: any) => {
            const needsPayment =
              booking.status === "pending" && booking.payment_status === "unpaid"
            const isPaid = booking.payment_status === "paid"

            const agreement = agreements?.find((a: any) => a.booking_id === booking.id)
            const agreementExists = !!agreement
            const agreementSigned = agreement?.status === "signed"

            // Both CNIC verified AND agreement signed required
            const canPay = needsPayment && cnicVerified && agreementSigned

            const start = new Date(booking.start_date)
            const end = new Date(booking.end_date)
            const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
            const startFormatted = start.toLocaleDateString("en-PK", {
              weekday: "short", year: "numeric", month: "short", day: "numeric"
            })
            const endFormatted = end.toLocaleDateString("en-PK", {
              weekday: "short", year: "numeric", month: "short", day: "numeric"
            })

            // Determine what's blocking payment
            const blockReason = needsPayment
              ? !cnicUploaded
                ? "Upload your CNIC first"
                : !cnicVerified
                ? "Waiting for CNIC verification"
                : !agreementExists
                ? "Waiting for admin to generate agreement"
                : !agreementSigned
                ? "Sign your rental agreement first"
                : null
              : null

            return (
              <Card key={booking.id} className={needsPayment ? "border-amber-500/30" : ""}>
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-serif text-lg font-bold text-card-foreground">
                        {booking.vehicles?.name || "Vehicle"}
                      </h3>
                      <Badge variant={statusColors[booking.status] || "outline"}>
                        {booking.status}
                      </Badge>
                      {isPaid && (
                        <span className="flex items-center gap-1 text-xs text-green-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Paid
                        </span>
                      )}
                      {needsPayment && (
                        <span className="text-xs text-amber-500 font-medium animate-pulse">
                          ⚠️ Payment Required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {booking.vehicles?.plate_number} · {booking.vehicles?.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {startFormatted} → {endFormatted}
                    </p>
                    {booking.notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">{booking.notes}</p>
                    )}

                    {/* Step-by-step status indicators */}
                    {needsPayment && (
                      <div className="mt-2 flex flex-col gap-1">
                        <StepIndicator
                          done={cnicVerified}
                          pending={cnicUploaded && !cnicVerified}
                          label={
                            cnicVerified ? "CNIC verified ✓" :
                            cnicUploaded ? "CNIC pending admin approval" :
                            "Upload CNIC"
                          }
                          href="/dashboard/agreements"
                        />
                        <StepIndicator
                          done={agreementSigned}
                          pending={agreementExists && !agreementSigned}
                          label={
                            agreementSigned ? "Agreement signed ✓" :
                            agreementExists ? "Sign your rental agreement" :
                            "Waiting for admin to generate agreement"
                          }
                          href={agreementExists ? "/dashboard/agreements" : undefined}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="text-right">
                      <p className="text-xl font-bold text-card-foreground">
                        PKR {Number(booking.total_price).toLocaleString()}
                      </p>
                      <p className={`text-xs font-medium ${paymentColors[booking.payment_status] || "text-muted-foreground"}`}>
                        {booking.payment_status || "unpaid"}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {canPay ? (
                        <PayBookingButton
                          bookingId={booking.id}
                          vehicleName={booking.vehicles?.name || "Vehicle"}
                          totalPrice={Number(booking.total_price)}
                          startDate={startFormatted}
                          endDate={endFormatted}
                          days={days}
                        />
                      ) : needsPayment ? (
                        <button
                          disabled
                          title={blockReason || "Requirements not met"}
                          className="flex items-center gap-2 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-2 text-xs font-medium text-gray-400 cursor-not-allowed"
                        >
                          🔒 Pay PKR {Number(booking.total_price).toLocaleString()}
                        </button>
                      ) : null}

                      {(booking.status === "pending" || booking.status === "confirmed") && (
                        <CancelBookingButton bookingId={booking.id} />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepIndicator({
  done, pending, label, href
}: {
  done: boolean
  pending: boolean
  label: string
  href?: string
}) {
  const content = (
    <span className={`text-xs flex items-center gap-1 ${
      done ? "text-green-400" :
      pending ? "text-amber-500" :
      "text-muted-foreground"
    }`}>
      {done ? "✅" : pending ? "⏳" : "⬜"} {label}
    </span>
  )

  if (href && !done) {
    return (
      <Link href={href} className="hover:opacity-80 underline underline-offset-2">
        {content}
      </Link>
    )
  }

  return content
}
EOF
