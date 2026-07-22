# Domotique — tableau de bord ESP32

Page GitHub Pages statique et responsive affichant les 50 dernières mesures envoyées par un ESP32. L’humidité est facultative : un DS18B20 seul affiche la température et son graphique.

## Exemple ESP32 DS18B20

Voir [`esp32_ds18b20.ino`](esp32_ds18b20.ino) pour un exemple complet Wi-Fi, OneWire, DallasTemperature et HTTPClient. Renseignez localement `WIFI_SSID`, `WIFI_PASSWORD`, `WORKER_URL` et éventuellement `API_KEY`; ne committez jamais ces valeurs.

Les données sont lues depuis l’endpoint public Cloudflare Worker :

`https://api-esp32.jeremypaquotdesign.workers.dev/mesures`

La page n’utilise que HTML, CSS et JavaScript. Chart.js est chargé depuis un CDN pour le graphique. Aucune clé d’écriture n’est présente dans le dépôt.

## Tester localement

Un petit serveur local est recommandé, car il reproduit mieux le fonctionnement de GitHub Pages qu’une ouverture directe du fichier HTML.

Avec Python 3, depuis le dossier du projet :

```bash
python -m http.server 8000
```

Puis ouvrir [http://localhost:8000](http://localhost:8000).

Il est également possible d’utiliser l’extension **Live Server** de Visual Studio Code.

## Activer GitHub Pages

1. Ouvrir le dépôt sur GitHub.
2. Aller dans **Settings** puis **Pages**.
3. Dans **Build and deployment**, choisir **Deploy from a branch** comme source.
4. Sélectionner la branche `main` et le dossier `/(root)`.
5. Cliquer sur **Save**.
6. Attendre une à deux minutes, puis ouvrir `https://jeremypaquot.github.io/Domotique/`.

Tous les assets utilisent des chemins relatifs, ce qui permet à la page de fonctionner sous le chemin de projet `/Domotique/`.

## Configuration

L’adresse de l’API est définie au début de `app.js` :

```js
const API_URL = "https://api-esp32.jeremypaquotdesign.workers.dev/mesures";
```

Le rafraîchissement automatique est réglé à 30 secondes. Le site appelle uniquement la route publique `GET /mesures`. La clé secrète `API_KEY`, utilisée par l’ESP32 pour écrire dans l’API, doit rester exclusivement dans l’ESP32 et dans les secrets Cloudflare.
