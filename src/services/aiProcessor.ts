import type { DomainFile } from '../utils/fileReader'

interface AISummaryRequest {
  files: DomainFile[]
  folderName: string
  pentestType: 'aggressive' | 'soft'
  companyName?: string // Company name for appending at sentence ends (e.g., "onecom.com")
}

interface AISummaryResponse {
  success: boolean
  summary?: string
  error?: string
}

/**
 * Convert folder files content into a 4-5 page professional penetration test summary
 * using OpenAI's API
 */
export async function generateExecutiveSummary(
  request: AISummaryRequest
): Promise<AISummaryResponse> {
  try {
    // Intelligently process files - prioritize important content
    // GPT-4o has ~128k token context (~500k+ characters)
    // We'll use ~300k chars for content, leaving room for prompt (~150k chars) and response (~20k chars)
    const maxContentLength = 300000
    const maxFileSize = 80000 // Max size per individual file before sampling

    // Sort files by importance (reports, summaries first, then logs)
    const filePriority = (file: DomainFile): number => {
      const path = file.path.toLowerCase()
      if (
        path.includes('report') ||
        path.includes('summary') ||
        path.includes('findings')
      )
        return 1
      if (
        path.includes('log') ||
        path.includes('output') ||
        path.includes('scan')
      )
        return 2
      return 3
    }

    const sortedFiles = [...request.files].sort(
      (a, b) => filePriority(a) - filePriority(b)
    )

    // Process files intelligently
    const processedFiles: Array<{
      path: string
      content: string
      wasTruncated: boolean
    }> = []
    let totalLength = 0

    for (const file of sortedFiles) {
      let fileContent = file.content
      let wasTruncated = false

      // If file is very large, intelligently sample it
      if (fileContent.length > maxFileSize) {
        console.log(
          `📄 Large file detected: ${file.path} (${fileContent.length} chars) - sampling intelligently`
        )

        // Strategy: Keep first 40% (headers, important info), sample middle, keep last 30% (conclusions)
        const firstPartSize = Math.floor(maxFileSize * 0.4)
        const lastPartSize = Math.floor(maxFileSize * 0.3)
        const middlePartSize = maxFileSize - firstPartSize - lastPartSize

        const firstPart = fileContent.substring(0, firstPartSize)
        const lastPart = fileContent.substring(
          fileContent.length - lastPartSize
        )

        // Sample middle section more aggressively
        const middleStart = firstPartSize
        const middleEnd = fileContent.length - lastPartSize
        const middleSection = fileContent.substring(middleStart, middleEnd)

        // Extract key lines from middle (lines with keywords like "vulnerability", "finding", "critical", etc.)
        const lines = middleSection.split('\n')
        const importantKeywords = [
          'vulnerability',
          'finding',
          'critical',
          'high',
          'medium',
          'low',
          'severity',
          'cve',
          'exploit',
          'risk',
          'issue',
          'weakness',
        ]
        const importantLines: string[] = []
        const otherLines: string[] = []

        lines.forEach((line) => {
          const lowerLine = line.toLowerCase()
          if (
            importantKeywords.some((keyword) => lowerLine.includes(keyword))
          ) {
            importantLines.push(line)
          } else {
            otherLines.push(line)
          }
        })

        // Keep all important lines, sample other lines
        const sampleRate = Math.max(
          1,
          Math.ceil(otherLines.length / (middlePartSize / 200))
        ) // ~200 chars per line estimate
        const sampledOtherLines = otherLines.filter(
          (_, idx) => idx % sampleRate === 0
        )
        const sampledMiddle = [...importantLines, ...sampledOtherLines].join(
          '\n'
        )

        // Ensure we don't exceed maxFileSize
        if (sampledMiddle.length > middlePartSize) {
          const finalMiddle = sampledMiddle.substring(0, middlePartSize)
          fileContent = `${firstPart}\n\n... [Middle section sampled - showing important lines and every ${sampleRate} other lines] ...\n\n${finalMiddle}\n\n... [Content continues] ...\n\n${lastPart}`
        } else {
          fileContent = `${firstPart}\n\n... [Middle section sampled - showing important lines and every ${sampleRate} other lines] ...\n\n${sampledMiddle}\n\n... [Content continues] ...\n\n${lastPart}`
        }

        wasTruncated = true

        console.log(
          `   ✓ Sampled to ${fileContent.length} chars (${Math.round(
            (fileContent.length / file.content.length) * 100
          )}% of original)`
        )
        console.log(
          `   ✓ Preserved ${importantLines.length} important lines from middle section`
        )
      }

      const fileHeader = `=== ${file.path} ===`
      const fileWithHeader = `${fileHeader}\n${fileContent}`
      const estimatedLength = totalLength + fileWithHeader.length + 2 // +2 for \n\n

      // If adding this file would exceed limit, stop
      if (estimatedLength > maxContentLength && processedFiles.length > 0) {
        console.warn(
          `⚠ Reached content limit. Processed ${processedFiles.length} of ${sortedFiles.length} files.`
        )
        console.warn(
          `   Total content: ${totalLength} chars (limit: ${maxContentLength} chars)`
        )
        break
      }

      processedFiles.push({
        path: file.path,
        content: fileContent,
        wasTruncated,
      })
      totalLength = estimatedLength
    }

    // Combine processed files
    const contentToSend = processedFiles
      .map(
        (file) =>
          `=== ${file.path}${file.wasTruncated ? ' [SAMPLED]' : ''} ===\n${
            file.content
          }`
      )
      .join('\n\n')

    // Log processing summary
    request.files.forEach((file, idx) => {
      console.log(`\nFile ${idx + 1}: ${file.path}`)
      console.log(`  Type: ${file.type}`)
      console.log(`  Content length: ${file.content.length} characters`)
      const processed = processedFiles.find((f) => f.path === file.path)
      if (processed?.wasTruncated) {
        console.log(`  ⚠ File was sampled/truncated for processing`)
      }
    })

    console.log(`\n✓ Content processing complete:`)
    console.log(`   - Total files: ${request.files.length}`)
    console.log(`   - Files processed: ${processedFiles.length}`)
    console.log(`   - Total content length: ${contentToSend.length} characters`)
    console.log(`   - Content limit: ${maxContentLength} characters`)
    if (contentToSend.length > maxContentLength * 0.9) {
      console.warn(
        `   ⚠ Content is near limit (${Math.round(
          (contentToSend.length / maxContentLength) * 100
        )}%)`
      )
    }
    if (processedFiles.some((f) => f.wasTruncated)) {
      const truncatedCount = processedFiles.filter((f) => f.wasTruncated).length
      console.warn(
        `   ⚠ ${truncatedCount} file(s) were sampled/truncated due to size`
      )
    }
    if (processedFiles.length < request.files.length) {
      console.warn(
        `   ⚠ ${
          request.files.length - processedFiles.length
        } file(s) were skipped due to content limit`
      )
    }

    // Get today's date for replacement in content
    const today = new Date()
    const todayFormatted = today.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    const todayFormattedShort = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })

    // Get the penetration test type description
    const pentestTypeDescription =
      request.pentestType === 'aggressive'
        ? 'A comprehensive aggressive penetration test was conducted'
        : 'A non-intrusive external vulnerability scan was conducted'

    const pentestTypeContext =
      request.pentestType === 'aggressive'
        ? 'This aggressive testing approach simulated real-world attack scenarios with extensive vulnerability exploitation and system stress testing to identify all potential security weaknesses. The testing methodology was thorough and intensive, actively attempting to exploit discovered vulnerabilities to demonstrate real-world impact.'
        : 'This vulnerability scan is a non-intrusive, consent-based external assessment designed to identify potential security hygiene issues. The scan focuses on publicly accessible systems, configurations, and software versions without attempting exploitation or disrupting live systems. This assessment provides early visibility of potential external security exposures and is suitable for regular monitoring and early risk awareness.'

    // Company name for appending at sentence ends
    const companyName = request.companyName || ''
    const companyNameSuffix = companyName ? ` ${companyName}` : ''

    // Extract domain name from folder name
    const domainName = request.folderName || 'the client'

    // Extract severity counts from content for dynamic prompt
    const extractSeverityCounts = (content: string) => {
      const contentLower = content.toLowerCase()
      let critical = 0,
        high = 0,
        medium = 0,
        low = 0

      // Count severity mentions
      critical = (contentLower.match(/\*\*severity:\*\*\s*critical/gi) || [])
        .length
      high = (contentLower.match(/\*\*severity:\*\*\s*high/gi) || []).length
      medium = (contentLower.match(/\*\*severity:\*\*\s*medium/gi) || []).length
      low = (contentLower.match(/\*\*severity:\*\*\s*low/gi) || []).length

      // Also check for table formats
      const tableMatch = content.match(/\|.*severity.*\|.*count.*\|/gi)
      if (tableMatch) {
        const lines = content.split('\n')
        for (const line of lines) {
          const lowerLine = line.toLowerCase()
          if (lowerLine.includes('critical') && line.match(/\|\s*(\d+)\s*\|/)) {
            const match = line.match(/\|\s*(\d+)\s*\|/)
            if (match && match[1])
              critical = Math.max(critical, parseInt(match[1], 10))
          } else if (
            lowerLine.includes('high') &&
            !lowerLine.includes('medium') &&
            line.match(/\|\s*(\d+)\s*\|/)
          ) {
            const match = line.match(/\|\s*(\d+)\s*\|/)
            if (match && match[1]) high = Math.max(high, parseInt(match[1], 10))
          } else if (
            lowerLine.includes('medium') &&
            line.match(/\|\s*(\d+)\s*\|/)
          ) {
            const match = line.match(/\|\s*(\d+)\s*\|/)
            if (match && match[1])
              medium = Math.max(medium, parseInt(match[1], 10))
          } else if (
            lowerLine.includes('low') &&
            line.match(/\|\s*(\d+)\s*\|/)
          ) {
            const match = line.match(/\|\s*(\d+)\s*\|/)
            if (match && match[1]) low = Math.max(low, parseInt(match[1], 10))
          }
        }
      }

      return { critical, high, medium, low }
    }

    const severityProfile = extractSeverityCounts(contentToSend)
    const totalFindings =
      severityProfile.critical +
      severityProfile.high +
      severityProfile.medium +
      severityProfile.low

    // Aggressive mode specific instructions - DYNAMIC SEVERITY-DRIVEN PROMPT
    const aggressiveModeInstructions =
      request.pentestType === 'aggressive'
        ? `
🚨 CRITICAL: AGGRESSIVE PENETRATION TEST MODE - FUNDAMENTALLY DIFFERENT FROM SOFT SCANS

SYSTEM ROLE: You are a Principal Red Team Architect creating long-form enterprise penetration testing reports used by banks, SaaS providers, VPN companies, and regulated industries. You NEVER speculate, never mention AI, and write as if testing was ACTUALLY performed through ACTIVE EXPLOITATION.

⚠️ MANDATORY DIFFERENTIATION FROM SOFT MODE:
- This is NOT a vulnerability scan - this is an AGGRESSIVE PENETRATION TEST
- Content MUST be fundamentally different in tone, depth, and technical detail
- EVERY finding MUST include actual exploitation commands and evidence
- Content must be EXTREMELY descriptive - aim for 5-8 paragraphs per finding minimum
- Show REAL attack scenarios, not theoretical vulnerabilities
- Demonstrate ACTIVE exploitation, not passive scanning

SEVERITY PROFILE DETECTED FROM DATA:
- Critical: ${severityProfile.critical} findings
- High: ${severityProfile.high} findings  
- Medium: ${severityProfile.medium} findings
- Low: ${severityProfile.low} findings
- Total: ${totalFindings} findings

🎚️ SEVERITY-DRIVEN CONTENT ALLOCATION:

${
  severityProfile.critical > 0
    ? `🔴 CRITICAL SEVERITY BEHAVIOR (${severityProfile.critical} findings - 35-40% of report):
- Expand EACH critical finding into MULTI-PAGE deep dives (4-6 pages per finding)
- Include FULL attack chains showing complete breach narratives
- Add "If exploited today" scenarios with realistic timelines
- Executive risk language with board-level warnings
- Immediate remediation timelines (hours/days, not weeks)
- Document complete exploitation methodology with step-by-step procedures
- Include ALL commands, outputs, and evidence in code blocks with black terminal-style background
- Show complete attack path from initial access to data exfiltration
- Business impact: Financial loss, regulatory fines, reputation damage
- Technical impact: Complete system compromise, lateral movement, data breach`
    : '- No critical findings detected - focus on preventive maturity'
}

${
  severityProfile.high > 0
    ? `🟠 HIGH SEVERITY BEHAVIOR (${severityProfile.high} findings - 30-35% of report):
- Detailed technical exploitation with code-level fixes
- Strong education on architectural improvements
- Document exploitation steps with ALL commands in code blocks
- Show how high-severity issues can escalate to critical
- Include remediation with code examples and configuration changes
- Explain attack vectors and exploitation prerequisites`
    : '- No high findings detected'
}

${
  severityProfile.medium > 0
    ? `🟡 MEDIUM SEVERITY BEHAVIOR (${severityProfile.medium} findings - 15-20% of report):
- Educational focus on prevention patterns
- Explain why medium issues often escalate into high/critical
- Group similar findings for efficiency
- Show hardening recommendations`
    : '- No medium findings detected'
}

${
  severityProfile.low > 0
    ? `🟢 LOW SEVERITY BEHAVIOR (${severityProfile.low} findings - 5-10% of report):
- Group similar findings together
- Explain hygiene and best practices
- Keep concise but informative
- Focus on preventive measures`
    : '- No low findings detected'
}

🚨 MANDATORY COMMAND REQUIREMENTS - NON-NEGOTIABLE:
- EVERY SINGLE FINDING in aggressive mode MUST include actual exploitation commands
- Commands are NOT optional - they are MANDATORY for every vulnerability documented
- If commands exist in the data, they MUST be included - NO EXCEPTIONS
- If commands don't exist in the data, you MUST describe what commands WOULD be used to exploit this
- CRITICAL FORMATTING: ALL commands MUST be wrapped in triple backticks on separate lines
- The EXACT format you MUST use is: Start with a line containing only three backticks, then the command and output, then end with a line containing only three backticks
- Example format:
  [Line 1: Three backticks]
  [Line 2: (kali@kali) $ smbclient //[TARGET]/SHARE -U '' -L '' -N -c 'ls']
  [Line 3: Sharename       Type      Comment]
  [Line 4: ---------       ----      ------]
  [Line 5: ACCOUNTING      Disk      ]
  [Line 6: IPC$            IPC       IPC Service]
  [Line 7: Three backticks]
- DO NOT use inline code, DO NOT use single backticks, DO NOT skip the code block formatting
- The triple backticks MUST be on their own separate lines
- Include COMPLETE command outputs exactly as they appear in the data
- Show terminal-style formatting with full command execution context
- Examples of commands that MUST be included:
  - smbclient commands for SMB enumeration (with full output)
  - nmap scans with complete port scan results
  - rpcclient commands for user enumeration (with full output)
  - sqlmap injection commands and results
  - burp suite exploitation steps
  - metasploit module execution
  - Any exploitation commands and their COMPLETE outputs
- This demonstrates REAL aggressive pen testing - actual exploitation, not scanning
- Include ALL command outputs, directory listings, scan results, file contents, and evidence
- Make it crystal clear these are ACTUAL exploitation commands that were executed during testing
- For each finding, show: the command used, the output received, and what it means
- REMEMBER: Code blocks with triple backticks create a premium black background in the PDF - this is essential for the professional look

MULTI-IP DOMAIN TESTING - COMPREHENSIVE DOCUMENTATION:
- CRITICAL: The uploaded folder contains penetration test data from MULTIPLE DIFFERENT IP ADDRESSES all belonging to the SAME DOMAIN
- Each IP address represents a COMPLETELY SEPARATE and DISTINCT attack surface
- Document findings for EACH IP address individually with EXTENSIVE detail
- Create dedicated sections for each IP: "IP Address [X.X.X.X] Analysis"
- Show attack surface diversity - explain how different IPs expose different vulnerabilities
- Document potential attack paths between different IPs
- For each IP, provide: complete port scan results, service enumeration, vulnerability assessment, exploitation results

REPORT STRUCTURE REQUIREMENTS (14-15 pages minimum):
1. Executive Summary (2-3 pages):
   ${
     severityProfile.critical > 0
       ? '- Board-level warning section with breach scenarios'
       : '- Risk overview'
   }
   - Severity distribution analysis with detailed breakdown
   - IP-by-IP risk breakdown (if multiple IPs) with attack surface comparison
   - Key findings summary with exploitation evidence highlights
   - Immediate action items with urgency justification

2. Test Scope & Methodology (1-2 pages):
   - Testing approach explanation emphasizing ACTIVE EXPLOITATION
   - Tools and techniques used with specific command examples
   - IP addresses tested with port scan summaries
   - Testing timeline with exploitation phases
   - Methodology differences from passive scanning

3. Attack Surface Analysis (2-3 pages):
   - IP-by-IP analysis with port scan results in tables
   - Service enumeration with version information
   - Network topology implications with attack paths
   - Initial access vectors identified
   - Lateral movement opportunities

4. Detailed Findings (6-10 pages - THIS IS WHERE COMMANDS ARE MANDATORY):
   ${
     severityProfile.critical > 0
       ? `- Each CRITICAL finding: 6-10 paragraphs MINIMUM with:
     * Full attack chain from initial access to data exfiltration
     * MANDATORY: Complete exploitation commands in code blocks
     * MANDATORY: Full command outputs showing successful exploitation
     * Detailed step-by-step exploitation methodology
     * Business impact with financial/regulatory consequences
     * Technical impact with system compromise details
     * Remediation with code examples and configuration changes`
       : ''
   }
   ${
     severityProfile.high > 0
       ? `- Each HIGH finding: 5-8 paragraphs MINIMUM with:
     * Detailed exploitation methodology
     * MANDATORY: Exploitation commands in code blocks
     * MANDATORY: Command outputs showing validation
     * Attack vector explanation
     * Business and technical impact
     * Detailed remediation steps`
       : ''
   }
   ${
     severityProfile.medium > 0
       ? `- MEDIUM findings: 3-5 paragraphs each with:
     * Prevention-focused education
     * MANDATORY: Commands that would exploit this (if not in data, describe them)
     * Escalation risk explanation
     * Hardening recommendations`
       : ''
   }
   ${
     severityProfile.low > 0
       ? `- LOW findings: 2-3 paragraphs grouped together with:
     * Hygiene recommendations
     * Best practices
     * Preventive measures`
       : ''
   }
   - CRITICAL: For EVERY finding, you MUST include:
     * MANDATORY: Actual exploitation commands in code blocks (if in data) OR description of commands that would be used
     * MANDATORY: Complete command outputs (if available) showing what happened
     * Detailed exploitation methodology with step-by-step procedures
     * Full attack chain visualization showing the complete path
     * Business impact with specific consequences
     * Technical impact with system-level details
     * Detailed remediation with code examples, configuration changes, and implementation steps
     * CVE references with CVSS scores and exploitation complexity
     * Proof of concept evidence

5. Risk Assessment (1-2 pages):
   - Risk matrix with severity-based scoring and CVSS calculations
   - Attack chain analysis showing how vulnerabilities chain together
   - Maturity score assessment with industry benchmarks
   - Exploitation likelihood based on actual testing

6. Remediation Roadmap (1-2 pages):
   ${
     severityProfile.critical > 0
       ? '- Extremely detailed with immediate timelines (hours/days)'
       : '- Detailed with priority-based timelines'
   }
   - IP-specific remediation plans with command examples
   - Resource requirements with implementation effort
   - Verification steps with testing commands

7. Appendices (1-2 pages):
   - Technical references with CVE details
   - Framework mappings (OWASP, MITRE ATT&CK, NIST)
   - Glossary of technical terms
   - Command reference guide

WRITING RULES (ENFORCED FOR AGGRESSIVE MODE):
- Enterprise tone - authoritative, expert-level, technical depth
- EXTREMELY descriptive - every finding must be 5-10 paragraphs minimum
- Educational depth - explain WHY vulnerabilities exist, HOW they were exploited, WHAT the impact is
- Show REAL attack scenarios with actual exploitation evidence
- No filler - but be THOROUGHLY descriptive and detailed
- No emojis in content (only in this prompt)
- Tables where useful for structured data (port scans, service enumeration, etc.)
- Markdown formatting, PDF-ready
- MANDATORY: Show REAL aggressive pen testing through ACTUAL commands and evidence
- Make it crystal clear this was an ACTIVE EXPLOITATION test, not passive scanning
- Use technical terminology confidently - this is for technical stakeholders
- Describe attack chains in detail - show the complete path from initial access to compromise
- Include exploitation timelines and realistic attack scenarios

OUTPUT REQUIREMENTS FOR AGGRESSIVE MODE:
- 14-15 pages minimum when exported to PDF
- 10,000-15,000+ words with extensive detail
- Clean headings with proper hierarchy
- Consistent structure throughout
- Executive + technical balance (more technical than soft mode)
- MANDATORY: ALL commands and evidence properly formatted in code blocks
- MANDATORY: Every finding must include exploitation commands or command descriptions
- Show what aggressive pen testing REALLY looks like through actual commands and outputs
- Content must be SUBSTANTIALLY more detailed than soft mode reports
- Each finding section should be 2-3 pages minimum for critical/high findings

`
        : ''

    // Build finding format section based on test type
    const findingTitleFormat =
      request.pentestType === 'aggressive'
        ? '### [Finding Title - Include IP address if applicable]'
        : '### [Finding Title - Use Business-Friendly Language]'

    const severityFormat =
      request.pentestType === 'aggressive'
        ? '**Severity:** [Critical/High/Medium/Low in Title Case] with CVSS score if applicable'
        : '**Observation:** [High/Medium/Low in Title Case] - Use "Observation" instead of "Severity" for vulnerability scans. This indicates a potential exposure level that warrants review, not a confirmed exploitable vulnerability.'

    const descriptionFormat =
      request.pentestType === 'aggressive'
        ? '**Description:** [EXTREMELY DETAILED explanation - at least 8-12 sentences (2-3 paragraphs minimum) with extensive technical detail explaining the security issue, how it works, why it exists, and the technical implications. Include CVE references, CVSS scores, and industry-standard classifications. Describe the vulnerability in depth, explain the root cause, and provide context about how this type of vulnerability is typically exploited in real-world attacks.]'
        : '**Description:** [EXTENSIVE, DETAILED explanation - at least 8-12 sentences (2-3 paragraphs minimum) explaining the security observation in business terms. This must be substantial content that provides real value. CRITICAL LANGUAGE REQUIREMENTS FOR VULNERABILITY SCANS: DO NOT use phrases like "allows unauthenticated remote code execution", "attacker could gain full control", "immediate risk", "system is at risk of total compromise". Instead, use language like: "A version associated with [CVE number] was observed", "Exploitability depends on runtime configuration", "Warrants validation", "May increase exposure if left unreviewed". Frame as potential exposure that warrants review, not confirmed exploitable vulnerability. Include detailed context about what was observed, why it matters, and what it means for the organization.]'

    const technicalDetailsSection =
      request.pentestType === 'aggressive'
        ? '**Technical Details:** [EXTENSIVE technical explanation including: Vulnerability type and classification (OWASP, CWE, etc.), Root cause analysis, Affected components and versions, Technical validation methodology, Exploitation prerequisites]\n'
        : ''

    const whatWasFoundFormat =
      request.pentestType === 'aggressive'
        ? '**What Was Found:** [EXTENSIVE technical explanation (2-3 paragraphs minimum) with detailed evidence, proof-of-concept results, and validation outcomes. Include specific IP addresses, ports, services, and configurations affected. Describe exactly what was discovered during testing, including all technical details, service versions, configurations, and any other relevant information. Show the complete picture of what was found.]'
        : '**What Was Found:** [EXTENSIVE, DETAILED explanation (2-3 paragraphs minimum, 8-12 sentences) of the security observation without technical jargon - use business-friendly descriptions. Include specific details about what was observed, where it was found, and what it indicates. Provide comprehensive context about the finding, its implications, and why it warrants attention. This must be substantial content that provides real value to the reader.]'

    const affectedSystemsFormat =
      request.pentestType === 'aggressive'
        ? '**Affected Systems:** [List affected applications/systems with specific IP addresses, ports, and service versions. Format as a table when multiple systems are affected. Include all IP addresses, ports, and service details from the data.]'
        : '**Affected Systems:** [List affected applications/systems in business terms - Customer portal, Payment system, etc. - not technical names. Format as a table when multiple systems are affected.]'

    const attackSurfaceSection =
      request.pentestType === 'aggressive'
        ? '**Attack Surface:** [Document which IP address(es) are affected and how this expands the attack surface]\n'
        : ''

    const riskScenarioFormat =
      request.pentestType === 'aggressive'
        ? '**Risk Scenario:** [Explain the business risk - what could happen if this is not fixed, including potential attack chains and lateral movement paths. INCLUDE URGENCY: Add factual statements about how quickly such vulnerabilities are discovered and exploited, e.g., "These issues are routinely exploited by automated scanners within days of exposure."]'
        : '**Risk Scenario:** [For vulnerability scans: Frame this as potential risk if left unreviewed, not confirmed exploitable. CRITICAL LANGUAGE REQUIREMENTS: DO NOT use phrases like "severe risk", "business continuity", "data breaches", "complete system compromise", "attacker could", "could lead to". Instead, use conditional, future-looking language like: "If left unreviewed, externally visible misconfigurations and outdated services may increase the likelihood of security incidents over time", "May warrant review to assess real-world risk", "May increase exposure if configuration issues are not addressed". Frame as visibility over time, not increasing risk. Create awareness without fear-mongering.]'

    const howToExploitFormat =
      request.pentestType === 'aggressive'
        ? "**How to exploit:** [MANDATORY SECTION - This is CRITICAL for aggressive mode. Include EXTREMELY DETAILED exploitation methodology (3-4 paragraphs minimum) with step-by-step attack procedures, command sequences, proof-of-concept code, and complete attack chain documentation. Show how the vulnerability was actively exploited during testing. Document the full attack path from initial access to potential lateral movement. MANDATORY: You MUST include actual exploitation commands in code blocks using triple backticks. The EXACT format is: Start with a line containing only ``` (three backticks), then the command and output on separate lines, then end with a line containing only ``` (three backticks). Example:\n\n```\n(kali@kali) $ smbclient //[TARGET]/SHARE -U '' -L '' -N -c 'ls'\nSharename       Type      Comment\n---------       ----      ------\nACCOUNTING      Disk      \nIPC$            IPC       IPC Service\n```\n\nIf commands exist in the data, include them with COMPLETE outputs in this exact format. If commands don't exist, describe in detail what commands would be used to exploit this vulnerability and format them the same way. Show REAL aggressive pen testing commands like smbclient, nmap, rpcclient, sqlmap, metasploit, etc. Include the complete command output exactly as it appears in the data with terminal-style formatting. This demonstrates what REAL aggressive penetration testing looks like - actual exploitation commands that were executed, not just scanning. Be EXTREMELY descriptive - explain each step of the exploitation process in detail. The code blocks will render with a premium black background in the PDF.]"
        : '**How to exploit:** [If exploit steps are available in the data, present them in a clear, numbered format. For any commands or code, enclose them in code blocks using triple backticks for proper formatting with background highlighting. CRITICAL: Include the complete command output exactly as it appears in the source data - do not summarize or omit any details.]'

    // Prepare the prompt - detailed report
    const reportTypeLabel =
      request.pentestType === 'aggressive'
        ? 'penetration test report'
        : 'vulnerability scan report'

    const promptBase = `You are a senior cybersecurity consultant creating a professional ${reportTypeLabel} for CUSTOMERS and BUSINESS EXECUTIVES. This report will be read by non-technical stakeholders, C-level executives, and business decision-makers.

CRITICAL COMPANY/DOMAIN NAME REQUIREMENT:
- The domain being tested is: ${domainName}
- When referring to the client or company, use the domain name "${domainName}" or refer to them as "the client" or "the organization"
${
  companyName
    ? `- At the end of key sentences throughout the report, append "${companyName}" naturally (e.g., "This scan provides early visibility of potential external security exposures${companyNameSuffix}.")`
    : ''
}
- Use the actual domain name "${domainName}" throughout the report when referring to the tested infrastructure

CRITICAL REPORT TYPE DIFFERENTIATION:
${
  request.pentestType === 'aggressive'
    ? `This is an AGGRESSIVE PENETRATION TEST REPORT. ${pentestTypeDescription}. ${pentestTypeContext}. You MUST clearly indicate in the Executive Summary and Test Scope sections that this was an AGGRESSIVE penetration test. Explain what this means for the testing approach and findings.`
    : `This is a VULNERABILITY SCAN REPORT, NOT a penetration test. ${pentestTypeDescription}. ${pentestTypeContext}. You MUST clearly indicate throughout the report that this is a non-intrusive external vulnerability scan, not an exploitative penetration test. 

CRITICAL LANGUAGE REQUIREMENTS FOR VULNERABILITY SCANS:
1. Use "Observation" instead of "Severity" - this indicates potential exposure level that warrants review, not confirmed exploitable vulnerability
2. DO NOT use phrases like "allows unauthenticated remote code execution", "attacker could gain full control", "immediate risk", "system is at risk of total compromise", "severe risk", "business continuity", "data breaches", "could lead to", "may lead to unauthorised access and data breaches", "could result in breaches", "will lead to", "causes regulatory issues"
3. For CVEs (especially OpenSSH CVE-2024-6387): State that a version associated with the CVE was observed, explicitly say exploitability depends on runtime config, use "Warrants validation" not "System is at risk"
4. For Database Exposure Findings (MySQL/PostgreSQL/etc): DO NOT say "may lead to unauthorised access and data breaches". DO say "increases the likelihood of unauthorised access attempts if additional controls are not in place". Preserve urgency without triggering panic.
5. Use conditional, forward-looking, non-absolute language: "If left unreviewed, may increase exposure over time", "May warrant review to assess potential impact", "Could potentially affect operations if not addressed", "may increase risk over time if left unreviewed", "could contribute to elevated risk exposure", "represents an area for security posture improvement"
6. Frame findings as potential exposures that warrant review, not confirmed exploitable vulnerabilities
7. Business Impact Analysis: Must NOT read like a verdict or incident-response conclusion. Use guiding tone, not judging tone. Make impact statements conditional, forward-looking, and non-absolute.
8. Risk Trend Analysis: DO NOT show "Total Vulnerabilities: 0" when findings exist. Either reframe as baseline assessment OR remove numeric chart and explain trend data requires historical scans.
9. Focus on visibility and awareness, not declarative business impact
10. For Risk Trend Analysis: Frame as "visibility over time" not "increasing risk"
11. Remove compliance references (PCI-DSS, GDPR) - these belong in full pen tests only
12. Language patterns: "vulnerability" → "observation" where possible, "attackers could" → "may increase likelihood", "could lead to" → "may warrant review"
13. CONSISTENT POSITIONING: Ensure the report consistently reflects that this is a non-intrusive external vulnerability scan, no exploitation was attempted, findings are directional not confirmations of compromise. Do not introduce penetration-test language, breach confirmation language, or incident-response phrasing.`
}

${aggressiveModeInstructions}

CRITICAL AUDIENCE CONSIDERATION:
- This report is for CUSTOMERS, not internal security teams
- ${
      request.pentestType === 'aggressive'
        ? 'For aggressive mode: Balance technical depth with business impact - provide detailed technical analysis while explaining business implications. Technical stakeholders will appreciate the depth, while executives need business context.'
        : 'Avoid technical jargon, file paths, directory structures, or internal technical references'
    }
- DO NOT mention "evidence directory", file paths, or internal system structures
- Use clear, business-friendly language that explains security issues in terms of business impact
- Translate technical findings into understandable business risks
- Focus on what matters to executives: financial impact, business continuity, reputation, compliance

CRITICAL: EDUCATIONAL CONTENT AND URGENCY FRAMING REQUIREMENTS:

1. EDUCATIONAL MOMENTS - CLARIFY SHARED RESPONSIBILITY:
   - When vulnerabilities involve third-party platforms (Shopify, Cloudflare, AWS, WordPress, etc.), EDUCATE the client about shared responsibility
   - Explain that while platforms may secure their infrastructure, the CLIENT remains responsible for:
     * Configuration and security settings
     * API integrations and custom code
     * Subdomains and custom domains
     * Development and staging environments
     * Access controls and authentication
   - Use clear statements like: "While [Platform] secures the platform itself, responsibility for configuration, APIs, subdomains, and development environments remains with ${domainName}."
   - This creates valuable educational moments that help clients understand their security responsibilities
   - Apply this educational framing whenever third-party platforms, CDNs, or managed services are involved

2. CREATE URGENCY WITHOUT FEAR-MONGERING:
   - In Business Impact and Risk Scenario sections, include statements that create urgency based on REAL-WORLD facts
   - Add impactful lines that explain consequences of inaction, such as:
     * "These vulnerabilities are routinely exploited by automated scanners within days of exposure."
     * "Similar issues have been exploited in [relevant timeframe] by attackers targeting [industry/type]."
     * "Without remediation, these findings could be discovered and exploited within [timeframe]."
   - Frame urgency around:
     * How quickly vulnerabilities are discovered (automated scanners, reconnaissance)
     * Real-world exploitation timelines
     * Industry-specific attack patterns
     * Compliance deadlines and regulatory requirements
   - DO NOT use fear-mongering language - use factual, data-driven statements
   - Balance urgency with actionable recommendations
   - Create urgency that motivates action without causing panic

3. COMBINE EDUCATION AND URGENCY:
   - When explaining shared responsibility, also explain why it matters NOW
   - Example: "While Shopify secures the platform, configuration issues like this are frequently discovered by automated scanners within 48-72 hours of deployment."
   - Connect educational content to immediate action items

CRITICAL DATA ANALYSIS REQUIREMENT - ACCURACY IS MANDATORY:
- You are receiving COMPLETE penetration test data from ALL files
- You MUST read and analyze EVERYTHING provided - do not skip any findings, vulnerabilities, or important details
- Extract and include ALL critical information from the entire dataset
- READ EVERY SINGLE LINE of every file - do not skip, summarize, or omit any content
- Extract ALL commands, outputs, evidence, IP addresses, ports, services, vulnerabilities, and technical details
- Include ALL tables, lists, code snippets, and structured data from the source files
- Convert ALL technical evidence into properly formatted markdown tables and code blocks
- BEFORE generating any risk rating or findings summary, you MUST:
  1. Read through ALL files completely - line by line
  2. Extract ALL commands and their outputs - format them as code blocks
  3. Extract ALL IP addresses, ports, services, and technical details
  4. Identify and count ALL findings by severity (Critical, High, Medium, Low)
  5. Extract actual severity levels from the data - do NOT guess or assume
  6. Count the exact number of findings in each severity category
  7. Extract ALL tables and structured data - convert them to markdown tables
  8. Extract ALL evidence, proof-of-concept code, and command outputs
  9. Use these ACTUAL counts to calculate the risk rating
- DO NOT invent, guess, or assume risk ratings - they MUST be calculated from the actual data
- DO NOT use placeholder or example risk ratings - use ONLY what the data shows
- DO NOT summarize or omit technical details - include EVERYTHING from the source files
- The risk rating MUST be consistent with the findings summary table

🚨 CRITICAL STATISTICAL CONSISTENCY - FINDINGS REGISTER IS THE SINGLE SOURCE OF TRUTH:
- The Findings Register (created before Section 4) is the AUTHORITATIVE source for ALL statistics in the report
- BEFORE writing ANY section that mentions counts or statistics, you MUST:
  1. FIRST: Create the Findings Register with ALL findings from the data
  2. SECOND: Lock the register and calculate counts:
     * Count Critical findings from register = [C]
     * Count High findings from register = [H]
     * Count Medium findings from register = [M]
     * Count Low findings from register = [L]
     * Count Informational findings from register = [I]
     * Calculate TOTAL = C + H + M + L + I
     * LOCK the register - no modifications after this point
  3. THIRD: Use these EXACT locked counts in ALL sections - DO NOT recalculate or use different numbers
- ALL sections MUST use the SAME counts from the Findings Register:
  * Section 1.3 (Summary of Observations) MUST use register counts
  * Section 5.2 (Severity Distribution) MUST use register counts
  * Section 5.6 (Risk Trend Analysis) MUST use register counts
  * ANY chart or graph MUST use register counts
- If the register shows "1 High, 5 Medium, 2 Low = 8 Total", then:
  * Section 1.3 MUST show "8 observations" (not 10, not 6, EXACTLY 8)
  * Section 5.2 MUST show counts matching the register exactly
  * Section 5.6 chart MUST show percentages based on register counts
  * NO section can show "0" or different numbers than the register
- Charts and graphs MUST be dynamic based on Section 4's actual data:
  * If Section 4 has findings, charts MUST show those findings with correct counts and percentages
  * DO NOT show all zeros when Section 4 has findings
  * Calculate percentages: (Count / Total) × 100
- There can be NO discrepancies between sections - all counts MUST match Section 4 exactly
- FORMAT ALL COMMANDS AND CODE: When you find commands, terminal output, or code snippets in the data, format them as code blocks using triple backticks. This includes:
  * All command-line commands (smbclient, nmap, rpcclient, etc.)
  * All terminal outputs and responses
  * All code snippets and scripts
  * All file listings and directory structures
  * All configuration examples
- FORMAT ALL TABLES: When you find structured data, lists, or tabular information, convert them to markdown tables. This includes:
  * Port scan results
  * Service enumerations
  * Vulnerability lists
  * Risk matrices
  * IP address inventories
  * Any other structured data

DATE REPLACEMENT REQUIREMENT:
- Replace ALL dates and timestamps in the content with today's date: ${todayFormatted}
- Replace ALL times with "Current" or "As of ${todayFormatted}"
- If you find any dates like "2024", "January 2025", etc., replace them with ${todayFormatted}
- Format all dates consistently as: ${todayFormatted}
- For any date ranges, use "through ${todayFormatted}" or "up to ${todayFormatted}"

Analyse the following COMPLETE ${
      request.pentestType === 'aggressive'
        ? 'penetration test'
        : 'vulnerability scan'
    } data (this includes all files with their full content) and create a COMPREHENSIVE, DETAILED, deeply explained CUSTOMER-FACING report${
      request.pentestType === 'aggressive'
        ? ' with MAXIMUM detail and technical depth (10,000-15,000+ words). CRITICAL: This is an AGGRESSIVE PENETRATION TEST REPORT, NOT a vulnerability scan. The content MUST be fundamentally different from a basic vulnerability scan report. Focus on ACTIVE EXPLOITATION, attack chains, breach scenarios, and real-world attack methodologies. Show what aggressive pen testing REALLY looks like through actual exploitation commands and evidence. EVERY finding MUST include actual commands in code blocks - commands are MANDATORY, not optional. Content must be EXTREMELY descriptive with 5-10 paragraphs per finding minimum.'
        : ' that fills 10-25+ pages when rendered in PDF format (page count should scale with number of findings - minimum 10 pages, often 15-20+ pages for comprehensive reports). Word count should be approximately 8,000-20,000+ words depending on findings. CRITICAL: This is a VULNERABILITY SCAN REPORT, NOT a penetration test. The language must be softened throughout - no fear-mongering, no "critical risk" ratings that assume breach outcomes, no exploitation claims. Frame findings as potential exposures that warrant review, not confirmed exploitable vulnerabilities. Use language like "may warrant further investigation", "should be reviewed", "potential exposure" rather than "critical vulnerability", "allows remote code execution", "complete system compromise". The report MUST be substantial, comprehensive, and provide maximum value - it should look like a premium, high-value document worth significant investment.'
    }.

CRITICAL REQUIREMENTS:

🚨 ZERO TOLERANCE FOR ONE-LINERS - ABSOLUTE RULE:
- NO section, subsection, or topic can be one line or one sentence
- EVERY section must have MULTIPLE paragraphs (minimum 2-3 paragraphs)
- EVERY paragraph must be 3-5 sentences minimum
- EVERY sentence must be meaningful and add value
- Single-line descriptions are FORBIDDEN
- Brief statements without context are FORBIDDEN
- Lists without detailed explanations are FORBIDDEN

1. ${
      request.pentestType === 'aggressive'
        ? 'For AGGRESSIVE mode: Generate a COMPREHENSIVE report with NO word limit. Aim for 10,000-15,000+ words with EXTENSIVE detail. The report should be substantial and provide maximum value. CRITICAL: Content must be EXTREMELY descriptive - every finding must be 5-10 paragraphs minimum. Commands are MANDATORY for every finding - include actual exploitation commands in code blocks. Show REAL attack scenarios with complete exploitation evidence. This is fundamentally different from soft mode - focus on ACTIVE EXPLOITATION, not passive scanning.'
        : 'For SOFT mode (Vulnerability Scan Reports): Generate an EXTENSIVE, COMPREHENSIVE, DETAILED report that fills 10-25+ pages when rendered in PDF format. The page count should scale with the number of findings - minimum 10 pages, often 15-20+ pages for comprehensive reports. Word count should be approximately 8,000-20,000+ words depending on findings (roughly 800-1,000 words per page). The report MUST be substantial, comprehensive, and provide maximum value - it should look like a premium, high-value document. Include EXTENSIVE detailed analysis, thorough explanations, comprehensive context, and actionable insights. CRITICAL: NO one-liners allowed - every section must have multiple paragraphs (3-4 paragraphs minimum) with substantial content (15-20+ lines per section). Each paragraph must be 4-6 sentences minimum. Content quality must be top-notch and provide real value. The report should feel weighty and comprehensive - like a professional security assessment worth significant investment.'
    }
2. CRITICAL STRUCTURE REQUIREMENT: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections combined). This is mandatory and non-negotiable. Create comprehensive sections and subsections to meet this requirement. Examples: Executive Summary with 5+ subsections, Test Scope with 5+ subsections, Detailed Findings with each finding as a separate subsection, Risk Assessment with multiple subsections, IP-specific analysis sections (when multiple IPs are present), Vulnerability category sections, Compliance mapping sections, Technical deep-dives, Attack path analysis, Remediation guides, etc.

3. CRITICAL CONTENT REQUIREMENT FOR EVERY SECTION - ZERO TOLERANCE FOR ONE-LINERS AND EMPTY SECTIONS:
   🚨 ABSOLUTE RULE: NO SECTION OR SUBSECTION CAN BE ONE LINE OR EMPTY. EVERY section is MANDATORY and MUST have MULTIPLE paragraphs with substantial content.
   🚨 MANDATORY SECTIONS: ALL sections listed in the Table of Contents are COMPULSORY and MUST be included with substantial content. NO section can be skipped or left empty.
   
   - DO NOT write generic definitions or brief descriptions
   - DO NOT explain what a section is - instead explain how it affects ${domainName} specifically
   - DO NOT write single-sentence paragraphs - every paragraph must be 3-5 sentences minimum
   - Focus on CLIENT-SPECIFIC impact, value, and recommendations
   
   - STRICT Minimum content requirements (these are MINIMUMS, not targets):
     * Recommendation sections (6.1-6.6): 20-25 lines minimum each (NOT 15-20, but 20-25)
       - Each subsection within recommendations: 5-7 lines minimum
       - Multiple paragraphs required (at least 3-4 paragraphs per section)
       - Each paragraph: 3-5 sentences minimum
     * Appendix sections (7.1-7.4): 25-30 lines minimum each
     * All other sections: 12-18 lines minimum each (NOT 10-15, but 12-18)
       - Multiple paragraphs required (at least 2-3 paragraphs per section)
   
   - Content must be:
     * SPECIFIC to ${domainName} and THIS test's findings
     * ACTIONABLE with detailed steps and guidance
     * VALUABLE explaining how it helps ${domainName}
     * IMPACT-FOCUSED explaining how it affects ${domainName}
     * MEANINGFUL - every sentence must add value and information
   
   - Reference actual findings, systems, and vulnerabilities from THIS test
   - Explain WHY recommendations matter to ${domainName}'s business
   - Show HOW improvements will help ${domainName}
   - Provide specific examples, scenarios, and use cases
   - Include detailed explanations, not just bullet points
   
   - FORBIDDEN CONTENT (DO NOT DO THIS):
     * Single-line descriptions (e.g., "Implement firewall rules within 48 hours.")
     * Generic one-liners (e.g., "Secure backup directories.")
     * Brief statements without context (e.g., "Deploy emergency monitoring.")
     * Lists without explanations (just bullet points with no detail)
   
   - REQUIRED CONTENT STRUCTURE:
     * Start with context (2-3 sentences explaining the situation)
     * Provide detailed explanation (3-5 sentences with specifics)
     * Include actionable steps (2-3 sentences with how-to details)
     * Explain business impact (2-3 sentences on why it matters)
     * Conclude with value proposition (1-2 sentences on benefits)
   
   - Every section must be SUBSTANTIAL and provide real value
   - Every paragraph must be MEANINGFUL and informative
   - Every sentence must add information, not just fill space
4. Be DEEP and THOROUGH in explanations - expand on findings, provide context, explain implications
5. Analyse ALL files and extract ALL findings, vulnerabilities, and security issues mentioned
6. Include EVERY critical and high-severity finding found in the data with full explanations
7. Use markdown formatting with headings (## for main sections, ### for subsections)
8. Write in a professional, BUSINESS-FOCUSED tone primarily for C-level executives and business stakeholders - explain technical concepts in business terms
9. Be VERY DETAILED - provide thorough analysis, but frame it in terms of business impact, risk, and actionable recommendations
10. Format beautifully with proper spacing, bullet points, and clear structure
11. Fill every page completely - ensure there's substantial content on every page, no blank spaces
12. Structure the report with these REQUIRED sections (use ## for each main section, ### for subsections):

## Table of Contents
CRITICAL: Create a comprehensive table of contents that lists ALL sections and subsections. The report MUST have AT LEAST 25 SECTIONS total (main sections + subsections). 

FORMAT REQUIREMENTS - Use this exact format for each line:
- For main sections: "- 1. Section Title" or "- 1 Section Title"
- For subsections: "- 1.1 Subsection Title" or "  - 1.1 Subsection Title" (indented)
- Include page numbers if available: "- 1. Section Title - Page 5"
- Use simple bullet points with dashes (-)
- One section per line
- Do NOT use markdown headers (##, ###) in the TOC
- Do NOT use code blocks or tables

Examples:
- 1. Executive Summary
  - 1.1 Overview
  - 1.2 Summary of Observations
- 2. Scope of Assessment
  - 2.1 Systems Tested
  - 2.2 Testing Approach

MAIN SECTIONS (##):
- 1. Executive Summary
${
  request.pentestType === 'soft'
    ? `  - 1.1 What This Scan Is (and Is Not)
  - 1.2 Overview
  - 1.3 Summary of Observations
  - 1.4 Key Observations (High-Level)`
    : `  - 1.1 Overall Risk Rating
  - 1.2 Key Findings Summary
  - 1.3 Business Impact Assessment
  - 1.4 Risk Overview Matrix
  - 1.5 Testing Overview`
}
- 2. ${
      request.pentestType === 'soft'
        ? 'Scope of Assessment'
        : 'Test Scope and Methodology'
    }
  - 2.1 Systems Tested
  - 2.2 Testing Approach
  - 2.3 Standards and Frameworks
  - 2.4 Testing Timeline
  - 2.5 Scope Limitations
- 3. Attack Surface Analysis
  - 3.1 Network Topology Overview
  - 3.2 IP Address Inventory
  - 3.3 Service Enumeration Summary
  - 3.4 Port Analysis
  - 3.5 Attack Vector Analysis
  - 3.6 Exposure Assessment
- 4. Detailed Findings
  - 4.1 [First Finding Title]
  - 4.2 [Second Finding Title]
  - 4.3 [Third Finding Title]
  - [Continue listing ALL findings from the register - each finding must be a separate subsection 4.X]
- 5. Risk Assessment
  - 5.1 Risk Matrix
  - 5.2 Severity Distribution
  - 5.3 Business Impact Analysis
  - 5.4 Compliance Impact
  - 5.5 Risk Prioritization
  - 5.6 Risk Trend Analysis
- 6. ${
      request.pentestType === 'soft'
        ? 'Recommended Next Steps'
        : 'Recommendations and Next Steps'
    }
  - 6.1 ${
    request.pentestType === 'soft'
      ? 'Short-Term (Good Practice)'
      : 'Immediate Actions'
  }
  - 6.2 ${
    request.pentestType === 'soft'
      ? 'Optional Validation'
      : 'Short-term Remediation'
  }
  - 6.3 ${
    request.pentestType === 'soft'
      ? 'How This Scan Is Best Used'
      : 'Long-term Improvements'
  }
  - 6.4 Remediation Priority Matrix (MANDATORY - must use bullet points format)
  - 6.5 Implementation Roadmap (MANDATORY - must use bullet points format with WEEKS 1-2, WEEKS 3-4, and long-term roadmap)
  - 6.6 Success Metrics
- ${request.pentestType === 'soft' ? '7' : '7'}. Appendices
${
  request.pentestType === 'soft'
    ? '  - 7.1 Scope & Methodology Details\n  - 7.2 Technical References\n  - 7.3 Glossary\n  - 7.4 Additional Resources\n- 8. Closing Note'
    : ''
}
  - 7.1 Scope & Methodology Details
  - 7.2 Technical References
  - 7.3 Glossary
  - 7.4 Additional Resources

CRITICAL: You MUST create AT LEAST 25 SECTIONS total. Expand the Detailed Findings section with multiple subsections (one per finding). Add additional sections as needed such as:
- IP-specific analysis sections (one per IP address when multiple IPs are present)
- Vulnerability categories (e.g., Authentication Issues, Authorization Flaws, Injection Vulnerabilities, etc.)
- Compliance sections (e.g., OWASP Top 10 Mapping, NIST Framework Alignment, etc.)
- Technical deep-dive sections
- Attack path analysis sections
- Remediation implementation guides

IMPORTANT: Generate realistic page numbers based on expected content length. Ensure the table of contents reflects all 25+ sections.

## Executive Summary
Provide a COMPREHENSIVE, DETAILED overview that fills${
      request.pentestType === 'aggressive'
        ? ' at least 2-3 full pages'
        : ' at least 1 full page'
    }:

${
  request.pentestType === 'soft'
    ? `### 1.1 What This Scan Is (and Is Not)
CRITICAL: This section MUST be included for vulnerability scan reports. Provide a clear, boxed section that explains:

**What this scan is:**

• A consent-based, external vulnerability scan
• Focused on publicly exposed services and configurations
• Intended to highlight potential areas for review
• Suitable for regular monitoring and early risk awareness
• Non-intrusive and designed to identify potential security hygiene issues

**What this scan is not:**

• Not a penetration test
• Not an exploitative assessment
• Not an internal network review
• Not confirmation of compromise or breach
• Not an assessment of application logic flaws
• Not an authentication bypass test

**Important Note:**

**Further validation is required to confirm exploitability or business impact for any findings. This scan provides directional insight, not definitive risk ratings. Actual risk depends on internal architecture, patch levels, access controls, and compensating security measures${companyNameSuffix}.**

`
    : ''
}
### 1.${request.pentestType === 'soft' ? '2' : '1'} Overview
${
  request.pentestType === 'soft'
    ? `CRITICAL: This section MUST contain at least 8-10 lines of informative content. Provide:
- This report presents the results of a non-intrusive external vulnerability scan conducted against ${domainName}${companyNameSuffix}
- The purpose of this scan is to provide early visibility of potential external security exposures based on publicly accessible systems, configurations, and software versions${companyNameSuffix}
- This assessment is designed to support informed security conversations and does not attempt to exploit vulnerabilities or disrupt live systems${companyNameSuffix}
- Detailed context about the assessment scope and objectives
- Explanation that this scan provides directional insight based on external observation only, not definitive risk ratings
- Business context for why this assessment matters to the organization${companyNameSuffix}
- Date of assessment: ${todayFormatted}${companyNameSuffix}`
    : `CRITICAL: This section MUST contain at least 6-7 lines of informative content. Provide:
- High-level overview of the security assessment engagement (use customer-friendly language, mention dates as ${todayFormatted})
- CLEARLY STATE that ${pentestTypeDescription} and explain what this testing approach means in both business and technical terms, emphasizing the comprehensive nature of aggressive testing across multiple IP addresses
- Detailed context about the assessment scope and objectives
- Explanation of the risk rating methodology and how it was calculated
- Business context for why this assessment matters to the organization${companyNameSuffix}`
}
${
  request.pentestType === 'aggressive'
    ? '- CRITICAL MULTI-IP OVERVIEW: The assessment covered MULTIPLE IP ADDRESSES for the same domain. Document:\n  * Complete list of all IP addresses tested\n  * Attack surface diversity across different IPs\n  * Summary of findings per IP address\n  * Comparison of security postures across IPs\n  * Which IPs are most critical/vulnerable and why\n- ATTACK SURFACE OVERVIEW: Provide comprehensive overview of attack surface diversity across different IPs, showing how each IP represents a separate infrastructure component\n- COMPREHENSIVE RISK OVERVIEW: Create a detailed risk matrix showing:\n  * Overall risk rating with CVSS-based scoring\n  * Risk distribution across different IP addresses (which IPs have highest risk)\n  * Critical attack paths identified per IP\n  * Potential lateral movement scenarios between IPs\n  * Business impact severity matrix with IP-specific considerations\nCRITICAL RISK RATING CALCULATION - MUST BE ACCURATE AND DATA-DRIVEN:'
    : `### 1.3 Summary of Observations
CRITICAL CONSISTENCY REQUIREMENT - SECTION 4 IS THE SOURCE OF TRUTH:
- This section MUST use the EXACT SAME counts as Section 4 (Detailed Findings)
- BEFORE writing this section, COUNT the TOTAL findings in Section 4
- If Section 4 lists findings (e.g., "1 High, 5 Medium, 2 Low = 8 total"), use those EXACT counts here
- DO NOT show "0" or "No findings" if findings are listed in Section 4
- The counts in this section MUST match Section 4 exactly - if Section 4 shows 10 total, this section MUST show 10 total

CRITICAL: This section MUST contain at least 8-10 lines of informative content. Provide:

MANDATORY PROCESS - FOLLOW THESE STEPS IN ORDER:

🔒 CRITICAL: All counts MUST be derived from the Findings Register (created before Section 4). The register is the SINGLE SOURCE OF TRUTH.

1. FIRST: Get counts from the Findings Register:
   * Go to the Findings Register you created
   * Use the EXACT counts calculated from the register:
     - Critical: [C] from register
     - High: [H] from register
     - Medium: [M] from register
     - Low: [L] from register
     - Informational: [I] from register
     - Total: [C + H + M + L + I] from register
   * These counts are LOCKED - use them exactly as calculated

2. SECOND: Create the observation summary table using EXACT counts from the Findings Register. ALWAYS include ALL columns (Critical, High, Medium, Low, Informational) even if count is 0:

🚨 CRITICAL: Use ONLY the counts from the Findings Register. DO NOT:
- Recalculate counts
- Use counts from Section 4
- Use counts from input data
- Modify the register counts

| Observation Level | Count |
|-------------------|-------|
| Critical | [C - EXACT count from your explicit list in Step 1, use 0 if none] |
| High | [H - EXACT count from your explicit list in Step 1, use 0 if none] |
| Medium | [M - EXACT count from your explicit list in Step 1, use 0 if none] |
| Low | [L - EXACT count from your explicit list in Step 1, use 0 if none] |
| Informational | [I - EXACT count from your explicit list in Step 1, use 0 if none] |
| Total | [C + H + M + L + I - MUST equal the sum above] |

3. THIRD: Write the introductory text using the EXACT total from the Findings Register:
   - Use the Total from the register: [C + H + M + L + I]
   - Write: "The scan identified [EXACT total from register] externally visible security observations that may warrant review${companyNameSuffix}"
   - CRITICAL: The number MUST match the register total exactly - NO exceptions

4. FOURTH: Add additional context (can be in bullet points below the table):
   * Number of items related to publicly disclosed software versions
   * Number of configuration-level observations (headers, cookies, service behaviour)
   * Confirmation that no evidence of active exploitation was found
   * Confirmation that no testing of internal systems or data access was performed

🚨 ABSOLUTE RULE - TEXT TOTAL MUST MATCH TABLE TOTAL:
- The total number mentioned in the text MUST EXACTLY match the "Total" row in the table
- There can be NO discrepancy - zero tolerance for mismatches
- Calculation process:
  1. Count findings in Section 4: Critical=[C], High=[X], Medium=[Y], Low=[Z], Informational=[I]
  2. Table Total = C + X + Y + Z + I
  3. Text MUST say: "[C+X+Y+Z+I] observations" (use the EXACT sum, no additions, no rounding)
- Examples:
  * If table shows "Total: 9" (1 Critical + 3 High + 4 Medium + 1 Low + 0 Informational), text MUST say "9 observations" - NOT "11"
  * If table shows "Total: 8" (0 Critical + 1 High + 5 Medium + 2 Low + 0 Informational), text MUST say "8 observations" - NOT "9" or "10"
  * If table shows "Total: 11" (0 Critical + 2 High + 7 Medium + 2 Low + 0 Informational), text MUST say "11 observations" - NOT "9" or "12"
- The total includes ALL observation levels: Critical + High + Medium + Low + Informational from Section 4
- DO NOT count "Number of items related to publicly disclosed software versions" separately in the total
- DO NOT count "Number of configuration-level observations" separately in the total
- The total is the sum of ALL observations (Critical + High + Medium + Low + Informational) from Section 4
- Context that these observations represent potential areas for review, not confirmed exploitable vulnerabilities${companyNameSuffix}
- Explanation that further validation is recommended to assess real-world risk${companyNameSuffix}

### 1.4 Key Observations (High-Level)
CRITICAL: This section MUST contain at least 12-15 lines of informative content. Provide detailed high-level overview of key observation categories:

**Publicly Disclosed Software Version:**
- A publicly known [CVE/software name] vulnerability was identified based on external service version information${companyNameSuffix}
- This scan did not attempt exploitation - presence does not confirm exposure${companyNameSuffix}
- Further validation is recommended to confirm relevance and risk in context${companyNameSuffix}
- Explanation of what this means and why it may warrant review${companyNameSuffix}

**Web Security Configuration:**
- Several standard web security best practices were not fully implemented, including:
  * Security headers (e.g. frame and content controls)
  * Session cookie attributes
- These items are commonly addressed as part of routine security hardening${companyNameSuffix}
- Explanation of why these configurations matter and how they can be improved${companyNameSuffix}

**Service Behaviour & Exposure:**
- The scan observed:
  * SMTP behaviour that may allow email address validation
  * Public access to a hosting management interface (if applicable)
  * Disclosure of server version information via headers
- These findings represent configuration considerations, not confirmed weaknesses${companyNameSuffix}
- Explanation of what these observations mean and potential implications${companyNameSuffix}

`
}
${
  request.pentestType === 'aggressive'
    ? `CRITICAL RISK RATING CALCULATION - MUST BE ACCURATE AND DATA-DRIVEN:`
    : ''
}

STEP 1: FIRST, analyze ALL the uploaded data and count findings by severity:
- Read through ALL files completely
- Identify EVERY finding mentioned in the data
- Count the EXACT number of findings in each severity category:
  * Critical severity findings: [count from data]
  * High severity findings: [count from data]
  * Medium severity findings: [count from data]
  * Low severity findings: [count from data]
- DO NOT guess, assume, or make up these numbers - they MUST come from the actual data

STEP 2: Determine risk rating category based on findings:
- If there are Critical findings: Risk Rating is "Critical"
- If there are High findings (but no Critical): Risk Rating is "High"
- If there are Medium findings (but no Critical or High): Risk Rating is "Medium"
- If there are only Low findings: Risk Rating is "Low"
- If there are mixed severities, use the highest severity present as the primary indicator

STEP 3: Present the risk rating with:
- Overall risk rating category in Title Case (Critical/High/Medium/Low) - NOT in uppercase, use Title Case like "Critical", "High", "Medium", "Low"
- When writing "Overall Risk Rating: [value]", always use Title Case for the value (e.g., "Overall Risk Rating: Critical" NOT "Overall Risk Rating: CRITICAL")
- Detailed breakdown showing:
  * How many Critical findings were discovered
  * How many High findings were discovered
  * How many Medium findings were discovered
  * How many Low findings were discovered
- Justification explaining why this rating was assigned based on the actual findings
- Comparison to industry benchmarks if applicable

CRITICAL FORMATTING REQUIREMENT FOR RISK CALCULATION:
You MUST format the risk calculation details in a special box format. Use this exact structure:

**Risk Rating Calculation:**
- Critical severity findings: [count]
- High severity findings: [count]
- Medium severity findings: [count]
- Low severity findings: [count]
- Overall Risk Rating: [Category in Title Case - e.g., "Critical", "High", "Medium", "Low" - NOT "CRITICAL", "HIGH", etc.] (based on the findings distribution)

IMPORTANT: Format this calculation section with clear bullet points. The Overall Risk Rating should be in Title Case (first letter capitalized, rest lowercase), NOT in UPPERCASE. This will be displayed in a styled grey background box in the PDF.

CRITICAL CONSISTENCY REQUIREMENT - STATISTICS MUST BE CONSISTENT THROUGHOUT THE ENTIRE REPORT:
- The risk rating category MUST be consistent with the findings summary table
- If the table shows 3 Critical findings, the risk rating MUST reflect this (likely "Critical" or "High" in Title Case)
- If the table shows 0 Critical findings, the risk rating CANNOT be CRITICAL
- The risk score MUST be calculated from the actual counts in the findings table
- DO NOT create conflicting information - the risk rating and findings table MUST align

MANDATORY STATISTICAL CONSISTENCY ACROSS ALL SECTIONS - FINDINGS REGISTER IS THE SINGLE SOURCE OF TRUTH:

CRITICAL: The Findings Register (created before Section 4) is the AUTHORITATIVE SOURCE for all statistics. ALL other sections MUST reference the register's counts.

STEP-BY-STEP PROCESS:
1. FIRST: Create the Findings Register with ALL findings from the data and lock it
2. SECOND: Calculate counts from the register and use those EXACT counts in ALL sections - do NOT recalculate
3. THIRD: Generate Section 4 (Detailed Findings) from the register - one register row = one finding
4. FOURTH: Ensure the TOTAL count matches across all sections (if register has 10 findings total, ALL sections must show 10 total)

MANDATORY REQUIREMENTS:
- Section 1.3 (Summary of Observations) MUST use EXACT counts from the Findings Register
- Section 5.2 (Severity Distribution) MUST use EXACT counts from the Findings Register
- Section 5.6 (Risk Trend Analysis) MUST use EXACT counts from the Findings Register
- Executive Summary MUST use EXACT counts from the Findings Register
- ANY section mentioning findings counts MUST use the EXACT SAME numbers as the register
- Charts and graphs MUST use ACTUAL data from the register
- DO NOT show "0" for any severity level if the register has findings in that category
- If the register lists 10 total findings, ALL sections must show 10 total - there can be NO discrepancies

CHART/GRAPH REQUIREMENTS:
- If you create a "Severity Distribution Overview" chart or any visual representation:
  * Use the EXACT counts from Section 4
  * Calculate percentages based on ACTUAL counts from Section 4
  * Show "Total Vulnerabilities: [ACTUAL TOTAL from Section 4]" not "0"
  * If Section 4 has 1 High, 5 Medium, 2 Low, the chart MUST show those numbers with correct percentages
  * DO NOT show all zeros when Section 4 has findings

STEP 5: After the risk rating explanation, include the FINDINGS SUMMARY TABLE:

| Severity | Count |
|----------|-------|
| Critical | [EXACT count from data] |
| High | [EXACT count from data] |
| Medium | [EXACT count from data] |
| Low | [EXACT count from data] |
| Total | [sum of all counts] |

CRITICAL TABLE ACCURACY REQUIREMENTS:
- Count ALL findings discovered in the penetration test data - read the data carefully
- The numbers MUST be accurate based on the ACTUAL findings in the uploaded data
- If there are 0 findings of a particular severity, show 0 (do not omit the row)
- The Total row MUST be the exact sum of all severity levels
- These counts MUST match what you used to calculate the risk rating
- Place this table immediately after the risk rating explanation, before any other content in section 1.1

EXAMPLE OF CORRECT CALCULATION:
If data shows: 2 Critical, 3 High, 5 Medium, 2 Low
- Risk Rating = "Critical" (because Critical findings are present - use Title Case, not UPPERCASE)
- Table shows: Critical: 2, High: 3, Medium: 5, Low: 2, Total: 12
- The risk rating should be presented as "Critical" (Title Case), not "CRITICAL" (uppercase)

### 1.${request.pentestType === 'soft' ? '3' : '2'} Key Findings Summary
CRITICAL: This section MUST contain at least 6-7 lines of informative content about the ACTUAL findings from THIS ${
      request.pentestType === 'aggressive'
        ? 'penetration test'
        : 'vulnerability scan'
    }. DO NOT write generic definitions or explanations of what this section is. Write SPECIFIC content about the findings discovered. Provide:
- DETAILED summary of ALL key security observations discovered - describe each major finding${
      request.pentestType === 'aggressive'
        ? ' with both technical depth and business impact. Include IP-specific findings where applicable.'
        : ' in business impact terms, not technical jargon. Frame as potential exposures that warrant review, not confirmed exploitable vulnerabilities'
    }
${
  request.pentestType === 'soft'
    ? '- Overview of externally visible security configurations and known software versions that may warrant further investigation'
    : '- COMPREHENSIVE business impact assessment - explain potential consequences in financial terms, operational terms, and reputation terms'
}
- DETAILED key recommendations overview - prioritize and explain each major recommendation with business justification${companyNameSuffix}
- Testing methodology summary - what was tested${
      request.pentestType === 'aggressive'
        ? ' with detailed technical methodology, tools used, exploitation techniques, and validation approaches'
        : ' (use simple language, avoid technical tool names unless necessary)'
    }
${
  request.pentestType === 'soft'
    ? '- Summary of potential security observations and why they may be worth reviewing'
    : '- Summary of critical vulnerabilities and their potential business impact'
}
- Overview of remediation priorities and recommended actions${companyNameSuffix}
${
  request.pentestType === 'aggressive'
    ? '- Include a REMEDIATION PRIORITY MATRIX showing immediate, short-term, and long-term remediation priorities with resource requirements'
    : ''
}

## Test Scope and Methodology
Provide COMPREHENSIVE, DETAILED testing information that fills substantial space (written for customers). Each subsection MUST contain at least 15-20 lines of substantial, detailed content (NOT 6-7 lines). ABSOLUTELY NO ONE-LINERS ALLOWED. Every subsection must have MULTIPLE paragraphs (3-4 paragraphs minimum), each with 4-6 sentences.

### 2.1 Systems Tested
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- DETAILED overview of all systems and applications tested - use business-friendly names, avoid technical IPs/ports unless essential (2-3 sentences)
- Comprehensive list of infrastructure components assessed (web applications, APIs, network services, etc.) with detailed descriptions (2-3 sentences)
- Specific domains, subdomains, and endpoints that were included in the assessment with business context (2-3 sentences)
- Business context for each system - explain what each system does and why it matters to the organization (2-3 sentences)
- Scope boundaries - clearly define what was tested and what was excluded with detailed explanations (2-3 sentences)
- Testing environment details - describe the production, staging, or development environments assessed (2-3 sentences)
- Asset inventory - provide a comprehensive overview of all assets included in the assessment with categorization (2-3 sentences)

### 2.2 Testing Approach
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
${
  request.pentestType === 'soft'
    ? '- CLEARLY STATE that this was a non-intrusive external vulnerability scan, NOT a penetration test, and explain the scanning approach methodology (${pentestTypeContext})'
    : '- CLEARLY STATE that this was a ${request.pentestType.toUpperCase()} penetration test and explain the testing approach methodology (${pentestTypeContext})'
}
- EXPANDED testing approach - explain WHAT was tested and WHY it matters to security, not HOW technically
${
  request.pentestType === 'soft'
    ? '- Detailed methodology breakdown - describe each phase of scanning (reconnaissance, service identification, version detection, configuration review) - emphasize NO exploitation was attempted'
    : '- Detailed methodology breakdown - describe each phase of testing (reconnaissance, scanning, vulnerability assessment, exploitation validation)'
}
- Testing techniques employed - explain the types of tests performed${
      request.pentestType === 'soft'
        ? ' (external scanning, banner grabbing, header analysis) and emphasize non-intrusive nature'
        : ' (black box, grey box, etc.) and their relevance'
    }
- Tools and technologies used - mention testing tools in business-friendly terms and explain their purpose
${
  request.pentestType === 'soft'
    ? '- Validation approach - describe that findings are based on external observation and version identification, not active exploitation'
    : '- Validation approach - describe how findings were verified and confirmed'
}
- Testing depth and coverage - explain the comprehensiveness of the assessment and what was covered

### 2.3 Standards and Frameworks
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- COMPREHENSIVE list of standards and frameworks (OWASP, NIST, ISO 27001, PTES, etc.) - explain what these mean for security posture with detailed context (2-3 sentences)
- Detailed explanation of how each standard was applied during the assessment with specific examples (2-3 sentences)
- Framework alignment - show how the testing methodology aligns with industry best practices and why it matters (2-3 sentences)
- Compliance considerations - explain how findings relate to regulatory requirements with business context (2-3 sentences)
- Industry benchmark comparison - explain how the assessment compares to industry standards with detailed analysis (2-3 sentences)
- Framework-specific findings - describe which vulnerabilities map to specific framework categories (e.g., OWASP Top 10) with examples (2-3 sentences)
- Standards compliance gaps - identify areas where the organization may not meet industry standards with recommendations (2-3 sentences)

### 2.4 Testing Timeline
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- DETAILED testing timeline - use dates formatted as ${todayFormatted}, describe phases in business terms with comprehensive details (2-3 sentences)
- Comprehensive schedule breakdown - provide specific dates and durations for each testing phase with explanations (2-3 sentences)
- Phase-by-phase timeline - explain what was tested during each phase and when with detailed descriptions (2-3 sentences)
- Resource allocation - describe the time and effort invested in each aspect of the assessment with context (2-3 sentences)
- Testing milestones - highlight key dates and achievements during the assessment with detailed descriptions (2-3 sentences)
- Coordination and communication - explain how the testing was coordinated with the organization with specific details (2-3 sentences)
- Final delivery timeline - specify when the assessment was completed and when the report is being delivered with context (2-3 sentences)

### 2.5 Scope Limitations
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Methodology limitations and scope boundaries - explain what was and wasn't tested in business context (what risks might exist outside scope) with detailed explanations (2-3 sentences)
- Detailed explanation of excluded areas - clearly define what was not tested and why with business context (2-3 sentences)
- Scope constraints - describe any limitations that affected the assessment (time, access, technical constraints) with implications (2-3 sentences)
- Potential blind spots - identify areas that may require additional testing or assessment with detailed descriptions (2-3 sentences)
- Recommendations for expanded testing - suggest areas that could benefit from future assessments with specific examples (2-3 sentences)
- Risk areas outside scope - explain potential security risks that exist in areas not covered by this assessment with detailed context (2-3 sentences)
- Limitations impact - describe how these limitations affect the overall security assessment and what they mean for the organization (2-3 sentences)

## Findings Register (INTERNAL - DO NOT DISPLAY IN REPORT - THIS SECTION MUST NOT APPEAR IN THE FINAL REPORT)

🚨 CRITICAL: This Findings Register section is for INTERNAL USE ONLY. You MUST create it, but DO NOT include it in the final report output. This section should be created in your working notes but excluded from the actual report sections.

🔒 GOLDEN RULE: The Findings Register is the SINGLE SOURCE OF TRUTH. All counts, summaries, and detailed findings MUST be derived from this register.

STEP 1: CREATE MASTER FINDINGS REGISTER (MANDATORY - DO THIS FIRST - INTERNAL ONLY)

Before writing ANY detailed findings or summary sections, you MUST create a locked Findings Register in your internal notes (NOT in the report).

Create a table with EXACTLY these columns (in your internal notes, NOT in the report):
| Finding ID | Title | Severity |
|------------|-------|----------|
| F-01 | [Title from data] | [Critical/High/Medium/Low/Informational] |
| F-02 | [Title from data] | [Critical/High/Medium/Low/Informational] |
| ... | ... | ... |

CRITICAL REQUIREMENTS:
- List EVERY finding from the data - do not skip any
- Assign a unique Finding ID (F-01, F-02, F-03, etc.)
- Assign severity based on the data (Critical/High/Medium/Low/Informational)
- DO NOT combine findings - one finding = one row
- DO NOT omit findings - include all findings from the data
- DO NOT modify severities after assignment

STEP 2: LOCK THE REGISTER AND CALCULATE COUNTS

After creating the register:
1. Count each severity level:
   - Critical: Count = [C]
   - High: Count = [H]
   - Medium: Count = [M]
   - Low: Count = [L]
   - Informational: Count = [I]
   - Total: [C + H + M + L + I]

2. LOCK THE REGISTER:
   - 🔒 This register is now LOCKED
   - NO additions after this point
   - NO deletions after this point
   - NO severity changes after this point
   - These counts are FINAL and must be used everywhere

STEP 3: VALIDATE REGISTER COUNTS

Before proceeding, verify:
- [ ] Every finding from the data is in the register
- [ ] No findings are duplicated
- [ ] Severity counts are accurate
- [ ] Total = sum of all severity counts

## Detailed Findings

CRITICAL: Generate detailed findings STRICTLY from the Findings Register above.

RULE: One register row = ONE detailed finding section. No combining. No skipping.

MANDATORY: You MUST generate a detailed finding section for EVERY row in the Findings Register. If the register has 11 findings, you MUST create 11 detailed finding sections (4.1 through 4.11). DO NOT stop after one finding. DO NOT include placeholder text like "(Continue with other findings...)". Generate ALL findings.

For EACH row in the Findings Register:
1. Create exactly ONE detailed finding section: ### 4.X [Title from Register]
2. Use the EXACT severity from the register: **Severity:** [from Register] or **Observation:** [from Register]
3. Use the EXACT Finding ID: **Finding ID:** F-XX (optional, can be included)
4. Do NOT combine multiple register entries into one finding
5. Do NOT skip any register entries - ALL must be included
6. Do NOT change severities from the register
7. Do NOT include placeholder text like "(Continue with other findings...)" or "(See other findings...)"
8. Generate complete, detailed content for EVERY finding

Format each finding as:
### 4.X [Title from Register]
**Severity:** [EXACT severity from Register] or **Observation:** [EXACT severity from Register]
[Detailed content with Description, Business Impact, What Was Found, Affected Systems, Risk Scenario, Recommendation, Priority...]

CRITICAL: Continue generating findings until ALL register entries are covered. If register has 11 findings, generate 11 sections. If register has 15 findings, generate 15 sections. NO EXCEPTIONS.

STEP 4: USE THESE EXACT COUNTS IN ALL OTHER SECTIONS
- Section 1.3 (Summary of Observations): Use Critical=[X], High=[Y], Medium=[Z], Low=[W], Informational=[V], Total=[X+Y+Z+W+V]
- Section 5.2 (Severity Distribution): Use the SAME counts
- Executive Summary: Use the SAME counts
- ANY section mentioning counts: Use the SAME counts
- DO NOT recalculate, DO NOT estimate, DO NOT use different numbers

🚨 CRITICAL REQUIREMENT: Generate detailed findings for EVERY finding in the Findings Register.

If the Findings Register has:
- 11 findings → Generate 11 detailed finding sections (4.1, 4.2, 4.3, ..., 4.11)
- 15 findings → Generate 15 detailed finding sections (4.1, 4.2, ..., 4.15)
- N findings → Generate N detailed finding sections

DO NOT:
- Stop after generating one finding
- Include placeholder text like "(Continue with other findings...)" or "(See other findings...)"
- Skip any findings from the register
- Combine multiple findings into one section

For EACH finding in the Findings Register, provide COMPREHENSIVE details that thoroughly explain each vulnerability. ${
      request.pentestType === 'aggressive'
        ? 'For AGGRESSIVE mode: This section should be EXTENSIVE (8-12+ pages) with MAXIMUM detail and BEEFY content. Each CRITICAL/HIGH finding should be 6-10 paragraphs minimum (2-3 pages per finding) with extensive technical depth. MANDATORY: EVERY finding MUST include actual exploitation commands in code blocks - commands are NOT optional. Content must be EXTREMELY descriptive - explain every detail of the vulnerability, exploitation process, and impact. CRITICAL: The folder contains data from MULTIPLE IP ADDRESSES of the same domain - document findings for EACH IP separately with extensive detail. Create dedicated subsections for each IP address showing port scans, services, vulnerabilities, and exploitation results with complete command outputs. Show REAL attack scenarios with actual exploitation evidence. For SOFT mode: This section should be COMPREHENSIVE (3-5 pages) with detailed analysis for each finding. Each finding should be 2-3 paragraphs minimum with thorough explanations.'
        : 'For SOFT mode: This section should be EXTENSIVE and COMPREHENSIVE (5-10+ pages) with MAXIMUM detail and substantial content. Each finding should be 4-6 paragraphs minimum (1-2 pages per finding) with thorough explanations, detailed technical context, comprehensive business impact analysis, and extensive remediation guidance. Include ALL findings from the data - do not skip any. Content must be substantial and provide real value - no brief summaries allowed.'
    }

- For EVERY finding (Critical, High, Medium, Low), include:
- Vulnerability title and severity level
- EXTREMELY DETAILED description of the vulnerability (2-3 paragraphs minimum for aggressive mode) - explain how it works, why it exists, technical details, root cause analysis
- Risk score and rating justification - explain why this finding received its severity rating
${
  request.pentestType === 'aggressive'
    ? "- MANDATORY: Actual exploitation commands in code blocks - if commands exist in data, include them with COMPLETE outputs. If commands don't exist, describe in detail what commands would be used.\n- CRITICAL FOR MULTI-IP SCENARIOS: Clearly identify which IP address(es) are affected - create separate write-ups for each IP when the same vulnerability appears on different IPs\n- EXTENSIVE exploitability analysis (2-3 paragraphs) - detailed step-by-step exploitation logic, attack vectors, and attack chains\n- Proof-of-concept descriptions with technical evidence and validation results\n- CVE references with detailed descriptions and CVSS scores where applicable\n- Attack path visualization (1-2 paragraphs) - explain how an attacker would exploit this, including initial access, execution, persistence, and lateral movement\n- Lateral movement opportunities - how this vulnerability could lead to further compromise of other systems and IPs\n- Validation methodology - explain how the vulnerability was validated through active exploitation\n- IP address and attack surface identification - clearly identify which IP(s) are affected, document open ports, running services, and configurations for EACH IP\n- Network topology considerations - how this finding relates to the overall network architecture and relationships between IPs\n- IP-specific remediation - provide remediation steps tailored to each affected IP address\n- Complete exploitation narrative - tell the story of how this would be exploited in a real attack scenario"
    : ''
}
- COMPREHENSIVE business impact (3-4 paragraphs minimum, 12-16 sentences) - detailed financial, operational, reputational consequences with specific examples and context
- EXTENSIVE technical evidence - include ALL commands, URLs, configurations, code snippets from the data. Format commands and outputs as code blocks using triple backticks. Format structured data (port scans, service lists, IP inventories) as markdown tables.
- All affected systems and components - be specific about what's impacted. Format as tables when multiple systems are listed.
- Priority rating and remediation urgency with justification
- Attack scenarios (1-2 paragraphs for aggressive mode) - explain how an attacker would exploit this in detail
- Current state assessment - what's currently happening

Format each finding as:
${findingTitleFormat}
${severityFormat}
${descriptionFormat}
${technicalDetailsSection}**Business Impact:** [${
      request.pentestType === 'aggressive'
        ? 'COMPREHENSIVE business impact - explain financial risks (potential losses, fines), operational risks (service disruption), reputational risks (customer trust, brand damage). INCLUDE URGENCY FRAMING: Add factual statements about exploitation timelines, such as "These vulnerabilities are routinely exploited by automated scanners within days of exposure" or "Similar issues have been exploited within [timeframe] in [industry context]." Create urgency without fear-mongering.'
        : `CRITICAL LANGUAGE REQUIREMENTS FOR VULNERABILITY SCANS (3-4 paragraphs, 12-16 sentences):

MANDATORY TONE - This must NOT read like a verdict or incident-response conclusion:
- DO NOT use phrases like "severe risk", "business continuity", "data breaches", "complete system compromise", "attacker could gain full control", "immediate risk", "could lead to", "may lead to unauthorised access and data breaches", "could result in breaches", "will lead to", "causes regulatory issues"
- DO NOT use language that implies breach or confirmed compromise
- DO NOT sound like penetration test or incident response output

REQUIRED LANGUAGE STYLE - Make impact statements conditional, forward-looking, and non-absolute:
- Conditional: "may increase risk over time if left unreviewed" (NOT "will cause" or "could lead to")
- Forward-looking: "could contribute to elevated risk exposure" (NOT "causes regulatory issues")
- Non-absolute: "represents an area for security posture improvement" (NOT "could result in breaches")

SPECIFIC GUIDANCE FOR DATABASE EXPOSURE FINDINGS (MySQL/PostgreSQL/etc):
- DO NOT say: "may lead to unauthorised access and data breaches"
- DO say: "increases the likelihood of unauthorised access attempts if additional controls are not in place"
- Preserve urgency without triggering panic: Use conditional language that acknowledges potential risk without confirming compromise
- Frame as: "If left unreviewed, externally visible database services may increase exposure to potential unauthorized access attempts. This observation warrants review to assess whether additional access controls and network restrictions are appropriate."

GENERAL PREFERRED PHRASING:
- "If left unreviewed, externally visible misconfigurations and outdated services may increase the likelihood of security incidents over time"
- "may increase exposure" (NOT "will cause exposure")
- "could potentially be exploited" (NOT "allows exploitation")
- "may warrant validation" (NOT "confirms vulnerability")
- "represents an area for security posture improvement" (NOT "causes business impact")

MINDSET: The tone should be guiding, not judging. Frame as potential risks that may warrant review, not confirmed exploitable vulnerabilities. Focus on visibility and awareness, not declarative business impact. Explain that actual business impact depends on validation and context.`
    }]
${whatWasFoundFormat}
${affectedSystemsFormat}
${attackSurfaceSection}${riskScenarioFormat}

${howToExploitFormat}

CRITICAL FORMATTING REQUIREMENTS:

1. CODE BLOCKS - Format ALL commands, terminal output, and code snippets as code blocks:
   MANDATORY: Use triple backticks on separate lines. The format MUST be:
   
   Start with a line containing only three backticks
   Then the command or code on the next line
   Then any output on subsequent lines
   End with a line containing only three backticks
   
   Example for single command:
   [Line with three backticks]
   curl -i -s -k "https://example.com/endpoint"
   [Line with three backticks]
   
   Example for multi-line terminal output:
   [Line with three backticks]
   $ smbclient -L //192.168.1.1 -N
   Sharename       Type      Comment
   ---------       ----      ------
   ROOT            Disk      
   IPC$            IPC       IPC Service
   [Line with three backticks]
   
   CRITICAL: The triple backticks MUST be on their own separate lines. DO NOT put them on the same line as the command. This creates the premium black background in the PDF.

2. TABLES - Format ALL structured data as markdown tables. Examples:

For port scan results:
| Port | Service | Version | Status |
|------|---------|---------|--------|
| 80 | HTTP | Apache 2.4.41 | Open |
| 443 | HTTPS | Apache 2.4.41 | Open |

For affected systems:
| IP Address | Port | Service | Status |
|------------|------|---------|--------|
| 192.168.1.1 | 445 | SMB | Vulnerable |

For risk matrices:
| Confidentiality | Integrity | Availability | Difficulty |
|----------------|-----------|--------------|------------|
| HIGH | LOW | LOW | EASY |

3. EXTRACT EVERYTHING - Include ALL data from source files:
- Every command and its complete output
- Every IP address, port, and service discovered
- Every vulnerability detail and evidence
- Every table, list, and structured data
- Do NOT summarize or omit - include EVERYTHING

**Recommendation:** [DETAILED, SPECIFIC remediation steps - explain what needs to be done${
      request.pentestType === 'aggressive'
        ? ' with technical implementation details, configuration changes, code fixes, and step-by-step remediation procedures for each affected IP address'
        : ' in business terms, not just technical steps'
    }. Use bullet points for multiple remediation actions. IF THIS INVOLVES THIRD-PARTY PLATFORMS (Shopify, Cloudflare, AWS, WordPress, etc.), INCLUDE EDUCATIONAL CONTENT: Explain that while the platform secures its infrastructure, ${domainName} remains responsible for configuration, APIs, subdomains, and development environments. Use statements like: "While [Platform] secures the platform itself, responsibility for [specific areas] remains with ${domainName}."]
**Priority:** [Urgency level in Title Case - Critical/High/Medium/Low with business justification - why this matters to the business]

${
  request.pentestType === 'aggressive'
    ? 'CRITICAL FOR MULTI-IP SCENARIOS: When multiple IP addresses are present, document findings for EACH IP separately. Show how different IPs have different vulnerabilities and attack surfaces. Structure findings clearly by IP address where applicable. For each IP, provide: complete port scan results, service enumeration, vulnerability assessment, exploitation results, and IP-specific remediation recommendations. '
    : ''
}Include ALL findings from the data - don't skip any. Be thorough and detailed.

## Attack Surface Analysis
Provide COMPREHENSIVE, DETAILED analysis of the attack surface. Each subsection MUST contain at least 15-20 lines of substantial, detailed content (NOT 6-7 lines). ABSOLUTELY NO ONE-LINERS ALLOWED. Every subsection must have MULTIPLE paragraphs (3-4 paragraphs minimum), each with 4-6 sentences. DO NOT write generic definitions - write SPECIFIC, DETAILED analysis based on THIS assessment's findings.

### 3.1 Network Topology Overview
CRITICAL: Write 15-20 lines of ACTUAL network topology analysis based on THIS assessment's findings. This MUST be 3-4 paragraphs, each with 4-6 sentences. DO NOT write generic definitions. Write SPECIFIC, DETAILED analysis for the client:
- Actual network architecture observed during THIS test based on the IP addresses and services discovered (2-3 sentences explaining the architecture)
- Specific network segments and relationships identified from THIS test's results (2-3 sentences with details)
- Actual network boundaries and security perimeters observed (2-3 sentences explaining boundaries)
- Specific network components discovered during THIS assessment (2-3 sentences describing components)
- Analysis of network topology implications for security posture (2-3 sentences)
- Recommendations for network architecture improvements (2-3 sentences)

### 3.2 IP Address Inventory
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Complete inventory of all IP addresses tested during the assessment with detailed descriptions
- Detailed documentation of each IP address with its purpose, role, and services running
- Analysis of IP address distribution, allocation, and organizational structure
- Identification of public-facing vs internal IP addresses with security implications
- Documentation of IP address ownership, management, and administrative control
- Assessment of IP address exposure, attack surface, and potential security risks
- Recommendations for IP address management, security hardening, and best practices

### 3.3 Service Enumeration Summary
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Comprehensive summary of all services discovered during enumeration with version details
- Detailed documentation of service types, versions, configurations, and security settings
- Analysis of service exposure, accessibility, and potential attack vectors
- Identification of unnecessary, vulnerable, or misconfigured services
- Assessment of service security configurations, patch levels, and hardening status
- Documentation of service dependencies, relationships, and integration points
- Recommendations for service hardening, optimization, and security improvements

### 3.4 Port Analysis
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Comprehensive analysis of all open ports discovered during scanning with service mappings
- Detailed documentation of port usage, associated services, and traffic patterns
- Identification of unnecessary open ports, services, and potential security gaps
- Analysis of port security, access controls, and firewall configurations
- Assessment of port exposure, potential attack vectors, and exploitation risks
- Documentation of port filtering rules, firewall policies, and network segmentation
- Recommendations for port security, minimization, and defense-in-depth strategies

### 3.5 Attack Vector Analysis
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Comprehensive analysis of potential attack vectors and entry points identified
- Detailed documentation of identified attack paths, exploitation routes, and methodologies
- Analysis of attack surface diversity, complexity, and potential impact
- Identification of high-risk attack vectors requiring immediate attention and prioritization
- Assessment of attack vector likelihood, impact, and business risk implications
- Documentation of attack vector mitigation strategies, controls, and countermeasures
- Recommendations for attack surface reduction, security hardening, and risk mitigation

### 3.6 Exposure Assessment
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Comprehensive assessment of infrastructure exposure to external threats and risks
- Detailed analysis of publicly accessible services, endpoints, and attack surfaces
- Identification of overexposed systems, services, and potential security vulnerabilities
- Assessment of exposure risk, potential impact, and business implications
- Documentation of exposure reduction opportunities, security controls, and best practices
- Analysis of exposure trends, patterns, and historical security posture changes
- Recommendations for exposure minimization, security hardening, and continuous improvement

## Risk Assessment
Provide COMPREHENSIVE, DETAILED risk assessment. Each subsection MUST contain at least 15-20 lines of substantial, detailed content (NOT 6-7 lines). ABSOLUTELY NO ONE-LINERS ALLOWED. Every subsection must have MULTIPLE paragraphs (3-4 paragraphs minimum), each with 4-6 sentences. Write SPECIFIC, DETAILED analysis based on THIS assessment's findings.

### 5.1 Risk Matrix
CRITICAL: Write 15-20 lines of ACTUAL risk matrix based on THIS assessment's findings (3-4 paragraphs, each 4-6 sentences). DO NOT write generic definitions. Write SPECIFIC, DETAILED risk analysis for the client:
- Actual risk matrix showing the findings from THIS test categorized by severity and impact with detailed explanations
- Specific high-risk areas identified from THIS test's actual findings with business context
- Risk distribution based on the actual vulnerabilities discovered with statistical analysis
- Detailed risk prioritization framework and methodology applied to these findings
- Risk correlation analysis showing relationships between different findings
- Recommendations based on the actual findings from THIS test with actionable steps

### 5.2 Severity Distribution
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):

CRITICAL CONSISTENCY REQUIREMENT: This section MUST use the EXACT SAME counts as the findings listed in Section 4 (Detailed Findings). If Section 4 lists findings (e.g., "1 Critical observations", "2 High observations", "5 Medium observations", "2 Low observations", "4 Informational observations"), then this section MUST reflect those EXACT numbers. DO NOT show "0" or "No findings" if findings are listed elsewhere in the report.

- Comprehensive breakdown of findings by severity level using the ACTUAL counts from Section 4 (Detailed Findings) - COUNT ALL findings in Section 4 FIRST (Critical, High, Medium, Low, Informational), then use those EXACT counts here with detailed counts and percentages (2-3 sentences)
- Detailed analysis of severity distribution patterns, trends, and statistical insights based on the ACTUAL findings from this scan (2-3 sentences)
- Identification of severity concentration areas, systems, and infrastructure components from the ACTUAL findings (2-3 sentences)
- Assessment of severity impact on overall security posture with business implications based on the ACTUAL findings (2-3 sentences)
- Documentation of severity-based prioritization strategies and remediation approaches for the ACTUAL findings (2-3 sentences)
- Analysis of severity correlation with business impact, operational risk, and financial exposure based on the ACTUAL findings (2-3 sentences)
- Recommendations for addressing findings with specific action items and timelines based on the ACTUAL findings (2-3 sentences)

MANDATORY: Create a table using EXACT counts from the Findings Register (the single source of truth).

🔒 CRITICAL: Use ONLY the counts from the Findings Register. DO NOT recalculate or use counts from Section 4.

STEP 1: Get counts from the Findings Register:
- Go to the Findings Register you created
- Use the EXACT counts: Critical=[C], High=[H], Medium=[M], Low=[L], Informational=[I], Total=[C+H+M+L+I]
- These counts are LOCKED - use them exactly

STEP 2: CREATE THE TABLE USING THOSE EXACT COUNTS. ALWAYS include ALL columns (Critical, High, Medium, Low, Informational) even if count is 0:
| Observation Level | Count |
|-------------------|-------|
| Critical | [C - EXACT count from Step 1, use 0 if none] |
| High | [H - EXACT count from Step 1, use 0 if none] |
| Medium | [M - EXACT count from Step 1, use 0 if none] |
| Low | [L - EXACT count from Step 1, use 0 if none] |
| Informational | [I - EXACT count from Step 1, use 0 if none] |
| Total | [C + H + M + L + I - MUST equal the sum above] |

STEP 3: VERIFY BEFORE FINALIZING:
- [ ] I used EXACT counts from the Findings Register
- [ ] Critical count in table = [C] from register
- [ ] High count in table = [H] from register
- [ ] Medium count in table = [M] from register
- [ ] Low count in table = [L] from register
- [ ] Informational count in table = [I] from register
- [ ] Total in table = C + H + M + L + I from register
- [ ] These counts match Section 1.3 (Summary of Observations) exactly

CRITICAL: The Total MUST equal the sum from the Findings Register. The counts MUST match the register exactly - there can be NO discrepancies. If the register shows 1 Critical + 2 High + 5 Medium + 2 Low + 0 Informational = 10 Total, this table MUST show exactly that.

ALL columns must always be present in the table, even if count is 0.

### 5.3 Business Impact Analysis
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
${
  request.pentestType === 'soft'
    ? `CRITICAL LANGUAGE REQUIREMENTS FOR VULNERABILITY SCANS (15-20 lines, 3-4 paragraphs, each 4-6 sentences):

MANDATORY TONE REQUIREMENTS - This section must NOT read like a verdict or incident-response conclusion:
- DO NOT use phrases like "severe risk", "business continuity", "data breaches", "complete system compromise", "attacker could", "could lead to", "may lead to unauthorised access and data breaches", "could result in breaches", "will lead to", "causes regulatory issues"
- DO NOT use language that implies breach or confirmed compromise
- DO NOT sound like penetration test or incident response output
- DO NOT imply outcomes rather than potential risk

REQUIRED LANGUAGE STYLE - Make impact statements:
- Conditional: "may increase risk over time if left unreviewed" (2-3 sentences)
- Forward-looking: "could contribute to elevated risk exposure" (2-3 sentences)
- Non-absolute: "represents an area for security posture improvement" (2-3 sentences)

PREFERRED PHRASING EXAMPLES:
- "increases the likelihood of unauthorised access attempts if additional controls are not in place" (NOT "may lead to unauthorised access and data breaches")
- "may increase risk over time if left unreviewed" (NOT "could result in breaches")
- "could contribute to elevated risk exposure" (NOT "will lead to")
- "represents an area for security posture improvement" (NOT "causes regulatory issues")

MINDSET: The tone should be guiding, not judging. Frame as potential impact that warrants validation, not confirmed business risk. Focus on visibility and awareness, not declarative business impact statements. Explain that actual business impact depends on validation and context. Frame findings as opportunities to strengthen security posture.`
    : `- Comprehensive analysis of business impact for each finding category
- Detailed assessment of financial, operational, and reputational risks
- Identification of critical business processes at risk
- Analysis of potential business disruption scenarios
- Documentation of business impact quantification and measurement
- Assessment of business continuity and recovery implications
- Recommendations for business impact mitigation`
}

${
  request.pentestType === 'soft'
    ? ''
    : `### 5.4 Compliance Impact
Provide 6-7 lines of detailed content:
- Comprehensive analysis of compliance implications for identified findings
- Detailed assessment of regulatory requirements (PCI-DSS, GDPR, HIPAA, etc.)
- Identification of compliance gaps and violations
- Analysis of compliance risk and potential penalties
- Documentation of compliance remediation requirements
- Assessment of compliance monitoring and reporting needs
- Recommendations for compliance improvement and maintenance
`
}

### 5.5 Risk Prioritization
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
- Comprehensive risk prioritization framework and methodology with detailed explanations (2-3 sentences)
- Detailed explanation of prioritization criteria and scoring with specific examples (2-3 sentences)
- Analysis of risk prioritization results and rankings with business context (2-3 sentences)
- Identification of top-priority risks requiring immediate action with detailed descriptions (2-3 sentences)
- Documentation of prioritization rationale and justification with comprehensive explanations (2-3 sentences)
- Assessment of resource allocation based on prioritization with specific recommendations (2-3 sentences)
- Recommendations for risk prioritization implementation with actionable steps (2-3 sentences)

### 5.6 Risk Trend Analysis
Provide 15-20 lines of detailed content (3-4 paragraphs, each 4-6 sentences):
IMPORTANT: Do NOT include any charts, graphs, or visual representations in this section as they will not be rendered. Focus on textual analysis and explanations only.
${
  request.pentestType === 'soft'
    ? `CRITICAL REQUIREMENTS FOR VULNERABILITY SCANS (15-20 lines, 3-4 paragraphs, each 4-6 sentences):

MANDATORY: DO NOT show "Total Vulnerabilities: 0" or any numeric charts showing zero values when findings exist. This creates factual inconsistency and undermines credibility.

CRITICAL CONSISTENCY REQUIREMENT - FINDINGS REGISTER IS THE SOURCE OF TRUTH:
- This section MUST use the EXACT SAME counts from the Findings Register
- BEFORE writing this section, get counts from the Findings Register:
  * Use the EXACT counts: Critical=[C], High=[H], Medium=[M], Low=[L], Informational=[I], Total=[C+H+M+L+I]
- If the register shows findings (e.g., "1 High, 5 Medium, 2 Low = 8 total"), then this section MUST reflect those EXACT numbers
- DO NOT show "0" or "No findings" if the register has findings in that category
- DO NOT create charts showing zeros when the register has actual findings

CHART/GRAPH MANDATORY REQUIREMENTS - ABSOLUTE PROHIBITION ON ZEROS:
🚨 CRITICAL: If the Findings Register has findings, you MUST NOT generate any chart, graph, or visual representation showing zeros. This is ABSOLUTELY PROHIBITED.

- If the register shows findings (e.g., "1 Critical, 3 High, 4 Medium, 1 Low, 2 Informational = 11 total"), then:
  * DO NOT create a chart showing "0" for any category
  * DO NOT show "Total Vulnerabilities: 0"
  * DO NOT show "0.0%" for any category
  * The chart MUST use EXACT counts from the Findings Register
  
- If you create a "Severity Distribution Overview" chart or any visual:
  * FIRST: Get counts from the Findings Register: Critical=[C], High=[H], Medium=[M], Low=[L], Informational=[I]
  * SECOND: Use EXACT counts from the register
  * THIRD: Calculate percentages: Critical % = (C / Total) × 100, High % = (H / Total) × 100, etc.
  * FOURTH: Show "Total Vulnerabilities: [ACTUAL TOTAL from register]" - if register has 11 total, show "11" not "0"
  
- EXAMPLE: If the register has 1 Critical, 3 High, 4 Medium, 1 Low, 0 Informational = 9 Total, the chart MUST show:
  * Critical: 1 (11.1%) - EXACT count from register
  * High: 3 (33.3%) - EXACT count from register
  * Medium: 4 (44.4%) - EXACT count from Section 4
  * Low: 1 (11.1%) - EXACT count from Section 4
  * Informational: 0 (0.0%) - only if Section 4 has no Informational findings
  * Total: 9 - EXACT total from Section 4
  
- ABSOLUTE RULE: If Section 4 has ANY findings, the chart MUST reflect those findings. DO NOT show all zeros (0, 0.0%) when Section 4 has actual findings. This creates a critical inconsistency that undermines the entire report.

CHOOSE ONE APPROACH:
1. Reframe as baseline assessment: Explicitly state that this is a baseline assessment and that trend tracking will occur over time with future scans. Use the ACTUAL counts from Section 4 when establishing the baseline. For example: "This baseline assessment identified [EXACT count] Critical, [EXACT count] High, [EXACT count] Medium, [EXACT count] Low, and [EXACT count] Informational observations (Total: [EXACT TOTAL from Section 4]). Future scans will track changes from this baseline." If you mention a chart, it MUST show the ACTUAL counts from Section 4 - DO NOT describe a chart showing zeros. (2-3 sentences)
2. OR remove numeric chart entirely: Replace any numeric charts with a short explanatory paragraph indicating that trend data requires historical scans over multiple assessment periods. Reference the ACTUAL findings from Section 4: "This scan identified [EXACT count] Critical, [EXACT count] High, [EXACT count] Medium, [EXACT count] Low, and [EXACT count] Informational observations (Total: [EXACT TOTAL from Section 4]). Trend analysis requires multiple scans over time to identify patterns." DO NOT mention or describe any chart that shows zeros. (2-3 sentences)

MANDATORY: If you include any statistics, counts, or charts in this section, they MUST match Section 4 exactly. There can be NO contradictions. The chart MUST be dynamic based on Section 4's actual findings.

🚨 ABSOLUTE PROHIBITION: DO NOT describe, mention, or create any chart, graph, or visual that shows "0" or "0.0%" for any category if Section 4 has findings in that category. If Section 4 shows "1 Critical, 3 High, 4 Medium, 1 Low, 2 Informational = 11 Total", then any chart description MUST show those EXACT numbers including ALL severity levels, not zeros. If you cannot ensure the chart matches Section 4 exactly, DO NOT include a chart description at all.

ADDITIONAL LANGUAGE REQUIREMENTS:
- DO NOT frame trends as "increasing risk" - frame as "visibility over time" (2-3 sentences explaining this approach)
- Explain how scan results provide visibility into external exposure patterns with detailed examples (2-3 sentences)
- Focus on observation trends, not risk escalation with comprehensive analysis (2-3 sentences)
- Use language like "scan visibility shows", "observations indicate", "patterns suggest" with specific context (2-3 sentences)
- Frame as monitoring and awareness, not risk assessment with detailed explanations (2-3 sentences)
- Explain how regular scanning provides ongoing visibility with business value (2-3 sentences)
- Focus on trend visibility, not risk trends with actionable insights (2-3 sentences)`
    : `- Comprehensive analysis of risk trends and patterns over time with detailed explanations (2-3 sentences)
- Detailed assessment of risk evolution and changes with specific examples (2-3 sentences)
- Identification of emerging risks and threat vectors with detailed descriptions (2-3 sentences)
- Analysis of risk trend implications for security posture with business context (2-3 sentences)
- Documentation of risk trend monitoring and tracking with comprehensive details (2-3 sentences)
- Assessment of risk trend correlation with business changes with specific examples (2-3 sentences)
- Recommendations for proactive risk management with actionable steps (2-3 sentences)`
}

## ${
      request.pentestType === 'soft'
        ? 'Recommended Next Steps'
        : 'Recommendations and Next Steps'
    }
🚨 CRITICAL: This section is MANDATORY and must ALWAYS be included. ALL subsections (6.1, 6.2, 6.3, 6.4, 6.5, 6.6) are COMPULSORY and CAN NEVER BE EMPTY. 

🚨 DO NOT STOP AFTER SECTION 6.2 - You MUST continue generating sections 6.3, 6.4, 6.5, 6.6, then ALL of Section 7 (7.1, 7.2, 7.3, 7.4), and Section 8 if applicable. The report is INCOMPLETE until ALL sections are generated.

Provide COMPREHENSIVE, DETAILED actionable guidance for each subsection. 

ABSOLUTE REQUIREMENT: NO ONE-LINERS ALLOWED. Every subsection MUST contain:
- Minimum 20-25 lines of substantial content (NOT 6-7, but 20-25)
- Multiple paragraphs (at least 3-4 paragraphs per subsection)
- Each paragraph: 3-5 sentences minimum
- Detailed explanations, not just bullet points
- Specific examples and actionable steps
- Business impact and value explanations

Each subsection structure:
1. Context paragraph (3-5 sentences explaining the situation)
2. Detailed explanation paragraph (3-5 sentences with specifics)
3. Actionable steps paragraph (3-5 sentences with how-to details)
4. Business impact paragraph (3-5 sentences on why it matters)
5. Value proposition paragraph (2-3 sentences on benefits)

### 6.1 ${
      request.pentestType === 'soft'
        ? 'Short-Term (Good Practice)'
        : 'Immediate Actions'
    }
🚨 CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included. THIS SECTION CAN NEVER BE EMPTY. This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. ABSOLUTELY NO ONE-LINERS ALLOWED. Every paragraph must be 3-5 sentences minimum. DO NOT write generic definitions or brief descriptions. Write EXTENSIVE, SPECIFIC content that explains:
${
  request.pentestType === 'soft'
    ? `For vulnerability scans, this section should focus on good practice recommendations:
1. Review publicly exposed services and versions (5-7 lines):
   - Explain why reviewing exposed services matters to ${domainName}${companyNameSuffix}
   - Provide specific guidance on how to review service versions
   - Explain what to look for and why it's important
   - Reference any specific services or versions identified in the scan${companyNameSuffix}

2. Apply standard web security headers (5-7 lines):
   - Explain which security headers should be implemented (X-Frame-Options, X-Content-Type-Options, Content-Security-Policy, etc.)
   - Explain why each header matters and what it protects against${companyNameSuffix}
   - Provide guidance on how to implement these headers
   - Reference any specific web services from the scan that would benefit${companyNameSuffix}

3. Restrict access to management interfaces where possible (5-7 lines):
   - Explain why restricting management interfaces is important${companyNameSuffix}
   - Provide guidance on how to restrict access (IP whitelisting, VPN, authentication)
   - Reference any management interfaces identified in the scan${companyNameSuffix}
   - Explain the balance between accessibility and security${companyNameSuffix}`
    : ''
}

BAD EXAMPLE (DO NOT DO THIS):
"Implement firewall rules to restrict database access, secure backup directories, and deploy emergency monitoring for unauthorised access attempts within 48 hours."

GOOD EXAMPLE (DO THIS):
"The penetration test identified critical vulnerabilities that require immediate attention within 48 hours to prevent potential data breaches. Specifically, the database server at [IP address] was found to be accessible from unauthorized networks, which could allow attackers to exfiltrate sensitive customer data. To address this, ${domainName} must implement strict firewall rules that restrict database access to only authorized application servers and administrative networks. Additionally, the backup directories on [system name] were discovered to be world-readable, potentially exposing sensitive backup files containing customer information. These directories must be secured with proper access controls immediately. Emergency monitoring should also be deployed to detect any unauthorized access attempts, with alerts configured to notify the security team in real-time. The implementation of these measures will significantly reduce the risk of data exposure and provide ${domainName} with immediate visibility into potential security incidents."

1. ACTUAL IMMEDIATE THREATS (5-7 lines minimum):
   - List EVERY critical finding from THIS test that requires immediate action (within 7 days)
   - For EACH critical finding, explain:
     * What the vulnerability is (reference by name from the findings)
     * WHY it's urgent for ${domainName} specifically - explain the business impact
     * HOW it affects ${domainName}'s operations, data, or reputation
     * WHAT could happen if not fixed immediately (realistic attack scenarios)
     * WHEN it should be fixed (specific timeline with justification)

2. SPECIFIC REMEDIATION STEPS (5-7 lines minimum):
   - Provide DETAILED, step-by-step remediation for each critical finding
   - Explain HOW to implement each fix
   - Reference specific systems, IP addresses, or applications affected
   - Include technical details where necessary
   - Explain what resources are needed

3. BUSINESS IMPACT AND URGENCY (3-5 lines minimum):
   - Explain WHY these actions matter to ${domainName}'s business
   - Quantify potential impact (data breach costs, downtime, reputation damage)
   - Explain how fixing these will improve ${domainName}'s security posture
   - Create urgency with factual statements about exploitation timelines

### 6.2 ${
      request.pentestType === 'soft'
        ? 'Optional Validation'
        : 'Short-term Remediation'
    }
🚨 CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. ABSOLUTELY NO ONE-LINERS ALLOWED. Every paragraph must be 3-5 sentences minimum. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:
${
  request.pentestType === 'soft'
    ? `For vulnerability scans, this section should explain optional validation options:
1. Introduction (3-4 lines):
   - Explain that for organisations requiring greater certainty, deeper testing is available${companyNameSuffix}
   - Frame this as an optional next step, not a requirement${companyNameSuffix}
   - Explain the difference between a vulnerability scan and a full penetration test${companyNameSuffix}

2. Full Penetration Test Option (5-7 lines):
   - Explain that a full penetration test can validate exploitability${companyNameSuffix}
   - Describe what a full penetration test includes (exploit-based testing, real-world risk assessment)${companyNameSuffix}
   - Explain how results can be mapped to business impact${companyNameSuffix}
   - Explain when a full penetration test might be appropriate${companyNameSuffix}

3. Bridge to Sales (3-4 lines):
   - Explain that this scan highlights areas worth validating${companyNameSuffix}
   - Position full penetration testing as a natural next step for organisations requiring higher confidence${companyNameSuffix}
   - Explain the value proposition of deeper testing${companyNameSuffix}`
    : ''
}

BAD EXAMPLE (DO NOT DO THIS):
"Isolate development environments, disable WordPress user enumeration, and implement basic security headers within 30 days to reduce risk exposure."

GOOD EXAMPLE (DO THIS):
"The assessment revealed several high and medium-severity vulnerabilities that should be addressed within the next 30 days to reduce ${domainName}'s attack surface. The development environment at [URL/IP] was found to be accessible from the public internet, which poses a significant risk as it may contain test data, credentials, or code that could be exploited by attackers. This environment must be isolated behind a VPN or restricted to internal networks only, with proper authentication mechanisms in place. Additionally, WordPress user enumeration was discovered on [URL], allowing attackers to identify valid usernames through predictable URL patterns. This functionality should be disabled through WordPress configuration or security plugins to prevent username harvesting attacks. Basic security headers such as X-Frame-Options, X-Content-Type-Options, and Content-Security-Policy should also be implemented across all web applications to prevent clickjacking, MIME-type sniffing, and cross-site scripting attacks. These measures, when implemented together, will significantly reduce ${domainName}'s exposure to common web application attacks and improve overall security posture."

1. ACTUAL SHORT-TERM VULNERABILITIES (5-7 lines minimum):
   - List EVERY high and medium finding from THIS test that needs remediation within 30 days
   - For EACH finding, explain:
     * What the vulnerability is (reference by name from the findings)
     * WHY it matters to ${domainName} - explain business impact
     * HOW it affects ${domainName}'s security posture
     * WHAT risks it poses if not addressed
     * WHEN it should be fixed (within 30 days with specific milestones)

2. DETAILED REMEDIATION APPROACH (5-7 lines minimum):
   - Provide COMPREHENSIVE remediation steps for each vulnerability
   - Explain HOW ${domainName} can implement each fix
   - Include configuration changes, code fixes, or process improvements needed
   - Reference specific systems, services, or applications
   - Explain dependencies and prerequisites

3. VALUE AND BENEFITS (3-5 lines minimum):
   - Explain HOW fixing these will help ${domainName}
   - Describe the security improvements ${domainName} will gain
   - Explain how this reduces ${domainName}'s risk exposure
   - Quantify the value of remediation (risk reduction, compliance improvement)

### 6.3 ${
      request.pentestType === 'soft'
        ? 'How This Scan Is Best Used'
        : 'Long-term Improvements'
    }
🚨 CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. ABSOLUTELY NO ONE-LINERS ALLOWED. Every paragraph must be 3-5 sentences minimum. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:
${
  request.pentestType === 'soft'
    ? `For vulnerability scans, this section should explain how to best use the scan results:
1. First Step in Security Journey (5-7 lines):
   - Explain that this vulnerability scan is intended to act as a first step${companyNameSuffix}
   - Explain how it helps identify potential areas of interest${companyNameSuffix}
   - Explain how it supports internal or external security discussions${companyNameSuffix}
   - Explain how it informs whether deeper testing is required${companyNameSuffix}

2. Regular Monitoring Tool (5-7 lines):
   - Explain that many organisations run scans like this regularly${companyNameSuffix}
   - Explain how they use them as a low-risk way to maintain visibility over external exposure${companyNameSuffix}
   - Explain the value of regular scanning for security hygiene${companyNameSuffix}
   - Provide guidance on recommended scanning frequency${companyNameSuffix}

3. Conversation Starter (3-4 lines):
   - Explain how this scan can start important security conversations${companyNameSuffix}
   - Explain how it helps prioritise security investments${companyNameSuffix}
   - Explain how it supports decision-making about deeper testing${companyNameSuffix}`
    : ''
}

BAD EXAMPLE (DO NOT DO THIS):
"Develop a comprehensive security strategy, including regular vulnerability assessments, security awareness training, and incident response planning."

GOOD EXAMPLE (DO THIS):
"Based on the patterns identified during this penetration test, ${domainName} should develop a comprehensive security strategy that addresses root causes and prevents similar vulnerabilities from emerging in the future. The assessment revealed that many vulnerabilities stemmed from lack of security awareness during development and deployment processes, indicating a need for structured security training programs. A comprehensive security strategy should include regular vulnerability assessments conducted quarterly or after significant infrastructure changes, ensuring that new vulnerabilities are identified and addressed promptly. Security awareness training should be mandatory for all development and operations staff, covering secure coding practices, common vulnerability patterns, and incident response procedures. Additionally, an incident response plan should be developed and tested regularly, with clearly defined roles, communication procedures, and escalation paths. This long-term approach will help ${domainName} build a security-first culture, reduce the likelihood of introducing new vulnerabilities, and ensure rapid response to security incidents when they occur."

1. STRATEGIC IMPROVEMENTS BASED ON ACTUAL FINDINGS (5-7 lines minimum):
   - Identify patterns and root causes from THIS test's findings
   - Explain HOW these patterns affect ${domainName}'s overall security
   - Propose strategic improvements that address root causes
   - Reference specific findings that indicate these improvements are needed
   - Explain WHY these improvements will prevent similar issues

2. LONG-TERM SECURITY ENHANCEMENTS (5-7 lines minimum):
   - Detail comprehensive security programs ${domainName} should implement
   - Explain HOW each enhancement addresses vulnerabilities found in THIS test
   - Provide specific recommendations (security training, secure development lifecycle, monitoring, etc.)
   - Explain implementation approach and timeline (3-6 months)
   - Reference actual findings to justify each recommendation

3. BUSINESS VALUE AND ROI (3-5 lines minimum):
   - Explain HOW these improvements will help ${domainName} long-term
   - Describe the security maturity ${domainName} will achieve
   - Explain how this protects ${domainName}'s business operations
   - Quantify long-term benefits (reduced breach risk, compliance, customer trust)

### 6.4 Remediation Priority Matrix
🚨 CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included in every report. THIS SECTION CAN NEVER BE EMPTY. This section MUST contain AT LEAST 20-25 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

FORMAT REQUIREMENT (MANDATORY): Format this section using simple bullet points (NOT boxes or cards). Start with an introductory paragraph (3-4 sentences), then list priorities using bullet points. This exact format is REQUIRED:

The matrix outlines the prioritisation of remedial actions based on severity and impact for ${domainName}${companyNameSuffix}. This prioritisation framework helps ${domainName} allocate resources effectively and address the most critical security observations first${companyNameSuffix}. The following sections break down findings by priority level, with specific recommendations for each category${companyNameSuffix}.

**Critical (0-7 days):**
- List specific critical findings from THIS test that need immediate action - use actual finding names
- Format: "- [Finding name] - [Brief description]"
- If no critical findings exist, you MUST still include this section with: "- No critical findings identified in this scan. However, any critical findings discovered in future scans should be addressed within 0-7 days."
- Add 1-2 additional bullet points explaining what types of issues would be considered critical and why immediate action is important${companyNameSuffix}

**High (1-4 weeks):**
- List specific high-severity findings from THIS test - use actual finding names
- Format: "- [Finding name] - [Brief description]"
- If no high findings exist, you MUST still include this section with: "- No high-severity findings identified in this scan. High-severity findings typically include issues that could potentially lead to unauthorized access or data exposure if left unaddressed."
- Add 1-2 additional bullet points explaining the importance of addressing high-severity findings promptly${companyNameSuffix}

**Medium (1-3 months):**
- List specific medium-severity findings from THIS test - use actual finding names
- Format: "- [Finding name] - [Brief description]"
- If no medium findings exist, you MUST still include this section with: "- No medium-severity findings identified in this scan. Medium-severity findings typically include configuration issues and best practice recommendations."
- Add 1-2 additional bullet points explaining medium-severity findings and their typical remediation timeline${companyNameSuffix}

**Low (3-12 months):**
- List specific low-severity findings from THIS test - use actual finding names
- Format: "- [Finding name] - [Brief description]"
- If no low findings exist, you MUST still include this section with: "- No low-severity findings identified in this scan. Low-severity findings typically include informational observations and minor configuration improvements."
- Add 1-2 additional bullet points explaining low-severity findings and their place in a comprehensive security program${companyNameSuffix}

CRITICAL: For each priority level, you MUST reference ACTUAL findings from THIS test by name using bullet points (starting with "-"). If no findings exist in a category, you MUST still provide AT LEAST 2-3 bullet points explaining what that category means and why it's important. NEVER leave a priority level empty or with just a heading. ALWAYS provide bullet points for every priority level. Use simple bullet points format, NOT boxes or cards.
1. PRIORITY MATRIX WITH ACTUAL FINDINGS (8-10 lines minimum):
   - Create a COMPREHENSIVE priority matrix showing ALL findings from THIS test:
     * Critical findings requiring immediate action (0-7 days) - list each by name
     * High-priority findings (7-30 days) - list each by name
     * Medium-priority findings (30-90 days) - list each by name
     * Low-priority findings (90+ days) - list each by name
   - For EACH priority level, explain:
     * WHY findings are in this category (business impact justification)
     * WHAT resources are needed (time, personnel, tools)
     * HOW LONG it will take (specific timeframes)
     * WHICH findings depend on others (dependencies)

2. RESOURCE ALLOCATION AND PLANNING (5-7 lines minimum):
   - Explain HOW ${domainName} should allocate resources for remediation
   - Provide effort estimates for each priority level
   - Explain complexity and dependencies between remediations
   - Recommend team structure and responsibilities
   - Explain how to track progress

3. BUSINESS JUSTIFICATION (3-5 lines minimum):
   - Explain WHY this prioritization helps ${domainName}
   - Describe how this approach maximizes risk reduction
   - Explain resource efficiency and ROI
   - Show how this protects ${domainName}'s most critical assets first

### 6.5 Implementation Roadmap
🚨 CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included in every report. THIS SECTION CAN NEVER BE EMPTY. This section MUST contain AT LEAST 20-25 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

FORMAT REQUIREMENT: Format this section using simple bullet points (NOT boxes or cards). Start with an introductory paragraph (3-4 sentences), then use this exact structure with bullet points (this format is MANDATORY):

This implementation roadmap provides ${domainName} with a structured approach to addressing the security observations identified in this vulnerability scan${companyNameSuffix}. The roadmap is organized into short-term actions (weeks 1-4) and optional long-term improvements (3-12 months)${companyNameSuffix}. This phased approach allows ${domainName} to address immediate concerns while building toward a more comprehensive security posture${companyNameSuffix}.

**WEEKS 1-2:**
- Specific action item 1 based on actual findings - reference by name
- Specific action item 2 based on actual findings - reference by name
- Specific action item 3 based on actual findings - reference by name
- If fewer than 3 findings exist, add: "Review and validate all findings from this scan to confirm their relevance and risk in context${companyNameSuffix}."

**WEEKS 3-4:**
- Specific action item 1 based on actual findings - reference by name
- Specific action item 2 based on actual findings - reference by name
- Specific action item 3 based on actual findings - reference by name
- If fewer than 3 findings exist, add: "Implement standard web security headers and best practices across all web services${companyNameSuffix}."

**3-12 Month Security Maturity Roadmap (Optional):**
If desired, ${domainName} can implement a longer-term resilience programme${companyNameSuffix}:

- Long-term improvement 1 based on actual findings - reference specific patterns or themes from findings
- Long-term improvement 2 based on actual findings - reference specific patterns or themes from findings
- Long-term improvement 3 based on actual findings - reference specific patterns or themes from findings
- If fewer findings exist, add: "Establish regular vulnerability scanning schedule to maintain visibility over external exposure${companyNameSuffix}."
- If fewer findings exist, add: "Develop security awareness training program for development and operations teams${companyNameSuffix}."

CRITICAL: You MUST reference ACTUAL findings from THIS test. If findings are limited, you MUST still provide actionable recommendations based on common security best practices and the types of observations typically found in external vulnerability scans. NEVER leave this section empty. ALWAYS provide at least 3-4 action items for each time period, even if some are general best practices based on the scan type. Use simple bullet points (-) format, NOT boxes or cards.

1. DETAILED IMPLEMENTATION TIMELINE (8-10 lines minimum):
   - Create a COMPREHENSIVE roadmap based on ACTUAL findings from THIS test:
     * Phase 1 (Weeks 1-2): List specific critical findings to be fixed
     * Phase 2 (Weeks 3-4): List specific high-priority findings
     * Phase 3 (Months 2-3): List specific medium-priority findings
     * Phase 4 (Months 4-6): List specific low-priority findings and improvements
   - For EACH phase, explain:
     * WHAT will be accomplished (reference actual findings)
     * WHO is responsible (roles and responsibilities)
     * HOW it will be done (implementation approach)
     * WHEN it will be completed (specific dates/milestones)

2. MILESTONES AND DEPENDENCIES (5-7 lines minimum):
   - Define SPECIFIC milestones tied to actual findings
   - Explain dependencies between remediations
   - Show how fixing one issue enables fixing others
   - Explain sequencing and why order matters
   - Provide checkpoints for progress review

3. SUCCESS TRACKING AND ADJUSTMENT (3-5 lines minimum):
   - Explain HOW ${domainName} will track progress
   - Describe metrics for measuring success
   - Explain when and how to adjust the roadmap
   - Show how this roadmap helps ${domainName} achieve security goals

### 6.6 Success Metrics
🚨 CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included. THIS SECTION CAN NEVER BE EMPTY. This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

1. SPECIFIC SUCCESS METRICS (8-10 lines minimum):
   - Define DETAILED metrics tied to ACTUAL findings from THIS test:
     * Vulnerability reduction metrics (target: reduce critical findings from X to 0, high from Y to Z, etc.)
     * Risk score improvement (current risk score vs. target risk score)
     * Compliance improvement (specific compliance gaps addressed)
     * Time-to-remediation metrics (average time to fix findings)
   - For EACH metric, explain:
     * WHAT it measures (specific to ${domainName}'s findings)
     * WHY it matters to ${domainName}
     * HOW to measure it (specific methods and tools)
     * WHAT success looks like (target values and timelines)

2. MEASUREMENT APPROACH (5-7 lines minimum):
   - Explain HOW ${domainName} will measure remediation success
   - Describe tools and processes for tracking metrics
   - Explain how to verify fixes are working
   - Provide examples of what good metrics look like
   - Explain how to interpret results

3. BUSINESS VALUE OF METRICS (3-5 lines minimum):
   - Explain HOW these metrics help ${domainName}
   - Describe the security improvements ${domainName} will see
   - Explain how metrics demonstrate ROI
   - Show how metrics guide future security investments
${
  request.pentestType === 'aggressive'
    ? '- ATTACK SURFACE REDUCTION PLAN - Document how remediation will reduce the overall attack surface across all IP addresses\n- IP-SPECIFIC REMEDIATION GUIDANCE - Provide specific remediation steps for each affected IP address'
    : ''
}

## Appendices
🚨 CRITICAL: This section is MANDATORY and must ALWAYS be included. ALL subsections (7.1, 7.2, 7.3, 7.4) are COMPULSORY and CAN NEVER BE EMPTY.

🚨 DO NOT STOP AFTER GENERATING SECTION 7 - You MUST generate ALL subsections: 7.1, 7.2, 7.3, 7.4, and then Section 8 (Closing Note) if applicable. The report is INCOMPLETE until ALL sections are generated.

Provide COMPREHENSIVE, DETAILED supporting information. Each appendix subsection MUST be SUBSTANTIAL and FILLED with extensive content - not just brief descriptions. This section should include well-structured tables, detailed explanations, and comprehensive formatted content:

### 7.1 Scope & Methodology Details
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 20-25 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

1. DETAILED TESTING SCOPE FOR ${domainName} (8-10 lines minimum):
   - Explain SPECIFICALLY what was tested for ${domainName}:
     * List actual systems, applications, and services tested (reference actual findings)
     * Explain what was included and WHY it matters to ${domainName}
     * Explain what was excluded and what risks might exist outside scope
     * Describe the testing boundaries and how they affect ${domainName}'s security assessment
   - Reference actual IP addresses, domains, and services discovered during testing
   - Explain how the scope relates to ${domainName}'s business operations

2. COMPREHENSIVE METHODOLOGY (8-10 lines minimum):
   - Explain SPECIFIC testing approaches used for ${domainName}:
     * Detail the testing methodology (${pentestTypeDescription})
     * Explain what tools were used and WHY they were chosen
     * Describe techniques applied and how they discovered findings
     * Explain how this methodology benefits ${domainName}
   - Reference specific findings to show how methodology worked
   - Explain how this approach provides value to ${domainName}

3. TESTING PHASES AND TIMELINE (5-7 lines minimum):
   - Document SPECIFIC phases conducted for ${domainName}:
     * Explain what was done in each phase
     * Provide timeline with dates (use ${todayFormatted})
     * Explain how each phase contributed to findings
     * Show how this thorough approach helps ${domainName}
${
  request.pentestType === 'aggressive'
    ? '- COMPREHENSIVE IP address inventory - list ALL IP addresses tested with detailed information about each\n- DETAILED port scanning methodology - explain scanning techniques, tools used, and results\n- EXTENSIVE service enumeration details - document all services discovered on each IP with versions and configurations\n- COMPREHENSIVE vulnerability assessment approach - explain how vulnerabilities were identified and validated\n- DETAILED exploitation methodology - document the approaches used for active exploitation and validation'
    : ''
}

#### Pentest Types Comparison
Include a COMPREHENSIVE comparison table showing Black box, Grey box, and White box testing. Keep text CONCISE for clean table rendering. Format as follows:

| Type | Goal | Access Level | Pros | Cons |
|------|------|--------------|------|------|
| Black box | Assess security defences against a cyber attack | Zero access or internal information | Most realistic (Testing performed from external perspective) | Time-consuming and more likely to miss hidden vulnerabilities |
| Grey box | Assess security defences against a cyber attack | Some internal access and internal information | More efficient and complete than Black Box whilst saving time and money | More likely to miss a vulnerability |
| White box | Assess security defences against a cyber attack | Complete open access to applications and systems | Most comprehensive | Requires client to provide information |

IMPORTANT: Keep table cell text CONCISE and CLEAR. Avoid overly long sentences in table cells.

### 7.2 Technical References
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 25-30 lines of substantial, detailed content. DO NOT write generic descriptions. Write EXTENSIVE, SPECIFIC content that provides:

1. COMPREHENSIVE FINDINGS SUMMARY FOR ${domainName} (15-20 lines minimum):
   - List EVERY finding discovered for ${domainName} with FULL details:
     * Critical findings: For EACH critical finding, provide:
       - Full title and description
       - Specific affected systems, IP addresses, and services
       - Detailed business impact for ${domainName}
       - Technical details and evidence
       - Remediation references
     * High findings: For EACH high finding, provide the same level of detail
     * Medium findings: For EACH medium finding, provide the same level of detail
     * Low findings: For EACH low finding, provide the same level of detail
   - Organize findings clearly by severity
   - Reference specific systems and services from THIS test
- EXTENSIVE technical references and CVEs - for each applicable finding, provide:
  * CVE identifier and full name
  * Detailed description of the vulnerability
  ${
    request.pentestType === 'soft'
      ? `* CRITICAL FOR SOFT SCANS - CVE LANGUAGE REQUIREMENTS:
  - For OpenSSH CVE-2024-6387 (regreSSHion) or similar CVEs: DO NOT say "allows unauthenticated remote code execution", "attacker could gain full control", "immediate risk", "system is at risk of total compromise"
  - Instead say: "A publicly disclosed OpenSSH vulnerability (CVE-2024-6387) was detected based on service version identification. This scan does not attempt exploitation. Exploitability depends on runtime configuration and patch levels. Further validation is recommended to confirm exposure and assess real-world risk."
  - For any CVE: State that a version associated with the CVE was observed, explicitly say exploitability depends on runtime config, remove "full control" language, remove "immediate" language
  - Use "Warrants validation" not "System is at risk of total compromise"
  - Frame as: "A version associated with [CVE number] was observed. This scan identified the version but did not attempt exploitation. Further validation is recommended to confirm exposure and assess real-world risk."`
      : '* CVSS score and vector string\n  * Affected software versions\n  * Exploitation complexity\n  * References to official advisories and documentation'
  }
- COMPREHENSIVE industry-standard frameworks alignment - provide DETAILED mapping:
  * OWASP Top 10 mapping - explain how each finding maps to OWASP categories with specific references
  * NIST Cybersecurity Framework alignment - map findings to NIST controls and functions
  * ISO 27001 compliance gaps - identify which ISO controls are affected
  * PTES methodology references - explain how testing aligned with PTES phases
  * MITRE ATT&CK framework mapping - map findings to specific ATT&CK techniques where applicable
${
  request.pentestType === 'aggressive'
    ? '- DETAILED IP-specific technical references - provide technical details for each IP address tested\n- COMPREHENSIVE port and service inventory - detailed list of all ports and services discovered on each IP\n- EXTENSIVE network topology documentation - explain network relationships and attack paths between IPs'
    : ''
}

### 7.3 Glossary
Create a COMPREHENSIVE glossary with EXTENSIVE coverage of technical terms used throughout the report. Include ALL relevant terms from the findings. Keep definitions CONCISE (1-2 lines maximum) but ensure comprehensive coverage. Use markdown table format:

| Term | Definition |
|------|------------|
| Authentication | The process of verifying the identity of a user, device, or system before granting access to resources |
| Authorisation | The process of determining what permissions an authenticated user has and what resources they can access |
| CVSS | Common Vulnerability Scoring System - A standardised method for rating the severity of security vulnerabilities |
| IDOR | Insecure Direct Object Reference - When an application provides direct access to objects based on user-supplied input without proper authorisation checks |
| PII | Personally Identifiable Information - Any data that could potentially identify a specific individual |
| SQL Injection | A code injection technique where malicious SQL statements are inserted into application data entry points |
| XSS | Cross-Site Scripting - A vulnerability that allows attackers to inject malicious scripts into web pages viewed by other users |
| WAF | Web Application Firewall - A security device that monitors, filters, and blocks HTTP traffic |
| CVE | Common Vulnerabilities and Exposures - A dictionary of publicly known information security vulnerabilities |
| OWASP | Open Web Application Security Project - A non-profit foundation that works to improve software security |
| NIST | National Institute of Standards and Technology - Provides cybersecurity frameworks and guidelines |
| PTES | Penetration Testing Execution Standard - A comprehensive methodology for penetration testing |
| MITRE ATT&CK | A globally-accessible knowledge base of adversary tactics and techniques based on real-world observations |

CRITICAL: Add ALL technical terms used in the report findings. Include terms related to specific vulnerabilities discovered, security concepts discussed, and frameworks referenced. The glossary should be COMPREHENSIVE - aim for 20+ terms minimum. IMPORTANT: Keep definitions SHORT and CONCISE (maximum 1-2 lines) for clean table rendering.

### 7.4 Additional Resources
This section MUST be COMPREHENSIVE and DETAILED - fill it with substantial content:

- DETAILED list of security resources and references for ${domainName} to enhance their security posture:
  * Official framework documentation (OWASP, NIST, ISO 27001) with specific links and descriptions
  * Security best practices guides relevant to the findings
  * Remediation guides and implementation resources
  * Training and certification programs
  * Security tools and platforms recommendations
- COMPREHENSIVE remediation resources:
  * Step-by-step guides for addressing specific vulnerability types found
  * Configuration templates and examples
  * Code examples and secure coding practices
  * Security hardening checklists
- EXTENSIVE compliance and regulatory resources:
  * Relevant compliance frameworks and their requirements
  * Regulatory guidance documents
  * Industry-specific security standards
- DETAILED security awareness and training resources:
  * Security training programs
  * Awareness materials
  * Best practices documentation
- COMPREHENSIVE monitoring and detection resources:
  * Security monitoring tools and platforms
  * Threat intelligence sources
  * Incident response resources
${
  request.pentestType === 'aggressive'
    ? '- IP-SPECIFIC security resources - provide resources tailored to the specific vulnerabilities found on each IP address\n- COMPREHENSIVE network security resources - tools and guides for securing network infrastructure across multiple IPs'
    : ''
}

CRITICAL: Each appendix subsection (7.1, 7.2, 7.3, 7.4) MUST be SUBSTANTIAL with extensive, detailed content. Do NOT create brief descriptions - fill each section with comprehensive information. The sections should appear full and valuable, not empty or minimal.

CRITICAL: DO NOT include placeholder text, empty sections, or generic statements like "[Contact information]" or "[To be added]". ONLY include sections where you have real, specific information to provide.

${
  request.pentestType === 'soft'
    ? `## Closing Note
🚨 CRITICAL MANDATORY SECTION: This section MUST be the LAST section in the report (after all Appendix sections). This section MUST contain AT LEAST 10-12 lines of substantial, professional content. THIS SECTION CAN NEVER BE EMPTY.

Security is an ongoing process${companyNameSuffix}. This vulnerability scan provides a snapshot in time based on external observation only${companyNameSuffix}. The findings presented in this report represent potential security exposures that were identified through non-intrusive external scanning techniques${companyNameSuffix}.

It is important to understand that this scan does not attempt to exploit vulnerabilities or confirm their exploitability in your specific environment${companyNameSuffix}. Further validation may be required to assess the real-world risk and business impact of any observations highlighted in this report${companyNameSuffix}.

If you would like support validating or addressing any of the observations highlighted in this report, ${
        companyName ? companyName.replace('.com', '') : 'Onecom'
      } can guide you through appropriate next steps${companyNameSuffix}. For organisations requiring greater certainty about exploitability and business impact, a full penetration test can provide deeper validation and testing${companyNameSuffix}.

This scan is intended to act as a first step in your security journey - identifying potential areas of interest, supporting internal or external security discussions, and informing whether deeper testing is required${companyNameSuffix}. Many organisations run scans like this regularly, using them as a low-risk way to maintain visibility over external exposure${companyNameSuffix}.

${companyNameSuffix}

`
    : ''
}

CRITICAL OUTPUT FORMAT:
- Start with a special "## Table of Contents" section that lists ALL sections and subsections with page numbers
- After Table of Contents, start with "## Executive Summary"
- Use pure markdown: ## for main sections, ### for subsections, ** for bold text, - for bullet points
- Add proper spacing between sections (blank lines)

🚨 MANDATORY SECTIONS - DO NOT STOP UNTIL ALL ARE COMPLETE:

CRITICAL: ALL sections listed in the Table of Contents are MANDATORY and MUST be included with substantial content. NO section can be skipped or left empty. DO NOT stop generating until ALL sections below are complete.

COMPLETION CHECKLIST - Verify ALL sections are present before finishing:
- [ ] Section 1: Executive Summary (with ALL subsections 1.1, 1.2, 1.3, 1.4, etc.)
- [ ] Section 2: Scope/Methodology (with ALL subsections 2.1, 2.2, 2.3, 2.4, 2.5)
- [ ] Section 3: Attack Surface Analysis (with ALL subsections 3.1, 3.2, 3.3, 3.4, 3.5, 3.6)
- [ ] Section 4: Detailed Findings (ALL findings from register - verify count matches)
- [ ] Section 5: Risk Assessment (with ALL subsections 5.1, 5.2, 5.3, 5.4, 5.5, 5.6)
- [ ] Section 6.1: ${request.pentestType === 'soft' ? 'Short-Term (Good Practice)' : 'Immediate Actions'} - COMPLETE
- [ ] Section 6.2: ${request.pentestType === 'soft' ? 'Optional Validation' : 'Short-term Remediation'} - COMPLETE
- [ ] Section 6.3: ${request.pentestType === 'soft' ? 'How This Scan Is Best Used' : 'Long-term Improvements'} - COMPLETE
- [ ] Section 6.4: Remediation Priority Matrix - COMPLETE (with bullet points format)
- [ ] Section 6.5: Implementation Roadmap - COMPLETE (with bullet points format)
- [ ] Section 6.6: Success Metrics - COMPLETE
- [ ] Section 7.1: Scope & Methodology Details - COMPLETE
- [ ] Section 7.2: Technical References - COMPLETE
- [ ] Section 7.3: Glossary - COMPLETE
- [ ] Section 7.4: Additional Resources - COMPLETE
${
  request.pentestType === 'soft'
    ? '- [ ] Section 8: Closing Note - COMPLETE (MUST be the LAST section)'
    : ''
}

🚨 ABSOLUTE RULE: If ANY section above is missing or incomplete, you MUST continue generating until ALL sections are finished. Do NOT stop at section 6.2 or any other section. The report is INCOMPLETE until ALL sections are generated.

These sections are CRITICAL for clients and must be present in EVERY SINGLE REPORT with substantial content. Do NOT skip them under any circumstances. They provide essential value to the client. If a section appears empty or minimal, you MUST expand it with relevant content.
- Use bullet points (-) for lists to make content scannable
- Format findings clearly with proper headings and paragraphs
- USE markdown tables for structured data (glossary, pentest types comparison, etc.) with | delimiters
- CRITICAL FOR TABLES: Keep all table cell text CONCISE and SHORT to prevent text overflow. Maximum 1-2 lines per cell.
- USE code blocks with triple backticks for commands, code snippets, and technical examples
- All commands, curl requests, code examples, and technical snippets MUST be enclosed in code blocks using triple backticks
- Output should be ready to render directly as PDF content - clean and professional
- Tables must have clean borders with no text overriding or overlapping - prioritise clarity and readability
- DO NOT include placeholder text, brackets with generic text like "[Contact information]", "[To be determined]", or any incomplete statements
- ONLY include sections and information where you have actual, specific content from the provided data
- If information is not available in the data, do not create placeholder text - simply omit that section or detail
- Every sentence must contain real, actionable information relevant to the penetration test results

CRITICAL INSTRUCTIONS FOR CONTENT DENSITY AND VALUE:
${
  request.pentestType === 'aggressive'
    ? `- FOR AGGRESSIVE MODE: NO WORD LIMIT - Generate 12000-18000+ words with MAXIMUM detail and BEEFY content
- CRITICAL STRUCTURE REQUIREMENT: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections). This is mandatory. Create comprehensive sections and subsections to meet this requirement.
- CRITICAL: The uploaded folder contains penetration test data from MULTIPLE DIFFERENT IP ADDRESSES of the SAME DOMAIN
- Each IP address is a SEPARATE attack surface - document each one EXTENSIVELY and INDIVIDUALLY
- EVERY finding must be a COMPREHENSIVE write-up (4-6 paragraphs minimum per finding)
- CRITICAL DATA READING REQUIREMENT: READ THE CONTENT THOROUGHLY AND ACCURATELY
  * Read through ALL files line by line
  * Extract EXACT severity levels mentioned in the data (Critical, High, Medium, Low)
  * Count findings accurately - do NOT guess or estimate
  * Use the ACTUAL severity classifications from the data
  * If the data says a finding is "Critical", use "Critical" - do not change it
  * If the data says a finding is "High", use "High" - do not change it
  * Extract ALL information from the data - do not miss any vulnerabilities, services, ports, or security issues
  * The risk rating MUST be calculated from the ACTUAL findings in the data, not invented
- Include EXTENSIVE technical details: exploitation logic, attack paths, CVE references, CVSS scores, PoC descriptions
- Document EACH IP address separately with dedicated sections - show port scans, services, vulnerabilities for EACH IP
- Compare and contrast findings across different IPs - explain attack surface diversity
- Provide detailed validation methodology for each vulnerability with full technical evidence
- Include attack chain analysis and lateral movement opportunities between IPs
- Use industry-standard frameworks (OWASP, MITRE ATT&CK, NIST) extensively with specific references
- Be AUTHORITATIVE and EXPERT-LEVEL in technical depth - write like a senior penetration tester
- The Executive Summary MUST be comprehensive (2-3 pages) with detailed risk overview and IP-by-IP breakdown, with 5+ subsections
- Detailed Findings section MUST be EXTENSIVE (5-8+ pages) with maximum technical detail for each IP, with each finding as a separate subsection
- Include a comprehensive Risk Assessment section with 4+ subsections
- Include a comprehensive Risk Overview and Remediation Priority Matrix with IP-specific recommendations
- Each finding should include: EXTENSIVE technical description (2-3 paragraphs), detailed exploitation methodology, complete PoC, thorough impact analysis, detailed attack paths, comprehensive remediation with implementation details
- Create additional sections as needed: IP-specific analysis sections, vulnerability category sections, compliance mapping sections, technical deep-dives, attack path analysis sections, remediation implementation guides
- Make the report SUBSTANTIAL, BEEFY, and VALUABLE - customers should feel they received premium, high-value assessment
- Fill every section completely - no brief explanations, provide context, background, examples, and extensive analysis
- The report should demonstrate thoroughness and expertise - justify the investment through extensive detail`
    : `- FOR SOFT MODE: You MUST generate 6000-8000 words to create a COMPREHENSIVE, VALUABLE report (6-8 pages)
- EVERY section MUST be SUBSTANTIAL and IN-DEPTH - fill pages completely, no blank spaces
- Be VERY DETAILED and EXPANSIVE - explain thoroughly, provide context, add examples, include technical details
- CRITICAL DATA READING REQUIREMENT: READ THE CONTENT THOROUGHLY AND ACCURATELY
  * Read through ALL files line by line
  * Extract EXACT severity levels mentioned in the data (Critical, High, Medium, Low)
  * Count findings accurately - do NOT guess or estimate
  * Use the ACTUAL severity classifications from the data
  * If the data says a finding is "Critical", use "Critical" - do not change it
  * If the data says a finding is "High", use "High" - do not change it
  * Extract ALL information from the data - do not miss any vulnerabilities, services, ports, or security issues
  * The risk rating MUST be calculated from the ACTUAL findings in the data, not invented
- The Executive Summary MUST be comprehensive (1.5-2 pages) with detailed risk rating and findings summary
- Detailed Findings section MUST be extensive (3-5 pages) with ALL findings explained thoroughly
- Each finding should be 2-3 paragraphs minimum with technical details, business impact, and remediation
- Do NOT create short, brief content - be expansive and detailed to provide maximum value
- Ensure every page is FULLY UTILIZED with valuable, actionable content
- The report should provide SUBSTANTIAL VALUE to the client - not just a summary`
}
- You are receiving FULL content from ALL files - analyze EVERYTHING thoroughly and include ALL findings
- Extract ALL critical, high, medium, and low severity findings - list EVERYTHING found in the data
- Include clear examples and references from the actual data${
      request.pentestType === 'aggressive'
        ? ', with full technical detail and exploitation evidence'
        : ', but translate them into business-friendly language'
    }
- Reference what was tested (applications, systems) but avoid technical file paths, directory structures, or internal system references
- Provide VERY DETAILED, actionable, prioritized recommendations - explain recommendations${
      request.pentestType === 'aggressive'
        ? ' with technical implementation details'
        : ' in business terms with expected outcomes'
    }
- Use professional cybersecurity terminology${
      request.pentestType === 'aggressive'
        ? ' extensively, aligned with OWASP, MITRE ATT&CK, and NIST frameworks'
        : ' but ALWAYS EXPLAIN complex terms in simple business language'
    }
- DO NOT reference "evidence directory", file paths, or technical internal structures - these are for internal use only
- Ensure all findings are EXTENSIVELY supported with evidence from the provided data
- Format beautifully with consistent spacing and clear hierarchy
- Make the report comprehensive - aim for DETAILED explanations
- Each finding should be explained in depth with context, impact, evidence, and recommendations

Penetration Test Data:
`

    const finalPrompt =
      promptBase +
      contentToSend +
      `\n\n🚨 FINAL VALIDATION - VERIFY COMPLETE REPORT:

SECTION COMPLETION CHECK (CRITICAL - Report is INCOMPLETE if any section is missing):
1. Count all main sections (##) - must include: Table of Contents, Executive Summary, Scope/Methodology, Attack Surface Analysis, Detailed Findings, Risk Assessment, Recommended Next Steps, Appendices${request.pentestType === 'soft' ? ', Closing Note' : ''}
2. Verify Section 6 has ALL subsections: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 (check for "### 6.1", "### 6.2", etc.)
3. Verify Section 7 has ALL subsections: 7.1, 7.2, 7.3, 7.4 (check for "### 7.1", "### 7.2", etc.)
${request.pentestType === 'soft' ? '4. Verify Section 8 (Closing Note) exists and is the last section (check for "## Closing Note" or "## 8. Closing Note")' : '4. Verify report ends with Section 7.4 (Additional Resources)'}
5. If ANY section from the Table of Contents is missing, the report is INCOMPLETE - you MUST continue generating until ALL sections are present

COUNTS VALIDATION:
6. Check Findings Register counts: Critical=[C], High=[H], Medium=[M], Low=[L], Informational=[I], Total=[C+H+M+L+I]
7. Verify: Section 1.3 table = Section 5.2 table = Findings Register counts (ALL must match exactly)
8. CRITICAL: Count the number of "### 4.X" headings in Section 4 - this MUST equal the total in the register
   - If register has 11 findings, Section 4 MUST have 11 "### 4.X" headings (4.1, 4.2, ..., 4.11)
   - If register has 15 findings, Section 4 MUST have 15 "### 4.X" headings
   - If counts don't match, you MUST generate the missing findings
9. Verify: NO placeholder text like "(Continue with other findings...)" exists in Section 4
10. Verify: Findings Register section is NOT included in the report (it's internal only)

🚨 IF ANY CHECK FAILS: The report is INCOMPLETE. You MUST continue generating until ALL sections are present and ALL checks pass. Do NOT stop at section 6.2 or any other section - continue until ALL sections are complete.

🚨 CRITICAL COMPLETION REQUIREMENT - DO NOT STOP UNTIL ALL SECTIONS ARE COMPLETE:

MANDATORY SECTIONS THAT MUST BE INCLUDED (verify ALL are present):
- Section 1: Executive Summary (with all subsections)
- Section 2: Scope/Methodology (with all subsections 2.1-2.5)
- Section 3: Attack Surface Analysis (with all subsections 3.1-3.6)
- Section 4: Detailed Findings (ALL findings from register - one section per finding)
- Section 5: Risk Assessment (with all subsections 5.1-5.6)
- Section 6: Recommended Next Steps (with ALL subsections 6.1, 6.2, 6.3, 6.4, 6.5, 6.6)
- Section 7: Appendices (with ALL subsections 7.1, 7.2, 7.3, 7.4)
- Section 8: Closing Note (if applicable)

DO NOT STOP GENERATING UNTIL:
- [ ] Section 6.1 is complete
- [ ] Section 6.2 is complete
- [ ] Section 6.3 is complete
- [ ] Section 6.4 (Remediation Priority Matrix) is complete with bullet points format
- [ ] Section 6.5 (Implementation Roadmap) is complete with bullet points format
- [ ] Section 6.6 (Success Metrics) is complete
- [ ] Section 7.1 (Scope & Methodology Details) is complete
- [ ] Section 7.2 (Technical References) is complete
- [ ] Section 7.3 (Glossary) is complete
- [ ] Section 7.4 (Additional Resources) is complete
- [ ] Section 8 (Closing Note) is complete (if applicable)

If you stop before completing ALL sections, the report is INCOMPLETE. Continue generating until EVERY section is finished.

FINAL REMINDERS:
- Replace ALL dates with: ${todayFormatted}
- UK English spelling (colour, organise, centre, whilst, realise, optimise, analyse)
- Write for executives - avoid jargon, no file paths, focus on business impact
- NO placeholders like "[Contact]", "[TBD]" - omit sections without real data
- Include shared responsibility education for third-party platforms (Shopify, Cloudflare, AWS, WordPress)
- Add urgency with factual exploitation timelines in Business Impact sections
- Report must have 25+ sections with 6-7 lines each - verify before submitting:`

    const prompt = finalPrompt

    console.log('\n--- CONTENT BEING SENT TO AI ---')
    console.log('Prompt base length:', promptBase.length, 'characters')
    console.log('Content length:', contentToSend.length, 'characters')
    console.log('Total prompt length:', prompt.length, 'characters')
    console.log(
      '\n--- CONTENT PREVIEW (first 1000 chars of combined content) ---'
    )
    console.log(contentToSend.substring(0, 1000))
    if (contentToSend.length > 1000) {
      console.log(
        '\n... [content continues for',
        contentToSend.length - 1000,
        'more characters] ...'
      )
      console.log('\n--- CONTENT ENDING (last 500 chars) ---')
      console.log(contentToSend.substring(contentToSend.length - 500))
    }
    console.log('\n--- FULL COMBINED CONTENT STRUCTURE ---')
    console.log('The AI will receive the following structure:')
    console.log('1. System prompt with instructions')
    console.log('2. User prompt with:')
    console.log('   - Detailed report requirements')
    console.log('   - Section structure guidelines')
    console.log('   - Complete penetration test data from all files:')
    request.files.forEach((file, idx) => {
      console.log(`      - ${file.path} (${file.content.length} chars)`)
    })
    console.log('\nSending to OpenAI API...')

    // Call OpenAI API
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    if (!apiKey) {
      return {
        success: false,
        error:
          'OpenAI API key not configured. Please set VITE_OPENAI_API_KEY in your .env file.',
      }
    }

    const apiRequestBody = {
      model: 'gpt-4o', // Using GPT-4o (latest model, closest to "gpt-5")
      messages: [
        {
          role: 'system',
          content: `You are a senior cybersecurity consultant creating customer-facing penetration test reports. Your reports are read by C-level executives, business stakeholders, and non-technical decision-makers. You translate technical security findings into clear business risks and impacts. You avoid technical jargon, file paths, directory structures, and internal system references. You always replace all dates and timestamps in content with: ${todayFormatted}. Use UK English spelling throughout (e.g., "colour" not "color", "organise" not "organize", "centre" not "center", "whilst" not "while", "realise" not "realize"). NEVER include placeholder text, brackets with generic content like "[Contact information]", "[To be added]", "[TBD]", or any incomplete statements. Only include sections with actual, meaningful information from the data. If information is not available, omit the section entirely rather than using placeholders. This is critical for maintaining professional quality in customer-facing documents. CRITICAL STRUCTURE REQUIREMENT: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections combined). This is mandatory. Create comprehensive sections and subsections to meet this requirement.`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: request.pentestType === 'aggressive' ? 12000 : 10000, // Increased for soft to ensure all sections are generated
    }

    console.log('\n--- API REQUEST DETAILS ---')
    console.log('Model:', apiRequestBody.model)
    console.log('Temperature:', apiRequestBody.temperature)
    console.log('Max tokens:', apiRequestBody.max_tokens)
    console.log(
      'System message length:',
      apiRequestBody.messages[0]?.content?.length || 0,
      'characters'
    )
    console.log(
      'User message length:',
      apiRequestBody.messages[1]?.content?.length || 0,
      'characters'
    )
    console.log(
      'Total request size: ~',
      JSON.stringify(apiRequestBody).length,
      'characters'
    )

    // Add timeout and better error handling for large requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(apiRequestBody),
        signal: controller.signal,
      })
      clearTimeout(timeoutId) // Clear timeout on success

      if (!response.ok) {
        console.error('\n--- API ERROR ---')
        console.error('Status:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({}))
        console.error('Error response:', errorData)
        const errorMessage =
          errorData.error?.message || `API error: ${response.statusText}`
        console.error('Error message:', errorMessage)
        return {
          success: false,
          error: errorMessage,
        }
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out after 5 minutes')
        return {
          success: false,
          error:
            'Request timed out. The content may be too large. Please try with fewer files or contact support.',
        }
      }
      throw fetchError // Re-throw other errors
    }

    console.log('\n--- API RESPONSE RECEIVED ---')
    console.log('Status:', response.status, 'OK')

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content

    if (!summary) {
      console.error('No summary generated from AI response')
      return {
        success: false,
        error: 'No summary generated from AI',
      }
    }

    console.log('\n--- AI RESPONSE RECEIVED ---')
    console.log('✓ AI Summary generated successfully')
    console.log('Summary length:', summary.length, 'characters')
    console.log(
      'Summary word count: ~',
      Math.round(summary.split(/\s+/).length),
      'words'
    )
    console.log('\n--- FULL AI SUMMARY (complete response) ---')
    console.log(summary)
    console.log('\n--- AI SUMMARY BREAKDOWN ---')
    const summaryLines = summary.split('\n')
    console.log('Total lines:', summaryLines.length)
    const sections = summaryLines.filter((line: string) =>
      line.trim().startsWith('##')
    )
    console.log('Main sections found:', sections.length)
    sections.forEach((section: string, idx: number) => {
      console.log(`  Section ${idx + 1}: ${section.trim()}`)
    })
    console.log('\n=== AI PROCESSING DEBUG END ===')

    return {
      success: true,
      summary,
    }
  } catch (error: any) {
    console.error('AI Processing Error:', error)
    return {
      success: false,
      error: error.message || 'Failed to generate AI summary',
    }
  }
}

/**
 * Check if OpenAI API is configured
 */
export function isAIConfigured(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY
}
