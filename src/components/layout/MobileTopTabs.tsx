import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useTabNavigation } from '../../hooks/useTabNavigation';

const MobileTopTabs = () => {
    const { navItems } = useTabNavigation();

    if (navItems.length === 0) return null;

    return (
        <div className="md:hidden bg-white/80 backdrop-blur-md sticky top-[calc(3.5rem + env(safe-area-inset-top, 0px))] z-50 border-b border-slate-100 overflow-x-auto custom-scrollbar">
            <nav className="flex items-center px-4 min-w-max">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={['/admin', '/teacher', '/student'].includes(item.to)}
                        className={({ isActive }) => clsx(
                            "relative px-4 py-3 text-sm font-bold transition-all duration-300",
                            isActive ? "text-slate-900" : "text-slate-400"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="top-tab-indicator"
                                        className="absolute bottom-0 left-2 right-2 h-1 bg-primary rounded-t-full shadow-[0_0_8px_rgba(217,119,6,0.2)]"
                                        transition={{ type: "spring", stiffness: 350, damping: 30 }}
                                    />
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

export default MobileTopTabs;
