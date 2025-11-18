import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import type { Section } from "@/lib/types"
import { getSeverityColor, getSeverityOrder } from "@/lib/utils/severity"

interface SectionsListProps {
  sections: Section[]
  onEdit: (section: Section) => void
  onDelete: (id: string) => void
}

export function SectionsList({ sections, onEdit, onDelete }: SectionsListProps) {
  if (sections.length === 0) return null

  const sortedSections = [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Daños Agregados al Reporte: ({sections.length})</h2>
      <div className="space-y-3">
        {sortedSections.map((s, i) => (
          <div key={s.id} className="border rounded-lg p-3">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {i + 1}. {s.title || s.issue}
                </h3>
                {s.title && s.title !== s.issue && (
                  <p className="text-xs text-gray-500 mt-0.5">Observación: {s.issue}</p>
                )}
                <span className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getSeverityColor(s.severity)}`}>
                  {s.severity}
                </span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => onEdit(s)} variant="outline" size="sm">
                  Edit
                </Button>
                <Button onClick={() => onDelete(s.id)} variant="destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">{s.description}</p>
            {s.photos.length > 0 && (
              <div className="flex gap-2 mt-2">
                {s.photos.map((p, j) => (
                  <img key={j} src={p || "/placeholder.svg"} alt="" className="w-12 h-12 object-cover rounded" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
