import type { ForwardedRef } from "react"
import { forwardRef } from "react"
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
  id?: string
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
    id,
  }: ReportPreviewProps,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const sortedSections = [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

  const logoUrl =
    logo && logo !== "/ehl-logo.png" && logo !== "/images/ehl-20-284-29.png" ? logo : "/images/ehl-20-284-29.png"

  return (
    <div style={{ position: "sticky", top: "24px", height: "calc(100vh - 48px)" }} className="hidden lg:block">
      <div
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e5e7eb",
          borderRadius: "8px",
          padding: "24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          height: "100%",
          overflow: "auto",
        }}
      >
        <h2 style={{ fontSize: "20px", fontWeight: "600", marginBottom: "16px" }}>Preview</h2>
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
              style={{ height: "80px", width: "auto", objectFit: "contain" }}
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
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "14px", lineHeight: "1.6" }}>
                {customerName && (
                  <div style={{ minWidth: "200px", flex: "1 1 45%" }}>
                    <span style={{ fontWeight: "600" }}>Name:</span> {customerName}
                  </div>
                )}
                {customerEmail && (
                  <div style={{ minWidth: "200px", flex: "1 1 45%", wordBreak: "break-word" }}>
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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px 24px", fontSize: "14px", lineHeight: "1.8" }}>
              <div style={{ minWidth: "200px", flex: "1 1 45%" }}>
                <span style={{ fontWeight: "600" }}>Address:</span> {address || "—"}
              </div>
              <div style={{ minWidth: "200px", flex: "1 1 45%" }}>
                <span style={{ fontWeight: "600" }}>Inspection Date:</span> {date}
              </div>
              <div style={{ minWidth: "200px", flex: "1 1 45%" }}>
                <span style={{ fontWeight: "600" }}>Inspector:</span> {inspector}
              </div>
              <div style={{ minWidth: "200px", flex: "1 1 45%" }}>
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
                    style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "12px",
                        gap: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <h3 style={{ fontSize: "16px", fontWeight: "600", flex: "1 1 auto" }}>
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
                          whiteSpace: "nowrap",
                        }}
                      >
                        {s.severity}
                      </span>
                    </div>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                      {formatDescription(s.description)}
                    </p>
                    {s.photos.length > 0 && (
                      <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
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
      </div>
    </div>
  )
})
