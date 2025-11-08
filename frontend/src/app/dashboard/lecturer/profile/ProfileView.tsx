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
    primary_role_id?: number;  // Keep for backward compatibility
    primary_role?: string;     // New enum value
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

    const getRoleName = (roleId?: number, roleEnum?: string) => {
        // Check new enum values first
        if (roleEnum) {
            switch (roleEnum) {
                case 'administrator':
                    return "Administrator"
                case 'staff':
                    return "Staff"
                case 'student':
                    return "Student"
                default:
                    return roleEnum.charAt(0).toUpperCase() + roleEnum.slice(1)
            }
        }
        
        // Use the new role ID system
        switch (roleId) {
            case 1:
                return "Administrator"
            case 2:
                return "Staff"
            case 3:
                return "Student"
            default:
                return "Unknown"
        }
    }

    return (
        <div className="flex-1 bg-gradient-to-br from-brand-primary-50 to-brand-accent-50 p-6 min-h-screen font-raleway">
            <div className="max-w-2xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-brand-primary-800 mb-2">
                        Profile Settings
                    </h1>
                    <p className="text-brand-primary-600 font-medium">
                        Manage your account information and preferences
                    </p>
                </div>

                {/* Profile Card */}
                <div className="bg-white rounded-lg shadow-md border-2 border-brand-accent-400 p-6">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-brand-accent-200">
                        <h2 className="text-xl font-bold text-brand-primary-800">
                            Account Information
                        </h2>
                        <Button 
                            variant="destructive" 
                            onClick={handleLogout}
                            size="sm"
                            className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md"
                        >
                            Logout
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="p-3 rounded-lg bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 border border-brand-accent-200">
                            <label className="text-xs font-bold text-brand-primary-700 uppercase tracking-wider">Name</label>
                            <p className="text-brand-primary-900 font-semibold mt-1">
                                {userInfo?.first_name && userInfo?.last_name 
                                    ? `${userInfo.first_name} ${userInfo.last_name}` 
                                    : 'Not available'
                                }
                            </p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 border border-brand-accent-200">
                            <label className="text-xs font-bold text-brand-primary-700 uppercase tracking-wider">Email</label>
                            <p className="text-brand-primary-900 font-semibold mt-1 break-all">
                                {userInfo?.email || 'Not available'}
                            </p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 border border-brand-accent-200">
                            <label className="text-xs font-bold text-brand-primary-700 uppercase tracking-wider">Role</label>
                            <p className="text-brand-primary-900 font-semibold mt-1">
                                {getRoleName(userInfo?.primary_role_id, userInfo?.primary_role)}
                            </p>
                        </div>
                        
                        <div className="p-3 rounded-lg bg-gradient-to-r from-brand-primary-50 to-brand-accent-50 border border-brand-accent-200">
                            <label className="text-xs font-bold text-brand-primary-700 uppercase tracking-wider">User ID</label>
                            <p className="text-brand-primary-900 font-mono text-sm font-semibold mt-1 break-all">
                                {userInfo?.sub || 'Not available'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
