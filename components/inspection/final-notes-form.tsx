"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StopCircle, Mic, Sparkles, ClipboardList, Trash2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

interface FinalNotesFormProps {
  isRecording: boolean
  isTranscribing: boolean
  isGenerating: boolean
  canGenerate: boolean
  onStartRecording: () => void
  onStopRecording: () => void
  onGenerate: () => void
}

export function FinalNotesForm({
  isRecording,
  isTranscribing,
  isGenerating,
  canGenerate,
  onStartRecording,
  onStopRecording,
  onGenerate,
}: FinalNotesFormProps) {
  const { register, watch, setValue } = useFormContext<InspectionFormValues>()
  const finalNotes = watch("finalNotes") || ""

  return (
    <Card className="p-4 sm:p-6 border-l-4 border-l-green-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
        <h2 className="text-lg sm:text-xl font-semibold flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-green-500" />
          Final Notes & Recommendations
        </h2>
        <Button
          onClick={onGenerate}
          size="sm"
          variant="default"
          disabled={isGenerating || !canGenerate}
          type="button"
          className="touch-target gap-2 w-full sm:w-auto"
        >
          {isGenerating ? (
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
      {!canGenerate && (
        <p className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg mb-4">
          Add at least one inspection finding and field notes to enable AI generation.
        </p>
      )}
      <div className="space-y-4">
        <Textarea
          {...register("finalNotes")}
          rows={8}
          maxLength={5000}
          className="touch-target"
          placeholder="Final recommendations will appear here after AI generation..."
        />
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <span className="text-sm text-muted-foreground order-2 sm:order-1">{finalNotes.length}/5000 characters</span>
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
              onClick={() => setValue("finalNotes", "")}
              variant="outline"
              size="sm"
              type="button"
              className="touch-target gap-2 flex-1 sm:flex-none"
              disabled={!finalNotes}
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
