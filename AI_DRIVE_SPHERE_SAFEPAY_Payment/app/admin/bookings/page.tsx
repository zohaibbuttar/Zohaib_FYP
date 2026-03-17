import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import { GenerateAgreementButton } from "@/components/dashboard/generate-agreement-button"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "secondary",
  active: "default",
  completed: "secondary",
  cancelled: "destructive",
}

export default async function AdminBookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from("bookings")
    .select("*, vehicles(name, type, plate_number), profiles:user_id(full_name, email)")
    .order("created_at", { ascending: false })

  // Get all agreements to check which bookings already have one
  const { data: agreements } = await supabase
    .from("agreements")
    .select("booking_id, status")

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">All Bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage bookings and generate rental agreements</p>
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
            const agreement = agreements?.find((a: any) => a.booking_id === booking.id)
            const hasAgreement = !!agreement
            const agreementSigned = agreement?.status === "signed"

            return (
              <Card key={booking.id}>
                <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="font-serif text-lg font-bold text-card-foreground">
                        {booking.vehicles?.name || "Vehicle"}
                      </h3>
                      <Badge variant={statusColors[booking.status] || "outline"}>{booking.status}</Badge>
                      <Badge variant={booking.payment_status === "paid" ? "default" : "outline"}>
                        {booking.payment_status || "unpaid"}
                      </Badge>
                      {hasAgreement && (
                        <Badge variant={agreementSigned ? "default" : "secondary"}>
                          {agreementSigned ? "✅ Agreement Signed" : "📋 Agreement Sent"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Customer: <span className="font-medium">{booking.profiles?.full_name || "N/A"}</span>
                      {" · "}{booking.profiles?.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {booking.vehicles?.plate_number} · {booking.vehicles?.type}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(booking.start_date).toLocaleDateString("en-PK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                      {" → "}
                      {new Date(booking.end_date).toLocaleDateString("en-PK", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                    </p>
                    <p className="text-sm font-semibold text-card-foreground">
                      PKR {Number(booking.total_price).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 items-end">
                    {!hasAgreement && booking.status !== "cancelled" && (
                      <GenerateAgreementButton
                        bookingId={booking.id}
                        userId={booking.user_id}
                        vehicleId={booking.vehicle_id}
                        vehicleName={booking.vehicles?.name}
                        customerName={booking.profiles?.full_name}
                        startDate={booking.start_date}
                        endDate={booking.end_date}
                        totalPrice={booking.total_price}
                        plateNumber={booking.vehicles?.plate_number}
                      />
                    )}
                    {hasAgreement && !agreementSigned && (
                      <p className="text-xs text-amber-500">⏳ Waiting for customer signature</p>
                    )}
                    {agreementSigned && (
                      <p className="text-xs text-green-400">✅ Customer signed agreement</p>
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
