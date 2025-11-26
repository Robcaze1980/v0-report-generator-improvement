import type { ForwardedRef } from "react"
import { forwardRef } from "react"
import { Card } from "@/components/ui/card"
import type { Section } from "@/lib/types"
import { getSeverityOrder, getSeverityBgColor } from "@/lib/utils/severity"
import { formatDescription } from "@/lib/utils/validation"

interface ReportPreviewProps {
  company: string
  license: string
  logo: string
  customerName: string
  customerEmail: string
  address: string
  date: string
  inspector: string
  estimator: string
  sections: Section[]
  finalNotes: string
  id?: string // Added id prop for PDF generation targeting
}

export const ReportPreview = forwardRef(function ReportPreview(
  {
    company,
    license,
    logo,
    customerName,
    customerEmail,
    address,
    date,
    inspector,
    estimator,
    sections,
    finalNotes,
    id, // Added id prop
  }: ReportPreviewProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const sortedSections = [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

  const logoUrl =
    logo && logo !== "/ehl-logo.png" && logo !== "/images/ehl-20-284-29.png" ? logo : "/images/ehl-20-284-29.png"

  return (
    <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
      <Card className="p-4 sm:p-6 overflow-auto lg:h-full">
        <h2 className="text-xl font-semibold mb-4">Preview</h2>
        <div id={id} ref={ref} style={{ backgroundColor: "#ffffff", color: "#111827", padding: "24px" }}>
          {/* Header */}
          <div
            data-pdf-section="header"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderBottom: "2px solid #e5e7eb",
              paddingBottom: "16px",
            }}
          >
            <img
              src={logoUrl || "/placeholder.svg"}
              alt="EHL Logo"
              crossOrigin="anonymous"
              style={{ height: "80px", width: "auto", objectFit: "contain" }} // Increased height for better visibility
            />
            <div>
              <h1 style={{ fontSize: "20px", fontWeight: "700" }}>Roof Inspection Report — {company}</h1>
              <p style={{ fontSize: "14px", color: "#6b7280" }}>License: {license}</p>
            </div>
          </div>

          {/* Customer Info */}
          {(customerName || customerEmail) && (
            <div
              data-pdf-section="customer"
              style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}
            >
              <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Customer Information</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                {customerName && (
                  <div>
                    <span style={{ fontWeight: "600" }}>Name:</span> {customerName}
                  </div>
                )}
                {customerEmail && (
                  <div>
                    <span style={{ fontWeight: "600" }}>Email:</span> {customerEmail}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Inspection Info */}
          <div
            data-pdf-section="inspection-info"
            style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
              <div>
                <span style={{ fontWeight: "600" }}>Address:</span> {address || "—"}
              </div>
              <div>
                <span style={{ fontWeight: "600" }}>Inspection Date:</span> {date}
              </div>
              <div>
                <span style={{ fontWeight: "600" }}>Inspector:</span> {inspector}
              </div>
              <div>
                <span style={{ fontWeight: "600" }}>Estimator:</span> {estimator}
              </div>
            </div>
          </div>

          {/* Final Notes */}
          {finalNotes && (
            <div
              data-pdf-section="final-notes"
              style={{ marginTop: "24px", paddingTop: "24px", borderTop: "2px solid #e5e7eb" }}
            >
              <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
                Inspector's Final Notes & Recommendations
              </h2>
              <p style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{finalNotes}</p>
            </div>
          )}

          {/* Sections */}
          {sections.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <div data-pdf-section="findings-header">
                <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Inspection Findings</h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {sortedSections.map((s, i) => (
                  <div
                    key={s.id}
                    data-pdf-section={`finding-${i}`}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "16px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "12px",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: "600" }}>
                        {i + 1}. {s.title || s.issue}
                      </h3>
                      <span
                        style={{
                          fontSize: "12px",
                          padding: "4px 12px",
                          borderRadius: "999px",
                          fontWeight: "500",
                          backgroundColor: getSeverityBgColor(s.severity),
                          color: "#ffffff",
                        }}
                      >
                        {s.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                      {formatDescription(s.description)}
                    </p>
                    {s.photos.length > 0 && (
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "12px",
                        }}
                      >
                        {s.photos.map((p, j) => (
                          <img
                            key={j}
                            src={p || "/placeholder.svg"}
                            alt=""
                            crossOrigin="anonymous"
                            style={{
                              width: "100%",
                              maxHeight: "400px",
                              objectFit: "contain",
                              borderRadius: "8px",
                              border: "1px solid #e5e7eb",
                              backgroundColor: "#f9fafb",
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div
            data-pdf-section="footer"
            style={{
              marginTop: "32px",
              paddingTop: "16px",
              borderTop: "1px solid #e5e7eb",
              fontSize: "12px",
              color: "#6b7280",
              textAlign: "center",
            }}
          >
            Prepared by {estimator}. © {new Date().getFullYear()} {company}. All rights reserved.
          </div>
        </div>
      </Card>
    </div>
  )
})
