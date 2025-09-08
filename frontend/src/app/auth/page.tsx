'use client';

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [studentNumber, setStudentNumber] = useState("");
    const [role, setRole] = useState("student");
    const [loading, setLoading] = useState(false);

    const router = useRouter();

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

                const res = await fetch(`http://localhost:8000/api/v1/auth/login`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: body.toString(),
                });

                if (!res.ok) throw new Error("Login failed");

                const data = await res.json();
                localStorage.setItem("authToken", data.access_token);
                setTimeout(() => router.push("/"), 100);
            } else {
                const res = await fetch(`http://localhost:8000/api/v1/auth/signup`, {
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
                        primary_role_id: role === "teacher" ? 1 : 3,
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
            alert("Authentication error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-6 text-center">
                    {isLogin ? "Login" : "Sign Up"}
                </h2>
                {!isLogin && (
                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-sm text-blue-800">
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
                                className="w-full px-4 py-2 border rounded-xl"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                required
                                disabled={loading}
                                className="w-full px-4 py-2 border rounded-xl"
                            />
                            <input
                                type="text"
                                placeholder="Student Number (optional)"
                                value={studentNumber}
                                onChange={(e) => setStudentNumber(e.target.value)}
                                disabled={loading}
                                className="w-full px-4 py-2 border rounded-xl"
                            />
                            <div className="flex justify-between items-center">
                                <label className="font-medium">Role:</label>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setRole("student")}
                                        className={`px-3 py-1 rounded-xl border ${role === "student" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
                                        disabled={loading}
                                    >
                                        Student
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setRole("teacher")}
                                        className={`px-3 py-1 rounded-xl border ${role === "teacher" ? "bg-blue-500 text-white" : "bg-gray-100"}`}
                                        disabled={loading}
                                    >
                                        Teacher
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2 border rounded-xl"
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="w-full px-4 py-2 border rounded-xl"
                    />
                    {!isLogin && (
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                            className="w-full px-4 py-2 border rounded-xl"
                        />
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-2 rounded-xl text-white flex items-center justify-center gap-2 ${loading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'
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
                        className="text-blue-500 underline"
                    >
                        {isLogin ? "Sign Up" : "Login"}
                    </button>
                </p>
            </div>
        </div>
    );
}
