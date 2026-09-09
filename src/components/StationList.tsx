import React, { useState, useMemo } from 'react';
import { AWS_STATIONS, REGIONS } from '../data/stations';
import { AnomalyDetectionResult, SensorHealthRecord, WeatherObservation } from '../types';
import {
  Search,
  Filter,
  Eye,
  Zap,
  CheckCircle,
  AlertTriangle,
  CloudRain,
  Radio,
  ArrowUpDown,
  ExternalLink
} from 'lucide-react';

interface StationListProps {
  observations: Map<string, WeatherObservation>;
  detections: Map<string, AnomalyDetectionResult>;
  healthRecords: Map<string, SensorHealthRecord>;
  selectedStationId: string | null;
  onSelectStation: (stationId: string) => void;
  onQuickInject: (stationId: string) => void;
}

export const StationList: React.FC<StationListProps> = ({
  observations,
  detections,
  healthRecords,
  selectedStationId,
  onSelectStation,
  onQuickInject
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ANOMALOUS' | 'WEATHER_EVENT' | 'NORMAL'>('ALL');
  const [sortField, setSortField] = useState<'name' | 'health' | 'anomalyScore' | 'temp'>('anomalyScore');
  const [sortAsc, setSortAsc] = useState(false);

  const filteredStations = useMemo(() => {
    return AWS_STATIONS.filter((station) => {
      // Search filter
      const matchesSearch =
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.code.toLowerCase().includes(searchQuery.toLowerCase());

      // Region filter
      const matchesRegion = selectedRegion === 'All' || station.region === selectedRegion;

      // Status filter
      const det = detections.get(station.id);
      let matchesStatus = true;
      if (statusFilter === 'ANOMALOUS') {
        matchesStatus = det?.status === 'ANOMALOUS' && det.primaryClassification !== 'WEATHER_EVENT';
      } else if (statusFilter === 'WEATHER_EVENT') {
        matchesStatus = det?.primaryClassification === 'WEATHER_EVENT';
      } else if (statusFilter === 'NORMAL') {
        matchesStatus = det?.status === 'NORMAL';
      }

      return matchesSearch && matchesRegion && matchesStatus;
    }).sort((a, b) => {
      let valA = 0;
      let valB = 0;

      if (sortField === 'name') {
        return sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (sortField === 'health') {
        valA = healthRecords.get(a.id)?.healthScore || 100;
        valB = healthRecords.get(b.id)?.healthScore || 100;
      } else if (sortField === 'anomalyScore') {
        valA = detections.get(a.id)?.compositeAnomalyScore || 0;
        valB = detections.get(b.id)?.compositeAnomalyScore || 0;
      } else if (sortField === 'temp') {
        valA = observations.get(a.id)?.temperature || 0;
        valB = observations.get(b.id)?.temperature || 0;
      }

      return sortAsc ? valA - valB : valB - valA;
    });
  }, [searchQuery, selectedRegion, statusFilter, sortField, sortAsc, detections, healthRecords, observations]);

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col h-[560px]">
      {/* Search & Filter Header */}
      <div className="p-3.5 border-b border-slate-100 bg-slate-50/70 space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search station or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent text-slate-800 placeholder-slate-400"
            />
          </div>

          {/* Quick status filter pills */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto text-xs pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All ({AWS_STATIONS.length})
            </button>
            <button
              onClick={() => setStatusFilter('ANOMALOUS')}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'ANOMALOUS'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100'
              }`}
            >
              Faults
            </button>
            <button
              onClick={() => setStatusFilter('WEATHER_EVENT')}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'WEATHER_EVENT'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              }`}
            >
              Weather Events
            </button>
            <button
              onClick={() => setStatusFilter('NORMAL')}
              className={`px-2.5 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
                statusFilter === 'NORMAL'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              Normal
            </button>
          </div>
        </div>

        {/* Region pills */}
        <div className="flex items-center gap-1 overflow-x-auto text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600 mr-1">Region:</span>
          {REGIONS.map((region) => (
            <button
              key={region}
              onClick={() => setSelectedRegion(region)}
              className={`px-2 py-0.5 rounded-full font-medium transition-colors ${
                selectedRegion === region
                  ? 'bg-sky-100 text-sky-800 font-bold'
                  : 'hover:bg-slate-200 text-slate-600'
              }`}
            >
              {region}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="sticky top-0 bg-slate-100/95 backdrop-blur-xs text-slate-600 border-b border-slate-200 z-10 select-none">
            <tr>
              <th
                onClick={() => toggleSort('name')}
                className="py-2 px-3 font-semibold cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center gap-1">
                  <span>Station / Code</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('temp')}
                className="py-2 px-2.5 font-semibold text-right cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Temp / Dew</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2 px-2.5 font-semibold text-right hidden sm:table-cell">
                Pressure
              </th>
              <th className="py-2 px-2.5 font-semibold text-right hidden md:table-cell">
                Humidity
              </th>
              <th
                onClick={() => toggleSort('health')}
                className="py-2 px-2.5 font-semibold text-center cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Health</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => toggleSort('anomalyScore')}
                className="py-2 px-3 font-semibold text-center cursor-pointer hover:text-slate-900"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Status / Trust</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-400" />
                </div>
              </th>
              <th className="py-2 px-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredStations.map((station) => {
              const obs = observations.get(station.id);
              const det = detections.get(station.id);
              const health = healthRecords.get(station.id);
              const isSelected = selectedStationId === station.id;

              const isWeatherEvent = det?.primaryClassification === 'WEATHER_EVENT';
              const isAnomalous = det?.status === 'ANOMALOUS';
              const isSuspicious = det?.status === 'SUSPICIOUS';

              return (
                <tr
                  key={station.id}
                  onClick={() => onSelectStation(station.id)}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sky-50/80 border-l-4 border-l-sky-500'
                      : isAnomalous
                      ? 'bg-rose-50/40 hover:bg-rose-50/70'
                      : isWeatherEvent
                      ? 'bg-indigo-50/40 hover:bg-indigo-50/70'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  {/* Station Name & Code */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                      <span className="truncate max-w-[140px] sm:max-w-[200px]">
                        {station.name}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                      <span className="font-bold text-slate-600">{station.code}</span>
                      <span>· {station.region}</span>
                    </div>
                  </td>

                  {/* Temperature / Dew Point */}
                  <td className="py-2.5 px-2.5 text-right font-mono">
                    {obs?.isMissing ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <>
                        <div className="font-bold text-slate-900">{obs?.temperature}°C</div>
                        <div className="text-[11px] text-slate-500">Td: {obs?.dewPoint}°C</div>
                      </>
                    )}
                  </td>

                  {/* Pressure */}
                  <td className="py-2.5 px-2.5 text-right font-mono hidden sm:table-cell">
                    {obs?.isMissing ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <span className="text-slate-700">{obs?.pressure} hPa</span>
                    )}
                  </td>

                  {/* Humidity */}
                  <td className="py-2.5 px-2.5 text-right font-mono hidden md:table-cell">
                    {obs?.isMissing ? (
                      <span className="text-slate-400">--</span>
                    ) : (
                      <span className="text-slate-700">{obs?.humidity}%</span>
                    )}
                  </td>

                  {/* Sensor Health Index */}
                  <td className="py-2.5 px-2.5 text-center">
                    <div className="inline-flex items-center gap-1 font-mono">
                      <span
                        className={`text-xs font-bold ${
                          (health?.healthScore || 100) > 85
                            ? 'text-emerald-600'
                            : (health?.healthScore || 100) > 65
                            ? 'text-amber-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {health?.healthScore || 100}%
                      </span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-2.5 px-3 text-center">
                    {isWeatherEvent ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        <CloudRain className="w-3 h-3" />
                        Weather Event (Trusted)
                      </span>
                    ) : isAnomalous ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3 h-3" />
                        Sensor Fault (Untrusted)
                      </span>
                    ) : isSuspicious ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        Suspicious
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle className="w-3 h-3" />
                        Normal (Trusted)
                      </span>
                    )}
                  </td>

                  {/* Quick Action Button */}
                  <td className="py-2.5 px-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickInject(station.id);
                        }}
                        title="Inject Anomaly on this station"
                        className="p-1 rounded text-amber-600 hover:bg-amber-100 transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStation(station.id);
                        }}
                        title="Inspect station deep dive"
                        className="p-1 rounded text-slate-500 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredStations.length === 0 && (
          <div className="p-8 text-center text-slate-400 text-xs">
            No weather stations match current filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
