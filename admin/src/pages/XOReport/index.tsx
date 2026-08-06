import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import axiosInstance from '../../Api/axios'
import MaskedDatePicker from '../../components/maskedDatePicker'
import { useAuth } from '../../context/AuthContext'
import { hasPermission } from '../../utils/permissions'
import logo from '../../assets/images/logo.png'
import { Printer } from 'lucide-react'

interface Flight {
    flightNo?: string
    flightDate?: string
    depDate?: string
    depTime?: string
    origin?: string
    destination?: string
    arrDate?: string
    arrTime?: string
}

interface Passenger {
    type: 'Adult' | 'Child' | 'Infant'
    title: string
    givenName: string
    surName: string
    passport?: string
    discount?: number
}

interface XORow {
    _id: string
    bookingReference: string
    pnr?: string
    ticketNumber?: string
    supplierName: string
    groupName?: string
    groupCategory?: string
    agencyName: string
    contactPersonName?: string
    airline?: { name: string }
    sector: string
    flights: Flight[]
    departureDate: string
    arrivalDate?: string
    passengers: Passenger[]
    adultsCount: number
    childrenCount: number
    infantsCount: number
    totalPassengers: number
    buying: { adult: number; child: number; infant: number; currency: string }
    selling: { adult: number; child: number; infant: number; currency: string }
    totalBuying: number
    totalSelling: number
    totalDiscount: number
    netSelling: number
    profit: number
    createdAt: string
}

interface Filters {
    sector: string
    airline: string
    supplier: string
    fromDate: Date | null
    toDate: Date | null
}

const fmtMoney = (n: number) => `${Math.round(n || 0).toLocaleString()}`
const fmtDate = (d?: string) => (d ? dayjs(d).format('DD MMM YYYY') : 'N/A')
const fmtPrintDate = (d?: Date | string | null) => (d ? dayjs(d).format('ddd, DD MMM YYYY') : '')

// Defaults the report to the current calendar month (1st → last day)
const getDefaultDateRange = (): { fromDate: Date; toDate: Date } => ({
    fromDate: dayjs().startOf('month').toDate(),
    toDate: dayjs().endOf('month').toDate(),
})

const PaxPriceCell = ({
    adult,
    child,
    infant,
    childrenCount,
    infantsCount,
}: {
    adult: number
    child: number
    infant: number
    childrenCount: number
    infantsCount: number
}) => (
    <div className="flex flex-col gap-0.5 text-[11px] leading-tight whitespace-nowrap">
        <div>
            <span className="text-gray-400">A:</span>{' '}
            <span className="font-semibold text-gray-800">{fmtMoney(adult)}</span>
        </div>
        {childrenCount > 0 && (
            <div>
                <span className="text-gray-400">C:</span>{' '}
                <span className="font-semibold text-gray-800">{fmtMoney(child)}</span>
            </div>
        )}
        {infantsCount > 0 && (
            <div>
                <span className="text-gray-400">I:</span>{' '}
                <span className="font-semibold text-gray-800">{fmtMoney(infant)}</span>
            </div>
        )}
    </div>
)

const StatTile = ({
    label,
    value,
    tone,
}: {
    label: string
    value: string
    tone: 'blue' | 'slate' | 'amber' | 'emerald' | 'profit' | 'loss'
}) => {
    const toneMap: Record<string, string> = {
        blue: 'from-[#1e3a5f] to-[#2d5a8f] text-white',
        slate: 'bg-white border border-gray-200 text-gray-900',
        amber: 'bg-white border border-amber-200 text-gray-900',
        emerald: 'bg-white border border-emerald-200 text-gray-900',
        profit: 'bg-emerald-50 border border-emerald-300 text-emerald-700',
        loss: 'bg-red-50 border border-red-300 text-red-700',
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

export default function XOReport() {
    const { user } = useAuth()
    const canView = hasPermission(user, 'view_bookings')

    const [rows, setRows] = useState<XORow[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [filters, setFilters] = useState<Filters>({
        sector: '',
        airline: '',
        supplier: '',
        ...getDefaultDateRange(),
    })

    useEffect(() => {
        if (!canView) {
            setLoading(false)
            return
        }
        fetchReport()
    }, [canView])

    const fetchReport = async () => {
        try {
            setLoading(true)
            setError('')
            const response = await axiosInstance.get('/bookings/reports/xo')
            if (response.data.success) {
                setRows(response.data.data || [])
            }
        } catch (err) {
            console.error('Error fetching XO report:', err)
            setError('Failed to load the XO report. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    const uniqueSectors = useMemo(
        () => [...new Set(rows.map((r) => r.sector).filter(Boolean))].sort(),
        [rows],
    )
    const uniqueAirlines = useMemo(
        () => [...new Set(rows.map((r) => r.airline?.name).filter((n): n is string => Boolean(n)))].sort(),
        [rows],
    )
    const uniqueSuppliers = useMemo(
        () => [...new Set(rows.map((r) => r.supplierName).filter(Boolean))].sort(),
        [rows],
    )

    const filteredRows = useMemo(() => {
        return rows.filter((r) => {
            if (filters.sector && r.sector !== filters.sector) return false
            if (filters.airline && r.airline?.name !== filters.airline) return false
            if (filters.supplier && r.supplierName !== filters.supplier) return false
            if (filters.fromDate && dayjs(r.createdAt).isBefore(dayjs(filters.fromDate), 'day')) return false
            if (filters.toDate && dayjs(r.createdAt).isAfter(dayjs(filters.toDate), 'day')) return false

            if (searchQuery.trim()) {
                const q = searchQuery.trim().toLowerCase()
                const haystack = [
                    r.bookingReference,
                    r.pnr,
                    r.ticketNumber,
                    r.supplierName,
                    r.agencyName,
                    r.sector,
                    r.airline?.name,
                    ...r.passengers.map((p) => `${p.givenName} ${p.surName}`),
                ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                if (!haystack.includes(q)) return false
            }
            return true
        })
    }, [rows, filters, searchQuery])

    const summary = useMemo(
        () =>
            filteredRows.reduce(
                (acc, r) => {
                    acc.totalBookings += 1
                    acc.totalPassengers += r.totalPassengers || 0
                    acc.totalBuying += r.totalBuying || 0
                    acc.totalSelling += r.netSelling || 0
                    acc.totalProfit += r.profit || 0
                    return acc
                },
                { totalBookings: 0, totalPassengers: 0, totalBuying: 0, totalSelling: 0, totalProfit: 0 },
            ),
        [filteredRows],
    )

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
        if (filters.sector) chips.push(`Sector: ${filters.sector}`)
        if (filters.airline) chips.push(`Airline: ${filters.airline}`)
        if (filters.supplier) chips.push(`Supplier: ${filters.supplier}`)
        if (searchQuery.trim()) chips.push(`Search: "${searchQuery.trim()}"`)
        return chips
    }, [filters.sector, filters.airline, filters.supplier, searchQuery])

    const handleFilterChange = <K extends keyof Filters>(name: K, value: Filters[K]) => {
        setFilters((prev) => ({ ...prev, [name]: value }))
    }

    const resetFilters = () => {
        setSearchQuery('')
        setFilters({ sector: '', airline: '', supplier: '', ...getDefaultDateRange() })
    }

    // const exportCSV = () => {
    //     const headers = [
    //         'Booking Ref', 'PNR', 'Ticket #', 'Supplier', 'Agency', 'Airline', 'Sector',
    //         'Travel Date', 'Adults', 'Children', 'Infants', 'Total Pax',
    //         'Buying/Adult', 'Buying/Child', 'Buying/Infant', 'Total Buying',
    //         'Selling/Adult', 'Selling/Child', 'Selling/Infant', 'Total Selling', 'Profit/Loss',
    //     ]
    //     const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    //     const lines = [headers.map(escape).join(',')]
    //     filteredRows.forEach((r) => {
    //         lines.push(
    //             [
    //                 r.bookingReference, r.pnr || '', r.ticketNumber || '', r.supplierName, r.agencyName,
    //                 r.airline?.name || '', r.sector, fmtDate(r.departureDate),
    //                 r.adultsCount, r.childrenCount, r.infantsCount, r.totalPassengers,
    //                 r.buying.adult, r.buying.child, r.buying.infant, r.totalBuying,
    //                 r.selling.adult, r.selling.child, r.selling.infant, r.netSelling, r.profit,
    //             ]
    //                 .map(escape)
    //                 .join(','),
    //         )
    //     })
    //     const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    //     const url = URL.createObjectURL(blob)
    //     const a = document.createElement('a')
    //     a.href = url
    //     a.download = `XO-Report-${dayjs().format('YYYY-MM-DD')}.csv`
    //     a.click()
    //     URL.revokeObjectURL(url)
    // }

    if (!canView) {
        return (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-sm text-red-700 shadow-sm">
                You do not have permission to view the XO Report.
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen mx-auto">
            <style>{`
                @media print {
                    @page { size: A4 landscape; margin: 8mm; }
                    nav, aside, header, footer, .no-print, .print-hide,
                    .xo-screen-content, [class*="sidebar"], [class*="breadcrumb"] {
                        display: none !important;
                    }
                    body {
                        margin: 0 !important; padding: 0 !important; background: #fff !important;
                        -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;
                    }
                    .xo-print-only { display: block !important; }
                    .xo-print-page {
                        display: block !important; width: 100% !important; color: #111827 !important;
                        font-family: Arial, Helvetica, sans-serif !important; font-size: 7.6pt !important;
                    }
                    .xo-print-topline { text-align: right !important; color: #555 !important; font-size: 7.5pt !important; margin-bottom: 8px !important; }
                    .xo-print-company { display: flex !important; align-items: flex-start !important; justify-content: space-between !important; gap: 16px !important; margin-bottom: 10px !important; }
                    .xo-print-brand { display: flex !important; align-items: center !important; gap: 10px !important; min-width: 0 !important; }
                    .xo-print-logo { width: 120px !important; height: auto !important; object-fit: contain !important; }
                    .xo-print-company-text { line-height: 1.3 !important; color: #111827 !important; }
                    .xo-print-company-text strong { display: block !important; font-size: 11pt !important; margin-bottom: 1px !important; }
                    .xo-print-titlebar {
                        display: flex !important; justify-content: space-between !important; align-items: center !important;
                        background: #1e3a5f !important; border: 1px solid #111827 !important; color: #fff !important;
                        font-weight: 700 !important; padding: 6px 10px !important; margin-bottom: 6px !important; font-size: 10pt !important;
                    }
                    .xo-print-meta {
                        display: flex !important; flex-wrap: wrap !important; justify-content: space-between !important;
                        gap: 6px 18px !important; font-size: 7.8pt !important; color: #374151 !important; margin-bottom: 8px !important;
                    }
                    .xo-print-meta .xo-print-chips { display: flex !important; flex-wrap: wrap !important; gap: 4px 10px !important; }
                    .xo-print-summary {
                        display: flex !important; gap: 8px !important; margin-bottom: 8px !important;
                    }
                    .xo-print-summary-item {
                        flex: 1 1 0 !important; border: 1px solid #cbd5e1 !important; border-radius: 3px !important;
                        padding: 4px 8px !important; text-align: center !important;
                    }
                    .xo-print-summary-item .label { display: block !important; font-size: 6.8pt !important; color: #6b7280 !important; text-transform: uppercase !important; letter-spacing: 0.02em !important; }
                    .xo-print-summary-item .value { display: block !important; font-size: 9.5pt !important; font-weight: 700 !important; color: #111827 !important; margin-top: 1px !important; }
                    .xo-print-summary-item.profit .value { color: #047857 !important; }
                    .xo-print-summary-item.loss .value { color: #b91c1c !important; }
                    .xo-print-table { width: 100% !important; border-collapse: collapse !important; table-layout: fixed !important; font-size: 7.4pt !important; }
                    .xo-print-table thead { display: table-header-group !important; }
                    .xo-print-table th {
                        background: #1e3a5f !important; color: #fff !important; border: 1px solid #111827 !important;
                        padding: 4px 4px !important; font-weight: 700 !important; text-align: left !important;
                    }
                    .xo-print-table th.center, .xo-print-table td.center { text-align: center !important; }
                    .xo-print-table td {
                        border: 1px solid #b6b6b6 !important; color: #1f2937 !important; padding: 3px 4px !important;
                        vertical-align: top !important; line-height: 1.25 !important; word-break: break-word !important;
                    }
                    .xo-print-table tbody tr:nth-child(even) td { background: #f8fafc !important; }
                    .xo-print-table .muted { color: #6b7280 !important; }
                    .xo-print-table .strong { font-weight: 700 !important; color: #111827 !important; }
                    .xo-print-table .flight-line { border-bottom: 1px dotted #d1d5db !important; padding-bottom: 2px !important; margin-bottom: 2px !important; }
                    .xo-print-table .flight-line:last-child { border-bottom: none !important; margin-bottom: 0 !important; padding-bottom: 0 !important; }
                    .xo-print-table .pax-badges span { display: inline-block !important; border: 1px solid #94a3b8 !important; border-radius: 2px !important; padding: 0 3px !important; margin: 0 2px 2px 0 !important; font-weight: 700 !important; }
                    .xo-print-table .amber { color: #b45309 !important; }
                    .xo-print-table .emerald { color: #047857 !important; }
                    .xo-print-table .loss { color: #b91c1c !important; }
                    .xo-print-table .discount { color: #b91c1c !important; font-size: 6.6pt !important; }
                    .xo-print-table tfoot td { background: #e5e7eb !important; font-weight: 700 !important; border: 1px solid #111827 !important; }
                    .xo-print-footer { margin-top: 6px !important; font-size: 7pt !important; color: #6b7280 !important; text-align: right !important; }
                }
            `}</style>

            {/* Print-only report — dedicated landscape template, independent of the on-screen table */}
            <div className="xo-print-only" style={{ display: 'none' }}>
                <div className="xo-print-page">
                    <div className="xo-print-topline">Printed: {fmtPrintDate(new Date())}</div>

                    <div className="xo-print-company">
                        <div className="xo-print-brand">
                            <img src={logo} alt="Company logo" className="xo-print-logo" />
                            <div className="xo-print-company-text">
                                <strong>Abid Air Travel &amp; Tours</strong>
                                <div>Email: abid_intl@msn.com &nbsp;|&nbsp; Phone: +92 319 7298467</div>
                            </div>
                        </div>
                    </div>

                    <div className="xo-print-titlebar">
                        <span>XO Report — Confirmed Group Ticket Bookings</span>
                        <span>{printDateRangeLabel}</span>
                    </div>

                    <div className="xo-print-meta">
                        <div className="xo-print-chips">
                            {printFilterChips.length > 0 ? (
                                printFilterChips.map((c) => <span key={c}>{c}</span>)
                            ) : (
                                <span>All Suppliers · All Sectors · All Airlines</span>
                            )}
                        </div>
                        <div>{filteredRows.length} booking{filteredRows.length !== 1 ? 's' : ''} · {summary.totalPassengers} passenger{summary.totalPassengers !== 1 ? 's' : ''}</div>
                    </div>

                    <div className="xo-print-summary">
                        <div className="xo-print-summary-item">
                            <span className="label">Bookings</span>
                            <span className="value">{summary.totalBookings.toLocaleString()}</span>
                        </div>
                        <div className="xo-print-summary-item">
                            <span className="label">Total Passengers</span>
                            <span className="value">{summary.totalPassengers.toLocaleString()}</span>
                        </div>
                        <div className="xo-print-summary-item">
                            <span className="label">Total Buying</span>
                            <span className="value">PKR {fmtMoney(summary.totalBuying)}</span>
                        </div>
                        <div className="xo-print-summary-item">
                            <span className="label">Total Selling</span>
                            <span className="value">PKR {fmtMoney(summary.totalSelling)}</span>
                        </div>
                        <div className={`xo-print-summary-item ${summary.totalProfit >= 0 ? 'profit' : 'loss'}`}>
                            <span className="label">{summary.totalProfit >= 0 ? 'Net Profit' : 'Net Loss'}</span>
                            <span className="value">PKR {fmtMoney(Math.abs(summary.totalProfit))}</span>
                        </div>
                    </div>

                    <table className="xo-print-table">
                        <colgroup>
                            <col style={{ width: '2%' }} />
                            <col style={{ width: '9%' }} />
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '16%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '7%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '7.5%' }} />
                            <col style={{ width: '7.5%' }} />
                            <col style={{ width: '7%' }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className="center">#</th>
                                <th>Booking</th>
                                <th>Airline / Sector</th>
                                <th className="center">Flights</th>
                                <th>Passengers</th>
                                <th>Agency</th>
                                <th>Supplier</th>
                                <th className="center">Buying / Pax</th>
                                <th className="center">Selling / Pax</th>
                                <th className="center">Total Buying</th>
                                <th className="center">Total Selling</th>
                                <th className="center">Profit / Loss</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.length === 0 ? (
                                <tr>
                                    <td colSpan={12} className="center muted" style={{ padding: '14px 4px' }}>
                                        No confirmed Group Ticket bookings found for the selected filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredRows.map((r, idx) => {
                                    const isLoss = r.profit < 0
                                    return (
                                        <tr key={r._id}>
                                            <td className="center">{idx + 1}</td>

                                            <td>
                                                <div className="strong">BK# {r.bookingReference}</div>
                                                <div className="muted">PNR: {r.pnr || 'N/A'}</div>
                                                <div className="muted">Tkt#: {r.ticketNumber || 'N/A'}</div>
                                                <div className="strong">{dayjs(r.createdAt).format('DD MMM YYYY')}</div>
                                            </td>

                                            <td>
                                                <div className="strong">{r.airline?.name || 'N/A'}</div>
                                                <div className="muted">{r.sector}</div>
                                            </td>

                                            <td>
                                                {r.flights.length === 0 ? (
                                                    <span className="muted">N/A</span>
                                                ) : (
                                                    r.flights.map((f, i) => (
                                                        <div key={i} className="flight-line">
                                                            <span className="strong">{f.flightNo || 'N/A'}</span>{' '}
                                                            {f.origin || '?'} → {f.destination || '?'}
                                                            <div className="muted">{fmtDate(f.depDate || f.flightDate)} {f.depTime || ''}</div>
                                                        </div>
                                                    ))
                                                )}
                                            </td>

                                            <td>
                                                <div className="pax-badges">
                                                    <span>A:{r.adultsCount}</span>
                                                    {r.childrenCount > 0 && <span>C:{r.childrenCount}</span>}
                                                    {r.infantsCount > 0 && <span>I:{r.infantsCount}</span>}
                                                </div>
                                                <div className="muted">
                                                    {r.passengers.map((p) => `${p.title} ${p.givenName} ${p.surName}`).join(', ')}
                                                </div>
                                            </td>

                                            <td>{r.agencyName}</td>

                                            <td>
                                                <div className="strong">{r.supplierName}</div>
                                            </td>

                                            <td className="center">
                                                <div>A: {fmtMoney(r.buying.adult)}</div>
                                                {r.childrenCount > 0 && <div>C: {fmtMoney(r.buying.child)}</div>}
                                                {r.infantsCount > 0 && <div>I: {fmtMoney(r.buying.infant)}</div>}
                                            </td>

                                            <td className="center">
                                                <div>A: {fmtMoney(r.selling.adult)}</div>
                                                {r.childrenCount > 0 && <div>C: {fmtMoney(r.selling.child)}</div>}
                                                {r.infantsCount > 0 && <div>I: {fmtMoney(r.selling.infant)}</div>}
                                            </td>

                                            <td className="center amber strong">{fmtMoney(r.totalBuying)}</td>

                                            <td className="center emerald strong">
                                                {fmtMoney(r.netSelling)}
                                                {r.totalDiscount > 0 && (
                                                    <div className="discount">-{fmtMoney(r.totalDiscount)} disc</div>
                                                )}
                                            </td>

                                            <td className={`center strong ${isLoss ? 'loss' : 'emerald'}`}>
                                                {isLoss ? '-' : ''}{fmtMoney(Math.abs(r.profit))}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                        {filteredRows.length > 0 && (
                            <tfoot>
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'right' }}>
                                        TOTALS ({filteredRows.length} booking{filteredRows.length !== 1 ? 's' : ''}, {summary.totalPassengers} pax)
                                    </td>
                                    <td colSpan={2}></td>
                                    <td className="center amber">{fmtMoney(summary.totalBuying)}</td>
                                    <td className="center emerald">{fmtMoney(summary.totalSelling)}</td>
                                    <td className={`center ${summary.totalProfit < 0 ? 'loss' : 'emerald'}`}>
                                        {summary.totalProfit < 0 ? '-' : ''}{fmtMoney(Math.abs(summary.totalProfit))}
                                    </td>
                                </tr>
                            </tfoot>
                        )}
                    </table>

                    <div className="xo-print-footer">Abid Air Travel &amp; Tours — XO Report generated from the admin portal</div>
                </div>
            </div>

            {/* Screen layout */}
            <div className="xo-screen-content">
                {/* Header */}
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 print:hidden">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-1">XO Report</h1>
                        <p className="text-gray-600 text-sm">
                            Confirmed Group Ticket bookings — supplier cost vs. selling price breakdown
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* <button
                        onClick={exportCSV}
                        disabled={filteredRows.length === 0}
                        className="px-4 py-2 text-sm font-medium text-white bg-linear-to-r from-[#1e3a5f] to-[#2d5a8f] rounded-md shadow-sm hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Export CSV
                    </button> */}
                        <button
                            onClick={() => window.print()}
                            disabled={filteredRows.length === 0}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Printer size={14} />  Print
                        </button>
                    </div>
                </div>

                {/* Summary Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-4 print:hidden">
                    <StatTile label="Bookings" value={summary.totalBookings.toLocaleString()} tone="blue" />
                    <StatTile label="Total Passengers" value={summary.totalPassengers.toLocaleString()} tone="slate" />
                    <StatTile label="Total Buying" value={`PKR ${fmtMoney(summary.totalBuying)}`} tone="amber" />
                    <StatTile label="Total Selling" value={`PKR ${fmtMoney(summary.totalSelling)}`} tone="emerald" />
                    <StatTile
                        label={summary.totalProfit >= 0 ? 'Net Profit' : 'Net Loss'}
                        value={`PKR ${fmtMoney(Math.abs(summary.totalProfit))}`}
                        tone={summary.totalProfit >= 0 ? 'profit' : 'loss'}
                    />
                </div>

                {/* Filters */}
                <div className="mb-4 bg-white rounded-lg shadow p-3 sm:p-4 print:hidden">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex-1 min-w-50">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by reference, PNR, ticket #, passenger, agency..."
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="w-full sm:w-auto min-w-37.5">
                            <select
                                value={filters.supplier}
                                onChange={(e) => handleFilterChange('supplier', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Suppliers</option>
                                {uniqueSuppliers.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full sm:w-auto min-w-37.5">
                            <select
                                value={filters.sector}
                                onChange={(e) => handleFilterChange('sector', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Sectors</option>
                                {uniqueSectors.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full sm:w-auto min-w-37.5">
                            <select
                                value={filters.airline}
                                onChange={(e) => handleFilterChange('airline', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">All Airlines</option>
                                {uniqueAirlines.map((a) => (
                                    <option key={a} value={a}>{a}</option>
                                ))}
                            </select>
                        </div>

                        <div className="w-full sm:w-auto min-w-30">
                            <MaskedDatePicker
                                value={filters.fromDate}
                                onChange={(date) => handleFilterChange('fromDate', date)}
                                placeholderText="From Date"
                            />
                        </div>
                        <div className="w-full sm:w-auto min-w-30">
                            <MaskedDatePicker
                                value={filters.toDate}
                                onChange={(date) => handleFilterChange('toDate', date)}
                                placeholderText="To Date"
                            />
                        </div>

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
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Booking</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Airline / Sector</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Flights</th>
                                        {/* <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Travel Date</th> */}
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Passengers</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Agency</th>
                                        <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-white">Supplier</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Buying / Pax</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Selling / Pax</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Total Buying</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Total Selling</th>
                                        <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-white">Profit / Loss</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={12} className="px-4 py-10 text-center text-gray-500 text-sm">
                                                No confirmed Group Ticket bookings found for the selected filters.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredRows.map((r, idx) => {
                                            const isLoss = r.profit < 0
                                            return (
                                                <tr key={r._id} className="border-b border-gray-200 hover:bg-blue-50/30 transition-colors align-top">
                                                    <td className="px-2 py-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>

                                                    {/* Booking */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-26">
                                                        <div className="font-semibold text-gray-900">BK# {r.bookingReference}</div>
                                                        <div className="text-gray-600">PNR: {r.pnr || 'N/A'}</div>
                                                        <div className="text-gray-600">Tkt#: {r.ticketNumber || 'N/A'}</div>
                                                        <div className="text-gray-800 font-bold text-[11px] mt-0.5">{dayjs(r.createdAt).format('DD MMM YYYY')}</div>
                                                    </td>

                                                    {/* Airline / Sector */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-28">
                                                        <div className="font-semibold text-gray-800">{r.airline?.name || 'N/A'}</div>
                                                        <div className="text-gray-600">{r.sector}</div>
                                                    </td>

                                                    {/* Flights */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-80">
                                                        {r.flights.length === 0 ? (
                                                            <span className="text-gray-400 text-[10px]">N/A</span>
                                                        ) : (
                                                            <div className="grid lg:grid-cols-2 gap-1">
                                                                {r.flights.map((f, i) => (
                                                                    <div key={i} className="rounded bg-gray-50 border border-gray-200 px-1.5 py-1 text-[10px] leading-tight">
                                                                        <div className="font-semibold text-gray-800">{f.flightNo || 'N/A'}</div>
                                                                        <div className="text-gray-600">{f.origin || '?'} → {f.destination || '?'}</div>
                                                                        <div className="text-gray-400">{fmtDate(f.depDate || f.flightDate)} {f.depTime || ''}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Travel Date */}
                                                    {/* <td className="px-3 py-2 border-r border-gray-200 min-w-24">
                                                    <div className="text-gray-800 font-medium">{fmtDate(r.departureDate)}</div>
                                                    {r.arrivalDate && (
                                                        <div className="text-gray-400 text-[10px]">Ret: {fmtDate(r.arrivalDate)}</div>
                                                    )}
                                                </td> */}

                                                    {/* Passengers */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-28">
                                                        <div className="flex gap-1 mb-1 flex-wrap">
                                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold border border-blue-200">
                                                                A:{r.adultsCount}
                                                            </span>
                                                            {r.childrenCount > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 text-[10px] font-semibold border border-purple-200">
                                                                    C:{r.childrenCount}
                                                                </span>
                                                            )}
                                                            {r.infantsCount > 0 && (
                                                                <span className="px-1.5 py-0.5 rounded bg-pink-50 text-pink-700 text-[10px] font-semibold border border-pink-200">
                                                                    I:{r.infantsCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="max-h-16 overflow-y-auto text-[10px] text-gray-600 leading-snug pr-1">
                                                            {r.passengers.map((p, i) => (
                                                                <div key={i}>
                                                                    {p.title} {p.givenName} {p.surName}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </td>

                                                    {/* Agency */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-28 text-gray-700">
                                                        {r.agencyName}
                                                    </td>

                                                    {/* Supplier */}
                                                    <td className="px-3 py-2 border-r border-gray-200 min-w-28">
                                                        <div className="font-semibold text-gray-800">{r.supplierName}</div>
                                                        {/* {r.groupName && <div className="text-gray-500 text-[10px]">{r.groupName}</div>} */}
                                                    </td>

                                                    {/* Buying / Pax */}
                                                    <td className="px-3 py-2 text-center border-r border-gray-200 min-w-24">
                                                        <PaxPriceCell
                                                            adult={r.buying.adult}
                                                            child={r.buying.child}
                                                            infant={r.buying.infant}
                                                            childrenCount={r.childrenCount}
                                                            infantsCount={r.infantsCount}
                                                        />
                                                    </td>

                                                    {/* Selling / Pax */}
                                                    <td className="px-3 py-2 text-center border-r border-gray-200 min-w-24">
                                                        <PaxPriceCell
                                                            adult={r.selling.adult}
                                                            child={r.selling.child}
                                                            infant={r.selling.infant}
                                                            childrenCount={r.childrenCount}
                                                            infantsCount={r.infantsCount}
                                                        />
                                                    </td>

                                                    {/* Total Buying */}
                                                    <td className="px-3 py-2 text-center border-r border-gray-200 font-semibold text-amber-700 whitespace-nowrap min-w-24">
                                                        {fmtMoney(r.totalBuying)}
                                                    </td>

                                                    {/* Total Selling */}
                                                    <td className="px-3 py-2 text-center border-r border-gray-200 font-semibold text-emerald-700 whitespace-nowrap min-w-24">
                                                        {fmtMoney(r.netSelling)}
                                                        {r.totalDiscount > 0 && (
                                                            <div className="text-[9px] text-red-500 font-normal">
                                                                -{fmtMoney(r.totalDiscount)} disc
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Profit / Loss */}
                                                    <td className={`px-3 py-2 text-center font-bold whitespace-nowrap min-w-24 ${isLoss ? 'text-red-600' : 'text-emerald-600'}`}>
                                                        {isLoss ? '-' : ''}{fmtMoney(Math.abs(r.profit))}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                                {filteredRows.length > 0 && (
                                    <tfoot>
                                        <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                                            <td colSpan={7} className="px-3 py-2.5 text-right border-r border-gray-200">
                                                TOTALS ({filteredRows.length} booking{filteredRows.length !== 1 ? 's' : ''}, {summary.totalPassengers} pax)
                                            </td>
                                            <td className="px-3 py-2.5 border-r border-gray-200"></td>
                                            <td className="px-3 py-2.5 border-r border-gray-200"></td>
                                            <td className="px-3 py-2.5 text-center border-r border-gray-200 text-amber-700 whitespace-nowrap">
                                                {fmtMoney(summary.totalBuying)}
                                            </td>
                                            <td className="px-3 py-2.5 text-center border-r border-gray-200 text-emerald-700 whitespace-nowrap">
                                                {fmtMoney(summary.totalSelling)}
                                            </td>
                                            <td className={`px-3 py-2.5 text-center whitespace-nowrap ${summary.totalProfit < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {summary.totalProfit < 0 ? '-' : ''}{fmtMoney(Math.abs(summary.totalProfit))}
                                            </td>
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
