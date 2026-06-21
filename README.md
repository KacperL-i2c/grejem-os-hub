# GREJEM-OS HUB

Centralny pulpit nawigacyjny (dashboard / launcher) ekosystemu **GREJEM INDUSTRIES**.
Aplikacja desktopowa napisana w **Rust + Tauri v2** — jeden kod, binarki na
**Linux** i **Windows**. Frontend to sprawdzone HTML/CSS/JS (Glassmorphism),
backend w Ruście uruchamia aplikacje natywne i sprawdza reachability usług.

## Co potrafi

- **Grejem-OS** — otwiera `http://127.0.0.1:8080/` w domyślnej przeglądarce + sonduje TCP (realny status online/offline)
- **Simple Deck V2** — uruchamia `grejem-os` bezpośrednio (`Command::new().spawn()` z Rustu — bez protokołu `grejem-os://`, bez modalu)
- **Tray icon** — klik lewym pokaże/ukryje okno; menu: Grejem-OS / Simple Deck V2 / Pokaż okno / autostart / Zakończ
- **Autostart** z systemem (`--minimized` → startuje ukryte w zasobniku)
- **Bezramkowe szklane okno** (`decorations: false`, `transparent: true`) z własnym titlebarem (przeciąganie, min, ukryj-do-tray)
- Glass search, motyw dark/light, zegar, skróty klawiszowe, mikrointerakcje

## Struktura

```
GREJEM-OS HUB/
├── frontend/                 # warstwa UI (HTML/CSS/JS)
│   ├── index.html
│   ├── css/hub.css
│   ├── js/
│   │   ├── apps.js           # ← REJESTR KAFELKÓW (edytuj, by dodać aplikację)
│   │   └── hub.js            # render / filtr / invoke() Tauri / motyw / zegar
│   └── assets/grejem-os-logo.svg
├── src-tauri/                # backend Rust
│   ├── Cargo.toml
│   ├── build.rs
│   ├── tauri.conf.json       # okno, bundle, uprawnienia
│   ├── capabilities/default.json
│   ├── icons/                # wygenerowane (cargo tauri icon)
│   └── src/
│       ├── main.rs           # Builder + tray + close→hide + --minimized
│       └── commands.rs       # launch_app / open_url / probe_url / autostart
└── README.md
```

## Wymagania builda (jednorazowo)

### Linux (Fedora)

```bash
sudo dnf install webkit2gtk4.1-devel gtk3-devel libsoup3-devel \
                 librsvg2-devel clang-devel clang dbus-devel pkgconf-pkg-config
cargo install tauri-cli --version "^2" --locked
```

### Linux (Debian/Ubuntu)

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libsoup-3.0-dev \
                 librsvg2-dev clang libdbus-1-dev pkg-config
cargo install tauri-cli --version "^2" --locked
```

### Windows

Rust (`rustup`) + MSVC Build Tools (Visual Studio Installer → „Desktop development with C++").
WebView2 Runtime jest preinstalowany na Windows 10/11. Tauri CLI:

```powershell
cargo install tauri-cli --version "^2" --locked
```

## Build i uruchomienie

### Tryb deweloperski (hot-reload okna)

```bash
cd "GREJEM-OS HUB"
cargo tauri dev
```

### Pakowanie instalatorów

#### Lokalnie (Linux — `.rpm` + `.AppImage`)

```bash
cargo tauri build
# → src-tauri/target/release/bundle/
#     appimage/grejem-os-hub_1.0.0_amd64.AppImage
#     rpm/grejem-os-hub_1.0.0.x86_64.rpm
```

#### Przez CI (Linux + Windows — wszystkie formaty)

```bash
git tag v1.0.0
git push --tags
```

Workflow `.github/workflows/release.yml` zbuduje na runnerach GitHub:

| OS | Formaty | Pliki |
|---|---|---|
| Ubuntu 22.04 | AppImage + RPM | `*.AppImage`, `*.rpm` |
| Windows | MSI + NSIS | `*_x64_en-US.msi`, `*_x64-setup.exe` |

Artefakty trafią do GitHub Release.

Binarki są per-OS — build Linuksa nie wyprodukuje `.msi` i odwrotnie.
Cross-kompilacja Linux↔Windows jest możliwa ale krucha; dlatego standardem jest CI matrix.

## Dodawanie nowej aplikacji

Edytuj `frontend/js/apps.js` i dopisz obiekt do `window.GREJEM_APPS`. Schema:

```js
{
  id:          'moja-app',
  title:       'Moja Aplikacja',
  subtitle:    'Krótki podtytuł',
  description: 'Opis techniczny.',
  icon:        'cpu',                   // https://lucide.dev/icons/
  accent:      '#3CFFB0',               // HEX, kolor hover
  kind:        'web',                   // 'web' | 'native' | 'placeholder'
  url:         'http://127.0.0.1:9000/',// kind:'web'
  // command:  'moja-app',              // kind:'native' (musi być w PATH)
  tags:        ['tag1', 'tag2'],
  status:      'auto'                   // 'auto' (sonduj, web) | 'online' | 'offline' | 'unknown' | 'disabled'
}
```

- `kind:'web'` → backend woła `open::that(url)` (domyślna przeglądarka)
- `kind:'native'` → backend woła `Command::new(command).spawn()` (bezpośrednio, bez protokołu)
- `status:'auto'` → backend robi `TcpStream::connect_timeout(url, 2.5s)` co 60s

## Skróty klawiszowe

| Klawisz | Akcja |
|---|---|
| `/` | fokus na wyszukiwarkę |
| `Esc` | wyczyść wyszukiwarkę |
| `↑ ↓ ← →` | nawigacja po kafelkach |
| `Home` / `End` | pierwszy / ostatni kafelek |

## Zachowanie okna i zasobnika

- **Zamknij (×)** → ukrywa okno do zasobnika (nie kończy procesu)
- **Tray → lewy klik** → przełącza widoczność okna
- **Tray → Zakończ** → faktycznie kończy aplikację
- **Tray → Uruchom z systemem** → przełącza autostart (desktop entry / rejestr Windows)
- Autostart uruchamia z flagą `--minimized` → okno startuje ukryte

## Regeneracja ikon

Po zmianie `assets/grejem-os-logo.svg` wygeneruj nowy zestaw:

```bash
# zkonwertuj SVG → 1024×1024 PNG (np. rsvg-convert lub inkscape), potem:
cargo tauri icon /path/to/icon-1024.png -o src-tauri/icons
```

## Konwencje

- Design tokens i paleta (`#2DD4FF` cyan / `#9B5CFF` purple / `#FF2EC4` magenta)
  są wspólne z **Simple Deck V2** (`palette.py`) i logo `grejem_os.svg`.
- Typografia: Inter + JetBrains Mono. Ikony: Lucide (CDN).
- UI po polsku, identyfikatory po angielsku — spójne z resztą ekosystemu.

## Licencja

MIT © 2026 GREJEM INDUSTRIES.
