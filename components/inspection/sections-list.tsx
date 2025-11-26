"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, Trash2, AlertTriangle, AlertCircle, Info, CheckCircle } from "lucide-react"
import type { Section } from "@/lib/types"
import { getSeverityColor, getSeverityOrder } from "@/lib/utils/severity"

interface SectionsListProps {
  sections: Section[]
  onEdit: (section: Section) => void
  onDelete: (id: string) => void
}

const SeverityIcon = ({ severity }: { severity: string }) => {
  switch (severity) {
    case "Critical":
      return <AlertTriangle className="h-4 w-4" />
    case "High":
      return <AlertCircle className="h-4 w-4" />
    case "Medium":
      return <Info className="h-4 w-4" />
    case "Low":
      return <CheckCircle className="h-4 w-4" />
    default:
      return null
  }
}

export function SectionsList({ sections, onEdit, onDelete }: SectionsListProps) {
  if (sections.length === 0) {
    return (
      <Card className="p-6 sm:p-8 text-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No Issues Added Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Start adding inspection findings using the form above. Each issue will appear here for review.
          </p>
        </div>
      </Card>
    )
  }

  const sortedSections = [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4">Inspection Findings ({sections.length})</h2>
      <div className="space-y-3">
        {sortedSections.map((s, i) => (
          <div key={s.id} className="border rounded-lg p-3 sm:p-4 hover:border-primary/50 transition-colors">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base sm:text-lg truncate">
                  {i + 1}. {s.title || s.issue}
                </h3>
                {s.title && s.title !== s.issue && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">Observation: {s.issue}</p>
                )}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 mt-2 ${getSeverityColor(s.severity)}`}
                >
                  <SeverityIcon severity={s.severity} />
                  {s.severity}
                </span>
              </div>
              <div className="flex gap-2 self-end sm:self-start">
                <Button onClick={() => onEdit(s)} variant="outline" size="sm" className="touch-target gap-1.5">
                  <Edit2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
                <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm" className="touch-target gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{s.description}</p>
            {s.photos.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {s.photos.map((p, j) => (
                  <img
                    key={j}
                    src={p || "/placeholder.svg"}
                    alt=""
                    className="w-14 h-14 sm:w-16 sm:h-16 object-cover rounded-lg border flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
