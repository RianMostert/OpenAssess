import { Button } from '@components/ui/button';
import { Settings, FileText, Highlighter, icons } from 'lucide-react';

interface NavBarProps {
    activeNavItem: string;
    itemSelected: (item: string) => void;
}

const nacBarItems = [
    { name: 'document', icon: <FileText />, value: 'Document' },
    // { name: 'annotation', icon: <Highlighter />, value: 'Annotation' },
    { name: 'settings', icon: <Settings />, value: 'Settings' },
];

export default function NavBar({ activeNavItem, itemSelected }: NavBarProps) {
    return (
        <div className="flex flex-col justify-between items-center p-4" style={{ width: "60px", minWidth: "60px" }}>
            {nacBarItems.map((item) => (
                <Button
                    key={item.name}
                    variant={"ghost"}
                    size="icon"
                    onClick={() => itemSelected(item.name)}
                    className={`w-12 h-12 rounded-full mb-2 ${activeNavItem === item.name ? "" : ""}`}
                    title={item.value}
                >
                    {item.icon}
                </Button>
            ))}
        </div>
    );
}