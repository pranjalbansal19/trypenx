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
                <h2 className="text-2xl font-semibold">Dashboard — {domain}</h2>
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
					<p className="text-sm text-white/70">Latest AI Pen Test Score</p>
					<p className="text-5xl font-bold mt-2">{score}</p>
				</div>
				<div className="lg:col-span-2 glass rounded-xl p-6">
					<p className="text-sm text-white/70 mb-3">Risk Score Trend</p>
					<div className="h-56">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart data={trendData}>
								<XAxis dataKey="label" stroke="#94a3b8"/>
								<YAxis domain={[0, 100]} stroke="#94a3b8"/>
								<Tooltip contentStyle={{ background: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)' }} />
								<Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={2} dot={false} />
							</LineChart>
						</ResponsiveContainer>
					</div>
				</div>
			</div>
			<div className="glass rounded-xl p-6">
				<div className="flex items-center justify-between">
					<h3 className="font-semibold">Vulnerabilities</h3>
					<div className="text-xs text-white/60">{vulnerabilities.length} found</div>
				</div>
				<div className="mt-4 overflow-x-auto">
					<table className="min-w-full text-sm">
						<thead className="text-white/70">
							<tr>
								<th className="text-left py-2 pr-4">Severity</th>
								<th className="text-left py-2 pr-4">Title</th>
								<th className="text-left py-2 pr-4">Recommendation</th>
							</tr>
						</thead>
						<tbody>
							{vulnerabilities.map(v => (
								<tr key={v.id} className="border-t border-white/10">
									<td className="py-2 pr-4"><span className="badge">{v.severity}</span></td>
									<td className="py-2 pr-4">{v.title}</td>
									<td className="py-2 pr-4 text-white/70">{v.recommendation}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}


