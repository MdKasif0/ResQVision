import type {
  ApiErrorResponse,
  Assessment,
  DetectResponse,
  HealthResponse,
  Incident,
  IncidentListItem,
  SceneFeatures,
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
   * Submit scene features to Groq LLM for schema-validated assessment (POST /api/analyze)
   */
  async analyze(params: {
    image_id: string;
    scene_features: SceneFeatures;
  }): Promise<Incident> {
    return request<Incident>("/api/analyze", {
      method: "POST",
      body: JSON.stringify(params),
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
};
