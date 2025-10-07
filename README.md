# Rack-O Multiplayer Game

Un joc multijugador modern del clàssic Rack-O construït amb Firebase, Tailwind CSS i ES6 Modules.

## 🎮 Característiques

- **Multijugador en temps real** (2-4 jugadors)
- **Arquitectura modular** amb ES6 modules
- **Accessibilitat millorada** (WCAG AA compliance)
- **So i vibració** amb desbloqueig adequat per a mòbils
- **Persistència offline** amb sincronització multi-pestanya
- **Regles de seguretat** robustes a Firebase
- **Rate limiting** integrat
- **Interfície responsiva** amb Tailwind CSS

## 🚀 Instal·lació i desplegament

### Desplegament a GitHub Pages

1. **Clona o descarrega** els arxius del projecte
2. **Configura Firebase:**
   - Crea un nou projecte a [Firebase Console](https://console.firebase.google.com/)
   - Activa Authentication (Anonymous) i Firestore Database
   - Copia la configuració del projecte i substitueix `FIREBASE_SETTINGS` a `js/firebase.js`
3. **Publica les regles de seguretat** de `firestore.rules` a la teva base de dades
4. **Puja els arxius** al teu repositori de GitHub
5. **Activa GitHub Pages** a la configuració del repositori

### Desenvolupament local

```bash
# Clona el repositori
git clone [url-del-repositori]
cd rack-o-multiplayer

# Instal·la les dependències (opcional, per a eines de build)
npm install

# Serveix localment (opció 1: Python)
python3 -m http.server 8000

# Serveix localment (opció 2: Node.js)
npm run serve

# Serveix amb live-reload per desenvolupament
npm run dev
```

## 📁 Estructura del projecte

```
rack-o-multiplayer/
├── index.html              # Pàgina principal
├── js/
│   ├── app.js              # Punt d'entrada principal
│   ├── firebase.js         # Configuració Firebase
│   ├── game-core.js        # Lògica central del joc
│   ├── game-logic.js       # Gestió d'estat i Firestore
│   ├── sound.js            # Web Audio API
│   └── ui.js               # Funcions de renderitzat
├── firestore.rules         # Regles de seguretat
├── package.json            # Configuració del projecte
└── README.md              # Aquest arxiu
```

## 🎯 Millores implementades

### 1. Arquitectura modular
- **Separació de responsabilitats** en diferents mòduls
- **Tree shaking** habilitat per optimitzar el bundle
- **Imports/exports** clars i mantenibles

### 2. Seguretat i rendiment
- **Regles Firestore** amb rate limiting (1 escriptura/segon)
- **Validació atòmica** en transaccions
- **Persistència offline** amb suport multi-pestanya
- **Gestió d'inactivitat** (5 minuts timeout)

### 3. Experiència d'usuari
- **Colors accessibles** (contrast ≥4.5:1)
- **Mode alt contrast** disponible
- **So i vibració** amb desbloqueig segur per mòbils
- **Notificacions** de torn i victòria

### 4. Algoritmes optimitzats
- **Fisher-Yates shuffle** per barrejar cartes
- **Detecció de seqüències** eficient
- **Càlcul de puntuació** precís segons regles oficials

## 🔧 Configuració de Firebase

1. **Substitueix la configuració** a `js/firebase.js`:
```javascript
const FIREBASE_SETTINGS = {
    apiKey: "la-teva-api-key",
    authDomain: "el-teu-project.firebaseapp.com",
    projectId: "el-teu-project-id",
    // ... resta de configuració
};
```

2. **Publica les regles** de `firestore.rules` a la consola de Firebase

3. **Activa Authentication Anonymous** a la consola de Firebase

## 🧪 Testing

```bash
# Executar tests unitaris
npm test

# Linting del codi
npm run lint

# Build per producció
npm run build
```

## 🎮 Com jugar

1. **Crea o uneix-te** a una partida amb un codi de 4 dígits
2. **Organitza les teves cartes** en ordre ascendent (1-60)
3. **Agafa cartes** del munt o descart en el teu torn
4. **Reemplaça cartes** al teu atril strategicament
5. **Crida "Rack-O"** quan tinguis totes les cartes en ordre!

### Regles especials
- **2 jugadors**: Cal tenir una seqüència de 3 cartes consecutives per guanyar
- **3-4 jugadors**: Només cal tenir ordre ascendent
- **Puntuació**: 75 punts per Rack-O + bonus per seqüències consecutives

## 📱 Suport de dispositius

- **Desktop**: Chrome, Firefox, Safari, Edge
- **Mobile**: iOS Safari, Chrome Mobile, Firefox Mobile
- **Tablets**: Suport complet amb interfície responsiva

## 🤝 Contribucions

Les contribucions són benvingudes! Si us plau:

1. Fes fork del projecte
2. Crea una branch per la teva feature (`git checkout -b feature/amazing-feature`)
3. Commit els canvis (`git commit -m 'Add amazing feature'`)
4. Push a la branch (`git push origin feature/amazing-feature`)
5. Obre un Pull Request

## 📄 Llicència

Aquest projecte està sota llicència MIT - veure l'arxiu [LICENSE](LICENSE) per detalls.

## 🙏 Agraïments

- **Hasbro/Winning Moves** per les regles originals del Rack-O
- **Firebase Team** per la plataforma backend
- **Tailwind CSS** per el framework d'estils
- **Lucide Icons** per les icones

---

Fet amb ❤️ des de Rubí, Catalunya