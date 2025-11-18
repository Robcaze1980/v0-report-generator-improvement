import type React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, StopCircle } from 'lucide-react'
import type { Section, Severity } from "@/lib/types"

interface SectionBuilderProps {
  currentSection: Section
  editingId: string | null
  isRecordingIssue: boolean
  isTranscribingIssue: boolean
  isGeneratingDesc: boolean
  isUploadingPhotos: boolean
  compressionProgress?: { current: number; total: number }
  onSectionChange: (section: Section) => void
  onStartRecording: () => void
  onStopRecording: () => void
  onGenerateDescription: () => void
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemovePhoto: (index: number) => void
  onAddSection: () => void
  onCancelEdit: () => void
}

export function SectionBuilder({
  currentSection,
  editingId,
  isRecordingIssue,
  isTranscribingIssue,
  isGeneratingDesc,
  isUploadingPhotos,
  compressionProgress,
  onSectionChange,
  onStartRecording,
  onStopRecording,
  onGenerateDescription,
  onPhotoUpload,
  onRemovePhoto,
  onAddSection,
  onCancelEdit,
}: SectionBuilderProps) {
  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Section" : "Agregar Problema/daño:"}</h2>
      <div className="space-y-4">
        <div>
          <Label>Daño: *</Label>
          <div className="flex gap-2">
            <Input
              value={currentSection.issue}
              onChange={(e) => onSectionChange({ ...currentSection, issue: e.target.value })}
              className="flex-1"
              placeholder="Describe el daño observado..."
            />
            {!isRecordingIssue && !isTranscribingIssue && (
              <Button onClick={onStartRecording} variant="outline" size="sm">
                🎤 GRABAR
              </Button>
            )}
            {isRecordingIssue && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-red-600 animate-pulse">
                  <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                  <span className="font-medium text-sm">Recording...</span>
                </div>
                <Button onClick={onStopRecording} variant="destructive" size="sm">
                  <StopCircle className="h-4 w-4" /> Stop
                </Button>
              </div>
            )}
            {isTranscribingIssue && (
              <Button disabled size="sm">
                Transcribing...
              </Button>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Describe el daño. La IA generará un título profesional y descripción técnica.
          </p>
        </div>

        {currentSection.title && (
          <div>
            <Label>Título Generado por IA</Label>
            <Input
              value={currentSection.title}
              onChange={(e) => onSectionChange({ ...currentSection, title: e.target.value })}
              className="font-semibold"
              placeholder="El título se generará automáticamente..."
            />
            <p className="text-xs text-gray-500 mt-1">Puedes editar el título generado por la IA si lo deseas.</p>
          </div>
        )}

        <div>
          <div className="flex justify-between items-center mb-2">
            <Label>Description</Label>
            <Button
              onClick={onGenerateDescription}
              size="sm"
              variant="outline"
              disabled={isGeneratingDesc || !currentSection.issue.trim()}
            >
              {isGeneratingDesc ? "Generating..." : "✨ Generate Title + Description with AI"}
            </Button>
          </div>
          <Textarea
            value={currentSection.description}
            onChange={(e) => onSectionChange({ ...currentSection, description: e.target.value })}
            rows={5}
            placeholder="La descripción técnica se generará automáticamente..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Severity</Label>
            <Select
              value={currentSection.severity}
              onValueChange={(v) => onSectionChange({ ...currentSection, severity: v as Severity })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical">Critical</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Photos (max 4)</Label>
            <Input type="file" accept="image/*" multiple onChange={onPhotoUpload} disabled={isUploadingPhotos} />
            {isUploadingPhotos && compressionProgress && compressionProgress.total > 0 && (
              <div className="mt-2">
                <p className="text-sm text-blue-600">
                  Compressing image {compressionProgress.current} of {compressionProgress.total}...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {currentSection.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {currentSection.photos.map((p, i) => (
              <div key={i} className="relative">
                <img src={p || "/placeholder.svg"} alt={`Photo ${i}`} className="w-20 h-20 object-cover rounded" />
                <button
                  onClick={() => onRemovePhoto(i)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={onAddSection} className="flex-1" disabled={isGeneratingDesc}>
            {editingId ? "Update Section" : "Add Section"}
          </Button>
          {editingId && (
            <Button onClick={onCancelEdit} variant="outline">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
