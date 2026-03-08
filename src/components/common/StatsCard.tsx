import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
    label: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isUp: boolean;
    };
    color?: 'primary' | 'secondary' | 'accent' | 'success';
}

const StatsCard = ({ label, value, icon: Icon, trend, color = 'primary' }: StatsCardProps) => {
    const colors = {
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary',
        accent: 'bg-amber-100 text-amber-600',
        success: 'bg-emerald-100 text-emerald-600',
    };

    return (
        <motion.div
            whileHover={{ y: -4 }}
            className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300"
        >
            <div className="flex items-center justify-between mb-4">
                <div className={clsx("p-3 rounded-xl", colors[color])}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={clsx(
                        "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full",
                        trend.isUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                        {trend.isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {trend.value}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                <h3 className="text-3xl font-extrabold text-gray-900 mt-1 tabular-nums">{value}</h3>
            </div>
        </motion.div>
    );
};

export default StatsCard;
