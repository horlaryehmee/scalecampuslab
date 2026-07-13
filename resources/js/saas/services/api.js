import axios from 'axios';

const TOKEN_KEY = 'scalecampuslab.auth.token';
const USER_KEY = 'scalecampuslab.auth.user';
export const api = axios.create({
    baseURL: '/api/v1',
    headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    },
    timeout: 20000,
    withCredentials: true,
    withXSRFToken: true,
});

api.interceptors.request.use((config) => {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (csrfToken && !config.headers['X-CSRF-TOKEN']) {
        config.headers['X-CSRF-TOKEN'] = csrfToken;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.localStorage.removeItem(TOKEN_KEY);
            window.localStorage.removeItem(USER_KEY);
            window.dispatchEvent(new CustomEvent('scalecampuslab:unauthorized'));
        }

        return Promise.reject(error);
    },
);

export function saveSession(token, user) {
    if (token) {
        window.localStorage.setItem(TOKEN_KEY, token);
    }

    if (user) {
        window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
}

export function clearSession() {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
}

export function storedSession() {
    let user = null;

    try {
        user = JSON.parse(window.localStorage.getItem(USER_KEY) || 'null');
    } catch {
        clearSession();
    }

    return {
        token: window.localStorage.getItem(TOKEN_KEY),
        user,
    };
}

export function records(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
}

export function apiError(error, fallback = 'Something went wrong. Please try again.') {
    const errors = error?.response?.data?.errors;
    const firstValidationError = errors
        ? Object.values(errors).flat().find(Boolean)
        : null;

    return firstValidationError
        || error?.response?.data?.message
        || error?.message
        || fallback;
}

export function dashboardPath(user) {
    if (user?.dashboard_path?.startsWith('/dashboard/')) return user.dashboard_path;
    const role = user?.role === 'high_school' ? 'school' : user?.role;
    const allowed = ['admin', 'university', 'school', 'student'];
    const safeRole = allowed.includes(role) ? role : 'student';

    return `/dashboard/${safeRole}`;
}

export { TOKEN_KEY, USER_KEY };
