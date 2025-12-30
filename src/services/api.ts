import type { VulnerabilityItem } from '../state/store';

function simulateLatency<T>(data: T, ms = 600): Promise<T> {
	return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

export async function requestEmailValidationToken(domain: string): Promise<{ sent: boolean }>{
	console.log('Simulated: sending validation email to', `admin@${domain}`);
	return simulateLatency({ sent: true }, 500);
}

export async function verifyDnsTxtRecord(domain: string, token: string): Promise<{ verified: boolean }>{
	console.log('Simulated: verifying DNS TXT for', domain, token);
	const verified = token.trim().length > 6;
	return simulateLatency({ verified }, 700);
}

export async function startReconAndScan(domain: string): Promise<{ score: number; topFindings: VulnerabilityItem[] }>{
	const score = Math.floor(55 + Math.random() * 45);
	const sample: VulnerabilityItem[] = [
		{
			id: 'vuln-1',
			severity: 'high',
			title: 'Outdated TLS configuration',
			description: 'Server supports weak ciphers and TLS 1.0.',
			recommendation: 'Disable TLS 1.0/1.1 and weak ciphers; enforce TLS 1.2+',
		},
		{
			id: 'vuln-2',
			severity: 'medium',
			title: 'Directory listing enabled',
			description: 'Sensitive directories are publicly listable.',
			recommendation: 'Disable autoindex and restrict access via server config.'
		},
		{
			id: 'vuln-3',
			severity: 'critical',
			title: 'Admin panel exposed',
			description: 'Unauthenticated access to admin endpoints detected.',
			recommendation: 'Enforce authN/Z, IP restrictions, and MFA for admin.'
		},
	];
	return simulateLatency({ score, topFindings: sample }, 1200);
}

export async function createCheckoutSession(options: {
	plan: 'pro';
	remediation?: boolean;
	humanValidation?: boolean;
	socHotline?: boolean;
}): Promise<{ url: string }>{
	const params = new URLSearchParams();
	params.set('plan', options.plan);
	if (options.remediation) params.set('remediation', '1');
	if (options.humanValidation) params.set('human_validation', '1');
	if (options.socHotline) params.set('soc_hotline', '1');
	return simulateLatency({ url: `/dashboard?upgraded=1&${params.toString()}` }, 500);
}


