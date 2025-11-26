import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User } from "lucide-react"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CustomerForm() {
  const {
    register,
    formState: { errors },
  } = useFormContext<InspectionFormValues>()

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        <User className="h-5 w-5 text-primary" />
        Customer Information
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium">Customer Name</Label>
          <Input {...register("customerName")} className="touch-target mt-1" placeholder="Enter customer name" />
          {errors.customerName && <p className="text-sm text-destructive mt-1">{errors.customerName.message}</p>}
        </div>
        <div>
          <Label className="text-sm font-medium">Customer Email</Label>
          <Input
            type="email"
            {...register("customerEmail")}
            className="touch-target mt-1"
            placeholder="email@example.com"
          />
          {errors.customerEmail && <p className="text-sm text-destructive mt-1">{errors.customerEmail.message}</p>}
        </div>
      </div>
    </Card>
  )
}
