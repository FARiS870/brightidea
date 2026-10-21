
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
    `(?:^|\\n)\\s*${escaped}\\s*:\\s*([\\s\\S]*?)(?=\\n\\s*[A-Z][A-Z ]{1,35}\\s*:\\s*|$)`,
    "i"
  );

  return text.match(pattern)?.[1]?.trim() || "";
}

function cleanTitle(text) {
  return text
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*TITLE\s*:\s*/i, "")
    .replace(/\*\*/g, "")
    .replace(/^["']|["']$/g, "")
    .trim();
}

function getTitle(text) {
  const explicitTitle = text.match(
    /^\s*(?:#{1,3}\s*)?TITLE\s*:\s*(.+)$/im
  );

  if (explicitTitle?.[1]) {
    return cleanTitle(explicitTitle[1]);
  }

  const oldTitle = text.match(
    /^\s*(?:#{1,3}\s*)?(?:Video Title|Title Idea|Title)\s*:\s*(.+)$/im
  );

  if (oldTitle?.[1]) {
    return cleanTitle(oldTitle[1]);
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

function getOutline(text) {
  const section = getSection(text, "OUTLINE");
  const source = section || text;
  const lines = source.split("\n");
  const headings = [];
  const seen = new Set();

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) continue;

    const isHeading = /^#{1,4}\s+/.test(line);
    const isNumbered = /^\d+[.)]\s+/.test(line);
    const isBullet = /^\\?[-*]\s+/.test(line);

    if (!isHeading && !isNumbered && !isBullet) continue;

    const heading = line
      .replace(/^#{1,6}\s*/, "")
      .replace(/^\d+[.)]\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/\*\*/g, "")
      .replace(/\*/g, "")
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

function formatContent(text) {
  return text
    .replace(/\r/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2")
    .replace(/^\s*---+\s*$/gm, "")
    .trim();
}

function renderContent(text, container) {
  container.replaceChildren();

  const lines = formatContent(text).split("\n");
  let currentCard = null;

  function addParagraph(parent, value, className = "scene-text") {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = value;
    parent.appendChild(p);
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
    const heading = document.createElement("span");
    heading.className = "scene-label";
    heading.textContent = label;
    parent.appendChild(heading);

    if (value) addParagraph(parent, value);
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^Scene\s+\d+\b/i.test(line)) {
      startCard(line);
      continue;
    }

    const section = line.match(
      /^(HOOK|SCRIPT|CONTENT|PRODUCTION NOTES|CALL TO ACTION)\s*:\s*(.*)$/i
    );

    if (section) {
      startCard(section[1]);

      if (section[2]) {
        addParagraph(currentCard, section[2]);
      }

      continue;
    }

    if (/^TITLE\s*:/i.test(line)) continue;

    if (/^OUTLINE\s*:/i.test(line)) {
      currentCard = null;
      continue;
    }

    const label = line.match(
      /^(Narration|Voiceover|Voice-over|Visuals?|On-screen text|Sound|SFX|Camera|Action|Dialogue|Music|Transition)\s*:\s*(.*)$/i
    );

    if (label) {
      if (!currentCard) startCard("Content");
      addLabel(currentCard, label[1], label[2]);
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
      throw new Error(data.error || "Could not generate content.");
    }

    if (!data.result || typeof data.result !== "string") {
      throw new Error("The AI returned an empty result. Please try again.");
    }

    latestPlan = data.result;

    document.querySelector("#out-title").textContent =
      getTitle(latestPlan);

    const content = document.querySelector("#out-hook");
    renderContent(latestPlan, content);

    const outline = document.querySelector("#out-outline");
    outline.replaceChildren();

    const headings = getOutline(latestPlan);

    if (headings.length) {
      for (const heading of headings) {
        const item = document.createElement("li");
        item.textContent = heading;
        outline.appendChild(item);
      }
    } else {
      const item = document.createElement("li");
      item.textContent = "Your complete content is shown above.";
      outline.appendChild(item);
    }

    document.querySelector("#out-next").textContent =
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
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    copyButton.textContent = "Copied!";
  }

  setTimeout(() => {
    copyButton.textContent = "Copy plan";
  }, 1400);
});
