import type { DomainFile } from '../utils/fileReader'

interface AISummaryRequest {
  files: DomainFile[]
  folderName: string
  pentestType: 'aggressive' | 'soft'
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
    // Combine all file contents with better formatting
    const allContent = request.files
      .map((file) => `=== ${file.path} ===\n${file.content}`)
      .join('\n\n')
    request.files.forEach((file, idx) => {
      console.log(`\nFile ${idx + 1}: ${file.path}`)
      console.log(`  Type: ${file.type}`)
      console.log(`  Content length: ${file.content.length} characters`)
      console.log(`  Content preview (first 300 chars):`)
      console.log(
        '  ' +
          file.content
            .substring(0, 300)
            .split('\n')
            .map((line, i) => (i === 0 ? '  ' : '  ') + line)
            .join('\n')
      )
      if (file.content.length > 300) {
        console.log('  ... [content continues] ...')
        console.log(`  Content ending (last 200 chars):`)
        console.log(
          '  ' +
            file.content
              .substring(file.content.length - 200)
              .split('\n')
              .map((line, i) => (i === 0 ? '  ' : '  ') + line)
              .join('\n')
        )
      }
    })

    // GPT-4o has ~128k token context (~500k+ characters)
    // Limit content to ~300k chars to leave room for prompt (~200k chars) and response (~80k chars)
    // This ensures we stay within the 128k token limit
    const maxContentLength = 300000
    let contentToSend = allContent

    if (allContent.length > maxContentLength) {
      console.warn(
        `⚠ Content is very large (${allContent.length} chars), truncating to ${maxContentLength} chars`
      )
      console.warn(
        'Consider breaking into multiple requests for extremely large datasets'
      )
      contentToSend =
        allContent.substring(0, maxContentLength) +
        '\n\n... [Content truncated due to size - first ' +
        maxContentLength +
        ' characters sent] ...'
    } else {
      console.log('✓ All content will be sent to AI (no truncation needed)')
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
        : 'A comprehensive soft penetration test was conducted'

    const pentestTypeContext =
      request.pentestType === 'aggressive'
        ? 'This aggressive testing approach simulated real-world attack scenarios with extensive vulnerability exploitation and system stress testing to identify all potential security weaknesses. The testing methodology was thorough and intensive, actively attempting to exploit discovered vulnerabilities to demonstrate real-world impact.'
        : 'This soft testing approach focused on non-intrusive vulnerability assessment and security posture evaluation, carefully identifying security issues without actively exploiting vulnerabilities or disrupting business operations. The testing methodology prioritised safety and minimal business impact whilst still providing comprehensive security findings.'

    // Extract domain name from folder name
    const domainName = request.folderName || 'the client'

    // Aggressive mode specific instructions
    const aggressiveModeInstructions =
      request.pentestType === 'aggressive'
        ? `
CRITICAL AGGRESSIVE MODE REQUIREMENTS - MAXIMUM DETAIL AND VALUE:

1. MULTI-IP DOMAIN TESTING - COMPREHENSIVE DOCUMENTATION:
   - CRITICAL: The uploaded folder contains penetration test data from MULTIPLE DIFFERENT IP ADDRESSES all belonging to the SAME DOMAIN
   - Each IP address represents a COMPLETELY SEPARATE and DISTINCT attack surface with unique vulnerabilities, services, configurations, and security postures
   - You MUST treat each IP address as if it were a separate infrastructure assessment
   - Document findings for EACH IP address individually with EXTENSIVE detail and clear separation
   - Create dedicated sections or subsections for each IP address when multiple IPs are present
   - Show the attack surface diversity - explain how different IPs expose different vulnerabilities
   - Compare and contrast findings across IPs - highlight which IPs are more vulnerable and why
   - Document the relationship between IPs - explain potential attack paths between different IPs
   - For each IP, provide: IP address, open ports, running services, discovered vulnerabilities, exploitation results, and remediation recommendations

2. HIGHLY DESCRIPTIVE, VERBOSE, PROFESSIONAL WRITE-UPS - MAXIMUM EXPLANATORY DEPTH:
   - Provide EXTREMELY EXTENSIVE technical explanations for every vulnerability discovered - aim for 3-5 paragraphs per finding minimum
   - Include DETAILED exploitability analysis with comprehensive step-by-step exploitation logic
   - Document proof-of-concept descriptions with FULL technical evidence where vulnerabilities were validated
   - Explain attack paths in EXTREME DETAIL - show the complete attack chain from initial access to potential lateral movement
   - Include CVE references (where applicable) with detailed descriptions, CVSS scores, and exploitation complexity
   - Provide comprehensive impact assessments with BOTH business and technical perspectives - be thorough
   - Include risk scoring using industry-standard frameworks (CVSS v3.1, OWASP Risk Rating, DREAD)
   - Document recommended remediation steps with DETAILED implementation guidance, code examples, configuration changes
   - Explain WHY each vulnerability exists - root cause analysis
   - Explain HOW each vulnerability was discovered and validated - methodology
   - Explain WHAT an attacker could do - realistic attack scenarios
   - Explain WHEN this should be fixed - urgency and priority justification

3. NO WORD LIMIT - BE EXTREMELY COMPREHENSIVE AND BEEFY:
   - There is ABSOLUTELY NO capping on content words limit - generate as much as needed
   - Generate EXTENSIVE detailed content to provide MAXIMUM value to customers
   - Expand findings THOROUGHLY - aim for 10000-15000+ words for aggressive mode reports with multiple IPs
   - Make the report appear SUBSTANTIAL, VALUABLE, and INSIGHTFUL for stakeholders
   - Each finding should be a COMPREHENSIVE write-up (3-5 paragraphs minimum), not a brief summary
   - Fill every section completely - no empty spaces, no brief explanations
   - Provide context, background, technical details, examples, and extensive analysis for EVERY finding
   - The report should feel like a premium, high-value security assessment document

4. TECHNICAL DEPTH AND AUTHORITY - EXPERT-LEVEL DETAIL:
   - Use formal cybersecurity language extensively aligned with industry standards:
     * OWASP Testing Guide and Top 10 (reference specific categories)
     * MITRE ATT&CK framework references (map to specific techniques)
     * NIST Cybersecurity Framework (align with specific controls)
     * PTES (Penetration Testing Execution Standard) methodology
     * CWE (Common Weakness Enumeration) classifications
     * CVSS (Common Vulnerability Scoring System) detailed scoring
   - Explain HOW vulnerabilities were validated through active exploitation - show the process
   - Document exploitation logic in DETAIL - step-by-step attack procedures
   - Document attack vectors and attack chains COMPREHENSIVELY
   - Describe potential lateral movement opportunities between systems and IPs in detail
   - Include technical evidence, command outputs, proof-of-concept code, screenshots descriptions where relevant
   - Explain network topology implications - how findings relate to overall infrastructure
   - Document service versions, configurations, and technical specifics for each IP

5. STRUCTURE FOR MAXIMUM VALUE - COMPREHENSIVE SECTIONS:
   - CRITICAL: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections). This is mandatory.
   - Create comprehensive sections: Executive Summary with 5+ subsections, Test Scope with 5+ subsections, Attack Surface Analysis with 4+ subsections, Detailed Findings with each finding as a separate subsection, Risk Assessment with 4+ subsections, Recommendations with 4+ subsections, Appendices with 4+ subsections
   - For multi-IP scenarios: Create dedicated IP-specific sections (e.g., "IP Address 192.168.1.1 Analysis", "IP Address 192.168.1.2 Analysis", etc.)
   - Create vulnerability category sections (e.g., "Authentication Vulnerabilities", "Authorization Flaws", "Injection Vulnerabilities", "Configuration Issues", etc.)
   - Create compliance mapping sections (e.g., "OWASP Top 10 Mapping", "NIST Framework Alignment", "ISO 27001 Compliance Gaps", etc.)
   - Executive Summary: EXTENSIVE comprehensive risk overview (2-3 pages) with detailed findings summary, IP-by-IP risk breakdown, with 5+ subsections
   - Risk Overview: DETAILED risk matrix with scoring, prioritization, and IP-specific risk distribution
   - Remediation Priority Matrix: COMPREHENSIVE prioritization with timelines, resource requirements, and IP-specific remediation plans
   - Detailed Findings: Each finding should be 3-5 paragraphs minimum with:
     * EXTENSIVE technical description (2-3 paragraphs)
     * DETAILED exploitation methodology (step-by-step, comprehensive)
     * COMPLETE proof of concept (with code, commands, evidence)
     * THOROUGH impact analysis (business + technical, multiple perspectives)
     * DETAILED attack path visualization (complete attack chain)
     * COMPREHENSIVE remediation steps with implementation details (code examples, configs)
     * CVE references and CVSS scores with detailed explanations
     * IP address identification and attack surface analysis

6. IP-SPECIFIC DOCUMENTATION - SEPARATE ATTACK SURFACES:
   - When multiple IPs are present, structure findings CLEARLY by IP address
   - Create sections like "Findings for IP [address]" or "Attack Surface Analysis: IP [address]"
   - Show how different IPs have DIFFERENT attack surfaces - compare and contrast
   - Document IP-specific vulnerabilities SEPARATELY with full detail for each
   - Explain the relationship between IPs - document potential attack paths between different IPs
   - For each IP, provide: complete port scan results, service enumeration, vulnerability assessment, exploitation results
   - Show which IPs are more critical, which have more vulnerabilities, and why
   - Document network relationships - how compromising one IP could lead to others

7. TONE AND STYLE - AUTHORITATIVE AND DETAILED:
   - Authoritative, expert-level, highly technical - write like a senior penetration tester
   - Suitable for aggressive security testing documentation
   - Professional but EXTREMELY detailed for technical stakeholders
   - Balance technical depth with business impact explanations
   - Use technical terminology confidently - explain complex concepts thoroughly
   - Show expertise through detailed analysis and comprehensive documentation

8. VALUE DELIVERY - CUSTOMER-FOCUSED:
   - The customer is paying for a comprehensive assessment - deliver MAXIMUM value
   - Make every section substantial and informative
   - Provide actionable, detailed recommendations
   - Show thoroughness and expertise in every finding
   - Demonstrate that the assessment was comprehensive and valuable
   - The report should justify the investment through extensive detail and insights

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
        : '**Severity:** [Critical/High/Medium/Low in Title Case]'

    const descriptionFormat =
      request.pentestType === 'aggressive'
        ? '**Description:** [VERY DETAILED explanation - at least 5-7 sentences with extensive technical detail explaining the security issue, how it works, why it exists, and the technical implications. Include CVE references, CVSS scores, and industry-standard classifications.]'
        : '**Description:** [VERY DETAILED explanation - at least 3-4 sentences explaining the security issue in business terms, what it means for the organisation, why it is a concern]'

    const technicalDetailsSection =
      request.pentestType === 'aggressive'
        ? '**Technical Details:** [EXTENSIVE technical explanation including: Vulnerability type and classification (OWASP, CWE, etc.), Root cause analysis, Affected components and versions, Technical validation methodology, Exploitation prerequisites]\n'
        : ''

    const whatWasFoundFormat =
      request.pentestType === 'aggressive'
        ? '**What Was Found:** [EXTENSIVE technical explanation with detailed evidence, proof-of-concept results, and validation outcomes. Include specific IP addresses, ports, services, and configurations affected.]'
        : '**What Was Found:** [Clear explanation of the security issue without technical jargon - use business-friendly descriptions]'

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
        : '**Risk Scenario:** [Explain the business risk - what could happen if this is not fixed, in terms customers understand. INCLUDE URGENCY: Add factual statements about exploitation timelines, such as "These vulnerabilities are routinely discovered and exploited within [timeframe]." Create urgency without fear-mongering.]'

    const howToExploitFormat =
      request.pentestType === 'aggressive'
        ? '**How to exploit:** [For AGGRESSIVE mode: Include DETAILED exploitation methodology with step-by-step attack procedures, command sequences, proof-of-concept code, and complete attack chain documentation. Show how the vulnerability was actively exploited during testing. Document the full attack path from initial access to potential lateral movement. CRITICAL: Format ALL commands and their outputs as code blocks using triple backticks. Include the complete command output exactly as it appears in the data.]'
        : '**How to exploit:** [If exploit steps are available in the data, present them in a clear, numbered format. For any commands or code, enclose them in code blocks using triple backticks for proper formatting with background highlighting. CRITICAL: Include the complete command output exactly as it appears in the source data - do not summarize or omit any details.]'

    // Prepare the prompt - detailed report
    const promptBase = `You are a senior cybersecurity consultant creating a professional penetration test report for CUSTOMERS and BUSINESS EXECUTIVES. This report will be read by non-technical stakeholders, C-level executives, and business decision-makers.

CRITICAL COMPANY/DOMAIN NAME REQUIREMENT:
- The domain being tested is: ${domainName}
- When referring to the client or company, use the domain name "${domainName}" or refer to them as "the client" or "the organization"
- DO NOT use any hardcoded company names like "Onecom" unless that is actually the domain being tested
- Use the actual domain name "${domainName}" throughout the report when referring to the tested infrastructure

CRITICAL PENETRATION TEST TYPE:
${pentestTypeDescription}. ${pentestTypeContext}

You MUST clearly indicate in the Executive Summary and Test Scope sections that this was a ${request.pentestType.toUpperCase()} penetration test. Explain what this means for the testing approach and findings.

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

Analyse the following COMPLETE penetration test data (this includes all files with their full content) and create a COMPREHENSIVE, DETAILED, deeply explained CUSTOMER-FACING report${
      request.pentestType === 'aggressive'
        ? ' with MAXIMUM detail and technical depth'
        : ' that fills exactly 4-5 pages when rendered in PDF format'
    }.

CRITICAL REQUIREMENTS:
1. ${
      request.pentestType === 'aggressive'
        ? 'For AGGRESSIVE mode: Generate a COMPREHENSIVE report with NO word limit. Aim for 10000-15000+ words with extensive detail. The report should be substantial and provide maximum value. For SOFT mode: Generate a DETAILED report with 6000-8000 words (approximately 6-8 pages) - significantly more in-depth than basic reports. The report MUST provide substantial value with comprehensive analysis.'
        : 'For SOFT mode: Generate a DETAILED, IN-DEPTH report with 6000-8000 words (approximately 6-8 pages when rendered in PDF format). The report MUST be comprehensive and provide substantial value - not just a brief summary. Include detailed analysis, thorough explanations, and actionable insights.'
    }
2. CRITICAL STRUCTURE REQUIREMENT: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections combined). This is mandatory and non-negotiable. Create comprehensive sections and subsections to meet this requirement. Examples: Executive Summary with 5+ subsections, Test Scope with 5+ subsections, Detailed Findings with each finding as a separate subsection, Risk Assessment with multiple subsections, IP-specific analysis sections (when multiple IPs are present), Vulnerability category sections, Compliance mapping sections, Technical deep-dives, Attack path analysis, Remediation guides, etc.

3. CRITICAL CONTENT REQUIREMENT FOR EVERY SECTION: EVERY section and subsection MUST contain SUBSTANTIAL, DETAILED content. This is mandatory for ALL sections:
   - DO NOT write generic definitions or brief descriptions
   - DO NOT explain what a section is - instead explain how it affects ${domainName} specifically
   - Focus on CLIENT-SPECIFIC impact, value, and recommendations
   - Minimum content requirements:
     * Recommendation sections (6.1-6.6): 15-20 lines minimum each
     * Appendix sections (7.1-7.4): 20-30 lines minimum each
     * All other sections: 10-15 lines minimum each
   - Content must be:
     * SPECIFIC to ${domainName} and THIS test's findings
     * ACTIONABLE with detailed steps and guidance
     * VALUABLE explaining how it helps ${domainName}
     * IMPACT-FOCUSED explaining how it affects ${domainName}
   - Reference actual findings, systems, and vulnerabilities from THIS test
   - Explain WHY recommendations matter to ${domainName}'s business
   - Show HOW improvements will help ${domainName}
   - Brief one-line descriptions are NOT acceptable
   - Generic definitions are NOT acceptable
   - Every section must be SUBSTANTIAL and provide real value
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
Create a comprehensive table of contents that lists ALL sections and subsections with their page numbers. The report MUST have AT LEAST 25 SECTIONS total (main sections + subsections). Format as bullet points with proper numbering and hierarchy. Examples of sections to include (expand as needed to reach 25+ sections):

MAIN SECTIONS (##):
- 1. Executive Summary
  - 1.1 Overall Risk Rating
  - 1.2 Key Findings Summary
  - 1.3 Business Impact Assessment
  - 1.4 Risk Overview Matrix
  - 1.5 Testing Overview
- 2. Test Scope and Methodology
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
  - (Continue with ALL findings - each finding should be a separate subsection)
- 5. Risk Assessment
  - 5.1 Risk Matrix
  - 5.2 Severity Distribution
  - 5.3 Business Impact Analysis
  - 5.4 Compliance Impact
  - 5.5 Risk Prioritization
  - 5.6 Risk Trend Analysis
- 6. Recommendations and Next Steps
  - 6.1 Immediate Actions
  - 6.2 Short-term Remediation
  - 6.3 Long-term Improvements
  - 6.4 Remediation Priority Matrix (MANDATORY - must use card format)
  - 6.5 Implementation Roadmap (MANDATORY - must use card format with WEEKS 1-2, WEEKS 3-4, and long-term roadmap)
  - 6.6 Success Metrics
- 7. Appendices
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

### 1.1 Overall Risk Rating
CRITICAL: This section MUST contain at least 6-7 lines of informative content. Provide:
- High-level overview of the security assessment engagement (use customer-friendly language, mention dates as ${todayFormatted})
- CLEARLY STATE that ${pentestTypeDescription} and explain what this testing approach means${
      request.pentestType === 'aggressive'
        ? ' in both business and technical terms, emphasizing the comprehensive nature of aggressive testing across multiple IP addresses'
        : ' in business terms'
    }
- Detailed context about the assessment scope and objectives
- Explanation of the risk rating methodology and how it was calculated
- Business context for why this risk rating matters to the organization
${
  request.pentestType === 'aggressive'
    ? '- CRITICAL MULTI-IP OVERVIEW: The assessment covered MULTIPLE IP ADDRESSES for the same domain. Document:\n  * Complete list of all IP addresses tested\n  * Attack surface diversity across different IPs\n  * Summary of findings per IP address\n  * Comparison of security postures across IPs\n  * Which IPs are most critical/vulnerable and why\n- ATTACK SURFACE OVERVIEW: Provide comprehensive overview of attack surface diversity across different IPs, showing how each IP represents a separate infrastructure component\n- COMPREHENSIVE RISK OVERVIEW: Create a detailed risk matrix showing:\n  * Overall risk rating with CVSS-based scoring\n  * Risk distribution across different IP addresses (which IPs have highest risk)\n  * Critical attack paths identified per IP\n  * Potential lateral movement scenarios between IPs\n  * Business impact severity matrix with IP-specific considerations'
    : ''
}
CRITICAL RISK RATING CALCULATION - MUST BE ACCURATE AND DATA-DRIVEN:

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

CRITICAL CONSISTENCY REQUIREMENT:
- The risk rating category MUST be consistent with the findings summary table
- If the table shows 3 Critical findings, the risk rating MUST reflect this (likely "Critical" or "High" in Title Case)
- If the table shows 0 Critical findings, the risk rating CANNOT be CRITICAL
- The risk score MUST be calculated from the actual counts in the findings table
- DO NOT create conflicting information - the risk rating and findings table MUST align

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

### 1.2 Key Findings Summary
CRITICAL: This section MUST contain at least 6-7 lines of informative content about the ACTUAL findings from THIS penetration test. DO NOT write generic definitions or explanations of what this section is. Write SPECIFIC content about the findings discovered. Provide:
- DETAILED summary of ALL key security findings discovered - describe each major finding${
      request.pentestType === 'aggressive'
        ? ' with both technical depth and business impact. Include IP-specific findings where applicable.'
        : ' in business impact terms, not technical jargon'
    }
- COMPREHENSIVE business impact assessment - explain potential consequences in financial terms, operational terms, and reputation terms
- DETAILED key recommendations overview - prioritize and explain each major recommendation with business justification
- Testing methodology summary - what was tested${
      request.pentestType === 'aggressive'
        ? ' with detailed technical methodology, tools used, exploitation techniques, and validation approaches'
        : ' (use simple language, avoid technical tool names unless necessary)'
    }
- Summary of critical vulnerabilities and their potential business impact
- Overview of remediation priorities and recommended actions
${
  request.pentestType === 'aggressive'
    ? '- Include a REMEDIATION PRIORITY MATRIX showing immediate, short-term, and long-term remediation priorities with resource requirements'
    : ''
}

## Test Scope and Methodology
Provide COMPREHENSIVE, DETAILED testing information that fills substantial space (written for customers). Each subsection MUST contain 6-7 lines of valuable, detailed content:

### 2.1 Systems Tested
Provide 6-7 lines of detailed content:
- DETAILED overview of all systems and applications tested - use business-friendly names, avoid technical IPs/ports unless essential
- Comprehensive list of infrastructure components assessed (web applications, APIs, network services, etc.)
- Specific domains, subdomains, and endpoints that were included in the assessment
- Business context for each system - explain what each system does and why it matters to the organization
- Scope boundaries - clearly define what was tested and what was excluded
- Testing environment details - describe the production, staging, or development environments assessed
- Asset inventory - provide a comprehensive overview of all assets included in the penetration test

### 2.2 Testing Approach
Provide 6-7 lines of detailed content:
- CLEARLY STATE that this was a ${request.pentestType.toUpperCase()} penetration test and explain the testing approach methodology (${pentestTypeContext})
- EXPANDED testing approach - explain WHAT was tested and WHY it matters to security, not HOW technically
- Detailed methodology breakdown - describe each phase of testing (reconnaissance, scanning, vulnerability assessment, exploitation validation)
- Testing techniques employed - explain the types of tests performed (black box, grey box, etc.) and their relevance
- Tools and technologies used - mention testing tools in business-friendly terms and explain their purpose
- Validation approach - describe how findings were verified and confirmed
- Testing depth and coverage - explain the comprehensiveness of the assessment and what was covered

### 2.3 Standards and Frameworks
Provide 6-7 lines of detailed content:
- COMPREHENSIVE list of standards and frameworks (OWASP, NIST, ISO 27001, PTES, etc.) - explain what these mean for security posture
- Detailed explanation of how each standard was applied during the assessment
- Framework alignment - show how the testing methodology aligns with industry best practices
- Compliance considerations - explain how findings relate to regulatory requirements (PCI-DSS, GDPR, HIPAA, etc.)
- Industry benchmark comparison - explain how the assessment compares to industry standards
- Framework-specific findings - describe which vulnerabilities map to specific framework categories (e.g., OWASP Top 10)
- Standards compliance gaps - identify areas where the organization may not meet industry standards

### 2.4 Testing Timeline
Provide 6-7 lines of detailed content:
- DETAILED testing timeline - use dates formatted as ${todayFormatted}, describe phases in business terms
- Comprehensive schedule breakdown - provide specific dates and durations for each testing phase
- Phase-by-phase timeline - explain what was tested during each phase and when
- Resource allocation - describe the time and effort invested in each aspect of the assessment
- Testing milestones - highlight key dates and achievements during the penetration test
- Coordination and communication - explain how the testing was coordinated with the organization
- Final delivery timeline - specify when the assessment was completed and when the report is being delivered

### 2.5 Scope Limitations
Provide 6-7 lines of detailed content:
- Methodology limitations and scope boundaries - explain what was and wasn't tested in business context (what risks might exist outside scope)
- Detailed explanation of excluded areas - clearly define what was not tested and why
- Scope constraints - describe any limitations that affected the assessment (time, access, technical constraints)
- Potential blind spots - identify areas that may require additional testing or assessment
- Recommendations for expanded testing - suggest areas that could benefit from future assessments
- Risk areas outside scope - explain potential security risks that exist in areas not covered by this assessment
- Limitations impact - describe how these limitations affect the overall security assessment and what they mean for the organization

## Detailed Findings
For EACH finding found in the data (Critical, High, Medium, and Low severity), provide COMPREHENSIVE details that thoroughly explain each vulnerability. ${
      request.pentestType === 'aggressive'
        ? 'For AGGRESSIVE mode: This section should be EXTENSIVE (8-12+ pages) with MAXIMUM detail and BEEFY content. Each finding should be 4-6 paragraphs minimum with extensive technical depth. CRITICAL: The folder contains data from MULTIPLE IP ADDRESSES of the same domain - document findings for EACH IP separately with extensive detail. Create dedicated subsections for each IP address showing port scans, services, vulnerabilities, and exploitation results. For SOFT mode: This section should be COMPREHENSIVE (3-5 pages) with detailed analysis for each finding. Each finding should be 2-3 paragraphs minimum with thorough explanations.'
        : 'For SOFT mode: This section should be COMPREHENSIVE (3-5 pages) with detailed analysis for each finding. Each finding should be 2-3 paragraphs minimum with thorough explanations, technical details, business impact, and remediation steps. Include ALL findings from the data - do not skip any.'
    }

- For EVERY finding (Critical, High, Medium, Low), include:
- Vulnerability title and severity level
- VERY DETAILED description of the vulnerability - explain how it works, why it exists, technical details
- Risk score and rating justification - explain why this finding received its severity rating
${
  request.pentestType === 'aggressive'
    ? '- CRITICAL FOR MULTI-IP SCENARIOS: Clearly identify which IP address(es) are affected - create separate write-ups for each IP when the same vulnerability appears on different IPs\n- EXTENSIVE exploitability analysis - detailed step-by-step exploitation logic, attack vectors, and attack chains\n- Proof-of-concept descriptions with technical evidence and validation results\n- CVE references with detailed descriptions and CVSS scores where applicable\n- Attack path visualization - explain how an attacker would exploit this, including initial access, execution, persistence, and lateral movement\n- Lateral movement opportunities - how this vulnerability could lead to further compromise of other systems and IPs\n- Validation methodology - explain how the vulnerability was validated through active exploitation\n- IP address and attack surface identification - clearly identify which IP(s) are affected, document open ports, running services, and configurations for EACH IP\n- Network topology considerations - how this finding relates to the overall network architecture and relationships between IPs\n- IP-specific remediation - provide remediation steps tailored to each affected IP address'
    : ''
}
- COMPREHENSIVE business impact - financial, operational, reputational consequences
- EXTENSIVE technical evidence - include ALL commands, URLs, configurations, code snippets from the data. Format commands and outputs as code blocks using triple backticks. Format structured data (port scans, service lists, IP inventories) as markdown tables.
- All affected systems and components - be specific about what's impacted. Format as tables when multiple systems are listed.
- Priority rating and remediation urgency with justification
- Attack scenarios - explain how an attacker could exploit this
- Current state assessment - what's currently happening

Format each finding as:
${findingTitleFormat}
${severityFormat}
${descriptionFormat}
${technicalDetailsSection}**Business Impact:** [COMPREHENSIVE business impact - explain financial risks (potential losses, fines), operational risks (service disruption), reputational risks (customer trust, brand damage). INCLUDE URGENCY FRAMING: Add factual statements about exploitation timelines, such as "These vulnerabilities are routinely exploited by automated scanners within days of exposure" or "Similar issues have been exploited within [timeframe] in [industry context]." Create urgency without fear-mongering.]
${whatWasFoundFormat}
${affectedSystemsFormat}
${attackSurfaceSection}${riskScenarioFormat}

${howToExploitFormat}

CRITICAL FORMATTING REQUIREMENTS:

1. CODE BLOCKS - Format ALL commands, terminal output, and code snippets as code blocks:
\`\`\`
curl -i -s -k "https://example.com/endpoint"
\`\`\`

For multi-line terminal output or scripts:
\`\`\`
$ smbclient -L //192.168.1.1 -N
Sharename       Type      Comment
---------       ----      ------
ROOT            Disk      
IPC$            IPC       IPC Service
\`\`\`

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
Provide COMPREHENSIVE, DETAILED analysis of the attack surface. Each subsection MUST contain at least 6-7 lines of informative content:

### 3.1 Network Topology Overview
CRITICAL: Write 6-7 lines of ACTUAL network topology analysis based on THIS penetration test's findings. DO NOT write generic definitions. Write SPECIFIC analysis for the client:
- Actual network architecture observed during THIS test based on the IP addresses and services discovered
- Specific network segments and relationships identified from THIS test's results
- Actual network boundaries and security perimeters observed
- Specific network components discovered during THIS assessment

### 3.2 IP Address Inventory
Provide 6-7 lines of detailed content:
- Complete inventory of all IP addresses tested during the assessment
- Detailed documentation of each IP address with its purpose and role
- Analysis of IP address distribution and allocation
- Identification of public-facing vs internal IP addresses
- Documentation of IP address ownership and management
- Assessment of IP address exposure and attack surface
- Recommendations for IP address management and security

### 3.3 Service Enumeration Summary
Provide 6-7 lines of detailed content:
- Comprehensive summary of all services discovered during enumeration
- Detailed documentation of service types, versions, and configurations
- Analysis of service exposure and accessibility
- Identification of unnecessary or vulnerable services
- Assessment of service security configurations
- Documentation of service dependencies and relationships
- Recommendations for service hardening and optimization

### 3.4 Port Analysis
Provide 6-7 lines of detailed content:
- Comprehensive analysis of all open ports discovered during scanning
- Detailed documentation of port usage and associated services
- Identification of unnecessary open ports and services
- Analysis of port security and access controls
- Assessment of port exposure and potential attack vectors
- Documentation of port filtering and firewall rules
- Recommendations for port security and minimization

### 3.5 Attack Vector Analysis
Provide 6-7 lines of detailed content:
- Comprehensive analysis of potential attack vectors and entry points
- Detailed documentation of identified attack paths and exploitation routes
- Analysis of attack surface diversity and complexity
- Identification of high-risk attack vectors requiring immediate attention
- Assessment of attack vector likelihood and impact
- Documentation of attack vector mitigation strategies
- Recommendations for attack surface reduction

### 3.6 Exposure Assessment
Provide 6-7 lines of detailed content:
- Comprehensive assessment of infrastructure exposure to external threats
- Detailed analysis of publicly accessible services and endpoints
- Identification of overexposed systems and services
- Assessment of exposure risk and potential impact
- Documentation of exposure reduction opportunities
- Analysis of exposure trends and patterns
- Recommendations for exposure minimization and security hardening

## Risk Assessment
Provide COMPREHENSIVE, DETAILED risk assessment. Each subsection MUST contain at least 6-7 lines of informative content:

### 5.1 Risk Matrix
CRITICAL: Write 6-7 lines of ACTUAL risk matrix based on THIS penetration test's findings. DO NOT write generic definitions. Write SPECIFIC risk analysis for the client:
- Actual risk matrix showing the findings from THIS test categorized by severity and impact
- Specific high-risk areas identified from THIS test's actual findings
- Risk distribution based on the actual vulnerabilities discovered
- Recommendations based on the actual findings from THIS test

### 5.2 Severity Distribution
Provide 6-7 lines of detailed content:
- Comprehensive breakdown of findings by severity level (Critical, High, Medium, Low)
- Detailed analysis of severity distribution patterns and trends
- Identification of severity concentration areas and systems
- Assessment of severity impact on overall security posture
- Documentation of severity-based prioritization strategies
- Analysis of severity correlation with business impact
- Recommendations for addressing high-severity findings

### 5.3 Business Impact Analysis
Provide 6-7 lines of detailed content:
- Comprehensive analysis of business impact for each finding category
- Detailed assessment of financial, operational, and reputational risks
- Identification of critical business processes at risk
- Analysis of potential business disruption scenarios
- Documentation of business impact quantification and measurement
- Assessment of business continuity and recovery implications
- Recommendations for business impact mitigation

### 5.4 Compliance Impact
Provide 6-7 lines of detailed content:
- Comprehensive analysis of compliance implications for identified findings
- Detailed assessment of regulatory requirements (PCI-DSS, GDPR, HIPAA, etc.)
- Identification of compliance gaps and violations
- Analysis of compliance risk and potential penalties
- Documentation of compliance remediation requirements
- Assessment of compliance monitoring and reporting needs
- Recommendations for compliance improvement and maintenance

### 5.5 Risk Prioritization
Provide 6-7 lines of detailed content:
- Comprehensive risk prioritization framework and methodology
- Detailed explanation of prioritization criteria and scoring
- Analysis of risk prioritization results and rankings
- Identification of top-priority risks requiring immediate action
- Documentation of prioritization rationale and justification
- Assessment of resource allocation based on prioritization
- Recommendations for risk prioritization implementation

### 5.6 Risk Trend Analysis
Provide 6-7 lines of detailed content:
- Comprehensive analysis of risk trends and patterns over time
- Detailed assessment of risk evolution and changes
- Identification of emerging risks and threat vectors
- Analysis of risk trend implications for security posture
- Documentation of risk trend monitoring and tracking
- Assessment of risk trend correlation with business changes
- Recommendations for proactive risk management

## Recommendations and Next Steps
CRITICAL: This section is MANDATORY and must ALWAYS be included. Provide COMPREHENSIVE, DETAILED actionable guidance. Each subsection MUST contain at least 6-7 lines of informative content:

### 6.1 Immediate Actions
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions or brief descriptions. Write EXTENSIVE, SPECIFIC content that explains:

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

### 6.2 Short-term Remediation
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

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

### 6.3 Long-term Improvements
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

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
CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included in every report. This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

FORMAT REQUIREMENT (MANDATORY): Format this section using card-style boxes. Start with an introductory sentence, then list priorities in card format. This exact format is REQUIRED:

The matrix outlines the prioritisation of remedial actions based on severity and impact:

**Critical (0-7 days):** [List specific critical findings from THIS test that need immediate action - use bullet points with actual finding names]

**High (1-4 weeks):** [List specific high-severity findings from THIS test - use bullet points with actual finding names]

**Medium (1-3 months):** [List specific medium-severity findings from THIS test - use bullet points with actual finding names]

**Low (3-12 months):** [List specific low-severity findings from THIS test - use bullet points with actual finding names]

For each priority level, reference ACTUAL findings from THIS test by name. Do NOT use generic examples.
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
CRITICAL MANDATORY SECTION: This section is COMPULSORY and MUST ALWAYS be included in every report. This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

FORMAT REQUIREMENT: Format this section using card-style boxes with checkmarks. Use this exact structure (this format is MANDATORY):

**WEEKS 1-2:**
- [Specific action item 1 based on actual findings]
- [Specific action item 2 based on actual findings]
- [Specific action item 3 based on actual findings]

**WEEKS 3-4:**
- [Specific action item 1 based on actual findings]
- [Specific action item 2 based on actual findings]
- [Specific action item 3 based on actual findings]

**3-12 Month Security Maturity Roadmap (Optional):**
If desired, ${domainName} can implement a longer-term resilience programme:

- [Long-term improvement 1 based on actual findings]
- [Long-term improvement 2 based on actual findings]
- [Long-term improvement 3 based on actual findings]
- [Long-term improvement 4 based on actual findings]
- [Long-term improvement 5 based on actual findings]

Reference ACTUAL findings from THIS test. Do NOT use generic examples.

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
CRITICAL CONTENT REQUIREMENT: This section MUST contain AT LEAST 15-20 lines of substantial, detailed content. DO NOT write generic definitions. Write EXTENSIVE, SPECIFIC content that explains:

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

## Appendix
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
  * CVSS score and vector string
  * Affected software versions
  * Exploitation complexity
  * References to official advisories and documentation
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

CRITICAL OUTPUT FORMAT:
- Start with a special "## Table of Contents" section that lists ALL sections and subsections with page numbers
- After Table of Contents, start with "## Executive Summary"
- Use pure markdown: ## for main sections, ### for subsections, ** for bold text, - for bullet points
- Add proper spacing between sections (blank lines)

MANDATORY SECTIONS THAT MUST ALWAYS BE INCLUDED (DO NOT SKIP):
- 6.4 Remediation Priority Matrix (MUST be included in every report, MUST use card format with **Critical (0-7 days):**, **High (1-4 weeks):**, **Medium (1-3 months):**, **Low (3-12 months):**)
- 6.5 Implementation Roadmap (MUST be included in every report, MUST use card format with **WEEKS 1-2:**, **WEEKS 3-4:**, and **3-12 Month Security Maturity Roadmap**)

These sections are CRITICAL for clients and must be present in EVERY SINGLE REPORT. Do NOT skip them under any circumstances. They provide essential value to the client.
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
      `\n\nCRITICAL FINAL REMINDERS:
- Replace ALL dates/times in your response with: ${todayFormatted}
- Use UK English spelling throughout (e.g., "colour" not "color", "organise" not "organize", "centre" not "center", "whilst" not "while", "realise" not "realize", "optimise" not "optimize", "analyse" not "analyze")
- Write for CUSTOMERS and EXECUTIVES - avoid technical jargon
- Do NOT mention file paths, directories, or internal technical structures
- Focus on business impact and risk
- DO NOT include placeholder text, brackets, or incomplete sections like "[Contact information]", "[To be added]", "[TBD]", etc.
- ONLY write sections with actual, meaningful content from the provided data
- Every section must contain real information - if you don't have the information, omit the section entirely
- This is a customer-facing document - placeholder text looks unprofessional and creates a bad impression
- CRITICAL: DO NOT write generic definitions or explanations of what sections are. Write ACTUAL content about the findings from THIS penetration test.
- CRITICAL: DO NOT include any text about "This section starts on a new page" or any internal formatting instructions. These are handled automatically and should NEVER appear in the report.

CRITICAL: EDUCATION AND URGENCY REQUIREMENTS:
- INCLUDE educational moments about shared responsibility when third-party platforms (Shopify, Cloudflare, AWS, WordPress, etc.) are involved
- EXPLAIN that while platforms secure their infrastructure, ${domainName} remains responsible for configuration, APIs, subdomains, and development environments
- USE statements like: "While [Platform] secures the platform itself, responsibility for [specific areas] remains with ${domainName}."
- CREATE urgency with factual statements about exploitation timelines in Business Impact and Risk Scenario sections
- ADD impactful lines such as: "These vulnerabilities are routinely exploited by automated scanners within days of exposure."
- USE real-world facts and timelines to create urgency, not hypothetical scenarios
- BALANCE urgency with actionable recommendations - motivate action without fear-mongering
- CONNECT educational content to immediate action items

CRITICAL STRUCTURE AND CONTENT VERIFICATION:
- VERIFY: The report MUST contain AT LEAST 25 SECTIONS total (main sections + subsections). Count them before finalizing.
- VERIFY: EVERY section and subsection MUST contain AT LEAST 6-7 lines of informative, valuable content. Check each section.
- If you have fewer than 25 sections, ADD MORE sections (e.g., additional findings subsections, IP-specific sections, vulnerability category sections, compliance sections, technical deep-dives, etc.)
- If any section has fewer than 6-7 lines, EXPAND it with additional relevant content, details, examples, or explanations
- Each section should provide substantial value - brief one-line descriptions are NOT acceptable
- The report structure should be: Table of Contents, Executive Summary (5+ subsections), Test Scope (5+ subsections), Attack Surface Analysis (6+ subsections), Detailed Findings (multiple subsections - one per finding), Risk Assessment (6+ subsections), Recommendations (6+ subsections), Appendices (4+ subsections)
- Generate the detailed report now following the exact structure above with ONLY real, complete information, ensuring AT LEAST 25 SECTIONS with 6-7 lines of content each:`

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
      max_tokens: request.pentestType === 'aggressive' ? 16000 : 8000, // Aggressive mode: 16000 tokens for extensive detail (8000-12000+ words). Soft mode: 8000 tokens (4000-5000 words)
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(apiRequestBody),
    })

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
