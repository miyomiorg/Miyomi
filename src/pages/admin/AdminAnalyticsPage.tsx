import { useCallback, useEffect, useMemo, useState } from 'react';
import { analyticsApi } from '@/services/api';
import type { AnalyticsData } from '@/services/api/types';
import { format } from 'date-fns';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, PieChart, Pie, Cell, Legend, Line,
} from 'recharts';
import { BarChart3, Globe2, Monitor, Smartphone, FileSearch, ShieldAlert, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

const PALETTE = ['#6366F1', '#22C55E', '#F59E0B', '#EF4444', '#06B6D4', '#8B5CF6', '#F97316', '#14B8A6', '#EC4899', '#84CC16', '#0EA5E9', '#A855F7'];

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 });
const regionNames = new Intl.DisplayNames(['en'], { type: 'region' });

const fmt = (n: number) => (Number.isFinite(n) ? compact.format(n) : '0');
const fmtBytes = (n: number) => {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / Math.pow(1024, i)).toFixed(i >= 2 ? 2 : 0)} ${units[i]}`;
};
const shortDay = (iso: string) => {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : format(d, 'MMM d');
};

const chartTooltipStyle = {
  background: 'var(--bg-surface)',
  border: '1px solid var(--divider)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  fontSize: '12px',
};

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-5 ${className}`} style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)' }}>
      {children}
    </div>
  );
}

function CardTitle({ icon, children, note }: { icon: React.ReactNode; children: React.ReactNode; note?: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      {icon}
      <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{children}</h3>
      {note && <span className="text-[11px] rounded-full px-2 py-0.5" style={{ background: 'var(--chip-bg)', color: 'var(--text-secondary)' }}>{note}</span>}
    </div>
  );
}

export function AdminAnalyticsPage() {
  const [days, setDays] = useState<7 | 14 | 30>(7);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (range: 7 | 14 | 30) => {
    setLoading(true);
    setError(null);
    try {
      setData(await analyticsApi.overview(range));
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(days); }, [days, load]);

  const chartSeries = useMemo(
    () => (data?.series ?? []).map((d) => ({ ...d, label: shortDay(d.date), trafficGB: +(d.bytes / 1024 ** 3).toFixed(2) })),
    [data],
  );

  const countryData = useMemo(
    () => (data?.countries ?? []).map((c) => ({ ...c, name: (() => { try { return regionNames.of(c.code) ?? c.code; } catch { return c.code; } })(), gb: +(c.bytes / 1024 ** 3).toFixed(2) })),
    [data],
  );

  const browserData = useMemo(() => data?.browsers ?? [], [data]);
  const deviceData = useMemo(() => data?.adaptive.devices ?? [], [data]);
  const osData = useMemo(() => data?.adaptive.oss ?? [], [data]);

  const maxVisits = Math.max(1, ...(data?.adaptive.pages ?? []).map((p) => p.visits));
  const maxCountryRequests = Math.max(1, ...countryData.map((c) => c.requests));

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--text-secondary)' }}>
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Loading Cloudflare analytics…</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header + range switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-7 h-7" style={{ color: 'var(--brand)' }} />
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Analytics</h1>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Cloudflare zone analytics for miyomi.app</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {([7, 14, 30] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className="px-3.5 py-1.5 rounded-lg text-sm font-medium border transition-colors"
              style={{
                background: days === d ? 'var(--brand)' : 'var(--bg-surface)',
                color: days === d ? '#fff' : 'var(--text-secondary)',
                borderColor: 'var(--divider)',
              }}
            >
              {d} days
            </button>
          ))}
          <button
            onClick={() => load(days)}
            disabled={loading}
            className="p-2 rounded-lg border transition-colors disabled:opacity-50"
            style={{ background: 'var(--bg-surface)', borderColor: 'var(--divider)', color: 'var(--text-secondary)' }}
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3 border bg-red-500/10 border-red-500/20" style={{ color: 'var(--destructive)' }}>
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">{error}</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              Analytics needs CF_API_TOKEN + CF_ZONE_ID configured on the Worker.
            </p>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-4 mb-6">
            {[
              { label: 'Unique Visitors', value: fmt(data.totals.uniques), color: '#F59E0B' },
              { label: 'Requests', value: fmt(data.totals.requests), color: '#6366F1' },
              { label: 'Page Views', value: fmt(data.totals.pageViews), color: '#22C55E' },
              { label: 'Bandwidth', value: fmtBytes(data.totals.bytes), color: '#06B6D4' },
              { label: 'Cached', value: fmtBytes(data.totals.cachedBytes), color: '#EC4899' },
              { label: 'Encrypted', value: fmt(data.totals.encryptedRequests), color: '#8B5CF6' },
              { label: 'Threats', value: fmt(data.totals.threats), color: '#EF4444' },
            ].map((k) => (
              <Card key={k.label} className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: k.color }} />
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{k.label}</span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{k.value}</div>
              </Card>
            ))}
          </div>

          {/* Traffic over time */}
          <Card className="mb-6">
            <CardTitle icon={<BarChart3 className="w-4 h-4" style={{ color: 'var(--brand)' }} />}>
              Traffic ({days} days)
            </CardTitle>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartSeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gReqs" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366F1" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--divider)' }} />
                <YAxis yAxisId="left" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                <YAxis yAxisId="right" orientation="right" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any, name: any) => [fmt(Number(v)), name]} />
                <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
                <Area yAxisId="left" type="monotone" dataKey="requests" name="Requests" stroke="#6366F1" strokeWidth={2} fill="url(#gReqs)" />
                <Area yAxisId="right" type="monotone" dataKey="pageViews" name="Page views" stroke="#22C55E" strokeWidth={2} fill="url(#gViews)" />
                <Line yAxisId="right" type="monotone" dataKey="uniques" name="Unique visitors" stroke="#F59E0B" strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Countries */}
            <Card>
              <CardTitle icon={<Globe2 className="w-4 h-4" style={{ color: '#06B6D4' }} />}>
                Requests by country <span style={{ color: 'var(--text-secondary)' }}>({days} days)</span>
              </CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={countryData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="requests" name="Requests" radius={[0, 6, 6, 0]} barSize={16}>
                    {countryData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Browsers */}
            <Card>
              <CardTitle icon={<Monitor className="w-4 h-4" style={{ color: '#8B5CF6' }} />}>
                Browsers <span style={{ color: 'var(--text-secondary)' }}>({days} days)</span>
              </CardTitle>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={browserData} dataKey="pageViews" nameKey="family" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {browserData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => fmt(Number(v))} />
                  <Legend wrapperStyle={{ fontSize: 11, color: 'var(--text-secondary)' }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Devices */}
            <Card>
              <CardTitle icon={<Smartphone className="w-4 h-4" style={{ color: '#F59E0B' }} />} note="≈7 days">
                Device types
              </CardTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={deviceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" vertical={false} />
                  <XAxis dataKey="type" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={{ stroke: 'var(--divider)' }} />
                  <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
                  <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: 'var(--chip-bg)' }} formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="visits" name="Visits" radius={[6, 6, 0, 0]} barSize={44}>
                    {deviceData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Operating systems */}
            <Card>
              <CardTitle icon={<Monitor className="w-4 h-4" style={{ color: '#14B8A6' }} />} note="≈7 days">
                Operating systems
              </CardTitle>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={osData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--divider)" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" width={90} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: any) => fmt(Number(v))} />
                  <Bar dataKey="visits" name="Visits" radius={[0, 6, 6, 0]} barSize={16}>
                    {osData.map((_, i) => <Cell key={i} fill={PALETTE[(i + 4) % PALETTE.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top pages */}
            <Card>
              <CardTitle icon={<FileSearch className="w-4 h-4" style={{ color: 'var(--brand)' }} />} note="≈7 days">
                Top pages
              </CardTitle>
              <div className="space-y-2">
                {(data.adaptive.pages ?? []).map((p) => (
                  <div key={p.path}>
                    <div className="flex items-center justify-between gap-3 text-xs mb-1">
                      <span className="font-mono truncate" style={{ color: 'var(--text-primary)' }}>{p.path}</span>
                      <span className="whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                        {fmt(p.visits)} · {fmtBytes(p.bytes)}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--chip-bg)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.max(3, (p.visits / maxVisits) * 100)}%`, background: 'var(--brand)' }}
                      />
                    </div>
                  </div>
                ))}
                {(data.adaptive.pages ?? []).length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No page data for this window.</p>
                )}
              </div>
            </Card>

            {/* Threat pathing */}
            <Card>
              <CardTitle icon={<ShieldAlert className="w-4 h-4" style={{ color: '#EF4444' }} />}>
                Threat pathing <span style={{ color: 'var(--text-secondary)' }}>({days} days)</span>
              </CardTitle>
              <div className="space-y-2">
                {(data.threatPathing ?? []).map((t) => (
                  <div key={t.name}>
                    <div className="flex items-center justify-between gap-3 text-xs mb-1">
                      <span className="font-mono truncate" style={{ color: 'var(--text-primary)' }}>{t.name}</span>
                      <span className="whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>{fmt(t.requests)}</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--chip-bg)' }}>
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${Math.max(3, (t.requests / Math.max(1, data.threatPathing[0]?.requests)) * 100)}%`, background: '#EF4444' }}
                      />
                    </div>
                  </div>
                ))}
                {(data.threatPathing ?? []).length === 0 && (
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No threats recorded in this window 🎉</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}