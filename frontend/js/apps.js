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
 *   kind         'web' | 'native' | 'group'
 *                  web    -> otwiera url w domyślnej przeglądarce
 *                  native -> uruchamia command (Command::new().spawn()) bezpośrednio
 *                  group  -> otwiera picker z listy children (każdy child to osobny URL)
 *   url          string  (kind:'web')    adres URL do otwarcia
 *   command      string  (kind:'web', opcjonalne) komenda serwera do uruchomienia gdy URL offline (tylko localhost)
 *                string  (kind:'native') komenda do uruchomienia (musi być w PATH)
 *   children     []obj   (kind:'group')  lista celów podmenu; każdy child:
 *                             { id, title, icon, url }
 *                             url childa może być nadpisany w Ustawieniach
 *                             (klucz localStorage: grejem-hub-url-<parentId>-<childId>)
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
    tags: ['stream deck', 'hid', 'usb', 'audio', 'hotkey', 'potencjometry', 'led', 'macro', 'stm32'],
    status: 'unknown'
  },
  {
    id: 'home-lab',
    title: 'Home Lab Control',
    subtitle: 'Centrum serwerów domowych',
    description: 'Nakładka na infrastrukturę Home Lab: Proxmox, Portainer, Homepage i Grafana. Kliknij, aby wybrać cel.',
    icon: 'server',
    accent: '#3CFFB0',
    kind: 'group',
    children: [
      { id: 'proxmox',  title: 'Proxmox VE', icon: 'server',            url: 'https://192.168.1.10:8006/' },
      { id: 'portainer',title: 'Portainer',  icon: 'box',               url: 'http://127.0.0.1:9000/' },
      { id: 'homepage', title: 'Homepage',   icon: 'layout-dashboard',  url: 'http://127.0.0.1:3002/' },
      { id: 'grafana',  title: 'Grafana',    icon: 'activity',          url: 'http://127.0.0.1:3000/' }
    ],
    tags: ['homelab', 'server', 'docker', 'proxmox', 'infra', 'monitoring', 'vps', 'portainer', 'grafana', 'homepage'],
    status: 'unknown'
  },
  {
    id: 'docs',
    title: 'Dokumentacja GREJEM',
    subtitle: 'Wiki i specyfikacje techniczne',
    description: 'Centralne repozytorium wiedzy: architektura, protokoły HID, schematy, przewodniki instalacji.',
    icon: 'book-open',
    accent: '#FFB13C',
    kind: 'web',
    url: 'http://127.0.0.1:8000/',
    tags: ['docs', 'wiki', 'spec', 'architektura', 'protokol', 'pdf', 'manual'],
    status: 'auto'
  },
  {
    id: 'github',
    title: 'Repozytorium GitHub',
    subtitle: 'Kod źródłowy ekosystemu',
    description: 'Wszystkie projekty GREJEM INDUSTRIES: firmware, aplikacje desktopowe, panele webowe, instalatory.',
    icon: 'github',
    accent: '#9B5CFF',
    kind: 'web',
    url: 'https://github.com/GrejemIndustries',
    tags: ['github', 'git', 'repo', 'source', 'opensource', 'mirror'],
    status: 'online'
  },
  {
    id: 'grejem-website',
    title: 'GREJEM 3D',
    subtitle: 'Strona internetowa',
    description: 'Oficjalna strona GREJEM 3D — grejem3d.pl.',
    icon: 'globe',
    accent: '#2DD4FF',
    kind: 'web',
    url: 'https://grejem3d.pl/',
    tags: ['website', 'strona', 'grejem3d', 'www', '3d'],
    status: 'online'
  }
];
