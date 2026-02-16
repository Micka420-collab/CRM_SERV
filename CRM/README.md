# 🖥️ ITStock - Système de Gestion d'Inventaire IT Premium

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)
![SQLite](https://img.shields.io/badge/SQLite-3-blueviolet?style=for-the-badge&logo=sqlite)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Une plateforme CRM et d'inventaire informatique complète, ultra-moderne et sécurisée.**

</div>

---

## 📋 Table des matières

- [✨ Fonctionnalités Clés](#-fonctionnalités-clés)
- [🏗️ Architecture et Technologies](#️-architecture-et-technologies)
- [🚀 Installation et Démarrage](#-installation-et-démarrage)
- [📂 Structure du Projet](#-structure-du-projet)
- [🔐 Sécurité et Permissions](#-sécurité-et-permissions)
- [🎨 Interface et Gamification](#-interface-et-gamification)
- [🔌 API Endpoints](#-api-endpoints)

---

## ✨ Fonctionnalités Clés

### 📊 Tableau de bord Intelligent

- Supervision en temps réel des indicateurs critiques (produits en rupture, matériels prêtés).
- Visualisation de données via des graphiques interactifs (consommation de stock, répartition par catégorie).
- Journal d'activité récent pour un suivi rapide des opérations.

### 📦 Gestion d'Inventaire Avancée

- Système CRUD complet pour le matériel avec gestion des photos et QR Codes.
- Alertes automatiques de stock bas configurables par produit.
- Importation et Exportation massive via fichiers CSV.
- Organisation granulaire par catégories (Matériel, Consommables, Logiciels, etc.).

### 📱 Gestion de la Flotte Téléphonique

- Suivi précis des téléphones mobiles (TLP ID, Numéro de série, IMEID).
- Attribution nominative aux employés par département.
- État de santé du parc (Neuf, Usé, Hors service).

### 💻 Centre de Prêts PC

- Flux de prêt/retour simplifié avec calendrier interactif.
- Vue journalière détaillée pour la gestion des sorties de matériel.
- Gestion des réservations futures pour les nouveaux arrivants ou événements.
- Mode "Remastering" pour le suivi de la préparation technique des postes.

### 🛠️ Gestion des Applications (Nouveau)

- **Inventaire Logiciel** : Enregistrement structuré des installations (Dossier, Machine, Utilisateur).
- **Liste Noire** : Détection et blocage des logiciels interdits avec popups d'alerte en temps réel.
- **Flexibilité** : Édition complète des enregistrements et gestion des dates personnalisées d'installation.
- **Reporting** : Export CSV dédié pour les réunions et audits logiciels.

---

## 🏗️ Architecture et Technologies

Le logiciel repose sur une architecture **Client-Serveur** moderne avec une séparation stricte des responsabilités.

### Stack Technique

- **Frontend** :
  - **React 18** (Vite) pour une interface ultra-rapide.
  - **Lucide React** pour une iconographie moderne.
  - **Context API** pour la gestion globale des états (Thème, Auth, Langue, Gamification).
- **Backend** :
  - **Node.js & Express** pour une API REST robuste.
  - **SQLite** pour une base de données portable, performante et sans configuration complexe.
- **Design** :
  - **Vanilla CSS** avec un système de variables poussé pour un multi-thématisation (Glassmorphism, Néon, Mode Sombre).
  - Animations fluides via CSS Keyframes.

---

## 🚀 Installation et Démarrage

### Prérequis

- Node.js (v18+)
- npm (v9+)

### Installation Rapide

```bash
# 1. Installation des dépendances
npm install
npm run install-all

# 2. Lancement simultané (Frontend + Backend)
npm start
```

_Le frontend sera disponible sur `http://localhost:5173` et le backend sur `http://localhost:3000`._

---

## 📂 Structure du Projet

```
CRM/
├── client/                 # Interface React (Vite)
│   ├── src/
│   │   ├── components/     # Modals, Tableaux, Layout premium
│   │   ├── context/        # Logique globale (Auth, XP, Thèmes)
│   │   ├── pages/          # Vues principales (Dashboard, Inventory, Apps)
│   │   └── utils/          # Calculs de permissions et formatage
├── server/                 # API Express
│   ├── index.js            # Routes et logique métier
│   ├── database.js         # Schéma SQLite et migrations auto
│   └── inventory.db        # Fichier de base de données (SQLite)
├── package.json            # Scripts de gestion monorepo
└── README.md               # Documentation
```

---

## 🔐 Sécurité et Permissions

### Système de Permissions Granulaire

Le logiciel implémente plus de **30 permissions** réparties en 7 groupes, permettant de définir des rôles sur-mesure (Lecteur, Hotliner, Technicien, Administrateur).

### Sécurité Réseau & Data

- **Authentification JWT** avec tokens sécurisés et expiration automatique.
- **Rate Limiting** : Protection contre les attaques par force brute (Auto-blocage d'IP).
- **Audit Logs** : Chaque action sensible (suppression, modification admin) est tracée avec l'IP de l'auteur.
- **Confirmation Premium** : Les actions destructrices (suppression) sont protégées par des modals de confirmation personnalisés.

---

## 🎨 Interface et Gamification

### Expérience Utilisateur Premium

- **Glassmorphism** : Effets de transparence et flou d'arrière-plan.
- **Thèmes Dynamiques** : Light, Dark, Dim, Néon, Vaporwave.
- **Interactive Tutorial** : Guidage pas à pas pour les nouveaux utilisateurs via Driver.js.

### Système de Progression

- **XP & Levels** : Gagnez de l'expérience en enregistrant des installations ou en gérant l'inventaire.
- **Badges** : Débloquez des récompenses visuelles pour vos succès.
- **Easter Eggs** : Mode Terminal secret et mini-jeu Snake intégré !

---

## 🔌 API Endpoints (Résumé)

| Module               | Méthode      | Endpoint                          | Action                  |
| -------------------- | ------------ | --------------------------------- | ----------------------- |
| **Authentification** | `POST`       | `/api/login`                      | Connexion & Token       |
| **Inventaire**       | `GET/POST`   | `/api/products`                   | Gestion des stocks      |
| **Applications**     | `PUT/DELETE` | `/api/software/installations/:id` | Gestion logicielle      |
| **Prêts**            | `POST`       | `/api/loan-pcs/:id/loan`          | Enregistrement de prêt  |
| **Sécurité**         | `GET`        | `/api/admin/blocked-ips`          | Monitoring des blocages |

---

<div align="center">

**ITStock** - Développé pour une gestion informatique sans friction.  
_Performance | Élégance | Sécurité_

</div>
