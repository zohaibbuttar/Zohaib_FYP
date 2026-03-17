"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { FileText, Loader2 } from "lucide-react"

type Props = {
  bookingId: string
  userId: string
  vehicleId: string
  vehicleName: string
  customerName: string
  startDate: string
  endDate: string
  totalPrice: number
  plateNumber: string
}

export function GenerateAgreementButton({
  bookingId, userId, vehicleId, vehicleName,
  customerName, startDate, endDate, totalPrice, plateNumber,
}: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleGenerate() {
    setLoading(true)
    const supabase = createClient()

    const start = new Date(startDate).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })
    const end = new Date(endDate).toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })
    const days = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))

    const agreementText = `
RENTAL AGREEMENT — DRIVE SPHERE

Date: ${new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })}

PARTIES:
- Rental Company: Drive Sphere
- Customer: ${customerName || "Customer"}

VEHICLE DETAILS:
- Vehicle: ${vehicleName}
- Plate Number: ${plateNumber}

RENTAL PERIOD:
- Start Date: ${start}
- End Date: ${end}
- Duration: ${days} day${days !== 1 ? "s" : ""}

PAYMENT:
- Total Amount: PKR ${Number(totalPrice).toLocaleString()}
- Payment Method: Safepay (Online)

TERMS & CONDITIONS:
1. The customer agrees to use the vehicle responsibly and lawfully.
2. The vehicle must be returned in the same condition as received.
3. Any damage caused during the rental period is the customer's responsibility.
4. Fuel costs are the responsibility of the customer.
5. The customer must have a valid driving license at all times.
6. Subletting or transferring the vehicle to another person is strictly prohibited.
7. Drive Sphere reserves the right to terminate the agreement in case of misuse.
8. Late returns will incur additional charges at the daily rental rate.
9. The customer is responsible for any traffic violations during the rental period.
10. In case of an accident, the customer must immediately inform Drive Sphere.

By signing this agreement, the customer confirms they have read, understood, and agreed to all the above terms and conditions.
    `.trim()

    const { error } = await supabase.from("agreements").insert({
      user_id: userId,
      booking_id: bookingId,
      vehicle_id: vehicleId,
      agreement_text: agreementText,
      status: "draft",
    })

    if (error) {
      toast.error("Failed to generate agreement: " + error.message)
    } else {
      toast.success("Agreement generated and sent to customer!")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm" variant="outline">
      {loading ? (
        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
      ) : (
        <><FileText className="h-4 w-4 mr-2" /> Generate Agreement</>
      )}
    </Button>
  )
}
