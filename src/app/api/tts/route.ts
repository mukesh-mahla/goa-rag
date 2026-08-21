import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const sarvamApiKey =
      process.env.sarvom_api_key ||
      process.env.SARVAM_API_KEY ||
      process.env.sarvam_api_key;

    const body = await req.json();
    const text = body.text?.trim();
    const languageCode = body.language_code || "hi-IN";

    if (!text) {
      return NextResponse.json(
        { error: "Text is required for TTS synthesis." },
        { status: 400 }
      );
    }

    if (!sarvamApiKey) {
      return NextResponse.json(
        {
          error: "Sarvam AI API key is not configured.",
          useClientTTS: true,
        },
        { status: 400 }
      );
    }

    // Limit text length for TTS request safety
    const truncatedText = text.slice(0, 500);

    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": sarvamApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: [truncatedText],
        target_language_code: languageCode === "en-IN" ? "en-IN" : "hi-IN",
        speaker: body.speaker || (languageCode === "en-IN" ? "aditya" : "anushka"),
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 22050,
        enable_preprocessing: true,
        model: "bulbul:v2",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("Sarvam TTS error:", response.status, errorText);
      return NextResponse.json(
        {
          error: `Sarvam TTS failed: ${errorText}`,
          useClientTTS: true,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    const audioBase64 = data.audios?.[0] || null;

    if (!audioBase64) {
      return NextResponse.json(
        { error: "No audio generated", useClientTTS: true },
        { status: 500 }
      );
    }

    return NextResponse.json({
      audio: `data:audio/wav;base64,${audioBase64}`,
      duration: data.duration || null,
      provider: "sarvam-ai",
    });
  } catch (error: any) {
    console.error("TTS route error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to synthesize speech",
        useClientTTS: true,
      },
      { status: 500 }
    );
  }
}
