import { NavLink } from 'react-router-dom';
import { clsx } from 'clsx';
import { motion } from 'framer-motion';
import { useTabNavigation } from '../../hooks/useTabNavigation';

const MobileTopTabs = () => {
    const { navItems } = useTabNavigation();

    if (navItems.length === 0) return null;

    return (
        <div className="md:hidden bg-white border-b border-slate-100/80">
            <nav className="flex items-center">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={['/admin', '/teacher', '/student'].includes(item.to)}
                        className={({ isActive }) => clsx(
                            "relative flex-1 text-center py-2.5 text-[12px] font-bold tracking-wide transition-colors duration-200",
                            isActive ? "text-amber-700" : "text-slate-400 active:text-slate-600"
                        )}
                    >
                        {({ isActive }) => (
                            <>
                                <span className="relative z-10">{item.label}</span>
                                {isActive && (
                                    <motion.div
                                        layoutId="top-tab-indicator"
                                        className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-amber-600 rounded-t-full"
                                        transition={{ type: "spring", stiffness: 400, damping: 35 }}
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
