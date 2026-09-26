import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Calendar, Table, BarChart3, CheckCircle2, Clock, AlertTriangle, Upload, FileSpreadsheet, AlertCircle, X } from 'lucide-react';
import type { Activity, ActivityStatus } from '../types';
import { useScheduleContext } from '../context/ScheduleContext';

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
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-xs mono-font">
          <CheckCircle2 className="w-3 h-3" /> 100% DONE
        </span>
      );
    }
    if (status === 'delayed') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-950/60 border border-amber-500/40 px-2 py-0.5 rounded-xs mono-font">
          <AlertTriangle className="w-3 h-3" /> DELAYED
        </span>
      );
    }
    if (progress > 0 || status === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-xs mono-font">
          <Clock className="w-3 h-3 animate-spin-slow" /> IN PROGRESS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 bg-slate-900 border border-slate-700 px-2 py-0.5 rounded-xs mono-font">
        NOT STARTED
      </span>
    );
  };

  return (
    <section className="blueprint-card p-5 rounded-sm">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5 border-b border-cyan-500/20 pb-4">
        <div>
          <h2 className="text-lg font-bold text-cyan-300 mono-font flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_#00f0ff]"></span>
            1. PLANNED CONSTRUCTION SCHEDULE
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Add, edit, or track baseline activities across project zones. Updates automatically when reports are matched.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex bg-slate-950 p-1 border border-cyan-500/30 rounded-xs">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs mono-font rounded-xs transition-colors cursor-pointer ${
                viewMode === 'table' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Table View
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs mono-font rounded-xs transition-colors cursor-pointer ${
                viewMode === 'gantt' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400 hover:text-slate-200'
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold mono-font bg-emerald-500/20 text-emerald-300 border border-emerald-400 hover:bg-emerald-500/30 transition-all rounded-xs cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          >
            <Upload className="w-4 h-4" /> Import Schedule
          </button>

          {/* Add Activity Button */}
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold mono-font bg-cyan-500/20 text-cyan-300 border border-cyan-400 hover:bg-cyan-500/30 transition-all rounded-xs cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Plus className="w-4 h-4" /> Add Activity
          </button>
        </div>
      </div>

      {/* TABLE VIEW */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs mono-font">
            <thead>
              <tr className="border-b border-cyan-500/30 text-cyan-400 bg-slate-950/80">
                <th className="py-2.5 px-3">ID</th>
                <th className="py-2.5 px-3">ACTIVITY NAME</th>
                <th className="py-2.5 px-3">ZONE / LOCATION</th>
                <th className="py-2.5 px-3">PLANNED DATES</th>
                <th className="py-2.5 px-3">ACTUAL PROGRESS</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/10">
              {activities.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-500 italic">
                    No activities planned in schedule. Click "+ Add Activity" or select a preset above.
                  </td>
                </tr>
              ) : (
                activities.map(act => (
                  <tr key={act.id} className="hover:bg-cyan-950/20 transition-colors group">
                    <td className="py-3 px-3 text-cyan-400 font-bold">{act.id}</td>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-slate-200 block">{act.name}</span>
                      {act.category && <span className="text-[10px] text-slate-500">{act.category}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-slate-900 border border-slate-700 text-amber-300 rounded-xs">
                        {act.zone}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-cyan-500" />
                        <span>{act.plannedStart} → {act.plannedEnd}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 w-48">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-900 border border-cyan-500/20 h-2.5 rounded-xs overflow-hidden p-0.5">
                          <div
                            className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-xs transition-all duration-500"
                            style={{ width: `${act.progress}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-cyan-300 w-10 text-right">{act.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">{getStatusBadge(act.status, act.progress)}</td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => openEditModal(act)}
                          className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-cyan-950 border border-transparent hover:border-cyan-500/40 rounded-xs transition-colors cursor-pointer"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteActivity(act.id)}
                          className="p-1 text-slate-400 hover:text-crimson-400 hover:bg-crimson-950 border border-transparent hover:border-crimson-500/40 rounded-xs transition-colors cursor-pointer"
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
          <div className="text-xs text-slate-400 mono-font flex items-center justify-between bg-slate-950 p-2 border border-cyan-500/20 rounded-xs">
            <span>TIMELINE VIEW (Baseline vs Real Progress)</span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-700 rounded-xs"></span> Planned Window</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-cyan-400 rounded-xs"></span> Actual Progress</span>
            </div>
          </div>

          <div className="space-y-3">
            {activities.map(act => (
              <div key={act.id} className="bg-slate-950/70 p-3 border border-cyan-500/20 rounded-xs space-y-2">
                <div className="flex justify-between text-xs mono-font">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">{act.id}</span>
                    <span className="font-semibold text-slate-200">{act.name}</span>
                    <span className="text-amber-400 text-[10px] px-1.5 py-0.5 bg-slate-900 border border-amber-500/30 rounded-xs">{act.zone}</span>
                  </div>
                  <span className="text-cyan-300 font-bold">{act.progress}% Complete</span>
                </div>

                {/* Timeline bar representation */}
                <div className="relative h-6 bg-slate-900 border border-cyan-500/20 rounded-xs overflow-hidden">
                  {/* Grid lines background */}
                  <div className="absolute inset-0 grid grid-cols-4 divide-x divide-cyan-500/10 pointer-events-none">
                    <div></div><div></div><div></div><div></div>
                  </div>
                  {/* Actual Progress Overlay */}
                  <div
                    className="h-full bg-gradient-to-r from-cyan-600 via-cyan-400 to-emerald-400 transition-all duration-500 flex items-center px-2 text-[10px] font-bold text-slate-950 mono-font overflow-hidden"
                    style={{ width: `${Math.max(act.progress, 2)}%` }}
                  >
                    {act.progress > 10 && `${act.progress}%`}
                  </div>
                </div>

                <div className="flex justify-between text-[10px] text-slate-500 mono-font">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="blueprint-card max-w-lg w-full p-6 rounded-sm border-cyan-400 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-cyan-300 mono-font mb-4 pb-2 border-b border-cyan-500/30 flex items-center justify-between">
              <span>{editingActivity ? 'EDIT PLANNED ACTIVITY' : 'CREATE PLANNED ACTIVITY'}</span>
              <span className="text-xs text-amber-400">DWG SEC: 01-A</span>
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs mono-font">
              <div>
                <label className="block text-slate-300 mb-1">ACTIVITY NAME *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Raft Foundation Concrete Pour"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-cyan-500/40 text-slate-100 p-2 rounded-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">ZONE / LOCATION *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Zone A, Floor 2"
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/40 text-amber-300 p-2 rounded-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">CATEGORY</label>
                  <input
                    type="text"
                    placeholder="e.g. Concrete, MEP, Structure"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/40 text-slate-100 p-2 rounded-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 mb-1">PLANNED START DATE</label>
                  <input
                    type="date"
                    value={formData.plannedStart}
                    onChange={(e) => setFormData({ ...formData, plannedStart: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/40 text-cyan-300 p-2 rounded-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">PLANNED END DATE</label>
                  <input
                    type="date"
                    value={formData.plannedEnd}
                    onChange={(e) => setFormData({ ...formData, plannedEnd: e.target.value })}
                    className="w-full bg-slate-900 border border-cyan-500/40 text-cyan-300 p-2 rounded-xs focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-300">INITIAL / CURRENT PROGRESS (%)</label>
                  <span className="text-cyan-300 font-bold">{formData.progress}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={formData.progress}
                  onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value, 10) })}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-cyan-500/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xs cursor-pointer"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-500 text-slate-950 font-bold hover:bg-cyan-400 rounded-xs transition-colors cursor-pointer shadow-[0_0_12px_rgba(0,240,255,0.4)]"
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="blueprint-card max-w-xl w-full p-6 rounded-sm border-emerald-400 shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-emerald-500/30">
              <h3 className="text-lg font-bold text-emerald-300 mono-font flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5" />
                IMPORT BASELINE SCHEDULE (Excel / CSV)
              </h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs mono-font">
              <p className="text-slate-300">
                Upload your Primavera P6 / MS Project exported schedule file (<code className="text-emerald-300">.xlsx</code> or <code className="text-emerald-300">.csv</code>).
              </p>

              {/* Upload Input Box */}
              <div className="border-2 border-dashed border-emerald-500/40 hover:border-emerald-400 bg-slate-950/60 p-6 rounded-xs text-center">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.mpp,.xer"
                  onChange={handleFileChange}
                  className="hidden"
                  id="schedule-file-input"
                />
                <label htmlFor="schedule-file-input" className="cursor-pointer block space-y-2">
                  <Upload className="w-8 h-8 text-emerald-400 mx-auto" />
                  <span className="text-slate-200 font-semibold block">
                    {importFile ? importFile.name : 'Click or drop exported schedule file (.xlsx / .csv)'}
                  </span>
                  <span className="text-[11px] text-slate-400 block">
                    Supported: Excel (.xlsx), CSV (.csv). Note: .mpp / .xer binary files must be exported to Excel first.
                  </span>
                </label>
              </div>

              {/* ERROR MESSAGE / REGEX WARNING */}
              {importError && (
                <div className="bg-crimson-950/80 border border-crimson-500/50 p-3 rounded-xs text-crimson-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-crimson-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Import Error</span>
                    <span>{importError}</span>
                  </div>
                </div>
              )}

              {/* SUCCESS / ACCEPTED / REJECTED SUMMARY */}
              {importSummary && (
                <div className="space-y-2 bg-slate-900 border border-emerald-500/30 p-3 rounded-xs">
                  <div className="flex items-center justify-between font-bold text-emerald-300">
                    <span>Import Complete</span>
                    <span>{importSummary.imported_count} Activities Imported</span>
                  </div>
                  {importSummary.rejected_count > 0 && (
                    <div className="mt-2 text-amber-300 space-y-1">
                      <span className="font-bold block text-[11px]">{importSummary.rejected_count} Rejected Row(s):</span>
                      <ul className="max-h-24 overflow-y-auto space-y-1 text-[10px] bg-slate-950 p-2 rounded-xs border border-amber-500/20">
                        {importSummary.rejected.map((rej, i) => (
                          <li key={i}>Row {rej.row}: {rej.reason}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* MODAL ACTIONS */}
              <div className="flex justify-end gap-3 pt-3 border-t border-emerald-500/20">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-400 hover:text-slate-200 rounded-xs cursor-pointer"
                >
                  CLOSE
                </button>
                <button
                  type="button"
                  disabled={!importFile || isUploading}
                  onClick={handleScheduleUpload}
                  className={`px-5 py-2 font-bold rounded-xs cursor-pointer flex items-center gap-2 ${
                    !importFile || isUploading
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
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
