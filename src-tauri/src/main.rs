#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

use std::env;
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, WindowEvent};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn toggle_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .invoke_handler(tauri::generate_handler![
            commands::launch_app,
            commands::open_url,
            commands::probe_url,
            commands::app_version,
            commands::is_autostart_enabled,
            commands::set_autostart,
            commands::minimize_window,
            commands::hide_window,
        ])
        .setup(|app| {
            let grejem = MenuItem::with_id(app, "grejem", "Grejem-OS", true, None::<&str>)?;
            let deck = MenuItem::with_id(app, "deck", "Simple Deck V2", true, None::<&str>)?;
            let sep1 = PredefinedMenuItem::separator(app)?;
            let show_item = MenuItem::with_id(app, "show", "Pokaz okno", true, None::<&str>)?;
            let autostart_enabled = app.autolaunch().is_enabled().unwrap_or(false);
            let autostart = CheckMenuItem::with_id(
                app,
                "autostart",
                "Uruchom z systemem",
                true,
                autostart_enabled,
                None::<&str>,
            )?;
            let autostart_handle = autostart.clone();
            let sep2 = PredefinedMenuItem::separator(app)?;
            let quit = MenuItem::with_id(app, "quit", "Zakoncz", true, None::<&str>)?;

            let menu = Menu::with_items(
                app,
                &[
                    &grejem,
                    &deck,
                    &sep1,
                    &show_item,
                    &autostart,
                    &sep2,
                    &quit,
                ],
            )?;

            let icon = app
                .default_window_icon()
                .cloned()
                .expect("brak domyslnej ikony okna");

            TrayIconBuilder::with_id("main-tray")
                .icon(icon)
                .tooltip("GREJEM-OS HUB")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "show" => show_main_window(app),
                    "grejem" => {
                        if let Err(e) = commands::open_url_inner(commands::GREJEM_OS_URL.to_string()) {
                            eprintln!("[hub] grejem-os open error: {e}");
                        }
                    }
                    "deck" => {
                        if let Err(e) = commands::launch_app_inner("grejem-os".to_string(), vec![]) {
                            eprintln!("[hub] deck launch error: {e}");
                        }
                    }
                    "autostart" => {
                        let mgr = app.autolaunch();
                        let now = !mgr.is_enabled().unwrap_or(false);
                        let res = if now { mgr.enable() } else { mgr.disable() };
                        if let Err(e) = res {
                            eprintln!("[hub] autostart toggle error: {e}");
                        }
                        let _ = autostart_handle.set_checked(now);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        toggle_main_window(tray.app_handle());
                    }
                })
                .build(app)?;

            if env::args().any(|a| a == "--minimized") {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("blad podczas uruchamiania GREJEM-OS HUB");
}
