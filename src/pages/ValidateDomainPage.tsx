import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AtSign, Network, Check, Loader2 } from 'lucide-react';
import { requestEmailValidationToken, verifyDnsTxtRecord, startReconAndScan } from '../services/api';
import { useAppStore } from '../state/store';

function useQuery() {
	const { search } = useLocation();
	return useMemo(() => new URLSearchParams(search), [search]);
}

export function ValidateDomainPage() {
	const query = useQuery();
	const navigate = useNavigate();
	const domain = query.get('domain') ?? '';
	const [emailSent, setEmailSent] = useState(false);
	const [dnsToken, setDnsToken] = useState('');
	const [verifying, setVerifying] = useState(false);
	const [verified, setVerified] = useState(false);
	const setDomain = useAppStore(s => s.setDomain);
	const setReconScore = useAppStore(s => s.setReconScore);
	const setVulns = useAppStore(s => s.setVulnerabilities);

	useEffect(() => {
		if (!domain) return;
		setDomain(domain);
	}, [domain, setDomain]);

	async function sendEmail() {
		const res = await requestEmailValidationToken(domain);
		setEmailSent(res.sent);
	}

	async function verifyDns() {
		setVerifying(true);
		const res = await verifyDnsTxtRecord(domain, dnsToken);
		setVerifying(false);
		setVerified(res.verified);
		if (res.verified) {
			const scan = await startReconAndScan(domain);
			setReconScore(scan.score);
			setVulns(scan.topFindings);
			navigate('/scan');
		}
	}

	return (
		<div className="container-max py-12">
			<h2 className="text-2xl font-semibold mb-6">Validate ownership of {domain || 'your domain'}</h2>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<div className="glass rounded-xl p-6 space-y-4">
					<div className="flex items-center gap-2 font-medium"><AtSign className="text-brand" /> Email validation</div>
					<p className="text-sm text-white/70">We will send a link to admin@{domain || 'yourdomain.com'}.</p>
					<button className="btn btn-outline" onClick={sendEmail} disabled={!domain || emailSent}>
						{emailSent ? <Check size={16} /> : null} {emailSent ? 'Sent' : 'Send validation email'}
					</button>
				</div>
				<div className="glass rounded-xl p-6 space-y-4">
					<div className="flex items-center gap-2 font-medium"><Network className="text-brand" /> DNS TXT record</div>
					<p className="text-sm text-white/70">Create a TXT record:</p>
					<pre className="bg-black/30 rounded-md p-3 text-xs overflow-auto">_cybersentry.{domain || 'yourdomain.com'}  TXT  "CS-VERIFY-xxxxxxxx"</pre>
					<input value={dnsToken} onChange={(e)=>setDnsToken(e.target.value)} placeholder="Paste token value" className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-brand" />
					<button onClick={verifyDns} className="btn btn-primary" disabled={!dnsToken || verifying}>
						{verifying ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />} Verify & Start Scan
					</button>
					{verified ? <p className="text-sm text-emerald-400 flex items-center gap-2"><Check size={14}/> Verified</p> : null}
				</div>
			</div>
		</div>
	);
}


