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
      codeLanguage: language,
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

  // Remove ** bold markers from text (both opening and closing)
  const cleanText = headingText.replace(/\*\*/g, '').trim()

  // Check if original text had ** markers (for bold formatting in regular text)
  const hasBold = line.includes('**')

  if (headingLevel > 0) {
    return {
      isHeading: true,
      level: headingLevel,
      text: cleanText,
      isBold: false,
      isBullet: false,
      isTable: false,
      isCodeFence: false,
    }
  }

  return {
    isHeading: false,
    level: 0,
    text: cleanText,
    isBold: hasBold,
    isBullet: isBullet,
    isTable: false,
    isCodeFence: false,
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
    marginBottom: 12,
    marginTop: 8,
  },
  priorityMatrixTitle: {
    fontSize: 13.5,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  priorityMatrixText: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    lineHeight: 1.7,
    marginBottom: 6,
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
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    borderBottomStyle: 'solid',
  },
  tocItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    marginTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#d1d5db',
    borderBottomStyle: 'solid',
  },
  tocItemText: {
    fontSize: 13,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#374151',
    flex: 1,
  },
  tocItemMainText: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    flex: 1,
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
    backgroundColor: 'rgba(239, 68, 68, 0.1)', // Red with lighter opacity
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
    alignItems: 'flex-start',
    width: '100%',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#4b5563',
    borderBottomWidth: 1,
    borderBottomColor: '#9ca3af',
    borderBottomStyle: 'solid',
    alignItems: 'flex-start',
    width: '100%',
  },
  tableCell: {
    flex: 1,
    padding: 12,
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
    backgroundColor: '#ffffff',
    minWidth: 120,
    flexShrink: 1,
    flexGrow: 1,
  },
  tableHeaderCell: {
    flex: 1,
    padding: 12,
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
    minWidth: 120,
    flexShrink: 1,
    flexGrow: 1,
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
  // Graph container styles
  graphContainer: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderStyle: 'solid',
    borderRadius: 8,
    padding: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  graphTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica',
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
  },
  graphLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 400,
    color: '#6b7280',
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
function SeverityTrendGraph({
  severitySummary,
}: {
  severitySummary: {
    critical: number
    high: number
    medium: number
    low: number
  }
}) {
  // Use actual data from report
  const rawData = [
    {
      label: 'Critical',
      value: severitySummary.critical || 0,
      color: '#dc2626',
    },
    {
      label: 'High',
      value: severitySummary.high || 0,
      color: '#ea580c',
    },
    {
      label: 'Medium',
      value: severitySummary.medium || 0,
      color: '#f59e0b',
    },
    {
      label: 'Low',
      value: severitySummary.low || 0,
      color: '#16a34a',
    },
  ]

  const totalVulnerabilities = rawData.reduce(
    (sum, item) => sum + item.value,
    0
  )

  // Calculate percentages and heights dynamically
  const severityData = rawData.map((item) => {
    const percentage =
      totalVulnerabilities > 0 ? (item.value / totalVulnerabilities) * 100 : 0
    // Height is based on percentage (0-100% maps to 0-100% of chart height)
    const height = percentage
    return {
      ...item,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      height: Math.max(height, 5), // Minimum 5% height for visibility
    }
  })

  const chartHeight = 180
  const chartWidth = 500

  return (
    <View style={styles.graphContainer} wrap={false}>
      <Text style={styles.graphTitle}>Severity Distribution Overview</Text>

      {/* Chart Container - grid behind bars using fixed layout */}
      <View style={{ marginBottom: 12 }} wrap={false}>
        {/* Y-axis labels and chart row */}
        <View style={{ flexDirection: 'row', marginBottom: 8 }} wrap={false}>
          {/* Y-axis labels on left */}
          <View
            style={{ width: 50, alignItems: 'flex-end', paddingRight: 8 }}
            wrap={false}
          >
            {[100, 75, 50, 25, 0].map((percent, i) => (
              <Text
                key={i}
                style={{
                  fontSize: 9,
                  fontFamily: 'Helvetica',
                  color: '#6b7280',
                  height: 36,
                  textAlign: 'right',
                }}
                wrap={false}
              >
                {percent}%
              </Text>
            ))}
          </View>

          {/* Chart area with fixed width for proper SVG rendering */}
          <View
            style={{
              flex: 1,
              height: chartHeight,
              minWidth: 400,
            }}
            wrap={false}
          >
            {/* Grid lines and axes - rendered first (behind) using fixed coordinates */}
            <Svg width={400} height={chartHeight}>
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((percent, i) => {
                const y = ((100 - percent) / 100) * chartHeight
                return (
                  <Line
                    key={`grid-${i}`}
                    x1="0"
                    y1={y}
                    x2="400"
                    y2={y}
                    stroke="#e5e7eb"
                    strokeWidth="0.5"
                  />
                )
              })}
              {/* Y-axis line */}
              <Line
                x1="0"
                y1="0"
                x2="0"
                y2={chartHeight}
                stroke="#9ca3af"
                strokeWidth="1"
              />
              {/* X-axis line */}
              <Line
                x1="0"
                y1={chartHeight}
                x2="400"
                y2={chartHeight}
                stroke="#9ca3af"
                strokeWidth="1"
              />
            </Svg>

            {/* Bars - rendered on top using negative margin to overlay */}
            <View
              style={{
                flexDirection: 'row',
                height: chartHeight,
                alignItems: 'flex-end',
                marginTop: -chartHeight,
                paddingLeft: 2,
                paddingRight: 2,
                paddingBottom: 2,
              }}
              wrap={false}
            >
              {severityData.map((item, index) => {
                const barHeight = (item.height / 100) * chartHeight
                return (
                  <View
                    key={index}
                    style={{
                      flex: 1,
                      marginHorizontal: 4,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                    wrap={false}
                  >
                    {/* Value on top */}
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: 'Helvetica',
                        fontWeight: 700,
                        color: item.color,
                        marginBottom: 4,
                      }}
                      wrap={false}
                    >
                      {item.value}
                    </Text>
                    {/* Bar */}
                    <View
                      style={{
                        width: '100%',
                        height: barHeight,
                        backgroundColor: item.color,
                        borderRadius: 4,
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: 20,
                      }}
                      wrap={false}
                    >
                      <Text
                        style={{
                          fontSize: 9,
                          fontFamily: 'Helvetica',
                          fontWeight: 700,
                          color: '#ffffff',
                        }}
                        wrap={false}
                      >
                        {item.percentage.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                )
              })}
            </View>
          </View>
        </View>

        {/* X-axis labels */}
        <View
          style={{ flexDirection: 'row', marginLeft: 50, marginTop: 8 }}
          wrap={false}
        >
          {severityData.map((item, index) => (
            <View
              key={index}
              style={{ flex: 1, marginHorizontal: 4, alignItems: 'center' }}
              wrap={false}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontFamily: 'Helvetica',
                  fontWeight: 600,
                  color: '#111827',
                  textAlign: 'center',
                }}
                wrap={false}
              >
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Legend and Summary */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 8,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: '#e5e7eb',
        }}
        wrap={false}
      >
        <View style={{ flex: 1 }} wrap={false}>
          <Text style={styles.graphLabel} wrap={false}>
            Total Vulnerabilities:{' '}
            <Text style={{ fontWeight: 700, color: '#111827' }}>
              {totalVulnerabilities}
            </Text>
          </Text>
        </View>
        <View style={{ flex: 1 }} wrap={false}>
          <Text style={styles.graphLabel} wrap={false}>
            Assessment Date:{' '}
            <Text style={{ fontWeight: 700, color: '#111827' }}>
              {new Date().toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  )
}

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
    (s) => !s.title.toLowerCase().includes('table of contents')
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
            <Text style={styles.coverMainTitle}>Vulnerability Scan Report</Text>
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
          {tocSection.content.split('\n').map((line, idx) => {
            const trimmed = line.trim()
            if (!trimmed || trimmed.startsWith('#') || trimmed === '')
              return null

            // Check for main sections (numbered like "1." or "Appendices")
            const isMainSection =
              trimmed.match(/^[-•*]\s*\d+\.\s/) ||
              trimmed.match(/^[-•*]\s*Appendices/i)
            // Check for subsections (indented with spaces or dashes)
            const isSubSection =
              trimmed.match(/^\s+[-•*]/) || trimmed.match(/^[-•*]\s+\d+\.\d+/)

            // Extract text and page number
            const pageMatch = trimmed.match(/[-–—]\s*Page\s+(\d+)$/i)
            const pageNum = pageMatch ? pageMatch[1] : ''
            const text = trimmed
              .replace(/[-–—]\s*Page\s+\d+$/i, '')
              .replace(/^[-•*]\s*/, '')
              .trim()

            if (!text) return null

            if (isMainSection) {
              return (
                <View key={`toc-${idx}`} style={styles.tocItemMain}>
                  <Text style={styles.tocItemMainText}>{text}</Text>
                  {pageNum && (
                    <Text style={styles.tocItemMainPage}>{pageNum}</Text>
                  )}
                </View>
              )
            } else if (isSubSection) {
              return (
                <View key={`toc-${idx}`} style={styles.tocItem}>
                  <Text style={styles.tocItemText}>{text}</Text>
                  {pageNum && <Text style={styles.tocItemPage}>{pageNum}</Text>}
                </View>
              )
            }
            return null
          })}

          {/* Footer with beautiful page number */}
          <View style={styles.contentFooter} fixed>
            <View style={styles.contentFooterDivider} />
            <View style={styles.contentFooterContent}>
              <Text style={styles.contentFooterText}>
                AI Penetration Test Report {data.domain} -{' '}
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
          Critical information handling and data protection guidelines
        </Text>

        {/* Summary Box */}
        <View style={styles.confidentialityBox}>
          <Text style={styles.confidentialityBoxTitle}>
            CONFIDENTIALITY OVERVIEW
          </Text>
          <View style={styles.confidentialityDivider} />
          <Text style={styles.confidentialityBoxText}>
            This penetration test report has been prepared for the exclusive use
            of{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            . The report contains sensitive security information, including
            identified vulnerabilities, system configurations, and detailed
            remediation recommendations. All information contained herein is
            considered confidential and proprietary to{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            .
          </Text>
        </View>

        {/* Urgent Section */}
        <View style={styles.confidentialityBoxUrgent}>
          <Text style={styles.confidentialityBoxTitleUrgent}>
            ⚠ CRITICAL HANDLING REQUIREMENTS
          </Text>
          <Text style={styles.confidentialityBoxText}>
            This report contains highly sensitive security information that
            could be exploited if disclosed to unauthorized parties.{' '}
            <Text style={styles.confidentialityBoxTextBold}>
              Immediate action is required
            </Text>{' '}
            to secure this document and limit access to authorized personnel
            only. Unauthorized disclosure could compromise{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            's security posture and enable attackers to exploit identified
            vulnerabilities.
          </Text>
        </View>

        {/* Report Purpose Box */}
        <View style={styles.confidentialityBox}>
          <Text style={styles.confidentialityBoxTitle}>
            REPORT PURPOSE AND USAGE
          </Text>
          <View style={styles.confidentialityDivider} />
          <Text style={styles.confidentialityBoxText}>
            This comprehensive penetration test report is designed to assist{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>{' '}
            in understanding their security posture, identifying
            vulnerabilities, and prioritizing remediation efforts. The report
            includes actionable recommendations tailored to{' '}
            <Text style={styles.confidentialityBoxTextBold}>{data.domain}</Text>
            's specific environment, risk tolerance, and business requirements.
            The findings and recommendations are based on industry best
            practices, security frameworks, and real-world attack scenarios
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
              AI Penetration Test Report {data.domain} -{' '}
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

            // Check if this is Risk Trend Analysis section - more flexible detection
            const contentLower = String(s.content).toLowerCase()
            const isRiskTrendSection =
              titleLower.includes('risk trend') ||
              titleLower.includes('trend analysis') ||
              titleLower.includes('5.6') ||
              (titleLower.includes('risk') && titleLower.includes('trend')) ||
              contentLower.includes('risk trend analysis') ||
              contentLower.includes('trend analysis indicates')

            return (
              <View key={s.key} wrap={false}>
                {/* Section title */}
                <Text style={styles.sectionTitle} wrap>
                  {s.title}
                </Text>
                {/* Render severity graph for Risk Trend Analysis section - right after title */}
                {isRiskTrendSection && (
                  <View
                    style={{ marginTop: 12, marginBottom: 20 }}
                    wrap={false}
                  >
                    <SeverityTrendGraph
                      severitySummary={data.severitySummary}
                    />
                  </View>
                )}
                <View wrap={false}>
                  {/* Special rendering for Roadmap and Priority Matrix sections */}
                  {(isRoadmapSection || isPriorityMatrixSection) && (
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

                          // Detect priority matrix
                          const priorityMatch = trimmed.match(
                            /^\*\*(Critical|High|Medium|Low)\s*\(([^)]+)\):\*\*/i
                          )
                          if (priorityMatch && isPriorityMatrixSection) {
                            const priority = priorityMatch[1]
                            const timeframe = priorityMatch[2]
                            const priorityContent: string[] = []
                            let i = lineIdx + 1
                            while (
                              i < contentLines.length &&
                              contentLines[i] &&
                              !contentLines[i]
                                ?.trim()
                                .match(/^\*\*(Critical|High|Medium|Low)\s*\(/i)
                            ) {
                              const nextLine = contentLines[i]?.trim()
                              if (
                                nextLine &&
                                (nextLine.startsWith('-') ||
                                  nextLine.startsWith('*'))
                              ) {
                                priorityContent.push(
                                  nextLine.replace(/^[-*]\s*/, '')
                                )
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

                        // Render priority matrix cards
                        otherContent
                          .filter((c) => c.type === 'priority')
                          .forEach((item) => {
                            const { priority, timeframe, content } = item.data
                            rendered.push(
                              <View
                                key={`priority-${item.lineIdx}`}
                                style={styles.priorityMatrixCard}
                                wrap={false}
                              >
                                <Text style={styles.priorityMatrixTitle}>
                                  {priority} ({timeframe})
                                </Text>
                                {content.map((text: string, idx: number) => (
                                  <Text
                                    key={idx}
                                    style={styles.priorityMatrixText}
                                    wrap
                                  >
                                    • {text}
                                  </Text>
                                ))}
                              </View>
                            )
                          })

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
                  {/* Process regular content - skip if cards were already rendered for roadmap/priority sections */}
                  {!isRoadmapSection &&
                    !isPriorityMatrixSection &&
                    processedContent.map((item) => {
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
                                            severityValue.includes(
                                              'CRITICAL'
                                            ) ||
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
                                          }
                                        }
                                      }
                                    }

                                    // Detect if this is a glossary table (Term/Definition columns)
                                    const isGlossaryTable =
                                      rows.length > 0 &&
                                      rows[0]?.some(
                                        (header: string) =>
                                          header
                                            .toLowerCase()
                                            .includes('term') ||
                                          header
                                            .toLowerCase()
                                            .includes('definition')
                                      )

                                    // For glossary tables, make first column narrower (30% vs 70%)
                                    const adjustedCellStyle =
                                      isGlossaryTable &&
                                      cellIndex === 0 &&
                                      rows.length > 0
                                        ? [
                                            ...(Array.isArray(cellStyle)
                                              ? cellStyle
                                              : [cellStyle]),
                                            { flex: 0.3 },
                                          ]
                                        : isGlossaryTable &&
                                          cellIndex === 1 &&
                                          rows.length > 0
                                        ? [
                                            ...(Array.isArray(cellStyle)
                                              ? cellStyle
                                              : [cellStyle]),
                                            { flex: 1.7 },
                                          ]
                                        : cellStyle

                                    return (
                                      <View
                                        key={`${item.key}-cell-${rowIndex}-${cellIndex}`}
                                        style={adjustedCellStyle}
                                        wrap={false}
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
                                                    ) ||
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
                                                  }
                                                }
                                              }
                                            }

                                            // Detect if this is a glossary table (Term/Definition columns)
                                            const isGlossaryTable =
                                              tableRows.length > 0 &&
                                              tableRows[0]?.some(
                                                (header: string) =>
                                                  header
                                                    .toLowerCase()
                                                    .includes('term') ||
                                                  header
                                                    .toLowerCase()
                                                    .includes('definition')
                                              )

                                            // For glossary tables, make first column narrower (30% vs 70%)
                                            const adjustedCellStyle =
                                              isGlossaryTable &&
                                              cellIndex === 0 &&
                                              tableRows.length > 0
                                                ? [
                                                    ...(Array.isArray(cellStyle)
                                                      ? cellStyle
                                                      : [cellStyle]),
                                                    { flex: 0.3 },
                                                  ]
                                                : isGlossaryTable &&
                                                  cellIndex === 1 &&
                                                  tableRows.length > 0
                                                ? [
                                                    ...(Array.isArray(cellStyle)
                                                      ? cellStyle
                                                      : [cellStyle]),
                                                    { flex: 1.7 },
                                                  ]
                                                : cellStyle

                                            return (
                                              <View
                                                key={`${item.key}-cell-${rowIndex}-${cellIndex}`}
                                                style={adjustedCellStyle}
                                                wrap={false}
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

                      const processed = processMarkdownLine(line)

                      // Check if this is a Severity or Priority field with pill styling
                      const severityMatch = line.match(
                        /^\*\*Severity:\*\*\s*(Critical|High|Medium|Low)/i
                      )
                      const priorityMatch = line.match(
                        /^\*\*Priority:\*\*\s*(Critical|High|Medium|Low)/i
                      )
                      const riskRatingMatch = line.match(
                        /Overall Risk Rating:\s*(Critical|High|Medium|Low)/i
                      )

                      if (severityMatch || priorityMatch || riskRatingMatch) {
                        const match =
                          severityMatch || priorityMatch || riskRatingMatch
                        let label = 'Severity'
                        if (priorityMatch) label = 'Priority'
                        if (riskRatingMatch) label = 'Overall Risk Rating'

                        const value = match?.[1] || ''
                        const valueLower = value.toLowerCase()

                        // Determine pill style based on value
                        let pillStyle = styles.sevMedium // Default
                        if (
                          valueLower === 'critical' ||
                          valueLower === 'high'
                        ) {
                          pillStyle = styles.sevHigh
                        } else if (valueLower === 'medium') {
                          pillStyle = styles.sevMedium
                        } else if (valueLower === 'low') {
                          pillStyle = styles.sevLow
                        }

                        // Capitalize the value (Title Case)
                        const valueDisplay =
                          value.charAt(0).toUpperCase() +
                          value.slice(1).toLowerCase()

                        return (
                          <View
                            key={item.key}
                            style={{
                              marginBottom: 10,
                              flexDirection: 'row',
                              alignItems: 'center',
                              flexWrap: 'nowrap',
                            }}
                            wrap={false}
                          >
                            <View
                              style={pillStyle || styles.sevMedium}
                              wrap={false}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  fontFamily: 'Helvetica',
                                  color: (pillStyle || styles.sevMedium).color,
                                  lineHeight: 1,
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
                              marginBottom: 2,
                              marginTop: processed.level <= 3 ? 8 : 4,
                            }}
                            wrap={false}
                          >
                            <Text style={headingStyle} wrap>
                              {processed.text}
                            </Text>
                          </View>
                        )
                      }
                      if (processed.isBullet && processed.text) {
                        return processed.isBold ? (
                          <View
                            key={item.key}
                            style={{ marginBottom: 6 }}
                            wrap={false}
                          >
                            <Text
                              style={[styles.bulletPoint, styles.boldText]}
                              wrap
                            >
                              • {processed.text}
                            </Text>
                          </View>
                        ) : (
                          <View
                            key={item.key}
                            style={{ marginBottom: 6 }}
                            wrap={false}
                          >
                            <Text style={styles.bulletPoint} wrap>
                              • {processed.text}
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
                              style={{ marginBottom: 10 }}
                              wrap={false}
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

                      // Regular text - always use font weight 400
                      return (
                        <View
                          key={item.key}
                          style={{ marginBottom: 8 }}
                          wrap={false}
                        >
                          <Text style={styles.paragraph} wrap>
                            {processed.text}
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
              AI Penetration Test Report {data.domain} -{' '}
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
