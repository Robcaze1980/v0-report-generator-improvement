import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { StopCircle } from 'lucide-react'
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
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Notas de Campo del Inspector</h2>
      <p className="text-sm text-gray-600 mb-4">
        Añada sus observaciones y recomendaciones preliminares. Estas se utilizarán para generar las recomendaciones
        finales completas.
      </p>
      <div className="space-y-4">
        <Textarea
          {...register("inspectorFieldNotes")}
          rows={6}
          placeholder="Enter your field observations and preliminary recommendations..."
          maxLength={2000}
        />
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{fieldNotes.length}/2000</span>
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
            <Button onClick={() => setValue("inspectorFieldNotes", "")} variant="outline" size="sm" type="button">
              Clear
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
