import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Trash2, 
  Download, 
  FileText, 
  Clock, 
  X, 
  ExternalLink, 
  BrainCircuit, 
  Sparkles, 
  Plus,
  AlertTriangle,
  CheckCircle2,
  User,
  Activity,
  Cloud,
  ClipboardList
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { SavedNote } from '../types';
import { downloadTextFile, downloadJsonFile, parseNoteMetadata } from '../services/storage';

interface SavedNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedNotes: SavedNote[];
  onSelectNote: (note: SavedNote) => void;
  onDeleteNote: (id: string) => void;
  onClearAll: () => void;
  onNewNote: () => void;
  activeNoteId?: string | null;
  currentUser?: FirebaseUser | null;
  onOpenAuth?: () => void;
}

export const SavedNotesModal: React.FC<SavedNotesModalProps> = ({
  isOpen,
  onClose,
  savedNotes,
  onSelectNote,
  onDeleteNote,
  onClearAll,
  onNewNote,
  activeNoteId,
  currentUser,
  onOpenAuth
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);

  if (!isOpen) return null;

  const filteredNotes = savedNotes.filter(note => {
    const q = searchQuery.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      (note.patientName && note.patientName.toLowerCase().includes(q)) ||
      (note.chiefComplaint && note.chiefComplaint.toLowerCase().includes(q))
    );
  });

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const handleExportSingle = (e: React.MouseEvent, note: SavedNote) => {
    e.stopPropagation();
    const { title } = parseNoteMetadata(note.content);
    const safeFilename = title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'soap_note';
    downloadTextFile(`${safeFilename}_${new Date(note.updatedAt).toISOString().slice(0,10)}.txt`, note.content);
  };

  const handleExportAllJSON = () => {
    downloadJsonFile(`soapscriber_history_${new Date().toISOString().slice(0,10)}.json`, savedNotes);
  };

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95">
        
        {/* Modal Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg tracking-tight">Saved Notes & History</h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {currentUser 
                  ? `Cloud Synced (${currentUser.email || 'Google Account'}) • ${savedNotes.length} notes` 
                  : `Local Browser Storage • ${savedNotes.length} notes`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!currentUser && onOpenAuth && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAuth();
                }}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
              >
                <Cloud className="w-3.5 h-3.5" /> Sign In to Cloud
              </button>
            )}
            <button
              onClick={() => {
                onNewNote();
                onClose();
              }}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Plus className="w-4 h-4" /> Start New Note
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by patient, CC, or keywords..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-slate-800 dark:text-slate-200"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {savedNotes.length > 0 && (
              <>
                <button
                  onClick={handleExportAllJSON}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                  title="Export all history to JSON backup"
                >
                  <Download className="w-3.5 h-3.5 text-blue-500" /> Export JSON
                </button>
                <button
                  onClick={() => setShowClearAllConfirm(true)}
                  className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear History
                </button>
              </>
            )}
          </div>
        </div>

        {/* Notes List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 no-scrollbar bg-white dark:bg-slate-900">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400 dark:text-slate-600">
              <History className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-semibold">
                {searchQuery ? 'No matching notes found' : 'No saved notes in history'}
              </p>
              <p className="text-xs opacity-70 mt-1 max-w-xs">
                {searchQuery 
                  ? 'Try searching with a different patient name or medical term.' 
                  : 'Start typing clinical notes in the editor — your work will be automatically saved and stored here.'}
              </p>
            </div>
          ) : (
            filteredNotes.map((item) => {
              const isActive = item.id === activeNoteId;
              const { patientName, chiefComplaint } = parseNoteMetadata(item.content);

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectNote(item);
                    onClose();
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer group flex flex-col gap-3 relative ${
                    isActive
                      ? 'bg-blue-50/70 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-md ring-1 ring-blue-500/20'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {item.title}
                          </h4>
                          {isActive && (
                            <span className="px-2 py-0.5 bg-blue-600 text-[9px] font-black uppercase text-white rounded-full tracking-wider">
                              Active
                            </span>
                          )}
                          {item.templateName && (
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-[9px] font-bold text-slate-600 dark:text-slate-300 rounded-md">
                              {item.templateName}
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(item.updatedAt)}
                          </span>
                          <span>•</span>
                          <span>{item.content.length.toLocaleString()} chars</span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleExportSingle(e, item)}
                        className="p-2 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                        title="Download TXT"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-1 bg-red-100 dark:bg-red-900/50 p-1 rounded-xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteNote(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(item.id);
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
                          title="Delete Note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Note Content Preview Snippet */}
                  <div className="text-xs text-slate-600 dark:text-slate-300 font-mono line-clamp-2 bg-white dark:bg-slate-900/80 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 leading-relaxed">
                    {item.content}
                  </div>

                  {/* Metadata Chips (Insights & Summary indicator) */}
                  <div className="flex items-center gap-2 pt-1">
                    {item.insights && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100 dark:border-indigo-800">
                        <BrainCircuit className="w-3 h-3 text-indigo-500" />
                        {item.insights.differentials.length} Differentials
                      </span>
                    )}
                    {item.insights?.proposedPlan && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-lg border border-teal-100 dark:border-teal-800">
                        <ClipboardList className="w-3 h-3 text-teal-500" />
                        Plan Included
                      </span>
                    )}
                    {item.summaryData && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800">
                        <Sparkles className="w-3 h-3 text-blue-500" />
                        Summary Ready
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clear All History Confirmation Modal */}
        {showClearAllConfirm && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/80 p-4">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl max-w-sm w-full border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">Clear All Note History?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">This will permanently delete all {savedNotes.length} saved notes from local storage. This action cannot be undone.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowClearAllConfirm(false)}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowClearAllConfirm(false);
                  }}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-xl text-xs font-bold shadow-md"
                >
                  Delete All
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
