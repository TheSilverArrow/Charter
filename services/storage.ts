import { SavedNote, CurrentDraftState, AIInsights, SummaryResult } from '../types';

const DRAFT_KEY = 'soap_current_draft_v1';
const HISTORY_KEY = 'soap_saved_notes_v1';
const AUTOSAVE_SETTINGS_KEY = 'soap_autosave_enabled';

// Helper to extract patient name and chief complaint from note text
export function parseNoteMetadata(text: string): { title: string; patientName?: string; chiefComplaint?: string } {
  if (!text || !text.trim()) {
    return { title: 'Untitled Note' };
  }

  const lines = text.split('\n');
  let patientName = '';
  let chiefComplaint = '';
  let templateName = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!patientName && (trimmed.toLowerCase().startsWith('name:') || trimmed.toLowerCase().startsWith('patient:'))) {
      patientName = trimmed.substring(trimmed.indexOf(':') + 1).trim();
    }
    if (!chiefComplaint && (trimmed.toLowerCase().startsWith('cc:') || trimmed.toLowerCase().startsWith('chief complaint:'))) {
      chiefComplaint = trimmed.substring(trimmed.indexOf(':') + 1).trim();
    }
    if (!templateName && (trimmed.toLowerCase().includes('soap note') || trimmed.toLowerCase().includes('opd') || trimmed.toLowerCase().includes('template'))) {
      templateName = trimmed.replace(/[\[\]]/g, '').trim();
    }
  }

  let title = '';
  if (patientName) {
    title = `Patient: ${patientName}`;
    if (chiefComplaint) title += ` - CC: ${chiefComplaint}`;
  } else if (chiefComplaint) {
    title = `CC: ${chiefComplaint}`;
  } else if (templateName) {
    title = templateName;
  } else {
    // Pick first non-empty line
    const firstLine = lines.find(l => l.trim().length > 0) || 'SOAP Note';
    title = firstLine.trim().slice(0, 45);
    if (firstLine.trim().length > 45) title += '...';
  }

  return { title, patientName, chiefComplaint };
}

// Save Current Working Draft
export function saveDraftToStorage(draft: CurrentDraftState): void {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.error('Error saving draft to localStorage:', err);
  }
}

// Load Current Working Draft
export function loadDraftFromStorage(): CurrentDraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CurrentDraftState;
  } catch (err) {
    console.error('Error loading draft from localStorage:', err);
    return null;
  }
}

// Clear Working Draft
export function clearDraftStorage(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch (err) {
    console.error('Error clearing draft from localStorage:', err);
  }
}

// Get All Saved Notes
export function getSavedNotes(): SavedNote[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const notes = JSON.parse(raw) as SavedNote[];
    return notes.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (err) {
    console.error('Error loading saved notes from localStorage:', err);
    return [];
  }
}

// Save/Update Note Entry in History
export function saveNoteToHistory(data: {
  id?: string;
  note: string;
  insights?: AIInsights | null;
  summaryData?: SummaryResult | null;
  templateName?: string;
}): SavedNote {
  const notes = getSavedNotes();
  const now = Date.now();
  const { title, patientName, chiefComplaint } = parseNoteMetadata(data.note);

  const existingIndex = data.id ? notes.findIndex(n => n.id === data.id) : -1;

  if (existingIndex >= 0) {
    // Update existing
    const updatedNote: SavedNote = {
      ...notes[existingIndex],
      title,
      content: data.note,
      insights: data.insights !== undefined ? data.insights : notes[existingIndex].insights,
      summaryData: data.summaryData !== undefined ? data.summaryData : notes[existingIndex].summaryData,
      updatedAt: now,
      patientName: patientName || notes[existingIndex].patientName,
      chiefComplaint: chiefComplaint || notes[existingIndex].chiefComplaint,
      templateName: data.templateName || notes[existingIndex].templateName,
    };
    notes[existingIndex] = updatedNote;
    localStorage.setItem(HISTORY_KEY, JSON.stringify(notes));
    return updatedNote;
  } else {
    // Create new
    const newNote: SavedNote = {
      id: `note_${now}_${Math.random().toString(36).substr(2, 6)}`,
      title,
      content: data.note,
      insights: data.insights || null,
      summaryData: data.summaryData || null,
      createdAt: now,
      updatedAt: now,
      patientName,
      chiefComplaint,
      templateName: data.templateName,
    };
    notes.unshift(newNote);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(notes));
    return newNote;
  }
}

// Delete Note from History
export function deleteNoteFromHistory(id: string): SavedNote[] {
  const notes = getSavedNotes().filter(n => n.id !== id);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(notes));
  } catch (err) {
    console.error('Error deleting note from history:', err);
  }
  return notes;
}

// Clear All History
export function clearAllHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (err) {
    console.error('Error clearing history:', err);
  }
}

// Autosave Preference
export function isAutosaveEnabled(): boolean {
  return localStorage.getItem(AUTOSAVE_SETTINGS_KEY) !== 'false';
}

export function setAutosaveEnabled(enabled: boolean): void {
  localStorage.setItem(AUTOSAVE_SETTINGS_KEY, enabled ? 'true' : 'false');
}

// Export functions
export function downloadTextFile(filename: string, text: string) {
  const element = document.createElement('a');
  const file = new Blob([text], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

export function downloadJsonFile(filename: string, data: any) {
  const element = document.createElement('a');
  const file = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}
