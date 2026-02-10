import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createCheckoutSession } from '../services/api';
import { useAppStore } from '../state/store';

interface CheckoutModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export function CheckoutModal({ isOpen, onClose }: CheckoutModalProps) {
	const [remediation, setRemediation] = useState(true);
	const [humanValidation, setHumanValidation] = useState(false);
	const [socHotline, setSocHotline] = useState(false);
	const [loading, setLoading] = useState(false);
	const subscription = useAppStore((s) => s.subscription);
	const setSubscription = useAppStore((s) => s.setSubscription);

	// Initialize checkboxes when modal opens - show already subscribed items as checked
	useEffect(() => {
		if (isOpen) {
			setRemediation(subscription.remediation);
			setHumanValidation(subscription.humanValidation);
			setSocHotline(subscription.socHotline);
		}
	}, [isOpen, subscription.remediation, subscription.humanValidation, subscription.socHotline]);

	if (!isOpen) return null;

	async function onCheckout() {
		setLoading(true);
		try {
			const session = await createCheckoutSession({ plan: 'pro', remediation, humanValidation, socHotline });
			// Update subscription state after successful checkout
			setSubscription({ plan: true, remediation, humanValidation, socHotline });
			// In production, redirect to Stripe checkout
			// window.location.href = session.url;
			// For demo, just close modal after a brief delay
			setTimeout(() => {
				onClose();
			}, 1500);
		} catch (error) {
			console.error('Checkout error:', error);
		} finally {
			setLoading(false);
		}
	}

	const total = 199 + (remediation ? 150 : 0) + (humanValidation ? 100 : 0) + (socHotline ? 250 : 0);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			{/* Backdrop */}
			<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
			
			{/* Modal */}
			<div className="relative glass rounded-xl p-8 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
				<button
					onClick={onClose}
					className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
				>
					<X size={20} />
				</button>

				<h2 className="text-2xl font-semibold mb-6 text-slate-900">Upgrade to Full Pen Test</h2>
				
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<div className="lg:col-span-2 space-y-4">
						<div>
							<p className="text-gray-600 mb-2">Base subscription</p>
							<div className="flex items-end justify-between border-b border-slate-200 pb-4">
								<div>
									<p className="font-semibold text-lg text-slate-900">Full AI Pen Test</p>
									<p className="text-sm text-gray-600">Unlimited scans, full reports, dashboard</p>
								</div>
								<p className="text-3xl font-bold text-slate-900">£199<span className="text-base font-normal text-gray-600">/mo</span></p>
							</div>
						</div>
						
						<div className="space-y-3">
							<label className={`flex items-center justify-between gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${remediation ? 'border-brand bg-brand/10' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
								<div className="flex-1">
									<p className="font-medium text-slate-900">Remediation Management</p>
									<p className="text-sm text-gray-600">Expert guidance to fix vulnerabilities</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-gray-600">+£150/mo</span>
									<input 
										type="checkbox" 
										checked={remediation} 
										onChange={(e) => setRemediation(e.target.checked)}
										className="w-5 h-5 rounded border-2 border-slate-300 accent-brand cursor-pointer"
									/>
								</div>
							</label>
							
							<label className={`flex items-center justify-between gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${humanValidation ? 'border-brand bg-brand/10' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
								<div className="flex-1">
									<p className="font-medium text-slate-900">Human Validation</p>
									<p className="text-sm text-gray-600">Expert review of AI findings</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-gray-600">+£100/mo</span>
									<input 
										type="checkbox" 
										checked={humanValidation} 
										onChange={(e) => setHumanValidation(e.target.checked)}
										className="w-5 h-5 rounded border-2 border-slate-300 accent-brand cursor-pointer"
									/>
								</div>
							</label>
							
							<label className={`flex items-center justify-between gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${socHotline ? 'border-brand bg-brand/10' : 'border-slate-200 hover:border-slate-300 bg-white'}`}>
								<div className="flex-1">
									<p className="font-medium text-slate-900">SOC Hotline</p>
									<p className="text-sm text-gray-600">24/7 security operations center support</p>
								</div>
								<div className="flex items-center gap-3">
									<span className="text-gray-600">+£250/mo</span>
									<input 
										type="checkbox" 
										checked={socHotline} 
										onChange={(e) => setSocHotline(e.target.checked)}
										className="w-5 h-5 rounded border-2 border-slate-300 accent-brand cursor-pointer"
									/>
								</div>
							</label>
						</div>
					</div>
					
					<div className="glass rounded-xl p-6 space-y-4 h-fit border border-slate-200">
						<p className="font-semibold text-lg text-slate-900">Order Summary</p>
						<ul className="text-sm text-gray-700 space-y-2">
							<li className="flex justify-between pb-2 border-b border-slate-200">
								<span>Full AI Pen Test</span>
								<span className="font-medium">£199/mo</span>
							</li>
							{remediation && (
								<li className="flex justify-between">
									<span className="text-gray-600">Remediation</span>
									<span>£150/mo</span>
								</li>
							)}
							{humanValidation && (
								<li className="flex justify-between">
									<span className="text-gray-600">Human Validation</span>
									<span>£100/mo</span>
								</li>
							)}
							{socHotline && (
								<li className="flex justify-between">
									<span className="text-gray-600">SOC Hotline</span>
									<span>£250/mo</span>
								</li>
							)}
						</ul>
						<div className="pt-4 border-t border-slate-200">
							<div className="flex justify-between items-center text-lg font-bold text-slate-900">
								<span>Total</span>
								<span className="text-brand">£{total}/mo</span>
							</div>
						</div>
						<button className="btn btn-primary w-full" onClick={onCheckout} disabled={loading}>
							{loading ? 'Processing...' : 'Proceed to Checkout'}
						</button>
						<p className="text-xs text-gray-500 text-center">
							Stripe checkout will be used in production
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

