import React, { Suspense, useEffect } from 'react';
import { BrowserRouter, Link, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import PublicLayout from './layouts/PublicLayout';
import HomePage from './pages/public/HomePage';
import { AboutPage, ContactPage, FaqPage, HowItWorksPage } from './pages/public/PublicPages';
import { ForgotPasswordPage, LoginPage, MfaChallengePage, RegisterPage, ResetPasswordPage, VerifyEmailPage } from './pages/auth/AuthPages';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { dashboardPath } from './services/api';

function ScreenLoader() {
    return <div className="grid min-h-screen place-items-center bg-[#f6f8f7]"><LoaderCircle className="animate-spin text-emerald-700" size={32} aria-label="Loading application" /></div>;
}

function DashboardRedirect() {
    const { user, ready } = useAuth();

    useEffect(() => {
        if (!ready) return;
        window.location.replace(user ? dashboardPath(user) : '/login');
    }, [ready, user]);

    return <ScreenLoader />;
}

function AuthScope() {
    return <AuthProvider><Outlet /></AuthProvider>;
}

function VerificationRoute() {
    const { user, ready } = useAuth();

    if (!ready) return <ScreenLoader />;

    return user ? <VerifyEmailPage /> : <Navigate to="/login" replace />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route element={<PublicLayout />}>
                <Route index element={<HomePage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="how-it-works" element={<HowItWorksPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="faq" element={<FaqPage />} />
            </Route>
            <Route element={<AuthScope />}>
                <Route path="login" element={<LoginPage />} />
                <Route path="mfa-challenge" element={<MfaChallengePage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="verify-email" element={<VerificationRoute />} />
                <Route path="platform" element={<DashboardRedirect />} />
                <Route path="app/*" element={<DashboardRedirect />} />
            </Route>
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}

function NotFound() {
    return <main className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center"><div><p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">404</p><h1 className="mt-3 text-4xl font-black text-slate-950">This page does not exist.</h1><Link to="/" className="mt-6 inline-flex rounded-xl bg-[#075f56] px-5 py-3 text-sm font-black text-white">Return home</Link></div></main>;
}

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <Suspense fallback={<ScreenLoader />}>
                    <AppRoutes />
                </Suspense>
            </ToastProvider>
        </BrowserRouter>
    );
}
