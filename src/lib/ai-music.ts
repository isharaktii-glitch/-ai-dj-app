const BASE_URL = process.env.SUNO_PROVIDER_BASE_URL || "";
const API_KEY = process.env.SUNO_PROVIDER_API_KEY || "";

export interface GenerateTrackParams {
  prompt: string;
  instrumental?: boolean;
  durationHintSeconds?: number;
}

export interface GenerateTrackResult {
  providerJobId: string;
}

export interface JobStatusResult {
  status: "pending" | "processing" | "completed" | "failed";
  audioUrl?: string;
  durationSeconds?: number;
  errorMessage?: string;
}

export async function generateTrack(
  params: GenerateTrackParams
): Promise<GenerateTrackResult> {
  if (!BASE_URL || !API_KEY) {
    throw new Error(
      "AI music provider is not configured. Set SUNO_PROVIDER_BASE_URL and SUNO_PROVIDER_API_KEY."
    );
  }

  const res = await fetch(`${BASE_URL}/v1/audios/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      prompt: params.prompt,
      instrumental: params.instrumental ?? true,
      model: "suno",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const providerJobId = data.jobId || data.id || data.task_id;

  if (!providerJobId) {
    throw new Error("AI provider did not return a job id.");
  }

  return { providerJobId };
}

export async function getJobStatus(
  providerJobId: string
): Promise<JobStatusResult> {
  if (!BASE_URL || !API_KEY) {
    throw new Error("AI music provider is not configured.");
  }

  const res = await fetch(`${BASE_URL}/v1/tasks/${providerJobId}`, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI provider error (${res.status}): ${text}`);
  }

  const data = await res.json();

  const rawStatus = (data.status || "").toLowerCase();
  let status: JobStatusResult["status"] = "pending";
  if (rawStatus.includes("complete") || rawStatus.includes("success")) {
    status = "completed";
  } else if (rawStatus.includes("fail") || rawStatus.includes("error")) {
    status = "failed";
  } else if (rawStatus.includes("process") || rawStatus.includes("running")) {
    status = "processing";
  }

  const audioUrl =
    data.result?.tracks?.[0]?.audioUrl ||
    data.result?.audio_url ||
    data.audioUrl;

  return {
    status,
    audioUrl,
    durationSeconds: data.result?.tracks?.[0]?.duration,
    errorMessage: data.error || data.errorMessage,
  };
}

export function buildMatchPrompt(source: {
  bpm?: number | null;
  musicalKey?: string | null;
  energyLevel?: number | null;
  genreTags?: string | null;
  type?: string;
}): string {
  const parts: string[] = [];

  if (source.bpm) parts.push(`${Math.round(source.bpm)} BPM`);
  if (source.musicalKey) parts.push(`in ${source.musicalKey}`);

  const energy = source.energyLevel ?? 0.5;
  if (energy > 0.7) parts.push("high-energy, driving");
  else if (energy > 0.4) parts.push("mid-energy, groovy");
  else parts.push("chill, laid-back");

  if (source.genreTags) parts.push(source.genreTags);

  parts.push(
    "instrumental DJ companion track designed to blend seamlessly with another track of matching tempo and key"
  );

  return `Create a ${parts.join(", ")}.`;
}
