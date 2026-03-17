import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, Clock } from "lucide-react"

export default async function AdminAgreementsPage() {
  const supabase = await createClient()

  const { data: agreements } = await supabase
    .from("agreements")
    .select("*, vehicles(name, plate_number), bookings(start_date, end_date, total_price, payment_status), profiles:user_id(full_name, email, phone)")
    .order("created_at", { ascending: false })

  const total = agreements?.length || 0
  const signed = agreements?.filter((a: any) => a.status === "signed").length || 0
  const pending = agreements?.filter((a: any) => a.status === "draft").length || 0

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Rental Agreements</h1>
        <p className="mt-1 text-sm text-muted-foreground">All customer rental agreements</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground mt-1">Total</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-500">{pending}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending Signature</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{signed}</p>
          <p className="text-xs text-muted-foreground mt-1">Signed</p>
        </CardContent></Card>
      </div>

      {!agreements || agreements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              No agreements yet. Generate from the Bookings page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {agreements.map((agreement: any) => {
            const isSigned = agreement.status === "signed"
            const agreementContent = agreement.agreement_text || agreement.content || ""

            return (
              <Card key={agreement.id} className={isSigned ? "border-green-500/20" : "border-amber-500/30"}>
                <CardContent className="flex flex-col gap-4 p-6">

                  {/* Header */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-serif text-lg font-bold">{agreement.vehicles?.name}</h3>
                        <Badge variant={isSigned ? "default" : "outline"}>
                          {isSigned ? "✅ Signed" : "⏳ Pending"}
                        </Badge>
                        <Badge variant={agreement.bookings?.payment_status === "paid" ? "default" : "outline"}>
                          {agreement.bookings?.payment_status || "unpaid"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Plate: {agreement.vehicles?.plate_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(agreement.bookings?.start_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                        {" → "}
                        {new Date(agreement.bookings?.end_date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">PKR {Number(agreement.bookings?.total_price).toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Customer info */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/40">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Customer</p>
                      <p className="text-sm font-medium">{agreement.profiles?.full_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Email</p>
                      <p className="text-sm font-medium">{agreement.profiles?.email || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Phone</p>
                      <p className="text-sm font-medium">{agreement.profiles?.phone || "N/A"}</p>
                    </div>
                  </div>

                  {/* Agreement text */}
                  {agreementContent && (
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Agreement Content</p>
                      <div className="rounded-lg border border-border bg-white dark:bg-gray-950 p-6 max-h-72 overflow-y-auto">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                          {agreementContent}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Generated: {new Date(agreement.created_at).toLocaleString("en-PK")}
                    </p>
                    {isSigned ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Signed: {new Date(agreement.signed_at).toLocaleString("en-PK")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        Waiting for customer signature
                      </span>
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
