import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, AlertTriangle, Package, Shield, Clock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function NotificationCenter() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState({
        totalCount: 0,
        overdueLoans: [],
        lowStock: [],
        sensitiveActivities: []
    });
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const fetchNotifications = async () => {
        try {
            const { data } = await axios.get('/api/notifications');
            setNotifications(data);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNavigate = (path) => {
        navigate(path);
        setIsOpen(false);
    };

    return (
        <div className="notification-center" ref={dropdownRef}>
            <button 
                className={`notification-trigger ${isOpen ? 'active' : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title={t('notifications') || 'Notifications'}
            >
                <Bell size={20} />
                {notifications.totalCount > 0 && (
                    <span className="notification-badge">{notifications.totalCount}</span>
                )}
            </button>

            {isOpen && (
                <div className="notification-dropdown glass-card animate-fade-in">
                    <div className="notification-header">
                        <h3>{t('notifications') || 'Notifications'}</h3>
                        <span className="total-badge">{notifications.totalCount}</span>
                    </div>

                    <div className="notification-content custom-scrollbar">
                        {notifications.totalCount === 0 ? (
                            <div className="notification-empty">
                                <Clock size={32} />
                                <p>{t('noNotifications') || 'Aucune notification'}</p>
                            </div>
                        ) : (
                            <>
                                {/* Overdue Loans */}
                                {notifications.overdueLoans.length > 0 && (
                                    <div className="notification-section">
                                        <div className="section-title overdue">
                                            <Clock size={14} /> {t('overdueLoans') || 'Retards de retour'}
                                        </div>
                                        {notifications.overdueLoans.map(loan => (
                                            <div 
                                                key={`loan-${loan.id}`} 
                                                className="notification-item"
                                                onClick={() => handleNavigate('/loan-pcs')}
                                            >
                                                <div className="item-icon overdue"><Clock size={14} /></div>
                                                <div className="item-details">
                                                    <span className="item-title">{loan.name}</span>
                                                    <span className="item-subtitle">{loan.current_user} • {new Date(loan.loan_end_expected).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Low Stock */}
                                {notifications.lowStock.length > 0 && (
                                    <div className="notification-section">
                                        <div className="section-title low-stock">
                                            <AlertTriangle size={14} /> {t('lowStock') || 'Stock Faible'}
                                        </div>
                                        {notifications.lowStock.map(item => (
                                            <div 
                                                key={`stock-${item.id}`} 
                                                className="notification-item"
                                                onClick={() => handleNavigate('/inventory')}
                                            >
                                                <div className="item-icon low-stock"><Package size={14} /></div>
                                                <div className="item-details">
                                                    <span className="item-title">{item.name}</span>
                                                    <span className="item-subtitle">Reste: {item.quantity} (Min: {item.min_quantity})</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Sensitive Missions */}
                                {notifications.sensitiveActivities.length > 0 && (
                                    <div className="notification-section">
                                        <div className="section-title sensitive">
                                            <Shield size={14} /> {t('sensitiveMissions') || 'Missions Sensibles'}
                                        </div>
                                        {notifications.sensitiveActivities.map((act, idx) => (
                                            <div 
                                                key={`sensitive-${idx}`} 
                                                className="notification-item"
                                                onClick={() => handleNavigate(act.type === 'phone' ? '/phones' : '/loan-pcs')}
                                            >
                                                <div className="item-icon sensitive"><Shield size={14} /></div>
                                                <div className="item-details">
                                                    <span className="item-title">{act.name}</span>
                                                    <span className="item-subtitle">Nouvelle activité sensible</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
