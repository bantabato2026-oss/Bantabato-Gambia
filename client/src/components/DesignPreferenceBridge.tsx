import { useEffect } from "react";
import { lowBandwidthEnabled } from "@/lib/mobileExperience";

export function DesignPreferenceBridge() {
  useEffect(() => {
    const apply = () => { document.documentElement.dataset.lowBandwidth = lowBandwidthEnabled() ? "true" : "false"; };
    apply();
    window.addEventListener("storage", apply);
    window.addEventListener("bantabato:low-bandwidth-change", apply);
    return () => { window.removeEventListener("storage", apply); window.removeEventListener("bantabato:low-bandwidth-change", apply); };
  }, []);
  return null;
}
