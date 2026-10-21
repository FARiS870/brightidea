
const form = document.querySelector("#idea-form");
const topicInput = document.querySelector("#topic");
const formatInput = document.querySelector("#format");
const languageInput = document.querySelector("#language");
const audienceInput = document.querySelector("#audience");
const emptyState = document.querySelector("#empty-state");
const result = document.querySelector("#result");
const copyButton = document.querySelector("#copy-btn");

let latestPlan = "";

function cleanLine(line) {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\s*>\s?/, "")
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "")
    .trim();
}

function getTitle(lines) {
  const titleLine = lines.find((line) =>
    /content plan:|video title:|title:/i.test(line)
  );

  if (titleLine) {
    const cleaned = cleanLine(titleLine)
      .replace(/^(content plan|video title|title)\s*:\s*/i, "");

    if (cleaned && !/^the truth about/i.test(cleaned) === false) {
      return cleaned;
    }

    if (cleaned) return cleaned;
  }

  const candidate = lines.find((line) =>
    /^#{1,3}\s+/.test(line) &&
    !/^(content plan|opening hook|structured video outline|practical production details|closing call to action)/i.test(
      cleanLine(line)
    )
  );

  if (candidate) return cleanLine(candidate);

  return topicInput.value.trim() || "Your AI-generated content";
}

function getOutline(lines) {
  const headings = [];
  const seen = new Set();

  for (const line of lines) {
    const isHeading = /^#{1,4}\s+/.test(line);
    const isNumbered = /^\s*\d+[.)]\s+/.test(line);

    if (!isHeading && !isNumbered) continue;

    const heading = cleanLine(line)
      .replace(/^\d+[.)]\s*/, "")
      .replace(/\s*\([^)]*\)\s*$/, "")
      .trim();

    if (!heading || heading.length > 100) continue;

    if (/^(content plan|compelling title options|the opening hook|structured video outline|practical production details|closing call to action|voiceover\/text on screen)$/i.test(heading)) {
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

    const lines = latestPlan
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const title = getTitle(lines);

    document.querySelector("#out-title").textContent = title;

    const content = document.querySelector("#out-hook");
    content.textContent = latestPlan;
    content.style.whiteSpace = "pre-wrap";

    const outline = document.querySelector("#out-outline");
    outline.replaceChildren();

    const headings = getOutline(lines);

    if (headings.length) {
      for (const heading of headings) {
        const item = document.createElement("li");
        item.textContent = heading;
        outline.appendChild(item);
      }
    } else {
      const item = document.createElement("li");
      item.textContent = "See the full content above for the main sections.";
      outline.appendChild(item);
    }

    document.querySelector("#out-next").textContent =
      "Review the draft, verify factual claims, and use the scene suggestions to plan your video.";

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
