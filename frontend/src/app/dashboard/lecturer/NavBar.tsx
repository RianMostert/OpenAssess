import { Button } from '@components/ui/button';
import { Settings, FileText, User } from 'lucide-react';

interface NavBarProps {
    activeNavItem: string;
    itemSelected: (item: string) => void;
    isMobile?: boolean;
    isTablet?: boolean;
    onToggleSidebar?: () => void;
    isSidebarVisible?: boolean;
}

const navBarItems = [
    { name: 'courses', icon: <FileText />, value: 'Courses' },
    { name: 'profile', icon: <User />, value: 'Profile' },
    // { name: 'settings', icon: <Settings />, value: 'Settings' },
];

export default function NavBar({ 
    activeNavItem, 
    itemSelected, 
    isMobile = false, 
    isTablet = false,
    onToggleSidebar,
    isSidebarVisible = true
}: NavBarProps) {
    
    const handleItemClick = (itemName: string) => {
        // If clicking the already active item, toggle the sidebar
        if (itemName === activeNavItem && onToggleSidebar) {
            onToggleSidebar();
        } else {
            // Switch to the new view and ensure sidebar is visible
            itemSelected(itemName);
            if (!isSidebarVisible && onToggleSidebar) {
                onToggleSidebar();
            }
        }
    };
    
    if (isMobile) {
        // Mobile: Horizontal bottom navigation
        return (
            <div className="flex justify-around items-center p-2 bg-background border-t border-brand-accent font-raleway">
                {navBarItems.map((item) => (
                    <Button
                        key={item.name}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemClick(item.name)}
                        className={`flex flex-col items-center justify-center h-12 px-3 ${
                            activeNavItem === item.name ? "bg-brand-accent-100 text-brand-primary" : "text-gray-700"
                        }`}
                        title={item.value}
                    >
                        <div className="w-5 h-5 mb-1">{item.icon}</div>
                        <span className="text-xs font-medium">{item.value}</span>
                    </Button>
                ))}
            </div>
        );
    }

    // Tablet/Desktop: Vertical sidebar navigation
    return (
        <div className="flex flex-col justify-start items-center p-4 min-h-full border-r border-brand-accent bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway" style={{ width: "60px", minWidth: "60px" }}>
            {navBarItems.map((item) => (
                <Button
                    key={item.name}
                    variant="ghost"
                    size="icon"
                    onClick={() => handleItemClick(item.name)}
                    className={`w-12 h-12 rounded-full mb-2 ${
                        activeNavItem === item.name 
                            ? "bg-brand-accent-200 text-brand-primary" 
                            : "text-gray-700 hover:bg-brand-accent-50"
                    }`}
                    title={item.value}
                >
                    {item.icon}
                </Button>
            ))}
        </div>
    );
}
