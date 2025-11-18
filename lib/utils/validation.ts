import type { Section } from "@/lib/types"

export const validateNoSpanish = (
  sections: Section[],
  finalNotes: string
): { valid: boolean; issues: string[] } => {
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
    if (section.title && spanishDetector.test(section.title)) {
      issues.push(`Section ${index + 1} Title contains Spanish`)
    }
  })

  if (spanishDetector.test(finalNotes)) {
    issues.push("Final Notes contain Spanish")
  }

  return { valid: issues.length === 0, issues }
}

export const formatDescription = (description: string): string => {
  return description
    .replace(/OBSERVED CONDITION:\s*/i, "OBSERVED CONDITION:\n")
    .replace(/POTENTIAL IMPACT IF UNADDRESSED:\s*/i, "\n\nPOTENTIAL IMPACT IF UNADDRESSED:\n")
}
