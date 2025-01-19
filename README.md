# Objectif Tracker

Une application web pour suivre vos objectifs hebdomadaires et votre progression quotidienne.

## Fonctionnalités

- Création et gestion d'objectifs personnalisés
- Suivi de la progression quotidienne
- Historique complet des objectifs
- Filtrage par catégorie et date
- Interface utilisateur intuitive

## Installation

1. Cloner le dépôt :
```bash
git clone [votre-url-de-depot]
cd objectif-tracker
```

2. Installer les dépendances Python :
```bash
pip install -r requirements.txt
```

3. Lancer le serveur :
```bash
python server.py
```

4. Ouvrir l'application dans votre navigateur :
```
http://localhost:8080
```

## Structure du Projet

- `index.html` : Page principale de l'application
- `historique.html` : Page d'historique des objectifs
- `app.js` : Logique JavaScript principale
- `server.py` : Serveur Python backend
- `data/` : Dossier contenant les fichiers JSON de données
  - `objectifs_master.json` : Liste complète des objectifs
  - `semaines.json` : Progression hebdomadaire des objectifs

## Technologies Utilisées

- Frontend : HTML, JavaScript, Tailwind CSS
- Backend : Python
- Stockage : JSON
