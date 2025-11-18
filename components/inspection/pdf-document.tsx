import React from "react"
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer"
import type { Section } from "@/lib/types"
import { formatDescription } from "@/lib/utils/validation"

// Register fonts if needed, otherwise use standard fonts
// Font.register({ family: 'Roboto', src: '...' });

const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: "#ffffff",
    fontFamily: "Helvetica",
    fontSize: 12,
    color: "#111827",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#e5e7eb",
    paddingBottom: 10,
  },
  logo: {
    width: 80, // Increased width to accommodate the new logo better
    height: 80, // Increased height
    objectFit: "contain",
    marginRight: 15,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#6b7280",
  },
  section: {
    marginBottom: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    width: 100,
    fontWeight: "bold",
    fontSize: 10,
    color: "#4b5563",
  },
  value: {
    flex: 1,
    fontSize: 10,
  },
  finding: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },
  findingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  findingTitle: {
    fontSize: 12,
    fontWeight: "bold",
    flex: 1,
  },
  severityBadge: {
    fontSize: 8,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    color: "#ffffff",
  },
  description: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 10,
    color: "#374151",
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  photo: {
    width: "48%", // Slightly less than 50% to account for gap
    height: 150,
    objectFit: "cover",
    borderRadius: 4,
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 8,
    color: "#9ca3af",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 10,
  },
})

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case "Critical":
      return "#dc2626" // red-600
    case "High":
      return "#ea580c" // orange-600
    case "Medium":
      return "#ca8a04" // yellow-600
    case "Low":
      return "#16a34a" // green-600
    default:
      return "#6b7280" // gray-500
  }
}

interface PDFDocumentProps {
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
}

export const InspectionPDF = ({
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
}: PDFDocumentProps) => {
  const getAbsoluteUrl = (path: string): string => {
    if (!path) return ""
    if (path.startsWith("http://") || path.startsWith("https://") || path.startsWith("data:")) {
      return path
    }
    // For relative paths, use a placeholder since we can't access window in server context
    return `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/EHL%20%284%29-P3jjzUnqzwKlyThpWcRe641AhPFonu.png`
  }

  const safeCompany = String(company || "EHL Roofing LLC")
  const safeLicense = String(license || "")
  const safeLogo = getAbsoluteUrl(logo)
  const safeCustomerName = String(customerName || "")
  const safeCustomerEmail = String(customerEmail || "")
  const safeAddress = String(address || "")
  const safeDate = String(date || "")
  const safeInspector = String(inspector || "")
  const safeEstimator = String(estimator || "")
  const safeSections = Array.isArray(sections) ? sections : []
  const safeFinalNotes = String(finalNotes || "")

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          {safeLogo && (
            <Image 
              src={safeLogo || "/placeholder.svg"} 
              style={styles.logo}
            />
          )}
          <View style={styles.headerText}>
            <Text style={styles.title}>{`Roof Inspection Report — ${safeCompany}`}</Text>
            <Text style={styles.subtitle}>{`License: ${safeLicense}`}</Text>
          </View>
        </View>

        {/* Customer Info */}
        {(safeCustomerName || safeCustomerEmail) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Customer Information</Text>
            {safeCustomerName && (
              <View style={styles.row}>
                <Text style={styles.label}>Name:</Text>
                <Text style={styles.value}>{safeCustomerName}</Text>
              </View>
            )}
            {safeCustomerEmail && (
              <View style={styles.row}>
                <Text style={styles.label}>Email:</Text>
                <Text style={styles.value}>{safeCustomerEmail}</Text>
              </View>
            )}
          </View>
        )}

        {/* Inspection Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inspection Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Address:</Text>
            <Text style={styles.value}>{safeAddress}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Date:</Text>
            <Text style={styles.value}>{safeDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Inspector:</Text>
            <Text style={styles.value}>{safeInspector}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Estimator:</Text>
            <Text style={styles.value}>{safeEstimator}</Text>
          </View>
        </View>

        {/* Final Notes */}
        {safeFinalNotes && (
          <View style={styles.section} wrap={false}>
            <Text style={styles.sectionTitle}>Inspector's Final Notes & Recommendations</Text>
            <Text style={styles.description}>{safeFinalNotes}</Text>
          </View>
        )}

        {/* Findings */}
        {safeSections.length > 0 && (
          <View style={{ marginTop: 20 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 15 }]}>Inspection Findings</Text>
            {safeSections.map((s, i) => {
              const safeSection = {
                id: String(s?.id || `section-${i}`),
                issue: String(s?.issue || "No issue specified"),
                title: String(s?.title || s?.issue || "Untitled"),
                description: String(s?.description || "No description provided"),
                severity: String(s?.severity || "Medium"),
                photos: Array.isArray(s?.photos) 
                  ? s.photos.filter(p => p && typeof p === 'string' && p.trim() !== "").map(p => getAbsoluteUrl(p))
                  : [],
              }
              
              return (
                <View key={safeSection.id} style={styles.finding} wrap={false}>
                  <View style={styles.findingHeader}>
                    <Text style={styles.findingTitle}>
                      {`${i + 1}. ${safeSection.title}`}
                    </Text>
                    <Text style={[styles.severityBadge, { backgroundColor: getSeverityColor(safeSection.severity) }]}>
                      {safeSection.severity}
                    </Text>
                  </View>
                  <Text style={styles.description}>{formatDescription(safeSection.description)}</Text>
                  {safeSection.photos.length > 0 && (
                    <View style={styles.photoGrid}>
                      {safeSection.photos.map((photoUrl, j) => (
                        <Image 
                          key={`photo-${i}-${j}`} 
                          src={photoUrl || "/placeholder.svg"} 
                          style={styles.photo}
                        />
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
          </View>
        )}

        {/* Footer */}
        <Text style={styles.footer} fixed>
          {`Prepared by ${safeEstimator}. © ${new Date().getFullYear()} ${safeCompany}. All rights reserved.`}
        </Text>
      </Page>
    </Document>
  )
}
