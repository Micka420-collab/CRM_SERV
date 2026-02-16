import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Clock, Search, Filter, Plus, Minus, Box, 
    AlertCircle, ArrowUp, ArrowDown, Monitor, 
    ShieldCheck, Activity, UserPlus, Settings, ShieldAlert,
    Trash2, Edit3, User, Server
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import TutorialButton from '../components/TutorialButton';

export default function History() {
    const { t } = useLanguage();
    const [logs, setLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterSource, setFilterSource] = useState('ALL');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get('/api/total-history');
            setLogs(data);
        } catch (error) {
            console.error("Failed to fetch total history", error);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (log) => {
        const { action, source } = log;
        
        if (source === 'software') return <ShieldCheck size={18} />;
        if (source === 'loan') return <Monitor size={18} />;
        
        if (action.includes('ADD_PRODUCT')) return <Box size={18} />;
        if (action.includes('UPDATE_STOCK')) {
            return log.metadata?.quantity_change > 0 ? <ArrowUp size={18} /> : <ArrowDown size={18} />;
        }
        if (action.includes('DELETE')) return <Trash2 size={18} />;
        if (action.includes('UPDATE')) return <Edit3 size={18} />;
        if (action.includes('CREATE_USER') || action.includes('CREATE_EMPLOYEE')) return <UserPlus size={18} />;
        
        return <Activity size={18} />;
    };

    const getSourceColorClass = (source) => {
        switch (source) {
            case 'inventory': return 'bg-blue';
            case 'loan': return 'bg-purple';
            case 'software': return 'bg-red';
            case 'admin': return 'bg-orange';
            default: return 'bg-gray';
        }
    };

    const getSourceLabel = (source) => {
        switch (source) {
            case 'inventory': return 'Inventaire';
            case 'loan': return 'Prêts PC';
            case 'software': return 'Applications';
            case 'admin': return 'Système';
            default: return source;
        }
    };

    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            log.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.action?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSource = filterSource === 'ALL' || log.source === filterSource;
        return matchesSearch && matchesSource;
    });

    return (
        <div className="page-container history-page">
            <TutorialButton tutorialKey="history" />

            <div className="history-header page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <h1 className="page-title">
                        <Clock size={28} className="header-icon" />
                        {t('activityTimeline')}
                    </h1>
                </div>

                <div className="history-controls">
                    <div className="search-bar compact">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder={t('searchLogs')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Source Filter Tabs */}
            <div className="filter-tabs">
                <button
                    className={`filter-tab ${filterSource === 'ALL' ? 'active' : ''}`}
                    onClick={() => setFilterSource('ALL')}
                >
                    {t('allActivity')}
                </button>
                <button
                    className={`filter-tab ${filterSource === 'inventory' ? 'active' : ''}`}
                    onClick={() => setFilterSource('inventory')}
                >
                    <Box size={14} /> Inventaire
                </button>
                <button
                    className={`filter-tab ${filterSource === 'loan' ? 'active' : ''}`}
                    onClick={() => setFilterSource('loan')}
                >
                    <Monitor size={14} /> Prêts PC
                </button>
                <button
                    className={`filter-tab ${filterSource === 'software' ? 'active' : ''}`}
                    onClick={() => setFilterSource('software')}
                >
                    <ShieldCheck size={14} /> Applications
                </button>
                <button
                    className={`filter-tab ${filterSource === 'admin' ? 'active' : ''}`}
                    onClick={() => setFilterSource('admin')}
                >
                    <Settings size={14} /> Système
                </button>
            </div>

            <div className="timeline-container">
                {loading ? (
                    <div className="loading-state">
                        <div className="spinner"></div>
                        <p>Chargement de l'historique global...</p>
                    </div>
                ) : filteredLogs.map((log, index) => (
                    <div key={log.id} className={`timeline-item source-${log.source}`}>
                        <div className={`timeline-icon ${getSourceColorClass(log.source)}`}>
                            {getActionIcon(log)}
                        </div>
                        <div className="timeline-content card-premium">
                            <div className="timeline-header">
                                <div className="user-info">
                                    <User size={14} />
                                    <span className="username">{log.username}</span>
                                    <span className={`source-tag ${log.source}`}>{getSourceLabel(log.source)}</span>
                                </div>
                                <span className="time">
                                    <Clock size={12} />
                                    {new Date(log.timestamp).toLocaleString('fr-FR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </span>
                            </div>
                            <div className="timeline-body">
                                <p className="details">{log.details}</p>
                                
                                <div className="event-meta">
                                    <span className="action-tag">{log.action?.replace(/_/g, ' ')}</span>
                                    
                                    {log.metadata?.pc_name && (
                                        <span className="meta-badge pc">
                                            <Monitor size={12} /> {log.metadata.pc_name}
                                        </span>
                                    )}
                                    {log.metadata?.quantity_change !== undefined && (
                                        <span className={`meta-badge qty ${log.metadata.quantity_change > 0 ? 'positive' : 'negative'}`}>
                                            {log.metadata.quantity_change > 0 ? '+' : ''}{log.metadata.quantity_change}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        {index < filteredLogs.length - 1 && <div className="timeline-connector"></div>}
                    </div>
                ))}

                {!loading && filteredLogs.length === 0 && (
                    <div className="empty-state">
                        <AlertCircle size={40} />
                        <p>{t('noHistoryFound')}</p>
                    </div>
                )}
            </div>

            <style jsx>{`
                .history-page {
                    max-width: 1000px;
                    margin: 0 auto;
                }
                .timeline-container {
                    padding: 2rem 0;
                    position: relative;
                }
                .timeline-item {
                    display: flex;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                    position: relative;
                }
                .timeline-icon {
                    width: 40px;
                    height: 40px;
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    z-index: 2;
                    flex-shrink: 0;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .timeline-connector {
                    position: absolute;
                    left: 20px;
                    top: 40px;
                    bottom: -32px;
                    width: 2px;
                    background: var(--border-color);
                    z-index: 1;
                }
                .timeline-content {
                    flex: 1;
                    padding: 1.25rem !important;
                    border-left: 4px solid transparent;
                }
                .timeline-item.source-inventory .timeline-content { border-left-color: #3b82f6; }
                .timeline-item.source-loan .timeline-content { border-left-color: #a855f7; }
                .timeline-item.source-software .timeline-content { border-left-color: #ef4444; }
                .timeline-item.source-admin .timeline-content { border-left-color: #f59e0b; }

                .user-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .username {
                    font-weight: 700;
                    color: var(--text-primary);
                }
                .source-tag {
                    font-size: 0.65rem;
                    padding: 2px 8px;
                    border-radius: 4px;
                    text-transform: uppercase;
                    font-weight: 800;
                }
                .source-tag.inventory { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
                .source-tag.loan { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                .source-tag.software { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                .source-tag.admin { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }

                .time {
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    font-size: 0.8rem;
                    color: var(--text-muted);
                }
                .timeline-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 0.75rem;
                }
                .details {
                    font-size: 0.95rem;
                    line-height: 1.5;
                    margin-bottom: 0.75rem;
                }
                .event-meta {
                    display: flex;
                    gap: 10px;
                    align-items: center;
                    flex-wrap: wrap;
                }
                .action-tag {
                    background: var(--bg-secondary);
                    color: var(--text-secondary);
                    padding: 3px 10px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                }
                .meta-badge {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                    font-size: 0.75rem;
                    padding: 3px 8px;
                    border-radius: 6px;
                    font-weight: 600;
                }
                .meta-badge.pc { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
                .meta-badge.qty.positive { color: #22c55e; }
                .meta-badge.qty.negative { color: #ef4444; }

                .bg-blue { background: #3b82f6; }
                .bg-purple { background: #a855f7; }
                .bg-red { background: #ef4444; }
                .bg-orange { background: #f59e0b; }
                .bg-gray { background: #94a3b8; }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: 4rem;
                    color: var(--text-muted);
                }
                .spinner {
                    width: 30px;
                    height: 30px;
                    border: 3px solid rgba(var(--primary-rgb), 0.1);
                    border-top-color: var(--primary-color);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}
