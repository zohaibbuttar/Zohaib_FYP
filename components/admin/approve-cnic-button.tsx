"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

export function ApproveCnicButton({ cnicId, userId }: { cnicId: string; userId: string }) {
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null)
  const router = useRouter()

  async function handle(action: "approve" | "reject") {
    setLoading(action)
    const supabase = createClient()

    const { error } = await supabase
      .from("cnic_documents")
      .update({
        status: action === "approve" ? "verified" : "rejected",
        verified_at: new Date().toISOString(),
      })
      .eq("id", cnicId)

    if (error) {
      toast.error("Failed: " + error.message)
    } else {
      toast.success(action === "approve" ? "CNIC verified successfully!" : "CNIC rejected.")
      router.refresh()
    }
    setLoading(null)
  }

  return (
    <div className="flex gap-3 pt-2 border-t border-border">
      <Button
        onClick={() => handle("approve")}
        disabled={loading !== null}
        className="bg-green-600 hover:bg-green-700 text-white"
        size="sm"
      >
        {loading === "approve" ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Approving...</>
        ) : (
          <><CheckCircle2 className="h-4 w-4 mr-2" /> Approve CNIC</>
        )}
      </Button>
      <Button
        onClick={() => handle("reject")}
        disabled={loading !== null}
        variant="destructive"
        size="sm"
      >
        {loading === "reject" ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Rejecting...</>
        ) : (
          <><XCircle className="h-4 w-4 mr-2" /> Reject</>
        )}
      </Button>
    </div>
  )
}
