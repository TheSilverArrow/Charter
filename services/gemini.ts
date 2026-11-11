import { AIInsights, SummaryResult } from "../types";

export async function analyzeClinicalNote(noteText: string): Promise<AIInsights> {
  const response = await fetch("/api/clinical/analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noteText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Analysis request failed with status ${response.status}`);
  }

  return response.json();
}

export async function generateClinicalSummary(noteText: string): Promise<SummaryResult> {
  const response = await fetch("/api/clinical/summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noteText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Summary request failed with status ${response.status}`);
  }

  return response.json();
}

export async function improveHPI(noteText: string): Promise<string> {
  const response = await fetch("/api/clinical/improve-hpi", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ noteText }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HPI improvement failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.improvedNote || noteText;
}
