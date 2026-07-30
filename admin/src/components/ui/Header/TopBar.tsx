import { HomeIcon } from "@heroicons/react/24/outline";

interface TopBarProps {
    title: string;
    description: string;
}
export default function TopBar({ title, description }: TopBarProps) {
    return (
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-linear-to-r from-blue-600 via-blue-500 to-indigo-600 p-6 shadow-lg">
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/10" />
            <div className="absolute bottom-0 left-1/4 h-32 w-32 rounded-full bg-white/5" />

            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-white/80 mb-2">
                        <HomeIcon className="w-4 h-4" />
                        <span>/</span>
                        <span className="text-white font-medium">{title}</span>
                    </div>
                    <p className="text-white/80 mt-1 text-sm">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    )
}
