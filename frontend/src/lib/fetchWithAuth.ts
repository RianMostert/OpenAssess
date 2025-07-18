export async function fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem("authToken");

    if (!token) {
        throw new Error("No auth token found");
    }

    const isFormData = options.body instanceof FormData;

    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
            ...(isFormData ? {} : { "Content-Type": "application/json" }),
        },
    });
}
