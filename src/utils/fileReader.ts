export interface DomainFile {
	path: string;
	content: string;
	type: 'markdown' | 'text' | 'xml';
}

// Function to read files from domain folder structure
// In production, this will be replaced with API calls that fetch files from backend
// Currently returns empty array as files are uploaded via FolderUploadPage
export async function readDomainFiles(domainFolderName: string): Promise<DomainFile[]> {
	// Files are now uploaded via FolderUploadPage, so return empty array
	// In production, this will fetch files from the backend API
	return [];
}

// Helper to parse markdown headings and content
export function parseMarkdown(content: string): { title?: string; sections: Array<{ heading?: string; text: string }> } {
	const lines = content.split('\n');
	const sections: Array<{ heading?: string; text: string }> = [];
	let currentSection: { heading?: string; text: string } = { text: '' };

	for (const line of lines) {
		if (line.startsWith('# ')) {
			if (currentSection.text.trim()) {
				sections.push(currentSection);
			}
			currentSection = { heading: line.substring(2).trim(), text: '' };
		} else if (line.startsWith('## ')) {
			if (currentSection.text.trim()) {
				sections.push(currentSection);
			}
			currentSection = { heading: line.substring(3).trim(), text: '' };
		} else if (line.trim()) {
			currentSection.text += (currentSection.text ? '\n' : '') + line;
		}
	}

	if (currentSection.text.trim() || currentSection.heading) {
		sections.push(currentSection);
	}

	return { sections };
}

