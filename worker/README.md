# Worker IA — liste de courses

Petit service Cloudflare Worker qui reçoit une liste de noms de repas, demande à Claude d'en déduire les ingrédients (regroupés par rayon), et les renvoie à l'appli. Il garde la clé API Anthropic côté serveur — jamais exposée au client.

## Déploiement (une fois)

```bash
cd worker
npm install
npx wrangler login          # ouvre le navigateur pour connecter ton compte Cloudflare
npx wrangler secret put ANTHROPIC_API_KEY   # colle ta clé Anthropic quand demandé
npx wrangler secret put APP_SECRET          # colle une chaîne aléatoire (ex: générée avec `openssl rand -hex 32`)
npx wrangler deploy
```

La dernière commande affiche une URL du type :
```
https://repassemaine-ai-shopping.<ton-compte>.workers.dev
```

## Côté appli

Ajoute dans le `.env` à la racine du projet :
```
EXPO_PUBLIC_AI_WORKER_URL=https://repassemaine-ai-shopping.<ton-compte>.workers.dev
EXPO_PUBLIC_APP_SECRET=<la même chaîne aléatoire que APP_SECRET ci-dessus>
```

Puis redéployer l'appli web (`npx expo export --platform web && firebase deploy --only hosting`) pour que le bouton "Mettre à jour avec l'IA" apparaisse dans l'onglet Courses.

## Mettre à jour le Worker après un changement de code

```bash
cd worker
npx wrangler deploy
```

Pas besoin de refaire `login` ou `secret put` — ces réglages restent en place.
