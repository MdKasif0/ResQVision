import type {
  ApiErrorResponse,
  DetectResponse,
  HealthResponse,
  Incident,
  IncidentListItem,
  SampleItem,
} from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

/**
 * Custom error class carrying standard backend error code and HTTP status
 */
export class ApiClientError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string = "REQUEST_FAILED", status: number = 500) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
  }
}

/**
 * Internal fetch wrapper that enforces standard error shape
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let code = "HTTP_ERROR";
      let message = `Request failed with status ${response.status}: ${response.statusText}`;

      try {
        const errorJson = (await response.json()) as ApiErrorResponse;
        if (errorJson && errorJson.error) {
          code = errorJson.error.code || code;
          message = errorJson.error.message || message;
        }
      } catch {
        // Response was not JSON
      }

      throw new ApiClientError(message, code, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : "Network error or server unreachable";
    throw new ApiClientError(message, "CONNECTION_ERROR", 0);
  }
}

/**
 * Typed ResQVision API Client
 */
export const api = {
  /**
   * Health check and runtime status (GET /api/health)
   */
  async health(): Promise<HealthResponse> {
    return request<HealthResponse>("/api/health");
  },

  /**
   * Detect people and extract deterministic scene features (POST /api/detect)
   */
  async detect(file: File): Promise<DetectResponse> {
    const formData = new FormData();
    formData.append("file", file);
    return request<DetectResponse>("/api/detect", {
      method: "POST",
      body: formData,
    });
  },

  /**
   * End-to-end incident analysis: vision, features, and evidentiary assessment (POST /api/analyze)
   * Tracks real network phases without artificial delays.
   */
  async analyze(
    params: {
      file: File;
      note?: string;
      location_label?: string;
      lat?: number;
      lng?: number;
      origin?: string;
    },
    onPhaseChange?: (phase: "uploading" | "analyzing" | "done") => void
  ): Promise<Incident> {
    const formData = new FormData();
    formData.append("file", params.file);
    if (params.note) formData.append("note", params.note);
    if (params.location_label) formData.append("location_label", params.location_label);
    if (params.lat !== undefined) formData.append("lat", String(params.lat));
    if (params.lng !== undefined) formData.append("lng", String(params.lng));
    if (params.origin) formData.append("origin", params.origin);

    onPhaseChange?.("uploading");

    return new Promise<Incident>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE_URL}/api/analyze`);

      // Track real upload completion
      if (xhr.upload) {
        xhr.upload.onload = () => {
          onPhaseChange?.("analyzing");
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText) as Incident;
            onPhaseChange?.("done");
            resolve(data);
          } catch {
            reject(
              new ApiClientError(
                "Invalid JSON response from server",
                "PARSE_ERROR",
                xhr.status
              )
            );
          }
        } else {
          let code = "HTTP_ERROR";
          let message = `Request failed with status ${xhr.status}`;
          try {
            const errJson = JSON.parse(xhr.responseText) as ApiErrorResponse;
            if (errJson && errJson.error) {
              code = errJson.error.code || code;
              message = errJson.error.message || message;
            }
          } catch {
            // response was not JSON
          }
          reject(new ApiClientError(message, code, xhr.status));
        }
      };

      xhr.onerror = () => {
        reject(
          new ApiClientError(
            "Network error or server unreachable",
            "CONNECTION_ERROR",
            0
          )
        );
      };

      xhr.ontimeout = () => {
        reject(new ApiClientError("Request timed out", "TIMEOUT", 0));
      };

      xhr.send(formData);
    });
  },


  /**
   * List all persisted incidents (GET /api/incidents)
   */
  async listIncidents(params?: {
    limit?: number;
    offset?: number;
  }): Promise<IncidentListItem[]> {
    const query = new URLSearchParams();
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<IncidentListItem[]>(`/api/incidents${qs}`);
  },

  /**
   * Retrieve a single incident by ID (GET /api/incidents/{id})
   */
  async getIncident(id: string): Promise<Incident> {
    return request<Incident>(`/api/incidents/${encodeURIComponent(id)}`);
  },

  /**
   * Delete an incident record (DELETE /api/incidents/{id})
   */
  async deleteIncident(id: string): Promise<void> {
    return request<void>(`/api/incidents/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  /**
   * Resolve full image streaming URL for an incident
   */
  getIncidentImageUrl(id: string): string {
    return `${API_BASE_URL}/api/incidents/${encodeURIComponent(id)}/image`;
  },

  /**
   * List available benchmark evaluation samples (GET /api/samples)
   */
  async listSamples(): Promise<SampleItem[]> {
    return request<SampleItem[]>("/api/samples");
  },

  /**
   * Run real pipeline on a benchmark sample image (POST /api/samples/{id}/load)
   */
  async loadSample(sampleId: string): Promise<Incident> {
    return request<Incident>(`/api/samples/${encodeURIComponent(sampleId)}/load`, {
      method: "POST",
    });
  },

  /**
   * Resolve full image streaming URL for a benchmark sample
   */
  getSampleImageUrl(sampleId: string): string {
    return `${API_BASE_URL}/api/samples/${encodeURIComponent(sampleId)}/image`;
  },

  /**
   * Transcribe recorded audio note using backend Groq whisper endpoint (POST /api/transcribe)
   */
  async transcribeAudio(audioBlob: Blob): Promise<{ text: string }> {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice_note.webm");
    return request<{ text: string }>("/api/transcribe", {
      method: "POST",
      body: formData,
    });
  },
};
