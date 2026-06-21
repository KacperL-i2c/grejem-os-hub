/*
 * GREJEM-OS HUB — Rejestr aplikacji (kafelków)
 * ============================================================================
 * Jedyna tablica, którą edytujesz, by dodać/usunąć aplikację w hubie.
 * Każdy obiekt = jeden kafelek. Pola:
 *
 *   id           string  unikalny (bez spacji)
 *   title        string  tytuł aplikacji (duży napis)
 *   subtitle     string  krótki podtytuł / rola
 *   description  string  opis techniczny (1–2 zdania)
 *   icon         string  nazwa ikony Lucide (https://lucide.dev/icons/)
 *   accent       string  kolor akcentu kafelka (HEX) — pojawia się na hover
 *   kind         'web' | 'native' | 'placeholder'
 *                  web         -> otwiera url w nowej karcie
 *                  native      -> próbuje protocol:// + fallback do modalu z komendą
 *                  placeholder -> toast "Wkrótce"
 *   url          string  (kind:'web')    adres URL do otwarcia
 *   command      string  (kind:'web' opcjonalne) komenda serwera do uruchomienia gdy URL offline (tylko localhost)
 *   command      string  (kind:'native') komenda pokazywana w modalu fallback
 *   protocol     string  (kind:'native', opcjonalny) URL scheme, domyślnie 'grejem-os://launch'
 *   tags         []str   słowa kluczowe do filtrowania wyszukiwarką
 *   status       'auto' (sonduj, tylko web) | 'online' | 'offline' | 'unknown' | 'disabled'
 * ============================================================================ */
window.GREJEM_APPS = [
  {
    id: 'grejem-os',
    title: 'Grejem-OS',
    subtitle: 'Panel Farmy Drukarek 3D',
    description: 'Monitorowanie i sterowanie drukarkami Bambu Lab / Creality / Elegoo. Telemetria live przez WebSocket, kolejka wydruków, menedżer G-code.',
    icon: 'printer',
    accent: '#a855f7',
    kind: 'web',
    url: 'http://127.0.0.1:8080/',
    command: 'grejem-os',
    tags: ['drukarki', '3d', 'farm', 'gcode', 'queue', 'bambu', 'elegoo', 'klipper', 'panel'],
    status: 'auto'
  },
  {
    id: 'simple-deck-v2',
    title: 'Simple Deck V2',
    subtitle: 'Stream Deck Configurator',
    description: 'Konfigurator USB HID macro pada: 5 potencjometrów, 4 przyciski, 8-LED VU bar. Profile, hotkeye, sterowanie głośnością aplikacji.',
    icon: 'sliders-horizontal',
    accent: '#2DD4FF',
    kind: 'native',
    command: 'grejem-os',
    protocol: 'grejem-os://launch',
    tags: ['stream deck', 'hid', 'usb', 'audio', 'hotkey', 'potencjometry', 'led', 'macro', 'stm32'],
    status: 'unknown'
  },
  {
    id: 'home-lab',
    title: 'Home Lab Control',
    subtitle: 'Centrum serwerów domowych',
    description: 'Nakładka na infrastrukturę Home Lab: status usług, Docker, Proxmox, monitoring zasobów.',
    icon: 'server',
    accent: '#3CFFB0',
    kind: 'placeholder',
    tags: ['homelab', 'server', 'docker', 'proxmox', 'infra', 'monitoring', 'vps'],
    status: 'disabled'
  },
  {
    id: 'docs',
    title: 'Dokumentacja GREJEM',
    subtitle: 'Wiki i specyfikacje techniczne',
    description: 'Centralne repozytorium wiedzy: architektura, protokoły HID, schematy, przewodniki instalacji.',
    icon: 'book-open',
    accent: '#FFB13C',
    kind: 'placeholder',
    tags: ['docs', 'wiki', 'spec', 'architektura', 'protokol', 'pdf', 'manual'],
    status: 'disabled'
  },
  {
    id: 'github',
    title: 'Repozytorium GitHub',
    subtitle: 'Kod źródłowy ekosystemu',
    description: 'Wszystkie projekty GREJEM INDUSTRIES: firmware, aplikacje desktopowe, panele webowe, instalatory.',
    icon: 'github',
    accent: '#9B5CFF',
    kind: 'placeholder',
    tags: ['github', 'git', 'repo', 'source', 'opensource', 'mirror'],
    status: 'disabled'
  }
];
