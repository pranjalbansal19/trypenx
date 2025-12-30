import { useState } from 'react';
import { createCheckoutSession } from '../services/api';
import { useNavigate } from 'react-router-dom';

export function CheckoutPage() {
	const [remediation, setRemediation] = useState(true);
	const [humanValidation, setHumanValidation] = useState(false);
	const [socHotline, setSocHotline] = useState(false);
	const [loading, setLoading] = useState(false);
	const navigate = useNavigate();

	async function onCheckout() {
		setLoading(true);
		const session = await createCheckoutSession({ plan: 'pro', remediation, humanValidation, socHotline });
		setLoading(false);
		navigate(session.url);
	}

	return (
		<div className="container-max py-12">
			<h2 className="text-2xl font-semibold mb-6">Upgrade to Full Pen Test</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 glass rounded-xl p-6 space-y-4">
					<p className="text-white/70">Base subscription</p>
					<div className="flex items-end justify-between border-b border-white/10 pb-4">
						<div>
							<p className="font-semibold text-lg">Full AI Pen Test</p>
							<p className="text-sm text-white/60">Unlimited scans, full reports, dashboard</p>
						</div>
						<p className="text-3xl font-bold">£199<span className="text-base font-normal text-white/60">/mo</span></p>
					</div>
					<div className="space-y-3">
						<label className="flex items-center justify-between gap-3">
							<span>Remediation Management</span>
							<input type="checkbox" checked={remediation} onChange={(e)=>setRemediation(e.target.checked)} />
							<span className="text-white/70">+£150/mo</span>
						</label>
						<label className="flex items-center justify-between gap-3">
							<span>Human Validation</span>
							<input type="checkbox" checked={humanValidation} onChange={(e)=>setHumanValidation(e.target.checked)} />
							<span className="text-white/70">+£100/mo</span>
						</label>
						<label className="flex items-center justify-between gap-3">
							<span>SOC Hotline</span>
							<input type="checkbox" checked={socHotline} onChange={(e)=>setSocHotline(e.target.checked)} />
							<span className="text-white/70">+£250/mo</span>
						</label>
					</div>
				</div>
				<div className="glass rounded-xl p-6 space-y-3 h-fit">
					<p className="font-semibold">Order Summary</p>
					<ul className="text-sm text-white/80 space-y-1">
						<li className="flex justify-between"><span>Full AI Pen Test</span><span>£199/mo</span></li>
						{remediation && <li className="flex justify-between"><span>Remediation</span><span>£150/mo</span></li>}
						{humanValidation && <li className="flex justify-between"><span>Human Validation</span><span>£100/mo</span></li>}
						{socHotline && <li className="flex justify-between"><span>SOC Hotline</span><span>£250/mo</span></li>}
					</ul>
					<button className="btn btn-primary w-full" onClick={onCheckout} disabled={loading}>
						{loading ? 'Redirecting…' : 'Proceed to Checkout'}
					</button>
					<p className="text-xs text-white/50">Stripe checkout will be used on production.</p>
				</div>
			</div>
		</div>
	);
}


