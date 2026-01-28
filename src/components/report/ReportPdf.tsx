import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Svg,
  Defs,
  LinearGradient,
  Stop,
  Polyline,
  Line,
  Image,
  Rect,
  Circle,
  Path,
} from '@react-pdf/renderer'
import type { PreparedReportData } from '../../services/reports'
import cybersentryLogo from '../../assets/cybersentry.png'
import onecomLogo from '../../assets/onecom.png'
import hostedLogo from '../../assets/hosted.png'

interface Props {
  brandName: string
  brandColor: string
  data: PreparedReportData
  logo?: 'cybersentry' | 'onecom' | 'cybersentry-x-hosted'
}

// Helper function to get emoji for a heading based on keywords
function getHeadingEmoji(text: string): string {
  const lowerText = text.toLowerCase()

  // Risk and Security related
  if (lowerText.includes('risk trend') || lowerText.includes('trend analysis'))
    return '📊'
  if (lowerText.includes('risk') && lowerText.includes('assessment'))
    return '🔍'
  if (lowerText.includes('risk') && lowerText.includes('rating')) return '⚠️'
  if (lowerText.includes('risk')) return '⚠️'
  if (
    lowerText.includes('vulnerability') ||
    lowerText.includes('vulnerabilities')
  )
    return '🔓'
  if (lowerText.includes('security') && lowerText.includes('posture'))
    return '🛡️'
  if (lowerText.includes('security')) return '🔐'
  if (lowerText.includes('threat')) return '🎯'
  if (lowerText.includes('attack')) return '⚔️'

  // Findings and Analysis
  if (lowerText.includes('finding') || lowerText.includes('findings'))
    return '🔎'
  if (lowerText.includes('summary') || lowerText.includes('executive'))
    return '📋'
  if (lowerText.includes('overview')) return '👁️'
  if (lowerText.includes('analysis')) return '📈'
  if (lowerText.includes('assessment')) return '📝'

  // Remediation and Recommendations
  if (lowerText.includes('remediation') || lowerText.includes('recommendation'))
    return '🔧'
  if (lowerText.includes('solution')) return '💡'
  if (lowerText.includes('mitigation')) return '🛠️'
  if (lowerText.includes('fix') || lowerText.includes('fixes')) return '✅'

  // Implementation and Roadmap
  if (lowerText.includes('roadmap') || lowerText.includes('implementation'))
    return '🗺️'
  if (lowerText.includes('priority') && lowerText.includes('matrix'))
    return '📊'
  if (lowerText.includes('timeline')) return '⏱️'
  if (lowerText.includes('schedule')) return '📅'

  // Methodology and Scope
  if (lowerText.includes('methodology') || lowerText.includes('scope'))
    return '📐'
  if (lowerText.includes('testing') || lowerText.includes('test')) return '🧪'
  if (lowerText.includes('approach')) return '🎯'

  // Technical Details
  if (lowerText.includes('technical') || lowerText.includes('details'))
    return '⚙️'
  if (lowerText.includes('evidence') || lowerText.includes('proof')) return '📸'
  if (lowerText.includes('code') || lowerText.includes('script')) return '💻'
  if (lowerText.includes('configuration')) return '⚙️'

  // Compliance and Standards
  if (lowerText.includes('compliance')) return '✅'
  if (lowerText.includes('standard') || lowerText.includes('framework'))
    return '📚'
  if (lowerText.includes('regulation')) return '📜'

  // Impact and Business
  if (lowerText.includes('impact') || lowerText.includes('business'))
    return '💼'
  if (lowerText.includes('severity')) return '🔴'
  if (lowerText.includes('priority')) return '⭐'

  // Success and Metrics
  if (lowerText.includes('success') || lowerText.includes('metric')) return '📊'
  if (lowerText.includes('goal') || lowerText.includes('target')) return '🎯'

  // References and Glossary
  if (lowerText.includes('reference') || lowerText.includes('cve')) return '📖'
  if (lowerText.includes('glossary')) return '📚'
  if (lowerText.includes('appendix')) return '📎'

  // Table of Contents
  if (lowerText.includes('table of contents') || lowerText.includes('contents'))
    return '📑'

  // Confidentiality
  if (
    lowerText.includes('confidentiality') ||
    lowerText.includes('confidential')
  )
    return '🔒'

  // Default emojis for numbered sections
  if (lowerText.match(/^\d+\./)) {
    const num = parseInt(lowerText.match(/^(\d+)/)?.[1] || '0')
    const emojis = ['📋', '🔍', '📊', '⚠️', '🔧', '📈', '📚', '📎']
    return emojis[num % emojis.length] || '📄'
  }

  return '📄' // Default emoji
}

// Helper function to check if a line is a table row
function isTableRow(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.endsWith('|')
}

// Helper function to check if a line is a code fence
function isCodeFence(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('```')
}

// Helper function to parse table row
function parseTableRow(line: string): string[] {
  const trimmed = line.trim()
  // Remove leading and trailing pipes
  const content = trimmed.substring(1, trimmed.length - 1)
  // Split by pipe and trim each cell
  return content.split('|').map((cell) => cell.trim())
}

// Helper function to check if a line is a table separator
function isTableSeparator(line: string): boolean {
  const trimmed = line.trim()
  // Table separator looks like: |---|---|---|
  return (
    trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('---')
  )
}

// Helper function to parse inline bold text and return segments
function parseInlineBold(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = []
  let currentIndex = 0
  const regex = /\*\*([^*]+)\*\*/g
  let match

  while ((match = regex.exec(text)) !== null) {
    // Add text before the bold marker
    if (match.index > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, match.index),
        bold: false,
      })
    }
    // Add the bold text (without markers)
    if (match[1]) {
      segments.push({
        text: match[1],
        bold: true,
      })
    }
    currentIndex = match.index + match[0].length
  }

  // Add remaining text after last bold marker
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      bold: false,
    })
  }

  // If no bold markers found, return the whole text as non-bold
  if (segments.length === 0) {
    segments.push({ text: text.replace(/\*\*/g, ''), bold: false })
  }

  return segments
}

// Helper function to process markdown content - remove hashtags, bold markers, and format headings
function processMarkdownLine(line: string): {
  isHeading: boolean
  level: number
  text: string
  isBold: boolean
  isBullet: boolean
  isTable: boolean
  isCodeFence: boolean
  codeLanguage?: string
  hasInlineBold?: boolean
} {
  const trimmed = line.trim()

  // Check for code fence
  if (isCodeFence(trimmed)) {
    const language = trimmed.substring(3).trim()
    return {
      isHeading: false,
      level: 0,
      text: trimmed,
      isBold: false,
      isBullet: false,
      isTable: false,
      isCodeFence: true,
      codeLanguage: language || undefined,
      hasInlineBold: false,
    }
  }

  // Check for table row
  if (isTableRow(trimmed)) {
    return {
      isHeading: false,
      level: 0,
      text: trimmed,
      isBold: false,
      isBullet: false,
      isTable: true,
      isCodeFence: false,
      hasInlineBold: false,
    }
  }

  // Check for bullet points first
  const isBullet =
    trimmed.startsWith('- ') ||
    trimmed.startsWith('* ') ||
    trimmed.startsWith('• ')
  const bulletText = isBullet ? trimmed.substring(2).trim() : trimmed

  // Check for headings (all levels)
  let headingLevel = 0
  let headingText = bulletText
  if (headingText.startsWith('###### ')) {
    headingLevel = 6
    headingText = headingText.substring(7).trim()
  } else if (headingText.startsWith('##### ')) {
    headingLevel = 5
    headingText = headingText.substring(6).trim()
  } else if (headingText.startsWith('#### ')) {
    headingLevel = 4
    headingText = headingText.substring(5).trim()
  } else if (headingText.startsWith('### ')) {
    headingLevel = 3
    headingText = headingText.substring(4).trim()
  } else if (headingText.startsWith('## ')) {
    headingLevel = 2
    headingText = headingText.substring(3).trim()
  } else if (headingText.startsWith('# ')) {
    headingLevel = 1
    headingText = headingText.substring(2).trim()
  }

  // Check if original text had ** markers (for bold formatting in regular text)
  const hasBold = line.includes('**')
  const hasInlineBold = /\*\*[^*]+\*\*/.test(headingText)

  // Remove ** bold markers from text (both opening and closing) for headings
  const cleanText = headingText.replace(/\*\*/g, '').trim()

  if (headingLevel > 0) {
    return {
      isHeading: true,
      level: headingLevel,
      text: cleanText,
      isBold: false,
      isBullet: false,
      isTable: false,
      isCodeFence: false,
      hasInlineBold: false,
    }
  }

  return {
    isHeading: false,
    level: 0,
    text: headingText, // Keep original text with markers for inline bold parsing
    isBold: hasBold && !hasInlineBold, // Only set isBold if entire line is bold, not inline
    isBullet: isBullet,
    isTable: false,
    isCodeFence: false,
    hasInlineBold: hasInlineBold,
  }
}

const styles = StyleSheet.create({
  page: {
    padding: 50,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#ffffff',
    flexDirection: 'column',
    fontFamily: 'Helvetica',
  },
  contentPage: {
    padding: 50,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#F8F8FC',
    flexDirection: 'column',
    fontFamily: 'Helvetica',
  },
  tocPage: {
    padding: 50,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#F8F8FC',
    fontFamily: 'Helvetica',
    flexDirection: 'column',
  },
  confidentialityPage: {
    padding: 50,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#F8F8FC',
    flexDirection: 'column',
    fontFamily: 'Helvetica',
  },
  confidentialityTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 8,
    marginTop: 20,
    textAlign: 'left',
  },
  confidentialitySubtitle: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'left',
  },
  confidentialityBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 20,
    marginBottom: 20,
  },
  confidentialityBoxUrgent: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 20,
    marginBottom: 20,
  },
  confidentialityBoxTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 12,
    textAlign: 'left',
  },
  confidentialityBoxTitleUrgent: {
    fontSize: 16,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'left',
  },
  confidentialityBoxText: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    lineHeight: 1.7,
    color: '#374151',
    textAlign: 'left',
  },
  confidentialityBoxTextBold: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    lineHeight: 1.7,
    color: '#111827',
    textAlign: 'left',
  },
  confidentialityDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
    marginTop: 4,
  },
  confidentialityRiskBadge: {
    backgroundColor: '#dc2626',
    borderRadius: 20,
    paddingLeft: 16,
    paddingRight: 16,
    paddingTop: 8,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  confidentialityRiskBadgeText: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
  },
  // Card/Box styles for Roadmap and Priority Matrix
  roadmapCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 20,
    marginBottom: 16,
    flex: 1,
    minHeight: 140,
  },
  roadmapCardRow: {
    flexDirection: 'row',
    marginBottom: 24,
    marginTop: 12,
    justifyContent: 'space-between',
    gap: 0,
  },
  roadmapCardTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
    textAlign: 'left',
    letterSpacing: 0.1,
  },
  roadmapCardItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  roadmapCheckmark: {
    fontSize: 18,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#16a34a',
    marginRight: 12,
    width: 22,
    lineHeight: 1.5,
  },
  roadmapCardText: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    lineHeight: 1.6,
    flex: 1,
  },
  roadmapSectionTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 24,
    marginBottom: 12,
    textAlign: 'left',
  },
  roadmapLargeCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 20,
    marginBottom: 20,
    marginTop: 12,
  },
  priorityMatrixCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 18,
    marginBottom: 16,
    marginTop: 8,
  },
  priorityMatrixTitle: {
    fontSize: 13.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: 0.1,
  },
  priorityMatrixText: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    lineHeight: 1.8,
    marginBottom: 8,
    textAlign: 'left',
  },
  tocTitle: {
    fontSize: 28,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 30,
    marginTop: 20,
  },
  tocItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 8,
    paddingLeft: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  tocItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
  },
  tocItemText: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    flex: 1,
    lineHeight: 1.6,
  },
  tocItemMainText: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    flex: 1,
    lineHeight: 1.6,
  },
  tocItemPage: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
    marginLeft: 20,
  },
  tocItemMainPage: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
    marginLeft: 20,
  },
  brandBar: { height: 6, backgroundColor: '#22d3ee', marginBottom: 24 },
  title: {
    fontSize: 28,
    marginBottom: 8,
    fontWeight: 700,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    fontFamily: 'Helvetica',
    fontWeight: 400,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    marginTop: 28,
    marginBottom: 24,
    color: '#111827',
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
    paddingBottom: 14,
    letterSpacing: -0.3,
  },
  paragraph: {
    fontFamily: 'Helvetica',
    fontWeight: 400,
    lineHeight: 1.8,
    marginBottom: 12,
    color: '#1f2937',
    fontSize: 11,
    textAlign: 'left',
  },
  bulletPoint: {
    fontFamily: 'Helvetica',
    fontWeight: 400,
    lineHeight: 1.8,
    marginBottom: 8,
    color: '#1f2937',
    fontSize: 11,
    marginLeft: 16,
    textAlign: 'left',
  },
  badgeRow: { display: 'flex', flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: {
    fontSize: 10,
    backgroundColor: '#f3f4f6',
    color: '#374151',
    padding: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    fontFamily: 'Helvetica',
    fontWeight: 400,
  },
  // Pill/Badge styles for Severity and Priority - This style is called a "Badge" or "Pill" component
  // It features rounded corners, colored background with opacity, and matching border
  sevCritical: {
    backgroundColor: 'rgba(84, 8, 30, 0.12)', // Deep maroon with lighter opacity
    color: '#54081E',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12, // More refined pill shape
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Helvetica',
    borderWidth: 1,
    borderColor: '#54081E', // Maroon border
    borderStyle: 'solid',
    textTransform: 'capitalize',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sevInformational: {
    backgroundColor: 'rgba(32, 172, 232, 0.16)', // Sky blue with lighter opacity
    color: '#38bdf8',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12,
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Helvetica',
    borderWidth: 1,
    borderColor: '#38bdf8',
    borderStyle: 'solid',
    textTransform: 'capitalize',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sevHigh: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)', // Red with opacity
    color: '#dc2626',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12, // More refined pill shape
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Helvetica',
    borderWidth: 1,
    borderColor: '#dc2626', // Red border
    borderStyle: 'solid',
    textTransform: 'capitalize',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sevMedium: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)', // Yellow with lighter opacity
    color: '#ca8a04',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12, // More refined pill shape
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Helvetica',
    borderWidth: 1,
    borderColor: '#ca8a04', // Yellow border
    borderStyle: 'solid',
    textTransform: 'capitalize',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sevLow: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)', // Green with lighter opacity
    color: '#16a34a',
    paddingTop: 4,
    paddingBottom: 4,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 12, // More refined pill shape
    fontSize: 10,
    fontWeight: 700,
    fontFamily: 'Helvetica',
    borderWidth: 1,
    borderColor: '#16a34a', // Green border
    borderStyle: 'solid',
    textTransform: 'capitalize',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sevCard: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
  },
  sevCardCritical: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  sevCardHigh: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
  sevCardMedium: { backgroundColor: '#fffbeb', borderColor: '#fef08a' },
  sevCardLow: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  grid: { display: 'flex', flexDirection: 'row', gap: 12, marginTop: 12 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#f9fafb',
  },
  scoreCard: {
    borderWidth: 2,
    borderColor: '#22d3ee',
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#f0fdfa',
  },
  scoreValue: {
    fontSize: 42,
    fontWeight: 700,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  fileSection: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  fileTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: '#0891b2',
    marginBottom: 8,
    fontFamily: 'Helvetica',
  },
  fileContent: {
    fontSize: 13,
    lineHeight: 1.85,
    color: '#374151',
    fontFamily: 'Helvetica',
    fontWeight: 400,
  },
  // Main headings (H1, H2, H3) - Helvetica Bold 700
  heading1: {
    fontSize: 20,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 24,
    marginBottom: 16,
    letterSpacing: -0.2,
    lineHeight: 1.3,
  },
  heading2: {
    fontSize: 18,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 22,
    marginBottom: 14,
    letterSpacing: -0.15,
    lineHeight: 1.3,
  },
  heading3: {
    fontSize: 16,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 20,
    marginBottom: 12,
    letterSpacing: -0.1,
    lineHeight: 1.35,
  },
  // Subheadings (H4, H5, H6) - Helvetica Bold for consistency
  heading4: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 16,
    marginBottom: 12,
    lineHeight: 1.4,
  },
  heading5: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 14,
    marginBottom: 10,
    lineHeight: 1.4,
  },
  heading6: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginTop: 12,
    marginBottom: 10,
    lineHeight: 1.45,
  },
  boldText: { fontWeight: 700, color: '#111827', fontFamily: 'Helvetica' }, // Bold text styling
  // Table styles - Clean and professional with dark header
  table: {
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderStyle: 'solid',
    width: '100%',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#4b5563',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    alignItems: 'stretch',
    width: '100%',
  },
  tableCell: {
    flex: 1,
    padding: 10,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#111827',
    lineHeight: 1.6,
    borderRightWidth: 1,
    borderRightColor: '#9ca3af',
    borderRightStyle: 'solid',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    backgroundColor: '#ffffff',
    minWidth: 100,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 10,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#ffffff',
    backgroundColor: '#4b5563',
    borderRightWidth: 1,
    borderRightColor: '#6b7280',
    borderRightStyle: 'solid',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    minWidth: 100,
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
  },
  // Code block styles - Beautiful terminal-like appearance
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderWidth: 1,
    borderColor: '#3a3a3a',
    borderStyle: 'solid',
    borderRadius: 4,
    padding: 14,
    paddingTop: 12,
    paddingBottom: 12,
    marginTop: 12,
    marginBottom: 16,
    fontFamily: 'Courier',
  },
  codeText: {
    fontSize: 10,
    fontFamily: 'Courier',
    color: '#00ff00',
    lineHeight: 1.6,
    letterSpacing: 0.3,
  },
  codeLine: {
    marginBottom: 3,
  },
  // Risk calculation box - Ultra modern grey background
  riskCalculationBox: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 6,
    padding: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  riskCalculationTitle: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 12,
    letterSpacing: -0.1,
  },
  riskCalculationText: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    lineHeight: 1.7,
    marginBottom: 8,
  },
  coverPage: {
    padding: 0,
    fontSize: 13,
    color: '#1f2937',
    backgroundColor: '#F8F8FC',
    fontFamily: 'Helvetica',
    position: 'relative',
  },
  coverTopBar: {
    height: 3,
    background: 'linear-gradient(90deg, #6E2CFA 0%, #8A53FF 50%, #C08BFF 100%)',
    marginBottom: 0,
  },
  coverHeader: {
    padding: 50,
    paddingTop: 45,
    paddingBottom: 0,
    marginBottom: 80,
  },
  cybersentryLogo: { width: 150, height: 30 },
  onecomLogo: { width: 230, height: 30 },
  hostedLogo: { width: 115, height: 30 },
  multiplicationSign: {
    fontSize: 20,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#000000',
    lineHeight: 1.3,
  },
  multiplicationSignContainer: {
    height: 26, // Match logo height
    justifyContent: 'center',
    alignItems: 'center',
    display: 'flex',
  },
  combinedLogoContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  coverContentWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverDatePill: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'solid',
    paddingLeft: 28,
    paddingRight: 28,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 40,
    alignSelf: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  coverDateText: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#1e293b',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  coverTitleContainer: {
    alignItems: 'center',
    marginBottom: 45,
  },
  coverMainTitle: {
    fontSize: 42,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#1e293b',
    textAlign: 'center',
    lineHeight: 1.2,
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  coverSubtitle: {
    fontSize: 17,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#64748b',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  coverAccentLine: {
    width: 200,
    height: 4,
    alignSelf: 'center',
    marginTop: 35,
    borderRadius: 3,
  },
  coverAccentLineGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 3,
  },
  coverFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  coverFooterDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginBottom: 0,
  },
  coverFooterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 50,
    paddingTop: 28,
    paddingBottom: 32,
  },
  coverFooterText: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#64748b',
    letterSpacing: 0.2,
  },
  coverDecorativeCircle: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    borderWidth: 1,
    borderColor: '#f3e8ff',
    borderStyle: 'solid',
    opacity: 0.2,
  },
  coverDecorativeCircle2: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: '#faf5ff',
    borderStyle: 'solid',
    opacity: 0.15,
  },
  coverDecorativeCircle3: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 1,
    borderColor: '#f3e8ff',
    borderStyle: 'solid',
    opacity: 0.18,
  },
  coverBackgroundMesh: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 300,
    height: 300,
    opacity: 0.03,
  },
  contentFooter: {
    position: 'absolute',
    bottom: 30,
    left: 50,
    right: 50,
  },
  contentFooterDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginBottom: 12,
  },
  contentFooterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 20,
  },
  contentFooterText: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
    flex: 1,
    lineHeight: 1.4,
  },
  pageNumber: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
    marginLeft: 20,
  },
  graphBarContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 200,
    marginTop: 8,
    marginBottom: 8,
    paddingBottom: 20,
  },
  graphBar: {
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  graphBarFill: {
    width: '100%',
    backgroundColor: '#dc2626',
    borderRadius: 4,
    marginBottom: 8,
  },
  graphBarLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 600,
    color: '#111827',
    textAlign: 'center',
  },
  graphBarValue: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    textAlign: 'center',
    marginTop: 4,
  },
})

// Severity Trend Graph Component
export function ReportPdf({
  brandName,
  brandColor,
  data,
  logo = 'cybersentry',
}: Props) {
  const selectedLogo = logo === 'onecom' ? onecomLogo : cybersentryLogo
  const logoStyle =
    logo === 'onecom' ? styles.onecomLogo : styles.cybersentryLogo

  // Extract TOC section if exists
  const tocSection = data.sections.find((s) =>
    s.title.toLowerCase().includes('table of contents')
  )
  const contentSections = data.sections.filter(
    (s) => 
      !s.title.toLowerCase().includes('table of contents') &&
      !s.title.toLowerCase().includes('findings register') &&
      !s.content.toLowerCase().includes('findings register (internal') &&
      !s.content.toLowerCase().includes('findings register - internal')
  )

  const renderLogo = () => {
    if (logo === 'cybersentry-x-hosted') {
      return (
        <View style={styles.combinedLogoContainer}>
          <Image src={cybersentryLogo} style={styles.cybersentryLogo} />
          <View style={styles.multiplicationSignContainer}>
            <Text style={styles.multiplicationSign}>×</Text>
          </View>
          <Image src={hostedLogo} style={styles.hostedLogo} />
        </View>
      )
    }
    return <Image src={selectedLogo} style={logoStyle} />
  }

  return (
    <Document>
      {/* COVER PAGE - Premium Modern Design */}
      <Page size="A4" style={styles.coverPage}>
        {/* Top Gradient Bar */}
        <View style={styles.coverTopBar} />

        {/* Decorative Background Elements */}
        <View
          style={[styles.coverDecorativeCircle, { top: -120, right: -160 }]}
        />
        <View
          style={[styles.coverDecorativeCircle2, { bottom: -220, left: -220 }]}
        />
        <View
          style={[styles.coverDecorativeCircle3, { top: 200, left: -80 }]}
        />

        {/* Background Tech Mesh (subtle) */}
        <View style={styles.coverBackgroundMesh}>
          <Svg width="300" height="300" viewBox="0 0 300 300">
            <Line
              x1="0"
              y1="50"
              x2="300"
              y2="50"
              stroke="#9C6CFF"
              strokeWidth="0.5"
              opacity="0.15"
            />
            <Line
              x1="0"
              y1="100"
              x2="300"
              y2="100"
              stroke="#9C6CFF"
              strokeWidth="0.5"
              opacity="0.15"
            />
            <Line
              x1="50"
              y1="0"
              x2="50"
              y2="300"
              stroke="#9C6CFF"
              strokeWidth="0.5"
              opacity="0.15"
            />
            <Line
              x1="100"
              y1="0"
              x2="100"
              y2="300"
              stroke="#9C6CFF"
              strokeWidth="0.5"
              opacity="0.15"
            />
          </Svg>
        </View>

        {/* Header with Logo - Top Left */}
        <View style={styles.coverHeader}>{renderLogo()}</View>

        {/* Main Content - Centered */}
        <View style={styles.coverContentWrapper}>
          {/* Date Pill - Glassmorphism Style */}
          <View style={styles.coverDatePill}>
            <Text style={styles.coverDateText}>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Main Title */}
          <View style={styles.coverTitleContainer}>
            <Text style={styles.coverMainTitle}>
              {data.pentestType === 'aggressive'
                ? 'Aggressive Penetration Test Report'
                : 'Vulnerability Scan Report'}
            </Text>
            <Text style={styles.coverSubtitle}>For {data.domain}</Text>
          </View>

          {/* Gradient Accent Line with Glow */}
          <View style={styles.coverAccentLine}>
            <Svg width="200" height="4" viewBox="0 0 200 4">
              <Defs>
                <LinearGradient
                  id="lineGradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <Stop offset="0%" stopColor="#e9d5ff" stopOpacity="0.3" />
                  <Stop offset="30%" stopColor="#c084fc" stopOpacity="0.8" />
                  <Stop offset="50%" stopColor="#a855f7" stopOpacity="1" />
                  <Stop offset="70%" stopColor="#c084fc" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#e9d5ff" stopOpacity="0.3" />
                </LinearGradient>
              </Defs>
              <Line
                x1="0"
                y1="2"
                x2="200"
                y2="2"
                stroke="url(#lineGradient)"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </Svg>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.coverFooter}>
          <View style={styles.coverFooterDivider} />
          <View style={styles.coverFooterContent}>
            <Text style={styles.coverFooterText}>
              Confidential & Proprietary
            </Text>
            <Text style={styles.coverFooterText}>
              {logo === 'onecom'
                ? 'Onecom™'
                : logo === 'cybersentry-x-hosted'
                ? ''
                : 'CyberSentry™'}
            </Text>
          </View>
        </View>
      </Page>

      {/* TABLE OF CONTENTS PAGE - Dynamic from AI */}
      {tocSection && (
        <Page size="A4" style={styles.tocPage}>
          <Text style={styles.tocTitle}>Table of Contents</Text>

          {/* Parse and render TOC from AI content */}
          <View wrap>
            {(() => {
              const tocLines = tocSection.content.split('\n')
              const renderedItems = tocLines.map((line, idx) => {
              const trimmed = line.trim()
              if (!trimmed || trimmed.startsWith('#') || trimmed === '')
                return null

              // More flexible parsing - handle various formats
              // Check for main sections (numbered like "1.", "1 ", or "Appendices")
              const isMainSection =
                trimmed.match(/^[-•*]?\s*\d+\.\s/) ||
                trimmed.match(/^[-•*]?\s*\d+\s/) ||
                trimmed.match(/^[-•*]?\s*Appendices/i) ||
                trimmed.match(/^[-•*]?\s*[A-Z][^a-z]*$/i) // All caps main sections

              // Check for subsections (indented or numbered like "1.1", "1.2", etc.)
              const isSubSection =
                trimmed.match(/^\s{2,}[-•*]/) || // Indented with spaces
                trimmed.match(/^[-•*]?\s*\d+\.\d+/) || // Numbered like 1.1, 1.2
                trimmed.match(/^[-•*]?\s*\d+\.\d+\.\d+/) // Numbered like 1.1.1

              // Extract text and page number - handle various formats
              const pageMatch = trimmed.match(/[-–—]\s*(?:Page\s+)?(\d+)$/i) ||
                trimmed.match(/\s+(\d+)$/) // Just a number at the end
              const pageNum = pageMatch ? pageMatch[1] : ''
              
              // Extract text - remove bullets, page numbers, and clean up
              let text = trimmed
                .replace(/[-–—]\s*(?:Page\s+)?\d+$/i, '') // Remove page numbers
                .replace(/\s+\d+$/, '') // Remove trailing numbers
                .replace(/^[-•*]\s*/, '') // Remove leading bullets
                .replace(/^\s+/, '') // Remove leading spaces
                .trim()

              // If text starts with a number pattern, keep it
              if (!text.match(/^\d+\./)) {
                text = text.replace(/^\d+\s+/, '') // Remove leading number if not in pattern
              }

              if (!text || text.length < 2) return null

              // Determine if it's a main section or subsection
              // Main sections typically start with single digit or are all caps
              const looksLikeMainSection = 
                isMainSection || 
                text.match(/^\d+\.\s+[A-Z]/) || // "1. Title"
                (!isSubSection && text.length > 0)

              if (looksLikeMainSection && !isSubSection) {
                return (
                  <View key={`toc-${idx}`} style={styles.tocItemMain} wrap>
                    <Text style={styles.tocItemMainText} wrap>{text}</Text>
                    {pageNum && (
                      <Text style={styles.tocItemMainPage} wrap>{pageNum}</Text>
                    )}
                  </View>
                )
              } else {
                return (
                  <View key={`toc-${idx}`} style={styles.tocItem} wrap>
                    <Text style={styles.tocItemText} wrap>{text}</Text>
                    {pageNum && <Text style={styles.tocItemPage} wrap>{pageNum}</Text>}
                  </View>
                )
              }
              return null
            }).filter(Boolean)

            // If no items were rendered, show a message
            if (renderedItems.length === 0) {
              return (
                <View wrap>
                  <Text style={styles.paragraph} wrap>
                    Table of contents will be generated automatically based on report sections.
                  </Text>
                </View>
              )
            }

            return renderedItems
            })()}
          </View>

          {/* Footer with beautiful page number */}
          <View style={styles.contentFooter} fixed>
            <View style={styles.contentFooterDivider} />
            <View style={styles.contentFooterContent}>
              <Text style={styles.contentFooterText}>
                {data.pentestType === 'aggressive'
                  ? 'AI Penetration Test Report'
                  : 'Vulnerability Scan Report'}{' '}
                {data.domain} -{' '}
                {new Date().toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </Text>
              <Text style={styles.pageNumber}>2</Text>
            </View>
          </View>
        </Page>
      )}

      {/* CONFIDENTIALITY STATEMENT PAGE */}
      <Page size="A4" style={styles.confidentialityPage}>
        <Text style={styles.confidentialityTitle}>
          Confidentiality Statement
        </Text>
        <Text style={styles.confidentialitySubtitle}>
          Information handling and data protection guidelines
        </Text>

        {/* Summary Box */}
        <View style={styles.confidentialityBox}>
          <Text style={styles.confidentialityBoxTitle}>
            CONFIDENTIALITY OVERVIEW
          </Text>
          <View style={styles.confidentialityDivider} />
          <Text style={styles.confidentialityBoxText}>
            This{' '}
            {data.pentestType === 'aggressive'
              ? 'penetration test'
              : 'vulnerability scan'}{' '}
            report has been prepared for the exclusive use of{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            . The report contains security information, including identified
            observations, system configurations, and detailed remediation
            recommendations. All information contained herein is considered
            confidential and proprietary to{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            .
          </Text>
        </View>

        {/* Report Purpose Box */}
        <View style={styles.confidentialityBox}>
          <Text style={styles.confidentialityBoxTitle}>
            REPORT PURPOSE AND USAGE
          </Text>
          <View style={styles.confidentialityDivider} />
          <Text style={styles.confidentialityBoxText}>
            This{' '}
            {data.pentestType === 'aggressive'
              ? 'comprehensive penetration test'
              : 'vulnerability scan'}{' '}
            report is designed to assist{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>{' '}
            in understanding their security posture, identifying
            {data.pentestType === 'aggressive'
              ? ' vulnerabilities'
              : ' potential security exposures'}
            , and prioritizing remediation efforts. The report includes
            actionable recommendations tailored to{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            's specific environment, risk tolerance, and business requirements.
            The findings and recommendations are based on industry best
            practices, security frameworks, and{' '}
            {data.pentestType === 'aggressive'
              ? 'real-world attack scenarios'
              : 'external security assessment methodologies'}
            relevant to{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            's infrastructure.
          </Text>
        </View>

        {/* Footer */}
        <View style={styles.contentFooter} fixed>
          <View style={styles.contentFooterDivider} />
          <View style={styles.contentFooterContent}>
            <Text style={styles.contentFooterText}>
              {data.pentestType === 'aggressive'
                ? 'AI Penetration Test Report'
                : 'Vulnerability Scan Report'}{' '}
              {data.domain} -{' '}
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.pageNumber}>3</Text>
          </View>
        </View>
      </Page>

      {/* AI-GENERATED CONTENT PAGES - All sections flow together and share pages naturally */}
      <Page size="A4" style={styles.contentPage} wrap>
        <View wrap>
          {contentSections.map((s, sectionIndex) => {
            const contentLines = String(s.content).split('\n')

            // Process content to identify tables, code blocks, and risk calculation boxes
            const processedContent: Array<{
              type: 'text' | 'table' | 'code' | 'pagebreak' | 'riskCalculation'
              content: any
              key: string
            }> = []

            let i = 0
            let inCodeBlock = false
            let codeLines: string[] = []
            let codeLanguage = ''
            let inRiskCalculation = false
            let riskCalcEndIndex = -1

            while (i < contentLines.length) {
              const line = contentLines[i]
              if (!line) {
                i++
                continue
              }

              const processed = processMarkdownLine(line)

              // Handle code blocks
              if (processed.isCodeFence) {
                if (!inCodeBlock) {
                  // Start of code block
                  inCodeBlock = true
                  codeLanguage = processed.codeLanguage || ''
                  codeLines = []
                } else {
                  // End of code block
                  inCodeBlock = false
                  processedContent.push({
                    type: 'code',
                    content: codeLines,
                    key: `${s.key}-code-${i}`,
                  })
                  codeLines = []
                }
                i++
                continue
              }

              if (inCodeBlock) {
                codeLines.push(line)
                i++
                continue
              }

              // Check if we're still inside a risk calculation section
              if (inRiskCalculation && i <= riskCalcEndIndex) {
                // Skip processing lines that are part of risk calculation
                i++
                continue
              } else if (i > riskCalcEndIndex) {
                inRiskCalculation = false
              }

              // Handle tables - skip if inside risk calculation
              if (
                processed.isTable &&
                !isTableSeparator(line) &&
                !inRiskCalculation
              ) {
                const tableRows: string[][] = []
                let tableStart = i

                // Collect all table rows
                while (i < contentLines.length) {
                  const currentLine = contentLines[i]
                  if (!currentLine || !isTableRow(currentLine)) break

                  if (!isTableSeparator(currentLine)) {
                    tableRows.push(parseTableRow(currentLine))
                  }
                  i++
                }

                if (tableRows.length > 0) {
                  processedContent.push({
                    type: 'table',
                    content: tableRows,
                    key: `${s.key}-table-${tableStart}`,
                  })
                }
                continue
              }

              // Check if this is section 1.2 heading - add page break before it
              if (processed.isHeading && processed.text) {
                const isSection12 =
                  processed.text.trim().match(/^1\.2\s/i) ||
                  processed.text.trim().match(/^1\.2\s*Key\s*Findings/i)
                if (isSection12) {
                  // Add page break marker before section 1.2
                  processedContent.push({
                    type: 'pagebreak',
                    content: null,
                    key: `${s.key}-pagebreak-${i}`,
                  })
                }
              }

              // Check if this is a risk calculation section
              const isRiskCalculation = line
                .trim()
                .match(/^\*\*Risk Rating Calculation:\*\*/i)
              if (isRiskCalculation) {
                // Collect all lines until next heading or empty section, including the table
                const riskCalcLines: string[] = [line]
                let j = i + 1
                let foundTable = false
                while (j < contentLines.length) {
                  const nextLine = contentLines[j]
                  if (!nextLine || nextLine.trim() === '') {
                    // If we found a table, stop after it ends
                    const prevLine = contentLines[j - 1]
                    if (foundTable && prevLine && !isTableRow(prevLine)) break
                    // Otherwise continue collecting
                    if (!foundTable && nextLine) {
                      riskCalcLines.push(nextLine)
                      j++
                      continue
                    }
                    break
                  }
                  const nextProcessed = processMarkdownLine(nextLine)
                  // Stop at next heading (level 3 or higher) or section break
                  if (nextProcessed.isHeading && nextProcessed.level <= 3) break
                  // Check if this is a table row
                  if (isTableRow(nextLine.trim())) {
                    foundTable = true
                  }
                  // Stop if we hit another risk calculation title
                  if (
                    nextLine
                      .trim()
                      .match(/^\*\*Risk (Rating|Score) Calculation:\*\*/i) &&
                    j > i + 1
                  )
                    break
                  riskCalcLines.push(nextLine)
                  j++
                }

                if (riskCalcLines.length > 0) {
                  processedContent.push({
                    type: 'riskCalculation',
                    content: riskCalcLines,
                    key: `${s.key}-riskcalc-${i}`,
                  })
                  // Mark that we're in a risk calculation section
                  inRiskCalculation = true
                  riskCalcEndIndex = j - 1
                  i = j
                  continue
                }
              }

              // Regular text content
              processedContent.push({
                type: 'text',
                content: line,
                key: `${s.key}-${i}`,
              })
              i++
            }

            // Check if this is a roadmap or priority matrix section (case-insensitive, flexible matching)
            const titleLower = s.title.toLowerCase()
            const isRoadmapSection =
              titleLower.includes('implementation roadmap') ||
              titleLower.includes('roadmap') ||
              titleLower.includes('6.5')
            const isPriorityMatrixSection =
              titleLower.includes('remediation priority matrix') ||
              titleLower.includes('priority matrix') ||
              titleLower.includes('6.4')
            // Only match Section 1.1 exactly - be very strict to avoid false positives
            // Match if title starts with "1.1" or contains "what this scan is" (which should only be in 1.1)
            const isWhatThisScanSection =
              titleLower.startsWith('1.1') ||
              (titleLower.includes('what this scan is') && titleLower.includes('1.1'))

            // Find the first regular text paragraph (not heading, bullet, table, code, etc.)
            const findFirstParagraph = () => {
              for (let i = 0; i < processedContent.length; i++) {
                const item = processedContent[i]
                if (item && item.type === 'text') {
                  const line = item.content as string
                  if (!line.trim()) continue
                  const processed = processMarkdownLine(line)
                  // Skip headings, bullets, and special content
                  if (
                    !processed.isHeading &&
                    !processed.isBullet &&
                    !processed.isCodeFence &&
                    !processed.isTable
                  ) {
                    // Check if it's not a special field (severity, observation, etc.)
                    const isSpecialField =
                      /^\*\*(Severity|Observation|Priority):\*\*/i.test(
                        line.trim()
                      ) || /Overall Risk Rating:/i.test(line.trim())
                    if (!isSpecialField) {
                      return i
                    }
                  }
                }
              }
              return -1
            }

            const firstParagraphIndex = findFirstParagraph()

            return (
              <View key={s.key} wrap={false}>
                {/* Section title + first paragraph wrapped together */}
                {firstParagraphIndex >= 0 ? (
                  <View wrap={false}>
                    <Text style={styles.sectionTitle} wrap={false}>
                      {s.title}
                    </Text>
                    {(() => {
                      const firstItem = processedContent[firstParagraphIndex]
                      if (!firstItem) return null
                      const line = firstItem.content as string
                      const processed = processMarkdownLine(line)

                      // Check if it's a subheading
                      const subheadingPatterns = [
                        /^(Description|Business Impact|What Was Found|Affected Systems|Risk Scenario|Recommendation|Recommendations|Vulnerable Systems|Evidence|Impact|Remediation|Technical Details|Attack Vector|Proof of Concept|References|CVSS Score|CVE|Affected Components|Root Cause|Detection|Mitigation|Prevention|Additional Notes|Summary|Details|Overview|Background|Context|Solution|Workaround):\s*/i,
                      ]
                      const isSubheading = subheadingPatterns.some((pattern) =>
                        pattern.test(processed.text)
                      )

                      if (isSubheading) {
                        const match = processed.text.match(/^([^:]+):\s*(.*)$/i)
                        if (match) {
                          const [, label, content] = match
                          return (
                            <View style={{ marginBottom: 12, marginTop: 4 }}>
                              <Text style={styles.paragraph} wrap={false}>
                                <Text
                                  style={{
                                    fontFamily: 'Helvetica',
                                    fontWeight: 700,
                                    color: '#111827',
                                  }}
                                >
                                  {label}:
                                </Text>
                                {content && (
                                  <Text
                                    style={{
                                      fontFamily: 'Helvetica',
                                      fontWeight: 400,
                                      color: '#1f2937',
                                    }}
                                  >
                                    {' '}
                                    {content}
                                  </Text>
                                )}
                              </Text>
                            </View>
                          )
                        }
                      }

                      // Handle inline bold
                      if (processed.hasInlineBold) {
                        const segments = parseInlineBold(processed.text)
                        return (
                          <View style={{ marginBottom: 10 }}>
                            <Text style={styles.paragraph} wrap={false}>
                              {segments.map((segment, idx) => (
                                <Text
                                  key={idx}
                                  style={
                                    segment.bold
                                      ? [styles.paragraph, styles.boldText]
                                      : styles.paragraph
                                  }
                                >
                                  {segment.text}
                                </Text>
                              ))}
                            </Text>
                          </View>
                        )
                      }

                      // Regular text
                      return (
                        <View style={{ marginBottom: 10 }}>
                          <Text style={styles.paragraph} wrap={false}>
                            {processed.text.replace(/\*\*/g, '')}
                          </Text>
                        </View>
                      )
                    })()}
                  </View>
                ) : (
                  <Text style={styles.sectionTitle} wrap={false}>
                    {s.title}
                  </Text>
                )}
                <View wrap={false}>
                  {/* Special rendering for What This Scan Is section */}
                  {isWhatThisScanSection && (
                    <View wrap={false}>
                      {(() => {
                        const whatThisScanIs: string[] = []
                        const whatThisScanIsNot: string[] = []
                        let importantNote = ''
                        let currentSection: 'is' | 'isNot' | 'note' | null =
                          null

                        contentLines.forEach((line) => {
                          const trimmed = line.trim()
                          if (!trimmed) return

                          // Detect section headers (case-insensitive, flexible matching)
                          const lowerTrimmed = trimmed.toLowerCase()
                          if (
                            lowerTrimmed.includes('what this scan is:') &&
                            !lowerTrimmed.includes('not')
                          ) {
                            currentSection = 'is'
                            return
                          }
                          if (
                            lowerTrimmed.includes('what this scan is not:') ||
                            (lowerTrimmed.includes('what this scan is not') &&
                              !lowerTrimmed.includes('what this scan is:'))
                          ) {
                            currentSection = 'isNot'
                            return
                          }
                          if (
                            lowerTrimmed.includes('important note:') ||
                            lowerTrimmed.includes('**important note:**')
                          ) {
                            currentSection = 'note'
                            // Extract note text if on same line
                            const noteMatch = trimmed.match(
                              /\*\*Important Note:\*\*\s*(.+)/i
                            )
                            if (noteMatch && noteMatch[1]) {
                              importantNote = noteMatch[1]
                                .replace(/\*\*/g, '')
                                .trim()
                            }
                            return
                          }

                          // Stop if we hit another section header
                          if (
                            trimmed.startsWith('###') ||
                            trimmed.startsWith('##') ||
                            (trimmed.startsWith('**') &&
                              (lowerTrimmed.includes('what this scan') ||
                                lowerTrimmed.includes('important note')))
                          ) {
                            // Check if it's a new section
                            if (
                              !lowerTrimmed.includes('what this scan is:') &&
                              !lowerTrimmed.includes(
                                'what this scan is not:'
                              ) &&
                              !lowerTrimmed.includes('important note:')
                            ) {
                              currentSection = null
                            }
                            return
                          }

                          // Collect content based on current section
                          if (currentSection === 'is') {
                            if (
                              trimmed.startsWith('•') ||
                              trimmed.startsWith('-') ||
                              trimmed.startsWith('*')
                            ) {
                              const cleanItem = trimmed
                                .replace(/^[•\-*]\s*/, '')
                                .replace(/\*\*/g, '')
                                .trim()
                              if (cleanItem) whatThisScanIs.push(cleanItem)
                            }
                          } else if (currentSection === 'isNot') {
                            // Handle various bullet point formats
                            if (
                              trimmed.startsWith('•') ||
                              trimmed.startsWith('-') ||
                              trimmed.startsWith('*') ||
                              trimmed.includes('❌') ||
                              trimmed.toLowerCase().startsWith('not a') ||
                              trimmed.toLowerCase().startsWith('not an') ||
                              trimmed.toLowerCase().startsWith('not ')
                            ) {
                              let cleanItem = trimmed
                                .replace(/^[•\-*❌]\s*/, '')
                                .replace(/^❌\s*/, '')
                                .replace(/\*\*/g, '')
                                .trim()

                              // Ensure it starts with "Not" if it doesn't already
                              if (
                                !cleanItem.toLowerCase().startsWith('not a') &&
                                !cleanItem.toLowerCase().startsWith('not an') &&
                                !cleanItem.toLowerCase().startsWith('not ')
                              ) {
                                cleanItem = 'Not ' + cleanItem
                              }

                              if (cleanItem) whatThisScanIsNot.push(cleanItem)
                            }
                          } else if (currentSection === 'note') {
                            if (trimmed && !trimmed.startsWith('**')) {
                              const cleanLine = trimmed
                                .replace(/\*\*/g, '')
                                .trim()
                              if (cleanLine) {
                                importantNote +=
                                  (importantNote ? ' ' : '') + cleanLine
                              }
                            }
                          }
                        })

                        return (
                          <View wrap={false}>
                            {/* What this scan is box - always show with default items if empty */}
                            <View
                              style={styles.priorityMatrixCard}
                              wrap={false}
                            >
                              <Text style={styles.priorityMatrixTitle}>
                                What this scan is:
                              </Text>
                              {whatThisScanIs.length > 0 ? (
                                whatThisScanIs.map((item, idx) => (
                                  <Text
                                    key={idx}
                                    style={styles.priorityMatrixText}
                                    wrap
                                  >
                                    • {item}
                                  </Text>
                                ))
                              ) : (
                                <>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • A consent-based, external vulnerability
                                    scan
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Focused on publicly exposed services and
                                    configurations
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Intended to highlight potential areas for
                                    review
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Suitable for regular monitoring and early
                                    risk awareness
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Non-intrusive and designed to identify
                                    potential security hygiene issues
                                  </Text>
                                </>
                              )}
                            </View>

                            {/* What this scan is not box - always show with default items if empty */}
                            <View
                              style={styles.priorityMatrixCard}
                              wrap={false}
                            >
                              <Text style={styles.priorityMatrixTitle}>
                                What this scan is not:
                              </Text>
                              {whatThisScanIsNot.length > 0 ? (
                                whatThisScanIsNot.map((item, idx) => {
                                  // Clean the item - remove ❌ and ensure proper formatting
                                  const cleanItem = item
                                    .replace(/^❌\s*/, '')
                                    .trim()
                                  return (
                                    <Text
                                      key={idx}
                                      style={styles.priorityMatrixText}
                                      wrap
                                    >
                                      • {cleanItem}
                                    </Text>
                                  )
                                })
                              ) : (
                                <>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not a penetration test
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not an exploitative assessment
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not an internal network review
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not confirmation of compromise or breach
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not an assessment of application logic
                                    flaws
                                  </Text>
                                  <Text style={styles.priorityMatrixText} wrap>
                                    • Not an authentication bypass test
                                  </Text>
                                </>
                              )}
                            </View>

                            {/* Important Note box */}
                            {importantNote && (
                              <View
                                style={[
                                  styles.priorityMatrixCard,
                                  {
                                    backgroundColor: '#f0f9ff',
                                    borderColor: '#93c5fd',
                                  },
                                ]}
                                wrap={false}
                              >
                                <Text
                                  style={[
                                    styles.priorityMatrixTitle,
                                    { color: '#1e40af' },
                                  ]}
                                >
                                  Important Note:
                                </Text>
                                <Text style={styles.priorityMatrixText} wrap>
                                  {importantNote}
                                </Text>
                              </View>
                            )}
                          </View>
                        )
                      })()}
                    </View>
                  )}
                  {/* Special rendering for Roadmap sections only - Priority Matrix now uses normal markdown */}
                  {isRoadmapSection && (
                    <View wrap={false}>
                      {(() => {
                        // Process content to group roadmap weeks together
                        const roadmapWeeks: Array<{
                          weeks: string
                          content: string[]
                          lineIdx: number
                        }> = []
                        const otherContent: Array<{
                          type: 'priority' | 'longterm' | 'text'
                          data: any
                          lineIdx: number
                        }> = []

                        contentLines.forEach((line, lineIdx) => {
                          const trimmed = line.trim()
                          if (!trimmed) return

                          // Detect roadmap weeks (case-insensitive, flexible format)
                          const weeksMatch = trimmed.match(
                            /^\*\*(WEEKS|Weeks|weeks)\s+(\d+-\d+):\*\*/i
                          )
                          if (weeksMatch && isRoadmapSection && weeksMatch[2]) {
                            const weeks = weeksMatch[2]
                            const weekContent: string[] = []
                            let i = lineIdx + 1
                            while (
                              i < contentLines.length &&
                              contentLines[i] &&
                              !contentLines[i]
                                ?.trim()
                                .match(
                                  /^\*\*(WEEKS|Weeks|weeks)\s+\d+-\d+:\*\*/i
                                ) &&
                              !contentLines[i]
                                ?.trim()
                                .match(/^\*\*\d+-\d+\s+Month/i)
                            ) {
                              const nextLine = contentLines[i]?.trim()
                              if (
                                nextLine &&
                                (nextLine.startsWith('-') ||
                                  nextLine.startsWith('*'))
                              ) {
                                const cleanItem = nextLine
                                  .replace(/^[-*]\s*/, '')
                                  .replace(/^✓\s*/, '')
                                  .replace(/^✔\s*/, '')
                                if (cleanItem) weekContent.push(cleanItem)
                              }
                              i++
                            }
                            roadmapWeeks.push({
                              weeks,
                              content: weekContent,
                              lineIdx,
                            })
                          }

                          // Detect priority matrix - ONLY in priority matrix section (6.4), NOT in roadmap section
                          const priorityMatch = trimmed.match(
                            /^\*\*(Critical|High|Medium|Low)\s*\(([^)]+)\):\*\*/i
                          )
                          if (
                            priorityMatch &&
                            isPriorityMatrixSection &&
                            !isRoadmapSection
                          ) {
                            const priority = priorityMatch[1]
                            const timeframe = priorityMatch[2]
                            const priorityContent: string[] = []
                            let i = lineIdx + 1
                            while (
                              i < contentLines.length &&
                              contentLines[i] &&
                              !contentLines[i]
                                ?.trim()
                                .match(
                                  /^\*\*(Critical|High|Medium|Low)\s*\(/i
                                ) &&
                              !contentLines[i]?.trim().startsWith('###') &&
                              !contentLines[i]?.trim().startsWith('##')
                            ) {
                              const nextLine = contentLines[i]?.trim()
                              if (!nextLine) {
                                i++
                                continue
                              }
                              // Handle bullet points (various formats)
                              if (
                                nextLine.startsWith('-') ||
                                nextLine.startsWith('*') ||
                                nextLine.startsWith('•')
                              ) {
                                const cleanItem = nextLine
                                  .replace(/^[-*•]\s*/, '')
                                  .replace(/\*\*/g, '')
                                  .trim()
                                if (cleanItem) {
                                  priorityContent.push(cleanItem)
                                }
                              }
                              // Also handle lines that are part of the content (not headers)
                              else if (
                                !nextLine.startsWith('**') &&
                                !nextLine.startsWith('#') &&
                                nextLine.length > 0
                              ) {
                                // This might be continuation text, add it
                                const cleanItem = nextLine
                                  .replace(/\*\*/g, '')
                                  .trim()
                                if (
                                  cleanItem &&
                                  !cleanItem.match(/^\[List specific/i)
                                ) {
                                  priorityContent.push(cleanItem)
                                }
                              }
                              i++
                            }
                            otherContent.push({
                              type: 'priority',
                              data: {
                                priority,
                                timeframe,
                                content: priorityContent,
                              },
                              lineIdx,
                            })
                          }

                          // Detect long-term roadmap
                          const longTermMatch = trimmed.match(
                            /^\*\*(\d+-\d+\s+Month[^*]+)\*\*/i
                          )
                          if (longTermMatch && isRoadmapSection) {
                            const title = longTermMatch[1]
                            const longTermContent: string[] = []
                            let i = lineIdx + 1
                            while (
                              i < contentLines.length &&
                              contentLines[i] &&
                              !contentLines[i]?.trim().match(/^###/)
                            ) {
                              const nextLine = contentLines[i]?.trim()
                              if (
                                nextLine &&
                                (nextLine.startsWith('-') ||
                                  nextLine.startsWith('*'))
                              ) {
                                const cleanItem = nextLine
                                  .replace(/^[-*]\s*/, '')
                                  .replace(/^✓\s*/, '')
                                  .replace(/^✔\s*/, '')
                                if (cleanItem) longTermContent.push(cleanItem)
                              }
                              i++
                            }
                            otherContent.push({
                              type: 'longterm',
                              data: { title, content: longTermContent },
                              lineIdx,
                            })
                          }
                        })

                        // Render roadmap weeks side-by-side
                        const rendered: React.ReactNode[] = []
                        if (isRoadmapSection && roadmapWeeks.length > 0) {
                          // Group weeks 1-2 and 3-4 together
                          const weeks12 = roadmapWeeks.find(
                            (w) => w.weeks === '1-2'
                          )
                          const weeks34 = roadmapWeeks.find(
                            (w) => w.weeks === '3-4'
                          )

                          if (weeks12 || weeks34) {
                            rendered.push(
                              <View
                                key="roadmap-weeks"
                                style={styles.roadmapCardRow}
                                wrap={false}
                              >
                                {weeks12 && (
                                  <View
                                    style={[
                                      styles.roadmapCard,
                                      { marginRight: 24 },
                                    ]}
                                    wrap={false}
                                  >
                                    <Text style={styles.roadmapCardTitle}>
                                      WEEKS {weeks12.weeks || '1-2'}
                                    </Text>
                                    {weeks12.content.map((item, idx) => (
                                      <View
                                        key={idx}
                                        style={styles.roadmapCardItem}
                                        wrap={false}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            fontFamily: 'Helvetica',
                                            fontWeight: 400,
                                            color: '#1f2937',
                                            marginRight: 8,
                                            width: 12,
                                            lineHeight: 1.7,
                                          }}
                                        >
                                          •
                                        </Text>
                                        <Text
                                          style={styles.roadmapCardText}
                                          wrap
                                        >
                                          {item}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                                {weeks34 && (
                                  <View
                                    style={[
                                      styles.roadmapCard,
                                      { marginLeft: 0, flex: 1 },
                                    ]}
                                    wrap={false}
                                  >
                                    <Text style={styles.roadmapCardTitle}>
                                      WEEKS {weeks34.weeks || '3-4'}
                                    </Text>
                                    {weeks34.content.map((item, idx) => (
                                      <View
                                        key={idx}
                                        style={styles.roadmapCardItem}
                                        wrap={false}
                                      >
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            fontFamily: 'Helvetica',
                                            fontWeight: 400,
                                            color: '#1f2937',
                                            marginRight: 8,
                                            width: 12,
                                            lineHeight: 1.7,
                                          }}
                                        >
                                          •
                                        </Text>
                                        <Text
                                          style={styles.roadmapCardText}
                                          wrap
                                        >
                                          {item}
                                        </Text>
                                      </View>
                                    ))}
                                  </View>
                                )}
                              </View>
                            )
                          }
                        }

                        // Render priority matrix cards ONLY in priority matrix section (6.4)
                        if (isPriorityMatrixSection) {
                          const priorityLevels = [
                            { priority: 'Critical', timeframe: '0-7 days' },
                            { priority: 'High', timeframe: '1-4 weeks' },
                            { priority: 'Medium', timeframe: '1-3 months' },
                            { priority: 'Low', timeframe: '3-12 months' },
                          ]

                          // Get all parsed priority items
                          const parsedPriorityItems = otherContent.filter(
                            (c) => c.type === 'priority'
                          )

                          // Always render all 4 priority levels
                          // If we found parsed items, use those; otherwise use fallback text
                          priorityLevels.forEach((level) => {
                            const foundItem = parsedPriorityItems.find(
                              (item) =>
                                item.data.priority.toLowerCase() ===
                                level.priority.toLowerCase()
                            )

                            const content = foundItem
                              ? foundItem.data.content
                              : []
                            const hasContent = Array.isArray(content) && content.length > 0

                            rendered.push(
                              <View
                                key={`priority-${level.priority}`}
                                style={styles.priorityMatrixCard}
                                wrap
                              >
                                <Text style={styles.priorityMatrixTitle} wrap>
                                  {level.priority} ({level.timeframe})
                                </Text>
                                {hasContent ? (
                                  <View wrap>
                                    {content.map((text: string, idx: number) => (
                                      <Text
                                        key={idx}
                                        style={[
                                          styles.priorityMatrixText,
                                          idx < content.length - 1
                                            ? { marginBottom: 8 }
                                            : { marginBottom: 0 },
                                        ]}
                                        wrap
                                      >
                                        {text}
                                      </Text>
                                    ))}
                                  </View>
                                ) : (
                                  <Text style={styles.priorityMatrixText} wrap>
                                    {level.priority === 'Critical'
                                      ? 'No critical findings identified in this scan. However, any critical findings discovered in future scans should be addressed within 0-7 days.'
                                      : level.priority === 'High'
                                      ? 'No high-severity findings identified in this scan. High-severity findings typically include issues that could potentially lead to unauthorized access or data exposure if left unaddressed.'
                                      : level.priority === 'Medium'
                                      ? 'No medium-severity findings identified in this scan. Medium-severity findings typically include configuration issues and best practice recommendations.'
                                      : 'No low-severity findings identified in this scan. Low-severity findings typically include informational observations and minor configuration improvements.'}
                                  </Text>
                                )}
                              </View>
                            )
                          })
                        }

                        // Render long-term roadmap
                        otherContent
                          .filter((c) => c.type === 'longterm')
                          .forEach((item) => {
                            const { title, content } = item.data
                            rendered.push(
                              <View
                                key={`longterm-${item.lineIdx}`}
                                wrap={false}
                              >
                                <Text style={styles.roadmapSectionTitle}>
                                  {title} (Optional)
                                </Text>
                                <Text style={styles.paragraph} wrap>
                                  If desired, {data.domain} can implement a
                                  longer-term resilience programme:
                                </Text>
                                <View
                                  style={styles.roadmapLargeCard}
                                  wrap={false}
                                >
                                  {content.map((text: string, idx: number) => (
                                    <View
                                      key={idx}
                                      style={styles.roadmapCardItem}
                                      wrap={false}
                                    >
                                      <Text
                                        style={{
                                          fontSize: 12,
                                          fontFamily: 'Helvetica',
                                          fontWeight: 400,
                                          color: '#1f2937',
                                          marginRight: 8,
                                          width: 12,
                                          lineHeight: 1.7,
                                        }}
                                      >
                                        •
                                      </Text>
                                      <Text style={styles.roadmapCardText} wrap>
                                        {text}
                                      </Text>
                                    </View>
                                  ))}
                                </View>
                              </View>
                            )
                          })

                        return rendered
                      })()}
                    </View>
                  )}
                  {/* Process regular content - skip if cards were already rendered for roadmap/whatThisScan sections */}
                  {/* Priority Matrix now uses normal markdown rendering */}
                  {!isRoadmapSection &&
                    !isWhatThisScanSection &&
                    processedContent.map((item, itemIndex) => {
                      // Skip the first paragraph since it's already rendered with the title
                      if (itemIndex === firstParagraphIndex) {
                        return null
                      }
                      // Handle page break
                      if (item.type === 'pagebreak') {
                        return <View key={item.key} break />
                      }

                      if (item.type === 'table') {
                        const rows = item.content as string[][]
                        if (rows.length === 0) return null

                        return (
                          <View
                            key={item.key}
                            style={styles.table}
                            wrap={false}
                          >
                            {rows.map((row, rowIndex) => {
                              const isHeader = rowIndex === 0
                              return (
                                <View
                                  key={`${item.key}-row-${rowIndex}`}
                                  style={[
                                    isHeader
                                      ? styles.tableHeaderRow
                                      : styles.tableRow,
                                    { width: '100%' },
                                  ]}
                                  wrap={false}
                                >
                                  {row.map((cell, cellIndex) => {
                                    const isLastCell =
                                      cellIndex === row.length - 1
                                    // For 2-column tables (like glossary), set specific widths
                                    const isTwoColumnTable = rows[0]?.length === 2
                                    const columnWidthStyle = isTwoColumnTable
                                      ? cellIndex === 0
                                        ? { width: '35%' as const, flex: 0 }
                                        : { width: '65%' as const, flex: 0 }
                                      : {}
                                    
                                    const baseCellStyle = isHeader
                                      ? styles.tableHeaderCell
                                      : styles.tableCell
                                    
                                    const cellStyle = [
                                      baseCellStyle,
                                      isLastCell ? { borderRightWidth: 0 } : {},
                                      columnWidthStyle,
                                    ]
                                    
                                    // Remove asterisks and detect if text should be bold
                                    const cleanCell = cell
                                      .replace(/\*\*/g, '')
                                      .trim()
                                    const shouldBeBold =
                                      cell.includes('**') ||
                                      (rowIndex > 0 &&
                                        cellIndex === 0 &&
                                        cleanCell
                                          .toLowerCase()
                                          .includes('overall risk rating'))

                                    // Detect if this is a severity column and get color
                                    let severityColor = null
                                    if (!isHeader && rows.length > 0) {
                                      const headerRow = rows[0]
                                      if (headerRow) {
                                        const columnName =
                                          headerRow[cellIndex]
                                            ?.toLowerCase()
                                            .trim() || ''
                                        if (
                                          columnName.includes('severity') ||
                                          columnName.includes('priority')
                                        ) {
                                          const severityValue =
                                            cleanCell.toUpperCase()
                                          if (
                                            severityValue.includes('CRITICAL')
                                          ) {
                                            severityColor = '#54081E' // Maroon
                                          } else if (
                                            severityValue.includes('HIGH')
                                          ) {
                                            severityColor = '#dc2626' // Red
                                          } else if (
                                            severityValue.includes('MEDIUM')
                                          ) {
                                            severityColor = '#ea580c' // Orange
                                          } else if (
                                            severityValue.includes('LOW')
                                          ) {
                                            severityColor = '#16a34a' // Green
                                          } else if (
                                            severityValue.includes(
                                              'INFORMATIONAL'
                                            ) ||
                                            severityValue === 'INFO'
                                          ) {
                                            severityColor = '#38bdf8' // Sky blue
                                          }
                                        }
                                      }
                                    }

                                    return (
                                      <View
                                        key={`${item.key}-cell-${rowIndex}-${cellIndex}`}
                                        style={cellStyle}
                                        wrap
                                      >
                                        <Text
                                          style={{
                                            fontSize: isHeader ? 10 : 10,
                                            fontFamily: 'Helvetica',
                                            fontWeight:
                                              isHeader || shouldBeBold
                                                ? 700
                                                : 400,
                                            color: isHeader
                                              ? '#ffffff'
                                              : severityColor || '#111827',
                                            lineHeight: 1.6,
                                          }}
                                          wrap
                                        >
                                          {cleanCell}
                                        </Text>
                                      </View>
                                    )
                                  })}
                                </View>
                              )
                            })}
                          </View>
                        )
                      }

                      if (item.type === 'code') {
                        const codeLines = item.content as string[]
                        return (
                          <View
                            key={item.key}
                            style={styles.codeBlock}
                            wrap={false}
                          >
                            {codeLines.map((codeLine, idx) => (
                              <View
                                key={`${item.key}-line-${idx}`}
                                style={styles.codeLine}
                              >
                                <Text style={styles.codeText} wrap>
                                  {codeLine || ' '}
                                </Text>
                              </View>
                            ))}
                          </View>
                        )
                      }

                      if (item.type === 'riskCalculation') {
                        const riskLines = item.content as string[]
                        // Check if the content contains a table - if so, render it as a table
                        // Otherwise, skip rendering the risk calculation box to avoid duplication
                        const hasTable = riskLines.some((line) =>
                          isTableRow(line.trim())
                        )

                        if (hasTable) {
                          // Extract and render the table from risk calculation
                          const tableStart = riskLines.findIndex((line) =>
                            isTableRow(line.trim())
                          )
                          if (tableStart >= 0) {
                            const tableRows: string[][] = []
                            let i = tableStart
                            while (i < riskLines.length) {
                              const currentLine = riskLines[i]
                              if (
                                !currentLine ||
                                !isTableRow(currentLine.trim())
                              )
                                break
                              if (!isTableSeparator(currentLine.trim())) {
                                tableRows.push(
                                  parseTableRow(currentLine.trim())
                                )
                              }
                              i++
                            }

                            if (tableRows.length > 0) {
                              return (
                                <View
                                  key={item.key}
                                  style={styles.riskCalculationBox}
                                  wrap={false}
                                >
                                  <Text
                                    style={styles.riskCalculationTitle}
                                    wrap
                                  >
                                    Risk Rating Calculation:
                                  </Text>
                                  <View style={styles.table} wrap={false}>
                                    {tableRows.map((row, rowIndex) => {
                                      const isHeader = rowIndex === 0
                                      return (
                                        <View
                                          key={`${item.key}-row-${rowIndex}`}
                                          style={[
                                            isHeader
                                              ? styles.tableHeaderRow
                                              : styles.tableRow,
                                            { width: '100%' },
                                          ]}
                                          wrap={false}
                                        >
                                          {row.map((cell, cellIndex) => {
                                            const isLastCell =
                                              cellIndex === row.length - 1
                                            const cellStyle = isHeader
                                              ? isLastCell
                                                ? [
                                                    styles.tableHeaderCell,
                                                    { borderRightWidth: 0 },
                                                  ]
                                                : styles.tableHeaderCell
                                              : isLastCell
                                              ? [
                                                  styles.tableCell,
                                                  { borderRightWidth: 0 },
                                                ]
                                              : styles.tableCell

                                            // Remove asterisks and detect if text should be bold
                                            const cleanCell = cell
                                              .replace(/\*\*/g, '')
                                              .trim()
                                            const shouldBeBold =
                                              cell.includes('**') ||
                                              (rowIndex > 0 &&
                                                cellIndex === 0 &&
                                                cleanCell
                                                  .toLowerCase()
                                                  .includes(
                                                    'overall risk rating'
                                                  ))

                                            // Detect if this is a severity column and get color
                                            let severityColor = null
                                            if (
                                              !isHeader &&
                                              tableRows.length > 0
                                            ) {
                                              const headerRow = tableRows[0]
                                              if (headerRow) {
                                                const columnName =
                                                  headerRow[cellIndex]
                                                    ?.toLowerCase()
                                                    .trim() || ''
                                                if (
                                                  columnName.includes(
                                                    'severity'
                                                  ) ||
                                                  columnName.includes(
                                                    'priority'
                                                  )
                                                ) {
                                                  const severityValue =
                                                    cleanCell.toUpperCase()
                                                  if (
                                                    severityValue.includes(
                                                      'CRITICAL'
                                                    )
                                                  ) {
                                                    severityColor = '#54081E' // Maroon
                                                  } else if (
                                                    severityValue.includes(
                                                      'HIGH'
                                                    )
                                                  ) {
                                                    severityColor = '#dc2626' // Red
                                                  } else if (
                                                    severityValue.includes(
                                                      'MEDIUM'
                                                    )
                                                  ) {
                                                    severityColor = '#ea580c' // Orange
                                                  } else if (
                                                    severityValue.includes(
                                                      'LOW'
                                                    )
                                                  ) {
                                                    severityColor = '#16a34a' // Green
                                                  } else if (
                                                    severityValue.includes(
                                                      'INFORMATIONAL'
                                                    ) ||
                                                    severityValue === 'INFO'
                                                  ) {
                                                    severityColor = '#38bdf8' // Sky blue
                                                  }
                                                }
                                              }
                                            }

                                            return (
                                              <View
                                                key={`${item.key}-cell-${rowIndex}-${cellIndex}`}
                                                style={cellStyle}
                                              >
                                                <Text
                                                  style={{
                                                    fontSize: isHeader
                                                      ? 10
                                                      : 10,
                                                    fontFamily: 'Helvetica',
                                                    fontWeight:
                                                      isHeader || shouldBeBold
                                                        ? 700
                                                        : 400,
                                                    color: isHeader
                                                      ? '#ffffff'
                                                      : severityColor ||
                                                        '#111827',
                                                    lineHeight: 1.5,
                                                  }}
                                                  wrap
                                                >
                                                  {cleanCell}
                                                </Text>
                                              </View>
                                            )
                                          })}
                                        </View>
                                      )
                                    })}
                                  </View>
                                </View>
                              )
                            }
                          }
                        }

                        // If no table found, skip rendering to avoid duplication
                        return null
                      }

                      // Regular text
                      const line = item.content as string
                      if (!line.trim()) {
                        return (
                          <View key={item.key} style={{ height: 6 }}>
                            <Text> </Text>
                          </View>
                        )
                      }

                      // Skip priority matrix items that are already rendered in cards
                      // Check if this line matches a priority matrix pattern
                      // Also prevent priority matrix content from appearing in roadmap section (6.5)
                      if (isPriorityMatrixSection || isRoadmapSection) {
                        const priorityPattern =
                          /^\*\*(Critical|High|Medium|Low)\s*\([^)]+\):\*\*/i
                        if (priorityPattern.test(line.trim())) {
                          // Skip this line - it's already rendered in the priority matrix cards (section 6.4)
                          // OR it shouldn't appear in roadmap section (6.5)
                          return null
                        }
                        // Also skip lines that are clearly part of priority matrix content
                        // (they're already in the cards in section 6.4, or shouldn't be in roadmap section 6.5)
                        const trimmedLine = line.trim()
                        const isPriorityContent =
                          /^[-*•]\s*(No\s+(critical|high|medium|low)-severity|SSRF|HTML|Malicious|HTTP|Immediate action|Disable|Restrict|Implement|Review)/i.test(
                            trimmedLine
                          ) ||
                          /No\s+(critical|high|medium|low)-severity\s+findings/i.test(
                            trimmedLine
                          ) ||
                          /(Critical|High|Medium|Low)\s*\([^)]+\)/.test(
                            trimmedLine
                          )
                        // Skip priority matrix content in both sections:
                        // - In priority matrix section: already rendered in cards
                        // - In roadmap section: shouldn't appear there at all
                        if (isPriorityContent) {
                          return null
                        }
                      }

                      const processed = processMarkdownLine(line)

                      // Check if this is a Severity, Observation, or Priority field with pill styling
                      const severityMatch = line.match(
                        /^\*\*Severity:\*\*\s*(Critical|High|Medium|Low|Informational)/i
                      )
                      const observationMatch = line.match(
                        /^\*\*Observation:\*\*\s*(Critical|High|Medium|Low|Informational)/i
                      )
                      const priorityMatch = line.match(
                        /^\*\*Priority:\*\*\s*(Critical|High|Medium|Low|Informational)/i
                      )
                      const riskRatingMatch = line.match(
                        /Overall Risk Rating:\s*(Critical|High|Medium|Low|Informational)/i
                      )

                      if (
                        severityMatch ||
                        observationMatch ||
                        priorityMatch ||
                        riskRatingMatch
                      ) {
                        const match =
                          severityMatch ||
                          observationMatch ||
                          priorityMatch ||
                          riskRatingMatch
                        let label = 'Severity'
                        if (observationMatch) label = 'Observation'
                        if (priorityMatch) label = 'Priority'
                        if (riskRatingMatch) label = 'Overall Risk Rating'

                        const value = match?.[1] || ''
                        const valueLower = value.toLowerCase()

                        // Determine pill style based on value
                        let pillStyle = styles.sevMedium // Default
                        if (valueLower === 'critical') {
                          pillStyle = styles.sevCritical
                        } else if (valueLower === 'high') {
                          pillStyle = styles.sevHigh
                        } else if (valueLower === 'medium') {
                          pillStyle = styles.sevMedium
                        } else if (valueLower === 'low') {
                          pillStyle = styles.sevLow
                        } else if (valueLower === 'informational') {
                          pillStyle = styles.sevInformational
                        }

                        // Capitalize the value (Title Case)
                        const valueDisplay =
                          value.charAt(0).toUpperCase() +
                          value.slice(1).toLowerCase()

                        return (
                          <View
                            key={item.key}
                            style={{
                              marginBottom: 12,
                              marginTop: 4,
                              flexDirection: 'row',
                              alignItems: 'center',
                            }}
                            wrap
                          >
                            <View
                              style={pillStyle || styles.sevMedium}
                              wrap
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: 'Helvetica',
                                  color: (pillStyle || styles.sevMedium).color,
                                  lineHeight: 1.2,
                                }}
                                wrap
                              >
                                {label}: {valueDisplay}
                              </Text>
                            </View>
                          </View>
                        )
                      }

                      if (processed.isHeading && processed.text) {
                        const headingStyle =
                          processed.level === 1
                            ? styles.heading1
                            : processed.level === 2
                            ? styles.heading2
                            : processed.level === 3
                            ? styles.heading3
                            : processed.level === 4
                            ? styles.heading4
                            : processed.level === 5
                            ? styles.heading5
                            : styles.heading6

                        return (
                          <View
                            key={item.key}
                            style={{
                              marginBottom: 12,
                              marginTop: processed.level <= 3 ? 16 : 8,
                            }}
                            wrap
                          >
                            <Text style={headingStyle} wrap>
                              {processed.text}
                            </Text>
                          </View>
                        )
                      }
                      if (processed.isBullet && processed.text) {
                        // Handle inline bold in bullet points
                        if (processed.hasInlineBold) {
                          const segments = parseInlineBold(processed.text)
                          return (
                            <View
                              key={item.key}
                              style={{ marginBottom: 8 }}
                              wrap
                            >
                              <Text style={styles.bulletPoint} wrap>
                                •{' '}
                                {segments.map((segment, idx) => (
                                  <Text
                                    key={idx}
                                    style={
                                      segment.bold
                                        ? [styles.bulletPoint, styles.boldText]
                                        : styles.bulletPoint
                                    }
                                  >
                                    {segment.text}
                                  </Text>
                                ))}
                              </Text>
                            </View>
                          )
                        }
                        return processed.isBold ? (
                          <View
                            key={item.key}
                            style={{ marginBottom: 8 }}
                            wrap
                          >
                            <Text
                              style={[styles.bulletPoint, styles.boldText]}
                              wrap
                            >
                              • {processed.text.replace(/\*\*/g, '')}
                            </Text>
                          </View>
                        ) : (
                          <View
                            key={item.key}
                            style={{ marginBottom: 8 }}
                            wrap
                          >
                            <Text style={styles.bulletPoint} wrap>
                              • {processed.text.replace(/\*\*/g, '')}
                            </Text>
                          </View>
                        )
                      }
                      // Check if this is a subheading (like "Description:", "Business Impact:", etc.)
                      const subheadingPatterns = [
                        /^(Description|Business Impact|What Was Found|Affected Systems|Risk Scenario|Recommendation|Recommendations|Vulnerable Systems|Evidence|Impact|Remediation|Technical Details|Attack Vector|Proof of Concept|References|CVSS Score|CVE|Affected Components|Root Cause|Detection|Mitigation|Prevention|Additional Notes|Summary|Details|Overview|Background|Context|Solution|Workaround):\s*/i,
                      ]
                      const isSubheading = subheadingPatterns.some((pattern) =>
                        pattern.test(processed.text)
                      )

                      if (isSubheading) {
                        // Split text into label and content
                        const match = processed.text.match(/^([^:]+):\s*(.*)$/i)
                        if (match) {
                          const [, label, content] = match
                          return (
                            <View
                              key={item.key}
                              style={{ marginBottom: 12, marginTop: 4 }}
                              wrap
                            >
                              <Text style={styles.paragraph} wrap>
                                <Text
                                  style={{
                                    fontFamily: 'Helvetica',
                                    fontWeight: 700,
                                    color: '#111827',
                                  }}
                                >
                                  {label}:
                                </Text>
                                {content && (
                                  <Text
                                    style={{
                                      fontFamily: 'Helvetica',
                                      fontWeight: 400,
                                      color: '#1f2937',
                                    }}
                                  >
                                    {' '}
                                    {content}
                                  </Text>
                                )}
                              </Text>
                            </View>
                          )
                        }
                      }

                      // Regular text - handle inline bold
                      if (processed.hasInlineBold) {
                        const segments = parseInlineBold(processed.text)
                        return (
                          <View
                            key={item.key}
                            style={{ marginBottom: 10 }}
                            wrap
                          >
                            <Text style={styles.paragraph} wrap>
                              {segments.map((segment, idx) => (
                                <Text
                                  key={idx}
                                  style={
                                    segment.bold
                                      ? [styles.paragraph, styles.boldText]
                                      : styles.paragraph
                                  }
                                >
                                  {segment.text}
                                </Text>
                              ))}
                            </Text>
                          </View>
                        )
                      }
                      // Regular text - always use font weight 400
                      return (
                        <View
                          key={item.key}
                          style={{ marginBottom: 10 }}
                          wrap
                        >
                          <Text style={styles.paragraph} wrap>
                            {processed.text.replace(/\*\*/g, '')}
                          </Text>
                        </View>
                      )
                    })}
                </View>
                {sectionIndex < contentSections.length - 1 && (
                  <View style={{ marginBottom: 20 }} />
                )}
              </View>
            )
          })}
        </View>
        <View style={styles.contentFooter} fixed>
          <View style={styles.contentFooterDivider} />
          <View style={styles.contentFooterContent}>
            <Text style={styles.contentFooterText}>
              {data.pentestType === 'aggressive'
                ? 'AI Penetration Test Report'
                : 'Vulnerability Scan Report'}{' '}
              {data.domain} -{' '}
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </Text>
            <Text
              style={styles.pageNumber}
              render={({ pageNumber }) => `${pageNumber}`}
            />
          </View>
        </View>
      </Page>
    </Document>
  )
}