"use client"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

interface FinalNotesFormProps {
  isRecording: boolean
  isTranscribing: boolean
  isGenerating: boolean
  canGenerate: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onGenerate: () => void
}

export function FinalNotesForm({
  isRecording,
  isTranscribing,
  isGenerating,
  canGenerate,
  onStartRecording,
  onStopRecording,
  onGenerate,
}: FinalNotesFormProps) {
  const { register, watch, setValue } = useFormContext<InspectionFormValues>()
  const finalNotes = watch("finalNotes") || ""

  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: "4px solid #22c55e",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          flexWrap: "wrap",
        }}
      >
        <h2 style={{ fontSize: "18px", fontWeight: "600", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg
            style={{ height: "20px", width: "20px", color: "#22c55e" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
            />
          </svg>
          Final Notes & Recommendations
        </h2>
        <Button onClick={onGenerate} size="sm" disabled={isGenerating || !canGenerate} type="button">
          {isGenerating ? (
            <>
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
              Generating...
            </>
          ) : (
            <>
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
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              Generate with AI
            </>
          )}
        </Button>
      </div>
      {!canGenerate && (
        <p
          style={{
            fontSize: "14px",
            color: "#b45309",
            backgroundColor: "#fffbeb",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          Add at least one inspection finding and field notes to enable AI generation.
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Textarea
          {...register("finalNotes")}
          rows={8}
          maxLength={5000}
          placeholder="Final recommendations will appear here after AI generation..."
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
          <span style={{ fontSize: "14px", color: "#6b7280" }}>{finalNotes.length}/5000 characters</span>
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
              onClick={() => setValue("finalNotes", "")}
              variant="outline"
              size="sm"
              type="button"
              disabled={!finalNotes}
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
