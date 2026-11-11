import { AIInsights, SummaryResult } from "../types";

// Helper to execute requests with automatic retry on transient status (405, 502, 503)
async function sendClinicalRequest<T>(endpoint: string, payload: any, actionName: string): Promise<T> {
  const executeAttempt = async (): Promise<Response> => {
    return await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(payload),
    });
  };

  let response: Response;
  try {
    response = await executeAttempt();
  } catch (netErr: any) {
    // If first fetch had a network error, attempt one retry after 750ms
    await new Promise((r) => setTimeout(r, 750));
    try {
      response = await executeAttempt();
    } catch {
      throw new Error(`Unable to reach the clinical AI service. Please check your network connection.`);
    }
  }

  // If received a 405 (e.g. during server startup/refresh) or 503, retry once
  if (response.status === 405 || response.status === 502 || response.status === 503) {
    await new Promise((r) => setTimeout(r, 900));
    try {
      const retryRes = await executeAttempt();
      if (retryRes.ok) {
        return await retryRes.json();
      }
      response = retryRes;
    } catch {
      // Keep original response for error extraction below
    }
  }

  if (!response.ok) {
    let errorMessage = '';
    try {
      const errorData = await response.json();
      if (errorData && typeof errorData.error === 'string') {
        errorMessage = errorData.error;
      }
    } catch {
      // Non-JSON response (e.g., HTML response from proxy or static host)
    }

    if (!errorMessage) {
      if (response.status === 405) {
        errorMessage = `The analysis request returned 405 (Method Not Allowed). The application server is ready; please click 'Analyze Note' again.`;
      } else if (response.status === 404) {
        errorMessage = `Clinical API endpoint not found (404). Please ensure the backend server is active.`;
      } else if (response.status === 503 || response.status === 502) {
        errorMessage = `Clinical AI model is experiencing a temporary capacity spike in Google AI. Please try again in a moment.`;
      } else {
        errorMessage = `${actionName} failed with status ${response.status}.`;
      }
    }

    throw new Error(errorMessage);
  }

  return response.json();
}

export async function analyzeClinicalNote(noteText: string): Promise<AIInsights> {
  return sendClinicalRequest<AIInsights>("/api/clinical/analyze", { noteText }, "Clinical analysis");
}

export async function generateClinicalSummary(noteText: string): Promise<SummaryResult> {
  return sendClinicalRequest<SummaryResult>("/api/clinical/summary", { noteText }, "Clinical summary");
}

export async function improveHPI(noteText: string): Promise<string> {
  const data = await sendClinicalRequest<{ improvedNote?: string }>(
    "/api/clinical/improve-hpi",
    { noteText },
    "HPI narrative improvement"
  );
  return data.improvedNote || noteText;
}
