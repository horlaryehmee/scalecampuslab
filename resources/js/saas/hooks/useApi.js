import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiError } from '../services/api';

export function useApi(path, { enabled = true, interval = 0, initialData = null } = {}) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(enabled);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const mounted = useRef(true);
    const activeRequest = useRef(null);
    const requestSequence = useRef(0);

    useEffect(() => () => {
        mounted.current = false;
        activeRequest.current?.abort();
    }, []);

    const refresh = useCallback(async ({ quiet = false } = {}) => {
        if (!enabled || !path) return null;
        const requestId = ++requestSequence.current;
        activeRequest.current?.abort();
        const controller = new AbortController();
        activeRequest.current = controller;
        quiet ? setRefreshing(true) : setLoading(true);
        setError('');

        try {
            const response = await api.get(path, { signal: controller.signal });
            if (mounted.current && requestSequence.current === requestId) setData(response.data);
            return response.data;
        } catch (requestError) {
            if (requestError.code === 'ERR_CANCELED') return null;
            const message = apiError(requestError);
            if (mounted.current && requestSequence.current === requestId) setError(message);
            throw requestError;
        } finally {
            if (mounted.current && requestSequence.current === requestId) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [enabled, path]);

    useEffect(() => {
        if (!enabled || !path) return undefined;
        refresh().catch(() => {});
        const timer = interval
            ? window.setInterval(() => refresh({ quiet: true }).catch(() => {}), interval)
            : null;
        return () => {
            if (timer) window.clearInterval(timer);
            activeRequest.current?.abort();
        };
    }, [enabled, interval, path, refresh]);

    return { data, setData, loading, refreshing, error, refresh };
}

export function useMutation({ onSuccess } = {}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const mutate = useCallback(async (method, path, payload = undefined) => {
        setLoading(true);
        setError('');
        try {
            const response = await api.request({ method, url: path, data: payload });
            await onSuccess?.(response.data);
            return response.data;
        } catch (requestError) {
            setError(apiError(requestError));
            throw requestError;
        } finally {
            setLoading(false);
        }
    }, [onSuccess]);

    return { mutate, loading, error, clearError: () => setError('') };
}
