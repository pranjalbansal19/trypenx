export function AdminConsolePage() {
	return (
		<div className="container-max py-12 space-y-6">
			<h2 className="text-2xl font-semibold text-slate-900">Admin Console</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="glass rounded-xl p-6 space-y-3">
					<p className="font-semibold text-slate-900">Trigger New Test</p>
					<input className="w-full rounded-md bg-white border border-slate-200 px-3 py-2 text-slate-900" placeholder="Enter domain" />
					<button className="btn btn-primary w-full">Run Now</button>
				</div>
				<div className="glass rounded-xl p-6 space-y-3 lg:col-span-2">
					<p className="font-semibold text-slate-900">Tenants</p>
					<div className="text-sm text-gray-600">Manage domains, users, and latest test status.</div>
					<div className="rounded-md border border-slate-200 p-4 text-sm text-gray-700">Sample: onecomcyber.com — 12 users — last test today</div>
				</div>
			</div>
		</div>
	);
}


