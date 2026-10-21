
"use strict";

// BrightIdea - Frontend application

const form = document.querySelector("#idea-form");
const topicInput = document.querySelector("#topic");
const formatInput = document.querySelector("#format");
const languageInput = document.querySelector("#language");
const audienceInput = document.querySelector("#audience");
const emptyState = document.querySelector("#empty-state");
const result = document.querySelector("#result");
const copyButton = document.querySelector("#copy-btn");

let latestPlan = "";

function getSection(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `(?:^|\\n)\\s*${escaped}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*(?:#{1,6}\\s*)?[A-Z][A-Z ]{1,35}\\s*:?\\s*(?:\\n|$)|$)`,
    "i"
  );

  return text.match(pattern)?.[1]?.trim() || "";
}

function cleanTitle(text) {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*(?:TITLE|العنوان)\s*[:：]\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function getTitle(text) {
  const patterns = [
    /^\s*(?:#{1,3}\s*)?(?:TITLE|العنوان)\s*[:：]\s*(.+)$/im,
    /^\s*(?:#{1,3}\s*)?(?:Video Title|Title Idea|Title)\s*:\s*(.+)$/im
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanTitle(match[1]);
  }

  const heading = text.match(/^#{1,3}\s+(.+)$/m);

  if (heading?.[1]) {
    const candidate = cleanTitle(heading[1]);

    if (!/brightidea content plan/i.test(candidate)) {
      return candidate;
    }
  }

  return topicInput.value.trim() || "Your AI-generated content";
}

function formatContent(text) {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/^\s*---+\s*$/gm, "")
    .trim();
}

function getOutline(text) {
  const section = getSection(text, "OUTLINE");
  const source = section || text;
  const headings = [];
  const seen = new Set();

  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();

    if (!line) continue;

    const isHeading = /^#{1,4}\s+/.test(line);
    const isNumbered = /^\d+[.)]\s+/.test(line);
    const isBullet = /^[-*]\s+/.test(line);

    if (!isHeading && !isNumbered && !isBullet) continue;

    const heading = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/\*\*/g, "")
      .trim();

    if (!heading || heading.length > 120) continue;

    if (/^(title|hook|content|outline|production notes|call to action)$/i.test(heading)) {
      continue;
    }

    const key = heading.toLowerCase();

    if (!seen.has(key)) {
      seen.add(key);
      headings.push(heading);
    }
  }

  return headings.slice(0, 10);
}

function renderContent(text, container) {
  container.replaceChildren();

  const lines = formatContent(text).split("\n");
  let currentCard = null;
  let skipOutline = false;

  function addParagraph(parent, value, className = "scene-text") {
    const paragraph = document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = value;
    parent.appendChild(paragraph);
  }

  function startCard(title) {
    const card = document.createElement("div");
    card.className = "scene-card";

    const heading = document.createElement("h4");
    heading.className = "scene-heading";
    heading.textContent = title;

    card.appendChild(heading);
    container.appendChild(card);
    currentCard = card;
  }

  function addLabel(parent, label, value) {
    const labelElement = document.createElement("span");
    labelElement.className = "scene-label";
    labelElement.textContent = label;
    parent.appendChild(labelElement);

    if (value) addParagraph(parent, value);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    // Skip the separate outline at the end of the generated response.
    if (/^(?:OUTLINE|المخطط)\s*[:：]?\s*$/i.test(line)) {
      skipOutline = true;
      currentCard = null;
      continue;
    }

    if (skipOutline) continue;

    // Ignore title lines because the title has its own display area.
    if (/^(?:TITLE|العنوان)\s*[:：]/i.test(line)) continue;

    // Support English and Arabic scene headings.
    const sceneMatch = line.match(
      /^(?:Scene\s+\d+\b.*|المشهد\s+(?:الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)\s*[:：]?.*)$/i
    );

    if (sceneMatch) {
      startCard(line);
      continue;
    }

    // Support section headings with or without a colon.
    const sectionMatch = line.match(
      /^(HOOK|SCRIPT|CONTENT|PRODUCTION NOTES|CALL TO ACTION|مقدمة|المحتوى|ملاحظات الإنتاج|دعوة لاتخاذ إجراء)(?:\s*[:：]\s*(.*))?$/i
    );

    if (sectionMatch) {
      startCard(sectionMatch[1]);

      if (sectionMatch[2]) {
        addParagraph(currentCard, sectionMatch[2]);
      }

      continue;
    }

    // Support narration and production labels in both languages.
    const labelMatch = line.match(
      /^(Narration|Voiceover|Voice-over|Visuals?|On-screen text|Sound|SFX|Camera|Action|Dialogue|Music|Transition|السرد|المرئي|الموسيقى|النص على الشاشة|الصوت|الحوار)\s*[:：]\s*(.*)$/i
    );

    if (labelMatch) {
      if (!currentCard) startCard("Content");

      addLabel(currentCard, labelMatch[1], labelMatch[2]);
      continue;
    }

    const cleanLine = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+[.)]\s+/, "")
      .trim();

    if (!cleanLine) continue;

    if (currentCard) {
      addParagraph(currentCard, cleanLine);
    } else {
      addParagraph(container, cleanLine, "content-line");
    }
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const topic = topicInput.value.trim();

  if (!topic) {
    topicInput.focus();
    return;
  }

  const submitButton = form.querySelector('button[type="submit"]');
  const originalButtonText = submitButton?.textContent;

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Generating...";
  }

  copyButton.disabled = true;

  try {
    const response = await fetch(
      "https://brightidea-api.onrender.com/api/generate",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          topic,
          format: formatInput.value,
          language: languageInput.value,
          audience: audienceInput.value
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Could not generate content. Please try again."
      );
    }

    if (typeof data.result !== "string" || !data.result.trim()) {
      throw new Error("The AI returned an empty result. Please try again.");
    }

    latestPlan = data.result;

    const titleElement = document.querySelector("#out-title");
    const contentElement = document.querySelector("#out-hook");
    const outlineElement = document.querySelector("#out-outline");
    const nextElement = document.querySelector("#out-next");

    if (!titleElement || !contentElement || !outlineElement || !nextElement) {
      throw new Error("A required result element is missing from index.html.");
    }

    titleElement.textContent = getTitle(latestPlan);
    renderContent(latestPlan, contentElement);

    outlineElement.replaceChildren();

    const headings = getOutline(latestPlan);

    if (headings.length) {
      for (const heading of headings) {
        const item = document.createElement("li");
        item.textContent = heading;
        outlineElement.appendChild(item);
      }
    } else {
      const item = document.createElement("li");
      item.textContent = "Your complete content is shown above.";
      outlineElement.appendChild(item);
    }

    nextElement.textContent =
      "Review your draft, verify factual claims, and refine it before publishing.";

    emptyState.classList.add("hidden");
    result.classList.remove("hidden");
    copyButton.disabled = false;
  } catch (error) {
    alert(error.message || "Connection failed. Please try again.");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalButtonText;
    }
  }
});

copyButton.addEventListener("click", async () => {
  if (!latestPlan) return;

  try {
    await navigator.clipboard.writeText(latestPlan);
    copyButton.textContent = "Copied!";
  } catch {
    const temp = document.createElement("textarea");
    temp.value = latestPlan;
    temp.style.position = "fixed";
    temp.style.opacity = "0";

    document.body.appendChild(temp);
    temp.select();

    const copied = document.execCommand("copy");
    temp.remove();

    if (!copied) {
      alert("Copy failed. Please select and copy the content manually.");
      return;
    }

    copyButton.textContent = "Copied!";
  }

  setTimeout(() => {
    copyButton.textContent = "Copy plan";
  }, 1400);
});
