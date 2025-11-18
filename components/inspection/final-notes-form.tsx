import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StopCircle } from 'lucide-react'
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
    <Card className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Final Notes & Recommendations</h2>
        <Button
          onClick={onGenerate}
          size="sm"
          variant="outline"
          disabled={isGenerating || !canGenerate}
          type="button"
        >
          {isGenerating ? "Generating..." : "Generate with AI"}
        </Button>
      </div>
      <div className="space-y-4">
        <Textarea {...register("finalNotes")} rows={8} maxLength={5000} />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{finalNotes.length}/5000</span>
          <div className="flex gap-2">
            {!isRecording && !isTranscribing && (
              <Button onClick={onStartRecording} variant="outline" size="sm" type="button">
                🎤 GRABAR
              </Button>
            )}
            {isRecording && (
              <Button onClick={onStopRecording} variant="destructive" size="sm" type="button">
                <StopCircle className="h-4 w-4" /> Stop
              </Button>
            )}
            {isTranscribing && (
              <Button disabled size="sm" type="button">
                Transcribing...
              </Button>
            )}
            <Button onClick={() => setValue("finalNotes", "")} variant="outline" size="sm" type="button">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
