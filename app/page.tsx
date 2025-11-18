"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  translateSpanishToEnglish,
  transcribeAudioWithWhisper,
  generateEmailContent,
  sendReportEmail,
  saveInspectionToBaserow,
  loadInspectionFromBaserow,
  listInspectionsFromBaserow,
  deleteInspectionFromBaserow,
  generateDescriptionWithAI,
  generateFinalNotesWithAI,
  logError, // Imported logError
} from "./actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Section, ToastMessage, ToastType } from "@/lib/types"
import { CompanyForm } from "@/components/inspection/company-form"
import { CustomerForm } from "@/components/inspection/customer-form"
import { InspectionDetailsForm } from "@/components/inspection/inspection-details-form"
import { SectionBuilder } from "@/components/inspection/section-builder"
import { SectionsList } from "@/components/inspection/sections-list"
import { FieldNotesForm } from "@/components/inspection/field-notes-form"
import { FinalNotesForm } from "@/components/inspection/final-notes-form"
import { ReportPreview } from "@/components/inspection/report-preview"
import { useForm, FormProvider, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { inspectionSchema, type InspectionFormValues } from "@/lib/schemas"
import { InspectionPDF } from "@/components/inspection/pdf-document"
import { pdf } from "@react-pdf/renderer"

export default function ReportGenerator() {
  // Build timestamp: 2025-01-12

  const methods = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      company: "EHL Roofing LLC",
      license: "CA #1145092",
      logo: "/ehl-logo.png",
      customerName: "",
      customerEmail: "",
      address: "",
      date: new Date().toISOString().split("T")[0],
      inspector: "Lester Herrera H.",
      estimator: " Robertson Carrillo Z.",
      sections: [],
      finalNotes: "",
      inspectorFieldNotes: "",
    },
  })

  const { control, handleSubmit, watch, setValue, reset, getValues } = methods
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: "sections",
  })

  const watchedValues = watch()

  // Section Builder State (Local)
  const [currentSection, setCurrentSection] = useState<Section>({
    id: "",
    issue: "",
    title: "",
    description: "",
    severity: "Medium",
    photos: [],
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Voice recording states
  const [isRecordingNotes, setIsRecordingNotes] = useState(false)
  const [isTranscribingNotes, setIsTranscribingNotes] = useState(false)
  const notesMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const notesAudioChunksRef = useRef<Blob[]>([])

  const [isRecordingIssue, setIsRecordingIssue] = useState(false)
  const [isTranscribingIssue, setIsTranscribingIssue] = useState(false)
  const issueMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const issueAudioChunksRef = useRef<Blob[]>([])

  const [isRecordingFieldNotes, setIsRecordingFieldNotes] = useState(false)
  const [isTranscribingFieldNotes, setIsTranscribingFieldNotes] = useState(false)
  const fieldNotesMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const fieldNotesAudioChunksRef = useRef<Blob[]>([])

  // Dialogs & UI states
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailCc, setEmailCc] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false)
  const [savedInspections, setSavedInspections] = useState<any[]>([])
  const [isLoadingInspections, setIsLoadingInspections] = useState(false)

  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false)
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false)

  const previewRef = useRef<HTMLDivElement>(null)
  const [toasts, setToasts] = useState<ToastMessage[]>([])
  const [autoSaveStatus, setAutoSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved")
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>()
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false)
  const [compressionProgress, setCompressionProgress] = useState({ current: 0, total: 0 })

  // Cleanup media recorders
  useEffect(() => {
    return () => {
      if (issueMediaRecorderRef.current?.state === "recording") issueMediaRecorderRef.current.stop()
      if (notesMediaRecorderRef.current?.state === "recording") notesMediaRecorderRef.current.stop()
      if (fieldNotesMediaRecorderRef.current?.state === "recording") fieldNotesMediaRecorderRef.current.stop()
    }
  }, [])

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { message, type, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  // Auto-save logic
  const autoSave = useCallback(async () => {
    const values = getValues()
    if (!values.address.trim() || values.sections.length === 0) return

    setAutoSaveStatus("saving")
    const result = await saveInspectionToBaserow({
      ...values,
      finalNotes: values.finalNotes || "",
    })

    setAutoSaveStatus(result.success ? "saved" : "unsaved")
    if (!result.success) {
      showToast(result.error || "Auto-save failed", "error")
    }
  }, [getValues, showToast])

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (watchedValues.address?.trim() && watchedValues.sections?.length > 0) {
      setAutoSaveStatus("unsaved")
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave()
      }, 5000)
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [watchedValues, autoSave])

  // Local Storage Backup
  useEffect(() => {
    const saved = localStorage.getItem("current_inspection")
    if (saved && fields.length === 0 && !getValues("address")) {
      try {
        const data = JSON.parse(saved)
        if (confirm("Found unsaved inspection from " + new Date(data.timestamp).toLocaleString() + ". Load it?")) {
          reset({
            ...data,
            date: data.date || new Date().toISOString().split("T")[0],
          })
          showToast("Local backup loaded successfully", "success")
        }
      } catch (e) {
        console.error("[v0] Failed to load backup:", e)
        showToast("Failed to load local backup", "error")
      }
    }
  }, [reset, fields.length, getValues, showToast])

  useEffect(() => {
    if (watchedValues.sections?.length > 0 || watchedValues.address) {
      const data = {
        ...watchedValues,
        timestamp: Date.now(),
      }
      localStorage.setItem("current_inspection", JSON.stringify(data))
    }
  }, [watchedValues])

  // Photo Upload
  const compressImage = async (file: File, index: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Fallback to canvas-based compression if Worker is not supported
      if (typeof Worker === 'undefined') {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            const ctx = canvas.getContext('2d')
            const maxSize = 1200
            let width = img.width
            let height = img.height

            if (width > height && width > maxSize) {
              height = (height * maxSize) / width
              width = maxSize
            } else if (height > maxSize) {
              width = (width * maxSize) / height
              height = maxSize
            }

            canvas.width = width
            canvas.height = height
            ctx?.drawImage(img, 0, 0, width, height)
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
            resolve(compressedDataUrl)
          }
          img.onerror = reject
          img.src = e.target?.result as string
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
        return
      }

      // Use Web Worker for better performance
      const worker = new Worker('/image-worker.js')
      
      worker.onmessage = (e) => {
        if (e.data.success) {
          resolve(e.data.dataUrl)
        } else {
          reject(new Error(e.data.error))
        }
        worker.terminate()
      }

      worker.onerror = (error) => {
        reject(error)
        worker.terminate()
      }

      worker.postMessage({
        file: file,
        maxSize: 1200,
        quality: 0.8,
        index: index,
      })
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const filesToProcess = Array.from(files).slice(0, 4)
    setIsUploadingPhotos(true)
    setCompressionProgress({ current: 0, total: filesToProcess.length })

    try {
      const newPhotos: string[] = []

      // Process images sequentially to prevent lag
      for (let i = 0; i < filesToProcess.length; i++) {
        try {
          const compressed = await compressImage(filesToProcess[i], i)
          newPhotos.push(compressed)
          setCompressionProgress({ current: i + 1, total: filesToProcess.length })
        } catch (err) {
          console.error(`[v0] Failed to compress image ${i}:`, err)
          await logError({
            message: 'Image compression failed',
            context: 'handlePhotoUpload',
            error: err,
            metadata: { imageIndex: i, fileName: filesToProcess[i].name },
          })
        }
      }

      if (newPhotos.length > 0) {
        setCurrentSection((prev) => ({ 
          ...prev, 
          photos: [...prev.photos, ...newPhotos].slice(0, 4) 
        }))
        showToast(`${newPhotos.length} photo(s) compressed successfully`, 'success')
      } else {
        showToast('Failed to compress images. Please try again.', 'error')
      }
    } catch (err) {
      console.error('[v0] Photo upload error:', err)
      await logError({
        message: 'Photo upload failed',
        context: 'handlePhotoUpload',
        error: err,
      })
      showToast('Error uploading photos. Please try again.', 'error')
    } finally {
      setIsUploadingPhotos(false)
      setCompressionProgress({ current: 0, total: 0 })
    }
  }

  const removePhoto = (index: number) => {
    setCurrentSection((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  // AI Description Generation
  const generateDescription = async () => {
    if (!currentSection.issue.trim()) {
      showToast("Please enter an issue first", "error")
      return
    }
    setIsGeneratingDesc(true)
    try {
      const result = await generateDescriptionWithAI(currentSection.issue, currentSection.severity)
      if (result.success && result.description) {
        setCurrentSection((prev) => ({
          ...prev,
          title: result.title || prev.issue,
          description: result.description,
        }))
        showToast("Title and description generated with AI", "success")
      } else {
        await logError({
          message: "Failed to generate description",
          context: "generateDescription",
          error: result.error,
          metadata: { issue: currentSection.issue, severity: currentSection.severity },
        })
        showToast(result.error || "Failed to generate description. Please try again.", "error")
      }
    } catch (error) {
      await logError({
        message: "Exception in generateDescription",
        context: "generateDescription",
        error: error,
      })
      console.error("AI generation error:", error)
      showToast("Failed to generate description. Please try again.", "error")
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  // Voice Recording Logic
  const startRecordingIssue = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm"
      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      issueMediaRecorderRef.current = mediaRecorder
      issueAudioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) issueAudioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = async () => {
        setIsTranscribingIssue(true)
        try {
          const audioBlob = new Blob(issueAudioChunksRef.current, { type: mimeType })
          const reader = new FileReader()
          reader.onloadend = async () => {
            try {
              const base64Audio = reader.result as string
              const result = await transcribeAudioWithWhisper(base64Audio, "es")
              if (result.success && result.transcript) {
                const words = result.transcript.trim().split(/\s+/)
                const limitedText = words.slice(0, 100).join(" ")
                const translated = await translateSpanishToEnglish(limitedText)
                const spanishDetector =
                  /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta/i
                if (spanishDetector.test(translated)) {
                  throw new Error("Translation contains Spanish words. Please try recording again.")
                }
                const cleanIssue = translated
                  .replace(/["""]/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .replace(/^(.)/, (c) => c.toUpperCase())
                setCurrentSection((prev) => ({ ...prev, issue: cleanIssue }))
                showToast("Audio transcribed and translated successfully", "success")
              } else {
                throw new Error(result.error || "Failed to transcribe audio")
              }
            } catch (err) {
              console.error("[v0] Transcription error:", err)
              showToast(err instanceof Error ? err.message : "Failed to process audio", "error")
            } finally {
              setIsTranscribingIssue(false)
              stream.getTracks().forEach((track) => track.stop())
            }
          }
          reader.readAsDataURL(audioBlob)
        } catch (err) {
          console.error("[v0] Audio processing error:", err)
          showToast("Error processing audio", "error")
          setIsTranscribingIssue(false)
          stream.getTracks().forEach((track) => track.stop())
        }
      }
      mediaRecorder.start()
      setIsRecordingIssue(true)
    } catch (error) {
      console.error("[v0] Microphone error:", error)
      showToast("Microphone access denied", "error")
    }
  }

  const stopRecordingIssue = () => {
    if (issueMediaRecorderRef.current?.state === "recording") {
      issueMediaRecorderRef.current.stop()
      setIsRecordingIssue(false)
    }
  }

  const startRecordingNotes = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      notesMediaRecorderRef.current = mediaRecorder
      notesAudioChunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) notesAudioChunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = async () => {
        setIsTranscribingNotes(true)
        const audioBlob = new Blob(notesAudioChunksRef.current, { type: "audio/webm" })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64Audio = reader.result as string
          const result = await transcribeAudioWithWhisper(base64Audio)
          if (result.success && result.transcript) {
            const translated = await translateSpanishToEnglish(result.transcript)
            const currentNotes = getValues("finalNotes") || ""
            setValue("finalNotes", currentNotes ? `${currentNotes} ${translated}` : translated)
            showToast("Voice note transcribed and added", "success")
          } else {
            showToast(result.error || "Failed to transcribe audio", "error")
          }
          setIsTranscribingNotes(false)
          stream.getTracks().forEach((track) => track.stop())
        }
        reader.readAsDataURL(audioBlob)
      }
      mediaRecorder.start()
      setIsRecordingNotes(true)
    } catch (error) {
      console.error("Microphone error:", error)
      showToast("Microphone access denied", "error")
    }
  }

  const stopRecordingNotes = () => {
    if (notesMediaRecorderRef.current?.state === "recording") {
      notesMediaRecorderRef.current.stop()
      setIsRecordingNotes(false)
    }
  }

  const startRecordingFieldNotes = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      fieldNotesMediaRecorderRef.current = mediaRecorder
      fieldNotesAudioChunksRef.current = []
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) fieldNotesAudioChunksRef.current.push(event.data)
      }
      mediaRecorder.onstop = async () => {
        setIsTranscribingFieldNotes(true)
        const audioBlob = new Blob(fieldNotesAudioChunksRef.current, { type: "audio/webm" })
        const reader = new FileReader()
        reader.onloadend = async () => {
          const base64Audio = reader.result as string
          const result = await transcribeAudioWithWhisper(base64Audio)
          if (result.success && result.transcript) {
            const translated = await translateSpanishToEnglish(result.transcript)
            const currentFieldNotes = getValues("inspectorFieldNotes") || ""
            setValue(
              "inspectorFieldNotes",
              currentFieldNotes ? `${currentFieldNotes} ${translated}` : translated,
            )
            showToast("Voice note transcribed and added", "success")
          } else {
            showToast(result.error || "Failed to transcribe audio", "error")
          }
          setIsTranscribingFieldNotes(false)
          stream.getTracks().forEach((track) => track.stop())
        }
        reader.readAsDataURL(audioBlob)
      }
      mediaRecorder.start()
      setIsRecordingFieldNotes(true)
    } catch (error) {
      console.error("Microphone error:", error)
      showToast("Microphone access denied", "error")
    }
  }

  const stopRecordingFieldNotes = () => {
    if (fieldNotesMediaRecorderRef.current?.state === "recording") {
      fieldNotesMediaRecorderRef.current.stop()
      setIsRecordingFieldNotes(false)
    }
  }

  // Section Management
  const addSection = async () => {
    if (!currentSection.issue.trim()) {
      showToast("Please enter an issue", "error")
      return
    }

    try {
      const translatedIssue = await translateSpanishToEnglish(currentSection.issue)
      const translatedTitle = currentSection.title
        ? await translateSpanishToEnglish(currentSection.title)
        : translatedIssue
      const translatedDescription = await translateSpanishToEnglish(currentSection.description)

      const spanishDetector =
        /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta|chimenea|humedad|moho/i

      if (
        spanishDetector.test(translatedIssue) ||
        spanishDetector.test(translatedTitle) ||
        spanishDetector.test(translatedDescription)
      ) {
        throw new Error("Translation incomplete - Spanish words detected. Please try again.")
      }

      const cleanIssue = translatedIssue
        .replace(/["""]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(.)/, (c) => c.toUpperCase())

      const cleanTitle = translatedTitle
        .replace(/["""]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(.)/, (c) => c.toUpperCase())

      const cleanDescription = translatedDescription.replace(/["""]/g, "").replace(/\s+/g, " ").trim()

      const sectionToAdd = {
        ...currentSection,
        issue: cleanIssue,
        title: cleanTitle,
        description: cleanDescription,
        id: currentSection.id || crypto.randomUUID(),
      }

      if (editingId) {
        const index = fields.findIndex((f) => f.id === editingId)
        if (index !== -1) {
          update(index, sectionToAdd)
        }
        setEditingId(null)
        showToast("Section updated successfully", "success")
      } else {
        append(sectionToAdd)
        showToast("Section added successfully", "success")
      }

      setCurrentSection({
        id: "",
        issue: "",
        title: "",
        description: "",
        severity: "Medium",
        photos: [],
      })
    } catch (error) {
      console.error("[v0] Add section error:", error)
      showToast(error instanceof Error ? error.message : "Failed to add section", "error")
    }
  }

  const editSection = (section: Section) => {
    setCurrentSection(section)
    setEditingId(section.id)
  }

  const deleteSection = (id: string) => {
    const index = fields.findIndex((f) => f.id === id)
    if (index !== -1) {
      remove(index)
      showToast("Section deleted", "success")
    }
  }

  const cancelEdit = () => {
    setCurrentSection({
      id: "",
      issue: "",
      title: "",
      description: "",
      severity: "Medium",
      photos: [],
    })
    setEditingId(null)
  }

  // Final Notes Generation
  const generateFinalNotes = async () => {
    const values = getValues()
    if (values.sections.length === 0) {
      showToast("Add at least one section first", "error")
      return
    }
    if (!values.inspectorFieldNotes?.trim()) {
      showToast("Please enter your field notes first", "error")
      return
    }
    setIsGeneratingNotes(true)
    try {
      const result = await generateFinalNotesWithAI({
        sections: values.sections.map((s) => ({ issue: s.issue, severity: s.severity })),
        address: values.address,
        inspector: values.inspector,
        inspectorFieldNotes: values.inspectorFieldNotes,
      })
      if (result.success) {
        setValue("finalNotes", result.finalNotes)
        showToast("Final notes generated with AI", "success")
      } else {
        await logError({
          message: "Failed to generate final notes",
          context: "generateFinalNotes",
          error: result.error,
        })
        showToast(result.error || "AI generation failed", "error")
      }
    } catch (error) {
      await logError({
        message: "Exception in generateFinalNotes",
        context: "generateFinalNotes",
        error: error,
      })
      console.error("Final notes error:", error)
      showToast("Failed to generate notes", "error")
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  // PDF & Email (Simplified for brevity, logic remains similar but uses getValues)
  const generatePDFBuffer = async (): Promise<{ buffer: Buffer; filename: string } | null> => {
    const values = getValues()
    if (!values.address?.trim() || !values.sections || values.sections.length === 0) return null

    try {
      // Ensure all required values have safe defaults
      const pdfData = {
        company: values.company || "EHL Roofing LLC",
        license: values.license || "CA #1145092",
        logo: values.logo || "/ehl-logo.png",
        customerName: values.customerName || "",
        customerEmail: values.customerEmail || "",
        address: values.address || "",
        date: values.date || new Date().toISOString().split("T")[0],
        inspector: values.inspector || "Lester Herrera H.",
        estimator: values.estimator || " Robertson Carrillo Z.",
        sections: (values.sections || []).map(s => ({
          ...s,
          id: s.id || crypto.randomUUID(),
          issue: s.issue || "No issue specified",
          title: s.title || s.issue || "Untitled",
          description: s.description || "No description provided",
          severity: s.severity || "Medium",
          photos: (s.photos || []).filter(p => p && p.trim() !== ""),
        })),
        finalNotes: values.finalNotes || "",
      }

      console.log("[v0] Generating PDF with data:", {
        sectionsCount: pdfData.sections.length,
        hasLogo: !!pdfData.logo,
        address: pdfData.address,
      })

      const blob = await pdf(<InspectionPDF {...pdfData} />).toBlob()

      const buffer = Buffer.from(await blob.arrayBuffer())
      const filename = `EHL_Roofing_Inspection_${pdfData.date.replace(/-/g, "")}_${pdfData.address.split(",")[0]?.replace(/\W+/g, "_") || "Address"}.pdf`

      console.log("[v0] PDF generated successfully:", filename)
      return { buffer, filename }
    } catch (error) {
      console.error("[v0] PDF Generation Error:", error)
      await logError({
        message: "PDF generation failed",
        context: "generatePDFBuffer",
        error: error,
        metadata: { address: values.address, sectionsCount: values.sections?.length },
      })
      return null
    }
  }

  const validateNoSpanish = (sections: Section[], finalNotes: string): { valid: boolean; issues: string[] } => {
    const spanishDetector =
      /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta|chimenea|humedad|moho/i
    const issues: string[] = []
    sections.forEach((section, index) => {
      if (spanishDetector.test(section.issue)) issues.push(`Section ${index + 1} Issue: "${section.issue}"`)
      if (spanishDetector.test(section.description)) issues.push(`Section ${index + 1} Description contains Spanish`)
      if (section.title && spanishDetector.test(section.title))
        issues.push(`Section ${index + 1} Title contains Spanish`)
    })
    if (spanishDetector.test(finalNotes)) issues.push("Final Notes contain Spanish")
    return { valid: issues.length === 0, issues }
  }

  const exportPDF = async () => {
    try {
      const values = getValues()
      const validation = validateNoSpanish(values.sections || [], values.finalNotes || "")
      if (!validation.valid) {
        showToast("Spanish words detected. Please review.", "error")
        return
      }
      
      const pdf = await generatePDFBuffer()
      if (!pdf) {
        showToast("PDF generation failed. Check console for details.", "error")
        await logError({
          message: "PDF export failed - generatePDFBuffer returned null",
          context: "exportPDF",
          metadata: { 
            hasAddress: !!values.address,
            sectionsCount: values.sections?.length || 0,
          },
        })
        return
      }
      
      const blob = new Blob([pdf.buffer], { type: "application/pdf" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = pdf.filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      showToast("PDF exported successfully", "success")
    } catch (error) {
      console.error("[v0] Export PDF error:", error)
      await logError({
        message: "PDF export failed with exception",
        context: "exportPDF",
        error: error,
      })
      showToast("Failed to export PDF. Please try again.", "error")
    }
  }

  const sendEmail = async () => {
    if (!emailTo.trim()) return showToast("Enter recipient email", "error")
    setIsSendingEmail(true)
    const pdf = await generatePDFBuffer()
    if (!pdf) {
      setIsSendingEmail(false)
      showToast("PDF generation failed", "error")
      return
    }
    const to = emailTo
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean)
    const cc = emailCc
      ? emailCc
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
      : undefined
    const result = await sendReportEmail({
      to,
      cc,
      subject: emailSubject,
      body: emailBody,
      pdfBuffer: pdf.buffer,
      pdfFileName: pdf.filename,
    })
    if (result.success) {
      showToast("Email sent successfully!", "success")
      setIsEmailDialogOpen(false)
    } else {
      showToast(result.error || "Email failed", "error")
    }
    setIsSendingEmail(false)
  }

  const saveInspection = async () => {
    const values = getValues()
    if (!values.address.trim()) return showToast("Address required", "error")
    if (values.sections.length === 0) return showToast("Add at least one section", "error")
    const validation = validateNoSpanish(values.sections || [], values.finalNotes || "")
    if (!validation.valid) {
      showToast("Spanish words detected. Please review.", "error")
      return
    }
    try {
      const result = await saveInspectionToBaserow({
        ...values,
        finalNotes: values.finalNotes || "",
      })
      
      if (result.success) {
        showToast(`Saved! ID: ${result.id}`, "success")
      } else {
        await logError({
          message: "Failed to save inspection",
          context: "saveInspection",
          error: result.error,
        })
        showToast(result.error || "Save failed", "error")
      }
    } catch (error) {
      await logError({
        message: "Exception in saveInspection",
        context: "saveInspection",
        error: error,
      })
      showToast("Failed to save inspection", "error")
    }
  }

  const loadInspections = async () => {
    setIsLoadingInspections(true)
    const result = await listInspectionsFromBaserow()
    if (result.success) {
      setSavedInspections(result.inspections)
      setIsLoadDialogOpen(true)
    } else {
      showToast(result.error || "Load failed", "error")
    }
    setIsLoadingInspections(false)
  }

  const loadInspection = async (id: number) => {
    const result = await loadInspectionFromBaserow(id)
    if (result.success) {
      const d = result.data
      reset({
        ...d,
        logo: d.logo || "/ehl-logo.png",
        date: d.date || new Date().toISOString().split("T")[0],
        sections: d.sections || [],
        finalNotes: d.finalNotes || "",
        inspectorFieldNotes: d.inspectorFieldNotes || "",
      })
      setIsLoadDialogOpen(false)
      showToast("Loaded successfully!", "success")
      setAutoSaveStatus("saved")
    } else {
      showToast(result.error || "Load failed", "error")
    }
  }

  const deleteInspection = async (id: number) => {
    if (!confirm("Delete this inspection?")) return
    const result = await deleteInspectionFromBaserow(id)
    if (result.success) {
      setSavedInspections((prev) => prev.filter((i) => i.id !== id))
      showToast("Deleted!", "success")
    } else {
      showToast(result.error || "Delete failed", "error")
    }
  }

  const newInspection = () => {
    const values = getValues()
    if (
      (values.sections.length > 0 ||
        values.address ||
        values.customerName ||
        values.customerEmail ||
        values.finalNotes ||
        values.inspectorFieldNotes) &&
      !confirm("Start new? Unsaved changes will be lost.")
    )
      return
    reset({
      company: "EHL Roofing LLC",
      license: "CA #1145092",
      logo: "/ehl-logo.png",
      customerName: "",
      customerEmail: "",
      address: "",
      date: new Date().toISOString().split("T")[0],
      inspector: "Lester Herrera H.",
      estimator: " Robertson Carrillo Z.",
      sections: [],
      finalNotes: "",
      inspectorFieldNotes: "",
    })
    setCurrentSection({ id: "", issue: "", description: "", severity: "Medium", photos: [] })
    localStorage.removeItem("current_inspection")
    showToast("New inspection started", "info")
    setAutoSaveStatus("saved")
  }

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6">
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-lg shadow-lg text-white animate-slide-up ${
                toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-blue-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <span>{toast.message}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="mb-4 flex flex-wrap gap-2 justify-between items-center">
            <h1 className="text-2xl sm:text-3xl font-bold">Roof Inspection Report Generator</h1>
            <div className="flex gap-2 items-center">
              <div className="flex items-center gap-2 text-sm">
                {autoSaveStatus === "saving" && <span className="text-blue-600">Saving...</span>}
                {autoSaveStatus === "saved" && <span className="text-green-600">✓ Saved</span>}
                {autoSaveStatus === "unsaved" && <span className="text-gray-400">Unsaved</span>}
              </div>
              <Button onClick={loadInspections} variant="outline" disabled={isLoadingInspections}>
                {isLoadingInspections ? "Loading..." : "Saved Reports"}
              </Button>
              <Button onClick={saveInspection} variant="outline">
                Save
              </Button>
              <Button onClick={newInspection} variant="outline">
                New
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <CompanyForm />
              <CustomerForm />
              <InspectionDetailsForm />

              <SectionBuilder
                currentSection={currentSection}
                editingId={editingId}
                isRecordingIssue={isRecordingIssue}
                isTranscribingIssue={isTranscribingIssue}
                isGeneratingDesc={isGeneratingDesc}
                isUploadingPhotos={isUploadingPhotos}
                compressionProgress={compressionProgress}
                onSectionChange={setCurrentSection}
                onStartRecording={startRecordingIssue}
                onStopRecording={stopRecordingIssue}
                onGenerateDescription={generateDescription}
                onPhotoUpload={handlePhotoUpload}
                onRemovePhoto={removePhoto}
                onAddSection={addSection}
                onCancelEdit={cancelEdit}
              />

              <SectionsList sections={fields} onEdit={editSection} onDelete={deleteSection} />

              <FieldNotesForm
                isRecording={isRecordingFieldNotes}
                isTranscribing={isTranscribingFieldNotes}
                onStartRecording={startRecordingFieldNotes}
                onStopRecording={stopRecordingFieldNotes}
              />

              <FinalNotesForm
                isRecording={isRecordingNotes}
                isTranscribing={isTranscribingNotes}
                isGenerating={isGeneratingNotes}
                canGenerate={fields.length > 0 && !!watchedValues.inspectorFieldNotes?.trim()}
                onStartRecording={startRecordingNotes}
                onStopRecording={stopRecordingNotes}
                onGenerate={generateFinalNotes}
              />

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={exportPDF} className="flex-1" disabled={fields.length === 0}>
                  Export PDF
                </Button>
                <Button
                  onClick={() => setIsEmailDialogOpen(true)}
                  variant="outline"
                  className="flex-1 bg-transparent"
                  disabled={fields.length === 0}
                >
                  Email Report
                </Button>
              </div>
            </div>

            <ReportPreview
              ref={previewRef}
              company={watchedValues.company || ""}
              license={watchedValues.license || ""}
              logo={watchedValues.logo || ""}
              customerName={watchedValues.customerName || ""}
              customerEmail={watchedValues.customerEmail || ""}
              address={watchedValues.address || ""}
              date={watchedValues.date || ""}
              inspector={watchedValues.inspector || ""}
              estimator={watchedValues.estimator || ""}
              sections={fields}
              finalNotes={watchedValues.finalNotes || ""}
            />
          </div>
        </div>

        {/* Email Dialog */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Email Inspection Report</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>To *</Label>
                <Input value={emailTo} onChange={(e) => setEmailTo(e.target.value)} required />
              </div>
              <div>
                <Label>CC (optional)</Label>
                <Input value={emailCc} onChange={(e) => setEmailCc(e.target.value)} />
              </div>
              <div>
                <Label>Subject *</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} required />
              </div>
              <div>
                <Label>Message *</Label>
                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} required />
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600">
                PDF report will be attached automatically
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setIsEmailDialogOpen(false)} disabled={isSendingEmail}>
                  Cancel
                </Button>
                <Button onClick={sendEmail} disabled={isSendingEmail}>
                  {isSendingEmail ? "Sending..." : "Send Email"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Load Dialog */}
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Load Saved Inspection Reports</DialogTitle>
            </DialogHeader>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Select a previously saved inspection to continue editing or review.
              </p>
            </div>
            <div className="space-y-3 bg-white p-4 rounded-lg">
              {savedInspections.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No saved inspections found.</p>
              ) : (
                savedInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="border rounded-lg p-4 flex justify-between items-start hover:bg-gray-50 transition-colors bg-white"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{insp.address}</h3>
                      <div className="text-sm text-gray-600 mt-2 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Date:</span> {insp.date}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Inspector:</span> {insp.inspector}
                        </div>
                        {insp.customerName && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Customer:</span> {insp.customerName}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button onClick={() => loadInspection(insp.id)} size="sm" className="min-w-[80px]">
                        Load & Edit
                      </Button>
                      <Button onClick={() => deleteInspection(insp.id)} variant="destructive" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </FormProvider>
  )
}
