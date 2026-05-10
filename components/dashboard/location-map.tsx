"use client";

import { useEffect, useRef } from "react";
import maplibregl, { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

const OSM_RASTER_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

const DEFAULT_CENTER: [number, number] = [0, 20];
const DEFAULT_ZOOM = 1.2;
const PINNED_ZOOM = 14;

export interface LocationMapProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  height?: number;
}

export function LocationMap({ lat, lng, onChange, height = 220 }: LocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OSM_RASTER_STYLE,
      center: lat != null && lng != null ? [lng, lat] : DEFAULT_CENTER,
      zoom: lat != null && lng != null ? PINNED_ZOOM : DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });

    mapRef.current = map;

    map.on("click", (ev) => {
      const { lng: nLng, lat: nLat } = ev.lngLat;
      onChange(nLat, nLng);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (lat == null || lng == null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    if (!markerRef.current) {
      const marker = new maplibregl.Marker({ draggable: true, color: "#f97316" })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on("dragend", () => {
        const ll = marker.getLngLat();
        onChange(ll.lat, ll.lng);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    map.flyTo({ center: [lng, lat], zoom: PINNED_ZOOM, duration: 600 });
  }, [lat, lng, onChange]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-lg border border-gray-200 overflow-hidden"
      style={{ height }}
    />
  );
}
