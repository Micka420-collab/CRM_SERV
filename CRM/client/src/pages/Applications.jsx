import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { useGamification } from '../context/GamificationContext';
import Modal from '../components/Modal';
import { Search, Plus, Trash2, AlertOctagon, History, ShieldAlert, Monitor, User, ClipboardList, CheckCircle, Edit3, Download, Calendar } from 'lucide-react';
import { hasPermission } from '../utils/permissions';

export default function Applications() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { addXp } = useGamification() || { addXp: () => { } };

    const [installations, setInstallations] = useState([]);
    const [blacklist, setBlacklist] = useState([]);
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [catalogSearch, setCatalogSearch] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [showBlacklistModal, setShowBlacklistModal] = useState(false);
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [blacklistedMatch, setBlacklistedMatch] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingInstallation, setEditingInstallation] = useState(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteItem, setDeleteItem] = useState(null);
    const [toast, setToast] = useState(null);

    const [newInstallation, setNewInstallation] = useState({
        dossier_number: '',
        user_name: '',
        machine_name: '',
        software_name: '',
        installed_at: new Date().toISOString().split('T')[0],
        notes: '',
        license_required: false
    });

    const [newBlacklist, setNewBlacklist] = useState({
        name: '',
        status: 'Interdit',
        comments: ''
    });

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [instRes, blackRes] = await Promise.all([
                axios.get('/api/software/installations'),
                axios.get('/api/software/blacklist')
            ]);
            setInstallations(instRes.data);
            setBlacklist(blackRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching application data", error);
            setLoading(false);
        }
    };

    const handleCatalogSearch = async (val) => {
        setCatalogSearch(val);
        setNewInstallation({ ...newInstallation, software_name: val });
        if (val.length > 2) {
            try {
                const res = await axios.get(`/api/software/catalog?search=${val}`);
                setCatalog(res.data);
            } catch (e) {
                console.error(e);
            }
        } else {
            setCatalog([]);
        }
    };

    const handleAddInstallation = async (e) => {
        e.preventDefault();

        // Check against blacklist
        const match = blacklist.find(b => 
            b.name.toLowerCase().trim() === newInstallation.software_name.toLowerCase().trim()
        );

        if (match) {
            setBlacklistedMatch(match);
            setShowWarningModal(true);
            return;
        }

        try {
            const res = await axios.post('/api/software/installations', newInstallation);
            setInstallations([res.data, ...installations]);
            setShowAddModal(false);
            setNewInstallation({ 
                dossier_number: '', 
                user_name: '', 
                machine_name: '', 
                software_name: '', 
                installed_at: new Date().toISOString().split('T')[0],
                notes: '',
                license_required: false 
            });
            setCatalogSearch('');
            setCatalog([]);
            addXp(10, 'Nouvelle installation enregistrée');
            showToast('Installation enregistrée avec succès', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Erreur lors de l'enregistrement", 'error');
        }
    };

    const handleEditInstallation = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`/api/software/installations/${editingInstallation.id}`, editingInstallation);
            setInstallations(installations.map(i => i.id === editingInstallation.id ? editingInstallation : i));
            setShowEditModal(false);
            showToast('Installation mise à jour', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Erreur lors de la mise à jour", 'error');
        }
    };

    const handleDeleteInstallation = (inst) => {
        setDeleteItem({ type: 'installation', data: inst });
        setShowDeleteConfirm(true);
    };

    const confirmDelete = async () => {
        if (!deleteItem) return;

        try {
            if (deleteItem.type === 'installation') {
                await axios.delete(`/api/software/installations/${deleteItem.data.id}`);
                setInstallations(installations.filter(i => i.id !== deleteItem.data.id));
                showToast('Installation supprimée', 'success');
            } else if (deleteItem.type === 'blacklist') {
                await axios.delete(`/api/software/blacklist/${deleteItem.data.id}`);
                setBlacklist(blacklist.filter(b => b.id !== deleteItem.data.id));
                showToast('Logiciel retiré de la liste noire', 'success');
            }
            setShowDeleteConfirm(false);
            setDeleteItem(null);
        } catch (error) {
            showToast("Erreur lors de la suppression", 'error');
        }
    };

    const exportToCSV = () => {
        const headers = ["Dossier", "Utilisateur", "Machine", "Logiciel", "Date", "Notes"];
        const rows = filteredInstallations.map(i => [
            i.dossier_number,
            i.user_name,
            i.machine_name,
            i.software_name,
            new Date(i.installed_at).toLocaleDateString('fr-FR'),
            i.notes?.replace(/\\n/g, ' ') || ''
        ]);

        let csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\\n"
            + rows.map(r => r.map(cell => `"${cell || ''}"`).join(",")).join("\\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `installations_crm_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleAddBlacklist = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post('/api/software/blacklist', newBlacklist);
            setBlacklist([...blacklist, res.data]);
            setNewBlacklist({ name: '', status: 'Interdit', comments: '' });
            showToast('Logiciel ajouté à la liste noire', 'success');
        } catch (error) {
            showToast(error.response?.data?.error || "Erreur", 'error');
        }
    };

    const handleDeleteBlacklist = (item) => {
        setDeleteItem({ type: 'blacklist', data: item });
        setShowDeleteConfirm(true);
    };

    const filteredInstallations = installations.filter(i =>
        i.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.machine_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.software_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.dossier_number?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="applications-page page-container">
            <div className="page-header">
                <h1 className="page-title">
                    <Monitor size={28} className="header-icon" />
                    Gestion des Applications
                </h1>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {hasPermission(user, 'blacklist_manage') && (
                        <button className="add-btn blacklist-access-btn" onClick={() => setShowBlacklistModal(true)}>
                            <ShieldAlert size={20} className="icon-pulse" />
                            Logiciels Interdits
                        </button>
                    )}
                    {(hasPermission(user, 'history_export') || user?.role === 'admin') && (
                        <button className="secondary-btn" onClick={exportToCSV} style={{ padding: '0.8rem 1.2rem' }}>
                            <Download size={20} />
                            Exporter
                        </button>
                    )}
                    {hasPermission(user, 'software_add') && (
                        <button className="add-btn primary-gradient-btn" onClick={() => setShowAddModal(true)}>
                            <Plus size={20} className="icon-rotate" />
                            Enregistrer Installation
                        </button>
                    )}
                </div>
            </div>

            <div className="search-bar-container">
                <div className="search-bar">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Rechercher par utilisateur, machine, logiciel ou numéro de dossier..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {loading ? <div className="loading-spinner">Chargement...</div> : (
                <div className="installations-table-wrapper card-premium">
                    <div className="table-header">
                        <h2><History size={20} /> Historique des Installations</h2>
                        <span className="count-badge">{filteredInstallations.length} entrées</span>
                    </div>
                    <table className="pro-table">
                        <thead>
                            <tr>
                                <th>Dossier</th>
                                <th>Utilisateur</th>
                                <th>Machine</th>
                                <th>Logiciel</th>
                                <th>Licence</th>
                                <th>Date</th>
                                <th>Notes</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInstallations.map(inst => (
                                <tr key={inst.id}>
                                    <td className="font-mono">{inst.dossier_number}</td>
                                    <td>
                                        <div className="flex-center">
                                            <User size={14} style={{ marginRight: '8px', opacity: 0.7 }} />
                                            {inst.user_name}
                                        </div>
                                    </td>
                                    <td>{inst.machine_name}</td>
                                    <td className="font-bold">{inst.software_name}</td>
                                    <td>
                                        {inst.license_required === 1 || inst.license_required === true ? (
                                            <span className="license-badge warning">Requise</span>
                                        ) : (
                                            <span className="license-badge ok">Non requise</span>
                                        )}
                                    </td>
                                    <td className="text-secondary">{new Date(inst.installed_at).toLocaleDateString()}</td>
                                    <td className="text-secondary text-sm italic">{inst.notes}</td>
                                     <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            {hasPermission(user, 'software_edit') && (
                                                <button 
                                                    className="icon-btn-edit" 
                                                    onClick={() => { setEditingInstallation(inst); setShowEditModal(true); }}
                                                    title="Modifier"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            )}
                                            {hasPermission(user, 'software_delete') && (
                                                <button 
                                                    className="icon-btn-delete" 
                                                    onClick={() => handleDeleteInstallation(inst)}
                                                    title="Supprimer"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredInstallations.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="empty-row">Aucun historique trouvé</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Installation Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouvelle Installation" size="md">
                <form onSubmit={handleAddInstallation} className="pro-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Numéro de dossier</label>
                            <input
                                required
                                value={newInstallation.dossier_number}
                                onChange={e => setNewInstallation({ ...newInstallation, dossier_number: e.target.value })}
                                placeholder="Ex: TICKET-2024-001"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nom de la personne</label>
                            <input
                                required
                                value={newInstallation.user_name}
                                onChange={e => setNewInstallation({ ...newInstallation, user_name: e.target.value })}
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nom de la machine (Host)</label>
                            <input
                                required
                                value={newInstallation.machine_name}
                                onChange={e => setNewInstallation({ ...newInstallation, machine_name: e.target.value })}
                                placeholder="Ex: PC-ORL-001"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date d'installation</label>
                            <input
                                type="date"
                                required
                                value={newInstallation.installed_at}
                                onChange={e => setNewInstallation({ ...newInstallation, installed_at: e.target.value })}
                            />
                        </div>
                        <div className="form-group dropdown-container">
                            <label>Logiciel à installer</label>
                            <input
                                required
                                value={catalogSearch}
                                onChange={e => handleCatalogSearch(e.target.value)}
                                placeholder="Rechercher..."
                                autoComplete="off"
                            />
                            {catalog.length > 0 && (
                                <div className="custom-dropdown">
                                    {catalog.map(item => (
                                        <div 
                                            key={item.id} 
                                            className="dropdown-item"
                                            onClick={() => {
                                                setNewInstallation({ ...newInstallation, software_name: item.name });
                                                setCatalogSearch(item.name);
                                                setCatalog([]);
                                            }}
                                        >
                                            <strong>{item.name}</strong>
                                            <small>{item.description}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="form-group mt-1">
                        <label>Notes / Remarques</label>
                        <textarea
                            value={newInstallation.notes}
                            onChange={e => setNewInstallation({ ...newInstallation, notes: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <ShieldAlert size={20} color={newInstallation.license_required ? '#ef4444' : '#94a3b8'} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Licence requise</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Cocher si une licence spécifique est nécessaire pour cette installation</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={newInstallation.license_required}
                                    onChange={e => setNewInstallation({ ...newInstallation, license_required: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" onClick={() => setShowAddModal(false)} className="secondary-btn">Annuler</button>
                        <button type="submit" className="primary-btn">Enregistrer</button>
                    </div>
                </form>
            </Modal>

            {/* Forbidden Warning Modal */}
            <Modal isOpen={showWarningModal} onClose={() => setShowWarningModal(false)} title="Logiciel Interdit !" size="md">
                <div className="warning-modal-content">
                    <div className="warning-header">
                        <div className="warning-icon-wrapper">
                            <AlertOctagon size={48} className="warning-icon" />
                        </div>
                        <h2 className="warning-title">Logiciel non autorisé</h2>
                    </div>
                    
                    <div className="warning-details">
                        <p>Le logiciel <strong>{blacklistedMatch?.name}</strong> figure dans la liste des logiciels interdits.</p>
                        <div className="warning-reason-card">
                            <div className="reason-label">
                                <ShieldAlert size={16} />
                                <span>Statut : {blacklistedMatch?.status}</span>
                            </div>
                            {blacklistedMatch?.comment && (
                                <div className="reason-text">
                                    <ClipboardList size={16} />
                                    <span>{blacklistedMatch.comment}</span>
                                </div>
                            )}
                        </div>
                        <p className="warning-footer-text">L'installation de ce logiciel n'est pas autorisée sur le parc informatique.</p>
                    </div>

                    <div className="modal-footer mt-2">
                        <button onClick={() => setShowWarningModal(false)} className="primary-btn danger-btn">C'est compris</button>
                    </div>
                </div>
            </Modal>

            {/* Edit Installation Modal */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Modifier l'Installation" size="md">
                <form onSubmit={handleEditInstallation} className="pro-form">
                    <div className="form-grid">
                        <div className="form-group">
                            <label>Numéro de dossier</label>
                            <input
                                required
                                value={editingInstallation?.dossier_number || ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, dossier_number: e.target.value })}
                                placeholder="Ex: TICKET-2024-001"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nom de la personne</label>
                            <input
                                required
                                value={editingInstallation?.user_name || ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, user_name: e.target.value })}
                                placeholder="Ex: Jean Dupont"
                            />
                        </div>
                        <div className="form-group">
                            <label>Nom de la machine (Host)</label>
                            <input
                                required
                                value={editingInstallation?.machine_name || ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, machine_name: e.target.value })}
                                placeholder="Ex: PC-INV-01"
                            />
                        </div>
                        <div className="form-group">
                            <label>Date d'installation</label>
                            <input
                                type="date"
                                required
                                value={editingInstallation?.installed_at ? new Date(editingInstallation.installed_at).toISOString().split('T')[0] : ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, installed_at: e.target.value })}
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Logiciel (Nom précis)</label>
                            <input
                                required
                                value={editingInstallation?.software_name || ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, software_name: e.target.value })}
                                placeholder="Ex: Adobe Acrobat DC"
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: 'span 2' }}>
                            <label>Notes complémentaires</label>
                            <textarea
                                value={editingInstallation?.notes || ''}
                                onChange={e => setEditingInstallation({ ...editingInstallation, notes: e.target.value })}
                                placeholder="Détails de l'installation, licence..."
                                rows={3}
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                            <ShieldAlert size={20} color={editingInstallation?.license_required ? '#ef4444' : '#94a3b8'} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Licence requise</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Modifier le statut de la licence pour cette installation</div>
                            </div>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={editingInstallation?.license_required || false}
                                    onChange={e => setEditingInstallation({ ...editingInstallation, license_required: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="secondary-btn" onClick={() => setShowEditModal(false)}>Annuler</button>
                        <button type="submit" className="primary-btn">Enregistrer les modifications</button>
                    </div>
                </form>
            </Modal>

            {/* Blacklist Management Modal */}
            <Modal isOpen={showBlacklistModal} onClose={() => setShowBlacklistModal(false)} title="Gestion des Logiciels Interdits" size="lg">
                <div className="blacklist-container">
                    <form onSubmit={handleAddBlacklist} className="blacklist-add-form mb-2">
                        <div className="form-section-title">
                            <AlertOctagon size={20} />
                            <h3>Ajouter une interdiction</h3>
                        </div>
                        <div className="form-row-modern">
                            <div className="input-modern-group">
                                <label>Nom du logiciel</label>
                                <input
                                    required
                                    placeholder="Ex: uTorrent, AnyDesk..."
                                    value={newBlacklist.name}
                                    onChange={e => setNewBlacklist({ ...newBlacklist, name: e.target.value })}
                                />
                            </div>
                            <div className="input-modern-group">
                                <label>Statut</label>
                                <select
                                    value={newBlacklist.status}
                                    onChange={e => setNewBlacklist({ ...newBlacklist, status: e.target.value })}
                                >
                                    <option value="Interdit">🚫 Interdit</option>
                                    <option value="Bloqué">🔒 Bloqué</option>
                                    <option value="Déconseillé">⚠️ Déconseillé</option>
                                </select>
                            </div>
                        </div>
                        <div className="input-modern-group mt-1">
                            <label>Motif ou Remarques</label>
                            <textarea
                                placeholder="Pourquoi ce logiciel est-il interdit ?"
                                value={newBlacklist.comments}
                                onChange={e => setNewBlacklist({ ...newBlacklist, comments: e.target.value })}
                                rows={2}
                            />
                        </div>
                        <button type="submit" className="modern-submit-btn">
                            <Plus size={20} />
                            <span>Ajouter à la liste</span>
                        </button>
                    </form>

                    <div className="blacklist-list">
                        <h3>Liste Actuelle ({blacklist.length})</h3>
                        <div className="blacklist-grid">
                            {blacklist.map(item => (
                                <div key={item.id} className="blacklist-item">
                                    <div className="item-main">
                                        <span className={`status-badge ${item.status.toLowerCase()}`}>{item.status}</span>
                                        <strong>{item.name}</strong>
                                    </div>
                                    {item.comments && <p className="item-notes">{item.comments}</p>}
                                    <button className="delete-btn-ghost" onClick={() => handleDeleteBlacklist(item)}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Confirmer la suppression" size="sm">
                <div className="delete-confirm-content">
                    <div className="delete-icon-pulse">
                        <Trash2 size={40} className="red-icon" />
                    </div>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '1.5rem' }}>Êtes-vous sûr ?</h3>
                    <p style={{ opacity: 0.8, marginBottom: '1.5rem' }}>
                        Cette action est irréversible. Vous allez supprimer {deleteItem?.type === 'installation' ? "l'installation" : "le logiciel"} :
                    </p>
                    <div className="delete-item-preview">
                        <strong>{deleteItem?.type === 'installation' ? deleteItem?.data?.software_name : deleteItem?.data?.name}</strong>
                        {deleteItem?.type === 'installation' && <span> ({deleteItem?.data?.user_name})</span>}
                    </div>
                    <div className="delete-modal-actions">
                        <button type="button" className="secondary-btn" onClick={() => setShowDeleteConfirm(false)}>Annuler</button>
                        <button type="button" className="primary-btn danger-btn" onClick={confirmDelete}>Supprimer définitivement</button>
                    </div>
                </div>
            </Modal>

            {/* Toast Notification */}
            {toast && (
                <div className={`toast-notification ${toast.type}`}>
                    {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertOctagon size={20} />}
                    {toast.message}
                </div>
            )}

            <style jsx>{`
                .applications-page { padding: 2rem; }
                .search-bar-container { margin-bottom: 2rem; }
                .flex-center { display: flex; alignItems: center; }
                .font-mono { font-family: monospace; color: var(--primary-color); }
                .font-bold { font-weight: 700; }
                .text-secondary { color: var(--text-muted); }
                .text-sm { font-size: 0.875rem; }
                .italic { font-style: italic; }
                .dropdown-container { position: relative; }
                .custom-dropdown {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                    z-index: 1000;
                    max-height: 200px;
                    overflow-y: auto;
                }
                .dropdown-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    display: flex;
                    flex-direction: column;
                    border-bottom: 1px solid var(--border-color);
                }
                .dropdown-item:hover { background: var(--hover-color); }
                .dropdown-item small { color: var(--text-muted); margin-top: 2px; }
                
                .card-premium {
                    background: var(--card-bg);
                    border: 1px solid var(--border-color);
                    border-radius: 18px;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                    overflow: hidden;
                    transition: all 0.4s ease;
                    margin-top: 1.5rem;
                }
                .card-premium:hover {
                    box-shadow: 0 20px 50px rgba(0,0,0,0.15);
                    transform: translateY(-2px);
                }

                .table-header {
                    padding: 2.5rem 2rem 1.5rem;
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1.25rem;
                }

                .delete-confirm-content {
                    text-align: center;
                    padding: 1rem 0;
                }
                .delete-icon-pulse {
                    width: 80px;
                    height: 80px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    animation: pulse-red 2s infinite;
                }
                .red-icon { color: #ef4444; }
                .delete-item-preview {
                    background: var(--bg-color-alt);
                    padding: 1rem;
                    border-radius: 12px;
                    margin: 1.5rem 0;
                    border-left: 4px solid #ef4444;
                    font-size: 1.1rem;
                }
                .delete-modal-actions {
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    margin-top: 2rem;
                }
                .danger-btn {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
                    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3) !important;
                }
                .danger-btn:hover {
                    box-shadow: 0 8px 25px rgba(220, 38, 38, 0.5) !important;
                    transform: translateY(-2px);
                }

                @keyframes pulse-red {
                    0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                    70% { box-shadow: 0 0 0 20px rgba(239, 68, 68, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                }

                .table-header h2 {
                    margin: 0;
                    font-size: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                }
                
                .blacklist-item {
                    background: var(--card-bg-light);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1rem;
                    position: relative;
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }

                .status-badge {
                    padding: 2px 8px;
                    border-radius: 4px;
                    font-size: 0.7rem;
                    font-weight: bold;
                    margin-right: 8px;
                    text-transform: uppercase;
                }
                .status-badge.interdit { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.2); }
                .status-badge.bloqué { background: rgba(15, 23, 42, 0.1); color: #0f172a; border: 1px solid rgba(15, 23, 42, 0.2); }
                .status-badge.déconseillé { background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2); }
                
                [data-theme='dark'] .status-badge.bloqué { background: rgba(255, 255, 255, 0.1); color: #f8fafc; border: 1px solid rgba(255, 255, 255, 0.2); }

                .blacklist-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 1.25rem;
                    margin-top: 1.5rem;
                }
                
                .pro-table thead th {
                    background: var(--bg-color-alt);
                    color: var(--text-color);
                    font-weight: 700;
                    text-transform: uppercase;
                    font-size: 0.725rem;
                    letter-spacing: 1.5px;
                    padding: 1.5rem 1.5rem;
                    opacity: 0.7;
                    border-bottom: 2px solid var(--border-color);
                }

                .pro-table tbody td {
                    padding: 1.25rem 1.5rem;
                }
                
                .pro-table tr {
                    transition: all 0.2s ease;
                }
                
                .pro-table tbody tr:hover {
                    background: rgba(var(--primary-rgb), 0.05);
                }

                .count-badge {
                    background: linear-gradient(135deg, var(--primary-color) 0%, #2563eb 100%);
                    color: white;
                    padding: 5px 14px;
                    border-radius: 50px;
                    font-size: 0.75rem;
                    font-weight: 800;
                    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
                    text-transform: lowercase;
                    display: inline-flex;
                    align-items: center;
                }

                .modal-footer {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1.5rem;
                    padding: 2rem 0 1rem;
                    border-top: 1px solid var(--border-color);
                    margin-top: 2rem;
                }
                .license-badge {
                    padding: 4px 10px;
                    border-radius: 20px;
                    font-size: 0.7rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    display: inline-block;
                }
                .license-badge.warning {
                    background: rgba(239, 68, 68, 0.1);
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.2);
                }
                .license-badge.ok {
                    background: rgba(34, 197, 94, 0.1);
                    color: #22c55e;
                    border: 1px solid rgba(34, 197, 94, 0.2);
                }
                .item-notes { font-size: 0.75rem; color: var(--text-muted); margin-top: 5px; }
                .delete-btn-ghost {
                    position: absolute;
                    top: 0.5rem;
                    right: 0.5rem;
                    background: transparent;
                    border: none;
                    color: var(--text-muted);
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }
                .delete-btn-ghost:hover { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
                
                .blacklist-access-btn {
                    background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
                    position: relative;
                    overflow: hidden;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    color: white;
                    box-shadow: 0 4px 15px rgba(168, 85, 247, 0.3);
                    font-weight: 700;
                    letter-spacing: 0.5px;
                }
                
                .blacklist-access-btn:hover {
                    box-shadow: 0 8px 25px rgba(168, 85, 247, 0.5);
                    transform: translateY(-3px) scale(1.02);
                    filter: brightness(1.1);
                }

                .blacklist-access-btn::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        to bottom right,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.3) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    transform: rotate(45deg);
                    transition: all 0.6s;
                    opacity: 0;
                }

                .blacklist-access-btn:hover::after {
                    animation: btn-shine 1.2s forwards;
                    opacity: 1;
                }
                
                .primary-gradient-btn {
                    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                    color: white;
                    box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3);
                    font-weight: 700;
                    position: relative;
                    overflow: hidden;
                }
                
                .primary-gradient-btn:hover {
                    box-shadow: 0 8px 25px rgba(37, 99, 235, 0.5);
                    transform: translateY(-3px) scale(1.02);
                }

                .primary-gradient-btn::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    left: -50%;
                    width: 200%;
                    height: 200%;
                    background: linear-gradient(
                        to bottom right,
                        rgba(255, 255, 255, 0) 0%,
                        rgba(255, 255, 255, 0.3) 50%,
                        rgba(255, 255, 255, 0) 100%
                    );
                    transform: rotate(45deg);
                    transition: all 0.6s;
                    opacity: 0;
                }

                .primary-gradient-btn:hover::after {
                    animation: btn-shine 1s forwards;
                    opacity: 1;
                }

                .icon-rotate {
                    transition: transform 0.4s ease;
                }
                .primary-gradient-btn:hover .icon-rotate {
                    transform: rotate(90deg);
                }

                .icon-pulse {
                    transition: transform 0.2s ease;
                }
                .blacklist-access-btn:hover .icon-pulse {
                    animation: icon-bounce 0.5s infinite;
                }

                @keyframes icon-bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-3px); }
                }

                .icon-btn-edit, .icon-btn-delete {
                    background: var(--bg-color-alt);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                .icon-btn-edit { color: var(--primary-color); }
                .icon-btn-edit:hover { 
                    background: rgba(59, 130, 246, 0.1); 
                    transform: scale(1.1);
                    border-color: var(--primary-color);
                }
                
                .icon-btn-delete { color: #ef4444; }
                .icon-btn-delete:hover { 
                    background: rgba(239, 68, 68, 0.1); 
                    transform: scale(1.1);
                    border-color: #ef4444;
                }

                .icon-btn-edit, .icon-btn-delete {
                    background: var(--bg-color-alt);
                    border: 1px solid var(--border-color);
                    border-radius: 8px;
                    padding: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                
                .icon-btn-edit { color: var(--primary-color); }
                .icon-btn-edit:hover { 
                    background: rgba(59, 130, 246, 0.1); 
                    transform: scale(1.1);
                    border-color: var(--primary-color);
                }
                
                .icon-btn-delete { color: #ef4444; }
                .icon-btn-delete:hover { 
                    background: rgba(239, 68, 68, 0.1); 
                    transform: scale(1.1);
                    border-color: #ef4444;
                }

                .form-row-modern {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .input-modern-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .input-modern-group label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-color);
                    opacity: 0.8;
                }
                
                .modern-submit-btn {
                    width: 100%;
                    padding: 0.75rem;
                    margin-top: 1rem;
                    background: var(--primary-color);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                
                .modern-submit-btn:hover {
                    filter: brightness(1.1);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px var(--shadow-color);
                }
                
                .form-section-title {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin-bottom: 1.5rem;
                    color: #ef4444;
                }
                
                .form-section-title h3 { margin: 0; font-size: 1.1rem; }

                .warning-modal-content {
                    text-align: center;
                    padding: 1rem;
                }
                .warning-header {
                    margin-bottom: 2rem;
                }
                .warning-icon-wrapper {
                    width: 80px;
                    height: 80px;
                    background: rgba(239, 68, 68, 0.1);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1.5rem;
                    border: 2px solid rgba(239, 68, 68, 0.2);
                }
                .warning-icon { color: #ef4444; }
                .warning-title { 
                    font-size: 1.5rem; 
                    color: var(--text-color); 
                    margin: 0;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }
                .warning-details {
                    color: var(--text-secondary);
                    font-size: 1.05rem;
                    line-height: 1.6;
                }
                .warning-reason-card {
                    background: var(--bg-color);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                    padding: 1.25rem;
                    margin: 1.5rem 0;
                    text-align: left;
                    border-left: 4px solid #ef4444;
                }
                .reason-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    color: #ef4444;
                    font-weight: 700;
                    font-size: 0.9rem;
                    text-transform: uppercase;
                    margin-bottom: 0.5rem;
                }
                .reason-text {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                    color: var(--text-color);
                    font-size: 0.95rem;
                    font-style: italic;
                }
                .warning-footer-text {
                    font-weight: 600;
                    color: var(--text-color);
                    font-size: 0.9rem;
                }
                .danger-btn {
                    background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                    box-shadow: 0 4px 15px rgba(239, 68, 68, 0.3);
                }
                .danger-btn:hover {
                    box-shadow: 0 6px 20px rgba(239, 68, 68, 0.4);
                }
            `}</style>
        </div>
    );
}
