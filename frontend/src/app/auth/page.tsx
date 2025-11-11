'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { API_CONFIG, PrimaryRole, UI_MESSAGES } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [studentNumber, setStudentNumber] = useState("");
    const [role, setRole] = useState<"student" | "staff">("student");
    const [loading, setLoading] = useState(false);

    const router = useRouter();
    const { login: loginUser } = useAuth();

    // Helper function to get the appropriate API URL based on network
    const getApiUrl = () => {
        const defaultUrl = API_CONFIG.BASE_URL;
        
        if (typeof window !== 'undefined') {
            const hostname = window.location.hostname;
            
            // For localhost/127.0.0.1
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                return process.env.NEXT_PUBLIC_API_URL_LOCAL || defaultUrl;
            }
            // For network access (10.x.x.x or 192.168.x.x)
            if (hostname.startsWith('10.') || hostname.startsWith('192.168.')) {
                return process.env.NEXT_PUBLIC_API_URL_NETWORK || defaultUrl;
            }
            // For Tailscale (100.x.x.x)
            if (hostname.startsWith('100.')) {
                return process.env.NEXT_PUBLIC_API_URL_TAILSCALE || defaultUrl;
            }
            return defaultUrl;
        }
        return defaultUrl;
    };

    const toggleMode = () => {
        setIsLogin(!isLogin);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFirstName("");
        setLastName("");
        setStudentNumber("");
        setRole("student");
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!isLogin && password !== confirmPassword) {
            alert("Passwords do not match");
            return;
        }

        setLoading(true);

        try {
            if (isLogin) {
                const body = new URLSearchParams();
                body.append("username", email);
                body.append("password", password);

                const apiUrl = getApiUrl();
                const res = await fetch(`${apiUrl}/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: body.toString(),
                });

                if (!res.ok) throw new Error(UI_MESSAGES.ERROR.UNAUTHORIZED);

                const data = await res.json();
                
                // Fetch user data
                const userRes = await fetch(`${apiUrl}/users/me`, {
                    headers: {
                        Authorization: `Bearer ${data.access_token}`,
                    },
                });

                if (!userRes.ok) throw new Error("Failed to fetch user data");
                
                const userData = await userRes.json();
                
                // Use the useAuth login function
                loginUser(userData, data.access_token);
                
                setTimeout(() => router.push("/"), 100);
            } else {
                const apiUrl = getApiUrl();
                const res = await fetch(`${apiUrl}/auth/signup`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        first_name: firstName,
                        last_name: lastName,
                        email,
                        student_number: studentNumber || undefined,
                        password,
                        is_admin: false,
                        primary_role_id: role === "staff" ? PrimaryRole.LECTURER : PrimaryRole.STUDENT,
                    }),
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    if (res.status === 400 && errorData.detail?.includes("already registered with an active account")) {
                        alert("This email is already registered with an active account. Please use the login page to sign in.");
                        setIsLogin(true);
                        return;
                    }
                    throw new Error(errorData.detail || "Signup failed");
                }

                const userData = await res.json();
                
                // Check if this was an existing student setting their password for the first time
                if (userData.id) {
                    alert("Account setup successful! You can now log in with your new password.");
                } else {
                    alert("Signup successful. You can now log in.");
                }
                
                setIsLogin(true);
            }
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : UI_MESSAGES.ERROR.GENERIC);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-brand-primary-50 font-raleway">
            <div className="bg-white p-8 rounded-2xl shadow-2xl border-4 border-brand-accent w-full max-w-md">
                {/* App Branding */}
                <div className="text-center mb-6">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-primary to-brand-primary-700 bg-clip-text text-transparent mb-2">
                        OpenAssess
                    </h1>
                    <p className="text-brand-accent-700 font-semibold text-sm">
                        Assessment Management System
                    </p>
                </div>

                {/* Auth Mode Title */}
                <h2 className="text-2xl font-bold mb-6 text-center text-brand-primary">
                    {isLogin ? "Login" : "Sign Up"}
                </h2>
                {!isLogin && (
                    <div className="mb-4 p-3 bg-brand-accent-50 border-2 border-brand-accent-300 rounded-xl">
                        <p className="text-sm text-brand-primary font-medium">
                            <strong>Note:</strong> If you're a student and your instructor has already uploaded your details, 
                            you can use this form to set your password for the first time.
                        </p>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <>
                            <input
                                type="text"
                                placeholder="First Name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            />
                            <input
                                type="text"
                                placeholder="Student Number (optional)"
                                value={studentNumber}
                                onChange={(e) => setStudentNumber(e.target.value)}
                                disabled={loading}
                                className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                            />
                            <div className="flex justify-between items-center">
                                <label className="font-semibold text-brand-primary">Role:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRole("student")}
                                        className={`px-4 py-2 rounded-xl border-2 font-semibold transition-colors ${role === "student" ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-brand-primary border-brand-primary hover:bg-brand-primary-50"}`}
                                        disabled={loading}
                                    >
                                        Student
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole("staff")}
                                        className={`px-4 py-2 rounded-xl border-2 font-semibold transition-colors ${role === "staff" ? "bg-brand-primary text-white border-brand-primary" : "bg-white text-brand-primary border-brand-primary hover:bg-brand-primary-50"}`}
                                        disabled={loading}
                                    >
                                        Staff
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <div>
                        <label htmlFor="auth-email" className="sr-only">Email</label>
                        <input
                            id="auth-email"
                            name="email"
                            type="email"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                    <div>
                        <label htmlFor="auth-password" className="sr-only">Password</label>
                        <input
                            id="auth-password"
                            name="password"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        />
                    </div>
                    {!isLogin && (
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-2 border-2 border-brand-accent-300 rounded-xl focus:ring-2 focus:ring-brand-primary focus:border-brand-primary"
                        />
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-xl text-white flex items-center justify-center gap-2 font-semibold transition-colors ${loading ? 'bg-brand-primary-300 cursor-not-allowed' : 'bg-brand-primary hover:bg-brand-primary-700'
                            }`}
                    >
                        {loading && (
                            <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                ></circle>
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                ></path>
                            </svg>
                        )}
                        {loading ? 'Processing...' : isLogin ? 'Login' : 'Sign Up'}
                    </button>
                </form>
                <p className="mt-4 text-center text-sm">
                    {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                    <button
                        onClick={toggleMode}
                        disabled={loading}
                        className="text-brand-accent-700 hover:text-brand-accent-800 underline font-medium"
                    >
                        {isLogin ? "Sign Up" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
}
