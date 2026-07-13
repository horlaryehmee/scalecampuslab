import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, clearSession, dashboardPath, saveSession, storedSession } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const initial = storedSession();
    const [user, setUser] = useState(initial.user);
    const [ready, setReady] = useState(false);

    const refreshUser = useCallback(async () => {
        try {
            const response = await api.get('/me');
            const nextUser = response.data?.user || response.data;
            setUser(nextUser);
            saveSession(storedSession().token, nextUser);
            return nextUser;
        } catch {
            clearSession();
            setUser(null);
            return null;
        } finally {
            setReady(true);
        }
    }, []);

    useEffect(() => {
        refreshUser();
        const clear = () => {
            clearSession();
            setUser(null);
            setReady(true);
        };
        window.addEventListener('scalecampuslab:unauthorized', clear);
        return () => window.removeEventListener('scalecampuslab:unauthorized', clear);
    }, [refreshUser]);

    const authenticate = useCallback(async (endpoint, payload) => {
        const response = await api.post(endpoint, payload);
        if (response.data?.mfa_required) {
            return response.data;
        }

        const token = response.data?.token;
        const nextUser = response.data?.user;
        saveSession(token, nextUser);
        setUser(nextUser);
        return { ...response.data, dashboardPath: dashboardPath(nextUser) };
    }, []);

    const login = useCallback((payload) => authenticate('/login', payload), [authenticate]);
    const completeMfa = useCallback((payload) => authenticate('/mfa/verify', payload), [authenticate]);
    const register = useCallback((payload) => authenticate('/register', payload), [authenticate]);

    const logout = useCallback(async () => {
        try {
            await api.post('/logout');
        } finally {
            clearSession();
            setUser(null);
        }
    }, []);

    const value = useMemo(() => ({
        user,
        ready,
        authenticated: Boolean(user),
        login,
        completeMfa,
        register,
        logout,
        refreshUser,
        dashboardPath: dashboardPath(user),
    }), [user, ready, login, completeMfa, register, logout, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const value = useContext(AuthContext);
    if (!value) throw new Error('useAuth must be used inside AuthProvider.');
    return value;
}
