'use client';

import { useRouter } from 'next/navigation';

interface TopBarProps {
    appName?: string;
    userEmail?: string;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function TopBar({
    appName = 'OpenAssess',
    userEmail,
    isMobile = false,
    isTablet = false,
}: TopBarProps) {
    const router = useRouter();

    const handleLogout = () => {
        localStorage.removeItem('authToken');
        router.push('/auth');
    };

    return (
        <div className="bg-gradient-to-r from-brand-primary to-brand-primary-700 border-b border-brand-primary-800 px-6 py-4 shadow-md font-raleway">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <h1 className={`font-bold text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
                        {appName}
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    {userEmail && (
                        <span className={`text-brand-primary-100 font-medium ${isMobile ? 'text-xs' : 'text-sm'} ${isMobile ? 'hidden' : ''}`}>
                            {userEmail}
                        </span>
                    )}
                    <button
                        onClick={handleLogout}
                        className={`bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-150 font-semibold ${isMobile ? 'text-xs' : 'text-sm'}`}
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
}
