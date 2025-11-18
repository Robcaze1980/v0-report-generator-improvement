"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, StopCircle } from 'lucide-react'
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
} from "./actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

type ToastType = "success" | "error" | "info"
interface ToastMessage {
  message: string
  type: ToastType
  id: number
}

type Severity = "Critical" | "High" | "Medium" | "Low"
type Section = {
  id: string
  issue: string
  title?: string  // Added optional title field
  description: string
  severity: Severity
  photos: string[]
}

const getSeverityOrder = (severity: Severity): number => {
  const order = { Critical: 0, High: 1, Medium: 2, Low: 3 }
  return order[severity]
}

const sortSectionsBySeverity = (sections: Section[]): Section[] => {
  return [...sections].sort((a, b) => getSeverityOrder(a.severity) - getSeverityOrder(b.severity))
}

const formatDescription = (description: string): string => {
  // Ensure there's a blank line between the two sections
  return description
    .replace(/OBSERVED CONDITION:\s*/i, "OBSERVED CONDITION:\n")
    .replace(/POTENTIAL IMPACT IF UNADDRESSED:\s*/i, "\n\nPOTENTIAL IMPACT IF UNADDRESSED:\n")
}

export default function ReportGenerator() {
  // Build timestamp: 2025-01-12

  // Company info
  const [company] = useState("EHL Roofing LLC")
  const [license] = useState("CA #1145092")
  const permanentLogo = "/ehl-logo.png"

  // Customer info
  const [customerName, setCustomerName] = useState("")
  const [customerEmail, setCustomerEmail] = useState("")

  // Inspection info
  const [address, setAddress] = useState("")
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [inspector, setInspector] = useState("Lester Herrera H.")
  const [estimator] = useState(" Robertson Carrillo Z.")

  // Sections
  const [sections, setSections] = useState<Section[]>([])
  const [currentSection, setCurrentSection] = useState<Section>({
    id: "",
    issue: "",
    title: "",  // Added title to initial state
    description: "",
    severity: "Medium",
    photos: [],
  })
  const [editingId, setEditingId] = useState<string | null>(null)

  // Final notes
  const [finalNotes, setFinalNotes] = useState("")
  const [isRecordingNotes, setIsRecordingNotes] = useState(false)
  const [isTranscribingNotes, setIsTranscribingNotes] = useState(false)
  const notesMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const notesAudioChunksRef = useRef<Blob[]>([])

  // Voice recording for Issue field
  const [isRecordingIssue, setIsRecordingIssue] = useState(false)
  const [isTranscribingIssue, setIsTranscribingIssue] = useState(false)
  const issueMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const issueAudioChunksRef = useRef<Blob[]>([])

  const [inspectorFieldNotes, setInspectorFieldNotes] = useState("")
  const [isRecordingFieldNotes, setIsRecordingFieldNotes] = useState(false)
  const [isTranscribingFieldNotes, setIsTranscribingFieldNotes] = useState(false)
  const fieldNotesMediaRecorderRef = useRef<MediaRecorder | null>(null)
  const fieldNotesAudioChunksRef = useRef<Blob[]>([])

  // Email dialog
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [emailTo, setEmailTo] = useState("")
  const [emailCc, setEmailCc] = useState("")
  const [emailSubject, setEmailSubject] = useState("")
  const [emailBody, setEmailBody] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Load dialog
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

  // Cleanup media recorders on unmount
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

  const autoSave = useCallback(async () => {
    if (!address.trim() || sections.length === 0) return

    setAutoSaveStatus("saving")
    const result = await saveInspectionToBaserow({
      company,
      license,
      customerName,
      customerEmail,
      address,
      date,
      inspector,
      estimator,
      logo: permanentLogo,
      sections,
      finalNotes,
    })

    setAutoSaveStatus(result.success ? "saved" : "unsaved")
    if (!result.success) {
      showToast(result.error || "Auto-save failed", "error")
    }
  }, [
    address,
    sections,
    customerName,
    customerEmail,
    date,
    inspector,
    finalNotes,
    company,
    license,
    estimator,
    permanentLogo,
    showToast,
  ])

  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current)
    }

    if (address.trim() && sections.length > 0) {
      setAutoSaveStatus("unsaved")
      autoSaveTimeoutRef.current = setTimeout(() => {
        autoSave()
      }, 5000) // Auto-save 5 seconds after last change
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [sections, customerName, customerEmail, address, finalNotes, autoSave])

  useEffect(() => {
    const saved = localStorage.getItem("current_inspection")
    if (saved && sections.length === 0 && !address) {
      try {
        const data = JSON.parse(saved)
        if (confirm("Found unsaved inspection from " + new Date(data.timestamp).toLocaleString() + ". Load it?")) {
          setCustomerName(data.customerName || "")
          setCustomerEmail(data.customerEmail || "")
          setAddress(data.address || "")
          setDate(data.date || new Date().toISOString().split("T")[0])
          setInspector(data.inspector || "Lester Herrera H.")
          setSections(data.sections || [])
          setFinalNotes(data.finalNotes || "")
          setInspectorFieldNotes(data.inspectorFieldNotes || "")
          showToast("Local backup loaded successfully", "success")
        }
      } catch (e) {
        console.error("[v0] Failed to load backup:", e)
        showToast("Failed to load local backup", "error")
      }
    }
  }, [
    showToast,
    setCustomerName,
    setCustomerEmail,
    setAddress,
    setDate,
    setInspector,
    setSections,
    setFinalNotes,
    setInspectorFieldNotes,
  ])

  useEffect(() => {
    if (sections.length > 0 || address) {
      const data = {
        customerName,
        customerEmail,
        address,
        date,
        inspector,
        sections,
        finalNotes,
        inspectorFieldNotes,
        timestamp: Date.now(),
      }
      localStorage.setItem("current_inspection", JSON.stringify(data))
    }
  }, [sections, address, customerName, customerEmail, finalNotes, inspectorFieldNotes, date, inspector])

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingPhotos(true)
    try {
      const photoPromises = Array.from(files)
        .slice(0, 4)
        .map((file) => compressImage(file))

      const newPhotos = await Promise.all(photoPromises)
      setCurrentSection((prev) => ({ ...prev, photos: [...prev.photos, ...newPhotos].slice(0, 4) }))
      showToast("Photos uploaded and compressed", "success")
    } catch (err) {
      console.error("[v0] Photo upload error:", err)
      showToast("Error uploading photos. Please try again.", "error")
    } finally {
      setIsUploadingPhotos(false)
    }
  }

  const removePhoto = (index: number) => {
    setCurrentSection((prev) => ({ ...prev, photos: prev.photos.filter((_, i) => i !== index) }))
  }

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")

          // Máximo 1200px en el lado más largo
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

          // Comprimir a JPEG con 85% calidad
          const compressedDataUrl = canvas.toDataURL("image/jpeg", 0.85)
          resolve(compressedDataUrl)
        }
        img.onerror = reject
        img.src = e.target?.result as string
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Generate description with AI (100% English)
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
          title: result.title || prev.issue,  // Fallback to issue if no title
          description: result.description
        }))
        showToast("Title and description generated with AI", "success")
      } else {
        showToast(result.error || "Failed to generate description. Please try again.", "error")
      }
    } catch (error) {
      console.error("AI generation error:", error)
      showToast("Failed to generate description. Please try again.", "error")
    } finally {
      setIsGeneratingDesc(false)
    }
  }

  // Voice recording for Issue (max 100 words, auto-translate)
  const startRecordingIssue = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
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
              // Transcribir en ESPAÑOL primero
              const result = await transcribeAudioWithWhisper(base64Audio, "es")

              if (result.success && result.transcript) {
                // Limitar a 100 palabras
                const words = result.transcript.trim().split(/\s+/)
                const limitedText = words.slice(0, 100).join(" ")

                // Traducir al inglés
                const translated = await translateSpanishToEnglish(limitedText)

                // Validación final
                const spanishDetector =
                  /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta/i

                if (spanishDetector.test(translated)) {
                  throw new Error("Translation contains Spanish words. Please try recording again.")
                }

                // Limpiar y sanitizar
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
              console.error("[v0] Transcription/translation error:", err)
              showToast(err instanceof Error ? err.message : "Failed to process audio. Please try again.", "error")
            } finally {
              setIsTranscribingIssue(false)
              stream.getTracks().forEach((track) => track.stop())
            }
          }

          reader.onerror = () => {
            showToast("Error reading audio file", "error")
            setIsTranscribingIssue(false)
            stream.getTracks().forEach((track) => track.stop())
          }

          reader.readAsDataURL(audioBlob)
        } catch (err) {
          console.error("[v0] Audio processing error:", err)
          showToast("Error processing audio", "error")
          setIsTranscribingIssue(false)
          stream.getTracks().forEach((track) => track.stop())
        }
      }

      mediaRecorder.onerror = (event) => {
        console.error("[v0] MediaRecorder error:", event)
        showToast("Recording error occurred", "error")
        setIsRecordingIssue(false)
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start()
      setIsRecordingIssue(true)
    } catch (error) {
      console.error("[v0] Microphone error:", error)
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          showToast("Microphone permission denied. Please enable microphone access in your browser settings.", "error")
        } else if (error.name === "NotFoundError") {
          showToast("No microphone found. Please connect a microphone and try again.", "error")
        } else {
          showToast("Microphone access error: " + error.message, "error")
        }
      } else {
        showToast("Failed to access microphone", "error")
      }
    }
  }

  const stopRecordingIssue = () => {
    if (issueMediaRecorderRef.current?.state === "recording") {
      issueMediaRecorderRef.current.stop()
      setIsRecordingIssue(false)
    }
  }

  // Voice recording for Final Notes
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
            setFinalNotes((prev) => (prev ? `${prev} ${translated}` : translated))
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
            setInspectorFieldNotes((prev) => (prev ? `${prev} ${translated}` : translated))
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

  // Add or update section (ENFORCE ENGLISH)
  const addSection = async () => {
    if (!currentSection.issue.trim()) {
      showToast("Please enter an issue", "error")
      return
    }

    try {
      // Translate and validate
      const translatedIssue = await translateSpanishToEnglish(currentSection.issue)
      const translatedTitle = currentSection.title
        ? await translateSpanishToEnglish(currentSection.title)
        : translatedIssue
      const translatedDescription = await translateSpanishToEnglish(currentSection.description)

      // Validación final: asegurar que no hay español
      const spanishDetector =
        /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta|chimenea|humedad|moho/i

      if (spanishDetector.test(translatedIssue) ||
          spanishDetector.test(translatedTitle) ||
          spanishDetector.test(translatedDescription)) {
        throw new Error("Translation incomplete - Spanish words detected. Please try again.")
      }

      // Limpiar cualquier caracteres especiales restantes
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
        title: cleanTitle,  // Include title in section
        description: cleanDescription,
        id: currentSection.id || crypto.randomUUID(),
      }

      if (editingId) {
        setSections((prev) => prev.map((s) => (s.id === editingId ? sectionToAdd : s)))
        setEditingId(null)
        showToast("Section updated successfully", "success")
      } else {
        setSections((prev) => [...prev, sectionToAdd])
        showToast("Section added successfully", "success")
      }

      setCurrentSection({
        id: "",
        issue: "",
        title: "",  // Reset title
        description: "",
        severity: "Medium",
        photos: [],
      })
    } catch (error) {
      console.error("[v0] Add section error:", error)
      showToast(error instanceof Error ? error.message : "Failed to add section. Please try again.", "error")
    }
  }

  const editSection = (section: Section) => {
    setCurrentSection(section)
    setEditingId(section.id)
  }

  const deleteSection = (id: string) => {
    setSections((prev) => prev.filter((s) => s.id !== id))
    showToast("Section deleted", "success")
  }

  const cancelEdit = () => {
    setCurrentSection({
      id: "",
      issue: "",
      title: "",  // Reset title
      description: "",
      severity: "Medium",
      photos: [],
    })
    setEditingId(null)
  }

  // Generate final notes with AI (sales pitch)
  const generateFinalNotes = async () => {
    if (sections.length === 0) {
      showToast("Add at least one section first", "error")
      return
    }
    if (!inspectorFieldNotes.trim()) {
      showToast("Please enter your field notes first", "error")
      return
    }
    setIsGeneratingNotes(true)
    try {
      const result = await generateFinalNotesWithAI({
        sections: sections.map((s) => ({ issue: s.issue, severity: s.severity })),
        address,
        inspector,
        inspectorFieldNotes,
      })
      if (result.success) {
        setFinalNotes(result.finalNotes)
        showToast("Final notes generated with AI", "success")
      } else {
        showToast(result.error || "AI generation failed", "error")
      }
    } catch (error) {
      console.error("Final notes error:", error)
      showToast("Failed to generate notes", "error")
    } finally {
      setIsGeneratingNotes(false)
    }
  }

  // PDF & Email
  const generatePDFBuffer = async (): Promise<{ buffer: Buffer; filename: string } | null> => {
    if (!address.trim() || sections.length === 0) return null
    const { jsPDF } = await import("jspdf")
    const html2canvas = (await import("html2canvas")).default

    const node = previewRef.current
    if (!node) return null

    // Wait for images
    const imgs = node.querySelectorAll("img")
    await Promise.all(
      Array.from(imgs).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((r) => {
              img.onload = r
              img.onerror = r
            }),
      ),
    )

    const canvas = await html2canvas(node, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      onclone: (doc) => {
        const logoImg = doc.querySelector('img[alt="EHL Logo"]')
        if (logoImg) {
          ;(logoImg as HTMLImageElement).style.height = "64px"
          ;(logoImg as HTMLImageElement).style.width = "auto"
          ;(logoImg as HTMLImageElement).style.maxHeight = "64px"
          ;(logoImg as HTMLImageElement).style.objectFit = "contain"
        }

        const imgs = doc.querySelectorAll("img")
        imgs.forEach((img) => {
          const el = img as HTMLImageElement
          if (!el.alt.includes("EHL Logo")) {
            el.style.width = "100%"
            el.style.height = "300px"
            el.style.objectFit = "cover"
            el.style.pageBreakInside = "avoid"
          }
        })
        doc.body.style.backgroundColor = "#ffffff"
        doc.body.style.color = "#111827"
      },
    })

    const pdf = new jsPDF({ unit: "pt", format: "letter" })
    const margin = 40
    const width = pdf.internal.pageSize.getWidth() - 2 * margin
    const height = (canvas.height * width) / canvas.width
    const pageHeight = pdf.internal.pageSize.getHeight() - 2 * margin

    let y = 0
    let page = 0
    while (y < canvas.height) {
      if (page > 0) pdf.addPage()
      const sliceHeight = Math.min((pageHeight * canvas.width) / width, canvas.height - y)
      const slice = document.createElement("canvas")
      slice.width = canvas.width
      slice.height = sliceHeight
      const ctx = slice.getContext("2d")
      if (ctx) {
        ctx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight)
        const url = slice.toDataURL("image/jpeg", 0.95)
        pdf.addImage(url, "JPEG", margin, margin, width, (sliceHeight * width) / canvas.width)
      }
      y += sliceHeight
      page++
    }

    const filename = `EHL_Roofing_Inspection_${date.replace(/-/g, "")}_${address.split(",")[0]?.replace(/\W+/g, "_") || "Address"}.pdf`
    return { buffer: Buffer.from(pdf.output("arraybuffer")), filename }
  }

  const validateNoSpanish = (sections: Section[], finalNotes: string): { valid: boolean; issues: string[] } => {
    const spanishDetector =
      /[áéíóúñ¿¡]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta|chimenea|humedad|moho/i
    const issues: string[] = []

    sections.forEach((section, index) => {
      if (spanishDetector.test(section.issue)) {
        issues.push(`Section ${index + 1} Issue: "${section.issue}"`)
      }
      if (spanishDetector.test(section.description)) {
        issues.push(`Section ${index + 1} Description contains Spanish`)
      }
      // Validate title as well
      if (section.title && spanishDetector.test(section.title)) {
        issues.push(`Section ${index + 1} Title contains Spanish`)
      }
    })

    if (spanishDetector.test(finalNotes)) {
      issues.push("Final Notes contain Spanish")
    }

    return { valid: issues.length === 0, issues }
  }

  const exportPDF = async () => {
    // Validar antes de generar PDF
    const validation = validateNoSpanish(sections, finalNotes)
    if (!validation.valid) {
      showToast("Spanish words detected in report. Please review and re-translate sections before exporting.", "error")
      console.warn("[v0] Spanish detected:", validation.issues)
      return
    }

    const pdf = await generatePDFBuffer()
    if (!pdf) {
      showToast("Fill address and add sections first", "error")
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
  }

  const openEmailDialog = async () => {
    if (!address.trim() || sections.length === 0) {
      showToast("Complete report first", "error")
      return
    }

    // Validar antes de email
    const validation = validateNoSpanish(sections, finalNotes)
    if (!validation.valid) {
      showToast("Spanish words detected in report. Please review and re-translate sections before emailing.", "error")
      console.warn("[v0] Spanish detected:", validation.issues)
      return
    }

    const content = await generateEmailContent({
      customerName,
      address,
      date: new Date(date).toLocaleDateString(),
      inspector,
      estimator,
      sections,
      finalNotes, // NOW PASSES FINAL NOTES to align email with report
    })

    if (content.success) {
      setEmailTo(customerEmail)
      setEmailSubject(content.subject)
      setEmailBody(content.body)
      setIsEmailDialogOpen(true)
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

  // Baserow
  const saveInspection = async () => {
    if (!address.trim()) return showToast("Address required", "error")
    if (sections.length === 0) return showToast("Add at least one section", "error")

    // Validar antes de guardar
    const validation = validateNoSpanish(sections, finalNotes)
    if (!validation.valid) {
      showToast("Spanish words detected in report. Please review and re-translate sections before saving.", "error")
      console.warn("[v0] Spanish detected:", validation.issues)
      return
    }

    const result = await saveInspectionToBaserow({
      company,
      license,
      customerName,
      customerEmail,
      address,
      date,
      inspector,
      estimator,
      logo: permanentLogo,
      sections,
      finalNotes,
      inspectorFieldNotes, // Include field notes when saving
    })
    showToast(
      result.success ? `Saved! ID: ${result.id}` : result.error || "Save failed",
      result.success ? "success" : "error",
    )
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
      setCustomerName(d.customerName || "")
      setCustomerEmail(d.customerEmail || "")
      setAddress(d.address || "")
      setDate(d.date || new Date().toISOString().split("T")[0])
      setInspector(d.inspector || "Lester Herrera H.")
      setSections(d.sections || [])
      setFinalNotes(d.finalNotes || "")
      setInspectorFieldNotes(d.inspectorFieldNotes || "")
      setIsLoadDialogOpen(false)
      showToast("Loaded successfully!", "success")
      setAutoSaveStatus("saved") // Reset auto-save status after loading
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
    if (
      (sections.length > 0 || address || customerName || customerEmail || finalNotes || inspectorFieldNotes) &&
      !confirm("Start new? Unsaved changes will be lost.")
    )
      return
    setCustomerName("")
    setCustomerEmail("")
    setAddress("")
    setDate(new Date().toISOString().split("T")[0])
    setInspector("Lester Herrera H.")
    setSections([])
    setCurrentSection({ id: "", issue: "", description: "", severity: "Medium", photos: [] })
    setInspectorFieldNotes("")
    setFinalNotes("")
    localStorage.removeItem("current_inspection") // Clear local backup
    showToast("New inspection started", "info")
    setAutoSaveStatus("saved") // Reset auto-save status
  }

  const sortedSections = sortSectionsBySeverity(sections)

  return (
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
              {toast.type === "success" && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {toast.type === "error" && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              {toast.type === "info" && (
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
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

        {/* CHANGE: Made grid responsive: single column on mobile, two columns on large screens */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Builder */}
          <div className="space-y-6">
            {/* Company */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Company Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Company Name</Label>
                    <Input value={company} readOnly />
                  </div>
                  <div>
                    <Label>License Number</Label>
                    <Input value={license} readOnly />
                  </div>
                </div>
                <div>
                  <Label>Company Logo</Label>
                  <div className="mt-2 p-4 border rounded-lg bg-gray-50 flex items-center justify-center">
                    <img
                      src={permanentLogo || "/placeholder.svg"}
                      alt="EHL Logo"
                      className="h-16 w-auto object-contain"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Customer */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Customer Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                </div>
                <div>
                  <Label>Customer Email</Label>
                  <Input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                </div>
              </div>
            </Card>

            {/* Inspection */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">Inspection Details</h2>
              <div className="space-y-4">
                <div>
                  <Label>Address *</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Inspection Date</Label>
                    <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  <div>
                    <Label>Inspector</Label>
                    <Select value={inspector} onValueChange={setInspector}>
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
                    <Input value={estimator} readOnly />
                  </div>
                </div>
              </div>
            </Card>

            {/* Add Section */}
            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4">{editingId ? "Edit Section" : "Agregar Problema/daño:"}</h2>
              <div className="space-y-4">
                <div>
                  <Label> Daño: *</Label>
                  <div className="flex gap-2">
                    <Input
                      value={currentSection.issue}
                      onChange={(e) => setCurrentSection({ ...currentSection, issue: e.target.value })}
                      className="flex-1"
                      placeholder="Describe el daño observado..."
                    />
                    {!isRecordingIssue && !isTranscribingIssue && (
                      <Button onClick={startRecordingIssue} variant="outline" size="sm">
                        🎤 GRABAR
                      </Button>
                    )}
                    {isRecordingIssue && (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-red-600 animate-pulse">
                          <div className="w-3 h-3 bg-red-600 rounded-full"></div>
                          <span className="font-medium text-sm">Recording...</span>
                        </div>
                        <Button onClick={stopRecordingIssue} variant="destructive" size="sm">
                          <StopCircle className="h-4 w-4" /> Stop
                        </Button>
                      </div>
                    )}
                    {isTranscribingIssue && (
                      <Button disabled size="sm">
                        Transcribing...
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Describe el daño. La IA generará un título profesional y descripción técnica.
                  </p>
                </div>

                {currentSection.title && (
                  <div>
                    <Label>Título Generado por IA</Label>
                    <Input
                      value={currentSection.title}
                      onChange={(e) => setCurrentSection({ ...currentSection, title: e.target.value })}
                      className="font-semibold"
                      placeholder="El título se generará automáticamente..."
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Puedes editar el título generado por la IA si lo deseas.
                    </p>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <Label>Description</Label>
                    <Button
                      onClick={generateDescription}
                      size="sm"
                      variant="outline"
                      disabled={isGeneratingDesc || !currentSection.issue.trim()}
                    >
                      {isGeneratingDesc ? "Generating..." : "✨ Generate Title + Description with AI"}
                    </Button>
                  </div>
                  <Textarea
                    value={currentSection.description}
                    onChange={(e) => setCurrentSection({ ...currentSection, description: e.target.value })}
                    rows={5}
                    placeholder="La descripción técnica se generará automáticamente..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>Severity</Label>
                    <Select
                      value={currentSection.severity}
                      onValueChange={(v) => setCurrentSection({ ...currentSection, severity: v as Severity })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Critical">Critical</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Photos (max 4)</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handlePhotoUpload}
                      disabled={isUploadingPhotos}
                    />
                    {isUploadingPhotos && <p className="text-sm text-blue-600 mt-1">Compressing images...</p>}
                  </div>
                </div>

                {currentSection.photos.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentSection.photos.map((p, i) => (
                      <div key={i} className="relative">
                        <img
                          src={p || "/placeholder.svg"}
                          alt={`Photo ${i}`}
                          className="w-20 h-20 object-cover rounded"
                        />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button onClick={addSection} className="flex-1" disabled={isGeneratingDesc}>
                    {editingId ? "Update Section" : "Add Section"}
                  </Button>
                  {editingId && (
                    <Button onClick={cancelEdit} variant="outline">
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Sections List */}
            {sections.length > 0 && (
              <Card className="p-4 sm:p-6">
                <h2 className="text-xl font-semibold mb-4"> Daños Agregados al Reporte: ({sections.length})</h2>
                <div className="space-y-3">
                  {sortedSections.map((s, i) => (
                    <div key={s.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">
                            {i + 1}. {s.title || s.issue}
                          </h3>
                          {s.title && s.title !== s.issue && (
                            <p className="text-xs text-gray-500 mt-0.5">Observación: {s.issue}</p>
                          )}
                          <span
                            className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${
                              s.severity === "Critical"
                                ? "bg-red-100 text-red-800"
                                : s.severity === "High"
                                  ? "bg-orange-100 text-orange-800"
                                  : s.severity === "Medium"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : "bg-green-100 text-green-800"
                            }`}
                          >
                            {s.severity}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => editSection(s)} variant="outline" size="sm">
                            Edit
                          </Button>
                          <Button onClick={() => deleteSection(s.id)} variant="destructive" size="sm">
                            Delete
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{s.description}</p>
                      {s.photos.length > 0 && (
                        <div className="flex gap-2 mt-2">
                          {s.photos.map((p, j) => (
                            <img
                              key={j}
                              src={p || "/placeholder.svg"}
                              alt=""
                              className="w-12 h-12 object-cover rounded"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4 sm:p-6">
              <h2 className="text-xl font-semibold mb-4"> Notas de Campo del Inspector</h2>
              <p className="text-sm text-gray-600 mb-4">
                Añada sus observaciones y recomendaciones preliminares. Estas se utilizarán para generar las
                recomendaciones finales completas.
              </p>
              <div className="space-y-4">
                <Textarea
                  value={inspectorFieldNotes}
                  onChange={(e) => setInspectorFieldNotes(e.target.value)}
                  rows={6}
                  placeholder="Enter your field observations and preliminary recommendations..."
                  maxLength={2000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{inspectorFieldNotes.length}/2000</span>
                  <div className="flex gap-2">
                    {!isRecordingFieldNotes && !isTranscribingFieldNotes && (
                      <Button onClick={startRecordingFieldNotes} variant="outline" size="sm">
                        🎤 GRABAR
                      </Button>
                    )}
                    {isRecordingFieldNotes && (
                      <Button onClick={stopRecordingFieldNotes} variant="destructive" size="sm">
                        <StopCircle className="h-4 w-4" /> Stop
                      </Button>
                    )}
                    {isTranscribingFieldNotes && (
                      <Button disabled size="sm">
                        Transcribing...
                      </Button>
                    )}
                    <Button onClick={() => setInspectorFieldNotes("")} variant="outline" size="sm">
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Final Notes */}
            <Card className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Final Notes & Recommendations</h2>
                <Button
                  onClick={generateFinalNotes}
                  size="sm"
                  variant="outline"
                  disabled={isGeneratingNotes || sections.length === 0 || !inspectorFieldNotes.trim()}
                >
                  {isGeneratingNotes ? "Generating..." : "Generate with AI"}
                </Button>
              </div>
              <div className="space-y-4">
                <Textarea
                  value={finalNotes}
                  onChange={(e) => setFinalNotes(e.target.value)}
                  rows={8}
                  maxLength={5000}
                />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{finalNotes.length}/5000</span>
                  <div className="flex gap-2">
                    {!isRecordingNotes && !isTranscribingNotes && (
                      <Button onClick={startRecordingNotes} variant="outline" size="sm">
                        🎤 GRABAR
                      </Button>
                    )}
                    {isRecordingNotes && (
                      <Button onClick={stopRecordingNotes} variant="destructive" size="sm">
                        <StopCircle className="h-4 w-4" /> Stop
                      </Button>
                    )}
                    {isTranscribingNotes && (
                      <Button disabled size="sm">
                        Transcribing...
                      </Button>
                    )}
                    <Button onClick={() => setFinalNotes("")} variant="outline" size="sm">
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </Card>

            {/* Export */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={exportPDF} className="flex-1" disabled={sections.length === 0}>
                Export PDF
              </Button>
              <Button
                onClick={openEmailDialog}
                variant="outline"
                className="flex-1 bg-transparent"
                disabled={sections.length === 0}
              >
                Email Report
              </Button>
            </div>
          </div>

          {/* Preview */}
          {/* CHANGE: Fixed preview visibility: removed xl-only classes, made it responsive on all screen sizes */}
          <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
            <Card className="p-4 sm:p-6 overflow-auto lg:h-full">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <div ref={previewRef} style={{ backgroundColor: "#ffffff", color: "#111827", padding: "24px" }}>
                {/* Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    borderBottom: "2px solid #e5e7eb",
                    paddingBottom: "16px",
                  }}
                >
                  <img
                    src={permanentLogo || "/placeholder.svg"}
                    alt="EHL Logo"
                    style={{ height: "64px", width: "auto", objectFit: "contain" }}
                  />
                  <div>
                    <h1 style={{ fontSize: "20px", fontWeight: "700" }}>Roof Inspection Report — {company}</h1>
                    <p style={{ fontSize: "14px", color: "#6b7280" }}>License: {license}</p>
                  </div>
                </div>

                {/* Customer Info */}
                {(customerName || customerEmail) && (
                  <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
                    <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px" }}>Customer Information</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                      {customerName && (
                        <div>
                          <span style={{ fontWeight: "600" }}>Name:</span> {customerName}
                        </div>
                      )}
                      {customerEmail && (
                        <div>
                          <span style={{ fontWeight: "600" }}>Email:</span> {customerEmail}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Inspection Info */}
                <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #e5e7eb" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "14px" }}>
                    <div>
                      <span style={{ fontWeight: "600" }}>Address:</span> {address || "—"}
                    </div>
                    <div>
                      <span style={{ fontWeight: "600" }}>Inspection Date:</span> {date}
                    </div>
                    <div>
                      <span style={{ fontWeight: "600" }}>Inspector:</span> {inspector}
                    </div>
                    <div>
                      <span style={{ fontWeight: "600" }}>Estimator:</span> {estimator}
                    </div>
                  </div>
                </div>

                {/* Final Notes */}
                {finalNotes && (
                  <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "2px solid #e5e7eb" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px" }}>
                      Inspector's Final Notes & Recommendations
                    </h2>
                    <p style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{finalNotes}</p>
                  </div>
                )}

                {/* Sections */}
                {sections.length > 0 && (
                  <div style={{ marginTop: "24px" }}>
                    <h2 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "16px" }}>Inspection Findings</h2>
                    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                      {sortedSections.map((s, i) => (
                        <div key={s.id} style={{ border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px" }}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "12px",
                            }}
                          >
                            <h3 style={{ fontSize: "16px", fontWeight: "600" }}>
                              {i + 1}. {s.title || s.issue}
                            </h3>
                            <span
                              style={{
                                fontSize: "12px",
                                padding: "4px 12px",
                                borderRadius: "999px",
                                fontWeight: "500",
                                backgroundColor:
                                  s.severity === "Critical"
                                    ? "#dc2626"
                                    : s.severity === "High"
                                      ? "#ea580c"
                                      : s.severity === "Medium"
                                        ? "#eab308"
                                        : "#22c55e",
                                color: "#ffffff",
                              }}
                            >
                              {s.severity}
                            </span>
                          </div>
                          <p style={{ fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                            {formatDescription(s.description)}
                          </p>
                          {s.photos.length > 0 && (
                            <div
                              style={{
                                marginTop: "16px",
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "12px",
                                pageBreakInside: "avoid",
                              }}
                            >
                              {s.photos.map((p, j) => (
                                <img
                                  key={j}
                                  src={p || "/placeholder.svg"}
                                  alt=""
                                  style={{
                                    width: "calc(50% - 6px)",
                                    height: "200px",
                                    objectFit: "cover",
                                    borderRadius: "8px",
                                    border: "1px solid #e5e7eb",
                                    pageBreakInside: "avoid",
                                  }}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div
                  style={{
                    marginTop: "32px",
                    paddingTop: "16px",
                    borderTop: "1px solid #e5e7eb",
                    fontSize: "12px",
                    color: "#6b7280",
                    textAlign: "center",
                  }}
                >
                  Prepared by {estimator}. © {new Date().getFullYear()} {company}. All rights reserved.
                </div>
              </div>
            </Card>
          </div>
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
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
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
              Select a previously saved inspection to continue editing or review. You can load, edit, and save any
              report.
            </p>
          </div>
          <div className="space-y-3 bg-white p-4 rounded-lg">
            {savedInspections.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No saved inspections found. Save your current inspection to see it here.
              </p>
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
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Total Issues:</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                          {insp.totalIssues}
                        </span>
                      </div>
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
  )
}
