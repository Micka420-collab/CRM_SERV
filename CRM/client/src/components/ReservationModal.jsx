import React, { useState } from 'react';
import { Calendar, User, AlignLeft, AlertTriangle } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function ReservationModal({ isOpen, onClose, pc, onConfirm }) {
    const { user } = useAuth();
    const [formData, setFormData] = useState({
        user_name: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        reason: '',
        notes: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen || !pc) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Basic validation
        if (new Date(formData.start_date) > new Date(formData.end_date)) {
            setError("La date de fin doit être après la date de début.");
            setLoading(false);
            return;
        }

        if (new Date(formData.start_date) < new Date().setHours(0, 0, 0, 0)) {
            // Optional: Allow today
            // setError("La réservation ne peut pas commencer dans le passé.");
        }

        try {
            await axios.post('/api/reservations', {
                pc_id: pc.id,
                ...formData
            });
            onConfirm(); // Refresh data
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || "Erreur lors de la réservation");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal pro-modal">
                <div className="modal-header">
                    <div className="modal-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}>
                        <Calendar size={24} />
                    </div>
                    <div>
                        <h2>Prévoir un PC (Prêt)</h2>
                        <p className="modal-subtitle">{pc.name} - {pc.serial_number}</p>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="pro-form">
                    <div className="form-group">
                        <label>Nom de l'emprunteur *</label>
                        <div className="input-affix-wrapper">
                            <User size={16} className="input-icon-left" />
                            <input
                                required
                                value={formData.user_name}
                                onChange={e => setFormData({ ...formData, user_name: e.target.value })}
                                placeholder="Nom du futur emprunteur"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Raison *</label>
                        <div className="input-affix-wrapper">
                            <AlignLeft size={16} className="input-icon-left" />
                            <input
                                required
                                value={formData.reason}
                                onChange={e => setFormData({ ...formData, reason: e.target.value })}
                                placeholder="Motif du prêt prévu"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>Date Début *</label>
                            <input
                                type="date"
                                required
                                value={formData.start_date}
                                onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Date Retour Prévue *</label>
                            <input
                                type="date"
                                required
                                value={formData.end_date}
                                onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Description</label>
                        <div className="input-affix-wrapper">
                            <AlignLeft size={16} className="input-icon-left" />
                            <textarea
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Détails ou description..."
                                rows={2}
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="cancel-btn" onClick={onClose}>
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="submit-btn pro-submit"
                            disabled={loading}
                            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                        >
                            {loading ? 'Planification...' : 'Confirmer la Planification'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
