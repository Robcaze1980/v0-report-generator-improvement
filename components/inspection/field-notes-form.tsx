"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StopCircle, Mic, FileText, Trash2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

interface FieldNotesFormProps {
  isRecording: boolean
  isTranscribing: boolean
  onStartRecording: () => void
  onStopRecording: () => void
}

export function FieldNotesForm({
  isRecording,
  isTranscribing,
  onStartRecording,
  onStopRecording,
}: FieldNotesFormProps) {
  const { register, watch, setValue } = useFormContext<InspectionFormValues>()
  const fieldNotes = watch("inspectorFieldNotes") || ""

  return (
    <Card className="p-4 sm:p-6 border-l-4 border-l-blue-500">
      <h2 className="text-lg sm:text-xl font-semibold mb-2 flex items-center gap-2">
        <FileText className="h-5 w-5 text-blue-500" />
        Inspector Field Notes
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Add your observations and preliminary recommendations. These will be used to generate the final recommendations.
      </p>
      <div className="space-y-4">
        <Textarea
          {...register("inspectorFieldNotes")}
          rows={6}
          placeholder="Enter your field observations and preliminary recommendations..."
          maxLength={2000}
          className="touch-target"
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-sm text-muted-foreground order-2 sm:order-1">{fieldNotes.length}/2000 characters</span>
          <div className="flex flex-wrap gap-2 order-1 sm:order-2 w-full sm:w-auto">
            {!isRecording && !isTranscribing && (
              <Button
                onClick={onStartRecording}
                variant="outline"
                size="sm"
                type="button"
                className="touch-target gap-2 flex-1 sm:flex-none bg-transparent"
              >
                <Mic className="h-4 w-4" />
                Record
              </Button>
            )}
            {isRecording && (
              <Button
                onClick={onStopRecording}
                variant="destructive"
                size="sm"
                type="button"
                className="touch-target gap-2 animate-recording"
              >
                <StopCircle className="h-4 w-4" />
                Stop Recording
              </Button>
            )}
            {isTranscribing && (
              <Button disabled size="sm" type="button" className="touch-target gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Processing...
              </Button>
            )}
            <Button
              onClick={() => setValue("inspectorFieldNotes", "")}
              variant="outline"
              size="sm"
              type="button"
              className="touch-target gap-2 flex-1 sm:flex-none"
              disabled={!fieldNotes}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
