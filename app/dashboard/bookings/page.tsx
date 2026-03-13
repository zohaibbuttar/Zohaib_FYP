"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface PayBookingButtonProps {
  bookingId: string
  vehicleName: string
  totalPrice: number
}

export function PayBookingButton({ bookingId, vehicleName, totalPrice }: PayBookingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleName, totalPrice, bookingId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Payment initiation failed")
      }

      // SafePay returns a tracker token — redirect to SafePay checkout
      const trackerToken =
        data?.data?.tracker?.token ||
        data?.tracker?.token ||
        data?.token

      if (!trackerToken) {
        console.error("SafePay response:", data)
        throw new Error("No tracker token received from SafePay")
      }

      // Redirect to SafePay sandbox checkout
      const checkoutUrl = `https://sandbox.api.getsafepay.com/checkout/pay?tracker=${trackerToken}&source=custom`
      window.location.href = checkoutUrl

    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handlePayment}
        disabled={loading}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Processing..." : "Pay Now"}
      </button>
      {error && (
        <p className="text-xs text-red-400 max-w-[180px] text-right">{error}</p>
      )}
    </div>
  )
}