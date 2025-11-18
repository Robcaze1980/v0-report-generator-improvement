import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CustomerForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InspectionFormValues>()

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Customer Name</Label>
          <Input {...register("customerName")} />
          {errors.customerName && <p className="text-sm text-red-500 mt-1">{errors.customerName.message}</p>}
        </div>
        <div>
          <Label>Customer Email</Label>
          <Input type="email" {...register("customerEmail")} />
          {errors.customerEmail && <p className="text-sm text-red-500 mt-1">{errors.customerEmail.message}</p>}
        </div>
      </div>
    </Card>
  )
}
