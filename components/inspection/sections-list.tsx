"use client"

import { Button } from "@/components/ui/button"
import type { Section } from "@/lib/types"
import { getSeverityColor, getSeverityOrder } from "@/lib/utils/severity"

interface SectionsListProps {
  sections: Section[]
  onEdit: (section: Section) => void
  onDelete: (id: string) => void
}

export function SectionsList({ sections, onEdit, onDelete }: SectionsListProps) {
  if (sections.length === 0) {
    return (
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "48px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              style={{ height: "32px", width: "32px", color: "#6b7280" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 style={{ fontWeight: "600", fontSize: "18px" }}>No Issues Added Yet</h3>
          <p style={{ fontSize: "14px", color: "#6b7280", maxWidth: "320px" }}>
            Start adding inspection findings using the form above. Each issue will appear here for review.
          </p>
        </div>
      </div>
    )
  }

  const sortedSections = [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

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
      <h2 style={{ fontSize: "18px", fontWeight: "600", marginBottom: "16px" }}>
        Inspection Findings ({sections.length})
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {sortedSections.map((s, i) => (
          <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "16px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "8px",
                marginBottom: "8px",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3
                  style={{
                    fontWeight: "600",
                    fontSize: "16px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {i + 1}. {s.title || s.issue}
                </h3>
                {s.title && s.title !== s.issue && (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginTop: "2px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Observation: {s.issue}
                  </p>
                )}
                <span
                  className={getSeverityColor(s.severity)}
                  style={{
                    fontSize: "12px",
                    padding: "4px 10px",
                    borderRadius: "9999px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "8px",
                  }}
                >
                  {s.severity}
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button onClick={() => onEdit(s)} variant="outline" size="sm">
                  <svg
                    style={{ height: "14px", width: "14px", marginRight: "4px" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </Button>
                <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm">
                  <svg style={{ height: "14px", width: "14px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </Button>
              </div>
            </div>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {s.description}
            </p>
            {s.photos.length > 0 && (
              <div style={{ display: "flex", gap: "8px", marginTop: "12px", overflowX: "auto", paddingBottom: "4px" }}>
                {s.photos.map((p, j) => (
                  <img
                    key={j}
                    src={p || "/placeholder.svg"}
                    alt=""
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                      flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
