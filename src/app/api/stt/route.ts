import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const sarvamApiKey =
      process.env.sarvom_api_key ||
      process.env.SARVAM_API_KEY ||
      process.env.sarvam_api_key;

    if (!sarvamApiKey) {
      return NextResponse.json(
        {
          error: "Sarvam AI API key is not configured.",
          useClientSTT: true,
        },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const audioFile = formData.get("file") as Blob | null;
    const requestedLanguage = (formData.get("language_code") as string) || "hi-IN";

    if (!audioFile) {
      return NextResponse.json(
        { error: "Audio file is required." },
        { status: 400 }
      );
    }

    // Build FormData for Sarvam AI Speech-to-Text API
    const sarvamForm = new FormData();
    sarvamForm.append("file", audioFile, "audio.wav");
    sarvamForm.append("model", "saarika:v2");
    sarvamForm.append("language_code", requestedLanguage);
    sarvamForm.append("with_diacritics", "true");

    const response = await fetch("https://api.sarvam.ai/speech-to-text", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
      },
      body: sarvamForm,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Sarvam STT error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `Sarvam STT failed: ${errorText}`,
          useClientSTT: true,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const transcript = data.transcript || "";

    return NextResponse.json({
      transcript,
      language_code: data.language_code || "hi-IN",
    });
  } catch (error: any) {
    console.error("STT route error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to transcribe audio",
        useClientSTT: true,
      },
      { status: 500 }
    );
  }
}
