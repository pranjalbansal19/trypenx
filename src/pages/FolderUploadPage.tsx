import { useState, useRef } from 'react'
import {
  Upload,
  FileText,
  FolderOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Download,
  Bug,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { ReportPdf } from '../components/report/ReportPdf'
import { getBrandingFromHostname } from '../utils/branding'
import type { DomainFile } from '../utils/fileReader'
import type { PreparedReportData } from '../services/reports'
import {
  generateExecutiveSummary,
  isAIConfigured,
} from '../services/aiProcessor'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface FolderStructure {
  files: DomainFile[]
  folderName: string
}

export function FolderUploadPage() {
  const [dragActive, setDragActive] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [validation, setValidation] = useState<ValidationResult | null>(null)
  const [folderData, setFolderData] = useState<FolderStructure | null>(null)
  const [reportData, setReportData] = useState<PreparedReportData | null>(null)
  const [processing, setProcessing] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [filesReady, setFilesReady] = useState(false)
  const [showDebug, setShowDebug] = useState(false)
  type DebugFileInfo = {
    fileName: string
    path: string
    size: number
    type: string
    contentLength: number
    fullContent: string
    readSuccess: boolean
    readError?: string
  }
  const [debugInfo, setDebugInfo] = useState<DebugFileInfo[]>([])
  const [expandedFiles, setExpandedFiles] = useState<Set<number>>(new Set())
  const [copiedFileIndex, setCopiedFileIndex] = useState<number | null>(null)
  const [selectedLogo, setSelectedLogo] = useState<
    'cybersentry' | 'onecom' | 'cybersentry-x-hosted'
  >('cybersentry')
  const [pentestType, setPentestType] = useState<'aggressive' | 'soft'>('soft')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const branding = getBrandingFromHostname(window.location.hostname)

  // Helper function to check if a file is text-readable
  function isTextReadableFile(fileName: string): boolean {
    const name = fileName.toLowerCase()
    const textExtensions = [
      '.md',
      '.txt',
      '.xml',
      '.json',
      '.py',
      '.sh',
      '.html',
      '.htm',
      '.yaml',
      '.yml',
      '.js',
      '.jsx',
      '.ts',
      '.tsx',
      '.css',
      '.csv',
      '.log',
      '.rc',
      '.conf',
      '.config',
      '.ini',
      '.env',
      '.sql',
      '.php',
      '.rb',
      '.go',
      '.java',
      '.cpp',
      '.c',
      '.h',
      '.hpp',
      '.cs',
      '.swift',
      '.kt',
      '.scala',
      '.rs',
      '.pl',
      '.lua',
      '.r',
      '.m',
      '.mm',
      '.vue',
      '.svelte',
      '.less',
      '.scss',
      '.sass',
      '.styl',
      '.toml',
      '.properties',
      '.gitignore',
      '.dockerfile',
      '.makefile',
      '.cmake',
      '.gradle',
      '.maven',
      '.pom',
      '.xml',
      '.xhtml',
      '.svg',
      '.graphql',
      '.gql',
    ]
    return textExtensions.some((ext) => name.endsWith(ext))
  }

  // Helper function to check if a file is binary (should be skipped)
  function isBinaryFile(fileName: string): boolean {
    const name = fileName.toLowerCase()
    const binaryExtensions = [
      '.png',
      '.jpg',
      '.jpeg',
      '.gif',
      '.bmp',
      '.ico',
      '.webp', // Note: .svg is text-based, handled separately
      '.pcap',
      '.bin',
      '.exe',
      '.dll',
      '.so',
      '.dylib',
      '.a',
      '.lib',
      '.zip',
      '.tar',
      '.gz',
      '.bz2',
      '.xz',
      '.7z',
      '.rar',
      '.deb',
      '.rpm',
      '.sqlite',
      '.db',
      '.sqlite3',
      '.mdb',
      '.accdb',
      '.pdf',
      '.doc',
      '.docx',
      '.xls',
      '.xlsx',
      '.ppt',
      '.pptx',
      '.mp3',
      '.mp4',
      '.avi',
      '.mov',
      '.wmv',
      '.flv',
      '.mkv',
      '.woff',
      '.woff2',
      '.ttf',
      '.otf',
      '.eot',
    ]
    return binaryExtensions.some((ext) => name.endsWith(ext))
  }

  function validateFolderStructure(files: File[]): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Filter out .DS_Store and other system files
    const validFiles = files.filter((f) => {
      const name = f.name.toLowerCase()
      return (
        !name.endsWith('.ds_store') &&
        name !== '.ds_store' &&
        name !== 'thumbs.db' &&
        name !== 'desktop.ini'
      )
    })

    // Check if we have files after filtering
    if (validFiles.length === 0) {
      return {
        valid: false,
        errors: ['No valid files found in folder'],
        warnings: [],
      }
    }

    // Extract folder paths (only from valid files)
    const paths = validFiles.map((f) => (f as any).webkitRelativePath || f.name)

    // Check for report/ folder (optional - just a warning)
    const hasReportFolder = paths.some(
      (p) => p.startsWith('report/') || p.includes('/report/')
    )
    if (!hasReportFolder) {
      warnings.push(
        'No "report/" folder found. Any folder structure is supported.'
      )
    }

    // Check for target_*/recon/ folder (optional - just a warning)
    const hasTargetRecon = paths.some(
      (p) =>
        (p.includes('target_') && p.includes('/recon/')) ||
        p.match(/target_\w+\/recon\//)
    )
    if (!hasTargetRecon) {
      warnings.push(
        'No "target_*/recon/" folder structure found. Any folder structure is supported.'
      )
    }

    // Check for text-readable files
    const textFiles = validFiles.filter((f) => isTextReadableFile(f.name))
    const binaryFiles = validFiles.filter((f) => isBinaryFile(f.name))
    const unknownFiles = validFiles.filter(
      (f) => !isTextReadableFile(f.name) && !isBinaryFile(f.name)
    )

    if (textFiles.length === 0) {
      warnings.push(
        'No text-readable files found. Only text files will be processed for AI analysis.'
      )
    } else {
      warnings.push(
        `Found ${textFiles.length} text-readable file(s) that will be processed.`
      )
    }

    if (binaryFiles.length > 0) {
      warnings.push(
        `${binaryFiles.length} binary file(s) will be skipped (images, archives, databases, etc.).`
      )
    }

    if (unknownFiles.length > 0) {
      warnings.push(
        `${unknownFiles.length} file(s) with unknown extensions will be attempted to read as text.`
      )
    }

    // All file types are now allowed - no errors for file types
    // We'll process what we can and skip binary files during processing

    return {
      valid: true, // Always valid now - we accept any structure
      errors,
      warnings,
    }
  }

  async function processFiles(files: File[]): Promise<FolderStructure> {
    const domainFiles: DomainFile[] = []
    const debugData: DebugFileInfo[] = []

    console.log('=== FILE PROCESSING DEBUG START ===')
    console.log('Total files received:', files.length)

    // Filter out system files like .DS_Store
    const validFiles = files.filter((f) => {
      const name = f.name.toLowerCase()
      const isValid =
        !name.endsWith('.ds_store') &&
        name !== '.ds_store' &&
        name !== 'thumbs.db' &&
        name !== 'desktop.ini'
      if (!isValid) {
        console.log(`[FILTERED OUT] ${f.name} - System file`)
      }
      return isValid
    })

    console.log('Valid files after filtering:', validFiles.length)

    // Extract folder name from webkitRelativePath (first part before /)
    let folderName = 'uploaded-folder'
    if (validFiles.length > 0 && validFiles[0]) {
      const firstFile = validFiles[0]
      const firstPath = (firstFile as any).webkitRelativePath || firstFile.name
      console.log('First file path:', firstPath)
      if (firstPath && firstPath.includes('/')) {
        folderName = firstPath.split('/')[0]
      } else if (firstFile.name) {
        // If no path, try to get from parent directory name or use filename
        folderName = firstFile.name.split('.')[0] || 'uploaded-folder'
      }
    }
    console.log('Extracted folder name:', folderName)

    // Process each file with detailed logging
    for (const file of validFiles) {
      const path = (file as any).webkitRelativePath || file.name
      const fileName = file.name.toLowerCase()

      // Skip binary files
      if (isBinaryFile(file.name)) {
        console.log(`\n--- Skipping Binary File: ${file.name} ---`)
        const fileInfo: DebugFileInfo = {
          fileName: file.name,
          path: path,
          size: file.size,
          type: file.type || 'binary',
          contentLength: 0,
          fullContent: '',
          readSuccess: false,
          readError: 'Binary file - skipped',
        }
        debugData.push(fileInfo)
        continue
      }

      const isMarkdown = fileName.endsWith('.md')
      const isXml = fileName.endsWith('.xml')
      const isJson = fileName.endsWith('.json')
      const isPython = fileName.endsWith('.py')
      const isShell = fileName.endsWith('.sh')
      const isHtml = fileName.endsWith('.html') || fileName.endsWith('.htm')
      const isYaml = fileName.endsWith('.yaml') || fileName.endsWith('.yml')
      const isJavaScript = fileName.endsWith('.js') || fileName.endsWith('.jsx')
      const isCss = fileName.endsWith('.css')
      const isCsv = fileName.endsWith('.csv')
      const isLog = fileName.endsWith('.log')

      const fileInfo: DebugFileInfo = {
        fileName: file.name,
        path: path,
        size: file.size,
        type:
          file.type ||
          (isMarkdown
            ? 'text/markdown'
            : isXml
            ? 'application/xml'
            : isJson
            ? 'application/json'
            : 'text/plain'),
        contentLength: 0,
        fullContent: '',
        readSuccess: false,
        readError: undefined,
      }

      console.log(`\n--- Processing File: ${file.name} ---`)
      console.log('  Path:', path)
      console.log('  Size:', file.size, 'bytes')
      console.log('  Type:', file.type || 'unknown')
      console.log('  Is Markdown:', isMarkdown)
      console.log('  Is XML:', isXml)
      console.log('  Is Text Readable:', isTextReadableFile(file.name))

      try {
        const content = await file.text()
        const contentLength = content.length
        fileInfo.contentLength = contentLength
        fileInfo.readSuccess = true
        fileInfo.fullContent = content // Store full content for debug panel

        console.log('  ✓ Read successfully')
        console.log('  Content length:', contentLength, 'characters')
        console.log(
          '  Content preview (first 200 chars):',
          content.substring(0, 200)
        )
        console.log(
          '  Content ends with:',
          content.substring(Math.max(0, content.length - 100))
        )

        // Check for potential issues
        if (contentLength === 0) {
          console.warn('  ⚠ WARNING: File content is empty!')
        }
        if (contentLength !== file.size && file.size > 0) {
          console.warn(
            `  ⚠ WARNING: Content length (${contentLength}) doesn't match file size (${file.size})`
          )
        }

        // Determine file type for DomainFile
        let fileType: 'markdown' | 'text' | 'xml' = 'text'
        if (isMarkdown) {
          fileType = 'markdown'
        } else if (isXml) {
          fileType = 'xml'
        } else {
          fileType = 'text' // All other text files are treated as 'text'
        }

        domainFiles.push({
          path,
          content,
          type: fileType,
        })
      } catch (error: any) {
        fileInfo.readSuccess = false
        fileInfo.readError = error.message || 'Unknown error'
        console.error(`  ✗ Error reading file ${file.name}:`, error)
        console.error('  Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name,
        })
      }

      debugData.push(fileInfo)
    }

    console.log('\n=== FILE PROCESSING DEBUG END ===')
    console.log('Successfully processed files:', domainFiles.length)
    console.log('Total debug entries:', debugData.length)

    // Set debug info for UI display
    setDebugInfo(debugData)

    return { files: domainFiles, folderName }
  }

  // Parse AI summary into sections based on markdown headings
  function parseAISummaryIntoSections(
    summary: string
  ): Array<{ key: string; title: string; content: string }> {
    const sections: Array<{ key: string; title: string; content: string }> = []
    const lines = summary.split('\n')
    let currentSection: { title: string; content: string } | null = null

    for (const line of lines) {
      const trimmed = line.trim()

      // Skip empty lines or markdown code fences
      if (!trimmed || trimmed.startsWith('```')) {
        continue
      }

      // Check for markdown headings (order matters: check ### before ## before #)
      if (trimmed.startsWith('### ')) {
        // Save previous section
        if (currentSection && currentSection.content.trim()) {
          sections.push({
            key: `section-${sections.length}`,
            title: currentSection.title,
            content: currentSection.content.trim(),
          })
        }
        // Start new section
        currentSection = {
          title: trimmed.substring(4).trim(),
          content: '',
        }
      } else if (trimmed.startsWith('## ')) {
        // Save previous section
        if (currentSection && currentSection.content.trim()) {
          sections.push({
            key: `section-${sections.length}`,
            title: currentSection.title,
            content: currentSection.content.trim(),
          })
        }
        // Start new section
        currentSection = {
          title: trimmed.substring(3).trim(),
          content: '',
        }
      } else if (trimmed.startsWith('# ')) {
        // Main title - treat as first section
        if (currentSection && currentSection.content.trim()) {
          sections.push({
            key: `section-${sections.length}`,
            title: currentSection.title,
            content: currentSection.content.trim(),
          })
        }
        currentSection = {
          title: trimmed.substring(2).trim(),
          content: '',
        }
      } else if (currentSection) {
        // Add content to current section
        currentSection.content += (currentSection.content ? '\n' : '') + line
      }
    }

    // Add last section if it has content
    if (currentSection && currentSection.content.trim()) {
      sections.push({
        key: `section-${sections.length}`,
        title: currentSection.title,
        content: currentSection.content.trim(),
      })
    }

    // If no sections found, create one with full summary
    if (sections.length === 0) {
      sections.push({
        key: 'ai-summary',
        title: 'AI-Generated Executive Summary',
        content: summary,
      })
    }

    return sections
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)
    console.log('=== FILE UPLOAD DEBUG ===')
    console.log('Total files uploaded:', fileArray.length)
    console.log(
      'Files list:',
      fileArray.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        webkitRelativePath: (f as any).webkitRelativePath || 'N/A',
      }))
    )

    setProcessing(true)
    setUploadedFiles(fileArray)

    // Validate structure
    const validationResult = validateFolderStructure(fileArray)
    setValidation(validationResult)
    console.log('Validation result:', validationResult)

    if (validationResult.valid) {
      // Process files - just read them, don't send to AI yet
      const folderStructure = await processFiles(fileArray)
      setFolderData(folderStructure)
      setFilesReady(true)
      console.log(
        'Files processed successfully:',
        folderStructure.files.length,
        'files for',
        folderStructure.folderName
      )
      console.log(
        'Total content length:',
        folderStructure.files.reduce((sum, f) => sum + f.content.length, 0),
        'characters'
      )
    } else {
      console.error('Validation failed, files not processed')
    }

    setProcessing(false)
    console.log('=== FILE UPLOAD DEBUG END ===')
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      handleFiles(e.target.files)
    }
  }

  async function handleGeneratePDF() {
    if (!folderData) return

    setAiProcessing(true)
    setAiError(null)
    setReportData(null)

    // Check if AI is configured
    if (!isAIConfigured()) {
      setAiError(
        'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.'
      )
      setAiProcessing(false)
      return
    }

    try {
      console.log('=== GENERATING PDF WITH AI ===')
      console.log('Total files being sent to AI:', folderData.files.length)
      console.log(
        'Total content length:',
        folderData.files.reduce((sum, f) => sum + f.content.length, 0),
        'characters'
      )

      const aiResult = await generateExecutiveSummary({
        files: folderData.files,
        folderName: folderData.folderName,
        pentestType: pentestType,
      })

      if (aiResult.success && aiResult.summary) {
        console.log('✓ AI Summary generated successfully')
        console.log('AI Summary length:', aiResult.summary.length, 'characters')
        console.log('Full AI Summary:')
        console.log(aiResult.summary)

        const sections = parseAISummaryIntoSections(aiResult.summary)
        console.log('Parsed into', sections.length, 'sections:')
        sections.forEach((section, idx) => {
          console.log(
            `  Section ${idx + 1}: ${section.title} (${
              section.content.length
            } chars)`
          )
        })

        const report: PreparedReportData = {
          domain: folderData.folderName,
          sections: sections,
          severitySummary: { critical: 0, high: 0, medium: 0, low: 0 },
        }
        setReportData(report)
        console.log('✓ Report data prepared and ready for PDF generation')
      } else {
        console.error('AI conversion failed:', aiResult.error)
        setAiError(aiResult.error || 'AI conversion failed. Please try again.')
      }
    } catch (error: any) {
      console.error('AI Processing Error:', error)
      setAiError(error.message || 'Failed to generate AI summary')
    } finally {
      setAiProcessing(false)
    }
  }

  function resetUpload() {
    setUploadedFiles([])
    setValidation(null)
    setFolderData(null)
    setReportData(null)
    setFilesReady(false)
    setAiError(null)
    setShowDebug(false)
    setDebugInfo([])
    setExpandedFiles(new Set())
    setCopiedFileIndex(null)
    setSelectedLogo('cybersentry') // Reset to default logo
    setPentestType('soft') // Reset to default pen test type
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    console.log('=== Upload Reset ===')
  }

  return (
    <div className="container-max py-12 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Folder to PDF Converter</h1>
        <p className="text-white/70">
          Upload a folder with the pen test report structure to generate a PDF
        </p>
      </div>

      {/* Upload Area */}
      {!folderData && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`glass rounded-xl p-12 border-2 border-dashed transition-colors ${
            dragActive ? 'border-brand bg-brand/10' : 'border-white/20'
          }`}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <FolderOpen size={64} className="text-brand" />
            <div>
              <h3 className="text-xl font-semibold mb-2">
                Drop your folder here
              </h3>
              <p className="text-white/70 mb-4">
                Or click to browse for a folder
              </p>
              <p className="text-sm text-white/50">
                Any folder structure is supported. Text files will be processed
                for AI analysis.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              {...({ webkitdirectory: '' } as any)}
              multiple
              onChange={handleFileInput}
              className="hidden"
              id="folder-input"
            />
            <label
              htmlFor="folder-input"
              className="btn btn-primary cursor-pointer"
            >
              <Upload size={16} /> Select Folder
            </label>
          </div>
        </div>
      )}

      {/* Validation Results */}
      {validation && (
        <div className="glass rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            {validation.valid ? (
              <CheckCircle2 size={24} className="text-green-400" />
            ) : (
              <XCircle size={24} className="text-red-400" />
            )}
            <h3 className="text-lg font-semibold">
              {validation.valid
                ? 'Folder Structure Valid'
                : 'Validation Failed'}
            </h3>
          </div>
          {validation.errors.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-red-400 mb-2">Errors:</p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
                {validation.errors.map((error, idx) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          {validation.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-400 mb-2">
                Warnings:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-white/70">
                {validation.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* File Processing Indicator */}
      {processing && !filesReady && (
        <div className="glass rounded-xl p-6 flex flex-col items-center gap-3 border border-brand/30">
          <div className="flex items-center gap-3">
            <Loader2 size={24} className="animate-spin text-brand" />
            <span className="font-medium">Reading and processing files...</span>
          </div>
          <p className="text-sm text-white/60 text-center">
            Validating folder structure and reading file contents. This may take
            a few seconds.
          </p>
        </div>
      )}

      {/* AI Processing Indicator */}
      {aiProcessing && (
        <div className="glass rounded-xl p-8 flex flex-col items-center gap-4 border-2 border-brand/50 bg-brand/5">
          <div className="flex items-center gap-3">
            <Loader2 size={32} className="animate-spin text-brand" />
            <span className="text-lg font-semibold">
              AI Processing Your Data
            </span>
          </div>
          <p className="text-sm text-white/70 text-center max-w-lg">
            Sending processed files to AI with detailed prompt. AI is analyzing
            your penetration test data and generating a comprehensive 4-5 page
            professional summary report...
          </p>
          <p className="text-xs text-white/50">
            This may take 1-2 minutes. Please wait...
          </p>
        </div>
      )}

      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 &&
        !processing &&
        (() => {
          // Filter out system files for display
          const validFiles = uploadedFiles.filter((f) => {
            const name = f.name.toLowerCase()
            return (
              !name.endsWith('.ds_store') &&
              name !== '.ds_store' &&
              name !== 'thumbs.db' &&
              name !== 'desktop.ini'
            )
          })

          return (
            <div className="glass rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Uploaded Files ({validFiles.length})
                </h3>
                <button
                  onClick={resetUpload}
                  className="btn btn-outline text-sm"
                >
                  Reset
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {validFiles.slice(0, 20).map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-white/70"
                  >
                    <FileText size={16} />
                    <span className="truncate">
                      {(file as any).webkitRelativePath || file.name}
                    </span>
                  </div>
                ))}
                {validFiles.length > 20 && (
                  <p className="text-sm text-white/50">
                    ... and {validFiles.length - 20} more files
                  </p>
                )}
              </div>
            </div>
          )
        })()}

      {/* Files Processed Successfully - Ready for PDF Generation */}
      {filesReady && !reportData && validation?.valid && !processing && (
        <div className="glass rounded-xl p-8 border-2 border-green-400/30 bg-green-400/5">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={48} className="text-green-400" />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-green-400">
                  Files Successfully Processed!
                </h3>
                <p className="text-sm text-white/80">
                  {folderData?.files.length || 0} files read and ready for PDF
                  generation
                </p>
              </div>
            </div>

            {/* Processed Files Summary */}
            {folderData && folderData.files.length > 0 && (
              <div className="w-full max-w-2xl space-y-4">
                <p className="text-sm font-medium text-white/90 mb-2">
                  Processed Files Preview:
                </p>
                <div className="bg-black/20 rounded-lg p-4 max-h-48 overflow-y-auto space-y-1">
                  {folderData.files.slice(0, 10).map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-xs text-white/70"
                    >
                      <FileText size={14} className="text-brand" />
                      <span className="truncate">{file.path}</span>
                      <span className="text-white/40">
                        ({file.content.length} chars)
                      </span>
                    </div>
                  ))}
                  {folderData.files.length > 10 && (
                    <p className="text-xs text-white/50 pt-2">
                      ... and {folderData.files.length - 10} more files
                    </p>
                  )}
                </div>

                {/* Debug Panel Toggle */}
                <button
                  onClick={() => setShowDebug(!showDebug)}
                  className="w-full flex items-center justify-between p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Bug size={16} className="text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">
                      {showDebug ? 'Hide' : 'Show'} Debug Information
                    </span>
                  </div>
                  {showDebug ? (
                    <ChevronUp size={16} className="text-yellow-400" />
                  ) : (
                    <ChevronDown size={16} className="text-yellow-400" />
                  )}
                </button>
              </div>
            )}

            <div className="w-full max-w-md border-t border-white/10 pt-6 space-y-4">
              {/* Pen Test Type Selection */}
              <div className="w-full">
                <p className="text-sm font-medium text-white/90 mb-3">
                  Select Penetration Test Type:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setPentestType('soft')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      pentestType === 'soft'
                        ? 'border-brand bg-brand/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          pentestType === 'soft'
                            ? 'text-brand'
                            : 'text-white/70'
                        }`}
                      >
                        Soft Pen Test
                      </span>
                      <span className="text-xs text-white/50 text-center">
                        Non-intrusive assessment
                      </span>
                    </div>
                  </button>
                  <button
                    onClick={() => setPentestType('aggressive')}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      pentestType === 'aggressive'
                        ? 'border-brand bg-brand/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          pentestType === 'aggressive'
                            ? 'text-brand'
                            : 'text-white/70'
                        }`}
                      >
                        Aggressive Pen Test
                      </span>
                      <span className="text-xs text-white/50 text-center">
                        Intensive exploitation
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Logo Selection */}
              <div className="w-full">
                <p className="text-sm font-medium text-white/90 mb-3">
                  Select Logo for PDF:
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => setSelectedLogo('cybersentry')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedLogo === 'cybersentry'
                        ? 'border-brand bg-brand/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        selectedLogo === 'cybersentry'
                          ? 'text-brand'
                          : 'text-white/70'
                      }`}
                    >
                      CyberSentry
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedLogo('onecom')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedLogo === 'onecom'
                        ? 'border-brand bg-brand/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`text-sm font-medium ${
                        selectedLogo === 'onecom'
                          ? 'text-brand'
                          : 'text-white/70'
                      }`}
                    >
                      Onecom
                    </span>
                  </button>
                  <button
                    onClick={() => setSelectedLogo('cybersentry-x-hosted')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedLogo === 'cybersentry-x-hosted'
                        ? 'border-brand bg-brand/20'
                        : 'border-white/20 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span
                      className={`text-xs font-medium ${
                        selectedLogo === 'cybersentry-x-hosted'
                          ? 'text-brand'
                          : 'text-white/70'
                      }`}
                    >
                      CyberSentry X HOSTED
                    </span>
                  </button>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-white/70 mb-1">
                  Ready to generate a professional AI-powered PDF report
                </p>
                <p className="text-xs text-white/50">
                  Click the button below to send data to AI for analysis and PDF
                  generation
                </p>
              </div>
              <button
                onClick={handleGeneratePDF}
                disabled={aiProcessing}
                className="btn btn-primary w-full text-lg py-4"
              >
                {aiProcessing ? (
                  <>
                    <Loader2 size={20} className="animate-spin mr-2" />
                    Generating PDF with AI...
                  </>
                ) : (
                  <>
                    <Download size={20} className="mr-2" />
                    Generate PDF with AI
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && debugInfo.length > 0 && (
        <div className="glass rounded-xl p-6 border-2 border-yellow-400/30 bg-yellow-500/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Bug size={20} className="text-yellow-400" />
              <h3 className="text-lg font-semibold text-yellow-400">
                Debug Information
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {debugInfo.length > 0 && (
                <button
                  onClick={() => {
                    if (expandedFiles.size === debugInfo.length) {
                      setExpandedFiles(new Set())
                    } else {
                      setExpandedFiles(new Set(debugInfo.map((_, i) => i)))
                    }
                  }}
                  className="text-xs text-brand hover:text-brand/80 px-2 py-1"
                >
                  {expandedFiles.size === debugInfo.length
                    ? 'Collapse All'
                    : 'Expand All'}
                </button>
              )}
              <button
                onClick={() => setShowDebug(false)}
                className="text-white/60 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="text-sm text-white/70 mb-4">
              <p>
                <strong>Total Files Processed:</strong> {debugInfo.length}
              </p>
              <p>
                <strong>Successfully Read:</strong>{' '}
                {debugInfo.filter((f) => f.readSuccess).length}
              </p>
              <p>
                <strong>Failed to Read:</strong>{' '}
                {debugInfo.filter((f) => !f.readSuccess).length}
              </p>
              <p className="mt-2 text-yellow-400">
                💡 Check browser console (F12) for detailed logs
              </p>
            </div>

            {debugInfo.map((file, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-lg border ${
                  file.readSuccess
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {file.readSuccess ? (
                        <CheckCircle2 size={16} className="text-green-400" />
                      ) : (
                        <XCircle size={16} className="text-red-400" />
                      )}
                      <span className="font-medium text-white">
                        {file.fileName}
                      </span>
                    </div>
                    <p className="text-xs text-white/60 mb-2">{file.path}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-white/50">Size:</span>
                    <span className="ml-1 text-white/80">
                      {file.size} bytes
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50">Type:</span>
                    <span className="ml-1 text-white/80">{file.type}</span>
                  </div>
                  <div>
                    <span className="text-white/50">Content Length:</span>
                    <span
                      className={`ml-1 ${
                        file.readSuccess ? 'text-white/80' : 'text-red-400'
                      }`}
                    >
                      {file.contentLength} chars
                    </span>
                  </div>
                  <div>
                    <span className="text-white/50">Status:</span>
                    <span
                      className={`ml-1 ${
                        file.readSuccess ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {file.readSuccess ? '✓ Read' : '✗ Failed'}
                    </span>
                  </div>
                </div>

                {file.readError && (
                  <div className="mb-2 p-2 bg-red-500/20 rounded text-xs text-red-400">
                    <strong>Error:</strong> {file.readError}
                  </div>
                )}

                {file.readSuccess && file.fullContent && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        const newExpanded = new Set(expandedFiles)
                        if (newExpanded.has(idx)) {
                          newExpanded.delete(idx)
                        } else {
                          newExpanded.add(idx)
                        }
                        setExpandedFiles(newExpanded)
                      }}
                      className="flex items-center gap-2 text-xs text-brand hover:text-brand/80 mb-2"
                    >
                      {expandedFiles.has(idx) ? (
                        <>
                          <ChevronUp size={14} />
                          <span>Hide Full Content</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          <span>
                            Show Full Content ({file.contentLength} chars)
                          </span>
                        </>
                      )}
                    </button>
                    {expandedFiles.has(idx) && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs text-white/50">
                            Full Content ({file.contentLength} characters)
                          </p>
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  file.fullContent
                                )
                                setCopiedFileIndex(idx)
                                setTimeout(() => setCopiedFileIndex(null), 2000)
                              } catch (err) {
                                console.error('Failed to copy:', err)
                              }
                            }}
                            className="text-xs text-brand hover:text-brand/80 transition-colors"
                          >
                            {copiedFileIndex === idx
                              ? '✓ Copied!'
                              : 'Copy to Clipboard'}
                          </button>
                        </div>
                        <pre className="text-xs bg-black/40 p-4 rounded-lg overflow-x-auto max-h-96 overflow-y-auto text-white/90 font-mono border border-white/10 whitespace-pre-wrap break-words">
                          {file.fullContent}
                        </pre>
                      </div>
                    )}
                    {!expandedFiles.has(idx) && (
                      <div className="mt-2">
                        <p className="text-xs text-white/50 mb-1">
                          Content Preview (first 300 chars):
                        </p>
                        <pre className="text-xs bg-black/30 p-2 rounded overflow-x-auto text-white/80 font-mono border border-white/10">
                          {file.fullContent.substring(0, 300)}
                          {file.fullContent.length > 300 && (
                            <span className="text-white/50">
                              {' '}
                              ... (click "Show Full Content" to see all{' '}
                              {file.contentLength} characters)
                            </span>
                          )}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {file.readSuccess &&
                  file.contentLength !== file.size &&
                  file.size > 0 && (
                    <p className="text-xs text-yellow-400 mt-2">
                      ⚠ Warning: Content length ({file.contentLength}) doesn't
                      match file size ({file.size})
                    </p>
                  )}

                {file.readSuccess && file.contentLength === 0 && (
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠ Warning: File appears to be empty
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Error Message */}
      {aiError && (
        <div className="glass rounded-xl p-6 border border-yellow-400/30">
          <div className="flex items-center gap-3">
            <XCircle size={20} className="text-yellow-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-400">
                AI Processing Warning
              </p>
              <p className="text-xs text-white/60 mt-1">{aiError}</p>
            </div>
          </div>
        </div>
      )}

      {/* PDF Ready for Download */}
      {reportData && validation?.valid && !processing && !aiProcessing && (
        <div className="glass rounded-xl p-8 border-2 border-green-400/30 bg-green-400/5">
          <div className="flex flex-col items-center gap-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={48} className="text-green-400" />
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2 text-green-400">
                  PDF Generated Successfully!
                </h3>
                <p className="text-sm text-white/80">
                  AI has analyzed your data and created a beautiful,
                  professional {reportData.sections.length}-section penetration
                  test report
                </p>
              </div>
            </div>

            {/* Report Sections Preview */}
            {reportData.sections.length > 0 && (
              <div className="w-full max-w-2xl">
                <p className="text-sm font-medium text-white/90 mb-3">
                  Report Sections:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {reportData.sections.map((section, idx) => (
                    <div
                      key={idx}
                      className="bg-black/20 rounded-lg p-3 border border-white/10"
                    >
                      <p className="text-xs font-medium text-brand mb-1">
                        {section.title}
                      </p>
                      <p className="text-xs text-white/60 line-clamp-2">
                        {section.content.substring(0, 100)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="w-full max-w-md border-t border-white/10 pt-6">
              <PDFDownloadLink
                document={
                  <ReportPdf
                    brandName={branding.name}
                    brandColor={branding.primaryColor}
                    data={reportData}
                    logo={selectedLogo}
                  />
                }
                fileName={`${
                  folderData?.folderName || 'report'
                }-${selectedLogo}.pdf`}
                className="btn btn-primary w-full text-lg py-4"
              >
                {({ loading }) => (
                  <>
                    <Download size={20} className="mr-2" />
                    {loading
                      ? 'Preparing PDF Download...'
                      : 'Download Beautiful PDF Report'}
                  </>
                )}
              </PDFDownloadLink>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
