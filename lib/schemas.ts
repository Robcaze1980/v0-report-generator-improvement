import { z } from "zod"

export const sectionSchema = z.object({
  id: z.string(),
  issue: z.string().min(1, "Issue is required"),
  title: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  severity: z.enum(["Critical", "High", "Medium", "Low"]),
  photos: z.array(z.string()),
})

export const inspectionSchema = z.object({
  company: z.string(),
  license: z.string(),
  logo: z.string(),
  customerName: z.string().min(1, "Customer Name is required"),
  customerEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  address: z.string().min(1, "Address is required"),
  date: z.string(),
  inspector: z.string(),
  estimator: z.string(),
  sections: z.array(sectionSchema),
  finalNotes: z.string(),
  inspectorFieldNotes: z.string().optional(),
})

export type InspectionFormValues = z.infer<typeof inspectionSchema>
