import type { Severity } from "@/lib/types"

export const getSeverityOrder = (severity: Severity): number => {
  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  return order[severity]
}

export const getSeverityColor = (severity: Severity): string => {
  const colors = {
    Critical: "bg-red-100 text-red-800",
    High: "bg-orange-100 text-orange-800",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-800",
  }
  return colors[severity]
}

export const getSeverityBgColor = (severity: Severity): string => {
  const colors = {
    Critical: "#dc2626",
    High: "#ea580c",
    Medium: "#eab308",
    Low: "#22c55e",
  }
  return colors[severity]
}
