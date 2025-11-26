"use client"

import type React from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, StopCircle, Mic, Sparkles, Camera, Plus, Save } from "lucide-react"
import type { Section, Severity } from "@/lib/types"

interface SectionBuilderProps {
  currentSection: Section
  editingSection: Section | null
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
  editingSection,
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
  const isEditing = editingSection !== null

  return (
    <Card className="p-4 sm:p-6 border-l-4 border-l-primary">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        {isEditing ? (
          <>
            <Save className="h-5 w-5 text-primary" />
            Edit Section
          </>
        ) : (
          <>
            <Plus className="h-5 w-5 text-primary" />
            Add Issue/Damage
          </>
        )}
      </h2>
      <div className="space-y-4">
        {/* Issue Input */}
        <div>
          <Label className="text-sm font-medium">Issue Description *</Label>
          <div className="flex flex-col sm:flex-row gap-2 mt-1.5">
            <Input
              value={currentSection.issue}
              onChange={(e) => onSectionChange({ ...currentSection, issue: e.target.value })}
              className="flex-1 touch-target"
              placeholder="Describe the observed damage..."
              aria-label="Issue description"
            />
            {!isRecordingIssue && !isTranscribingIssue && (
              <Button
                onClick={onStartRecording}
                variant="outline"
                size="default"
                className="touch-target gap-2 whitespace-nowrap bg-transparent"
                aria-label="Start voice recording"
              >
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Record</span>
              </Button>
            )}
            {isRecordingIssue && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 text-red-600 animate-recording px-3 py-2 bg-red-50 rounded-md">
                  <div className="w-3 h-3 bg-red-600 rounded-full" />
                  <span className="font-medium text-sm">Recording...</span>
                </div>
                <Button onClick={onStopRecording} variant="destructive" size="default" className="touch-target gap-2">
                  <StopCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Stop</span>
                </Button>
              </div>
            )}
            {isTranscribingIssue && (
              <Button disabled size="default" className="touch-target gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="hidden sm:inline">Processing...</span>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Describe the damage. AI will generate a professional title and technical description.
          </p>
        </div>

        {/* AI Generated Title */}
        {currentSection.title && (
          <div>
            <Label className="text-sm font-medium">AI Generated Title</Label>
            <Input
              value={currentSection.title}
              onChange={(e) => onSectionChange({ ...currentSection, title: e.target.value })}
              className="font-semibold mt-1.5 touch-target"
              placeholder="Title will be generated automatically..."
            />
          </div>
        )}

        {/* Description */}
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-1.5">
            <Label className="text-sm font-medium">Technical Description</Label>
            <Button
              onClick={onGenerateDescription}
              size="sm"
              variant="default"
              disabled={isGeneratingDesc || !currentSection.issue.trim()}
              className="touch-target gap-2 w-full sm:w-auto"
            >
              {isGeneratingDesc ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>
          <Textarea
            value={currentSection.description}
            onChange={(e) => onSectionChange({ ...currentSection, description: e.target.value })}
            rows={5}
            className="touch-target"
            placeholder="Technical description will be generated automatically..."
          />
        </div>

        {/* Severity and Photos - Stack on mobile */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label className="text-sm font-medium">Severity Level</Label>
            <Select
              key={`severity-${currentSection.id}-${currentSection.severity}`}
              value={currentSection.severity}
              onValueChange={(v) => {
                onSectionChange({ ...currentSection, severity: v as Severity })
              }}
            >
              <SelectTrigger className="touch-target mt-1.5">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Critical" className="touch-target">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600" />
                    Critical
                  </span>
                </SelectItem>
                <SelectItem value="High" className="touch-target">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-orange-500" />
                    High
                  </span>
                </SelectItem>
                <SelectItem value="Medium" className="touch-target">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-yellow-500" />
                    Medium
                  </span>
                </SelectItem>
                <SelectItem value="Low" className="touch-target">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500" />
                    Low
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-sm font-medium flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Photos ({currentSection.photos.length}/4)
            </Label>
            <Input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotoUpload}
              disabled={isUploadingPhotos}
              key={`photo-input-${currentSection.id}-${currentSection.photos.length}`}
              className="touch-target mt-1.5"
            />
            {isUploadingPhotos && compressionProgress && compressionProgress.total > 0 && (
              <div className="mt-2">
                <p className="text-sm text-primary font-medium">
                  Compressing image {compressionProgress.current} of {compressionProgress.total}...
                </p>
                <div className="w-full bg-secondary rounded-full h-2 mt-1">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(compressionProgress.current / compressionProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Photo Previews */}
        {currentSection.photos.length > 0 && (
          <div>
            <Label className="mb-2 block text-sm font-medium">Uploaded Photos ({currentSection.photos.length}/4)</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {currentSection.photos.map((p, i) => (
                <div key={`photo-${i}-${p.substring(0, 20)}`} className="relative group">
                  <img
                    src={p || "/placeholder.svg"}
                    alt={`Photo ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity touch-target"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button onClick={onAddSection} className="flex-1 touch-target gap-2" disabled={isGeneratingDesc} size="lg">
            {isEditing ? (
              <>
                <Save className="h-4 w-4" />
                Update Section
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Section
              </>
            )}
          </Button>
          {isEditing && (
            <Button onClick={onCancelEdit} variant="outline" size="lg" className="touch-target bg-transparent">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}
