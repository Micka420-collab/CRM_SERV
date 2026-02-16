import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Phones from './pages/Phones';
import History from './pages/History';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import LoanPCs from './pages/LoanPCs';
import PrtHistory from './pages/PrtHistory';
import Applications from './pages/Applications';
import LicenseActivation from './pages/LicenseActivation';
import axios from 'axios';
import Layout from './components/Layout';

import { TutorialProvider } from './context/TutorialContext';
import { GamificationProvider } from './context/GamificationContext';

const ProtectedRoute = ({ children }) => {
    const { user } = useAuth();
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    const [licenseStatus, setLicenseStatus] = useState('checking'); // 'checking' | 'active' | 'expired' | 'unlicensed'

    useEffect(() => {
        checkLicense();
    }, []);

    const checkLicense = async () => {
        console.log('Checking license status...');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

        try {
            const { data } = await axios.get('/api/license/status', { signal: controller.signal });
            console.log('License response:', data);
            setLicenseStatus(data.status);
        } catch (error) {
            console.error('License check failed:', error);
            // If it's a 402, it means the middleware blocked it (unlicensed/expired)
            if (error.response?.status === 402) {
                setLicenseStatus(error.response.data.code === 'LICENSE_EXPIRED' ? 'expired' : 'unlicensed');
            } else {
                setLicenseStatus('unlicensed'); // Default to activation for safety
            }
        } finally {
            clearTimeout(timeoutId);
        }
    };

    if (licenseStatus === 'checking') {
        return <div style={{ 
            height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
            background: '#0f172a', color: 'white' 
        }}>Chargement...</div>;
    }

    if (licenseStatus !== 'active') {
        return <LicenseActivation onActivated={() => setLicenseStatus('active')} />;
    }

    return (
        <LanguageProvider>
            <ThemeProvider>
                <AuthProvider>
                    <TutorialProvider>
                        <GamificationProvider>
                            <BrowserRouter>
                                <Routes>
                                    <Route path="/login" element={<Login />} />

                                    <Route path="/" element={
                                        <ProtectedRoute>
                                            <Layout />
                                        </ProtectedRoute>
                                    }>
                                        <Route index element={<Navigate to="/dashboard" replace />} />
                                        <Route path="dashboard" element={<Dashboard />} />
                                        <Route path="inventory" element={<Inventory />} />
                                        <Route path="phones" element={<Phones />} />
                                        <Route path="history" element={<History />} />
                                        <Route path="reports" element={<Reports />} />
                                        <Route path="loan-pcs" element={<LoanPCs />} />
                                        <Route path="prt-history/:prt?" element={<PrtHistory />} />
                                        <Route path="applications" element={<Applications />} />
                                        <Route path="settings" element={<Settings />} />
                                    </Route>
                                    
                                    {/* Catch-all route to redirect back home */}
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </BrowserRouter>
                        </GamificationProvider>
                    </TutorialProvider>
                </AuthProvider>
            </ThemeProvider>
        </LanguageProvider>
    );
}

export default App;
