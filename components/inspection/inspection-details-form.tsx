import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function InspectionDetailsForm() {
  const {
    register,
    watch,
    setValue,
    formState: { errors },
  } = useFormContext<InspectionFormValues>()

  const inspectorValue = watch("inspector")

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Inspection Details</h2>
      <div className="space-y-4">
        <div>
          <Label>Address *</Label>
          <Input {...register("address")} />
          {errors.address && <p className="text-sm text-red-500 mt-1">{errors.address.message}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Inspection Date</Label>
            <Input type="date" {...register("date")} />
          </div>
          <div>
            <Label>Inspector</Label>
            <Select onValueChange={(value) => setValue("inspector", value)} value={inspectorValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lester Herrera H.">Lester Herrera H.</SelectItem>
                <SelectItem value="Enmanuel Herrera H.">Enmanuel Herrera H.</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Estimator</Label>
            <Input {...register("estimator")} readOnly />
          </div>
        </div>
      </div>
    </Card>
  )
}
