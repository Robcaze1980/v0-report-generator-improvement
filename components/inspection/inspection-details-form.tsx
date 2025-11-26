"use client"

import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Calendar, UserCheck } from "lucide-react"
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
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        Inspection Details
      </h2>
      <div className="space-y-4">
        {/* Address - Full width */}
        <div>
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            Property Address *
          </Label>
          <Input {...register("address")} className="touch-target mt-1" placeholder="123 Main St, City, State ZIP" />
          {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Inspection Date
            </Label>
            <Input type="date" {...register("date")} className="touch-target mt-1" />
          </div>
          <div>
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5" />
              Inspector
            </Label>
            <Select onValueChange={(value) => setValue("inspector", value)} value={inspectorValue}>
              <SelectTrigger className="touch-target mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lester Herrera H." className="touch-target">
                  Lester Herrera H.
                </SelectItem>
                <SelectItem value="Enmanuel Herrera H." className="touch-target">
                  Enmanuel Herrera H.
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-sm font-medium">Estimator</Label>
          <Input {...register("estimator")} readOnly className="bg-muted mt-1" />
        </div>
      </div>
    </Card>
  )
}
