cat > "app/admin/bookings/page.tsx" << 'EOF'
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import { GenerateAgreementButton } from "@/components/dashboard/generate-agreement-button"
import { DeleteBookingButton } from "@/components/admin/delete-booking-button"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline", confirmed: "secondary", active: "default",
  completed: "secondary", cancelled: "destructive",
}

export default async function AdminBookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      user_id,
      vehicle_id,
      start_date,
      end_date,
      total_price,
      status,
      payment_status,
      notes,
      created_at,
      vehicles:vehicle_id(id, name, type, plate_number),
      profiles:user_id(id, full_name, email)
    `)
    .order("created_at", { ascending: false })

  const { data: agreements } = await supabase
    .from("agreements")
    .select("booking_id, status")

  const total = bookings?.length || 0
  const pending = bookings?.filter((b: any) => b.status === "pending").length || 0
  const confirmed = bookings?.filter((b: any) => b.status === "confirmed").length || 0
  const cancelled = bookings?.filter((b: any) => b.status === "cancelled").length || 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">All Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage bookings, generate agreements, and remove cancelled bookings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pending}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{confirmed}</p>
          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-400">{cancelled}</p>
          <p className="text-xs text-muted-foreground mt-1">Cancelled</p>
        </CardContent></Card>
      </div>

      {!bookings || bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No bookings yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {bookings.map((booking: any) => {
            const bookingId = booking.id
            const agreement = agreements?.find((a: any) => a.booking_id === bookingId)
            const hasAgreement = !!agreement
            const agreementSigned = agreement?.status === "signed"
            const isCancelled = booking.status === "cancelled"

            const start = new Date(booking.start_date)
            const end = new Date(booking.end_date)
            const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))

            return (
              <Card
                key={bookingId}
                className={isCancelled ? "opacity-60 border-red-500/20" : ""}
              >
                <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-serif text-lg font-bold">
                        {booking.vehicles?.name || "Vehicle"}
                      </h3>
                      <Badge variant={statusColors[booking.status] || "outline"}>
                        {booking.status}
                      </Badge>
                      <Badge variant={booking.payment_status === "paid" ? "default" : "outline"}>
                        {booking.payment_status || "unpaid"}
                      </Badge>
                      {hasAgreement && !isCancelled && (
                        <Badge variant={agreementSigned ? "default" : "secondary"}>
                          {agreementSigned ? "✅ Signed" : "📋 Sent"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer:{" "}
                      <span className="font-medium text-foreground">
                        {booking.profiles?.full_name || "N/A"}
                      </span>
                      {" · "}
                      <span className="text-xs">{booking.profiles?.email}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.vehicles?.plate_number} · {booking.vehicles?.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {start.toLocaleDateString("en-PK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      {" → "}
                      {end.toLocaleDateString("en-PK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      {" · "}{days} day{days !== 1 ? "s" : ""}
                    </p>
                    <p className="text-base font-bold text-foreground">
                      PKR {Number(booking.total_price).toLocaleString()}
                    </p>
                    {/* Debug — remove after testing */}
                    <p className="text-xs text-muted-foreground/40">ID: {bookingId}</p>
                  </div>

                  <div className="flex flex-col gap-2 items-start md:items-end">
                    {isCancelled && (
                      <DeleteBookingButton bookingId={bookingId} />
                    )}
                    {!isCancelled && !hasAgreement && (
                      <GenerateAgreementButton
                        bookingId={bookingId}
                        userId={booking.user_id}
                        vehicleId={booking.vehicle_id}
                        vehicleName={booking.vehicles?.name || "Vehicle"}
                        customerName={booking.profiles?.full_name || "Customer"}
                        startDate={booking.start_date}
                        endDate={booking.end_date}
                        totalPrice={Number(booking.total_price)}
                        plateNumber={booking.vehicles?.plate_number || "N/A"}
                      />
                    )}
                    {!isCancelled && hasAgreement && !agreementSigned && (
                      <p className="text-xs text-amber-500">⏳ Waiting for signature</p>
                    )}
                    {!isCancelled && agreementSigned && (
                      <p className="text-xs text-green-400">✅ Signed — payment unlocked</p>
                    )}
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
EOF

rm -rf .next && npm run dev -- --turbo
