import React, { useState, useEffect } from "react";
import { theme } from "../../theme/theme";
import {
  LayoutDashboard,
  ChevronRight,
  Calendar,
  Users,
  Clock,
  Ticket,
  Link2,
  ExternalLink,
  Activity,
  TrendingUp,
} from "lucide-react";

export default function TopBar({
  title,
  subtitle,
  showStatus = true,
  showStats = false,
  liveTickets = false,
}) {
  // Beautiful gradient with modern color palette
  const primaryGradient = `linear-gradient(145deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark || theme.colors.primary} 40%, ${theme.colors.primaryLight} 100%)`;

  return (
    <div>
      {/* Main TopBar */}
      <div
        className="relative overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 hover:shadow-3xl"
        style={{
          background: primaryGradient,
          marginBottom: theme.spacing.lg || "24px",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Background Decorations */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(180deg, rgba(255,255,255,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />

        <div
          className="absolute top-0 left-0 right-0 h-1/2 pointer-events-none rounded-t-2xl"
          style={{
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%)",
          }}
        />

        <div
          className="absolute pointer-events-none"
          style={{
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${theme.colors.accent || "#f97316"}20 0%, transparent 65%)`,
            top: -160,
            right: -120,
            filter: "blur(20px)",
          }}
        />

        <div
          className="absolute pointer-events-none"
          style={{
            width: 300,
            height: 300,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
            top: -100,
            left: -60,
            filter: "blur(30px)",
          }}
        />

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-between px-6 py-5 md:px-8 md:py-6">
          {/* Left Section */}
          <div className="flex items-center gap-5 min-w-0">
            <div className="flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg shrink-0 transition-all duration-300 hover:bg-white/20 hover:scale-105 hover:shadow-xl">
              <LayoutDashboard
                className="w-6 h-6 md:w-7 md:h-7 text-white"
                strokeWidth={1.8}
              />
            </div>

            <div className="flex flex-col min-w-0">
              <h1
                className="text-xl md:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight truncate"
                style={{
                  textShadow: "0 2px 20px rgba(0,0,0,0.15)",
                }}
              >
                {title}
              </h1>
              {subtitle && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-white/70 uppercase tracking-wider">
                    {subtitle}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-white/30" />
                  <span className="text-[10px] font-semibold text-white/50 uppercase tracking-[2px]">
                    Dashboard
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-3 md:gap-4 shrink-0">
            {/* Live Tickets Display */}
            {liveTickets && (
              <>
                {/* Link Button */}
                <a
                  href="https://agent.tfctours.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 text-white transition-all duration-300 hover:bg-white/30 hover:scale-105 hover:shadow-lg"
                >
                  <Link2 className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:inline">
                    Live Tickets
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </a>
              </>
            )}

            {showStatus && (
              <div className="flex items-center gap-2 px-3.5 py-1.5 md:px-4 md:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-lg transition-all duration-300 hover:bg-white/20 hover:scale-105">
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full bg-emerald-400/30 animate-ping"
                    style={{ animationDuration: "1.5s" }}
                  />
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50"
                    style={{
                      animation: "topbar-pulse 2s ease-in-out infinite",
                    }}
                  />
                </div>
                <span className="text-[10px] md:text-xs font-bold text-white uppercase tracking-[2px] md:tracking-[2.5px]">
                  Live
                </span>
                <span className="hidden md:inline-block w-px h-4 bg-white/20" />
                <span className="hidden md:inline-block text-[10px] font-medium text-white/70">
                  {new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}

            <div className="w-px h-8 bg-white/20" />
          </div>
        </div>

        {/* Bottom Glow Line */}
        <div className="relative h-0.5 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, 
                transparent 0%, 
                ${theme.colors.accent || "#f97316"}60 20%, 
                rgba(255,255,255,0.4) 50%, 
                ${theme.colors.accent || "#f97316"}60 80%, 
                transparent 100%
              )`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
              animation: "topbar-shimmer 3s ease-in-out infinite",
              transform: "translateX(-100%)",
            }}
          />
        </div>

        <style jsx>{`
          @keyframes topbar-pulse {
            0%,
            100% {
              opacity: 1;
              transform: scale(1);
            }
            50% {
              opacity: 0.5;
              transform: scale(0.8);
            }
          }

          @keyframes topbar-shimmer {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          .hover\\:shadow-3xl:hover {
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          }
        `}</style>
      </div>
    </div>
  );
}
