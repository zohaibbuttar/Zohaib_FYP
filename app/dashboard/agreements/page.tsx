import { createClient } from "@/lib/supabase/server"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, CheckCircle2, AlertCircle } from "lucide-react"
import { SignAgreementButton } from "@/components/dashboard/sign-agreement-button"
import { CnicUploadSection } from "@/components/dashboard/cnic-upload-section"

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

  const cnicVerified = cnicDocs?.status === "verified"
  const cnicUploaded = !!cnicDocs?.front_url && !!cnicDocs?.back_url

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-serif text-2xl font-bold text-foreground">Rental Agreements</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload your CNIC, then read and sign your rental agreements before making payment
        </p>
      </div>

      {/* CNIC Upload Section */}
      <CnicUploadSection userId={user!.id} existingDocs={cnicDocs} />

      {/* Agreements */}
      {!agreements || agreements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="mb-4 h-12 w-12 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground text-center">
              No agreements yet.<br />
              <span className="text-xs mt-1 block">Agreements appear here once admin reviews your booking.</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6">
          {agreements.map((agreement: any) => {
            const isSigned = agreement.status === "signed"
            const agreementContent = agreement.agreement_text || agreement.content || ""

            return (
              <Card
                key={agreement.id}
                className={isSigned ? "border-green-500/20" : "border-blue-500/30"}
              >
                <CardContent className="flex flex-col gap-4 p-6">

                  {/* Header */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-serif text-lg font-bold text-card-foreground">
                          {agreement.vehicles?.name || "Vehicle"}
                        </h3>
                        <Badge variant={isSigned ? "default" : "outline"}>
                          {isSigned ? "✅ Signed" : "📋 Pending Signature"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Plate: {agreement.vehicles?.plate_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(agreement.bookings?.start_date).toLocaleDateString("en-PK", {
                          weekday: "short", year: "numeric", month: "short", day: "numeric"
                        })}
                        {" → "}
                        {new Date(agreement.bookings?.end_date).toLocaleDateString("en-PK", {
                          weekday: "short", year: "numeric", month: "short", day: "numeric"
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-card-foreground">
                        PKR {Number(agreement.bookings?.total_price).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Agreement Content — professional format */}
                  {agreementContent ? (
                    <div className="rounded-lg border border-border bg-white dark:bg-gray-950 p-6 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm text-foreground font-mono leading-relaxed">
                        {agreementContent}
                      </pre>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border p-4 text-center">
                      <p className="text-xs text-muted-foreground">Agreement content not available</p>
                    </div>
                  )}

                  {/* Sign section */}
                  {isSigned ? (
                    <div className="flex items-center gap-2 text-green-400 text-sm font-medium pt-2 border-t border-border">
                      <CheckCircle2 className="h-4 w-4" />
                      Signed on {new Date(agreement.signed_at).toLocaleString("en-PK")}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 pt-2 border-t border-border">
                      {!cnicVerified && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                          <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                          <p className="text-xs text-amber-500">
                            {!cnicUploaded
                              ? "Upload your CNIC above before signing this agreement"
                              : "Your CNIC is pending admin verification before you can sign"
                            }
                          </p>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <SignAgreementButton
                          agreementId={agreement.id}
                          cnicUploaded={cnicVerified}
                        />
                        <p className="text-xs text-muted-foreground">
                          By signing, you agree to all terms above
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
