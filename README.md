# wesplit 🎲

This project is a **fully-featured Progressive Web App (PWA)** designed to help users create sessions, add elements with custom attributes, and distribute those elements into balanced groups based on customizable constraints.

## ✨ Core Features

### 🗂️ Session Management
- Create, edit, and delete sessions
- Store session data locally using IndexedDB (Dexie.js)
- Fully offline-capable - no internet required
- Multi-language support (EN, FR, ES, DE)

### 📝 Element & Attribute Management
- Add elements (e.g., students, participants) to sessions
- Define custom attributes:
  - **Enum**: Predefined options (e.g., gender, level)
  - **Number**: Numeric values with min/max constraints
  - **Attractive**: Boolean - group similar values together
  - **Repulsive**: Boolean - separate similar values
- Mark attributes as required or optional

### 🎯 Group Distribution
- Randomly distribute elements into a defined number of groups
- Apply intelligent constraints to balance groups by:
  - Enum attributes (e.g., gender balance)
  - Numeric attributes (e.g., average score balance)
  - Boolean attributes (attractive/repulsive)
- Manual adjustments via drag & drop
- Real-time constraint satisfaction feedback
- Multiple distribution algorithms

### 📊 Visualization & Export
- Display group composition in a clean UI
- Visualize distributions with interactive elements
- Drag-and-drop interface for manual adjustments
- Export results to CSV or PDF *(coming soon)*

### 📱 PWA Capabilities
- ✅ **100% Offline Support** - Works without internet
- ✅ **Installable** - Add to Home Screen on any device
- ✅ **Auto-Updates** - Automatic version updates with notifications
- ✅ **Native Feel** - Standalone app experience
- ✅ **Fast Loading** - Instant load times with smart caching
- ✅ **Cross-Platform** - iOS, Android, Desktop

## 💡 Example Use Case

A teacher can create a session for a class, add students as elements, assign gender and average grades as attributes, and generate 6 balanced groups where:

- Gender distribution is uniform across groups
- Group averages are evenly balanced
- Manual adjustments can be made via drag & drop

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:3000` - the PWA features work in development too!

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run serve
```

### Testing

```bash
npm test
```

## 📱 Installing as PWA

### Desktop (Chrome/Edge)
1. Visit the app in your browser
2. Look for the install icon (⊕) in the address bar
3. Click "Install"

### iOS (Safari)
1. Tap Share button (⬆️)
2. Select "Add to Home Screen"

### Android (Chrome)
1. Tap menu (⋮)
2. Select "Install app"

For more details, see [PWA_QUICK_START.md](./PWA_QUICK_START.md)

## 📦 Packages to use in the project

### Routing

- [`@tanstack/react-router`](https://tanstack.com/router) → application routing

### Styling & UI

- [`tailwindcss`](https://tailwindcss.com/) → utility-first CSS framework
- [`shadcn/ui`](https://ui.shadcn.com/) → prebuilt UI components with Tailwind
- [`react-icons`](https://react-icons.github.io/react-icons/) → icon library

### Forms

- [`@react-hook-form`](https://react-hook-form.com/) → form state management & validation

### Charts & Data Visualization

- [`react-charts`](https://react-charts.tanstack.com/) → charting & visualizations

### Tables

- [`@tanstack/table`](https://tanstack.com/table/latest) → charting & visualizations

### Validation

- [`zod`](https://zod.dev/) -> TypeScript-first schema validation with static type inference

### Local DB

- [`indexedDB`](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) -> low-level API for client-side storage
- [`Dexie.js`](https://dexie.org/) -> A Minimalistic Wrapper for IndexedDB

### Package manager

- npm

### Draggable components

- [`dndkit`](https://dndkit.com/) → Drag and drop toolkit

### PWA

- [`vite-plugin-pwa`](https://vite-plugin-pwa.netlify.app/) → PWA plugin for Vite
- [`workbox`](https://developer.chrome.com/docs/workbox/) → Service worker libraries

## 📚 Documentation

- [PWA Quick Start Guide](./PWA_QUICK_START.md) - Get started with PWA features
- [PWA Implementation Details](./PWA_IMPLEMENTATION.md) - Complete technical documentation
- [Database Guide](./src/db/README.md) - IndexedDB and Dexie.js usage
- [Translation Guide](./TRANSLATION_IMPLEMENTATION.md) - Internationalization setup

## 🎯 Browser Support

| Feature | Chrome | Edge | Safari | Firefox | Opera |
|---------|--------|------|--------|---------|-------|
| PWA Install | ✅ 67+ | ✅ 79+ | ✅ 11.1+ | ✅ 98+ | ✅ 54+ |
| Offline Mode | ✅ | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ | ✅ |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is open source and available under the MIT License.
