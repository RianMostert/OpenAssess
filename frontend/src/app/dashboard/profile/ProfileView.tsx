import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export default function ProfileView() {
    const router = useRouter()

    const handleLogout = () => {
        localStorage.clear()
        router.push("/auth")
    }

    return (
        <Button variant="destructive" onClick={handleLogout}>
            Logout
        </Button>
    )
}
