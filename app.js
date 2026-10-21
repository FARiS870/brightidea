const form = document.querySelector("#idea-form");
const topicInput = document.querySelector("#topic");
const formatInput = document.querySelector("#format");
const languageInput = document.querySelector("#language");
const audienceInput = document.querySelector("#audience");
const emptyState = document.querySelector("#empty-state");
const result = document.querySelector("#result");
const copyButton = document.querySelector("#copy-btn");

let latestPlan = "";

function cleanTopic(value) {
  return value.trim().replace(/\s+/g, " ").replace(/[.!?]+$/, "");
}

function buildPlan(topic, format, language, audience) {
  const isArabic = language === "Arabic";
  const safeAudience = audience.trim();
  if (isArabic) {
    return {
      title: `لماذا يستحق موضوع «${topic}» أن نعرفه؟`,
      hook: `ماذا لو اكتشفت أن «${topic}» يخفي شيئًا لم تنتبه إليه من قبل؟ في هذا المحتوى سنشرح الفكرة ببساطة ونفصل الحقيقة عن التخمين.`,
      outline: [
        `ابدأ بسؤال أو مفاجأة مرتبطة بموضوع ${topic}.`,
        "قدّم شرحًا بسيطًا للمعلومة الأساسية، دون مصطلحات معقدة.",
        "استخدم مثالًا واقعيًا أو مقارنة تساعد الجمهور على الفهم.",
        "اذكر ما هو مؤكد، وتحقق من أي معلومة تحتاج إلى مصدر.",
        "اختم بخلاصة قصيرة وسؤال يشجع الجمهور على المشاركة."
      ],
      next: `اكتب ثلاث حقائق موثوقة عن «${topic}» واجمع مصادرها قبل إعداد النسخة النهائية${safeAudience ? `، مع مراعاة أن الجمهور هو: ${safeAudience}` : ""}.`
    };
  }
  return {
    title: `The surprising story behind ${topic}`,
    hook: `What if ${topic} is more interesting than it first appears? In this ${format.toLowerCase()}, we'll break down the key idea, explore a useful example, and separate established facts from assumptions.`,
    outline: [
      `Open with a surprising question about ${topic}.`,
      "Explain the core idea in plain, accessible language.",
      "Show a concrete example or comparison the audience can picture.",
      "Check important claims against reliable sources; flag uncertainty.",
      "Recap the key takeaway and end with one engaging audience question."
    ],
    next: `Find three reliable sources about "${topic}" before writing the final draft${safeAudience ? `, keeping this audience in mind: ${safeAudience}` : ""}.`
  };
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const topic = cleanTopic(topicInput.value);
  if (!topic) {
    topicInput.focus();
    return;
  }
  const plan = buildPlan(topic, formatInput.value, languageInput.value, audienceInput.value);
  document.querySelector("#out-title").textContent = plan.title;
  document.querySelector("#out-hook").textContent = plan.hook;
  document.querySelector("#out-next").textContent = plan.next;

  const outline = document.querySelector("#out-outline");
  outline.replaceChildren();
  plan.outline.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    outline.appendChild(li);
  });

  latestPlan = [
    plan.title,
    "",
    languageInput.value === "Arabic" ? "المقدمة:" : "Hook:",
    plan.hook,
    "",
    languageInput.value === "Arabic" ? "المخطط:" : "Outline:",
    ...plan.outline.map((item, index) => `${index + 1}. ${item}`),
    "",
    languageInput.value === "Arabic" ? "الخطوة التالية:" : "Next step:",
    plan.next
  ].join("\n");

  emptyState.classList.add("hidden");
  result.classList.remove("hidden");
  copyButton.disabled = false;
});

copyButton.addEventListener("click", async () => {
  if (!latestPlan) return;
  try {
    await navigator.clipboard.writeText(latestPlan);
    copyButton.textContent = "Copied!";
    window.setTimeout(() => { copyButton.textContent = "Copy plan"; }, 1400);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = latestPlan;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
    copyButton.textContent = "Copied!";
    window.setTimeout(() => { copyButton.textContent = "Copy plan"; }, 1400);
  }
});
