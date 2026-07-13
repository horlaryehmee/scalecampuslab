import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './saas/App';
import '../css/app.css';

createRoot(document.getElementById('platform-root')).render(<App />);
