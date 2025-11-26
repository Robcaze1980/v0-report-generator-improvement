import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CompanyForm() {
  const { register, watch } = useFormContext<InspectionFormValues>()
  const logo = watch("logo")

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderTop: "4px solid #f97316",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <svg
          style={{ height: "20px", width: "20px", color: "#f97316" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        Company Information
      </h2>
      <div style={{ display: "flex", flexDirection: "row", gap: "16px", flexWrap: "wrap" }}>
        {/* Logo Preview */}
        <div style={{ flexShrink: 0 }}>
          <div
            style={{
              width: "96px",
              height: "96px",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              backgroundColor: "#f9fafb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <img
              src={logo || "/images/ehl-20-284-29.png"}
              alt="EHL Logo"
              style={{ width: "100%", height: "100%", objectFit: "contain", padding: "8px" }}
            />
          </div>
        </div>
        {/* Company Details */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px", minWidth: "200px" }}>
          <div>
            <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "4px" }}>
              Company Name
            </Label>
            <Input {...register("company")} readOnly style={{ backgroundColor: "#f3f4f6" }} />
          </div>
          <div>
            <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "4px" }}>
              License Number
            </Label>
            <Input {...register("license")} readOnly style={{ backgroundColor: "#f3f4f6" }} />
          </div>
        </div>
      </div>
    </div>
  )
}
