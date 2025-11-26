import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Building2 } from "lucide-react"
import { useFormContext } from "react-hook-form"
import type { InspectionFormValues } from "@/lib/schemas"

export function CompanyForm() {
  const { register, watch } = useFormContext<InspectionFormValues>()
  const logo = watch("logo")

  return (
    <Card className="p-4 sm:p-6 border-t-4 border-t-primary">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 flex items-center gap-2">
        <Building2 className="h-5 w-5 text-primary" />
        Company Information
      </h2>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 border rounded-lg bg-muted flex items-center justify-center overflow-hidden">
              <img
                src={logo || "/images/ehl-20-284-29.png"}
                alt="EHL Logo"
                className="w-full h-full object-contain p-2"
              />
            </div>
          </div>
          {/* Company Details */}
          <div className="flex-1 grid grid-cols-1 gap-3">
            <div>
              <Label className="text-sm font-medium">Company Name</Label>
              <Input {...register("company")} readOnly className="bg-muted mt-1" />
            </div>
            <div>
              <Label className="text-sm font-medium">License Number</Label>
              <Input {...register("license")} readOnly className="bg-muted mt-1" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
