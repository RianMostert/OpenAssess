import { Button } from '@components/ui/button';
import { GraduationCap, Users } from 'lucide-react';

interface StudentNavBarProps {
    activeView: 'student' | 'lecturer';
    onViewChange: (view: 'student' | 'lecturer') => void;
    hasLecturerAccess: boolean;
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function StudentNavBar({ 
    activeView, 
    onViewChange, 
    hasLecturerAccess,
    isMobile = false, 
    isTablet = false 
}: StudentNavBarProps) {
    if (!hasLecturerAccess) {
        // If no lecturer access, don't show navigation
        return null;
    }

    const navItems = [
        { name: 'student', icon: <GraduationCap />, value: 'Student View' },
        { name: 'lecturer', icon: <Users />, value: 'Facilitator View' },
    ];

    if (isMobile) {
        // Mobile: Horizontal bottom navigation
        return (
            <div className="flex justify-around items-center p-2 bg-background border-t border-zinc-800">
                {navItems.map((item) => (
                    <Button
                        key={item.name}
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewChange(item.name as 'student' | 'lecturer')}
                        className={`flex flex-col items-center justify-center h-12 px-3 ${
                            activeView === item.name ? "bg-accent text-accent-foreground" : ""
                        }`}
                        title={item.value}
                    >
                        <div className="w-5 h-5 mb-1">{item.icon}</div>
                        <span className="text-xs">{item.value}</span>
                    </Button>
                ))}
            </div>
        );
    }

    // Tablet/Desktop: Vertical sidebar navigation
    return (
        <div className="flex flex-col justify-start items-center p-4 min-h-full border-r border-zinc-800" style={{ width: "60px", minWidth: "60px" }}>
            {navItems.map((item) => (
                <Button
                    key={item.name}
                    variant="ghost"
                    size="icon"
                    onClick={() => onViewChange(item.name as 'student' | 'lecturer')}
                    className={`w-12 h-12 rounded-full mb-2 ${
                        activeView === item.name ? "bg-accent" : ""
                    }`}
                    title={item.value}
                >
                    {item.icon}
                </Button>
            ))}
        </div>
    );
}
