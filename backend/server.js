
import express from "express";
import cors from "cors";

const app = express();

app.use(cors({
  origin: "https://brightidea.onrender.com"
}));

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

    const allowedFormats = [
      "video",
      "short",
      "blog",
      "social",
      "YouTube video",
      "YouTube Short",
      "Blog post",
      "Social media post"
    ];

    const allowedLanguages = ["English", "Arabic"];

    const safeFormat = allowedFormats.includes(format)
      ? format
      : "video";

    const safeLanguage = allowedLanguages.includes(language)
      ? language
      : "English";

    const safeAudience =
      typeof audience === "string" && audience.trim()
        ? audience.trim().slice(0, 100)
        : "General audience";

    const normalizedFormat = safeFormat.toLowerCase();

    let formatInstructions = "";

    if (
      normalizedFormat === "short" ||
      normalizedFormat === "youtube short"
    ) {
      formatInstructions = `
Create a YouTube Short script lasting 45-60 seconds.
Include a short, catchy title, a hook for the first 2 seconds,
3-5 brief scenes with narration and visual suggestions,
and a short closing call to action.
Keep the total narration concise enough for 45-60 seconds.
Do not create a long-form video plan.
`;
    } else if (
      normalizedFormat === "blog" ||
      normalizedFormat === "blog post"
    ) {
      formatInstructions = `
Create a blog post with a clear title, introduction,
useful section headings, a helpful conclusion,
and a suitable call to action.
`;
    } else if (
      normalizedFormat === "social" ||
      normalizedFormat === "social media post"
    ) {
      formatInstructions = `
Create a ready-to-publish social media post with a strong opening,
concise main text, and a relevant call to action.
Suggest suitable hashtags where appropriate.
`;
    } else {
      formatInstructions = `
Create a YouTube video plan with a clear title,
an opening hook, a structured outline with scene suggestions,
practical production notes, and a closing call to action.
Include a sensible estimated video duration.
`;
    }

    const prompt = `
You are BrightIdea, a professional content planning assistant.

Create original, useful content based on the user's request.
Follow the selected format exactly. Do not change it.

TOPIC: ${topic.trim()}
FORMAT: ${safeFormat}
OUTPUT LANGUAGE: ${safeLanguage}
TARGET AUDIENCE: ${safeAudience}

${formatInstructions}

IMPORTANT OUTPUT RULES:
- Write entirely in ${safeLanguage}, except proper names when needed.
- Start with this exact label on its own line:
TITLE: followed by one specific, engaging title for the requested content.
- The title must describe the user's topic, not the BrightIdea app.
- Do not use greetings or introduce yourself.
- Use these section labels on separate lines:
HOOK:
CONTENT:
OUTLINE:
PRODUCTION NOTES:
CALL TO ACTION:
- Adapt the sections to the selected format.
- For a Short, include scene-by-scene narration and visual suggestions.
- For a blog or social post, make the content appropriate to that format.
- Use simple, readable plain text headings.
- Do not wrap the response in a code block.
- Avoid unnecessary repetition and generic filler.
- Do not invent facts. Clearly qualify uncertain claims.
- Make the result useful to create, edit, and publish.
`;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",
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
            maxOutputTokens: 1600,
            temperature: 0.7
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
