import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useState, useEffect } from "react"
import { jwtDecode } from 'jwt-decode'

interface ProfileViewProps {
    isMobile?: boolean;
    isTablet?: boolean;
}

interface UserInfo {
    sub: string;
    email?: string;
    first_name?: string;
    last_name?: string;
    primary_role_id?: number;
}

export default function ProfileView({ isMobile = false, isTablet = false }: ProfileViewProps) {
    const router = useRouter()
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

    useEffect(() => {
        const token = localStorage.getItem('authToken')
        if (token) {
            try {
                const decoded: UserInfo = jwtDecode(token)
                setUserInfo(decoded)
            } catch (error) {
                console.error('Error decoding token:', error)
            }
        }
    }, [])

    const handleLogout = () => {
        localStorage.clear()
        router.push("/auth")
    }

    const getRoleName = (roleId?: number) => {
        switch (roleId) {
            case 4:
                return "Administrator"
            case 1:
                return "Lecturer"
            case 3:
                return "Student"
            default:
                return "Unknown"
        }
    }

    return (
        <div className="flex-1 bg-gray-50 p-6 min-h-screen">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Profile
                    </h1>
                    <p className="text-gray-600">
                        Manage your account information and preferences.
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-gray-900">
                            Account Information
                        </h2>
                        <Button 
                            variant="destructive" 
                            onClick={handleLogout}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Logout
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500">Name</label>
                            <p className="text-gray-900">
                                {userInfo?.first_name && userInfo?.last_name 
                                    ? `${userInfo.first_name} ${userInfo.last_name}` 
                                    : 'Not available'
                                }
                            </p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <label className="text-sm font-medium text-gray-500">Email</label>
                            <p className="text-gray-900">
                                {userInfo?.email || 'Not available'}
                            </p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <label className="text-sm font-medium text-gray-500">Role</label>
                            <p className="text-gray-900">
                                {getRoleName(userInfo?.primary_role_id)}
                            </p>
                        </div>
                        
                        <Separator />
                        
                        <div>
                            <label className="text-sm font-medium text-gray-500">User ID</label>
                            <p className="text-gray-900 font-mono text-sm">
                                {userInfo?.sub || 'Not available'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
