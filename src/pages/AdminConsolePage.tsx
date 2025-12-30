export function AdminConsolePage() {
	return (
		<div className="container-max py-12 space-y-6">
			<h2 className="text-2xl font-semibold">Admin Console</h2>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="glass rounded-xl p-6 space-y-3">
					<p className="font-semibold">Trigger New Test</p>
					<input className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2" placeholder="Enter domain" />
					<button className="btn btn-primary w-full">Run Now</button>
				</div>
				<div className="glass rounded-xl p-6 space-y-3 lg:col-span-2">
					<p className="font-semibold">Tenants</p>
					<div className="text-sm text-white/70">Manage domains, users, and latest test status.</div>
					<div className="rounded-md border border-white/10 p-4 text-sm text-white/70">Sample: onecomcyber.com — 12 users — last test today</div>
				</div>
			</div>
		</div>
	);
}


