
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Stethoscope, 
  Trash2, 
  CheckCircle2, 
  BrainCircuit, 
  MessageSquare, 
  AlertCircle, 
  ChevronRight, 
  ChevronsRight,
  Info, 
  X,
  FileText,
  Sun,
  Moon,
  Layout,
  AlertTriangle,
  ClipboardList,
  Target,
  Calculator,
  ListChecks,
  Sparkles,
  Copy,
  Check,
  UserRoundSearch,
  Wand2,
  PenTool,
  Maximize2,
  Minimize2,
  Settings,
  Cloud,
  CloudCog,
  Save,
  Loader2,
  LogOut,
  Play,
  History,
  HardDrive,
  BookmarkCheck,
  UserCheck,
  CloudCheck,
  Pill,
  FlaskConical,
  UserPlus,
  Calendar,
  ShieldAlert,
  FilePlus,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';
import { PublicClientApplication } from "@azure/msal-browser";
import { TEMPLATES, PE_MANEUVERS } from './constants';
import { AIInsights, PEManeuver, Template, Differential, SummaryResult, SavedNote, ProposedPlan } from './types';
import { analyzeClinicalNote, generateClinicalSummary, improveHPI } from './services/gemini';
import { SavedNotesModal } from './components/SavedNotesModal';
import { AuthModal } from './components/AuthModal';
import { 
  subscribeToAuthChanges, 
  subscribeToCloudNotes, 
  saveNoteToCloud, 
  deleteCloudNote, 
  logoutUser 
} from './services/firebase';
import { 
  saveDraftToStorage, 
  loadDraftFromStorage, 
  clearDraftStorage, 
  getSavedNotes, 
  saveNoteToHistory, 
  deleteNoteFromHistory, 
  clearAllHistory, 
  isAutosaveEnabled, 
  setAutosaveEnabled 
} from './services/storage';

const App: React.FC = () => {
  // Application State
  const [note, setNote] = useState<string>('');
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [status, setStatus] = useState<'ready' | 'analyzing' | 'error' | 'success'>('ready');
  const [selectedManeuver, setSelectedManeuver] = useState<{ name: string; details: PEManeuver } | null>(null);
  const [selectedDifferential, setSelectedDifferential] = useState<Differential | null>(null);
  
  // Firebase Auth & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Storage & Autosave State
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [autosaveStatus, setAutosaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [autosaveEnabled, setAutosaveEnabledState] = useState<boolean>(() => isAutosaveEnabled());
  const autosaveTimeoutRef = useRef<any>(null);

  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState<boolean>(true);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Summary State
  const [summaryData, setSummaryData] = useState<SummaryResult | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);
  const [hasCopied, setHasCopied] = useState<boolean>(false);
  
  // HPI Improvement State
  const [isImprovingHPI, setIsImprovingHPI] = useState<boolean>(false);

  // Proposed Plan Actions State
  const [isPlanCopied, setIsPlanCopied] = useState<boolean>(false);
  const [isPlanInserted, setIsPlanInserted] = useState<boolean>(false);
  const [activeIntelligenceTab, setActiveIntelligenceTab] = useState<'all' | 'plan' | 'differentials' | 'questions'>('all');

  // AI Error & Status Notification State
  const [aiError, setAiError] = useState<string | null>(null);
  const [showOneNoteGuide, setShowOneNoteGuide] = useState<boolean>(false);
  const [copiedRedirectUri, setCopiedRedirectUri] = useState<boolean>(false);
  const [isCopiedOneNote, setIsCopiedOneNote] = useState<boolean>(false);

  // Template Confirmation State
  const [pendingTemplate, setPendingTemplate] = useState<Template | null>(null);
  const [showOverwriteModal, setShowOverwriteModal] = useState<boolean>(false);
  
  // OneNote Integration State
  const [oneNoteClientId, setOneNoteClientId] = useState<string>(() => localStorage.getItem('oneNoteClientId') || '');
  const [msalInstance, setMsalInstance] = useState<PublicClientApplication | null>(null);
  const [isOneNoteAuthenticated, setIsOneNoteAuthenticated] = useState<boolean>(false);
  const [oneNoteSyncStatus, setOneNoteSyncStatus] = useState<'idle' | 'syncing' | 'saved' | 'error'>('idle');
  const [oneNotePageId, setOneNotePageId] = useState<string | null>(null);
  const oneNoteSaveTimeoutRef = useRef<any>(null);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });
  

  // Sync dark mode class on document element
  useEffect(() => {
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Initialize MSAL if Client ID exists
  useEffect(() => {
    if (oneNoteClientId) {
      const msalConfig = {
        auth: {
          clientId: oneNoteClientId,
          redirectUri: window.location.origin, // Assuming localhost or hosted root
        },
        cache: {
          cacheLocation: "sessionStorage",
        }
      };
      const pca = new PublicClientApplication(msalConfig);
      pca.initialize().then(() => {
        setMsalInstance(pca);
        // Check if user is already signed in
        const accounts = pca.getAllAccounts();
        if (accounts.length > 0) {
          setIsOneNoteAuthenticated(true);
        }
      }).catch(err => console.error("MSAL Init Error:", err));
    }
  }, [oneNoteClientId]);

  // OneNote Auth Handlers
  const handleOneNoteLogin = async () => {
    if (!msalInstance) return;
    try {
      await msalInstance.loginPopup({
        scopes: ["Notes.Create", "Notes.ReadWrite"]
      });
      setIsOneNoteAuthenticated(true);
    } catch (error) {
      console.error("Login failed", error);
      alert("Failed to connect to Microsoft account. Check your Client ID and popup settings.");
    }
  };

  const handleOneNoteLogout = async () => {
    if (!msalInstance) return;
    await msalInstance.logoutPopup();
    setIsOneNoteAuthenticated(false);
    setOneNotePageId(null);
  };

  const saveClientId = (id: string) => {
    setOneNoteClientId(id);
    localStorage.setItem('oneNoteClientId', id);
  };

  // OneNote Sync Logic
  const syncToOneNote = useCallback(async (content: string) => {
    if (!msalInstance || !isOneNoteAuthenticated || content.length < 10) return;

    setOneNoteSyncStatus('syncing');

    try {
      const account = msalInstance.getAllAccounts()[0];
      const response = await msalInstance.acquireTokenSilent({
        scopes: ["Notes.Create", "Notes.ReadWrite"],
        account: account
      });
      
      const token = response.accessToken;
      const dateStr = new Date().toLocaleString();
      const title = `SOAP Note - ${dateStr}`;
      
      // Convert line breaks to HTML for OneNote
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${title}</title>
            <meta name="created" content="${new Date().toISOString()}" />
          </head>
          <body>
            <p>${content.replace(/\n/g, '<br />')}</p>
          </body>
        </html>
      `;

      if (!oneNotePageId) {
        // Create new page
        const createRes = await fetch("https://graph.microsoft.com/v1.0/me/onenote/pages", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "text/html"
          },
          body: htmlContent
        });
        
        if (!createRes.ok) throw new Error("Failed to create page");
        const data = await createRes.json();
        setOneNotePageId(data.id);
      } else {
        // Update existing page (Append/Replace is complex in OneNote API, simplistic approach: PATCH content)
        // Note: Replacing entire body is tricky. For this demo, we'll try to PATCH the body if supported, 
        // or usually creates a new page if "Update" fails or is too complex for this context.
        // The OneNote API specific 'PATCH content' endpoint is:
        
        const patchRes = await fetch(`https://graph.microsoft.com/v1.0/me/onenote/pages/${oneNotePageId}/content`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify([
            {
              "target": "body",
              "action": "replace",
              "content": `<body><p>${content.replace(/\n/g, '<br />')}</p></body>`
            }
          ])
        });

        if (!patchRes.ok) {
           // If patch fails (e.g. page deleted), reset ID to create new next time
           if (patchRes.status === 404) setOneNotePageId(null);
           throw new Error("Failed to update page");
        }
      }
      
      setOneNoteSyncStatus('saved');
      setTimeout(() => setOneNoteSyncStatus('idle'), 3000);

    } catch (error) {
      console.error("OneNote Sync Error:", error);
      setOneNoteSyncStatus('error');
    }
  }, [msalInstance, isOneNoteAuthenticated, oneNotePageId]);

  // Debounced Auto-Sync
  useEffect(() => {
    if (oneNoteSaveTimeoutRef.current) clearTimeout(oneNoteSaveTimeoutRef.current);
    
    if (isOneNoteAuthenticated && note.length > 10) {
      oneNoteSaveTimeoutRef.current = setTimeout(() => {
        syncToOneNote(note);
      }, 5000); // Auto-save 5 seconds after stopping typing
    }

    return () => { if (oneNoteSaveTimeoutRef.current) clearTimeout(oneNoteSaveTimeoutRef.current); };
  }, [note, isOneNoteAuthenticated, syncToOneNote]);


  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Cloud Notes Subscription
  useEffect(() => {
    if (!currentUser) return;
    const unsubscribe = subscribeToCloudNotes(currentUser.uid, (cloudNotes) => {
      setSavedNotes(cloudNotes);
    });
    return () => unsubscribe();
  }, [currentUser]);

  // Load initial working draft & local saved notes on mount
  useEffect(() => {
    // 1. Load local history list
    const history = getSavedNotes();
    setSavedNotes(history);

    // 2. Load current working draft
    const draft = loadDraftFromStorage();
    if (draft && draft.note && draft.note.trim().length > 0) {
      setNote(draft.note);
      if (draft.insights) setInsights(draft.insights);
      if (draft.summaryData) setSummaryData(draft.summaryData);
      if (draft.lastSavedAt) setLastSavedAt(draft.lastSavedAt);
      if (draft.activeNoteId) setActiveNoteId(draft.activeNoteId);
      setAutosaveStatus('saved');
    }
  }, []);

  // Automatic Autosave Effect (Local + Cloud)
  useEffect(() => {
    if (!autosaveEnabled) return;

    if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);

    if (note.trim().length > 0) {
      setAutosaveStatus('saving');

      autosaveTimeoutRef.current = setTimeout(async () => {
        const now = Date.now();

        // 1. Persist current working draft locally
        saveDraftToStorage({
          note,
          insights,
          summaryData,
          lastSavedAt: now,
          activeNoteId,
        });

        // 2. Store/sync in saved history list (local + cloud)
        if (note.trim().length >= 10) {
          const savedNote = saveNoteToHistory({
            id: activeNoteId || undefined,
            note,
            insights,
            summaryData,
          });
          setActiveNoteId(savedNote.id);

          // If logged in to Firebase Cloud, sync note to Firestore
          if (currentUser) {
            try {
              await saveNoteToCloud(currentUser.uid, {
                id: savedNote.id,
                note,
                insights,
                summaryData,
              });
            } catch (err) {
              console.error("Cloud autosave sync error:", err);
            }
          } else {
            setSavedNotes(getSavedNotes());
          }
        }

        setLastSavedAt(now);
        setAutosaveStatus('saved');
      }, 600); // 600ms debounce
    } else {
      clearDraftStorage();
      setAutosaveStatus('idle');
    }

    return () => {
      if (autosaveTimeoutRef.current) clearTimeout(autosaveTimeoutRef.current);
    };
  }, [note, insights, summaryData, activeNoteId, autosaveEnabled, currentUser]);

  // Storage Handlers
  const handleNewNote = () => {
    setNote('');
    setInsights(null);
    setSummaryData(null);
    setStatus('ready');
    setActiveNoteId(null);
    setOneNotePageId(null);
    clearDraftStorage();
    setAutosaveStatus('idle');
  };

  const handleSelectNoteFromHistory = (selected: SavedNote) => {
    setNote(selected.content);
    setInsights(selected.insights || null);
    setSummaryData(selected.summaryData || null);
    setActiveNoteId(selected.id);
    setLastSavedAt(selected.updatedAt);
    setStatus(selected.insights ? 'success' : 'ready');
    setAutosaveStatus('saved');
  };

  const handleDeleteNoteFromHistory = async (id: string) => {
    const updated = deleteNoteFromHistory(id);
    setSavedNotes(updated);
    if (activeNoteId === id) {
      setActiveNoteId(null);
    }
    if (currentUser) {
      try {
        await deleteCloudNote(id);
      } catch (err) {
        console.error("Error deleting cloud note:", err);
      }
    }
  };

  const handleClearAllHistory = () => {
    clearAllHistory();
    setSavedNotes([]);
    setActiveNoteId(null);
  };

  const handleManualSnapshotSave = async () => {
    if (note.trim().length === 0) return;
    const saved = saveNoteToHistory({
      id: activeNoteId || undefined,
      note,
      insights,
      summaryData,
    });
    setActiveNoteId(saved.id);
    
    if (currentUser) {
      try {
        await saveNoteToCloud(currentUser.uid, {
          id: saved.id,
          note,
          insights,
          summaryData,
        });
      } catch (err) {
        console.error("Error saving cloud snapshot:", err);
      }
    } else {
      setSavedNotes(getSavedNotes());
    }

    setLastSavedAt(Date.now());
    setAutosaveStatus('saved');
  };

  const toggleAutosave = (enabled: boolean) => {
    setAutosaveEnabledState(enabled);
    setAutosaveEnabled(enabled);
  };

  const handleClearNote = () => {
    if (note.length === 0) return;
    if (window.confirm("Start a new note? Current content is automatically stored in history.")) {
      handleNewNote();
    }
  };

  const handleGenerateSummary = async () => {
    if (note.trim().length < 50) {
      alert("Note is too short to summarize effectively (minimum 50 characters).");
      return;
    }
    setIsSummarizing(true);
    setAiError(null);
    try {
      const result = await generateClinicalSummary(note);
      setSummaryData(result);
    } catch (err: any) {
      console.error("Summary error:", err);
      setAiError(err.message || "Failed to generate clinical summary.");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleImproveHPI = async () => {
    if (note.trim().length < 20) return;
    setIsImprovingHPI(true);
    setAiError(null);
    try {
      const improvedNote = await improveHPI(note);
      setNote(improvedNote);
    } catch (err: any) {
      console.error("Failed to improve HPI", err);
      setAiError(err.message || "Failed to improve HPI narrative flow.");
    } finally {
      setIsImprovingHPI(false);
    }
  };

  const copySummaryToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleCopyForOneNote = () => {
    if (!note.trim()) return;
    const formattedHtml = `
      <div style="font-family: 'Segoe UI', Calibri, Arial, sans-serif; font-size: 11pt; line-height: 1.5; color: #1e293b;">
        ${note.replace(/\n/g, '<br/>')}
      </div>
    `;
    try {
      const htmlBlob = new Blob([formattedHtml], { type: 'text/html' });
      const textBlob = new Blob([note], { type: 'text/plain' });
      const item = new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      });
      navigator.clipboard.write([item]).then(() => {
        setIsCopiedOneNote(true);
        setTimeout(() => setIsCopiedOneNote(false), 2500);
      });
    } catch (e) {
      navigator.clipboard.writeText(note);
      setIsCopiedOneNote(true);
      setTimeout(() => setIsCopiedOneNote(false), 2500);
    }
  };

  const handleCopyPlan = () => {
    if (!insights?.proposedPlan) return;
    const plan = insights.proposedPlan;
    const lines: string[] = [];
    lines.push(`PROPOSED CLINICAL MANAGEMENT PLAN`);
    lines.push(`Strategy: ${plan.summary}\n`);

    if (plan.diagnostics && plan.diagnostics.length > 0) {
      lines.push(`DIAGNOSTICS & WORKUP:`);
      plan.diagnostics.forEach(d => lines.push(`• ${d}`));
      lines.push('');
    }

    if (plan.medications && plan.medications.length > 0) {
      lines.push(`MEDICATIONS & THERAPEUTICS:`);
      plan.medications.forEach(m => {
        const details = [m.dosage, m.instructions].filter(Boolean).join(' - ');
        lines.push(`• [${m.action.toUpperCase()}] ${m.name}${details ? `: ${details}` : ''}`);
      });
      lines.push('');
    }

    if (plan.referrals && plan.referrals.length > 0) {
      lines.push(`CONSULTATIONS & REFERRALS:`);
      plan.referrals.forEach(r => lines.push(`• ${r}`));
      lines.push('');
    }

    if (plan.lifestyleOrPrecautions && plan.lifestyleOrPrecautions.length > 0) {
      lines.push(`PATIENT EDUCATION, LIFESTYLE & PRECAUTIONS:`);
      plan.lifestyleOrPrecautions.forEach(l => lines.push(`• ${l}`));
      lines.push('');
    }

    if (plan.dispositionAndFollowUp) {
      lines.push(`DISPOSITION & FOLLOW-UP:`);
      lines.push(`• ${plan.dispositionAndFollowUp}`);
    }

    navigator.clipboard.writeText(lines.join('\n'));
    setIsPlanCopied(true);
    setTimeout(() => setIsPlanCopied(false), 2500);
  };

  const handleInsertPlanIntoNote = () => {
    if (!insights?.proposedPlan) return;
    const plan = insights.proposedPlan;
    const lines: string[] = [];
    lines.push(`\n\n<b>PROPOSED MANAGEMENT PLAN (AI GUIDANCE)</b>`);
    lines.push(`Strategy: ${plan.summary}`);

    if (plan.diagnostics && plan.diagnostics.length > 0) {
      lines.push(`\n<u>Diagnostics:</u>`);
      plan.diagnostics.forEach(d => lines.push(`[ ] ${d}`));
    }

    if (plan.medications && plan.medications.length > 0) {
      lines.push(`\n<u>Therapeutics / Medications:</u>`);
      plan.medications.forEach(m => {
        const details = [m.dosage, m.instructions].filter(Boolean).join(' - ');
        lines.push(`- [${m.action.toUpperCase()}] ${m.name}${details ? `: ${details}` : ''}`);
      });
    }

    if (plan.referrals && plan.referrals.length > 0) {
      lines.push(`\n<u>Referrals:</u>`);
      plan.referrals.forEach(r => lines.push(`[ ] ${r}`));
    }

    if (plan.lifestyleOrPrecautions && plan.lifestyleOrPrecautions.length > 0) {
      lines.push(`\n<u>Non-Pharmacological & Return Precautions:</u>`);
      plan.lifestyleOrPrecautions.forEach(l => lines.push(`- ${l}`));
    }

    if (plan.dispositionAndFollowUp) {
      lines.push(`\n<u>Disposition & Follow-up:</u>`);
      lines.push(`- ${plan.dispositionAndFollowUp}`);
    }

    const planFormattedText = lines.join('\n');

    setNote(prev => {
      const planMarkerRegex = /(<b>P><\/b>|<b>P>|P>)/i;
      const match = prev.match(planMarkerRegex);
      if (match && match.index !== undefined) {
        const insertPosition = match.index + match[0].length;
        return prev.slice(0, insertPosition) + planFormattedText + prev.slice(insertPosition);
      }
      return prev + planFormattedText;
    });

    setIsPlanInserted(true);
    setTimeout(() => setIsPlanInserted(false), 2500);
  };

  const handleTemplateClick = (tmpl: Template) => {
    if (note.trim().length > 0) {
      setPendingTemplate(tmpl);
      setShowOverwriteModal(true);
    } else {
      setNote(tmpl.content);
    }
  };

  const confirmOverwrite = () => {
    if (pendingTemplate) {
      setNote(pendingTemplate.content);
    }
    closeOverwriteModal();
  };

  const closeOverwriteModal = () => {
    setShowOverwriteModal(false);
    setPendingTemplate(null);
  };

  const performAnalysis = useCallback(async (text: string) => {
    if (text.trim().length < 20) {
      alert("Note is too short to analyze. Please enter at least 20 characters.");
      setStatus('ready');
      return;
    }

    setStatus('analyzing');
    setAiError(null);
    try {
      const result = await analyzeClinicalNote(text);
      if (result.differentials) {
        result.differentials.sort((a, b) => (b.isMostLikely ? 1 : 0) - (a.isMostLikely ? 1 : 0));
      }
      setInsights(result);
      setStatus('success');
    } catch (err: any) {
      console.error("Clinical analysis failed:", err);
      setStatus('error');
      setAiError(err.message || "Clinical analysis failed.");
    }
  }, []);

  // Reset status to ready when note changes, indicating re-analysis might be needed
  useEffect(() => {
    if (status === 'success' || status === 'error') {
      setStatus('ready');
    }
  }, [note]);

  const openTestDetails = (name: string) => {
    const testKey = Object.keys(PE_MANEUVERS).find(k => 
      name.toLowerCase().includes(k.toLowerCase()) || 
      k.toLowerCase().includes(name.toLowerCase())
    );
    const details = testKey ? PE_MANEUVERS[testKey] : { 
      steps: ["Consult clinical faculty or textbook for specific steps for this maneuver."], 
      source: "General Clinical Reference" 
    };
    setSelectedManeuver({ name: testKey || name, details });
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      {/* Header and Template Bar Container - Collapsible */}
      {isHeaderVisible && (
        <div className="shrink-0 animate-in slide-in-from-top duration-300">
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg shadow-md">
                <Stethoscope className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight transition-colors duration-300">SOAPscriber</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider transition-colors duration-300">Medical Charting Support</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {/* OneNote Sync Indicator */}
              {isOneNoteAuthenticated && (
                 <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all duration-300 ${
                  oneNoteSyncStatus === 'syncing' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300' :
                  oneNoteSyncStatus === 'saved' ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/40 dark:border-purple-700 dark:text-purple-300' :
                  oneNoteSyncStatus === 'error' ? 'bg-red-50 border-red-200 text-red-700' :
                  'bg-transparent border-transparent text-slate-400'
                }`}>
                  {oneNoteSyncStatus === 'syncing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                  {oneNoteSyncStatus === 'syncing' ? 'Syncing...' : oneNoteSyncStatus === 'saved' ? 'Saved to OneNote' : oneNoteSyncStatus === 'error' ? 'Sync Failed' : 'OneNote Active'}
                 </div>
              )}

              {/* Analyze Button */}
              <button 
                onClick={() => performAnalysis(note)}
                disabled={status === 'analyzing' || note.length < 20}
                className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${status === 'analyzing' ? 'animate-pulse' : ''}`}
                title="Run Clinical Analysis"
              >
                {status === 'analyzing' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BrainCircuit className="w-3.5 h-3.5" />}
                {status === 'analyzing' ? 'Analyzing...' : 'Analyze Note'}
              </button>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all duration-300 ${
                status === 'analyzing' ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-300 animate-pulse-custom' :
                status === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/40 dark:border-green-700 dark:text-green-300' :
                status === 'error' ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/40 dark:border-red-700 dark:text-red-300' :
                'bg-slate-50 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400'
              }`}>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{status === 'analyzing' ? 'Running...' : status === 'success' ? 'Insights Ready' : status === 'error' ? 'Analysis Failed' : 'Ready'}</span>
              </div>
              
              <div className="flex items-center border-l border-slate-200 dark:border-slate-800 pl-4 gap-2 transition-colors duration-300">
                {currentUser ? (
                  <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200">
                    <CloudCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span className="hidden md:inline max-w-[130px] truncate" title={currentUser.email || 'Cloud Account'}>
                      {currentUser.email ? currentUser.email.split('@')[0] : 'Cloud Account'}
                    </span>
                    <button
                      onClick={logoutUser}
                      className="p-1 hover:bg-emerald-200 dark:hover:bg-emerald-800/60 rounded-md transition-colors text-emerald-700 dark:text-emerald-300"
                      title="Sign Out of Cloud Account"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
                    title="Sign In to Sync Notes to Cloud"
                  >
                    <Cloud className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign In / Sync</span>
                  </button>
                )}

                <button 
                  onClick={() => setShowHistoryModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                  title="Open Saved Notes History"
                >
                  <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="hidden sm:inline">Saved Notes</span>
                  {savedNotes.length > 0 && (
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                      {savedNotes.length}
                    </span>
                  )}
                </button>
                <button 
                  onClick={handleGenerateSummary}
                  disabled={isSummarizing || note.length < 50}
                  className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-md hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed ${isSummarizing ? 'animate-pulse' : ''}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isSummarizing ? 'Summarizing...' : 'Summarize'}
                </button>
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all duration-200">
                  {isDarkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-blue-600" />}
                </button>
                <button onClick={() => setShowSettings(true)} className={`p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition-all duration-200 ${isOneNoteAuthenticated ? 'text-purple-600 dark:text-purple-400 ring-1 ring-purple-500/30' : ''}`}>
                  <Settings className="w-5 h-5" />
                </button>
                <button onClick={handleClearNote} className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-red-100 dark:hover:bg-red-900/40 text-slate-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 rounded-lg transition-all duration-200" title="Start new note">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* Template Toolbar */}
          <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-2.5 flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-slate-200 dark:border-slate-800 pr-5 shrink-0">
              <Layout className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">SOAP Templates</span>
            </div>
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar py-0.5 pr-6 flex-1 items-center">
              {TEMPLATES.map((tmpl) => (
                <button key={tmpl.name} onClick={() => handleTemplateClick(tmpl)} className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-600 dark:text-slate-300 rounded-lg text-[11px] font-bold transition-all flex items-center gap-2 whitespace-nowrap shadow-sm border border-slate-200 dark:border-slate-700">
                  <FileText className="w-3.5 h-3.5 opacity-60" />
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <main className="flex flex-1 overflow-hidden p-6 gap-6 relative">
        <section className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden min-w-0 transition-all duration-300">
          <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
               <FileText className="w-4 h-4 text-slate-400" />
               <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Clinical Document</span>
               
               {/* Real-time Autosave Status Indicator */}
               {autosaveEnabled && (
                 <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300">
                    {autosaveStatus === 'saving' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span>Autosaving...</span>
                      </>
                    ) : lastSavedAt ? (
                      <>
                        <Save className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Autosaved {new Date(lastSavedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3 h-3 text-slate-400" />
                        <span>Autosave Ready</span>
                      </>
                    )}
                 </div>
               )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-400 font-mono">{note.length.toLocaleString()} CHARS</span>
              
              <button 
                onClick={handleCopyForOneNote}
                disabled={note.length === 0}
                className="text-[11px] font-bold text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Copy note with rich formatting ready to paste directly into Microsoft OneNote"
              >
                {isCopiedOneNote ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <ClipboardList className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />}
                <span>{isCopiedOneNote ? 'Copied for OneNote!' : 'Copy for OneNote'}</span>
              </button>

              <button 
                onClick={handleManualSnapshotSave}
                disabled={note.length === 0}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                title="Save snapshot to history now"
              >
                <BookmarkCheck className="w-3.5 h-3.5" /> Save Snapshot
              </button>

              <button 
                onClick={() => setIsHeaderVisible(!isHeaderVisible)}
                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                title={isHeaderVisible ? "Maximize Editor (Hide Header)" : "Restore Header"}
              >
                {isHeaderVisible ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="flex-1 p-8 resize-none outline-none bg-transparent text-slate-800 dark:text-slate-100 leading-relaxed font-mono text-sm placeholder:text-slate-300 dark:placeholder:text-slate-800"
            placeholder="Start typing clinical findings or select a template..."
          />
        </section>

        <aside className={`flex flex-col gap-4 transition-all duration-300 ease-in-out shrink-0 ${
          isSidebarOpen ? 'w-[360px]' : 'w-[72px]'
        }`}>
          {isSidebarOpen ? (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
              <div className="px-5 py-4 bg-slate-800 dark:bg-slate-950 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <BrainCircuit className="text-blue-400 w-5 h-5" />
                  <h2 className="text-white font-bold text-xs tracking-widest uppercase">Clinical Intelligence</h2>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-slate-400 hover:text-white transition-colors p-1"
                  title="Minimize sidebar"
                >
                  <ChevronsRight className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-5 flex-1 overflow-y-auto space-y-6 no-scrollbar bg-transparent">
                {/* AI Error / Notice Banner */}
                {aiError && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2.5 animate-in fade-in duration-300 shadow-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <span className="font-bold text-xs text-amber-950 dark:text-amber-200">Clinical AI Notice</span>
                      </div>
                      <button 
                        onClick={() => setAiError(null)} 
                        className="text-amber-400 hover:text-amber-700 dark:hover:text-amber-200 p-0.5"
                        title="Dismiss notice"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                      {aiError}
                    </p>
                    {aiError.toLowerCase().includes('api key') && (
                      <div className="p-2.5 bg-white/80 dark:bg-slate-900/80 rounded-xl border border-amber-200 dark:border-amber-800/80 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                        <p className="font-bold flex items-center gap-1 text-amber-800 dark:text-amber-300">
                          <Info className="w-3.5 h-3.5 text-amber-600" /> Setup Instructions:
                        </p>
                        <p className="text-slate-600 dark:text-slate-300 leading-normal">
                          Open <strong>Settings &gt; Secrets</strong> in the AI Studio environment and select or add your <code>GEMINI_API_KEY</code>.
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => performAnalysis(note)}
                        disabled={status === 'analyzing' || note.length < 20}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        {status === 'analyzing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                        <span>{status === 'analyzing' ? 'Retrying...' : 'Retry Analysis'}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Documentation Tools Section - Always visible if insights are present or analysis is possible */}
                {insights && (
                   <div className="space-y-4">
                     <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-3">
                        Documentation Tools <span className="h-px flex-1 bg-slate-100 dark:bg-slate-800"></span>
                     </p>
                     <button
                      onClick={handleImproveHPI}
                      disabled={isImprovingHPI}
                      className="w-full p-4 bg-indigo-50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center justify-between group transition-all"
                     >
                       <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-indigo-200 dark:bg-indigo-800 rounded-lg">
                           <Wand2 className="w-4 h-4 text-indigo-700 dark:text-indigo-200" />
                         </div>
                         <span>{isImprovingHPI ? 'Polishing Narrative...' : 'Fix HPI Grammar & Flow'}</span>
                       </div>
                       {isImprovingHPI ? (
                         <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></span>
                       ) : (
                         <ChevronRight className="w-4 h-4 text-indigo-400 transform group-hover:translate-x-1 transition-transform" />
                       )}
                     </button>
                   </div>
                )}

                {!insights ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400 dark:text-slate-700">
                    <MessageSquare className="w-16 h-16 mb-6 opacity-20" />
                    <p className="text-xs font-medium italic leading-relaxed max-w-[220px] mb-6">
                      Enter patient details and press analyze to generate differentials and clinical suggestions.
                    </p>
                    <button 
                        onClick={() => performAnalysis(note)}
                        disabled={status === 'analyzing' || note.length < 20}
                        className="px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-xs font-bold transition-all border border-transparent hover:border-blue-200 dark:hover:border-blue-800 flex items-center gap-2"
                    >
                        <Play className="w-3 h-3 fill-current" />
                        Run Analysis
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Intelligence Filter Tabs */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold">
                      <button
                        onClick={() => setActiveIntelligenceTab('all')}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center ${
                          activeIntelligenceTab === 'all' 
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setActiveIntelligenceTab('plan')}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                          activeIntelligenceTab === 'plan' 
                            ? 'bg-teal-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <ClipboardList className="w-3 h-3" /> Plan
                      </button>
                      <button
                        onClick={() => setActiveIntelligenceTab('differentials')}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                          activeIntelligenceTab === 'differentials' 
                            ? 'bg-emerald-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <Target className="w-3 h-3" /> Diff ({insights.differentials.length})
                      </button>
                      <button
                        onClick={() => setActiveIntelligenceTab('questions')}
                        className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1 ${
                          activeIntelligenceTab === 'questions' 
                            ? 'bg-blue-600 text-white shadow-xs' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <MessageSquare className="w-3 h-3" /> Q & PE
                      </button>
                    </div>

                    {/* Proposed Patient Plan Section */}
                    {insights.proposedPlan && (activeIntelligenceTab === 'all' || activeIntelligenceTab === 'plan') && (
                      <div className="space-y-4 p-4 bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-bold text-teal-700 dark:text-teal-300 uppercase tracking-widest flex items-center gap-2">
                            <ClipboardList className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" /> Proposed Plan
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={handleCopyPlan}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs"
                              title="Copy plan to clipboard"
                            >
                              {isPlanCopied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                              <span>{isPlanCopied ? 'Copied' : 'Copy'}</span>
                            </button>
                            <button
                              onClick={handleInsertPlanIntoNote}
                              className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all shadow-xs"
                              title="Insert proposed plan into note P> section"
                            >
                              {isPlanInserted ? <CheckCircle2 className="w-3 h-3 text-teal-200" /> : <FilePlus className="w-3 h-3" />}
                              <span>{isPlanInserted ? 'Inserted!' : 'Insert to Note (P>)'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Overall Management Strategy */}
                        <div className="p-3 bg-white dark:bg-slate-800/90 border border-teal-100 dark:border-teal-900/60 rounded-xl space-y-1 shadow-2xs">
                          <span className="text-[9px] font-black uppercase tracking-wider text-teal-700 dark:text-teal-300 flex items-center gap-1">
                            <Target className="w-3 h-3" /> Management Strategy
                          </span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                            {insights.proposedPlan.summary}
                          </p>
                        </div>

                        {/* 1. Diagnostics & Workup */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            <FlaskConical className="w-3 h-3 text-indigo-500" />
                            <span>Diagnostics & Tests</span>
                          </div>
                          <div className="space-y-1">
                            {insights.proposedPlan.diagnostics.length > 0 ? (
                              insights.proposedPlan.diagnostics.map((diag, idx) => (
                                <div key={idx} className="p-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/80 rounded-lg text-xs text-slate-800 dark:text-slate-200 flex items-start gap-2 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
                                  <span className="leading-snug">{diag}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-[11px] text-slate-400 italic pl-1">No additional tests indicated (clinical diagnosis).</p>
                            )}
                          </div>
                        </div>

                        {/* 2. Medications */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                            <Pill className="w-3 h-3 text-emerald-500" />
                            <span>Medications & Therapeutics</span>
                          </div>
                          <div className="space-y-1.5">
                            {insights.proposedPlan.medications.length > 0 ? (
                              insights.proposedPlan.medications.map((med, idx) => {
                                const actionUpper = (med.action || '').toUpperCase();
                                const badgeColor = 
                                  actionUpper.includes('START') ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' :
                                  actionUpper.includes('ADJUST') ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700' :
                                  actionUpper.includes('HOLD') ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700' :
                                  actionUpper.includes('SYMPT') ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300 dark:border-purple-700' :
                                  'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700';

                                return (
                                  <div key={idx} className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xs space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100">{med.name}</span>
                                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                        {med.action}
                                      </span>
                                    </div>
                                    {med.dosage && (
                                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-300 font-medium">
                                        {med.dosage}
                                      </p>
                                    )}
                                    {med.instructions && (
                                      <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">
                                        {med.instructions}
                                      </p>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              <p className="text-[11px] text-slate-400 italic pl-1">No medication adjustments or prescriptions indicated.</p>
                            )}
                          </div>
                        </div>

                        {/* 3. Referrals */}
                        {insights.proposedPlan.referrals && insights.proposedPlan.referrals.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <UserPlus className="w-3 h-3 text-sky-500" />
                              <span>Referrals & Consultations</span>
                            </div>
                            <div className="space-y-1">
                              {insights.proposedPlan.referrals.map((ref, idx) => (
                                <div key={idx} className="p-2 bg-sky-50/60 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-800/60 rounded-lg text-xs text-sky-900 dark:text-sky-200 flex items-start gap-2 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                                  <span className="leading-snug">{ref}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 4. Lifestyle & Precautions */}
                        {insights.proposedPlan.lifestyleOrPrecautions && insights.proposedPlan.lifestyleOrPrecautions.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <ShieldAlert className="w-3 h-3 text-amber-500" />
                              <span>Precautions & Lifestyle</span>
                            </div>
                            <div className="space-y-1">
                              {insights.proposedPlan.lifestyleOrPrecautions.map((item, idx) => (
                                <div key={idx} className="p-2 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-800/40 rounded-lg text-xs text-amber-950 dark:text-amber-200 flex items-start gap-2 shadow-2xs">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  <span className="leading-snug">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 5. Disposition & Observation / Follow-Up */}
                        {insights.proposedPlan.dispositionAndFollowUp && (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                              <Calendar className="w-3 h-3 text-rose-500" />
                              <span>Observation & Follow-Up</span>
                            </div>
                            <div className="p-2.5 bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 rounded-xl text-xs text-rose-950 dark:text-rose-200 leading-relaxed font-medium shadow-2xs">
                              {insights.proposedPlan.dispositionAndFollowUp}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Differential Diagnoses */}
                    {(activeIntelligenceTab === 'all' || activeIntelligenceTab === 'differentials') && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-3">
                          Differential Diagnoses <span className="h-px flex-1 bg-emerald-100 dark:bg-emerald-900/40"></span>
                        </p>
                        <div className="grid gap-2.5">
                          {insights.differentials.map((diff, idx) => (
                            <button 
                              key={idx}
                              onClick={() => setSelectedDifferential(diff)}
                              className={`w-full text-left p-4 rounded-xl text-xs font-bold flex flex-col gap-1 group transition-all duration-300 shadow-sm border ${
                                diff.isMostLikely 
                                ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200' 
                                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                              } hover:border-emerald-300`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate pr-2 uppercase tracking-wide">{diff.diagnosis}</span>
                                {diff.isMostLikely && (
                                  <span className="flex items-center gap-1 bg-emerald-600 text-[8px] text-white px-2 py-0.5 rounded-full font-black uppercase tracking-tighter animate-pulse-custom">
                                    <Target className="w-2 h-2" /> Most Likely
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 opacity-70">
                                 {diff.criteria && <span className="flex items-center gap-1 text-[9px]"><ListChecks className="w-3 h-3" /> Criteria</span>}
                                 {diff.score && <span className="flex items-center gap-1 text-[9px]"><Calculator className="w-3 h-3" /> Score</span>}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recommended Questions */}
                    {(activeIntelligenceTab === 'all' || activeIntelligenceTab === 'questions') && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-3">
                          Recommended Questions <span className="h-px flex-1 bg-blue-100 dark:bg-blue-900/40"></span>
                        </p>
                        <div className="space-y-3">
                          {insights.questions.map((q, idx) => (
                            <div key={idx} className="p-4 bg-blue-50/50 dark:bg-blue-900/10 border-l-4 border-blue-500 rounded-r-xl text-xs text-blue-900 dark:text-blue-200 leading-relaxed shadow-sm">
                              {q}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Examination Maneuvers */}
                    {(activeIntelligenceTab === 'all' || activeIntelligenceTab === 'questions') && (
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-3">
                          Examination Maneuvers <span className="h-px flex-1 bg-purple-100 dark:bg-purple-900/40"></span>
                        </p>
                        <div className="grid gap-2.5">
                          {insights.tests.map((t, idx) => (
                            <button key={idx} onClick={() => openTestDetails(t)} className="w-full text-left p-4 bg-purple-50 dark:bg-purple-900/10 hover:bg-purple-100 border border-purple-100 dark:border-purple-800 rounded-xl text-xs text-purple-900 dark:text-purple-200 font-bold flex items-center justify-between group shadow-sm transition-all">
                              <span className="truncate pr-2">{t}</span> 
                              <ChevronRight className="w-4 h-4 text-purple-400 transform group-hover:translate-x-1 transition-transform" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-start gap-3.5 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight font-medium">
                    Analysis based on established protocols. Always rely on clinical judgment.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center pt-0 animate-in fade-in duration-300">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="w-[72px] h-[72px] bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center group relative hover:scale-105 transition-all"
                title="Expand Clinical Intelligence"
              >
                <BrainCircuit className="w-8 h-8 text-blue-500 group-hover:text-blue-600 transition-colors" />
                {status === 'success' && (
                  <span className="absolute top-3 right-3 w-3 h-3 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full"></span>
                )}
              </button>
            </div>
          )}
        </aside>
      </main>

      {/* Settings Modal (For OneNote Integration) */}
      {showSettings && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95">
             <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Application Settings</h3>
                </div>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-5 h-5" />
                </button>
             </div>
             <div className="p-6 space-y-6">
               <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <CloudCog className="w-4 h-4 text-purple-500" /> OneNote Integration
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Connect your Microsoft account to automatically save your SOAP notes to a dedicated OneNote page.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Azure Application (Client) ID</label>
                      <input 
                        type="text" 
                        value={oneNoteClientId}
                        onChange={(e) => saveClientId(e.target.value)}
                        placeholder="e.g. 12345678-abcd-efgh-ijkl-1234567890ab"
                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono outline-none focus:ring-2 focus:ring-purple-500/50 transition-all text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {/* Redirect URI Box */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        <span>App Redirect URI (For Azure SPA)</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(window.location.origin);
                            setCopiedRedirectUri(true);
                            setTimeout(() => setCopiedRedirectUri(false), 2000);
                          }}
                          className="text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-bold lowercase text-[10px]"
                        >
                          {copiedRedirectUri ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedRedirectUri ? 'copied' : 'copy uri'}</span>
                        </button>
                      </div>
                      <div className="p-2 bg-slate-100 dark:bg-slate-800/80 rounded-xl font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate select-all border border-slate-200 dark:border-slate-700">
                        {window.location.origin}
                      </div>
                    </div>

                    {/* Collapsible Step-by-Step Guide */}
                    <div className="border border-purple-100 dark:border-purple-900/60 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowOneNoteGuide(!showOneNoteGuide)}
                        className="w-full text-left p-2.5 bg-purple-50/70 dark:bg-purple-950/30 hover:bg-purple-100/60 dark:hover:bg-purple-900/40 text-purple-800 dark:text-purple-200 text-xs font-bold flex items-center justify-between transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" /> How to setup Azure OneNote (5 Steps)
                        </span>
                        <ChevronRight className={`w-3.5 h-3.5 transform transition-transform ${showOneNoteGuide ? 'rotate-90' : ''}`} />
                      </button>

                      {showOneNoteGuide && (
                        <div className="p-3 bg-white dark:bg-slate-900 border-t border-purple-100 dark:border-purple-900/40 text-[11px] text-slate-600 dark:text-slate-300 space-y-2">
                          <ol className="list-decimal pl-4 space-y-1.5 leading-relaxed">
                            <li>
                              Go to the <strong><a href="https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps" target="_blank" rel="noopener noreferrer" className="text-purple-600 dark:text-purple-400 underline inline-flex items-center gap-0.5">Azure App Registrations <ExternalLink className="w-2.5 h-2.5" /></a></strong> portal.
                            </li>
                            <li>
                              Click <strong>New registration</strong>. Set Name to <em>SOAPscriber</em>.
                            </li>
                            <li>
                              Under <strong>Supported account types</strong>, choose <strong>Accounts in any organizational directory and personal Microsoft accounts</strong> (enables personal Outlook/Hotmail & Work accounts).
                            </li>
                            <li>
                              Under <strong>Redirect URI</strong>:
                              <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-500 dark:text-slate-400">
                                <li>Select platform: <strong>Single-page application (SPA)</strong></li>
                                <li>Paste your Redirect URI: <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px] text-purple-600 dark:text-purple-300">{window.location.origin}</code></li>
                              </ul>
                            </li>
                            <li>
                              Go to <strong>API permissions</strong> &gt; <strong>Add a permission</strong> &gt; <strong>Microsoft Graph</strong> &gt; <strong>Delegated permissions</strong> &gt; check <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Notes.Create</code> and <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">Notes.ReadWrite</code>.
                            </li>
                            <li>
                              Copy the <strong>Application (client) ID</strong> from the Overview tab, paste it above, and click <strong>Connect Microsoft Account</strong>!
                            </li>
                          </ol>
                          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 space-y-2">
                            <p className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" /> Seeing "Ability to create applications outside of a directory has been deprecated" or Error 401?
                            </p>
                            <p className="leading-relaxed">
                              Microsoft recently required every app to belong to an Azure directory. If your account doesn't have an active directory yet:
                            </p>
                            <ol className="list-decimal pl-4 space-y-1 text-slate-700 dark:text-slate-300">
                              <li>
                                Click the blue link in Azure: <strong>"signing up for Azure"</strong> (or go to <a href="https://azure.microsoft.com/free" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-purple-600 dark:text-purple-400">azure.microsoft.com/free</a>). This creates a free directory ($0 cost).
                              </li>
                              <li>
                                Once created, return to <strong>App registrations</strong> and the registration form will open normally!
                              </li>
                            </ol>
                            <div className="pt-1 border-t border-amber-200/60 dark:border-amber-800/60 text-[10px] text-amber-800 dark:text-amber-300">
                              💡 <strong>Zero-Setup Alternative:</strong> You don't need Azure at all! Click <strong>"Copy for OneNote"</strong> in the editor toolbar, open OneNote Web or Desktop, and paste (<kbd className="font-mono bg-white dark:bg-slate-800 px-1 py-0.5 rounded border">Ctrl+V</kbd>). All clinical formatting is preserved.
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {!isOneNoteAuthenticated ? (
                      <button 
                        onClick={handleOneNoteLogin}
                        disabled={!oneNoteClientId}
                        className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs"
                      >
                         <CloudCog className="w-3.5 h-3.5" /> Connect Microsoft Account
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                         <div className="w-full py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2">
                            <Check className="w-4 h-4" /> Microsoft OneNote Connected
                         </div>
                         <button 
                          onClick={handleOneNoteLogout}
                          className="w-full py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                        >
                           <LogOut className="w-3 h-3" /> Disconnect
                        </button>
                      </div>
                    )}
                  </div>
               </div>

               {/* Local Storage & Autosave Settings */}
               <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-emerald-500" /> Autosave & Local Storage
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
                    Inputted clinical data is automatically saved locally in your browser to prevent accidental data loss.
                  </p>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Automatic Autosave</div>
                        <div className="text-[10px] text-slate-400">Save edits continuously in local storage</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={autosaveEnabled} 
                          onChange={(e) => toggleAutosave(e.target.checked)} 
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:after:border-slate-600 peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          setShowSettings(false);
                          setShowHistoryModal(true);
                        }}
                        className="flex-1 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <History className="w-3.5 h-3.5" /> View Saved Notes ({savedNotes.length})
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm("Delete all saved history notes from browser memory?")) {
                            handleClearAllHistory();
                          }
                        }}
                        disabled={savedNotes.length === 0}
                        className="py-2 px-3 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Clear Storage
                      </button>
                    </div>
                  </div>
               </div>
             </div>
             <div className="bg-slate-50 dark:bg-slate-950/50 p-4 text-center border-t border-slate-100 dark:border-slate-800">
                <a href="https://learn.microsoft.com/en-us/entra/identity-platform/quickstart-register-app" target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline font-medium">
                  How to get a Client ID?
                </a>
             </div>
          </div>
        </div>
      )}

      {/* OVERWRITE CONFIRMATION MODAL */}
      {showOverwriteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">Overwrite existing notes?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                Loading the <span className="font-bold text-slate-700 dark:text-slate-200">"{pendingTemplate?.name}"</span> template will replace your current documentation.
              </p>
              <div className="flex w-full gap-3">
                <button onClick={closeOverwriteModal} className="flex-1 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-sm font-bold">Keep Existing</button>
                <button onClick={confirmOverwrite} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-bold shadow-lg">Overwrite</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Summary Modal */}
      {summaryData && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-300 my-auto">
            <div className="px-8 py-6 bg-blue-600 dark:bg-blue-950 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                   <Sparkles className="text-white w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-white font-bold text-lg tracking-tight uppercase leading-none">Clinical Summary</h3>
                   <p className="text-blue-100 text-[10px] font-bold uppercase tracking-widest mt-1">Findings Overview</p>
                </div>
              </div>
              <button onClick={() => setSummaryData(null)} className="p-2 text-blue-100 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Professional Handoff */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Target className="w-3.5 h-3.5" /> Professional Handoff
                  </h4>
                  <button 
                    onClick={() => copySummaryToClipboard(summaryData.handoff)} 
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <Copy className="w-3 h-3" /> Copy Handoff
                  </button>
                </div>
                <div className="p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800 rounded-2xl">
                  <p className="text-[14px] text-slate-800 dark:text-slate-200 leading-relaxed font-medium whitespace-pre-wrap">
                    {summaryData.handoff}
                  </p>
                </div>
              </section>

              {/* Concise S/O Summary */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <UserRoundSearch className="w-3.5 h-3.5" /> 5-Sentence S/O Summary
                  </h4>
                  <button 
                    onClick={() => copySummaryToClipboard(summaryData.conciseSO)} 
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                  >
                    <Copy className="w-3 h-3" /> Copy S/O
                  </button>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 rounded-2xl border-dashed">
                  <p className="text-[14px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium whitespace-pre-wrap italic">
                    {summaryData.conciseSO}
                  </p>
                </div>
              </section>

              {hasCopied && (
                <div className="flex items-center justify-center gap-2 text-green-600 font-bold text-xs animate-in slide-in-from-bottom-2">
                  <CheckCircle2 className="w-4 h-4" /> Summary copied to clipboard
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={() => setSummaryData(null)} 
                  className="w-full px-8 py-4 bg-slate-900 dark:bg-blue-800 hover:bg-slate-800 text-white rounded-2xl text-sm font-black transition-all shadow-lg"
                >
                  Return to Documentation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Differential Rationale & Calculator Modal */}
      {selectedDifferential && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-6 animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95 duration-300 my-auto">
            <div className="px-8 py-6 bg-emerald-600 dark:bg-emerald-950 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white/20 rounded-lg">
                   <ClipboardList className="text-white w-6 h-6" />
                </div>
                <div>
                   <h3 className="text-white font-bold text-lg tracking-tight uppercase leading-none">{selectedDifferential.diagnosis}</h3>
                   <p className="text-emerald-100 text-[10px] font-bold uppercase tracking-widest mt-1">Clinical Intelligence</p>
                </div>
              </div>
              <button onClick={() => setSelectedDifferential(null)} className="p-2 text-emerald-100 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto no-scrollbar">
              {/* Rationale */}
              <section className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-3.5 h-3.5" /> Clinical Rationale
                </h4>
                <div className="p-5 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800 rounded-2xl">
                  <p className="text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed font-medium italic">
                    "{selectedDifferential.rationale}"
                  </p>
                </div>
              </section>

              {/* Diagnostic Criteria */}
              {selectedDifferential.criteria && selectedDifferential.criteria.length > 0 && (
                <section className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ListChecks className="w-3.5 h-3.5" /> Diagnostic Criteria
                  </h4>
                  <div className="grid gap-3">
                    {selectedDifferential.criteria.map((item, idx) => (
                      <div key={idx} className="flex gap-4 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 group hover:border-emerald-200 transition-colors">
                        <div className="w-5 h-5 bg-emerald-100 dark:bg-emerald-900/40 rounded-full flex items-center justify-center text-[10px] font-bold text-emerald-600 shrink-0">
                          {idx + 1}
                        </div>
                        <p className="text-[13px] text-slate-600 dark:text-slate-300 font-medium">{item}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Clinical Score / Calculator */}
              {selectedDifferential.score && (
                <section className="space-y-4">
                   <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5" /> {selectedDifferential.score.name} Calculator
                  </h4>
                  <div className="p-6 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl space-y-5">
                    <div className="flex items-center justify-between">
                       <span className="text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Point Breakdown</span>
                       <div className="text-2xl font-black text-blue-600 flex items-baseline gap-1">
                          {selectedDifferential.score.value}
                          <span className="text-[10px] opacity-60 font-bold uppercase tracking-tighter">/ {selectedDifferential.score.max} pts</span>
                       </div>
                    </div>
                    <div className="space-y-2 border-t border-blue-200/30 pt-4">
                      {selectedDifferential.score.breakdown.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-[12px] text-blue-900 dark:text-blue-200">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-blue-600 text-white p-4 rounded-xl flex items-center gap-3 shadow-lg shadow-blue-500/20">
                       <Target className="w-5 h-5 shrink-0" />
                       <div className="flex flex-col">
                         <span className="text-[8px] font-black uppercase tracking-widest opacity-80">Interpretation</span>
                         <span className="text-xs font-bold leading-tight">{selectedDifferential.score.interpretation}</span>
                       </div>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
              <button onClick={() => setSelectedDifferential(null)} className="w-full px-8 py-3 bg-slate-900 dark:bg-emerald-800 hover:bg-slate-800 text-white rounded-2xl text-sm font-black transition-all shadow-lg">
                Return to Workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Maneuver Details Modal */}
      {selectedManeuver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-6 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transform animate-in zoom-in-95">
            <div className="px-8 py-6 bg-slate-800 dark:bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-blue-500/20 rounded-lg"><Info className="text-blue-400 w-6 h-6" /></div>
                <h3 className="text-white font-bold text-lg tracking-tight uppercase">{selectedManeuver.name}</h3>
              </div>
              <button onClick={() => setSelectedManeuver(null)} className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-10 space-y-6">
              {selectedManeuver.details.steps.map((step, idx) => (
                <div key={idx} className="flex gap-5 items-start">
                  <span className="flex-shrink-0 w-8 h-8 bg-blue-50 dark:bg-blue-900/40 text-blue-600 rounded-xl flex items-center justify-center text-sm font-black border border-blue-100 dark:border-blue-800">{idx + 1}</span>
                  <p className="text-[15px] text-slate-700 dark:text-slate-300 leading-relaxed font-medium pt-1">{step}</p>
                </div>
              ))}
              <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="text-[11px] text-slate-400 uppercase tracking-widest font-bold">Source: <span className="text-slate-700 dark:text-slate-200 ml-1">{selectedManeuver.details.source}</span></div>
                <button onClick={() => setSelectedManeuver(null)} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-black transition-all">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Notes History Modal */}
      <SavedNotesModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        savedNotes={savedNotes}
        onSelectNote={handleSelectNoteFromHistory}
        onDeleteNote={handleDeleteNoteFromHistory}
        onClearAll={handleClearAllHistory}
        onNewNote={handleNewNote}
        activeNoteId={activeNoteId}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Firebase User Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
};

export default App;
