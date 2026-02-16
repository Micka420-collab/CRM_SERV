# Création du Repo GitHub

## Étape 1 : Créer sur GitHub

1. Allez sur https://github.com/new
2. **Repository name** : `CRM_SERV`
3. **Description** : (optionnel) ITStock License Server API
4. **Public** ou **Private** : au choix
5. **❌ NE PAS cocher** "Add a README file"
6. **❌ NE PAS cocher** "Add .gitignore"
7. **❌ NE PAS cocher** "Choose a license"
8. Cliquez sur **"Create repository"**

## Étape 2 : Pousser le code

Dans votre terminal (dans le dossier `itstock-api`) :

```bash
# Vérifier que vous êtes dans le bon dossier
cd itstock-api
pwd
# Doit afficher : .../CRM/itstock-api

# Initialiser git
git init

# Ajouter tous les fichiers
git add .

# Créer le commit
git commit -m "Initial commit - ITStock License Server API"

# Connecter au repo GitHub
git remote add origin https://github.com/Micka420-collab/CRM_SERV.git

# Renommer la branche
git branch -M main

# Pousser sur GitHub
git push -u origin main
```

## Étape 3 : Vérifier sur GitHub

Allez sur https://github.com/Micka420-collab/CRM_SERV

Vous devez voir tous vos fichiers :
- src/
- prisma/
- Dockerfile
- package.json
- etc.

## ⚠️ Problèmes courants

### "fatal: not a git repository"
```bash
cd itstock-api
git init
```

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/Micka420-collab/CRM_SERV.git
```

### "failed to push some refs"
```bash
git pull origin main --rebase
git push -u origin main
```

### Authentification GitHub
Si on demande un token :
1. Allez sur https://github.com/settings/tokens
2. Generate new token (classic)
3. Cochez "repo"
4. Copiez le token et utilisez-le comme mot de passe

## Prochaine étape

Une fois le repo créé, allez sur Railway :
https://railway.app

New Project → Deploy from GitHub repo → CRM_SERV
