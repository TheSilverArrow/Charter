
export interface PEManeuver {
  steps: string[];
  source: string;
}

export interface PE_MANEUVERS_TYPE {
  [key: string]: PEManeuver;
}

export interface Template {
  name: string;
  content: string;
}

export interface ClinicalScore {
  name: string;
  value: number;
  max: number;
  breakdown: string[];
  interpretation: string;
}

export interface Differential {
  diagnosis: string;
  rationale: string;
  isMostLikely: boolean;
  criteria?: string[];
  score?: ClinicalScore;
}

export interface PlanMedication {
  action: string;
  name: string;
  dosage?: string;
  instructions?: string;
}

export interface ProposedPlan {
  summary: string;
  diagnostics: string[];
  medications: PlanMedication[];
  referrals: string[];
  lifestyleOrPrecautions: string[];
  dispositionAndFollowUp: string;
}

export interface AIInsights {
  questions: string[];
  tests: string[];
  differentials: Differential[];
  proposedPlan?: ProposedPlan;
}

export interface SummaryResult {
  handoff: string;
  conciseSO: string;
}

export interface SavedNote {
  id: string;
  title: string;
  content: string;
  insights?: AIInsights | null;
  summaryData?: SummaryResult | null;
  createdAt: number;
  updatedAt: number;
  patientName?: string;
  chiefComplaint?: string;
  templateName?: string;
}

export interface CurrentDraftState {
  note: string;
  insights: AIInsights | null;
  summaryData: SummaryResult | null;
  lastSavedAt: number | null;
  templateName?: string;
  activeNoteId?: string | null;
}
