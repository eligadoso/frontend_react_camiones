import { useEffect, useMemo, useRef } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import { env } from "../config/env";

const mapContainerStyle = { width: "100%", height: "100%" };

const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const getPolylineOptions = (status) => {
  switch (status) {
    case "completed":
      return { strokeColor: "#10b981", strokeWeight: 5, strokeOpacity: 1, zIndex: 2 };
    case "in_progress":
      return {
        strokeColor: "#f59e0b", strokeWeight: 5, strokeOpacity: 1, zIndex: 3,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 }, offset: "0", repeat: "12px" }],
      };
    default:
      return { strokeColor: "#94a3b8", strokeWeight: 4, strokeOpacity: 0.5, zIndex: 1 };
  }
};

// useJsApiLoader with a fixed id is a singleton — the script loads once regardless
// of how many GoogleMapView instances are mounted or unmounted across the app.
export default function GoogleMapView({
  center,
  zoom = 13,
  markers = [],
  routeSegments = [],
  onClick,
  fitToData = false,
}) {
  const apiKey = env.googleMapsApiKey;
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey || "",
  });

  const markersSignature = useMemo(
    () =>
      markers
        .map((marker) => `${marker.id}:${marker.position?.lat}:${marker.position?.lng}:${marker.label || ""}`)
        .join("|"),
    [markers],
  );

  const routeSegmentsSignature = useMemo(
    () =>
      routeSegments
        .map(
          (segment) =>
            `${segment.start?.lat}:${segment.start?.lng}:${segment.end?.lat}:${segment.end?.lng}:${segment.status}`,
        )
        .join("|"),
    [routeSegments],
  );

  const handleMapClick = (e) => {
    if (onClick && e.latLng) {
      onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const map = mapRef.current;
    const googleMaps = window.google?.maps;
    if (!googleMaps) return;

    if (fitToData) {
      const bounds = new googleMaps.LatLngBounds();
      let pointsCount = 0;

      markers.forEach((marker) => {
        if (!marker.position) return;
        bounds.extend(marker.position);
        pointsCount += 1;
      });

      routeSegments.forEach((segment) => {
        if (segment.start) {
          bounds.extend(segment.start);
          pointsCount += 1;
        }
        if (segment.end) {
          bounds.extend(segment.end);
          pointsCount += 1;
        }
      });

      if (pointsCount > 1) {
        map.fitBounds(bounds, 48);
        return;
      }

      if (pointsCount === 1) {
        map.panTo(bounds.getCenter());
        map.setZoom(Math.max(zoom, 15));
        return;
      }
    }

    if (center) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [
    center,
    fitToData,
    isLoaded,
    markersSignature,
    routeSegmentsSignature,
    zoom,
    markers,
    routeSegments,
  ]);

  if (!apiKey) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg border border-gray-200 max-w-md">
          <div className="bg-blue-50 p-4 rounded-full w-fit mx-auto mb-4">
            <svg className="size-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Google Maps API Key Requerida</h3>
          <p className="text-sm text-gray-600 mb-4">
            Configura <code className="text-blue-600">VITE_GOOGLE_MAPS_API_KEY</code> en tu archivo <code>.env</code> para ver el mapa.
          </p>
          {markers.length > 0 && (
            <div className="mt-4 text-left space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Puntos configurados:</p>
              {markers.map((m) => (
                <div key={m.id} className="text-xs text-gray-700 bg-gray-50 px-3 py-1.5 rounded">{m.label}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="size-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={zoom}
      onClick={handleMapClick}
      options={MAP_OPTIONS}
      onLoad={(map) => {
        mapRef.current = map;
      }}
    >
      {routeSegments.map((segment, index) => (
        <PolylineF
          key={`seg-${segment.start?.lat}-${segment.start?.lng}-${segment.end?.lat}-${segment.end?.lng}-${segment.status}-${index}`}
          path={[segment.start, segment.end]}
          options={getPolylineOptions(segment.status)}
        />
      ))}
      {markers.map((marker) => (
        <MarkerF
          key={`${marker.id}-${marker.position?.lat}-${marker.position?.lng}-${marker.label || ""}`}
          position={marker.position}
          label={marker.label}
          icon={marker.icon}
          title={marker.title}
          onClick={marker.onClick}
        />
      ))}
    </GoogleMap>
  );
}
