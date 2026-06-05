import { createClientFromRequest } from "npm:@base44/sdk@0.7.1";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // OpenAI TTS Stimmen - alle verfügbaren Optionen
    const voices = [
      {
        id: "alloy",
        name: "Alloy (neutral)",
        language: "de",
        gender: "neutral",
      },
      {
        id: "echo",
        name: "Echo (männlich)",
        language: "de", 
        gender: "male",
      },
      {
        id: "fable",
        name: "Fable (britisch)",
        language: "de",
        gender: "male",
      },
      {
        id: "onyx",
        name: "Onyx (tief)",
        language: "de",
        gender: "male",
      },
      {
        id: "nova",
        name: "Nova (weiblich)",
        language: "de",
        gender: "female",
      },
      {
        id: "shimmer",
        name: "Shimmer (sanft)",
        language: "de",
        gender: "female",
      },
    ];

    return Response.json({ ok: true, voices });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});