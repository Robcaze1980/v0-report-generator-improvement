import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CompanyForm() {
  const { register, watch } = useFormContext<InspectionFormValues>()
  const logo = watch("logo")

  return (
    <Card className="p-4 sm:p-6">
      <h2 className="text-xl font-semibold mb-4">Company Information</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Company Name</Label>
            <Input {...register("company")} readOnly />
          </div>
          <div>
            <Label>License Number</Label>
            <Input {...register("license")} readOnly />
          </div>
        </div>
        <div>
          <Label>Company Logo</Label>
          <div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
            <img src={logo || "/placeholder.svg"} alt="EHL Logo" className="h-16 w-auto object-contain" />
          </div>
        </div>
      </div>
    </Card>
  )
}
