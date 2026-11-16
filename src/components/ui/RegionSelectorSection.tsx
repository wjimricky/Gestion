import React, { useState } from 'react';
import { CheckCircle2, MapPin, Sprout, Truck } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  getZoneProfileById,
  MADAGASCAR_PRODUCTION_ZONES,
  ProductionZoneId,
} from '../../utils/productionZones';
import { ROAD_CONDITION_META } from '../../utils/logistics';
import { formatAriary } from '../../utils/formatters';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

export const RegionSelectorSection: React.FC = () => {
  const { assumptions, applyProductionRegion } = useFinancial();
  const [syncPaddyPrice, setSyncPaddyPrice] = useState(true);

  const selectedRegionId = (assumptions.selectedRegionId as ProductionZoneId) || 'current';
  const activeProfile = getZoneProfileById(selectedRegionId);

  const regionOptions = MADAGASCAR_PRODUCTION_ZONES.map((z) => ({
    value: z.id,
    label: z.name,
    badge: `${(z.avgFieldYieldKgPerHa / 1000).toFixed(1)} t/ha`,
    description: `${z.region} · ${z.distanceKmHS}/${z.distanceKmBS} km`,
  }));

  const currentCarburant = assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant');

  return (
    <section
      aria-label="Sélecteur de région rizicole à Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <MapPin
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Sélecteur de Région Rizicole (Madagascar)
              </h2>
              <Tooltip
                label="Sélecteur de Région"
                content="Calibre automatiquement les coûts de transport (distance aller-retour, état des routes, prix du gasoil) et le rendement moyen par hectare (kg/ha) ainsi que le volume par rotation selon les bassins rizicoles malgaches."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Sélectionnez une zone de production pour ajuster automatiquement le transport logistique et le rendement moyen à l’hectare.
            </p>
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none min-h-10 px-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 shrink-0">
          <input
            type="checkbox"
            checked={syncPaddyPrice}
            onChange={(e) => setSyncPaddyPrice(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
          <span>Calibrer aussi le prix du paddy régional</span>
        </label>
      </div>

      {/* Select Dropdown + Region Quick Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-4 space-y-2">
          <label
            htmlFor="region-selector-menu"
            className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          >
            Bassin de production actif
          </label>
          <SelectMenu
            id="region-selector-menu"
            ariaLabel="Sélectionner une région de production rizicole à Madagascar"
            value={selectedRegionId}
            onChange={(val) =>
              applyProductionRegion(val as ProductionZoneId, syncPaddyPrice)
            }
            options={regionOptions}
            className="w-full"
          />
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1.5 text-xs">
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {activeProfile.name}
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
              {activeProfile.fieldYieldNote}
            </p>
            <div className="pt-1 border-t border-zinc-200/70 dark:border-white/[0.06] grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 font-sans block">
                  Transport HS / BS
                </span>
                <strong className="text-zinc-900 dark:text-white">
                  {currentCarburant ? formatAriary(currentCarburant.costHS) : '—'} /{' '}
                  {currentCarburant ? formatAriary(currentCarburant.costBS) : '—'}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 font-sans block">
                  Rendement / ha
                </span>
                <strong className="text-teal-700 dark:text-teal-400">
                  {(assumptions.climateImpact?.nominalYieldKgPerHa ?? activeProfile.avgFieldYieldKgPerHa).toLocaleString('fr-FR')} kg/ha
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Cards Grid */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {MADAGASCAR_PRODUCTION_ZONES.filter((z) => z.id !== 'current').map((zone) => {
            const isSelected = selectedRegionId === zone.id;
            return (
              <button
                key={zone.id}
                type="button"
                onClick={() => applyProductionRegion(zone.id, syncPaddyPrice)}
                aria-pressed={isSelected}
                className={`text-left p-3 rounded-xl border transition-colors space-y-1.5 ${
                  isSelected
                    ? 'border-indigo-500/65 bg-indigo-500/10 ring-1 ring-indigo-500/25'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                      aria-hidden="true"
                    />
                    <span>{zone.shortName}</span>
                  </span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Active</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                      Paddy ×{zone.paddyPriceMultiplier.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {zone.region}
                </div>

                <div className="pt-1 border-t border-zinc-200/70 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                  <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                    <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                    <span>
                      {zone.distanceKmHS}/{zone.distanceKmBS} km ({ROAD_CONDITION_META[zone.roadBS].shortLabel})
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400">
                    <Sprout className="w-3 h-3" aria-hidden="true" />
                    <span>{(zone.avgFieldYieldKgPerHa / 1000).toFixed(1)} t/ha</span>
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
