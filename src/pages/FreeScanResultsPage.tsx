import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../state/store';
import { Lock, EyeOff } from 'lucide-react';

export function FreeScanResultsPage() {
	const navigate = useNavigate();
	const domain = useAppStore(s => s.currentDomain);
	const score = useAppStore(s => s.aiReconScore);
	const vulns = useAppStore(s => s.vulnerabilities);

	return (
		<div className="container-max py-12">
			<div className="flex items-center justify-between mb-6">
				<h2 className="text-2xl font-semibold text-slate-900">Free Scan Results for {domain}</h2>
				<button className="btn btn-primary" onClick={() => navigate('/checkout')}>
					<Lock size={16} /> Upgrade to Full Pen Test (£199/m)
				</button>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="glass rounded-xl p-6">
					<p className="text-sm text-gray-600">AI Recon Score</p>
					<p className="text-5xl font-bold mt-2 text-slate-900">{score ?? '--'}</p>
					<p className="text-xs text-gray-500 mt-2">Full scoring and methodology in the paid report.</p>
				</div>
				<div className="lg:col-span-2 glass rounded-xl p-6">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-slate-900">Top 3 Vulnerabilities</h3>
						<span className="badge">Partial view</span>
					</div>
					<ul className="mt-4 space-y-3">
						{vulns.map((v) => (
							<li key={v.id} className="rounded-lg border border-slate-200 p-3 flex items-center justify-between">
								<div>
									<p className="font-medium text-slate-900">[{v.severity.toUpperCase()}] {v.title}</p>
									<p className="text-xs text-gray-600">{v.description}</p>
								</div>
								<div className="flex items-center gap-2 text-gray-500 text-xs"><EyeOff size={14} /> Redacted</div>
							</li>
						))}
					</ul>
					<div className="mt-4 text-xs text-gray-500">Unlock full details, severity matrix, and recommendations.</div>
				</div>
			</div>
		</div>
	);
}


