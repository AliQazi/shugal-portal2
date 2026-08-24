import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import dayjs from 'dayjs'
import axiosInstance from '../../Api/axios'
import MaskedDatePicker from '../../components/maskedDatePicker'
import PageMeta from '../../components/common/PageMeta'
import PageBreadCrumb from '../../components/common/PageBreadCrumb'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../utils/permissions'
import logo from '../../assets/images/logo.png'
import { Pencil, Printer } from 'lucide-react'

interface SupplierAccount {
    name?: string
    _id?: string
}

interface AdvancePayment {
    supplierAccount?: SupplierAccount
    dateOfPurchase?: string
    paidPercent?: number
    paidAmount?: number
    totalPayment?: number
    remainingPayment?: number
}

interface FinalPayment {
    supplierAccount?: SupplierAccount
    dueDate?: string
    remainingPercent?: number
    remainingAmount?: number
    totalPayment?: number
    remainingPayment?: number
}

interface GroupTicketingRow {
    _id: string
    groupNo?: string
    groupName?: string
    sector?: string
    airline?: string
    groupType: string
    internalStatus?: string
    user?: { name?: string; _id?: string }
    advancePayment?: AdvancePayment
    finalPayment?: FinalPayment
}

interface DueRow {
    id: string
    groupNo: string
    groupName: string
    sector: string
    airline: string
    groupType: string
    internalStatus: string
    supplierName: string
    dueDate: string
    totalPayment: number
    remainingAmount: number
    remainingPercent: number
    advancePaidAmount: number
    advancePaidPercent: number
    daysLeft: number
    urgency: 'Overdue' | 'Due Today' | 'Due Soon' | 'Upcoming'
}

interface Filters {
    groupType: string
    fromDate: Date | null
    toDate: Date | null
}

const GROUP_TYPE_OPTIONS = [
    'UAE Groups',
    'KSA Groups',
    'Bahrain Groups',
    'Mascat Groups',
    'Qatar Groups',
    'UK Groups',
    'Umrah Groups',
]

const fmtMoney = (n: number) => `${Math.round(n || 0).toLocaleString()}`
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD MMM YYYY') : 'N/A')
const fmtPrintDate = (d?: Date | string | null) => (d ? dayjs(d).format('ddd, DD MMM YYYY') : '')

// Defaults the report to the current calendar month (1st → last day)
const getDefaultDateRange = (): { fromDate: Date; toDate: Date } => ({
    fromDate: dayjs().startOf('month').toDate(),
    toDate: dayjs().endOf('month').toDate(),
})

const getUrgency = (daysLeft: number): DueRow['urgency'] => {
    if (daysLeft < 0) return 'Overdue'
    if (daysLeft === 0) return 'Due Today'
    if (daysLeft <= 7) return 'Due Soon'
    return 'Upcoming'
}

const urgencyLabel = (r: Pick<DueRow, 'urgency' | 'daysLeft'>) =>
    r.urgency === 'Overdue'
        ? `Overdue ${Math.abs(r.daysLeft)}d`
        : r.urgency === 'Due Today'
            ? 'Due Today'
            : `${r.daysLeft}d left`

const urgencyBadgeClass: Record<DueRow['urgency'], string> = {
    Overdue: 'bg-red-100 text-red-700 border border-red-300',
    'Due Today': 'bg-amber-100 text-amber-800 border border-amber-300',
    'Due Soon': 'bg-yellow-50 text-yellow-700 border border-yellow-300',
    Upcoming: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
}

const urgencyPrintClass: Record<DueRow['urgency'], string> = {
    Overdue: 'loss',
    'Due Today': 'amber',
    'Due Soon': 'amber',
    Upcoming: 'emerald',
}

const StatTile = ({
    label,
    value,
    tone,
}: {
    label: string
    value: string
    tone: 'blue' | 'slate' | 'red' | 'amber'
}) => {
    const toneMap: Record<string, string> = {
        blue: 'from-[#1e3a5f] to-[#2d5a8f] text-white',
        slate: 'bg-white border border-gray-200 text-gray-900',
        red: 'bg-red-50 border border-red-300 text-red-700',
        amber: 'bg-amber-50 border border-amber-300 text-amber-800',
    }
    const isGradient = tone === 'blue'
    return (
        <div
            className={`rounded-lg px-4 py-3 shadow-sm ${isGradient ? `bg-linear-to-r ${toneMap[tone]}` : toneMap[tone]
                }`}
        >
            <div className={`text-[11px] font-medium ${isGradient ? 'text-white/80' : 'text-gray-500'}`}>
                {label}
            </div>
            <div className="text-lg font-bold mt-0.5">{value}</div>
        </div>
    )
}

type QuickRange = 'all' | 'overdue' | 'today' | 'next7' | 'next30' | 'month'

export default function UpcomingDueDates() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const canView = hasPermission(user, 'view_groups')
    const canManage = hasPermission(user, 'group_ticketing_action_buttons')

    const [groups, setGroups] = useState<GroupTicketingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState<Filters>({ groupType: '', ...getDefaultDateRange() })
    const [quickRange, setQuickRange] = useState<QuickRange>('month')
    const [hideSettled, setHideSettled] = useState(true)
    const [hideClosed, setHideClosed] = useState(true)

    useEffect(() => {
        if (!canView) {
            setLoading(false)
            return
        }
        fetchGroups()
    }, [canView])

    const fetchGroups = async () => {
        try {
            setLoading(true)
            setError('')
            const token = localStorage.getItem('admin_token')
            const response = await axiosInstance.get('/group-ticketing', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (response.data.success) {
                setGroups(response.data.data || [])
            }
        } catch (err) {
            console.error('Error fetching group ticketing due dates:', err)
            setError('Failed to load the report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    // Only groups that actually have a Final Payment due date belong in this report.
    const dueRows = useMemo<DueRow[]>(() => {
        const today = dayjs().startOf('day')
        return groups
            .filter((g) => !!g.finalPayment?.dueDate)
            .map((g) => {
                const dueDate = g.finalPayment!.dueDate as string
                const daysLeft = dayjs(dueDate).startOf('day').diff(today, 'day')
                const supplierName =
                    g.finalPayment?.supplierAccount?.name ||
                    g.advancePayment?.supplierAccount?.name ||
                    g.user?.name ||
                    'N/A'
                return {
                    id: g._id,
                    groupNo: g.groupNo || 'N/A',
                    groupName: g.groupName || 'N/A',
                    sector: g.sector || 'N/A',
                    airline: g.airline || 'N/A',
                    groupType: g.groupType || 'N/A',
                    internalStatus: g.internalStatus || 'Draft',
                    supplierName,
                    dueDate,
                    totalPayment: g.finalPayment?.totalPayment || 0,
                    remainingAmount: g.finalPayment?.remainingAmount || 0,
                    remainingPercent: g.finalPayment?.remainingPercent || 0,
                    advancePaidAmount: g.advancePayment?.paidAmount || 0,
                    advancePaidPercent: g.advancePayment?.paidPercent || 0,
                    daysLeft,
                    urgency: getUrgency(daysLeft),
                }
            })
            .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    }, [groups])

    const uniqueGroupTypes = useMemo(
        () => [...new Set(dueRows.map((r) => r.groupType).filter(Boolean))].sort(),
        [dueRows],
    )

    const filteredRows = useMemo(() => {
        return dueRows.filter((r) => {
            if (hideSettled && r.remainingAmount <= 0) return false
            if (hideClosed && r.internalStatus === 'Closed') return false
            if (filters.groupType && r.groupType !== filters.groupType) return false
            if (filters.fromDate && dayjs(r.dueDate).isBefore(dayjs(filters.fromDate), 'day')) return false
            if (filters.toDate && dayjs(r.dueDate).isAfter(dayjs(filters.toDate), 'day')) return false

            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase()
                const haystack = [r.groupNo, r.groupName, r.sector, r.airline, r.supplierName]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!haystack.includes(q)) return false
            }
            return true
        })
    }, [dueRows, filters, searchQuery, hideSettled, hideClosed])

    const summary = useMemo(
        () =>
            filteredRows.reduce(
                (acc, r) => {
                    acc.total += 1
                    acc.remainingAmount += r.remainingAmount || 0
                    if (r.urgency === 'Overdue') acc.overdue += 1
                    if (r.daysLeft >= 0 && r.daysLeft <= 7) acc.dueSoon += 1
                    return acc
                },
                { total: 0, overdue: 0, dueSoon: 0, remainingAmount: 0 },
            ),
        [filteredRows],
    )

    const applyQuickRange = (range: QuickRange) => {
        setQuickRange(range)
        const today = dayjs().startOf('day')
        switch (range) {
            case 'all':
                setFilters((prev) => ({ ...prev, fromDate: null, toDate: null }))
                break
            case 'overdue':
                setFilters((prev) => ({ ...prev, fromDate: null, toDate: today.subtract(1, 'day').toDate() }))
                break
            case 'today':
                setFilters((prev) => ({ ...prev, fromDate: today.toDate(), toDate: today.toDate() }))
                break
            case 'next7':
                setFilters((prev) => ({ ...prev, fromDate: today.toDate(), toDate: today.add(7, 'day').toDate() }))
                break
            case 'next30':
                setFilters((prev) => ({ ...prev, fromDate: today.toDate(), toDate: today.add(30, 'day').toDate() }))
                break
            case 'month':
                setFilters((prev) => ({
                    ...prev,
                    fromDate: today.startOf('month').toDate(),
                    toDate: today.endOf('month').toDate(),
                }))
                break
        }
    }

    const handleDateChange = (key: 'fromDate' | 'toDate', value: Date | null) => {
        setQuickRange('all')
        setFilters((prev) => ({ ...prev, [key]: value }))
    }

    const resetFilters = () => {
        setSearchQuery('')
        setFilters({ groupType: '', ...getDefaultDateRange() })
        setQuickRange('month')
        setHideSettled(true)
        setHideClosed(true)
    }

    const quickRangeOptions: { key: QuickRange; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'overdue', label: 'Overdue' },
        { key: 'today', label: 'Due Today' },
        { key: 'next7', label: 'Next 7 Days' },
        { key: 'next30', label: 'Next 30 Days' },
        { key: 'month', label: 'This Month' },
    ]

    const printDateRangeLabel = useMemo(() => {
        if (filters.fromDate && filters.toDate) {
            return `${fmtPrintDate(filters.fromDate)}  to  ${fmtPrintDate(filters.toDate)}`
        }
        if (filters.fromDate) return `From ${fmtPrintDate(filters.fromDate)}`
        if (filters.toDate) return `Up to ${fmtPrintDate(filters.toDate)}`
        return 'All Dates'
    }, [filters.fromDate, filters.toDate])

    const printFilterChips = useMemo(() => {
        const chips: string[] = []
        if (filters.groupType) chips.push(`Group Type: ${filters.groupType}`)
        if (hideSettled) chips.push('Excludes settled')
        if (hideClosed) chips.push('Excludes closed groups')
        if (searchQuery.trim()) chips.push(`Search: "${searchQuery.trim()}"`)
        return chips
    }, [filters.groupType, hideSettled, hideClosed, searchQuery])

    if (!canView) {
        return (
            <>
                <PageMeta title="Upcoming Due Dates - Access denied" description="Access denied" />
                <PageBreadCrumb pageTitle="Upcoming Due Dates" />
                <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-200">
                    You do not have permission to view this report.
                </div>
            </>
        )
    }

    return (
        <div className="w-full min-h-screen mx-auto">
            <PageMeta title="Upcoming Due Dates" description="Group Ticketing final payment due date report" />

            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                    nav, aside, header, footer, .no-print, .print-hide,
                    .udd-screen-content, [class*="sidebar"], [class*="breadcrumb"] {
                        display: none !important;
                    }
                    body {
                        margin: 0 !important; padding: 0 !important; background: #fff !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    }
                    .udd-print-only { display: block !important; }
                    .udd-print-page {
                        display: block !important; width: 100% !important; color: #111827 !important;
                        font-family: Arial, Helvetica, sans-serif !important; font-size: 7.6pt !important;
                    }
                    .udd-print-topline { text-align: right !important; color: #555 !important; font-size: 7.5pt !important; margin-bottom: 8px !important; }
                    .udd-print-company { display: flex !important; align-items: flex-start !important; justify-content: space-between !important; gap: 16px !important; margin-bottom: 10px !important; }
                    .udd-print-brand { display: flex !important; align-items: center !important; gap: 10px !important; min-width: 0 !important; }
                    .udd-print-logo { width: 120px !important; height: auto !important; object-fit: contain !important; }
                    .udd-print-company-text { line-height: 1.3 !important; color: #111827 !important; }
                    .udd-print-company-text strong { display: block !important; font-size: 11pt !important; margin-bottom: 1px !important; }
                    .udd-print-titlebar {
                        display: flex !important; justify-content: space-between !important; align-items: center !important;
                        background: #1e3a5f !important; border: 1px solid #111827 !important; color: #fff !important;
                        font-weight: 700 !important; padding: 6px 10px !important; margin-bottom: 6px !important; font-size: 10pt !important;
                    }
                    .udd-print-meta {
                        display: flex !important; flex-wrap: wrap !important; justify-content: space-between !important;
                        gap: 6px 18px !important; font-size: 7.8pt !important; color: #374151 !important; margin-bottom: 8px !important;
                    }
                    .udd-print-meta .udd-print-chips { display: flex !important; flex-wrap: wrap !important; gap: 4px 10px !important; }
                    .udd-print-summary {
                        display: flex !important; gap: 8px !important; margin-bottom: 8px !important;
                    }
                    .udd-print-summary-item {
                        flex: 1 1 0 !important; border: 1px solid #cbd5e1 !important; border-radius: 3px !important;
                        padding: 4px 8px !important; text-align: center !important;
                    }
                    .udd-print-summary-item .label { display: block !important; font-size: 6.8pt !important; color: #6b7280 !important; text-transform: uppercase !important; letter-spacing: 0.02em !important; }
                    .udd-print-summary-item .value { display: block !important; font-size: 9.5pt !important; font-weight: 700 !important; color: #111827 !important; margin-top: 1px !important; }
                    .udd-print-summary-item.loss .value { color: #b91c1c !important; }
                    .udd-print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; font-size: 7.4pt !important; }
                    .udd-print-table thead { display: table-header-group !important; }
                    .udd-print-table th {
                        background: #1e3a5f !important; color: #fff !important; border: 1px solid #111827 !important;
                        padding: 4px 4px !important; font-weight: 700 !important; text-align: left !important;
                    }
                    .udd-print-table th.center, .udd-print-table td.center { text-align: center !important; }
                    .udd-print-table td {
                        border: 1px solid #b6b6b6 !important; color: #1f2937 !important; padding: 3px 4px !important;
                        vertical-align: top !important; line-height: 1.25 !important; word-break: break-word !important;
                    }
                    .udd-print-table tbody tr:nth-child(even) td { background: #f8fafc !important; }
                    .udd-print-table .muted { color: #6b7280 !important; }
                    .udd-print-table .strong { font-weight: 700 !important; color: #111827 !important; }
                    .udd-print-table .amber { color: #b45309 !important; }
                    .udd-print-table .emerald { color: #047857 !important; }
                    .udd-print-table .loss { color: #b91c1c !important; }
                    .udd-print-table tfoot td { background: #e5e7eb !important; font-weight: 700 !important; border: 1px solid #111827 !important; }
                    .udd-print-footer { margin-top: 6px !important; font-size: 7pt !important; color: #6b7280 !important; text-align: right !important; }
                }
            `}</style>

            {/* Print-only report — dedicated landscape template, independent of the on-screen table */}
            <div className="udd-print-only" style={{ display: 'none' }}>
                <div className="udd-print-page">
                    <div className="udd-print-topline">Printed: {fmtPrintDate(new Date())}</div>

                    <div className="udd-print-company">
                        <div className="udd-print-brand">
                            <img src={logo} alt="Company logo" className="udd-print-logo" />
                            <div className="udd-print-company-text">
                                <strong>Abid Air Travel &amp; Tours</strong>
                                <div>Email: abid_intl@msn.com &nbsp;|&nbsp; Phone: +92 319 7298467</div>
                            </div>
                        </div>
                    </div>

                    <div className="udd-print-titlebar">
                        <span>Upcoming Due Dates — Group Ticketing Final Payments</span>
                        <span>{printDateRangeLabel}</span>
                    </div>

                    <div className="udd-print-meta">
                        <div className="udd-print-chips">
                            {printFilterChips.length > 0 ? (
                                printFilterChips.map((c) => <span key={c}>{c}</span>)
                            ) : (
                                <span>All Group Types</span>
                            )}
                        </div>
                        <div>{filteredRows.length} group{filteredRows.length !== 1 ? 's' : ''}</div>
                    </div>

                    <div className="udd-print-summary">
                        <div className="udd-print-summary-item">
                            <span className="label">Groups with Due Amount</span>
                            <span className="value">{summary.total.toLocaleString()}</span>
                        </div>
                        <div className="udd-print-summary-item loss">
                            <span className="label">Overdue</span>
                            <span className="value">{summary.overdue.toLocaleString()}</span>
                        </div>
                        <div className="udd-print-summary-item">
                            <span className="label">Due within 7 Days</span>
                            <span className="value">{summary.dueSoon.toLocaleString()}</span>
                        </div>
                        <div className="udd-print-summary-item">
                            <span className="label">Total Remaining Amount</span>
                            <span className="value">PKR {fmtMoney(summary.remainingAmount)}</span>
                        </div>
                    </div>

                    <table className="udd-print-table">
                        <colgroup>
                            <col style={{ width: '2%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '13%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '9%' }} />
                            <col style={{ width: '7%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="center">#</th>
                                <th>Group</th>
                                <th>Sector / Airline</th>
                                <th>Supplier</th>
                                <th>Due Date</th>
                                <th className="center">Status</th>
                                <th className="center">Advance Paid</th>
                                <th className="center">Remaining</th>
                                <th className="center">Total Payment</th>
                                <th className="center">Group Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="center muted" style={{ padding: '14px 4px' }}>
                                        No upcoming due dates found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r, idx) => (
                                    <tr key={r.id}>
                                        <td className="center">{idx + 1}</td>

                                        <td>
                                            <div className="strong">{r.groupName}</div>
                                            <div className="muted">Flight No: {r.groupNo}</div>
                                            <div className="muted">{r.groupType}</div>
                                        </td>

                                        <td>
                                            <div className="strong">{r.sector}</div>
                                            <div className="muted">{r.airline}</div>
                                        </td>

                                        <td>{r.supplierName}</td>

                                        <td className="strong">{fmtDate(r.dueDate)}</td>

                                        <td className={`center strong ${urgencyPrintClass[r.urgency]}`}>
                                            {urgencyLabel(r)}
                                        </td>

                                        <td className="center">
                                            <div>{fmtMoney(r.advancePaidAmount)}</div>
                                            <div className="muted">{r.advancePaidPercent}%</div>
                                        </td>

                                        <td className="center loss strong">
                                            {fmtMoney(r.remainingAmount)}
                                            <div className="muted">{r.remainingPercent}%</div>
                                        </td>

                                        <td className="center strong">{fmtMoney(r.totalPayment)}</td>

                                        <td className="center">{r.internalStatus}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        {filteredRows.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'right' }}>
                                        TOTALS ({filteredRows.length} group{filteredRows.length !== 1 ? 's' : ''})
                                    </td>
                                    <td className="center loss">{fmtMoney(summary.remainingAmount)}</td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    <div className="udd-print-footer">Abid Air Travel &amp; Tours — Upcoming Due Dates report generated from the admin portal</div>
                </div>
            </div>

            {/* Screen layout */}
            <div className="udd-screen-content">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">Upcoming Due Dates</h1>
                        <p className="text-gray-600 text-sm">
                            Group Ticketing — Final Payment due dates, filterable by date range
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => window.print()}
                            disabled={filteredRows.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer size={14} /> Print
                        </button>
                    </div>
                </div>

                {/* Summary Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 print:hidden">
                    <StatTile label="Groups with Due Amount" value={summary.total.toLocaleString()} tone="blue" />
                    <StatTile label="Overdue" value={summary.overdue.toLocaleString()} tone="red" />
                    <StatTile label="Due within 7 Days" value={summary.dueSoon.toLocaleString()} tone="amber" />
                    <StatTile label="Total Remaining Amount" value={`PKR ${fmtMoney(summary.remainingAmount)}`} tone="slate" />
                </div>

                {/* Filters */}
                <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4 print:hidden">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        {quickRangeOptions.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => applyQuickRange(opt.key)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${quickRange === opt.key
                                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-50">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by group no, name, sector, airline, supplier..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="w-full sm:w-auto min-w-37.5">
                            <select
                                value={filters.groupType}
                                onChange={(e) => setFilters((prev) => ({ ...prev, groupType: e.target.value }))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Group Types</option>
                                {(uniqueGroupTypes.length ? uniqueGroupTypes : GROUP_TYPE_OPTIONS).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full sm:w-auto min-w-30">
                            <MaskedDatePicker
                                value={filters.fromDate}
                                onChange={(date) => handleDateChange('fromDate', date)}
                                placeholderText="From Date"
                            />
                        </div>
                        <div className="w-full sm:w-auto min-w-30">
                            <MaskedDatePicker
                                value={filters.toDate}
                                onChange={(date) => handleDateChange('toDate', date)}
                                placeholderText="To Date"
                            />
                        </div>

                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={hideSettled}
                                onChange={(e) => setHideSettled(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Hide settled
                        </label>
                        <label className="flex items-center gap-1.5 text-xs font-medium text-gray-600 whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={hideClosed}
                                onChange={(e) => setHideClosed(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            Hide closed groups
                        </label>

                        <button
                            onClick={resetFilters}
                            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 font-medium border border-red-300 rounded-md hover:bg-red-50 transition-colors"
                        >
                            Reset
                        </button>
                    </div>
                </div>

                {/* Report Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden relative">
                    {loading && (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="px-5 py-8 text-center text-sm text-red-600">{error}</div>
                    )}

                    {!loading && !error && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-xs">
                                <thead className="bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] sticky top-0 z-10">
                                    <tr>
                                        <th className="px-2 py-2.5 text-center text-[11px] font-semibold text-white w-8">#</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Group</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Sector / Airline</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Supplier</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Due Date</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Status</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Advance Paid</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Remaining</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Total Payment</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Group Status</th>
                                        {canManage && (
                                            <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Action</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={canManage ? 11 : 10} className="px-4 py-10 text-center text-gray-500 text-sm">
                                                No upcoming due dates found for the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((r, idx) => (
                                            <tr key={r.id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors align-top">
                                                <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>

                                                <td className="px-3 py-2 border-r border-gray-200 min-w-32">
                                                    <div className="font-semibold text-gray-900">{r.groupName}</div>
                                                    <div className="text-gray-600">Flight No: {r.groupNo}</div>
                                                    <div className="text-gray-400 text-[10px]">{r.groupType}</div>
                                                </td>

                                                <td className="px-3 py-2 border-r border-gray-200 min-w-28">
                                                    <div className="font-semibold text-gray-800">{r.sector}</div>
                                                    <div className="text-gray-600">{r.airline}</div>
                                                </td>

                                                <td className="px-3 py-2 border-r border-gray-200 min-w-28 text-gray-700">
                                                    {r.supplierName}
                                                </td>

                                                <td className="px-3 py-2 border-r border-gray-200 min-w-24 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-900">{fmtDate(r.dueDate)}</div>
                                                </td>

                                                <td className="px-3 py-2 text-center border-r border-gray-200 min-w-24">
                                                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${urgencyBadgeClass[r.urgency]}`}>
                                                        {urgencyLabel(r)}
                                                    </span>
                                                </td>

                                                <td className="px-3 py-2 text-center border-r border-gray-200 whitespace-nowrap">
                                                    <div className="font-semibold text-gray-800">{fmtMoney(r.advancePaidAmount)}</div>
                                                    <div className="text-gray-400 text-[10px]">{r.advancePaidPercent}%</div>
                                                </td>

                                                <td className="px-3 py-2 text-center border-r border-gray-200 whitespace-nowrap">
                                                    <div className="font-semibold text-red-600">{fmtMoney(r.remainingAmount)}</div>
                                                    <div className="text-gray-400 text-[10px]">{r.remainingPercent}%</div>
                                                </td>

                                                <td className="px-3 py-2 text-center border-r border-gray-200 font-semibold text-gray-800 whitespace-nowrap">
                                                    {fmtMoney(r.totalPayment)}
                                                </td>

                                                <td className="px-3 py-2 text-center border-r border-gray-200 whitespace-nowrap">
                                                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300">
                                                        {r.internalStatus}
                                                    </span>
                                                </td>

                                                {canManage && (
                                                    <td className="px-3 py-2 text-center">
                                                        <button
                                                            onClick={() => navigate(`/group-ticketing/edit/${r.id}`)}
                                                            title="Edit group"
                                                            className="inline-flex items-center justify-center p-1.5 rounded text-blue-600 hover:bg-blue-50"
                                                        >
                                                            <Pencil size={14} />
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                                {filteredRows.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                                            <td colSpan={7} className="px-3 py-2.5 text-right border-r border-gray-200">
                                                TOTALS ({filteredRows.length} group{filteredRows.length !== 1 ? 's' : ''})
                                            </td>
                                            <td className="px-3 py-2.5 text-center border-r border-gray-200 text-red-600 whitespace-nowrap">
                                                {fmtMoney(summary.remainingAmount)}
                                            </td>
                                            <td className="px-3 py-2.5 border-r border-gray-200"></td>
                                            <td className="px-3 py-2.5 border-r border-gray-200"></td>
                                            {canManage && <td className="px-3 py-2.5"></td>}
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
