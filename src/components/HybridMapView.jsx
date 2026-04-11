import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GoogleMap, MarkerF, PolylineF, useJsApiLoader } from "@react-google-maps/api";
import {
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { latLngBounds } from "leaflet";
import "leaflet/dist/leaflet.css";
import { env } from "../config/env";

const mapContainerStyle = { width: "100%", height: "100%" };
const DEFAULT_CENTER = { lat: -33.4372, lng: -70.6506 };

const MAP_OPTIONS = {
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
};

const GOOGLE_ERROR_PATTERNS = [
  "google maps javascript api error",
  "this page can't load google maps correctly",
  "for development purposes only",
  "billingnotenabledmaperror",
  "invalidkeymaperror",
  "referernotallowedmaperror",
  "expiredkeymaperror",
  "overquotamaperror",
  "gm_authfailure",
];

const getGooglePolylineOptions = (segment) => {
  // Allow explicit color override per segment
  if (segment.color) {
    return { strokeColor: segment.color, strokeWeight: 5, strokeOpacity: 0.9, zIndex: 2 };
  }
  switch (segment.status) {
    case "completed":
      return { strokeColor: "#10b981", strokeWeight: 5, strokeOpacity: 1, zIndex: 2 };
    case "in_progress":
      return {
        strokeColor: "#f59e0b",
        strokeWeight: 5,
        strokeOpacity: 1,
        zIndex: 3,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 }, offset: "0", repeat: "12px" }],
      };
    default:
      return { strokeColor: "#94a3b8", strokeWeight: 4, strokeOpacity: 0.5, zIndex: 1 };
  }
};

const getLeafletPolylineOptions = (segment) => {
  // Allow explicit color override per segment
  if (segment.color) {
    return { color: segment.color, weight: 5, opacity: 0.9 };
  }
  switch (segment.status) {
    case "completed":
      return { color: "#10b981", weight: 5, opacity: 1 };
    case "in_progress":
      return { color: "#f59e0b", weight: 5, opacity: 1, dashArray: "8 10" };
    default:
      return { color: "#94a3b8", weight: 4, opacity: 0.5 };
  }
};

const MARKER_PRESETS = {
  green: { color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.9, weight: 2, radius: 9 },
  red:   { color: "#b91c1c", fillColor: "#ef4444", fillOpacity: 0.9, weight: 2, radius: 9 },
  blue:  { color: "#1d4ed8", fillColor: "#2563eb", fillOpacity: 0.85, weight: 2, radius: 8 },
};

const getLeafletMarkerStyle = (marker) => {
  // Allow explicit color preset per marker
  if (marker.markerColor && MARKER_PRESETS[marker.markerColor]) {
    return MARKER_PRESETS[marker.markerColor];
  }
  const iconHint = String(marker?.icon || "").toLowerCase();
  if (iconHint.includes("red")) return MARKER_PRESETS.red;
  return MARKER_PRESETS.blue;
};

const getFallbackMessage = (reason) => {
  switch (reason) {
    case "forced":
      return "Mapa alternativo activo por configuracion.";
    case "missing-key":
      return "Google Maps no tiene API key configurada. Usando OpenStreetMap.";
    case "load-error":
      return "Google Maps no cargo correctamente. Usando OpenStreetMap.";
    case "auth-failure":
      return "Google Maps rechazo la autenticacion. Usando OpenStreetMap.";
    case "runtime-error":
    case "render-error":
      return "Google Maps presento un error en tiempo de ejecucion. Usando OpenStreetMap.";
    case "quota-or-billing":
      return "Google Maps alcanzo un limite o bloqueo de facturacion. Usando OpenStreetMap.";
    default:
      return "Google Maps no esta disponible. Usando OpenStreetMap.";
  }
};

const buildMarkersSignature = (markers) =>
  markers
    .map((marker) => `${marker.id}:${marker.position?.lat}:${marker.position?.lng}:${marker.label || ""}`)
    .join("|");

const buildRouteSegmentsSignature = (routeSegments) =>
  routeSegments
    .map(
      (segment) =>
        `${segment.start?.lat}:${segment.start?.lng}:${segment.end?.lat}:${segment.end?.lng}:${segment.status}`,
    )
    .join("|");

const toLeafletPoint = (point) =>
  point && Number.isFinite(point.lat) && Number.isFinite(point.lng) ? [point.lat, point.lng] : null;

const detectGoogleRuntimeFailure = (container) => {
  if (!container) return false;
  if (container.querySelector(".gm-err-container")) return true;
  const text = (container.textContent || "").toLowerCase();
  return GOOGLE_ERROR_PATTERNS.some((pattern) => text.includes(pattern));
};

function LoadingMapState({ message }) {
  return (
    <div className="size-full flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="size-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-gray-500">{message}</p>
      </div>
    </div>
  );
}

class MapProviderErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function GoogleProviderMap({
  apiKey,
  center,
  zoom,
  markers,
  routeSegments,
  onClick,
  fitToData,
  onFailure,
}) {
  const mapRef = useRef(null);
  const mapHostRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  const markersSignature = useMemo(() => buildMarkersSignature(markers), [markers]);
  const routeSegmentsSignature = useMemo(
    () => buildRouteSegmentsSignature(routeSegments),
    [routeSegments],
  );

  const handleMapClick = (e) => {
    if (onClick && e.latLng) {
      onClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    }
  };

  useEffect(() => {
    if (loadError) {
      onFailure("load-error");
    }
  }, [loadError, onFailure]);

  useEffect(() => {
    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      if (typeof previousAuthFailure === "function") {
        previousAuthFailure();
      }
      onFailure("auth-failure");
    };

    return () => {
      if (typeof previousAuthFailure === "function") {
        window.gm_authFailure = previousAuthFailure;
      } else {
        delete window.gm_authFailure;
      }
    };
  }, [onFailure]);

  useEffect(() => {
    if (!isLoaded || !mapHostRef.current) return undefined;

    const host = mapHostRef.current;
    const inspectMap = () => {
      if (detectGoogleRuntimeFailure(host)) {
        onFailure("quota-or-billing");
      }
    };

    inspectMap();

    const observer = new MutationObserver(inspectMap);
    observer.observe(host, { childList: true, subtree: true, characterData: true });
    const timer = window.setInterval(inspectMap, 1500);

    return () => {
      observer.disconnect();
      window.clearInterval(timer);
    };
  }, [isLoaded, onFailure]);

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
  }, [center, fitToData, isLoaded, markers, markersSignature, routeSegments, routeSegmentsSignature, zoom]);

  if (!isLoaded) {
    return <LoadingMapState message="Cargando Google Maps..." />;
  }

  return (
    <div ref={mapHostRef} className="size-full">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        onClick={handleMapClick}
        options={MAP_OPTIONS}
        onLoad={(map) => {
          mapRef.current = map;
        }}
        onUnmount={() => {
          mapRef.current = null;
        }}
      >
        {routeSegments.map((segment, index) => (
          <PolylineF
            key={`seg-${segment.start?.lat}-${segment.start?.lng}-${segment.end?.lat}-${segment.end?.lng}-${segment.status}-${index}`}
            path={[segment.start, segment.end]}
            options={getGooglePolylineOptions(segment)}
          />
        ))}
        {markers.map((marker) => {
          const googleIcon = marker.markerColor === "green"
            ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
            : marker.icon;
          return (
            <MarkerF
              key={`${marker.id}-${marker.position?.lat}-${marker.position?.lng}-${marker.label || ""}`}
              position={marker.position}
              label={marker.label}
              icon={googleIcon}
              title={marker.title}
              onClick={marker.onClick}
            />
          );
        })}
      </GoogleMap>
    </div>
  );
}

function LeafletMapController({
  center,
  zoom,
  markers,
  routeSegments,
  fitToData,
  onClick,
  markersSignature,
  routeSegmentsSignature,
}) {
  const map = useMap();

  useMapEvents({
    click(event) {
      onClick?.({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  useEffect(() => {
    const points = [];

    markers.forEach((marker) => {
      const point = toLeafletPoint(marker.position);
      if (point) points.push(point);
    });

    routeSegments.forEach((segment) => {
      const start = toLeafletPoint(segment.start);
      const end = toLeafletPoint(segment.end);
      if (start) points.push(start);
      if (end) points.push(end);
    });

    if (fitToData && points.length > 1) {
      map.fitBounds(latLngBounds(points), { padding: [48, 48] });
      return;
    }

    if (fitToData && points.length === 1) {
      map.setView(points[0], Math.max(zoom, 15));
      return;
    }

    const targetCenter = toLeafletPoint(center) || toLeafletPoint(DEFAULT_CENTER);
    map.setView(targetCenter, zoom);
  }, [center, fitToData, map, markersSignature, routeSegmentsSignature, zoom]);

  return null;
}

function LeafletProviderMap({
  center,
  zoom,
  markers,
  routeSegments,
  onClick,
  fitToData,
}) {
  const markersSignature = useMemo(() => buildMarkersSignature(markers), [markers]);
  const routeSegmentsSignature = useMemo(
    () => buildRouteSegmentsSignature(routeSegments),
    [routeSegments],
  );

  const initialCenter = toLeafletPoint(center) || toLeafletPoint(DEFAULT_CENTER);

  return (
    <MapContainer
      center={initialCenter}
      zoom={zoom}
      className="size-full z-0"
      preferCanvas
      zoomControl
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      <LeafletMapController
        center={center}
        zoom={zoom}
        markers={markers}
        routeSegments={routeSegments}
        fitToData={fitToData}
        onClick={onClick}
        markersSignature={markersSignature}
        routeSegmentsSignature={routeSegmentsSignature}
      />

      {routeSegments.map((segment, index) => {
        const start = toLeafletPoint(segment.start);
        const end = toLeafletPoint(segment.end);
        if (!start || !end) return null;
        return (
          <Polyline
            key={`leaflet-seg-${segment.start?.lat}-${segment.start?.lng}-${segment.end?.lat}-${segment.end?.lng}-${segment.status}-${index}`}
            positions={[start, end]}
            pathOptions={getLeafletPolylineOptions(segment)}
          />
        );
      })}

      {markers.map((marker) => {
        const point = toLeafletPoint(marker.position);
        if (!point) return null;
        const markerStyle = getLeafletMarkerStyle(marker);
        const markerText = marker.title || marker.label;
        return (
          <CircleMarker
            key={`${marker.id}-${marker.position?.lat}-${marker.position?.lng}-${marker.label || ""}`}
            center={point}
            pathOptions={markerStyle}
            radius={markerStyle.radius}
            eventHandlers={marker.onClick ? { click: marker.onClick } : undefined}
          >
            {markerText && (
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={0.96}
                permanent={Boolean(marker.label)}
                className="map-marker-tooltip"
              >
                {markerText}
              </Tooltip>
            )}
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export default function HybridMapView({
  center,
  zoom = 13,
  markers = [],
  routeSegments = [],
  onClick,
  fitToData = false,
}) {
  const apiKey = env.googleMapsApiKey;
  const [provider, setProvider] = useState(() =>
    !apiKey || env.forceFallbackMap ? "leaflet" : "google",
  );
  const [fallbackReason, setFallbackReason] = useState(() => {
    if (env.forceFallbackMap) return "forced";
    if (!apiKey) return "missing-key";
    return null;
  });

  const activateFallback = useCallback((reason) => {
    setProvider("leaflet");
    setFallbackReason((current) => current || reason || "google-unavailable");
  }, []);

  useEffect(() => {
    if (env.forceFallbackMap) {
      activateFallback("forced");
      return;
    }
    if (!apiKey) {
      activateFallback("missing-key");
      return;
    }
    setProvider("google");
    setFallbackReason(null);
  }, [apiKey, activateFallback]);

  const providerBadge = provider === "google"
    ? {
        label: "Google Maps",
        className: "border border-gray-200 bg-white/95 text-gray-700 shadow-sm",
      }
    : {
        label: "OpenStreetMap",
        className: "border border-emerald-200 bg-emerald-50/95 text-emerald-700 shadow-sm",
      };

  const safeCenter = center || DEFAULT_CENTER;

  return (
    <div className="size-full relative">
      {provider === "google" ? (
        <MapProviderErrorBoundary resetKey="google" onError={() => activateFallback("render-error")}>
          <GoogleProviderMap
            apiKey={apiKey}
            center={safeCenter}
            zoom={zoom}
            markers={markers}
            routeSegments={routeSegments}
            onClick={onClick}
            fitToData={fitToData}
            onFailure={activateFallback}
          />
        </MapProviderErrorBoundary>
      ) : (
        <LeafletProviderMap
          center={safeCenter}
          zoom={zoom}
          markers={markers}
          routeSegments={routeSegments}
          onClick={onClick}
          fitToData={fitToData}
        />
      )}

      <div className="absolute top-3 right-3 z-[500] pointer-events-none">
        <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${providerBadge.className}`}>
          {providerBadge.label}
        </div>
      </div>

      {provider === "leaflet" && (
        <div className="absolute left-3 bottom-3 z-[500] max-w-[320px]">
          <div className="px-3 py-2 rounded-xl border border-emerald-200 bg-white/95 text-xs text-gray-700 shadow-sm">
            {getFallbackMessage(fallbackReason)}
          </div>
        </div>
      )}
    </div>
  );
}
