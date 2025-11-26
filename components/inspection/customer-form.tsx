import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CustomerForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InspectionFormValues>()

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
        Customer Information
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
        <div>
          <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "4px" }}>
            Customer Name
          </Label>
          <Input {...register("customerName")} placeholder="Enter customer name" />
          {errors.customerName && (
            <p style={{ fontSize: "14px", color: "#dc2626", marginTop: "4px" }}>{errors.customerName.message}</p>
          )}
        </div>
        <div>
          <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "4px" }}>
            Customer Email
          </Label>
          <Input type="email" {...register("customerEmail")} placeholder="email@example.com" />
          {errors.customerEmail && (
            <p style={{ fontSize: "14px", color: "#dc2626", marginTop: "4px" }}>{errors.customerEmail.message}</p>
          )}
        </div>
      </div>
    </div>
  )
}
