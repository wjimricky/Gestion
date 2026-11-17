import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  APIProvider,
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useAdvancedMarkerRef,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  Navigation,
  Truck,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary } from '../../utils/formatters';
import { ProductionZoneId } from '../../utils/productionZones';

interface RiceLocationPin {
  id: string;
  name: string;
  role: 'basin' | 'hub';
  zoneId?: ProductionZoneId;
  regionLabel: string;
  avgYieldKgHa?: number;
  summary: string;
  position: { lat: number; lng: number };
}

const MADAGASCAR_RICE_PINS: RiceLocationPin[] = [
  {
    id: 'alaotra',
    name: 'Lac Alaotra (Ambatondrazaka)',
    role: 'basin',
    zoneId: 'alaotra',
    regionLabel: 'Alaotra-Mangoro · 1er grenier national',
    avgYieldKgHa: 4300,
    summary: 'Périmètres irrigués SOMALAC, forte collecte HS/BS via RN44.',
    position: { lat: -17.8306, lng: 48.4192 },
  },
  {
    id: 'marovoay',
    name: 'Marovoay (Plaine Betsiboka)',
    role: 'basin',
    zoneId: 'marovoay',
    regionLabel: 'Boeny · Nord-Ouest irrigué',
    avgYieldKgHa: 4000,
    summary: 'Double récolte annuelle majeure sur plaines irriguées.',
    position: { lat: -16.1108, lng: 46.6439 },
  },
  {
    id: 'itasy',
    name: 'Itasy (Miarinarivo / Analavory)',
    role: 'basin',
    zoneId: 'itasy',
    regionLabel: 'Itasy · Axe RN1',
    avgYieldKgHa: 3850,
    summary: 'Proximité directe Antananarivo sur axe bitumé RN1.',
    position: { lat: -19.0014, lng: 46.7525 },
  },
  {
    id: 'vakinankaratra',
    name: 'Vakinankaratra (Antsirabe)',
    role: 'basin',
    zoneId: 'vakinankaratra',
    regionLabel: 'Hautes Terres · Axe RN7',
    avgYieldKgHa: 3300,
    summary: 'Bassin hauts plateaux, fret optimisé sur RN7.',
    position: { lat: -19.8659, lng: 47.0333 },
  },
  {
    id: 'sofia',
    name: 'Sofia (Port-Bergé / Bealanana)',
    role: 'basin',
    zoneId: 'sofia',
    regionLabel: 'Sofia · Nord agricole',
    avgYieldKgHa: 3650,
    summary: 'Bassin excédentaire à fort potentiel en riz de qualité.',
    position: { lat: -15.5333, lng: 47.6167 },
  },
  {
    id: 'tana',
    name: 'Antananarivo (Marchés Anosibe / Behoririka)',
    role: 'hub',
    regionLabel: 'Analamanga · Hub consommation principal',
    summary: 'Principal centre de gros et distribution urbaine de riz blanchi.',
    position: { lat: -18.8792, lng: 47.5079 },
  },
  {
    id: 'toamasina',
    name: 'Port de Toamasina',
    role: 'hub',
    regionLabel: 'Atsinanana · Façade portuaire Est',
    summary: 'Hub logistique côtier Est (RN2) et référence riz importé.',
    position: { lat: -18.1492, lng: 49.4023 },
  },
];

function computeHaversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinDLng * sinDLng;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 1.25);
}

function isQuotaError(err: unknown): boolean {
  const msg =
    typeof err === 'string'
      ? err
      : err instanceof Error
      ? err.message
      : JSON.stringify(err || '');
  const upper = msg.toUpperCase();
  return (
    upper.includes('429') ||
    upper.includes('RESOURCE_EXHAUSTED') ||
    upper.includes('OVER_QUERY_LIMIT') ||
    upper.includes('QUOTA')
  );
}

type AdvancedMarkerInstance = NonNullable<ReturnType<typeof useAdvancedMarkerRef>[1]>;

interface AdvancedMarkerWithRefProps {
  pin: RiceLocationPin;
  isOrigin: boolean;
  isDest: boolean;
  onMarkerClick: (
    pin: RiceLocationPin,
    marker: AdvancedMarkerInstance
  ) => void;
}

const AdvancedMarkerWithRef: React.FC<AdvancedMarkerWithRefProps> = ({
  pin,
  isOrigin,
  isDest,
  onMarkerClick,
}) => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const isHub = pin.role === 'hub';

  return (
    <AdvancedMarker
      ref={markerRef}
      position={pin.position}
      title={pin.name}
      zIndex={isOrigin || isDest ? 100 : isHub ? 50 : 10}
      onClick={() => {
        if (marker) onMarkerClick(pin, marker);
      }}
    >
      <Pin
        background={
          isOrigin
            ? '#4f46e5'
            : isDest
            ? '#0d9488'
            : isHub
            ? '#f59e0b'
            : '#10b981'
        }
        borderColor="#ffffff"
        glyphColor="#ffffff"
      />
    </AdvancedMarker>
  );
};

interface CorridorRouteLayerProps {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  onRouteMetrics: (metrics: {
    distanceKm: number;
    durationText: string;
    source: 'routes_v2' | 'estimation';
  }) => void;
}

const CorridorRouteLayer: React.FC<CorridorRouteLayerProps> = ({
  origin,
  destination,
  onRouteMetrics,
}) => {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const mapsLib = useMapsLibrary('maps');
  const coreLib = useMapsLibrary('core');

  useEffect(() => {
    if (!map || !routesLib || !mapsLib || !coreLib) return;
    let cancelled = false;
    let activePolyline: { setMap: (m: unknown) => void } | null = null;

    const computeCorridor = async () => {
      try {
        const routeLibTyped = routesLib as unknown as {
          Route: {
            new (): { computeRoutes: (req: unknown) => Promise<any> };
            computeRoutes?: (req: unknown) => Promise<any>;
            decode: (encoded: string) => Array<{ lat: number; lng: number }>;
          };
          TravelMode: { DRIVING: unknown };
        };

        const request = {
          origin,
          destination,
          travelMode: routeLibTyped.TravelMode.DRIVING,
        };

        const response =
          typeof routeLibTyped.Route.computeRoutes === 'function'
            ? await routeLibTyped.Route.computeRoutes(request)
            : await new routeLibTyped.Route().computeRoutes(request);
        if (cancelled) return;

        const route = response?.routes?.[0] as
          | {
              polyline?: { encodedPolyline?: string };
              viewport?: {
                southwest: { lat: number; lng: number };
                northeast: { lat: number; lng: number };
              };
              distanceMeters?: number;
              durationMillis?: number;
              legs?: Array<{ distanceMeters?: number; durationMillis?: number }>;
            }
          | undefined;

        if (route?.polyline?.encodedPolyline) {
          const path = routeLibTyped.Route.decode(route.polyline.encodedPolyline);
          activePolyline = new mapsLib.Polyline({
            path,
            geodesic: true,
            strokeColor: '#4f46e5',
            strokeOpacity: 0.92,
            strokeWeight: 4,
            map,
          });
        } else {
          activePolyline = new mapsLib.Polyline({
            path: [origin, destination],
            geodesic: true,
            strokeColor: '#4f46e5',
            strokeOpacity: 0.75,
            strokeWeight: 3,
            map,
          });
        }

        if (route?.viewport) {
          const bounds = new coreLib.LatLngBounds(
            route.viewport.southwest,
            route.viewport.northeast
          );
          map.fitBounds(bounds);
        }

        const rawMeters =
          route?.distanceMeters ?? route?.legs?.[0]?.distanceMeters ?? null;
        const distanceKm =
          typeof rawMeters === 'number' && rawMeters > 0
            ? Math.round(rawMeters / 1000)
            : computeHaversineKm(origin, destination);

        const rawMillis =
          route?.durationMillis ?? route?.legs?.[0]?.durationMillis ?? null;
        const durationHours =
          typeof rawMillis === 'number' && rawMillis > 0
            ? rawMillis / 3600000
            : distanceKm / 48;
        const hrs = Math.floor(durationHours);
        const mins = Math.round((durationHours - hrs) * 60);
        const durationText = hrs > 0 ? `${hrs}h ${mins}min` : `${mins} min`;

        onRouteMetrics({
          distanceKm,
          durationText,
          source: rawMeters ? 'routes_v2' : 'estimation',
        });
      } catch (err) {
        if (cancelled) return;
        if (isQuotaError(err)) {
          window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
        }
        const fallbackKm = computeHaversineKm(origin, destination);
        const hrs = Math.floor(fallbackKm / 48);
        const mins = Math.round(((fallbackKm / 48) - hrs) * 60);
        activePolyline = new mapsLib.Polyline({
          path: [origin, destination],
          geodesic: true,
          strokeColor: '#f59e0b',
          strokeOpacity: 0.85,
          strokeWeight: 3,
          map,
        });
        onRouteMetrics({
          distanceKm: fallbackKm,
          durationText: `${hrs}h ${mins}min (est.)`,
          source: 'estimation',
        });
      }
    };

    void computeCorridor();

    return () => {
      cancelled = true;
      if (activePolyline) {
        activePolyline.setMap(null);
      }
    };
  }, [map, routesLib, mapsLib, coreLib, origin, destination, onRouteMetrics]);

  return null;
};

export const MadagascarRiceMapSection: React.FC = () => {
  const {
    assumptions,
    model,
    activeProject,
    updateLogistics,
    applyProductionRegion,
    notify,
  } = useFinancial();

  const [apiKey, setApiKey] = useState<string>(
    () => (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''
  );
  const [loadingKey, setLoadingKey] = useState<boolean>(!apiKey);

  const [originId, setOriginId] = useState<string>('alaotra');
  const [destId, setDestId] = useState<string>('tana');
  const [selectedPin, setSelectedPin] = useState<RiceLocationPin | null>(null);
  const [selectedMarker, setSelectedMarker] =
    useState<AdvancedMarkerInstance | null>(null);
  const [routeMetrics, setRouteMetrics] = useState<{
    distanceKm: number;
    durationText: string;
    source: 'routes_v2' | 'estimation';
  } | null>(null);

  // Maps Grounding query via backend Gemini endpoint
  const [groundingQuery, setGroundingQuery] = useState<string>(
    'Coopératives rizicoles, entrepôts et axes routiers autour du Lac Alaotra et Antananarivo'
  );
  const [groundingLoading, setGroundingLoading] = useState<boolean>(false);
  const [groundingError, setGroundingError] = useState<string>('');
  const [groundingReply, setGroundingReply] = useState<string>('');
  const [groundingLinks, setGroundingLinks] = useState<
    Array<{ title: string; uri: string; snippet?: string }>
  >([]);

  useEffect(() => {
    if (apiKey) {
      setLoadingKey(false);
      return;
    }
    let active = true;
    fetch('/api/maps/config')
      .then((r) => r.json())
      .then((data: { apiKey?: string }) => {
        if (!active) return;
        if (data?.apiKey) setApiKey(data.apiKey);
      })
      .catch(() => {
        // Fallback if endpoint unavailable
      })
      .finally(() => {
        if (active) setLoadingKey(false);
      });
    return () => {
      active = false;
    };
  }, [apiKey]);

  const originPin = useMemo(
    () => MADAGASCAR_RICE_PINS.find((p) => p.id === originId) ?? MADAGASCAR_RICE_PINS[0],
    [originId]
  );
  const destPin = useMemo(
    () => MADAGASCAR_RICE_PINS.find((p) => p.id === destId) ?? MADAGASCAR_RICE_PINS[5],
    [destId]
  );

  const basins = useMemo(
    () => MADAGASCAR_RICE_PINS.filter((p) => p.role === 'basin'),
    []
  );
  const hubs = useMemo(
    () => MADAGASCAR_RICE_PINS.filter((p) => p.role === 'hub'),
    []
  );

  const handleRouteMetrics = useCallback(
    (metrics: {
      distanceKm: number;
      durationText: string;
      source: 'routes_v2' | 'estimation';
    }) => {
      setRouteMetrics(metrics);
    },
    []
  );

  const handleMarkerClick = useCallback(
    (pin: RiceLocationPin, marker: AdvancedMarkerInstance) => {
      setSelectedPin(pin);
      setSelectedMarker(marker);
    },
    []
  );

  const handleApplyCorridorDistance = () => {
    const km = routeMetrics?.distanceKm ?? computeHaversineKm(originPin.position, destPin.position);
    updateLogistics({
      enabled: true,
      includeUrbanDistribution: true,
      distanceToUrbanMarketKmHS: km,
      distanceToUrbanMarketKmBS: km,
      corridorPresetId: 'custom',
    });
    if (originPin.zoneId) {
      applyProductionRegion(originPin.zoneId, false);
    }
    notify(
      'success',
      `Corridor ${originPin.name} → ${destPin.name} (${km} km) appliqué au modèle logistique.`
    );
  };

  const handleRunMapsGrounding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groundingQuery.trim()) return;
    setGroundingLoading(true);
    setGroundingError('');
    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: activeProject.name,
          enableMapsGrounding: true,
          focusLatLng: {
            latitude: originPin.position.lat,
            longitude: originPin.position.lng,
          },
          metricsSummary: `CA A1: ${formatAriary(model.year1.totalTurnoverAr, { inMillions: true })}, VAN: ${formatAriary(model.npv.npvAr, { inMillions: true })}, Zone sélectionnée: ${originPin.name}`,
          messages: [{ role: 'user', text: groundingQuery.trim() }],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erreur lors de la requête Google Maps Grounding.');
      }
      setGroundingReply(data.replyMarkdown || '');
      setGroundingLinks(Array.isArray(data.groundingLinks) ? data.groundingLinks : []);
    } catch (err) {
      setGroundingError(
        err instanceof Error ? err.message : 'Service Gemini Maps Grounding indisponible.'
      );
    } finally {
      setGroundingLoading(false);
    }
  };

  const estimatedFreightPerTon = useMemo(() => {
    const km = routeMetrics?.distanceKm ?? computeHaversineKm(originPin.position, destPin.position);
    const rate = assumptions.logistics?.urbanFreightArPerTonKm ?? 320;
    return Math.round(km * rate);
  }, [assumptions.logistics?.urbanFreightArPerTonKm, destPin.position, originPin.position, routeMetrics?.distanceKm]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Carte Interactive des Bassins Rizicoles &amp; Corridors Logistiques</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Visualisez les zones de collecte (Alaotra, Marovoay, Itasy, Vakinankaratra, Sofia), calculez l’itinéraire réel vers les marchés urbains et injectez les distances dans votre BFR transport.
          </p>
        </div>
      </div>

      {/* Corridor Controls & Telemetry Strip */}
      <section className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <label className="md:col-span-4 space-y-1 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Bassin de production / Collecte paddy
            </span>
            <select
              value={originId}
              onChange={(e) => setOriginId(e.target.value)}
              className="w-full min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-xs font-medium text-zinc-900 dark:text-zinc-100"
            >
              {basins.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.avgYieldKgHa} kg/ha)
                </option>
              ))}
            </select>
          </label>

          <label className="md:col-span-4 space-y-1 text-xs">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">
              Hub marché / Port de destination
            </span>
            <select
              value={destId}
              onChange={(e) => setDestId(e.target.value)}
              className="w-full min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-xs font-medium text-zinc-900 dark:text-zinc-100"
            >
              {hubs.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-4 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleApplyCorridorDistance}
              className="w-full md:w-auto min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Appliquer distance au modèle</span>
            </button>
          </div>
        </div>

        {/* Route Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono tabular-nums">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Distance routière calculée</span>
            </div>
            <div className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
              {routeMetrics?.distanceKm ?? computeHaversineKm(originPin.position, destPin.position)} km
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">
              Temps de trajet poids lourd estimé
            </div>
            <div className="mt-1 text-base font-bold text-zinc-900 dark:text-white">
              {routeMetrics?.durationText ?? 'Calcul…'}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#161526]">
            <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Coût fret estimé / tonne riz</span>
            </div>
            <div className="mt-1 text-base font-bold text-teal-700 dark:text-teal-400">
              {formatAriary(estimatedFreightPerTon)} / T
            </div>
          </div>
        </div>

        {/* Google Map Canvas */}
        <div className="h-[460px] w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.08] bg-zinc-100 dark:bg-[#0D0C18] relative">
          {loadingKey ? (
            <div className="h-full flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              <span>Chargement de la configuration Google Maps…</span>
            </div>
          ) : !apiKey ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-2">
              <AlertTriangle className="w-6 h-6 text-amber-500" aria-hidden="true" />
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                Clé Google Maps Platform non détectée dans cet environnement
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md">
                Les coordonnées des bassins ({originPin.name} → {destPin.name}, ~
                {computeHaversineKm(originPin.position, destPin.position)} km) restent exploitables pour le calcul logistique.
              </p>
            </div>
          ) : (
            <APIProvider
              apiKey={apiKey}
              language="fr"
              region="MG"
              libraries={['marker', 'routes', 'maps', 'core']}
            >
              <GoogleMap
                mapId="DEMO_MAP_ID"
                defaultCenter={{ lat: -18.2, lng: 47.5 }}
                defaultZoom={7}
                gestureHandling="greedy"
                internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                className="w-full h-full"
              >
                {MADAGASCAR_RICE_PINS.map((pin) => (
                  <AdvancedMarkerWithRef
                    key={pin.id}
                    pin={pin}
                    isOrigin={pin.id === originId}
                    isDest={pin.id === destId}
                    onMarkerClick={handleMarkerClick}
                  />
                ))}

                <CorridorRouteLayer
                  origin={originPin.position}
                  destination={destPin.position}
                  onRouteMetrics={handleRouteMetrics}
                />

                {selectedPin && selectedMarker && (
                  <InfoWindow
                    anchor={selectedMarker}
                    pixelOffset={[0, -2]}
                    onCloseClick={() => {
                      setSelectedPin(null);
                      setSelectedMarker(null);
                    }}
                  >
                    <div className="p-1 max-w-[230px] text-zinc-900 space-y-1">
                      <div className="text-xs font-bold">{selectedPin.name}</div>
                      <div className="text-[11px] text-zinc-600">{selectedPin.regionLabel}</div>
                      <p className="text-[11px] text-zinc-700 leading-snug">
                        {selectedPin.summary}
                      </p>
                      {selectedPin.avgYieldKgHa && (
                        <div className="text-[11px] font-mono font-semibold text-teal-700">
                          Rendement moyen : {selectedPin.avgYieldKgHa.toLocaleString('fr-FR')} kg/ha
                        </div>
                      )}
                    </div>
                  </InfoWindow>
                )}
              </GoogleMap>
            </APIProvider>
          )}
        </div>
      </section>

      {/* Gemini Maps Grounding Query Bar */}
      <section className="p-4 sm:p-5 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white">
          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>Exploration Géographique Assistée (Google Maps Grounding)</span>
        </div>
        <form onSubmit={handleRunMapsGrounding} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={groundingQuery}
            onChange={(e) => setGroundingQuery(e.target.value)}
            placeholder="Ex: Marchés de gros, coopératives ou routes principales près de Marovoay…"
            className="flex-1 min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={groundingLoading}
            className="min-h-10 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 disabled:opacity-60 transition-colors shrink-0"
          >
            {groundingLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{groundingLoading ? 'Recherche…' : 'Analyser sur Maps'}</span>
          </button>
        </form>

        {groundingError && (
          <div className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200">
            {groundingError}
          </div>
        )}

        {groundingReply && (
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] space-y-3 text-xs text-zinc-800 dark:text-zinc-200">
            <div className="whitespace-pre-wrap leading-relaxed">{groundingReply}</div>
            {groundingLinks.length > 0 && (
              <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap gap-2">
                {groundingLinks.map((lnk, idx) =>
                  lnk.uri ? (
                    <a
                      key={idx}
                      href={lnk.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-800 dark:text-indigo-200 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <span>{lnk.title}</span>
                      <ExternalLink className="w-3 h-3" aria-hidden="true" />
                    </a>
                  ) : null
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
};
