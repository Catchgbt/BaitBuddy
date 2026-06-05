import { createClientFromRequest } from 'npm:@base44/sdk@0.7.1';

// Hauptfunktion des Servers
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return new Response(JSON.stringify({ error: "file_url is required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    console.log(`[analyzeCatchPhoto] Starting AI analysis for file: ${file_url}`);

    // Call the InvokeLLM integration for actual image analysis
    const llmAnalysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Du bist ein erfahrener Ichthyologe und KI-Assistent für eine Angel-App. Analysiere das Bild eines Fisches SEHR PRÄZISE.

KRITISCHE ANWEISUNGEN:

1. FISCHART-ERKENNUNG - Achte auf diese spezifischen Merkmale:

**BACHFORELLE** (Salmo trutta fario):
- Rote/orange Punkte mit blauen/weißen Höfen auf den Flanken
- Dunkler Rücken mit schwarzen Punkten
- Heller Bauch
- Stromlinienförmiger Körper

**REGENBOGENFORELLE** (Oncorhynchus mykiss):
- Rosa/violetter Längsstreifen an der Seite
- Viele kleine schwarze Punkte über den ganzen Körper
- Silbrige Grundfärbung
- Oft rosa schimmernde Kiemendeckel

**HECHT** (Esox lucius):
- Langgezogener, torpedoförmiger Körper
- Entenartiger, breiter Unterkiefer
- Grün-braune Färbung mit hellen Flecken/Bändern
- Weit nach hinten versetzte Rückenflosse

**KARPFEN** (Cyprinus carpio):
- Hochrückiger, gedrungener Körper
- Große Schuppen
- 4 Barteln am Maul
- Goldbraune bis bronzefarbene Färbung

**ZANDER** (Sander lucioperca):
- Dunkle Querstreifen auf den Flanken
- Zwei getrennte Rückenflossen
- Große, glänzende Augen
- Graue bis grünliche Grundfärbung

**BARSCH** (Perca fluviatilis):
- 5-7 dunkle Querstreifen
- Rötliche Bauch-, After- und Schwanzflossen
- Zwei zusammenhängende Rückenflossen (erste stachelig)
- Große Augen, gedrungener Körperbau

**WELS/WALLER** (Silurus glanis):
- Extrem breiter Kopf
- 6 lange Barteln
- Schuppenloser, schleimiger Körper
- Sehr lange Afterflosse

2. LÄNGEN-SCHÄTZUNG:
- Vergleiche mit sichtbaren Referenzobjekten (Hand, Gras, Steine)
- Eine durchschnittliche Hand ist ca. 18-20 cm lang
- Sei KONSERVATIV - lieber unterschätzen als überschätzen
- Typische Längen: Forelle 25-40cm, Barsch 20-35cm, Hecht 50-100cm, Karpfen 30-60cm

3. GEWICHTS-SCHÄTZUNG (SEHR WICHTIG - SEI REALISTISCH!):

**Verwende diese Gewichtstabellen als STRIKTE RICHTLINIE:**

**FORELLEN** (Bachforelle, Regenbogenforelle):
- 20 cm = 0.1 kg
- 25 cm = 0.2 kg
- 30 cm = 0.4 kg
- 35 cm = 0.6 kg
- 40 cm = 0.9 kg
- 45 cm = 1.3 kg
- 50 cm = 1.8 kg
- 60 cm = 3.0 kg
- 70 cm = 4.5 kg

**BARSCH**:
- 15 cm = 0.05 kg
- 20 cm = 0.15 kg
- 25 cm = 0.3 kg
- 30 cm = 0.5 kg
- 35 cm = 0.8 kg
- 40 cm = 1.2 kg
- 45 cm = 1.7 kg

**HECHT**:
- 40 cm = 0.6 kg
- 50 cm = 1.2 kg
- 60 cm = 2.0 kg
- 70 cm = 3.5 kg
- 80 cm = 5.0 kg
- 90 cm = 7.0 kg
- 100 cm = 9.5 kg

**KARPFEN**:
- 30 cm = 0.5 kg
- 40 cm = 1.2 kg
- 50 cm = 2.5 kg
- 60 cm = 4.5 kg
- 70 cm = 7.0 kg
- 80 cm = 10.0 kg

**ZANDER**:
- 40 cm = 0.7 kg
- 50 cm = 1.3 kg
- 60 cm = 2.2 kg
- 70 cm = 3.5 kg
- 80 cm = 5.0 kg
- 90 cm = 7.0 kg

**WELS**:
- 50 cm = 1.5 kg
- 80 cm = 5.0 kg
- 100 cm = 10.0 kg
- 120 cm = 18.0 kg
- 150 cm = 35.0 kg

WICHTIG: Interpoliere zwischen diesen Werten! Weiche NICHT drastisch ab!

4. KONFIDENZ:
- Nur > 0.8 wenn du dir SEHR sicher bist
- 0.6-0.8 wenn wahrscheinlich
- < 0.6 wenn unsicher
- Niedriger bei schlechter Bildqualität

5. BILDQUALITÄT:
Bewerte: "Ausgezeichnet" / "Gut" / "Akzeptabel" / "Unscharf" / "Schlecht"

Antworte NUR mit validem JSON!`,
      file_urls: [file_url],
      model: 'gemini_3_flash',
      response_json_schema: {
        type: "object",
        properties: {
          species: { type: "string", description: "Der deutsche Name der Fischart (z.B. 'Bachforelle', 'Regenbogenforelle', 'Hecht', 'Karpfen', 'Zander', 'Barsch', 'Wels')" },
          length_cm: { type: "number", description: "Geschätzte Länge des Fisches in Zentimetern (realistisch!)" },
          weight_kg: { type: "number", description: "Geschätztes Gewicht des Fisches in Kilogramm (MUSS zur Gewichtstabelle passen!)" },
          confidence_species: { type: "number", description: "Konfidenz für die Arterkennung (0.0-1.0, wobei 1.0 sehr sicher ist)" },
          image_quality: { type: "string", description: "Bewertung der Bildqualität (z.B. 'Ausgezeichnet', 'Gut', 'Akzeptabel', 'Unscharf')" },
          visual_details: { type: "string", description: "Kurze Beschreibung auffälliger Merkmale des Fisches (z.B. 'Rote Punkte mit blauen Höfen sichtbar')" }
        },
        required: ["species", "length_cm", "weight_kg", "confidence_species", "image_quality"]
      }
    });

    console.log("[analyzeCatchPhoto] LLM analysis result:", JSON.stringify(llmAnalysis, null, 2));

    if (!llmAnalysis || llmAnalysis.error) {
        throw new Error(llmAnalysis.error || "KI konnte den Fisch auf dem Bild nicht analysieren.");
    }
    
    // Validiere die Ergebnisse auf Realismus
    if (llmAnalysis.weight_kg && llmAnalysis.weight_kg > 100) {
      console.warn(`[analyzeCatchPhoto] Unrealistic weight detected: ${llmAnalysis.weight_kg} kg. Capping at 50kg.`);
      llmAnalysis.weight_kg = 50; // Cap bei absurd hohen Werten
      llmAnalysis.confidence_species = Math.min(llmAnalysis.confidence_species || 0.5, 0.5); // Reduziere Konfidenz
    }
    
    // Convert confidence to percentage for display
    const confidence_percent = llmAnalysis.confidence_species !== null && llmAnalysis.confidence_species !== undefined 
                               ? (llmAnalysis.confidence_species * 100).toFixed(1) 
                               : "unbekannt";

    // Build the output object using the LLM's results
    const outputs = {
      tasks: [
        { 
          name: "Art bestimmen", 
          status: llmAnalysis.species ? "completed" : "failed", 
          result: llmAnalysis.species ? `${llmAnalysis.species} (${confidence_percent}% Konfidenz)` : "Nicht erkannt" 
        },
        { 
          name: "Bildqualität prüfen", 
          status: llmAnalysis.image_quality ? "completed" : "failed", 
          result: llmAnalysis.image_quality || "Nicht bewertbar" 
        },
        { 
          name: "Länge schätzen", 
          status: llmAnalysis.length_cm !== null && llmAnalysis.length_cm > 0 ? "completed" : "failed", 
          result: llmAnalysis.length_cm !== null && llmAnalysis.length_cm > 0 ? `${Math.round(llmAnalysis.length_cm)} cm` : "Nicht schätzbar" 
        },
        { 
          name: "Gewicht schätzen", 
          status: llmAnalysis.weight_kg !== null && llmAnalysis.weight_kg > 0 ? "completed" : "failed", 
          result: llmAnalysis.weight_kg !== null && llmAnalysis.weight_kg > 0 ? `${llmAnalysis.weight_kg.toFixed(2)} kg` : "Nicht schätzbar" 
        }
      ],
      summary: llmAnalysis.species && llmAnalysis.length_cm && llmAnalysis.weight_kg
        ? `Ich habe einen ${llmAnalysis.species} von ca. ${Math.round(llmAnalysis.length_cm)} cm Länge mit einer Konfidenz von ${confidence_percent}% erkannt. Das geschätzte Gewicht liegt bei ${llmAnalysis.weight_kg.toFixed(2)} kg.${llmAnalysis.visual_details ? ` Auffällige Merkmale: ${llmAnalysis.visual_details}` : ''}`
        : "Die KI konnte den Fisch auf dem Bild nicht eindeutig analysieren. Bitte versuche es mit einem klareren Bild, bei dem der Fisch gut sichtbar ist.",
      result_data: {
        species_name: llmAnalysis.species,
        confidence: llmAnalysis.confidence_species,
        length_cm: llmAnalysis.length_cm ? Math.round(llmAnalysis.length_cm) : null,
        weight_kg: llmAnalysis.weight_kg,
        quality_assessment: llmAnalysis.image_quality,
        visual_details: llmAnalysis.visual_details
      }
    };

    console.log("[analyzeCatchPhoto] Analysis completed successfully.");

    return new Response(JSON.stringify(outputs), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error("[analyzeCatchPhoto] Analysis Error:", error);
    
    const errorResponse = {
      error: error.message,
      tasks: [
        { name: "Art bestimmen", status: "failed", result: "Fehler bei der Analyse" },
        { name: "Bildqualität prüfen", status: "failed", result: "Übersprungen" },
        { name: "Länge schätzen", status: "failed", result: "Übersprungen" },
        { name: "Gewicht schätzen", status: "failed", result: "Übersprungen" }
      ],
      summary: "Die Analyse konnte aufgrund eines technischen Problems nicht abgeschlossen werden. Bitte versuche es später erneut oder wähle ein klareres Bild des Fisches.",
      result_data: null
    };

    return new Response(JSON.stringify(errorResponse), { 
      status: 500, 
      headers: { 'Content-Type': 'application/json' } 
    });
  }
});