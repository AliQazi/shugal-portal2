import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import axiosInstance from "../api/axios";
import { createUmrahVoucherHTML } from "../utils/umrahVoucherPrint";

// A4 at 96dpi. The voucher is laid out for paper, so it is shown at that width and
// scaled down to fit narrower screens (phones scanning the QR code).
const PAGE_WIDTH = 794;

// Public voucher page (no login): what the QR code on a printed voucher opens.
// The voucher is rendered by the same code that prints it, so the page and the
// printout are identical; "Print" prints exactly this document.
export default function PublicUmrahVoucher() {
  const { token } = useParams();
  const [result, setResult] = useState({ status: "loading", data: null });
  const [frameHeight, setFrameHeight] = useState(1123);
  const [scale, setScale] = useState(1);
  const frameRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get(`/umrah-bookings/public-voucher/${encodeURIComponent(token)}`)
      .then((res) => {
        if (!cancelled) setResult({ status: "ready", data: res.data?.data || null });
      })
      .catch((error) => {
        if (!cancelled) {
          setResult({ status: error.response?.status === 404 ? "missing" : "error", data: null });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setScale(Math.min(1, entry.contentRect.width / PAGE_WIDTH));
    });
    if (wrapRef.current) observer.observe(wrapRef.current);
    return () => observer.disconnect();
  }, []);

  const { data } = result;
  const html = useMemo(
    () =>
      data
        ? createUmrahVoucherHTML(
            {
              _id: token,
              bookingNumber: data.bookingNumber,
              overallStatus: data.overallStatus,
              user: data.user,
              // The QR printed on this page leads back here.
              voucherPublicUrl: window.location.href.split(/[?#]/)[0],
            },
            data.voucherData,
          )
        : "",
    [data, token],
  );

  const reference = data?.voucherData?.voucherNo || data?.bookingNumber || "";

  useEffect(() => {
    if (reference) document.title = `Umrah Voucher - ${reference}`;
  }, [reference]);

  const measure = () => {
    const doc = frameRef.current?.contentDocument;
    if (doc) setFrameHeight(Math.max(doc.documentElement.scrollHeight, 400));
  };

  const handlePrint = () => {
    const frameWindow = frameRef.current?.contentWindow;
    if (!frameWindow) return;
    frameWindow.focus();
    frameWindow.print();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-3 px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">Umrah Hotel Voucher</div>
            {reference && <div className="truncate text-xs text-slate-500">{reference}</div>}
          </div>
          {result.status === "ready" && (
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-emerald-600 px-3! py-1.5! text-xs! font-semibold text-white hover:bg-emerald-700"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          )}
        </div>
      </div>

      <div ref={wrapRef} className="mx-auto max-w-[860px] px-3 py-4">
        {result.status === "loading" && (
          <div className="py-24 text-center text-sm text-slate-500">Loading voucher...</div>
        )}

        {result.status === "missing" && (
          <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
            <div className="text-base font-semibold text-slate-800">Voucher not found</div>
            <p className="mt-1 text-sm text-slate-500">
              This voucher link is not valid. Please check the QR code or contact your agent.
            </p>
          </div>
        )}

        {result.status === "error" && (
          <div className="mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center">
            <div className="text-base font-semibold text-slate-800">Couldn&apos;t load the voucher</div>
            <p className="mt-1 text-sm text-slate-500">Please check your connection and try again.</p>
          </div>
        )}

        {result.status === "ready" && (
          <div
            className="mx-auto overflow-hidden bg-white shadow-md"
            style={{ width: PAGE_WIDTH * scale, height: frameHeight * scale }}
          >
            <iframe
              ref={frameRef}
              title="Umrah voucher"
              srcDoc={html}
              onLoad={measure}
              style={{
                width: PAGE_WIDTH,
                height: frameHeight,
                border: 0,
                background: "white",
                display: "block",
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
