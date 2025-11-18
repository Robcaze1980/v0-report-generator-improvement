export type Severity = "Critical" | "High" | "Medium" | "Low"

export type Section = {
  id: string
  issue: string
  title?: string
  description: string
  severity: Severity
  photos: string[]
}

export type ToastType = "success" | "error" | "info"

export interface ToastMessage {
  message: string
  type: ToastType
  id: number
}

export interface InspectionData {
  company: string
  license: string
  customerName: string
  customerEmail: string
  address: string
  date: string
  inspector: string
  estimator: string
  logo: string
  sections: Section[]
  finalNotes: string
  inspectorFieldNotes?: string
}

export interface ErrorLog {
  message: string
  context: string
  stack?: string
  metadata?: Record<string, any>
  timestamp: string
}
