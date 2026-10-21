
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

function normalizeLine(line) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^\s*[-*]\s+/, "")
    .trim();
}

function cleanTitle(text) {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*(?:WORKING TITLE|VIDEO TITLE|TITLE|العنوان)\s*[:：]\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/^["'“”]|["'“”]$/g, "")
    .trim();
}

function getTitle(text) {
  const patterns = [
    /^\s*(?:#{1,6}\s*)?(?:WORKING TITLE|VIDEO TITLE|TITLE|العنوان)\s*[:：]\s*(.+)$/im,
    /^\s*(?:#{1,6}\s*)?(?:Title Idea|Title)\s*:\s*(.+)$/im
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return cleanTitle(match[1]);
  }

  const genericHeadings = new Set([
    "hook", "script", "content", "outline",
    "production notes", "call to action",
    "مقدمة", "المحتوى", "المخطط"
  ]);

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    const match = line.match(/^#{1,3}\s+(.+)$/);

    if (!match) continue;

    const candidate = cleanTitle(match[1]);

    if (
      candidate &&
      !genericHeadings.has(candidate.toLowerCase()) &&
      !/brightidea content plan/i.test(candidate)
    ) {
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
  const lines = formatContent(text).split("\n");
  const headings = [];
  const seen = new Set();
  let inOutline = false;

  for (const rawLine of lines) {
    const line = normalizeLine(rawLine);

    if (!line) continue;

    if (/^(?:OUTLINE|المخطط|مخطط المحتوى)\s*[:：]?\s*$/i.test(line)) {
      inOutline = true;
      continue;
    }

    if (
      inOutline &&
      /^(?:NEXT STEP|الخطوة التالية)\s*[:：]?\s*$/i.test(line)
    ) {
      break;
    }

    if (inOutline) {
      const itemMatch = line.match(/^(?:\d+[.)]|[-*•])\s+(.+)$/);
      const value = itemMatch ? itemMatch[1].trim() : line;

      if (!value || value.length > 180) continue;

      const key = value.toLowerCase();

      if (!seen.has(key)) {
        seen.add(key);
        headings.push(value);
      }
    }
  }

  // Fallback for AI responses that omit an OUTLINE heading.
  if (!headings.length) {
    for (const rawLine of lines) {
      const line = normalizeLine(rawLine);
      const match = line.match(/^\d+[.)]\s+(.+)$/);

      if (!match) continue;

      const value = match[1].trim();
      const key = value.toLowerCase();

      if (value && !seen.has(key)) {
        seen.add(key);
        headings.push(value);
      }
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
    if (!value) return;

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
    labelElement.textContent = label.replace(/[:：]\s*$/, "");
    parent.appendChild(labelElement);

    if (value) addParagraph(parent, value);
  }

  const scenePattern =
    /^(?:scene\s+\d+\b.*|ال?م{1,2}شهد\s+(?:الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر|\d+)\s*[:：]?.*)$/i;

  const sectionPattern =
    /^(HOOK|SCRIPT|CONTENT|PRODUCTION NOTES|CALL TO ACTION|مقدمة|المحتوى|ملاحظات الإنتاج|دعوة لاتخاذ إجراء)(?:\s*[:：]\s*(.*))?$/i;

  const labelPattern =
    /^(Narration|Voiceover|Voice-over|Visuals?|Visual Description|On-screen text|Sound|SFX|Camera|Action|Dialogue|Music|Transition|التعليق الصوتي|التعليق|السرد|المشهد البصري|الوصف البصري|المرئي|الصورة|الموسيقى|النص على الشاشة|المؤثرات الصوتية|المؤثرات|الصوت|الحوار)\s*[:：]\s*(.*)$/i;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    // Stop displaying the outline inside the content cards.
    if (/^(?:OUTLINE|المخطط|مخطط المحتوى)\s*[:：]?\s*$/i.test(line)) {
      skipOutline = true;
      currentCard = null;
      continue;
    }

    if (skipOutline) {
      if (/^(?:NEXT STEP|الخطوة التالية)\s*[:：]?\s*$/i.test(line)) {
        break;
      }
      continue;
    }

    // Ignore title labels: the title has its own display area.
    if (/^(?:WORKING TITLE|VIDEO TITLE|TITLE|العنوان)\s*[:：]/i.test(line)) {
      continue;
    }

    // Create a separate card for each scene.
    // Also tolerate the common typo "الممشهد".
    if (scenePattern.test(line)) {
      startCard(line.replace(/[:：]\s*$/, ""));
      continue;
    }

    // Create cards for major content sections.
    const sectionMatch = line.match(sectionPattern);

    if (sectionMatch) {
      startCard(sectionMatch[1].trim());

      if (sectionMatch[2]) {
        addParagraph(currentCard, sectionMatch[2].trim());
      }

      continue;
    }

    // Support English and Arabic production labels.
    const labelMatch = line.match(labelPattern);

    if (labelMatch) {
      if (!currentCard) startCard("Content");

      addLabel(currentCard, labelMatch[1], labelMatch[2].trim());
      continue;
    }

    const cleanLine = line
      .replace(/^[-*•]\s+/, "")
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
