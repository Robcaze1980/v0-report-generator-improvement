"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function InspectionDetailsForm() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<InspectionFormValues>()

  const inspectorValue = watch("inspector")

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
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Inspection Details
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Address - Full width */}
        <div>
          <Label
            style={{
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "4px",
            }}
          >
            <svg style={{ height: "14px", width: "14px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Property Address *
          </Label>
          <Input {...register("address")} placeholder="123 Main St, City, State ZIP" />
          {errors.address && (
            <p style={{ fontSize: "14px", color: "#dc2626", marginTop: "4px" }}>{errors.address.message}</p>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
          <div>
            <Label
              style={{
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
              }}
            >
              <svg style={{ height: "14px", width: "14px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              Inspection Date
            </Label>
            <Input type="date" {...register("date")} />
          </div>
          <div>
            <Label
              style={{
                fontSize: "14px",
                fontWeight: "500",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginBottom: "4px",
              }}
            >
              <svg style={{ height: "14px", width: "14px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Inspector
            </Label>
            <Select onValueChange={(value) => setValue("inspector", value)} value={inspectorValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lester Herrera H.">Lester Herrera H.</SelectItem>
                <SelectItem value="Enmanuel Herrera H.">Enmanuel Herrera H.</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "4px" }}>
            Estimator
          </Label>
          <Input {...register("estimator")} readOnly style={{ backgroundColor: "#f3f4f6" }} />
        </div>
      </div>
    </div>
  )
}
