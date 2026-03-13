"use client"

import { useState } from "react"

interface PayBookingButtonProps {
  bookingId: string
  vehicleName: string
  totalPrice: number
}

export function PayBookingButton({ bookingId, vehicleName, totalPrice }: PayBookingButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePayment = async () => {
    setLoading(true)
    setError(null)

    try {
      // ✅ Call the correct route path
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleName, totalPrice, bookingId }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Payment initiation failed")
      }

      // ✅ Server now returns checkout_url directly — just redirect
      const checkoutUrl = data?.checkout_url

      if (!checkoutUrl) {
        console.error("No checkout_url in response:", data)
        throw new Error("Could not get payment URL. Please try again.")
      }

      // ✅ Redirect user to SafePay checkout page
      window.location.href = checkoutUrl

    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err.message || "Something went wrong. Please try again.")
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
        {loading ? (
          <span className="flex items-center gap-2">
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Processing...
          </span>
        ) : (
          "Pay Now"
        )}
      </button>
      {error && (
        <p className="text-xs text-red-400 max-w-[200px] text-right leading-tight">{error}</p>
      )}
    </div>
  )
}
