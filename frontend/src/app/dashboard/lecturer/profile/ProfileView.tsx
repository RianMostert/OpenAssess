import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface ProfileViewProps {
    isMobile?: boolean;
    isTablet?: boolean;
}

export default function ProfileView({ isMobile = false, isTablet = false }: ProfileViewProps) {
    const router = useRouter()

    const handleLogout = () => {
        localStorage.clear()
        router.push("/auth")
    }

    return (
        <div className={`p-${isMobile ? '4' : '6'} flex flex-col h-full`}>
            <h1 className={`text-${isMobile ? 'xl' : '2xl'} font-bold mb-6`}>Profile</h1>
            <div className="flex-1 flex items-start">
                <Button 
                    variant="destructive" 
                    onClick={handleLogout}
                    size={isMobile ? "sm" : "default"}
                >
                    Logout
                </Button>
            </div>
        </div>
    )
}
