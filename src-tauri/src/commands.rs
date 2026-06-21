//! GREJEM-OS HUB — backend commands exposed to the frontend via Tauri IPC.

use std::net::{SocketAddr, TcpStream, ToSocketAddrs};
use std::process::{Command, Stdio};
use std::time::Duration;

pub const GREJEM_OS_URL: &str = "http://127.0.0.1:8080/";

pub fn launch_app_inner(command: String, args: Vec<String>) -> Result<(), String> {
    Command::new(&command)
        .args(&args)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Nie udalo sie uruchomic '{}': {}", command, e))?;
    Ok(())
}

pub fn open_url_inner(url: String) -> Result<(), String> {
    open::that(&url).map_err(|e| format!("Nie udalo sie otworzyc '{}': {}", url, e))
}

pub fn probe_url_inner(url: String) -> bool {
    let parsed = match url::Url::parse(&url) {
        Ok(u) => u,
        Err(_) => return false,
    };
    let host = parsed.host_str().unwrap_or("127.0.0.1");
    let port = parsed.port_or_known_default().unwrap_or(80);
    let addr = format!("{}:{}", host, port);
    let socket: Option<SocketAddr> = addr.to_socket_addrs().ok().and_then(|mut it| it.next());
    match socket {
        Some(s) => TcpStream::connect_timeout(&s, Duration::from_millis(2500)).is_ok(),
        None => false,
    }
}

#[tauri::command]
pub fn launch_app(command: String, args: Vec<String>) -> Result<(), String> {
    launch_app_inner(command, args)
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    open_url_inner(url)
}

#[tauri::command]
pub fn probe_url(url: String) -> bool {
    probe_url_inner(url)
}

#[tauri::command]
pub fn app_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
pub fn is_autostart_enabled(app: tauri::AppHandle) -> bool {
    use tauri_plugin_autostart::ManagerExt;
    app.autolaunch().is_enabled().unwrap_or(false)
}

#[tauri::command]
pub fn set_autostart(app: tauri::AppHandle, enabled: bool) -> Result<bool, String> {
    use tauri_plugin_autostart::ManagerExt;
    let mgr = app.autolaunch();
    let res = if enabled { mgr.enable() } else { mgr.disable() };
    res.map_err(|e| e.to_string())?;
    Ok(mgr.is_enabled().unwrap_or(enabled))
}

#[tauri::command]
pub fn minimize_window(app: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.minimize();
    }
}

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) {
    use tauri::Manager;
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}
