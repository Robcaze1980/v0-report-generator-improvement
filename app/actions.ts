"use server"

import nodemailer from "nodemailer"

type Severity = "Critical" | "High" | "Medium" | "Low"

// ================================
// OpenAI-powered description generation
// ================================
export async function generateDescriptionWithAI(issue: string, severity: Severity) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return {
      success: false,
      error: "OpenAI API key not configured",
    }
  }

  const prompt = `You are a professional roofing inspector. Based on this roofing issue, generate BOTH a professional title and a technical description.

Issue (${severity} severity): ${issue}

CRITICAL REQUIREMENT: Write EXCLUSIVELY in English. Do NOT use any Spanish words, phrases, or terminology under any circumstances. The reader only understands English.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

TITLE:
[Write a concise, professional title for this issue. 5-10 words maximum. Use Title Case. Be specific and clear.]

OBSERVED CONDITION:
[Precise technical observation in English. 2-3 sentences.]

POTENTIAL IMPACT IF UNADDRESSED:
[Clear explanation of consequences in English. 2-3 sentences.]

Use professional roofing terminology in English only. No markdown. Each section must be its own paragraph separated by a blank line.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return { success: false, error: `AI error: ${err.error?.message}` }
    }

    const data = await response.json()
    let fullText = data.choices[0]?.message?.content?.trim() || ""

    const titleMatch = fullText.match(/TITLE:\s*\n(.+?)(?=\n\nOBSERVED|$)/is)
    const title = titleMatch ? titleMatch[1].trim() : ""

    // Remove title section from description
    let description = fullText.replace(/TITLE:\s*\n.+?\n\n/is, "")

    description = description
      .replace(/observed condition:/gi, "OBSERVED CONDITION:")
      .replace(/potential impact if unaddressed:/gi, "POTENTIAL IMPACT IF UNADDRESSED:")
      .replace(/\*\*/g, "")
      .replace(/(OBSERVED CONDITION:[^\n]+(?:\n[^\n]+)*?)\n+(POTENTIAL IMPACT)/gi, "$1\n\n$2")

    return { success: true, title, description }
  } catch (err) {
    console.error("[EHL] Description generation error:", err)
    return { success: false, error: "Failed to generate description" }
  }
}

// ================================
// AI-powered final notes
// ================================
export async function generateFinalNotesWithAI({
  sections,
  address,
  inspector,
  inspectorFieldNotes,
}: {
  sections: Array<{ issue: string; severity: string }>
  address: string
  inspector: string
  inspectorFieldNotes: string
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    return { success: false, error: "OpenAI API key not configured" }
  }

  const critical = sections.filter((s) => s.severity === "Critical").length
  const high = sections.filter((s) => s.severity === "High").length
  const medium = sections.filter((s) => s.severity === "Medium").length
  const low = sections.filter((s) => s.severity === "Low").length

  const prompt = `
You are a senior roofing inspector for EHL Roofing LLC synthesizing a comprehensive final report.

CRITICAL REQUIREMENT: Write EXCLUSIVELY in English. Do NOT use any Spanish words, phrases, or terminology under any circumstances. The reader only understands English.

PROPERTY: ${address}
INSPECTOR: ${inspector}

INSPECTION SUMMARY:
  - Total Issues Found: ${sections.length}
  - Critical Severity: ${critical}
  - High Severity: ${high}
  - Medium Severity: ${medium}
  - Low Severity: ${low}

INSPECTOR'S FIELD NOTES:
${inspectorFieldNotes}

YOUR TASK:
Synthesize a comprehensive final report that combines the inspector's field observations with the documented findings. The report should be informed by and supportive of the inspector's professional assessment.

STRICT FORMAT INSTRUCTIONS:
You must write EXACTLY THREE SECTIONS in this exact format. Do NOT add any other sections or text outside these three sections.

Do NOT use markdown bold symbols (**). Write section headers in ALL CAPS followed by a colon.

SECTION 1 - Header must be exactly: TECHNICAL ROOF CONDITION ASSESSMENT
[Synthesize a 2-3 sentence professional assessment that reflects the inspector's field notes while incorporating the ${sections.length} documented issues. Reference the severity breakdown naturally.]

SECTION 2 - Header must be exactly: FINDINGS:
[Synthesize the key findings by incorporating BOTH the inspector's observations AND the documented issues organized by severity (Critical, High, Medium, Low). Make this a cohesive narrative that shows how the documented issues support the inspector's assessment. 3-4 sentences maximum.]

SECTION 3 - Header must be exactly: RECOMMENDATIONS:
[Provide clear, actionable recommendations that align with the inspector's field notes while addressing the documented issues by priority. Include timeline urgency for critical/high items based on the inspector's professional judgment. 3-4 sentences maximum.]

RULES:
- Synthesize content from BOTH the inspector's field notes AND the documented findings
- Do NOT simply copy the field notes - enhance and support them with the findings data
- Do NOT use any markdown symbols (**, *, etc.)
- Do NOT add any other sections
- Do NOT add contact information, signatures, or closing statements
- Write ONLY in English
- Keep total response under 400 words
- Use plain text with section headers in ALL CAPS

Write your response now with EXACTLY these three sections that synthesize the inspector's assessment with the documented findings.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("[EHL] Final notes generation error:", err)
      return { success: false, error: `AI error: ${err.error?.message}` }
    }

    const data = await response.json()
    let notes = data.choices?.[0]?.message?.content?.trim() || ""

    notes = notes.replace(/\*\*/g, "").replace(/\*/g, "")

    return { success: true, finalNotes: notes }
  } catch (err) {
    console.error("[EHL] Final notes error:", err)
    return { success: false, error: "Failed to generate final notes" }
  }
}

// ================================
// AI-powered email (ALIGNED with final notes)
// ================================
export async function generateEmailContent({
  customerName,
  address,
  date,
  inspector,
  estimator,
  sections,
  finalNotes,
}: {
  customerName: string
  address: string
  date: string
  inspector: string
  estimator: string
  sections: Array<{ issue: string; severity: string }>
  finalNotes: string
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    console.warn("[EHL] OpenAI API key missing for email generation")
    return generateFallbackEmail(customerName, address, date, estimator, sections, finalNotes)
  }

  const urgent = sections.filter((s) => ["Critical", "High"].includes(s.severity)).length

  const prompt = `
You are writing a professional follow-up email for EHL Roofing LLC after a roof inspection.

CRITICAL REQUIREMENT: Write EXCLUSIVELY in English. Do NOT use any Spanish words, phrases, or terminology under any circumstances.

INSPECTION DETAILS:
- Customer: ${customerName || "Valued Customer"}
- Property: ${address}
- Date: ${date}
- Inspector: ${inspector}
- Total Findings: ${sections.length}
- Critical/High Issues: ${urgent}

FINAL INSPECTION REPORT RECOMMENDATIONS:
${finalNotes}

YOUR TASK:
Write a professional email that ALIGNS with the final inspection report recommendations above.

CRITICAL RULES:
1. Read the RECOMMENDATIONS section of the final notes carefully
2. If it recommends REPLACEMENT → email should mention "replacement" and urgency
3. If it recommends REPAIRS → email should mention "repairs" 
4. MATCH the urgency/timeline from the recommendations (e.g., "30-60 days", "immediate attention")
5. Your email CTA must ALIGN with the report's recommendation

EMAIL STRUCTURE:
[Opening] Thank customer for choosing EHL Roofing LLC

[Summary] Briefly mention ${sections.length} findings with ${urgent} requiring urgent attention

[Key Point] Reference the main recommendation from the inspection report (repair OR replacement - match the report exactly)

[Why EHL] Highlight:
- Licensed CA #1145092, Bonded & Insured
- 500+ Roofs Since 2019
- Bay Area's Trusted Experts
- Transparent Pricing & Drone Technology

[Call to Action] Invite them to schedule a [repair estimate OR replacement consultation - match the recommendation]. Use the urgency level from the recommendations.

[Closing] 
Contact: (415) 964-9422 or sales@ehlroofing.com

Best regards,
${estimator}
EHL Roofing LLC
Daly City, CA
sales@ehlroofing.com

TONE: Professional, helpful, expert, trustworthy. No jargon.
LENGTH: 180-220 words
OUTPUT: Write ONLY in English. Return ONLY the email body (no subject line).

EXAMPLE ALIGNMENT:
- If report says "full replacement recommended" → email says "schedule a replacement consultation"
- If report says "repairs can address issues" → email says "schedule a repair estimate"
- If report says "within 30-60 days" → email reflects this urgency
`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 350,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("[EHL] Email generation error:", err)
      return generateFallbackEmail(customerName, address, date, estimator, sections, finalNotes)
    }

    const data = await response.json()
    const body = data.choices?.[0]?.message?.content?.trim() || ""

    const subject = `Roof Inspection Report - ${address} - ${date}`
    return { success: true, subject, body }
  } catch (err) {
    console.error("[EHL] Email generation error:", err)
    return generateFallbackEmail(customerName, address, date, estimator, sections, finalNotes)
  }
}

// Fallback email generator
function generateFallbackEmail(
  customerName: string,
  address: string,
  date: string,
  estimator: string,
  sections: Array<{ issue: string; severity: string }>,
  finalNotes: string,
) {
  const urgent = sections.filter((s) => ["Critical", "High"].includes(s.severity)).length

  // Extract recommendation from finalNotes
  const isReplacement = /replacement/i.test(finalNotes)
  const actionText = isReplacement ? "replacement consultation" : "repair estimate"

  const fallback = `Dear ${customerName || "Valued Customer"},

Thank you for choosing EHL Roofing LLC for your roof inspection at ${address}. Your detailed inspection report is attached.

Our inspector identified ${sections.length} items requiring attention${urgent ? `, including ${urgent} urgent issues` : ""}. Based on our findings, we recommend scheduling a ${actionText} to address these concerns and protect your property.

Why choose EHL Roofing LLC:
• Licensed (CA #1145092), Bonded & Insured
• 500+ Roofs Completed Since 2019
• Bay Area's Trusted Roofing Experts
• Transparent Pricing & Drone Technology

Please contact us to discuss the findings and next steps:
📞 (415) 964-9422
📧 sales@ehlroofing.com

Best regards,
${estimator}
EHL Roofing LLC
Daly City, CA
sales@ehlroofing.com`

  return { success: true, subject: `Roof Inspection Report - ${address}`, body: fallback }
}

// ================================
// Audio transcription (FIXED - no npm imports)
// ================================
export async function transcribeAudioWithWhisper(audioBase64: string, language: "es" | "en" = "es") {
  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    console.error("[EHL] OpenAI API key not configured")
    return { success: false, error: "OpenAI API key not configured" }
  }

  try {
    // Remove data URL prefix if present
    const base64Data = audioBase64.includes(",") ? audioBase64.split(",")[1] : audioBase64
    const audioBuffer = Buffer.from(base64Data, "base64")

    // ✅ Use native FormData (no npm import needed in Node.js 18+)
    const formData = new FormData()
    
    // ✅ Create Blob using native Blob constructor
    const audioBlob = new Blob([audioBuffer], { type: "audio/webm" })
    
    // Append to FormData
    formData.append("file", audioBlob, "audio.webm")
    formData.append("model", "whisper-1")
    formData.append("language", language)
    formData.append("temperature", "0")

    console.log(`[EHL] Transcribing audio (language: ${language}, size: ${audioBuffer.length} bytes)`)

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    })

    if (!response.ok) {
      const err = await response.json()
      console.error("[EHL] Transcription API error:", err)
      return { success: false, error: `Transcription failed: ${err.error?.message || 'Unknown error'}` }
    }

    const data = await response.json()
    console.log("[EHL] Transcription successful:", data.text?.substring(0, 50) + "...")
    
    return { success: true, transcript: data.text }
  } catch (err) {
    console.error("[EHL] Transcription error:", err)
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Audio transcription failed" 
    }
  }
}

// ================================
// Translation (API-only, robust validation)
// ================================
export async function translateSpanishToEnglish(text: string): Promise<string> {
  if (!text?.trim()) return text

  const apiKey = process.env.OPENAI_API_KEY?.trim()
  if (!apiKey) {
    throw new Error("Translation requires OpenAI API key")
  }

  // Spanish detector
  const hasSpanishChars = /[áéíóúñ¿¡]/i.test(text)
  const hasSpanishWords =
    /\b(no|existe|falta|roto|inexistente|dañado|corrosión|tejas|techo|goteras|impermeabilización|canaleta|tapajunta|chimenea|humedad|moho|deteriorado|agrietado|desprendido|suelto|oxidado)\b/i.test(
      text,
    )

  // If clearly English already, return as-is
  if (!hasSpanishChars && !hasSpanishWords && text.length > 20) {
    return text
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional translator specializing in roofing industry terminology. 

CRITICAL RULES:
1. Translate ANY Spanish text to English
2. Use proper technical roofing terms in English
3. Output ONLY the English translation - no explanations
4. If input is already in English, return it unchanged
5. NEVER include Spanish words in your output
6. Common Spanish roofing terms:
   - tapajunta/tapa junta = ridge cap
   - tejas = shingles
   - canaleta = gutter
   - bajante = downspout
   - chimenea = chimney
   - goteras = leaks
   - humedad = moisture
   - moho = mold
   - inexistente = missing
   - dañado = damaged
   - roto = broken
   - corrosión = corrosion
   - oxidado = rusted
   - agrietado = cracked
   - deteriorado = deteriorated
   - desprendido = detached
   - suelto = loose`,
          },
          {
            role: "user",
            content: text,
          },
        ],
        max_tokens: 200,
        temperature: 0.2,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || "Unknown error"}`)
    }

    const data = await response.json()
    let translated = data.choices[0]?.message?.content?.trim() || text

    // Clean formatting
    translated = translated
      .replace(/["""]/g, "")
      .replace(/^(translation|translated text|english|output):\s*/i, "")
      .replace(/^\*+\s*/g, "")
      .replace(/\s*\*+$/g, "")
      .trim()

    // POST-TRANSLATION VALIDATION: Check for remaining Spanish
    const stillHasSpanish =
      /[áéíóúÁÉÍÓÚ]|inexistente|dañado|roto|corrosión|tejas(?!\w)|techo(?!\w)|goteras|canaleta|tapajunta|chimenea|humedad|moho/i.test(
        translated,
      )

    if (stillHasSpanish) {
      console.warn("[EHL] Spanish detected in translation, retrying with stronger prompt...")

      const retryResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You MUST translate to English. NO Spanish words allowed in output. Roofing terminology translator.",
            },
            {
              role: "user",
              content: `This text still has Spanish words. Translate EVERYTHING to English:\n\n${translated}\n\nOutput ONLY pure English, no Spanish whatsoever.`,
            },
          ],
          max_tokens: 200,
          temperature: 0.1,
        }),
      })

      if (retryResponse.ok) {
        const retryData = await retryResponse.json()
        translated =
          retryData.choices[0]?.message?.content
            ?.trim()
            .replace(/["""]/g, "")
            .replace(/^(translation|translated text|english|output):\s*/i, "")
            .trim() || translated
      }
    }

    // Final cleanup: remove remaining Spanish characters
    translated = translated
      .replace(/[áéíóúÁÉÍÓÚ]/g, (c) => {
        const map: Record<string, string> = {
          á: "a",
          é: "e",
          í: "i",
          ó: "o",
          ú: "u",
          Á: "A",
          É: "E",
          Í: "I",
          Ó: "O",
          Ú: "U",
        }
        return map[c] || c
      })
      .replace(/ñ/gi, "n")
      .replace(/[¿¡]/g, "")

    console.log("[EHL] Translation successful")
    return translated
  } catch (error) {
    console.error("[EHL] Translation error:", error)
    throw new Error("Translation failed. Please check your internet connection and try again.")
  }
}

// ================================
// Email sending
// ================================
export async function sendReportEmail({
  to,
  cc,
  subject,
  body,
  pdfBuffer,
  pdfFileName,
}: {
  to: string[]
  cc?: string[]
  subject: string
  body: string
  pdfBuffer: Buffer
  pdfFileName: string
}) {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    return { success: false, error: "Email configuration missing" }
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    return { success: false, error: "PDF is empty" }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const invalid = [...to, ...(cc || [])].filter((e) => !emailRegex.test(e.trim()))
  if (invalid.length) {
    return { success: false, error: `Invalid emails: ${invalid.join(", ")}` }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST.trim(),
      port: Number.parseInt(process.env.SMTP_PORT || "465"),
      secure: true,
      auth: {
        user: process.env.SMTP_USER.trim(),
        pass: process.env.SMTP_PASSWORD,
      },
    })

    await transporter.verify()

    const info = await transporter.sendMail({
      from: `"EHL Roofing LLC" <${process.env.SMTP_USER}>`,
      to: to.join(", "),
      cc: cc?.length ? cc.join(", ") : undefined,
      subject,
      text: body,
      html: body.replace(/\n/g, "<br>"),
      attachments: [{ filename: pdfFileName, content: pdfBuffer, contentType: "application/pdf" }],
    })

    console.log("[EHL] Email sent successfully:", info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (err) {
    console.error("[EHL] Email error:", err)
    return { success: false, error: "Failed to send email" }
  }
}

// ================================
// Baserow integration
// ================================
const BASEROW_API_URL = (process.env.BASEROW_API_URL || "https://api.baserow.io").trim()
const BASEROW_TOKEN = process.env.BASEROW_API_TOKEN
const TABLE_ID = process.env.BASEROW_TABLE_ID || "733936"

const FIELDS = {
  CUSTOMER_NAME: "field_6173181",
  CUSTOMER_EMAIL: "field_6173182",
  ADDRESS: "field_6173183",
  INSPECTION_DATE: "field_6173184",
  INSPECTOR_NAME: "field_6173185",
  ESTIMATOR_NAME: "field_6173186",
  COMPANY_NAME: "field_6173187",
  LICENSE_NUMBER: "field_6173188",
  COMPANY_LOGO_URL: "field_6173189",
  SECTIONS_JSON: "field_6173190",
  TOTAL_ISSUES: "field_6173191",
  FINAL_NOTES: "field_6173195",
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
  logo: string | null
  sections: Array<{ id: string; issue: string; title?: string; description: string; severity: string; photos: string[] }>
  finalNotes?: string
}

export async function saveInspectionToBaserow(data: InspectionData) {
  if (!BASEROW_TOKEN) return { success: false, error: "Baserow token missing" }

  if (data.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.customerEmail.trim())) {
    return { success: false, error: "Invalid customer email" }
  }

  const row = {
    [FIELDS.CUSTOMER_NAME]: data.customerName || "",
    [FIELDS.CUSTOMER_EMAIL]: data.customerEmail || "",
    [FIELDS.ADDRESS]: data.address || "",
    [FIELDS.INSPECTION_DATE]: data.date || "",
    [FIELDS.INSPECTOR_NAME]: data.inspector || "",
    [FIELDS.ESTIMATOR_NAME]: data.estimator || "",
    [FIELDS.COMPANY_NAME]: data.company || "EHL Roofing LLC",
    [FIELDS.LICENSE_NUMBER]: data.license || "CA #1145092",
    [FIELDS.COMPANY_LOGO_URL]: data.logo || "",
    [FIELDS.SECTIONS_JSON]: JSON.stringify(data.sections),
    [FIELDS.TOTAL_ISSUES]: data.sections.length.toString(),
    [FIELDS.FINAL_NOTES]: data.finalNotes || "",
  }

  try {
    const res = await fetch(`${BASEROW_API_URL}/api/database/rows/table/${TABLE_ID}/`, {
      method: "POST",
      headers: { Authorization: `Token ${BASEROW_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(row),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.detail || "Save failed")
    console.log("[EHL] Inspection saved to Baserow:", result.id)
    return { success: true, id: result.id }
  } catch (err) {
    console.error("[EHL] Baserow save error:", err)
    return { success: false, error: "Failed to save to Baserow" }
  }
}

export async function loadInspectionFromBaserow(id: number) {
  if (!BASEROW_TOKEN) return { success: false, error: "Baserow token missing" }

  try {
    const res = await fetch(`${BASEROW_API_URL}/api/database/rows/table/${TABLE_ID}/${id}/`, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
    })
    const row = await res.json()
    if (!res.ok) throw new Error("Load failed")

    const data: InspectionData = {
      company: row[FIELDS.COMPANY_NAME] || "EHL Roofing LLC",
      license: row[FIELDS.LICENSE_NUMBER] || "CA #1145092",
      customerName: row[FIELDS.CUSTOMER_NAME] || "",
      customerEmail: row[FIELDS.CUSTOMER_EMAIL] || "",
      address: row[FIELDS.ADDRESS] || "",
      date: row[FIELDS.INSPECTION_DATE] || "",
      inspector: row[FIELDS.INSPECTOR_NAME] || "",
      estimator: row[FIELDS.ESTIMATOR_NAME] || "",
      logo: row[FIELDS.COMPANY_LOGO_URL] || null,
      sections: JSON.parse(row[FIELDS.SECTIONS_JSON] || "[]"),
      finalNotes: row[FIELDS.FINAL_NOTES] || "",
    }
    return { success: true, data }
  } catch (err) {
    console.error("[EHL] Baserow load error:", err)
    return { success: false, error: "Failed to load from Baserow" }
  }
}

export async function listInspectionsFromBaserow() {
  if (!BASEROW_TOKEN) return { success: false, error: "Baserow token missing", inspections: [] }

  try {
    const res = await fetch(`${BASEROW_API_URL}/api/database/rows/table/${TABLE_ID}/?size=50`, {
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
    })
    const result = await res.json()
    if (!res.ok) throw new Error("List failed")

    const inspections = result.results.map((r: any) => ({
      id: r.id,
      address: r[FIELDS.ADDRESS] || "No address",
      date: r[FIELDS.INSPECTION_DATE] || "",
      customerName: r[FIELDS.CUSTOMER_NAME] || "",
      inspector: r[FIELDS.INSPECTOR_NAME] || "",
      totalIssues: r[FIELDS.TOTAL_ISSUES] || "0",
    }))
    return { success: true, inspections }
  } catch (err) {
    console.error("[EHL] Baserow list error:", err)
    return { success: false, error: "Failed to list inspections", inspections: [] }
  }
}

export async function deleteInspectionFromBaserow(id: number) {
  if (!BASEROW_TOKEN) return { success: false, error: "Baserow token missing" }

  try {
    const res = await fetch(`${BASEROW_API_URL}/api/database/rows/table/${TABLE_ID}/${id}/`, {
      method: "DELETE",
      headers: { Authorization: `Token ${BASEROW_TOKEN}` },
    })
    if (!res.ok) throw new Error("Delete failed")
    console.log("[EHL] Inspection deleted from Baserow:", id)
    return { success: true, message: "Deleted" }
  } catch (err) {
    console.error("[EHL] Baserow delete error:", err)
    return { success: false, error: "Failed to delete" }
  }
}
