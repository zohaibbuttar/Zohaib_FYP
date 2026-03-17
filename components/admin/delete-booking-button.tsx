"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Trash2, Loader2 } from "lucide-react"

export function DeleteBookingButton({ bookingId }: { bookingId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleDelete() {
    const confirmed = confirm(
      "Are you sure you want to permanently delete this cancelled booking?\nThis action cannot be undone."
    )
    if (!confirmed) return

    setLoading(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Delete failed")
      toast.success("Booking deleted successfully")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Failed to delete booking")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleDelete}
      disabled={loading}
      variant="destructive"
      size="sm"
    >
      {loading
        ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Deleting...</>
        : <><Trash2 className="h-4 w-4 mr-2" />Delete</>
      }
    </Button>
  )
}
