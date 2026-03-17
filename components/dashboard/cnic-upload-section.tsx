"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Upload, CheckCircle, CreditCard, AlertCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

type CnicDocs = {
  id?: string
  front_url: string | null
  back_url: string | null
  status: string
} | null

export function CnicUploadSection({ userId, existingDocs }: { userId: string; existingDocs: CnicDocs }) {
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(existingDocs?.front_url || null)
  const [backPreview, setBackPreview] = useState<string | null>(existingDocs?.back_url || null)
  const [uploading, setUploading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const isVerified = existingDocs?.status === "verified"
  const isPending = existingDocs?.status === "pending"
  const isComplete = !!existingDocs?.front_url && !!existingDocs?.back_url

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, side: "front" | "back") {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) { toast.error("Please select an image file"); return }
    if (file.size > 5 * 1024 * 1024) { toast.error("File must be under 5MB"); return }
    const preview = URL.createObjectURL(file)
    if (side === "front") { setFrontFile(file); setFrontPreview(preview) }
    else { setBackFile(file); setBackPreview(preview) }
  }

  async function uploadToStorage(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage
      .from("cnic-documents")
      .upload(path, file, { upsert: true, contentType: file.type })
    if (error) throw new Error("Storage error: " + error.message)
    const { data } = supabase.storage.from("cnic-documents").getPublicUrl(path)
    return data.publicUrl
  }

  async function handleUpload() {
    if (!frontFile && !backFile) { toast.error("Please select at least one image"); return }
    setUploading(true)
    try {
      const updates: Record<string, any> = {
        user_id: userId,
        status: "pending",
        updated_at: new Date().toISOString(),
      }

      if (frontFile) {
        const path = `${userId}/cnic_front.${frontFile.name.split(".").pop()}`
        updates.front_url = await uploadToStorage(frontFile, path)
        updates.front_file_name = frontFile.name
        updates.front_uploaded_at = new Date().toISOString()
      }

      if (backFile) {
        const path = `${userId}/cnic_back.${backFile.name.split(".").pop()}`
        updates.back_url = await uploadToStorage(backFile, path)
        updates.back_file_name = backFile.name
        updates.back_uploaded_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from("cnic_documents")
        .upsert(updates, { onConflict: "user_id" })

      if (error) throw new Error("Database error: " + error.message)

      toast.success("CNIC uploaded successfully! Awaiting admin verification.")
      setFrontFile(null)
      setBackFile(null)
      router.refresh()
    } catch (err: any) {
      console.error("CNIC upload error:", err)
      toast.error(err.message || "Upload failed. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="font-serif text-lg">CNIC Verification</CardTitle>
        </div>
        {isVerified ? (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" /> Verified
          </Badge>
        ) : isPending ? (
          <Badge variant="secondary">
            <AlertCircle className="h-3 w-3 mr-1" /> Pending Review
          </Badge>
        ) : (
          <Badge variant="outline">Not Uploaded</Badge>
        )}
      </CardHeader>
      <CardContent className="pt-2">
        <p className="mb-4 text-xs text-muted-foreground">
          Upload clear photos of both sides of your CNIC. Required before signing a rental agreement.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <UploadSlot
            label="CNIC Front"
            preview={frontPreview}
            onChange={(e) => handleFileChange(e, "front")}
            disabled={isVerified}
          />
          <UploadSlot
            label="CNIC Back"
            preview={backPreview}
            onChange={(e) => handleFileChange(e, "back")}
            disabled={isVerified}
          />
        </div>

        {!isVerified && (
          <div className="mt-4 flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading || (!frontFile && !backFile)}
              size="sm"
              className="flex items-center gap-2"
            >
              {uploading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
              ) : (
                <><Upload className="h-4 w-4" /> {isComplete ? "Re-upload CNIC" : "Upload CNIC"}</>
              )}
            </Button>
            {isPending && (
              <p className="text-xs text-amber-500">
                ⏳ Documents submitted — awaiting admin verification
              </p>
            )}
          </div>
        )}

        {isVerified && (
          <p className="mt-3 text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Your CNIC has been verified. You can now sign agreements.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function UploadSlot({
  label, preview, onChange, disabled,
}: {
  label: string
  preview: string | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="relative group rounded-lg border-2 border-dashed border-border hover:border-primary/50 transition-colors overflow-hidden bg-secondary/50 h-36 flex items-center justify-center">
        {preview ? (
          <>
            <img src={preview} alt={label} className="h-full w-full object-cover" />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-xs text-white font-medium">Click to change</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1 text-muted-foreground/50">
            <Upload className="h-8 w-8" />
            <span className="text-xs">Click to upload {label}</span>
          </div>
        )}
        {!disabled && (
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            className="absolute inset-0 opacity-0 cursor-pointer"
          />
        )}
      </div>
    </div>
  )
}
