import { useState } from 'react';

export function ResellerBrandingPage() {
	const [brand, setBrand] = useState({
		name: 'Onecom Cyber',
		primary: '#22d3ee',
		logoUrl: '',
		subdomain: 'onecomcyber',
	});

	return (
		<div className="container-max py-12 space-y-6">
			<h2 className="text-2xl font-semibold">Reseller Branding</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="glass rounded-xl p-6 space-y-4">
					<label className="block text-sm">Brand name</label>
					<input value={brand.name} onChange={(e)=>setBrand({...brand, name: e.target.value})} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
					<label className="block text-sm">Primary color</label>
					<input value={brand.primary} onChange={(e)=>setBrand({...brand, primary: e.target.value})} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
					<label className="block text-sm">Logo URL</label>
					<input value={brand.logoUrl} onChange={(e)=>setBrand({...brand, logoUrl: e.target.value})} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
					<label className="block text-sm">Subdomain</label>
					<input value={brand.subdomain} onChange={(e)=>setBrand({...brand, subdomain: e.target.value})} className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" />
					<button className="btn btn-primary w-full">Save Branding</button>
				</div>
				<div className="lg:col-span-2 glass rounded-xl p-6">
					<p className="font-semibold mb-3">Preview</p>
					<div className="rounded-lg border border-white/10 p-6" style={{ borderColor: brand.primary }}>
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded bg-white/10" style={{ background: brand.primary }} />
							<p className="font-semibold" style={{ color: brand.primary }}>{brand.name}</p>
						</div>
						<p className="text-sm text-white/70 mt-4">Hosted at: {brand.subdomain}.com</p>
					</div>
				</div>
			</div>
		</div>
	);
}


