export interface BrandingConfig {
	name: string;
	primaryColor: string;
	logoUrl?: string;
}

export function getBrandingFromHostname(hostname: string): BrandingConfig {
	// Simple demo mapping for white-labeling; replace with API-driven config
	if (hostname.startsWith('onecom')) {
		return { name: 'Onecom Cyber', primaryColor: '#22d3ee' };
	}
	return { name: 'CyberSentry', primaryColor: '#22d3ee' };
}


