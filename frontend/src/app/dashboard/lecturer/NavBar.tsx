import { Button } from '@components/ui/button';
import { Settings, FileText, User } from 'lucide-react';

interface NavBarProps {
    activeNavItem: string;
    itemSelected: (item: string) => void;
    isMobile?: boolean;
    isTablet?: boolean;
}

const navBarItems = [
    { name: 'courses', icon: <FileText />, value: 'Courses' },
    { name: 'profile', icon: <User />, value: 'Profile' },
    { name: 'settings', icon: <Settings />, value: 'Settings' },
];

export default function NavBar({ activeNavItem, itemSelected, isMobile = false, isTablet = false }: NavBarProps) {
    if (isMobile) {
        // Mobile: Horizontal bottom navigation
        return (
            <div className="flex justify-around items-center p-2 bg-background border-t border-zinc-800">
                {navBarItems.map((item) => (
                    <Button
                        key={item.name}
                        variant="ghost"
                        size="sm"
                        onClick={() => itemSelected(item.name)}
                        className={`flex flex-col items-center justify-center h-12 px-3 ${
                            activeNavItem === item.name ? "bg-accent text-accent-foreground" : ""
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
        <div className="flex flex-col justify-start items-center p-4 min-h-full" style={{ width: "60px", minWidth: "60px" }}>
            {navBarItems.map((item) => (
                <Button
                    key={item.name}
                    variant="ghost"
                    size="icon"
                    onClick={() => itemSelected(item.name)}
                    className={`w-12 h-12 rounded-full mb-2 ${activeNavItem === item.name ? "bg-accent" : ""
                        }`}
                    title={item.value}
                >
                    {item.icon}
                </Button>
            ))}
        </div>
    );
}
