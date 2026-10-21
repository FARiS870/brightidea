
import express from "express";

const app = express();
app.use(express.json({ limit: "20kb" }));

app.get("/", (_req, res) => {
  res.json({ status: "ok", app: "BrightIdea API" });
});

app.post("/api/generate", async (req, res) => {
  try {
    const { topic, format, language, audience } = req.body ?? {};

    if (
      typeof topic !== "string" ||
      !topic.trim() ||
      topic.length > 500
    ) {
      return res.status(400).json({
        error: "Enter a topic of up to 500 characters."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: "The server API key is not configured."
      });
    }

    const allowedFormats = ["video", "blog", "social"];
    const allowedLanguages = ["English", "Arabic"];

    const safeFormat = allowedFormats.includes(format)
      ? format
      : "video";

    const safeLanguage = allowedLanguages.includes(language)
      ? language
      : "English";

    const safeAudience =
      typeof audience === "string"
        ? audience.slice(0, 100)
        : "General audience";

    const prompt = `
You are BrightIdea, a creative content assistant.
Create a useful, original content plan.

Topic: ${topic.trim()}
Format: ${safeFormat}
Output language: ${safeLanguage}
Target audience: ${safeAudience}

Include a compelling title, a strong opening hook,
a clear structured outline, practical details,
and a closing call to action.
Use headings and readable formatting.
Avoid unsupported factual claims.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [
            { parts: [{ text: prompt }] }
          ],
          generationConfig: {
            maxOutputTokens: 1200
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API status:", response.status);
      return res.status(502).json({
        error: "AI request failed. Check your API access and quota."
      });
    }

    const result = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();

    if (!result) {
      return res.status(502).json({
        error: "The AI returned no text. Please try again."
      });
    }

    res.json({ result });
  } catch (error) {
    console.error("Generation error:", error.message);
    res.status(500).json({
      error: "Unexpected server error. Please try again."
    });
  }
});

const port = process.env.PORT || 10000;

app.listen(port, "0.0.0.0", () => {
  console.log(`BrightIdea API listening on port ${port}`);
});
