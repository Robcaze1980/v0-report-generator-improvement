"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

interface FieldNotesFormProps {
  isRecording: boolean
  isTranscribing: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export function FieldNotesForm({
  isRecording,
  isTranscribing,
  onStartRecording,
  onStopRecording,
}: FieldNotesFormProps) {
  const { register, watch, setValue } = useFormContext<InspectionFormValues>()
  const fieldNotes = watch("inspectorFieldNotes") || ""

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: "4px solid #3b82f6",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "8px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <svg
          style={{ height: "20px", width: "20px", color: "#3b82f6" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        Inspector Field Notes
      </h2>
      <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>
        Add your observations and preliminary recommendations. These will be used to generate the final recommendations.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Textarea
          {...register("inspectorFieldNotes")}
          rows={6}
          placeholder="Enter your field observations and preliminary recommendations..."
          maxLength={2000}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: "14px", color: "#6b7280" }}>{fieldNotes.length}/2000 characters</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {!isRecording && !isTranscribing && (
              <Button onClick={onStartRecording} variant="outline" size="sm" type="button">
                <svg
                  style={{ height: "16px", width: "16px", marginRight: "8px" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
                Record
              </Button>
            )}
            {isRecording && (
              <Button onClick={onStopRecording} variant="destructive" size="sm" type="button">
                <svg
                  style={{ height: "16px", width: "16px", marginRight: "8px" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                  />
                </svg>
                Stop Recording
              </Button>
            )}
            {isTranscribing && (
              <Button disabled size="sm" type="button">
                <div
                  style={{
                    height: "16px",
                    width: "16px",
                    border: "2px solid currentColor",
                    borderTopColor: "transparent",
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                    marginRight: "8px",
                  }}
                />
                Processing...
              </Button>
            )}
            <Button
              onClick={() => setValue("inspectorFieldNotes", "")}
              variant="outline"
              size="sm"
              type="button"
              disabled={!fieldNotes}
            >
              <svg
                style={{ height: "16px", width: "16px", marginRight: "8px" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
              Clear
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
