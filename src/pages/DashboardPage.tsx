import { useEffect, useState } from 'react';
import { useAppStore } from '../state/store';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { ReportPdf } from '../components/report/ReportPdf';
import { buildReportFromState, type PreparedReportData } from '../services/reports';
import { getBrandingFromHostname } from '../utils/branding';

const trendData = Array.from({ length: 8 }).map((_, i) => ({
	label: `W${i + 1}`,
	value: Math.floor(50 + Math.random() * 50),
}));

export function DashboardPage() {
	const domain = useAppStore(s => s.currentDomain) ?? '—';
	const score = useAppStore(s => s.aiReconScore) ?? 0;
	const vulnerabilities = useAppStore(s => s.vulnerabilities);
    const [data, setData] = useState<PreparedReportData | null>(null);
    const brand = getBrandingFromHostname(window.location.hostname);

    useEffect(() => {
        const d = (domain && domain !== '—') ? domain : 'yourdomain.com';
        const trend = trendData;
        const vulns = vulnerabilities.map(v => ({ severity: v.severity, title: v.title, recommendation: v.recommendation }));
        buildReportFromState({ domain: d, score, trend, vulnerabilities: vulns }).then(setData);
    }, [domain, score, vulnerabilities]);

	return (
		<div className="container-max py-12 space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-slate-900">Dashboard — {domain}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                    {data && (
                        <PDFDownloadLink
                            className="btn btn-outline"
                            document={<ReportPdf brandName={brand.name} brandColor={brand.primaryColor} data={data} />}
                            fileName={`${(domain && domain !== '—') ? domain : 'report'}-cybersentry-report.pdf`}
                        >
                            {({ loading }) => (loading ? 'Preparing PDF…' : 'Download PDF')}
                        </PDFDownloadLink>
                    )}
                    <div className="badge">Plan: Pro</div>
                </div>
            </div>
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="glass rounded-xl p-6">
					<p className="text-sm text-gray-600">Latest AI Pen Test Score</p>
					<p className="text-5xl font-bold mt-2 text-slate-900">{score}</p>
				</div>
				<div className="lg:col-span-2 glass rounded-xl p-6">
					<p className="text-sm text-gray-600 mb-3">Risk Score Trend</p>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={trendData}>
								<XAxis dataKey="label" stroke="#64748b"/>
								<YAxis domain={[0, 100]} stroke="#64748b"/>
								<Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
								<Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
			<div className="glass rounded-xl p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold text-slate-900">Vulnerabilities</h3>
					<div className="text-xs text-gray-500">{vulnerabilities.length} found</div>
				</div>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="text-gray-600">
							<tr>
								<th className="text-left py-2 pr-4">Severity</th>
								<th className="text-left py-2 pr-4">Title</th>
								<th className="text-left py-2 pr-4">Recommendation</th>
							</tr>
						</thead>
						<tbody>
							{vulnerabilities.map(v => (
								<tr key={v.id} className="border-t border-slate-200">
									<td className="py-2 pr-4"><span className="badge">{v.severity}</span></td>
									<td className="py-2 pr-4 text-slate-900">{v.title}</td>
									<td className="py-2 pr-4 text-gray-600">{v.recommendation}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}


