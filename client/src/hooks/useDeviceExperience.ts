import { useEffect, useState } from "react";
import { deviceConnectionProfile, installPromptRecentlyDismissed, notificationPermissionState, recordInstallDismissal, type DeviceNetworkState, type InstallPromptEvent } from "@/lib/mobileExperience";

export function useNetworkState() {
  const [state, setState] = useState<DeviceNetworkState>(() => typeof navigator === "undefined" || navigator.onLine ? "online" : "offline");
  useEffect(() => { const online = () => setState("online"); const offline = () => setState("offline"); window.addEventListener("online", online); window.addEventListener("offline", offline); return () => { window.removeEventListener("online", online); window.removeEventListener("offline", offline); }; }, []);
  return state;
}

export function usePwaInstall() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null); const [installed, setInstalled] = useState(() => typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches); const [dismissed, setDismissed] = useState(() => installPromptRecentlyDismissed());
  useEffect(() => { const capture = (event: Event) => { event.preventDefault(); if (!installPromptRecentlyDismissed()) setPrompt(event as InstallPromptEvent); }; const installedHandler = () => { setInstalled(true); setPrompt(null); }; window.addEventListener("beforeinstallprompt", capture); window.addEventListener("appinstalled", installedHandler); return () => { window.removeEventListener("beforeinstallprompt", capture); window.removeEventListener("appinstalled", installedHandler); }; }, []);
  const install = async () => { if (!prompt) return "unsupported" as const; await prompt.prompt(); const choice = await prompt.userChoice; if (choice.outcome !== "accepted") { recordInstallDismissal(); setDismissed(true); } setPrompt(null); return choice.outcome; };
  const dismiss = () => { recordInstallDismissal(); setDismissed(true); setPrompt(null); };
  return { canInstall: Boolean(prompt) && !dismissed && !installed, installed, dismissed, install, dismiss };
}

export function useDeviceCapabilities() { const [connection, setConnection] = useState(() => typeof navigator === "undefined" ? { saveData: false, effectiveType: "unknown" } : deviceConnectionProfile()); const [notification, setNotification] = useState(() => notificationPermissionState()); useEffect(() => { const refresh = () => { setConnection(deviceConnectionProfile()); setNotification(notificationPermissionState()); }; window.addEventListener("online", refresh); return () => window.removeEventListener("online", refresh); }, []); return { connection, notification, microphone: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia), camera: typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia) }; }
