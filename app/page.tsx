"use client"

import type React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import {
  translateSpanishToEnglish,
  transcribeAudioWithWhisper,
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
import html2canvas from "html2canvas"
import jsPDF from "jspdf"

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
  const [editingSection, setEditingSection] = useState<Section | null>(null)

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
      if (typeof Worker === "undefined") {
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement("canvas")
            const ctx = canvas.getContext("2d")
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
            const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.8)
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
      const worker = new Worker("/image-worker.js")

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
            message: "Image compression failed",
            context: "handlePhotoUpload",
            error: err,
            metadata: { imageIndex: i, fileName: filesToProcess[i].name },
          })
        }
      }

      if (newPhotos.length > 0) {
        setCurrentSection((prev) => ({
          ...prev,
          photos: [...prev.photos, ...newPhotos].slice(0, 4),
        }))
        showToast(`${newPhotos.length} photo(s) compressed successfully`, "success")
      } else {
        showToast("Failed to compress images. Please try again.", "error")
      }
    } catch (err) {
      console.error("[v0] Photo upload error:", err)
      await logError({
        message: "Photo upload failed",
        context: "handlePhotoUpload",
        error: err,
      })
      showToast("Error uploading photos. Please try again.", "error")
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
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm"
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
            setValue("inspectorFieldNotes", currentFieldNotes ? `${currentFieldNotes} ${translated}` : translated)
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
      showToast("Please add a damage description", "error")
      return
    }

    try {
      let finalIssue = currentSection.issue.trim()
      let finalTitle = currentSection.title?.trim() || ""
      let finalDescription = currentSection.description.trim()
      const finalSeverity = currentSection.severity
      const finalPhotos = [...currentSection.photos]

      console.log("[v0] Adding/Updating section with severity:", finalSeverity, "photos:", finalPhotos.length)

      // Translation logic...
      const hasAccentedChars = /[áéíóúñüÁÉÍÓÚÑÜ¿¡]/.test(finalIssue + finalDescription + finalTitle)
      const hasSpanishWords =
        /\b(el|la|los|las|del|de|en|con|por|para|que|es|un|una|techo|daño|agua|grieta|fisura|humedad|goteras?|tejas?|impermeabilizante)\b/i.test(
          finalIssue + finalDescription + finalTitle,
        )

      if (hasAccentedChars || hasSpanishWords) {
        const translateResult = await translateSpanishToEnglish(finalIssue, finalDescription, finalTitle)
        if (translateResult) {
          finalIssue = translateResult.issue
          finalDescription = translateResult.description
          finalTitle = translateResult.title || finalTitle
        }
      }

      const cleanAccents = (text: string) =>
        text
          .replace(/[áàäâ]/g, "a")
          .replace(/[éèëê]/g, "e")
          .replace(/[íìïî]/g, "i")
          .replace(/[óòöô]/g, "o")
          .replace(/[úùüû]/g, "u")
          .replace(/[ñ]/g, "n")
          .replace(/[ÁÀÄÂ]/g, "A")
          .replace(/[ÉÈËÊ]/g, "E")
          .replace(/[ÍÌÏÎ]/g, "I")
          .replace(/[ÓÒÖÔ]/g, "O")
          .replace(/[ÚÙÜÛ]/g, "U")
          .replace(/[Ñ]/g, "N")
          .replace(/[¿¡]/g, "")

      finalIssue = cleanAccents(finalIssue)
      finalDescription = cleanAccents(finalDescription)
      finalTitle = cleanAccents(finalTitle)

      const cleanTitle = finalTitle
        .replace(/["""]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^(.)/, (c) => c.toUpperCase())

      const cleanDescription = finalDescription.replace(/["""]/g, "").replace(/\s+/g, " ").trim()

      const newSection: Section = {
        id: editingSection?.id || crypto.randomUUID(),
        issue: finalIssue,
        title: cleanTitle,
        description: cleanDescription,
        severity: finalSeverity,
        photos: finalPhotos,
      }

      console.log(
        "[v0] Final section to save:",
        newSection.id,
        "Severity:",
        newSection.severity,
        "Photos:",
        newSection.photos.length,
      )

      if (editingSection) {
        const currentSections = getValues("sections") || []
        const updatedSections = currentSections.map((s) => (s.id === editingSection.id ? newSection : s))
        setValue("sections", updatedSections, { shouldDirty: true })
        setEditingSection(null)
        showToast("Section updated!", "success")
      } else {
        append(newSection)
        showToast("Section added!", "success")
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
      console.log("[v0] Add section error:", error instanceof Error ? error.message : "Unknown error")
      await logError(error instanceof Error ? error.message : "Unknown error", "addSection", {
        issue: currentSection.issue,
      })
      showToast(error instanceof Error ? error.message : "Failed to add section", "error")
    }
  }

  const editSection = (section: Section) => {
    const sectionCopy: Section = {
      id: section.id,
      issue: section.issue,
      title: section.title || "",
      description: section.description,
      severity: section.severity,
      photos: [...section.photos], // Clone the photos array
    }
    console.log(
      "[v0] Editing section:",
      sectionCopy.id,
      "Severity:",
      sectionCopy.severity,
      "Photos:",
      sectionCopy.photos.length,
    )
    setCurrentSection(sectionCopy)
    setEditingSection(sectionCopy)
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
    setEditingSection(null)
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
  const generatePDFBuffer = async (): Promise<Blob | null> => {
    const values = methods.getValues()

    if (!values.address?.trim()) {
      throw new Error("VALIDATION: Please enter an address before exporting the PDF")
    }

    if (!values.sections || values.sections.length === 0) {
      throw new Error("VALIDATION: Please add at least one section before exporting the PDF")
    }

    try {
      const previewElement = document.getElementById("report-preview")
      if (!previewElement) {
        throw new Error("Preview element not found")
      }

      // Create a clone for PDF generation to avoid affecting the visible preview
      const clone = previewElement.cloneNode(true) as HTMLElement
      clone.style.width = "800px"
      clone.style.padding = "40px"
      clone.style.backgroundColor = "#ffffff"
      clone.style.position = "absolute"
      clone.style.left = "-9999px"
      clone.style.top = "0"
      document.body.appendChild(clone)

      // Wait for images to load
      const images = clone.querySelectorAll("img")
      await Promise.all(
        Array.from(images).map(
          (img) =>
            new Promise((resolve) => {
              if (img.complete) {
                resolve(true)
              } else {
                img.onload = () => resolve(true)
                img.onerror = () => resolve(true)
              }
            }),
        ),
      )

      // Find all sections marked with data-pdf-section
      const sections = clone.querySelectorAll("[data-pdf-section]")

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter",
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const margin = 10
      const contentWidth = pageWidth - margin * 2
      const maxContentHeight = pageHeight - margin * 2

      let currentY = margin
      let isFirstPage = true

      // Process each section individually
      for (const section of Array.from(sections)) {
        const sectionElement = section as HTMLElement

        // Capture this section as a separate canvas
        const sectionCanvas = await html2canvas(sectionElement, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: "#ffffff",
        })

        const imgData = sectionCanvas.toDataURL("image/jpeg", 0.95)
        const imgWidth = contentWidth
        const imgHeight = (sectionCanvas.height * imgWidth) / sectionCanvas.width

        // Check if this section fits on the current page
        if (currentY + imgHeight > pageHeight - margin && !isFirstPage) {
          // Section doesn't fit - start a new page
          pdf.addPage()
          currentY = margin
        }

        // If section is taller than one page, we need to handle it specially
        if (imgHeight > maxContentHeight) {
          // For very tall sections, we'll add them and let them overflow
          // This is a rare edge case for extremely long content
          if (!isFirstPage || currentY > margin) {
            pdf.addPage()
            currentY = margin
          }
          pdf.addImage(imgData, "JPEG", margin, currentY, imgWidth, imgHeight)

          // Calculate how many pages this section spans
          const pagesNeeded = Math.ceil(imgHeight / maxContentHeight)
          for (let p = 1; p < pagesNeeded; p++) {
            pdf.addPage()
          }
          currentY = margin + (imgHeight % maxContentHeight)
          if (currentY < margin + 5) currentY = margin
        } else {
          // Normal case - section fits on a page
          pdf.addImage(imgData, "JPEG", margin, currentY, imgWidth, imgHeight)
          currentY += imgHeight + 5 // 5mm gap between sections
        }

        isFirstPage = false
      }

      document.body.removeChild(clone)

      const pdfBlob = pdf.output("blob")
      return pdfBlob
    } catch (error) {
      console.error("[v0] PDF Generation Error:", error)
      await logError("generatePDFBuffer", error instanceof Error ? error : new Error(String(error)), {
        address: values.address,
        sectionsCount: values.sections?.length || 0,
      })
      throw error
    }
  }

  const exportPDF = async () => {
    try {
      const values = methods.getValues()
      console.log("[v0] exportPDF - values:", {
        address: values.address,
        sectionsCount: values.sections?.length || 0,
      })

      const blob = await generatePDFBuffer()

      if (!blob) {
        showToast("PDF generation failed. Please try again.", "error")
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `inspection-report-${values.address?.replace(/[^a-zA-Z0-9]/g, "-") || "report"}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      showToast("PDF exported successfully!", "success")
    } catch (error) {
      console.error("[v0] Export PDF Error:", error)

      if (error instanceof Error && error.message.startsWith("VALIDATION:")) {
        showToast(error.message.replace("VALIDATION: ", ""), "error")
      } else {
        await logError("exportPDF", error instanceof Error ? error : new Error(String(error)))
        showToast("Failed to export PDF. Please try again.", "error")
      }
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
      pdfBuffer: await pdf.arrayBuffer(),
      pdfFileName: pdf.name,
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

  const validateNoSpanish = (sections: Section[], finalNotes: string): { valid: boolean; issues: string[] } => {
    const spanishDetector =
      /[áéíóúñ¿¡]|\b(no existe|falta|roto|inexistente|dañado|corrosión|tejas|techo|goteras|canaleta|tapajunta|chimenea|humedad|moho)\b/i
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

  return (
    <FormProvider {...methods}>
      <div className="min-h-screen bg-gradient-to-b from-orange-50/50 to-gray-50 p-3 sm:p-6">
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`p-4 rounded-lg shadow-lg text-white animate-slide-up flex items-center gap-3 ${
                toast.type === "success" ? "bg-green-600" : toast.type === "error" ? "bg-red-600" : "bg-primary"
              }`}
            >
              {toast.type === "success" && (
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
              <span className="text-sm font-medium">{toast.message}</span>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto">
          <header className="mb-6 pb-4 border-b border-border">
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "8px",
                    backgroundColor: "#f97316",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    style={{ height: "28px", width: "28px", color: "white" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                  </svg>
                </div>
                <div>
                  <h1 style={{ fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 }}>
                    Roof Inspection Report
                  </h1>
                  <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
                    EHL Roofing LLC - Professional Inspection Generator
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
                <div
                  style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", marginRight: "8px" }}
                >
                  {autoSaveStatus === "saving" && (
                    <span style={{ color: "#2563eb", display: "flex", alignItems: "center", gap: "6px" }}>
                      <div
                        style={{
                          height: "12px",
                          width: "12px",
                          border: "2px solid #2563eb",
                          borderTopColor: "transparent",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      />
                      Saving...
                    </span>
                  )}
                  {autoSaveStatus === "saved" && (
                    <span style={{ color: "#16a34a", display: "flex", alignItems: "center", gap: "6px" }}>
                      <svg
                        style={{ height: "16px", width: "16px" }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Saved
                    </span>
                  )}
                  {autoSaveStatus === "unsaved" && (
                    <span style={{ color: "#6b7280", display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ height: "8px", width: "8px", backgroundColor: "#6b7280", borderRadius: "50%" }} />
                      Unsaved
                    </span>
                  )}
                </div>
                <Button onClick={loadInspections} variant="outline" disabled={isLoadingInspections} size="sm">
                  {isLoadingInspections ? "Loading..." : "Load"}
                </Button>
                <Button onClick={saveInspection} variant="outline" size="sm">
                  Save
                </Button>
                <Button onClick={newInspection} variant="outline" size="sm">
                  New
                </Button>
              </div>
            </div>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "24px",
            }}
            className="lg:grid-cols-2"
          >
            {/* Left Column - Forms */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <CompanyForm />
              <CustomerForm />
              <InspectionDetailsForm />

              <SectionBuilder
                currentSection={currentSection}
                editingSection={editingSection}
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

              <div style={{ display: "flex", flexDirection: "row", gap: "12px" }}>
                <Button onClick={exportPDF} style={{ flex: 1 }} size="lg" disabled={fields.length === 0}>
                  <svg
                    style={{ height: "20px", width: "20px", marginRight: "8px" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Export PDF
                </Button>
                <Button
                  onClick={() => setIsEmailDialogOpen(true)}
                  variant="outline"
                  style={{ flex: 1 }}
                  size="lg"
                  disabled={fields.length === 0}
                >
                  <svg
                    style={{ height: "20px", width: "20px", marginRight: "8px" }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  Email Report
                </Button>
              </div>
            </div>

            {/* Right Column - Preview */}
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
              id="report-preview"
            />
          </div>
        </div>

        {/* Email Dialog - Improved for mobile */}
        <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                Email Inspection Report
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">To *</Label>
                <Input
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  required
                  className="touch-target mt-1"
                  placeholder="recipient@email.com"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">CC (optional)</Label>
                <Input
                  value={emailCc}
                  onChange={(e) => setEmailCc(e.target.value)}
                  className="touch-target mt-1"
                  placeholder="cc@email.com"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Subject *</Label>
                <Input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  required
                  className="touch-target mt-1"
                />
              </div>
              <div>
                <Label className="text-sm font-medium">Message *</Label>
                <Textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={8}
                  required
                  className="touch-target mt-1"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                PDF report will be attached automatically
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEmailDialogOpen(false)}
                  disabled={isSendingEmail}
                  className="touch-target"
                >
                  Cancel
                </Button>
                <Button onClick={sendEmail} disabled={isSendingEmail} className="touch-target gap-2">
                  {isSendingEmail ? (
                    <>
                      <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Load Dialog - Improved for mobile */}
        <Dialog open={isLoadDialogOpen} onOpenChange={setIsLoadDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
                Saved Inspection Reports
              </DialogTitle>
            </DialogHeader>
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                Select a previously saved inspection to continue editing or review.
              </p>
            </div>
            <div className="space-y-3">
              {savedInspections.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                    <svg
                      className="h-8 w-8 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-muted-foreground">No saved inspections found.</p>
                  <p className="text-sm text-muted-foreground mt-1">Create and save your first inspection report.</p>
                </div>
              ) : (
                savedInspections.map((insp) => (
                  <div
                    key={insp.id}
                    className="border rounded-lg p-4 hover:border-primary/50 hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base sm:text-lg truncate">{insp.address}</h3>
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            <span>{insp.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 flex-shrink-0"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                            <span>{insp.inspector}</span>
                          </div>
                          {insp.customerName && (
                            <div className="flex items-center gap-2">
                              <svg
                                className="h-4 w-4 flex-shrink-0"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                                />
                              </svg>
                              <span className="truncate">{insp.customerName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          onClick={() => loadInspection(insp.id)}
                          size="sm"
                          className="flex-1 sm:flex-none touch-target gap-1.5"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                            />
                          </svg>
                          Load
                        </Button>
                        <Button
                          onClick={() => deleteInspection(insp.id)}
                          variant="destructive"
                          size="sm"
                          className="touch-target"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </Button>
                      </div>
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
