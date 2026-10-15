import { useEffect, useState } from "react";
import { fetchLiveEsportsData } from "../services/esportsMedia";

export function useEsportsMedia() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    let active = true;
    fetchLiveEsportsData().then((next) => {
      if (active) setBanners(Array.isArray(next) ? next : []);
    });
    return () => {
      active = false;
    };
  }, []);

  return banners;
}
