import { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Key, CheckCircle, AlertTriangle, ArrowRight, Lock, Tablet, Wifi, WifiOff, Monitor, ExternalLink } from 'lucide-react';

export default function LicenseActivation({ onActivated }) {
    const [key, setKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [hardwareId, setHardwareId] = useState('');
    const [serverStatus, setServerStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
    const [licenseError, setLicenseError] = useState(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        document.body.style.margin = '0';
        document.body.style.padding = '0';

        // Fetch hardware ID and check server connectivity
        fetchInfo();

        return () => {
            document.body.style.overflow = 'auto';
        };
    }, []);

    const fetchInfo = async () => {
        try {
            const { data } = await axios.get('/api/license/hardware-id');
            setHardwareId(data.hardwareId);
        } catch (e) { /* ignore */ }

        try {
            const { data } = await axios.get('/api/license/status');
            setServerStatus(data.offlineMode ? 'offline' : 'online');
            if (data.error) {
                setLicenseError(data.error);
            }
        } catch (e) {
            if (e.response?.status === 503) {
                setServerStatus('offline');
            } else {
                setServerStatus('online');
            }
        }
    };

    const handleActivate = async (e) => {
        e.preventDefault();
        if (!key.trim()) return;

        setLoading(true);
        setStatus(null);

        try {
            const { data } = await axios.post('/api/license/activate', { key: key.trim() });
            setStatus({ type: 'success', message: data.message || "Licence activee avec succes !" });
            setTimeout(() => {
                if (onActivated) onActivated();
                window.location.reload();
            }, 2000);
        } catch (error) {
            const errData = error.response?.data;
            let message = errData?.message || errData?.error || "Erreur d'activation.";

            if (errData?.error === 'SEAT_LIMIT_REACHED') {
                message = `Limite de postes atteinte (${errData.seatsUsed}/${errData.seatsMax}). Desactivez un poste ou passez a un plan superieur.`;
            } else if (errData?.error === 'SERVER_UNREACHABLE') {
                message = "Impossible de contacter le serveur de licence. Verifiez votre connexion internet.";
            } else if (errData?.error === 'LICENSE_NOT_FOUND') {
                message = "Cle de licence introuvable. Verifiez votre cle ou achetez-en une sur notre site.";
            } else if (errData?.error === 'LICENSE_EXPIRED') {
                message = "Cette licence a expire. Renouvelez votre abonnement.";
            }

            setStatus({ type: 'error', message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#020617',
            fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
            color: '#f8fafc',
            overflow: 'hidden'
        }}>
            {/* Ambient Background */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100vw',
                height: '100vh',
                background: 'radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(139, 92, 246, 0.08) 0%, transparent 50%)',
                zIndex: 0
            }} />

            <div style={{
                width: 'calc(100% - 40px)',
                maxWidth: '420px',
                background: 'rgba(15, 23, 42, 0.8)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                borderRadius: '24px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                padding: '40px',
                boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px',
                zIndex: 1,
                position: 'relative'
            }}>
                {/* Server Status Indicator */}
                <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.7rem',
                    color: serverStatus === 'online' ? '#10b981' : serverStatus === 'offline' ? '#f59e0b' : '#64748b'
                }}>
                    {serverStatus === 'online' ? <Wifi size={12} /> : serverStatus === 'offline' ? <WifiOff size={12} /> : null}
                    {serverStatus === 'online' ? 'Connecte' : serverStatus === 'offline' ? 'Hors ligne' : 'Connexion...'}
                </div>

                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        color: 'white',
                        boxShadow: '0 8px 16px -4px rgba(59, 130, 246, 0.4)'
                    }}>
                        <Lock size={32} />
                    </div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px', color: 'white' }}>Activation CRM</h2>
                    <p style={{ color: '#94a3b8', fontSize: '0.925rem', lineHeight: '1.5' }}>
                        Entrez votre cle de licence pour debloquer toutes les fonctionnalites de votre instance.
                    </p>
                </div>

                {status && (
                    <div style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        fontSize: '0.875rem',
                        background: status.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        border: `1px solid ${status.type === 'success' ? '#10b981' : '#ef4444'}`,
                        color: status.type === 'success' ? '#10b981' : '#f87171'
                    }}>
                        {status.type === 'success' ? <CheckCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} /> : <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} />}
                        <span>{status.message}</span>
                    </div>
                )}

                <form onSubmit={handleActivate} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ position: 'relative' }}>
                        <Key size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        <input
                            type="text"
                            placeholder="ITSTOCK-XXXX-XXXX-XXXX-XXXX"
                            value={key}
                            onChange={(e) => setKey(e.target.value.toUpperCase())}
                            style={{
                                width: '89%',
                                padding: '14px 16px 14px 45px',
                                background: 'rgba(2, 6, 23, 0.5)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '12px',
                                color: 'white',
                                fontSize: '1rem',
                                outline: 'none',
                                transition: '0.2s',
                                borderRightWidth: '0px',
                                paddingRight: '0.5px'
                            }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || serverStatus === 'offline'}
                        style={{
                            width: '100%',
                            padding: '14px',
                            background: loading || serverStatus === 'offline' ? '#475569' : '#3b82f6',
                            border: 'none',
                            borderRadius: '12px',
                            color: 'white',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: loading || serverStatus === 'offline' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                            boxShadow: loading || serverStatus === 'offline' ? 'none' : '0 4px 12px rgba(59, 130, 246, 0.3)'
                        }}
                    >
                        {loading ? 'Activation...' : serverStatus === 'offline' ? 'Serveur hors ligne' : 'Activer maintenant'}
                        {!loading && serverStatus !== 'offline' && <ArrowRight size={18} />}
                    </button>
                </form>

                {/* Hardware ID display (for support) */}
                {hardwareId && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 14px',
                        background: 'rgba(2, 6, 23, 0.3)',
                        borderRadius: '10px',
                        fontSize: '0.75rem',
                        color: '#64748b'
                    }}>
                        <Monitor size={14} />
                        <span>ID Machine: <span style={{ color: '#94a3b8', fontFamily: 'monospace' }}>{hardwareId}</span></span>
                    </div>
                )}

                <div style={{ textAlign: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', color: '#64748b', fontSize: '0.8rem', marginBottom: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Shield size={12} /> Securise</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Tablet size={12} /> Multi-plateforme</span>
                    </div>
                    <a
                        href="https://itstock.nextendo.com/pricing"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: '#3b82f6',
                            fontSize: '0.8rem',
                            textDecoration: 'none',
                            opacity: 0.8
                        }}
                    >
                        Pas de licence ? Acheter sur notre site <ExternalLink size={12} />
                    </a>
                </div>
            </div>

            <p style={{ position: 'absolute', bottom: '24px', color: '#475569', fontSize: '0.75rem' }}>
                Nextendo &copy; 2026 NEXTENDO . TOUS DROITS R&Eacute;SERV&Eacute;S
            </p>
        </div>
    );
}
