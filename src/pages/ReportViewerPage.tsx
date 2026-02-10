import { useEffect, useState } from 'react';
import { useAppStore } from '../state/store';
import { PDFDownloadLink, pdf } from '@react-pdf/renderer';
import { ReportPdf } from '../components/report/ReportPdf';
import { getPreparedReport, type PreparedReportData } from '../services/reports';
import { getBrandingFromHostname } from '../utils/branding';

export function ReportViewerPage() {
	const domain = useAppStore(s => s.currentDomain) ?? 'example.com';
	const [data, setData] = useState<PreparedReportData | null>(null);
	const brand = getBrandingFromHostname(window.location.hostname);

	const [exporting, setExporting] = useState(false);

	async function handleExportCompliance() {
		if (!data) return;
		try {
			setExporting(true);
			const blob = await pdf(
				<ReportPdf brandName={brand.name} brandColor={brand.primaryColor} data={data} />
			).toBlob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `${domain}-cybersentry-compliance.pdf`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			URL.revokeObjectURL(url);
		} finally {
			setExporting(false);
		}
	}
	useEffect(() => {
		getPreparedReport(domain).then(setData);
	}, [domain]);

	return (
		<div className="container-max py-12 space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-semibold text-slate-900">Report — {domain}</h2>
				{data && (
					<PDFDownloadLink
						className="btn btn-outline"
						document={<ReportPdf brandName={brand.name} brandColor={brand.primaryColor} data={data} />}
						fileName={`${domain}-cybersentry-report.pdf`}
					>
						{({ loading }) => (loading ? 'Preparing PDF…' : 'Download PDF')}
					</PDFDownloadLink>
				)}
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="lg:col-span-2 glass rounded-xl p-6 space-y-4">
					<h3 className="font-semibold text-slate-900">Executive Summary</h3>
					<p className="text-sm text-gray-700">This section summarizes overall risk posture, major findings, and strategic recommendations for leadership review.</p>
					<h3 className="font-semibold pt-4 text-slate-900">Vulnerability Table</h3>
					<p className="text-sm text-gray-700">A full, filterable table is included in the dashboard. Export provides CVE references and CWE mappings.</p>
					<h3 className="font-semibold pt-4 text-slate-900">Fix Recommendations</h3>
					<p className="text-sm text-gray-700">Each issue includes prioritized steps, owner suggestions, and validation checks post-remediation.</p>
				</div>
				<div className="glass rounded-xl p-6 space-y-4">
					<h3 className="font-semibold text-slate-900">Severity Matrix</h3>
					<div className="grid grid-cols-2 gap-2 text-xs">
						<div className="rounded-md bg-red-100 text-red-800 p-3">Critical</div>
						<div className="rounded-md bg-orange-100 text-orange-800 p-3">High</div>
						<div className="rounded-md bg-yellow-100 text-yellow-800 p-3">Medium</div>
						<div className="rounded-md bg-emerald-100 text-emerald-800 p-3">Low</div>
					</div>
					<button className="btn btn-primary w-full" onClick={handleExportCompliance} disabled={!data || exporting}>
						{exporting ? 'Preparing…' : 'Export Compliance PDF'}
					</button>
				</div>
			</div>
		</div>
	);
}


