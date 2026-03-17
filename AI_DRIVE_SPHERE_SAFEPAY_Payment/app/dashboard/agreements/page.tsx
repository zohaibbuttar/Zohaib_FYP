import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2 } from "lucide-react"
import { SignAgreementButton } from "@/components/dashboard/sign-agreement-button"
import { CnicUploadSection } from "@/components/dashboard/cnic-upload-section"

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  signed: "default",
  expired: "destructive",
}

export default async function AgreementsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: agreements } = await supabase
    .from("agreements")
    .select("*, vehicles(id, name, plate_number), bookings(start_date, end_date, status, total_price)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })

  const { data: cnicDocs } = await supabase
    .from("cnic_documents")
    .select("*")
    .eq("user_id", user!.id)
    .single()

  const cnicUploaded = !!cnicDocs?.front_url && !!cnicDocs?.back_url

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Rental Agreements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read and sign your rental agreements before making payment
        </p>
      </div>

      <CnicUploadSection userId={user!.id} existingDocs={cnicDocs} />

      {!agreements || agreements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center">
              No agreements yet.<br />
              Agreements will appear here once an admin reviews your booking.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {agreements.map((agreement: any) => (
            <Card key={agreement.id} className={agreement.status === "draft" ? "border-blue-500/30" : ""}>
              <CardContent className="flex flex-col gap-4 p-6">

                {/* Header */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-serif text-lg font-bold text-card-foreground">
                      {agreement.vehicles?.name || "Vehicle"}
                    </h3>
                    <Badge variant={statusColors[agreement.status] || "outline"}>
                      {agreement.status === "draft" ? "📋 Pending Signature" : "✅ Signed"}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-card-foreground">
                      PKR {Number(agreement.bookings?.total_price).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(agreement.bookings?.start_date).toLocaleDateString("en-PK")} —{" "}
                      {new Date(agreement.bookings?.end_date).toLocaleDateString("en-PK")}
                    </p>
                  </div>
                </div>

                {/* Agreement text */}
                {agreement.agreement_text && (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-muted-foreground font-mono leading-relaxed">
                      {agreement.agreement_text}
                    </pre>
                  </div>
                )}

                {/* Signed info or Sign button */}
                {agreement.status === "signed" ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                    <CheckCircle2 className="h-4 w-4" />
                    Signed on {new Date(agreement.signed_at).toLocaleString("en-PK")}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {!cnicUploaded && (
                      <p className="text-xs text-amber-500">
                        ⚠️ Upload your CNIC above before signing this agreement
                      </p>
                    )}
                    <SignAgreementButton
                      agreementId={agreement.id}
                      cnicUploaded={cnicUploaded}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
