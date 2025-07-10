import { Button } from '@components/ui/button';
import { Settings, FileText, User } from 'lucide-react';

interface NavBarProps {
    activeNavItem: string;
    itemSelected: (item: string) => void;
}

const navBarItems = [
    { name: 'courses', icon: <FileText />, value: 'Courses' },
    { name: 'profile', icon: <User />, value: 'Profile' },
    { name: 'settings', icon: <Settings />, value: 'Settings' },
];

export default function NavBar({ activeNavItem, itemSelected }: NavBarProps) {
    return (
        <div className="flex flex-col justify-between items-center p-4" style={{ width: "60px", minWidth: "60px" }}>
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
