import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Shield, ArrowRight, FileText, CheckCircle2 } from 'lucide-react';

export function LandingPage() {
	const navigate = useNavigate();
	const [domain, setDomain] = useState('');

    return (
        <section className="relative">
            <div className="container-max pt-16 pb-12">
                <div className="space-y-6 max-w-4xl">
                    <div className="inline-flex items-center gap-2 badge">
                        <CheckCircle2 size={14} /> ISO-ready • GDPR • MSP white-label
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold leading-tight text-slate-900">
                        Automated AI-powered Pen Testing
                        <span className="block text-brand">for your domain</span>
                    </h1>
                    <p className="text-gray-600 max-w-xl">
                        Scan your attack surface and get actionable, executive-ready reports. Upgrade to unlock full results, remediation, and SOC.
                    </p>
                </div>

                {/* Input + What you get aligned row */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Left: Domain input */}
                    <div className="glass rounded-xl p-3 sm:p-4 self-stretch flex flex-col justify-center h-full">
                        <div className="space-y-2 flex flex-col items-stretch justify-center h-full text-left">
                            <label className="text-xl font-semibold text-slate-900">Enter your domain</label>
                            <div className="flex flex-col sm:flex-row gap-2 w-full items-stretch">
                                <input
                                    value={domain}
                                    onChange={(e) => setDomain(e.target.value)}
                                    placeholder="example.com"
                                    className="flex-1 rounded-md bg-white border border-slate-200 px-4 py-2 outline-none focus:border-brand text-slate-900"
                                />
                                <button
                                    onClick={() => navigate(`/validate?domain=${encodeURIComponent(domain)}`)}
                                    className="btn btn-primary"
                                    disabled={!domain}
                                >
                                    Start Free Scan <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right: What you get, aligned to input card */}
                    <div className="glass rounded-2xl p-6 lg:p-8 self-stretch">
                        <div className="flex items-start gap-4">
                            <Shield className="text-brand shrink-0" />
                            <div className="space-y-3 w-full">
                                <h3 className="text-xl font-semibold text-slate-900">What you get</h3>
                                <div className="space-y-2 text-gray-700">
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="text-emerald-600" size={16} />
                                        <span>AI Recon Score and top vulnerabilities</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="text-emerald-600" size={16} />
                                        <span>Executive summary and fix recommendations</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <CheckCircle2 className="text-emerald-600" size={16} />
                                        <span>Upgrade for full report, remediation, and SOC hotline</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex items-center gap-3 text-xs text-gray-600">
                    <span className="badge">GDPR</span>
                    <span className="badge">Onecom Cyber</span>
                    <span className="badge">Powered by CyberSentry</span>
                </div>
                <div className="mt-10">
                    <button className="btn btn-outline" onClick={() => navigate('/reports?sample=1')}>
                        <FileText size={16} /> View Sample Report
                    </button>
                </div>
            </div>
        </section>
    );
}


