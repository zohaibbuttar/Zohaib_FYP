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

    const start = new Date(startDate)
    const end = new Date(endDate)
    const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const startStr = start.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })
    const endStr = end.toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })
    const today = new Date().toLocaleDateString("en-PK", { year: "numeric", month: "long", day: "numeric" })

    const agreementText = `DRIVE SPHERE — CAR RENTAL AGREEMENT

This Car Rental Agreement ("Agreement") is made on ${today} between Drive Sphere, hereinafter referred to as "the Company," and ${customerName || "the Renter"}, hereinafter referred to as "the Renter."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. VEHICLE DETAILS

   Vehicle: ${vehicleName}
   Plate Number: ${plateNumber}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

2. RENTAL PERIOD

   Start Date : ${startStr}
   End Date   : ${endStr}
   Duration   : ${days} day${days !== 1 ? "s" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. RENTAL FEES

   Total Rental Fee : PKR ${Number(totalPrice).toLocaleString()}
   Payment Method   : Safepay (Online)
   Payment is due at the time of rental confirmation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

4. LIABILITY AND ASSUMPTION OF RISK

   The Renter acknowledges that driving carries inherent risks. The Renter agrees to assume all risks associated with the use of the rented vehicle and releases the Company from liability for any injuries, accidents, or damages incurred during the rental period, except as required by law.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. CARE AND RETURN OF VEHICLE

   The Renter agrees to take proper care of the rented vehicle and return it in the same condition as received, barring normal wear and tear. The Renter agrees to pay for any damage, loss, or excessive cleaning required due to misuse during the rental period.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

6. FUEL POLICY

   The Renter agrees to return the vehicle with the same fuel level as at the start of the rental. Additional fuel charges will apply if the fuel level is lower upon return.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

7. PROHIBITED USES

   The Renter shall NOT:
   • Sublet or transfer the vehicle to another person
   • Use the vehicle for illegal activities
   • Drive outside the agreed territory
   • Allow unlicensed drivers to operate the vehicle

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

8. INSURANCE

   The Renter acknowledges that basic insurance coverage is included. The Renter is responsible for any damage not covered by the policy.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

9. ACCIDENTS & EMERGENCIES

   In case of an accident, the Renter must:
   • Immediately inform Drive Sphere
   • Not leave the scene without filing a report
   • Cooperate fully with authorities

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10. GOVERNING LAW

    This Agreement shall be governed by the laws of Pakistan.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

By signing this agreement, the Renter confirms they have read, understood, and agreed to all terms and conditions stated above.

Renter: ${customerName || "___________________________"}
Date  : ${today}`

    const { error } = await supabase.from("agreements").insert({
      user_id: userId,
      booking_id: bookingId,
      vehicle_id: vehicleId,
      content: agreementText,
      agreement_text: agreementText,
      status: "draft",
    })

    if (error) {
      toast.error("Failed to generate: " + error.message)
    } else {
      toast.success("Agreement generated and sent to customer!")
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <Button onClick={handleGenerate} disabled={loading} size="sm" variant="outline">
      {loading
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
        : <><FileText className="h-4 w-4 mr-2" />Generate Agreement</>
      }
    </Button>
  )
}
