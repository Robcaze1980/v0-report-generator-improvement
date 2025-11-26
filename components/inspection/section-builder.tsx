"use client"

import type React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    <div
      style={{
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderRadius: "8px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        borderLeft: "4px solid #f97316",
      }}
    >
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "600",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <svg
          style={{ height: "20px", width: "20px", color: "#f97316" }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        {isEditing ? "Edit Section" : "Add Issue/Damage"}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Issue Input */}
        <div>
          <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "6px" }}>
            Issue Description *
          </Label>
          <div style={{ display: "flex", flexDirection: "row", gap: "8px", flexWrap: "wrap" }}>
            <Input
              value={currentSection.issue}
              onChange={(e) => onSectionChange({ ...currentSection, issue: e.target.value })}
              style={{ flex: "1 1 200px" }}
              placeholder="Describe the observed damage..."
            />
            {!isRecordingIssue && !isTranscribingIssue && (
              <Button onClick={onStartRecording} variant="outline" size="default">
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
            {isRecordingIssue && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#dc2626",
                    padding: "8px 12px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "6px",
                  }}
                >
                  <div
                    style={{
                      width: "12px",
                      height: "12px",
                      backgroundColor: "#dc2626",
                      borderRadius: "50%",
                      animation: "pulse 1s infinite",
                    }}
                  />
                  <span style={{ fontWeight: "500", fontSize: "14px" }}>Recording...</span>
                </div>
                <Button onClick={onStopRecording} variant="destructive" size="default">
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
                  Stop
                </Button>
              </div>
            )}
            {isTranscribingIssue && (
              <Button disabled size="default">
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
          </div>
          <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>
            Describe the damage. AI will generate a professional title and technical description.
          </p>
        </div>

        {/* AI Generated Title */}
        {currentSection.title && (
          <div>
            <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "6px" }}>
              AI Generated Title
            </Label>
            <Input
              value={currentSection.title}
              onChange={(e) => onSectionChange({ ...currentSection, title: e.target.value })}
              style={{ fontWeight: "600" }}
              placeholder="Title will be generated automatically..."
            />
          </div>
        )}

        {/* Description */}
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
              flexWrap: "wrap",
            }}
          >
            <Label style={{ fontSize: "14px", fontWeight: "500" }}>Technical Description</Label>
            <Button
              onClick={onGenerateDescription}
              size="sm"
              disabled={isGeneratingDesc || !currentSection.issue.trim()}
            >
              {isGeneratingDesc ? (
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
          <Textarea
            value={currentSection.description}
            onChange={(e) => onSectionChange({ ...currentSection, description: e.target.value })}
            rows={5}
            placeholder="Technical description will be generated automatically..."
          />
        </div>

        {/* Severity */}
        <div>
          <Label style={{ fontSize: "14px", fontWeight: "500", display: "block", marginBottom: "6px" }}>
            Severity Level
          </Label>
          <Select
            key={`severity-${currentSection.id}-${currentSection.severity}`}
            value={currentSection.severity}
            onValueChange={(v) => onSectionChange({ ...currentSection, severity: v as Severity })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#dc2626" }} />
                  Critical
                </span>
              </SelectItem>
              <SelectItem value="High">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#f97316" }} />
                  High
                </span>
              </SelectItem>
              <SelectItem value="Medium">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eab308" }} />
                  Medium
                </span>
              </SelectItem>
              <SelectItem value="Low">
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                  Low
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Photos */}
        <div>
          <Label
            style={{
              fontSize: "14px",
              fontWeight: "500",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "6px",
            }}
          >
            <svg style={{ height: "16px", width: "16px" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Photos ({currentSection.photos.length}/4)
          </Label>
          <Input
            type="file"
            accept="image/*"
            multiple
            onChange={onPhotoUpload}
            disabled={isUploadingPhotos}
            key={`photo-input-${currentSection.id}-${currentSection.photos.length}`}
          />
          {isUploadingPhotos && compressionProgress && compressionProgress.total > 0 && (
            <div style={{ marginTop: "8px" }}>
              <p style={{ fontSize: "14px", color: "#f97316", fontWeight: "500" }}>
                Compressing image {compressionProgress.current} of {compressionProgress.total}...
              </p>
              <div
                style={{
                  width: "100%",
                  backgroundColor: "#f3f4f6",
                  borderRadius: "9999px",
                  height: "8px",
                  marginTop: "4px",
                }}
              >
                <div
                  style={{
                    backgroundColor: "#f97316",
                    height: "8px",
                    borderRadius: "9999px",
                    transition: "width 0.3s",
                    width: `${(compressionProgress.current / compressionProgress.total) * 100}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Photo Previews */}
        {currentSection.photos.length > 0 && (
          <div>
            <Label style={{ marginBottom: "8px", display: "block", fontSize: "14px", fontWeight: "500" }}>
              Uploaded Photos ({currentSection.photos.length}/4)
            </Label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(80px, 1fr))", gap: "8px" }}>
              {currentSection.photos.map((p, i) => (
                <div key={`photo-${i}-${p.substring(0, 20)}`} style={{ position: "relative" }}>
                  <img
                    src={p || "/placeholder.svg"}
                    alt={`Photo ${i + 1}`}
                    style={{
                      width: "100%",
                      aspectRatio: "1/1",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #e5e7eb",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(i)}
                    style={{
                      position: "absolute",
                      top: "4px",
                      right: "4px",
                      backgroundColor: "#dc2626",
                      color: "white",
                      borderRadius: "50%",
                      padding: "4px",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg
                      style={{ height: "12px", width: "12px" }}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: "flex", flexDirection: "row", gap: "8px", paddingTop: "8px" }}>
          <Button onClick={onAddSection} style={{ flex: 1 }} disabled={isGeneratingDesc} size="lg">
            {isEditing ? (
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Update Section
              </>
            ) : (
              <>
                <svg
                  style={{ height: "16px", width: "16px", marginRight: "8px" }}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Section
              </>
            )}
          </Button>
          {isEditing && (
            <Button onClick={onCancelEdit} variant="outline" size="lg">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
