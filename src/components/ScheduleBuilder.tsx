import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Table, BarChart3, CheckCircle2, Clock, AlertTriangle, Upload, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import type { Activity, ActivityStatus } from '../types';
import { useScheduleContext } from '../context/ScheduleContext';
import { ZoneTag } from './ui/ZoneTag';

interface ScheduleBuilderProps {
  activities: Activity[];
  onAddActivity: (activity: Activity) => void;
  onUpdateActivity: (activity: Activity) => void;
  onDeleteActivity: (id: string) => void;
}

export const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({
  activities,
  onAddActivity,
  onUpdateActivity,
  onDeleteActivity
}) => {
  const { handleImportSchedule } = useScheduleContext();
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);

  // Import Schedule Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSummary, setImportSummary] = useState<{
    imported_count: number;
    rejected_count: number;
    rejected: Array<{ row: number; reason: string }>;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fname = file.name.toLowerCase();
    if (fname.endsWith('.mpp') || fname.endsWith('.xer')) {
      setImportError(
        'Native MS Project (.mpp) and Primavera P6 (.xer) binary files are not supported directly. Please export your schedule to Excel (.xlsx) or CSV format from P6 / MS Project first.'
      );
      setImportFile(null);
      return;
    }

    setImportFile(file);
    setImportError(null);
    setImportSummary(null);
  };

  const handleScheduleUpload = async () => {
    if (!importFile) return;

    setIsUploading(true);
    setImportError(null);
    setImportSummary(null);

    const formData = new FormData();
    formData.append('file', importFile);

    try {
      const response = await fetch('http://localhost:8000/api/v1/schedule/import', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to import schedule spreadsheet');
      }

      setImportSummary({
        imported_count: data.imported_count,
        rejected_count: data.rejected_count,
        rejected: data.rejected || []
      });

      if (data.accepted && data.accepted.length > 0) {
        const mappedActivities: Activity[] = data.accepted.map((a: any) => ({
          id: a.id,
          name: a.name,
          zone: a.zone,
          category: a.category || 'Civil',
          plannedStart: a.planned_start,
          plannedEnd: a.planned_end,
          progress: a.progress,
          status: a.status
        }));
        handleImportSchedule(mappedActivities);
      }
    } catch (err: any) {
      setImportError(err.message || 'An error occurred during schedule import.');
    } finally {
      setIsUploading(false);
    }
  };

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    zone: '',
    category: 'Civil',
    plannedStart: new Date().toISOString().split('T')[0],
    plannedEnd: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    progress: 0,
    status: 'not_started' as ActivityStatus
  });

  const openAddModal = () => {
    setEditingActivity(null);
    setFormData({
      name: '',
      zone: 'Zone A',
      category: 'Concrete',
      plannedStart: new Date().toISOString().split('T')[0],
      plannedEnd: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      progress: 0,
      status: 'not_started'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (activity: Activity) => {
    setEditingActivity(activity);
    setFormData({
      name: activity.name,
      zone: activity.zone,
      category: activity.category || 'Civil',
      plannedStart: activity.plannedStart,
      plannedEnd: activity.plannedEnd,
      progress: activity.progress,
      status: activity.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.zone.trim()) return;

    let computedStatus: ActivityStatus = formData.status;
    if (formData.progress >= 100) computedStatus = 'completed';
    else if (formData.progress > 0 && computedStatus === 'not_started') computedStatus = 'in_progress';

    if (editingActivity) {
      onUpdateActivity({
        ...editingActivity,
        ...formData,
        status: computedStatus
      });
    } else {
      const newId = `ACT-${Math.floor(100 + Math.random() * 900)}`;
      onAddActivity({
        id: newId,
        ...formData,
        status: computedStatus
      });
    }

    setIsModalOpen(false);
  };

  const getStatusBadge = (status: ActivityStatus, progress: number) => {
    if (progress >= 100 || status === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container px-2.5 py-0.5 rounded-full font-mono">
          <CheckCircle2 className="w-3 h-3" /> 100% DONE
        </span>
      );
    }
    if (status === 'delayed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full font-mono">
          <AlertTriangle className="w-3 h-3" /> DELAYED
        </span>
      );
    }
    if (progress > 0 || status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-container px-2.5 py-0.5 rounded-full font-mono">
          <Clock className="w-3 h-3 animate-spin-slow" /> IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-on-surface-variant bg-surface-container px-2.5 py-0.5 rounded-full font-mono">
        NOT STARTED
      </span>
    );
  };

  return (
    <section className="p-5 rounded-xl border border-outline/20 bg-surface-container-lowest shadow-sm space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-outline/10 pb-4">
        <div>
          <h2 className="text-base font-bold text-on-surface font-mono flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
            1. PLANNED CONSTRUCTION SCHEDULE
          </h2>
          <p className="text-xs text-on-surface-variant font-sans mt-0.5">
            Add, edit, or track baseline activities across project zones. Updates automatically when reports are matched.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* View Toggle */}
          <div className="flex bg-surface-container p-1 border border-outline/15 rounded-lg">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Table View
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-mono rounded-md transition-colors cursor-pointer ${
                viewMode === 'gantt' ? 'bg-surface-container-lowest text-primary shadow-xs font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Gantt Timeline
            </button>
          </div>

          {/* Import Schedule Button */}
          <button
            onClick={() => {
              setImportFile(null);
              setImportError(null);
              setImportSummary(null);
              setIsImportModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold font-mono bg-secondary-container text-on-secondary-container border border-secondary/30 hover:bg-secondary/20 transition-all rounded-lg cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" /> Import Schedule
          </button>

          {/* Add Activity Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold font-mono bg-primary text-on-primary hover:opacity-90 transition-all rounded-lg cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto rounded-xl border border-outline/15">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="border-b border-outline/15 text-on-surface-variant bg-surface-container-low font-bold">
                <th className="py-3 px-3">ID</th>
                <th className="py-3 px-3">ACTIVITY NAME</th>
                <th className="py-3 px-3">ZONE / LOCATION</th>
                <th className="py-3 px-3">PLANNED DATES</th>
                <th className="py-3 px-3">ACTUAL PROGRESS</th>
                <th className="py-3 px-3">STATUS</th>
                <th className="py-3 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline/10 font-sans">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-on-surface-variant italic">
                    No activities planned in schedule. Click "+ Add Activity" or select a preset in Settings.
                  </td>
                </tr>
              ) : (
                activities.map(act => (
                  <tr key={act.id} className="hover:bg-surface-container-low transition-colors group">
                    <td className="py-3 px-3 text-primary font-bold font-mono">{act.id}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-on-surface block">{act.name}</span>
                      {act.category && <span className="text-[10px] text-on-surface-variant font-mono">{act.category}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <ZoneTag zone={act.zone} />
                    </td>
                    <td className="py-3 px-3 text-on-surface-variant font-mono">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <span>{act.plannedStart} → {act.plannedEnd}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 w-48 font-mono">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-surface-container-highest border border-outline/20 h-2.5 rounded-full overflow-hidden p-0.5">
                          <div
                            className="bg-primary h-full rounded-full transition-all duration-500"
                            style={{ width: `${act.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-on-surface w-10 text-right">{act.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(act.status, act.progress)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(act)}
                          className="p-1 text-on-surface-variant hover:text-primary hover:bg-primary-container rounded-md transition-colors cursor-pointer"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteActivity(act.id)}
                          className="p-1 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* GANTT TIMELINE VIEW */}
      {viewMode === 'gantt' && (
        <div className="space-y-4">
          <div className="text-xs text-on-surface-variant font-mono flex items-center justify-between bg-surface-container-low p-3 border border-outline/15 rounded-xl">
            <span>TIMELINE VIEW (Baseline vs Real Progress)</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-surface-container-highest rounded"></span> Planned Window</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-2 bg-primary rounded"></span> Actual Progress</span>
            </div>
          </div>

          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="bg-surface-container-low p-3.5 border border-outline/15 rounded-xl space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-bold">{act.id}</span>
                    <span className="font-semibold text-on-surface font-sans">{act.name}</span>
                    <ZoneTag zone={act.zone} />
                  </div>
                  <span className="text-primary font-bold">{act.progress}% Complete</span>
                </div>

                {/* Timeline bar representation */}
                <div className="relative h-6 bg-surface-container-highest border border-outline/15 rounded-lg overflow-hidden">
                  <div className="absolute inset-0 grid grid-cols-4 divide-x divide-outline/10 pointer-events-none">
                    <div></div><div></div><div></div><div></div>
                  </div>
                  {/* Actual Progress Overlay */}
                  <div
                    className="h-full bg-primary transition-all duration-500 flex items-center px-2 text-[10px] font-bold text-on-primary font-mono overflow-hidden rounded-lg"
                    style={{ width: `${Math.max(act.progress, 2)}%` }}
                  >
                    {act.progress > 10 && `${act.progress}%`}
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                  <span>Start: {act.plannedStart}</span>
                  <span>End: {act.plannedEnd}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ADD / EDIT ACTIVITY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-2xl border border-outline/20 shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-bold text-on-surface font-mono mb-4 pb-2 border-b border-outline/15 flex items-center justify-between">
              <span>{editingActivity ? 'EDIT PLANNED ACTIVITY' : 'CREATE PLANNED ACTIVITY'}</span>
              <span className="text-xs text-primary font-mono font-normal">DWG SEC: 01-A</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-mono font-semibold text-on-surface-variant mb-1">ACTIVITY NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft Foundation Concrete Pour"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface-container-low border border-outline/30 text-on-surface p-2.5 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-semibold text-on-surface-variant mb-1">ZONE / LOCATION *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zone A, Floor 2"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline/30 text-on-surface p-2.5 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-mono font-semibold text-on-surface-variant mb-1">CATEGORY</label>
                  <input
                    type="text"
                    placeholder="e.g. Concrete, MEP, Structure"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline/30 text-on-surface p-2.5 rounded-lg focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono font-semibold text-on-surface-variant mb-1">PLANNED START DATE</label>
                  <input
                    type="date"
                    value={formData.plannedStart}
                    onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline/30 text-on-surface p-2.5 rounded-lg font-mono focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block font-mono font-semibold text-on-surface-variant mb-1">PLANNED END DATE</label>
                  <input
                    type="date"
                    value={formData.plannedEnd}
                    onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })}
                    className="w-full bg-surface-container-low border border-outline/30 text-on-surface p-2.5 rounded-lg font-mono focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 font-mono">
                  <label className="text-on-surface-variant font-semibold">INITIAL / CURRENT PROGRESS (%)</label>
                  <span className="text-primary font-bold">{formData.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) })}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline/15">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-outline/30 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer font-mono"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary text-on-primary font-bold hover:opacity-90 rounded-lg transition-colors cursor-pointer font-mono shadow-xs"
                >
                  {editingActivity ? 'SAVE CHANGES' : 'CREATE ACTIVITY'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IMPORT SCHEDULE MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface p-6 rounded-2xl border border-outline/20 shadow-2xl max-w-xl w-full animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline/15">
              <h3 className="text-base font-bold text-on-surface font-mono flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-secondary" />
                IMPORT BASELINE SCHEDULE (Excel / CSV)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-on-surface-variant font-sans">
                Upload your Primavera P6 / MS Project exported schedule file (<code className="text-secondary font-mono font-semibold">.xlsx</code> or <code className="text-secondary font-mono font-semibold">.csv</code>).
              </p>

              {/* Upload Input Box */}
              <div className="border-2 border-dashed border-secondary/40 hover:border-secondary bg-surface-container-low p-6 rounded-xl text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.mpp,.xer"
                  onChange={handleFileChange}
                  className="hidden"
                  id="schedule-file-input"
                />
                <label htmlFor="schedule-file-input" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-secondary mx-auto" />
                  <span className="text-on-surface font-semibold block">
                    {importFile ? importFile.name : 'Click or drop exported schedule file (.xlsx / .csv)'}
                  </span>
                  <span className="text-[11px] text-on-surface-variant block font-sans">
                    Supported: Excel (.xlsx), CSV (.csv). Note: .mpp / .xer binary files must be exported to Excel first.
                  </span>
                </label>
              </div>

              {/* ERROR MESSAGE */}
              {importError && (
                <div className="bg-rose-50 border border-rose-300 p-3 rounded-lg text-rose-900 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block font-mono">Import Error</span>
                    <span className="font-sans">{importError}</span>
                  </div>
                </div>
              )}

              {/* SUCCESS / ACCEPTED / REJECTED SUMMARY */}
              {importSummary && (
                <div className="space-y-2 bg-surface-container border border-outline/15 p-3 rounded-lg font-mono">
                  <div className="flex items-center justify-between font-bold text-secondary">
                    <span>Import Complete</span>
                    <span>{importSummary.imported_count} Activities Imported</span>
                  </div>
                  {importSummary.rejected_count > 0 && (
                    <div className="mt-2 text-amber-800 space-y-1">
                      <span className="font-bold block text-[11px]">{importSummary.rejected_count} Rejected Row(s):</span>
                      <ul className="max-h-24 overflow-y-auto space-y-1 text-[10px] bg-surface p-2 rounded border border-amber-300">
                        {importSummary.rejected.map((rej, i) => (
                          <li key={i}>Row {rej.row}: {rej.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-outline/15 font-mono">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-outline/30 text-on-surface-variant hover:text-on-surface rounded-lg cursor-pointer"
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  disabled={!importFile || isUploading}
                  onClick={handleScheduleUpload}
                  className={`px-5 py-2 font-bold rounded-lg cursor-pointer flex items-center gap-2 ${
                    !importFile || isUploading
                      ? 'bg-surface-container-highest text-on-surface-variant cursor-not-allowed'
                      : 'bg-secondary text-on-secondary hover:opacity-90 shadow-xs'
                  }`}
                >
                  {isUploading ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" /> UPLOADING...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> UPLOAD & IMPORT SCHEDULE
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

