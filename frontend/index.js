"use strict";

const API_BASE = "http://127.0.0.1:8921";

(() => {
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  const COLORS = ["#4c8062", "#b8ca82", "#d9a07a", "#8ba6a0", "#8e88aa", "#d4bd7d"];
  const FIELD_ALIASES = {
    id: ["call_id", "conversation_id", "interaction_id", "record_id", "id", "call"],
    agent: ["agent_name", "agent", "advisor", "representative"],
    transcript: ["transcript", "call_transcript", "conversation", "transcript_text", "dialogue"],
    type: [
      "call_type",
      "predicted_call_type",
      "classified_call_type",
      "expected_call_type",
      "issue_type",
      "issue_category",
      "call_category",
      "classification",
      "category",
      "contact_reason",
    ],
    toneEmpathy: [
      "tone_empathy_score",
      "tone_empathy",
      "empathy_tone_score",
      "empathy_score",
      "tone_score",
      "empathy_tone",
      "empathy",
      "tone",
    ],
    knowledgeAccuracy: [
      "knowledge_accuracy_score",
      "knowledge_accuracy",
      "knowledge_score",
      "accuracy_score",
      "accuracy",
    ],
    resolutionQuality: [
      "resolution_quality_score",
      "resolution_quality",
      "issue_resolution_score",
      "resolution_score",
      "resolution_rating",
    ],
    overallScore: ["overall_score", "overall_quality_score", "overall_evaluation_score", "quality_score"],
    confidence: [
      "confidence",
      "confidence_score",
      "ai_confidence",
      "evaluation_confidence",
      "evaluation_confidence_score",
    ],
    resolution: ["resolution_status", "resolved", "resolution_outcome", "issue_resolved"],
  };
  const PILLARS = [
    { key: "toneEmpathy", label: "Empathy & tone" },
    { key: "knowledgeAccuracy", label: "Knowledge accuracy" },
    { key: "resolutionQuality", label: "Resolution quality" },
  ];

  const elements = {
    fileInput: document.querySelector("#file-input"),
    browseButton: document.querySelector("#browse-button"),
    uploadButton: document.querySelector("#upload-button"),
    dropzone: document.querySelector("#dropzone"),
    fileStatus: document.querySelector("#file-status"),
    fileStatusText: document.querySelector("#file-status-text"),
    fileCard: document.querySelector("#file-card"),
    fileName: document.querySelector("#file-name"),
    fileMeta: document.querySelector("#file-meta"),
    clearFile: document.querySelector("#clear-file"),
    sampleButton: document.querySelector("#sample-button"),
    callList: document.querySelector("#call-list"),
    callCount: document.querySelector("#call-count"),
    callSearch: document.querySelector("#call-search"),
    listFootnote: document.querySelector("#list-footnote"),
    dashboardSubtitle: document.querySelector("#dashboard-subtitle"),
    dataBadge: document.querySelector("#data-badge"),
    categoryFilter: document.querySelector("#category-filter"),
    metricTotal: document.querySelector("#metric-total"),
    metricTotalNote: document.querySelector("#metric-total-note"),
    metricQuality: document.querySelector("#metric-quality"),
    metricQualityNote: document.querySelector("#metric-quality-note"),
    qualityProgress: document.querySelector("#quality-progress"),
    metricEmpathy: document.querySelector("#metric-empathy"),
    metricEmpathyNote: document.querySelector("#metric-empathy-note"),
    empathyProgress: document.querySelector("#empathy-progress"),
    metricReview: document.querySelector("#metric-review"),
    metricReviewNote: document.querySelector("#metric-review-note"),
    categoryChart: document.querySelector("#category-chart"),
    pillarChart: document.querySelector("#pillar-chart"),
    pillarNote: document.querySelector("#pillar-note"),
    transcriptEmpty: document.querySelector("#transcript-empty"),
    transcriptDetail: document.querySelector("#transcript-detail"),
    selectedCallBadge: document.querySelector("#selected-call-badge"),
    conversationMeta: document.querySelector("#conversation-meta"),
    transcriptText: document.querySelector("#transcript-text"),
    evaluationDetail: document.querySelector("#evaluation-detail"),
    workbookFields: document.querySelector("#workbook-fields"),
  };

  const state = {
    records: [],
    selectedId: null,
    selectedCategory: "all",
    isDemo: false,
    fileName: "",
    pendingFile: null,
    categoryColors: new Map(),
  };

  function normalizeHeader(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/[\s-]+/g, "_")
      .replace(/[^\w]/g, "");
  }

  function findColumn(headers, aliases) {
    const normalizedHeaders = headers.map(normalizeHeader);
    for (const alias of aliases) {
      const index = normalizedHeaders.indexOf(normalizeHeader(alias));
      if (index !== -1) return index;
    }
    return -1;
  }

  function parseNumber(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string" || !value.trim()) return null;

    const fraction = value.trim().match(/^(-?\d+(?:\.\d+)?)\s*\/\s*5$/);
    const parsed = Number(fraction ? fraction[1] : value.replace(/[%,$\s]/g, ""));
    if (!Number.isFinite(parsed)) return null;
    if (value.includes("%") && parsed <= 100) return parsed / 20;
    return parsed;
  }

  function parseConfidence(value) {
    if (typeof value === "string" && value.includes("%")) {
      const percent = Number(value.replace(/[%,$\s]/g, ""));
      return Number.isFinite(percent) ? percent : null;
    }
    const parsed = parseNumber(value);
    if (parsed === null) return null;
    return parsed >= 0 && parsed <= 1 ? parsed * 100 : parsed;
  }

  function readRecord(row, headers, index) {
    const get = (field) => {
      const column = findColumn(headers, FIELD_ALIASES[field]);
      return column === -1 ? "" : row[column] ?? "";
    };
    const id = String(get("id") || index + 1).trim();
    const scores = {
      toneEmpathy: parseNumber(get("toneEmpathy")),
      knowledgeAccuracy: parseNumber(get("knowledgeAccuracy")),
      resolutionQuality: parseNumber(get("resolutionQuality")),
      overall: parseNumber(get("overallScore")),
    };

    const getScoreLabel = (field) => {
      const label = String(get(field) || "").trim();
      return parseNumber(label) === null ? label : "";
    };
    const confidence = parseConfidence(get("confidence"));
    return {
      id,
      agent: String(get("agent") || "Agent not specified").trim(),
      transcript: String(get("transcript") || "").trim(),
      type: String(get("type") || "Uncategorized").trim() || "Uncategorized",
      scores,
      evaluationLabels: {
        toneEmpathy: getScoreLabel("toneEmpathy"),
        knowledgeAccuracy: getScoreLabel("knowledgeAccuracy"),
        resolutionQuality: getScoreLabel("resolutionQuality"),
        overall: getScoreLabel("overallScore"),
      },
      confidence: confidence !== null && confidence >= 0 && confidence <= 100 ? confidence : null,
      resolution: String(get("resolution") || "").trim(),
      fields: headers.map((header, columnIndex) => ({
        name: String(header ?? ""),
        value: row[columnIndex] ?? "",
      })),
      sourceIndex: index,
    };
  }

  function setFileStatus(message, kind = "") {
    elements.fileStatusText.textContent = message;
    elements.fileStatus.classList.toggle("is-error", kind === "error");
    elements.fileStatus.classList.toggle("is-success", kind === "success");
  }

  function formatBytes(bytes) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatLabel(value) {
    return String(value)
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function getCategoryColor(category) {
    return state.categoryColors.get(category.trim().toLowerCase()) || COLORS[0];
  }

  function applyCategoryColor(element, category) {
    const color = getCategoryColor(category);
    const [red, green, blue] = color.slice(1).match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
    const brightness = (red * 299 + green * 587 + blue * 114) / 1000;
    element.style.backgroundColor = color;
    element.style.color = brightness > 150 ? "#26332d" : "#fff";
  }

  function getAverage(records, key) {
    const scores = records
      .map((record) => record.scores[key])
      .filter((score) => Number.isFinite(score));
    return scores.length
      ? { value: scores.reduce((sum, score) => sum + score, 0) / scores.length, count: scores.length }
      : null;
  }

  function formatScore(score) {
    return score >= 1 && score <= 5 ? `${score.toFixed(1)} / 5` : score.toFixed(1);
  }

  function getProgressWidth(score) {
    return `${Math.min(100, Math.max(0, (score / 5) * 100))}%`;
  }

  function getFilteredRecords() {
    return state.records.filter(
      (record) => state.selectedCategory === "all" || record.type === state.selectedCategory,
    );
  }

  function updateDashboard() {
    const records = getFilteredRecords();
    if (!records.some((record) => record.id === state.selectedId)) {
      state.selectedId = records[0]?.id ?? null;
    }
    const overall = getAverage(records, "overall");
    const empathy = getAverage(records, "toneEmpathy");
    const confidences = records.filter((record) => record.confidence !== null);
    const needsReview = confidences.filter((record) => record.confidence < 70).length;
    const categories = [...new Set(state.records.map((record) => record.type))].sort((a, b) =>
      a.localeCompare(b),
    );

    elements.metricTotal.textContent = state.records.length ? String(records.length) : "—";
    elements.metricTotalNote.textContent = state.isDemo
      ? "Illustrative records · not real calls"
      : state.records.length
        ? `${state.fileName} · ${records.length === state.records.length ? "all records" : "filtered"}`
        : "No workbook loaded";

    elements.metricQuality.innerHTML = overall
      ? `${overall.value.toFixed(1)}${overall.value >= 1 && overall.value <= 5 ? "<small>/ 5</small>" : ""}`
      : `—<small>/ 5</small>`;
    elements.metricQualityNote.textContent = overall
      ? `From ${overall.count} scored conversation${overall.count === 1 ? "" : "s"}`
      : "Evaluation scores not found";
    elements.qualityProgress.style.width = overall ? getProgressWidth(overall.value) : "0%";

    elements.metricEmpathy.innerHTML = empathy
      ? `${empathy.value.toFixed(1)}${empathy.value >= 1 && empathy.value <= 5 ? "<small>/ 5</small>" : ""}`
      : `—<small>/ 5</small>`;
    elements.metricEmpathyNote.textContent = empathy
      ? `Average from ${empathy.count} evaluation${empathy.count === 1 ? "" : "s"}`
      : "Not present in this workbook";
    elements.empathyProgress.style.width = empathy
      ? getProgressWidth(empathy.value)
      : "0%";

    elements.metricReview.textContent = confidences.length ? String(needsReview) : "—";
    elements.metricReviewNote.textContent = confidences.length
      ? `${needsReview} below 70% · ${confidences.length} with confidence`
      : "Confidence data not found";

    elements.dashboardSubtitle.textContent = state.records.length
      ? `${records.length} conversation${records.length === 1 ? "" : "s"} in view${state.isDemo ? " · illustrative preview" : ""}.`
      : "Your customer experience, at a glance.";
    elements.dataBadge.classList.toggle("is-ready", state.records.length > 0 && !state.isDemo);
    elements.dataBadge.classList.toggle("is-demo", state.isDemo);
    elements.dataBadge.innerHTML = state.isDemo
      ? "<span></span> ILLUSTRATIVE PREVIEW"
      : state.records.length
        ? "<span></span> WORKBOOK LOADED"
        : "<span></span> AWAITING DATA";

    renderFilter(categories);
    renderCallList();
    renderCategoryChart(records);
    renderPillarChart(records);
    renderSelectedCall();
  }

  function renderFilter(categories) {
    const current = state.selectedCategory;
    elements.categoryFilter.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "All call types";
    elements.categoryFilter.append(allOption);

    for (const category of categories) {
      const option = document.createElement("option");
      option.value = category;
      option.textContent = formatLabel(category);
      elements.categoryFilter.append(option);
    }

    if (current !== "all" && !categories.includes(current)) state.selectedCategory = "all";
    elements.categoryFilter.value = state.selectedCategory;
    elements.categoryFilter.disabled = categories.length === 0;
  }

  function renderCallList() {
    const records = getFilteredRecords();
    const query = elements.callSearch.value.trim().toLowerCase();
    const visible = records.filter((record) =>
      [
        record.id,
        record.agent,
        record.type,
        record.transcript,
        ...(record.fields || []).flatMap(({ name, value }) => [name, String(value)]),
      ].some((value) => value.toLowerCase().includes(query)),
    );
    elements.callCount.textContent = String(records.length);
    elements.callList.replaceChildren();

    if (visible.length === 0) {
      const empty = document.createElement("div");
      empty.className = "empty-list";
      empty.textContent = state.records.length
        ? "No conversations match your search."
        : "Your imported conversations will appear here.";
      elements.callList.append(empty);
      elements.listFootnote.textContent = state.records.length
        ? "Try another search or call type."
        : "Import a workbook to explore its calls.";
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const record of visible.slice(0, 300)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "call-item";
      button.classList.toggle("is-selected", record.id === state.selectedId);
      button.setAttribute("aria-pressed", String(record.id === state.selectedId));

      const avatar = document.createElement("span");
      avatar.className = "call-avatar";
      avatar.textContent = record.agent === "Agent not specified"
        ? "?"
        : record.agent.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

      const copy = document.createElement("span");
      copy.className = "call-copy";
      const name = document.createElement("strong");
      name.textContent = `Call ${record.id}`;
      const description = document.createElement("small");
      description.textContent = record.agent;
      copy.append(name, description);

      const type = document.createElement("span");
      type.className = "call-type";
      type.textContent = formatLabel(record.type);
      applyCategoryColor(type, record.type);
      button.append(avatar, copy, type);
      button.addEventListener("click", () => {
        state.selectedId = record.id;
        renderCallList();
        renderSelectedCall();
      });
      fragment.append(button);
    }
    elements.callList.append(fragment);
    elements.listFootnote.textContent = visible.length > 300
      ? `Showing the first 300 of ${visible.length} matching conversations.`
      : `${visible.length} conversation${visible.length === 1 ? "" : "s"} shown`;
  }

  function renderCategoryChart(records) {
    elements.categoryChart.replaceChildren();
    if (!records.length) {
      const empty = document.createElement("div");
      empty.className = "chart-empty";
      empty.innerHTML = '<div class="empty-ring"></div><span>Call types will appear<br />once you import data.</span>';
      elements.categoryChart.append(empty);
      return;
    }

    const counts = new Map();
    for (const record of records) counts.set(record.type, (counts.get(record.type) || 0) + 1);
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    let offset = 0;
    const segments = sorted.map(([category, count]) => {
      const start = offset;
      offset += (count / records.length) * 100;
      return `${getCategoryColor(category)} ${start}% ${offset}%`;
    });

    const donut = document.createElement("div");
    donut.className = "donut-wrap";
    donut.style.background = `conic-gradient(${segments.join(", ")})`;
    donut.setAttribute("role", "img");
    donut.setAttribute(
      "aria-label",
      sorted.map(([category, count]) => `${formatLabel(category)}: ${count}`).join(", "),
    );
    const center = document.createElement("div");
    center.className = "donut-center";
    const total = document.createElement("strong");
    total.textContent = String(records.length);
    const totalLabel = document.createElement("span");
    totalLabel.textContent = "calls";
    center.append(total, totalLabel);
    donut.append(center);

    const legend = document.createElement("div");
    legend.className = "chart-legend";
    for (const [category, count] of sorted.slice(0, 6)) {
      const item = document.createElement("div");
      item.className = "legend-item";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.backgroundColor = getCategoryColor(category);
      const label = document.createElement("span");
      label.className = "legend-label";
      label.textContent = formatLabel(category);
      applyCategoryColor(label, category);
      const value = document.createElement("strong");
      value.textContent = String(count);
      item.append(dot, label, value);
      legend.append(item);
    }
    elements.categoryChart.append(donut, legend);
  }

  function renderPillarChart(records) {
    const rows = [...elements.pillarChart.querySelectorAll(".pillar-row")];
    let availableCount = 0;
    for (const [index, pillar] of PILLARS.entries()) {
      const average = getAverage(records, pillar.key);
      const row = rows[index];
      row.querySelector(".pillar-label").textContent = pillar.label;
      row.querySelector(".pillar-track > span").style.width = average
        ? getProgressWidth(average.value)
        : "0%";
      row.querySelector(".pillar-value").textContent = average ? average.value.toFixed(1) : "—";
      availableCount += average ? 1 : 0;
    }
    elements.pillarNote.textContent = availableCount
      ? `${availableCount} of 3 evaluation pillars have scores in this view.`
      : "Scores appear when evaluation columns are included in your file.";
  }

  function appendMeta(label, value, category = null) {
    const chip = document.createElement("span");
    chip.className = "meta-chip";
    if (category !== null) {
      chip.classList.add("is-category");
      applyCategoryColor(chip, category);
    }
    chip.append(document.createTextNode(`${label} `));
    const strong = document.createElement("strong");
    strong.textContent = value;
    chip.append(strong);
    elements.conversationMeta.append(chip);
  }

  function renderSelectedCall() {
    const record = getFilteredRecords().find((call) => call.id === state.selectedId);
    elements.transcriptEmpty.hidden = Boolean(record);
    elements.transcriptDetail.hidden = !record;
    elements.selectedCallBadge.classList.remove("is-review", "is-clear");

    if (!record) {
      elements.selectedCallBadge.textContent = "NO CALL SELECTED";
      return;
    }

    elements.selectedCallBadge.textContent = record.confidence === null
      ? "NOT EVALUATED"
      : record.confidence < 70
        ? "HUMAN REVIEW"
        : "CONFIDENCE OK";
    elements.selectedCallBadge.classList.toggle("is-review", record.confidence !== null && record.confidence < 70);
    elements.selectedCallBadge.classList.toggle("is-clear", record.confidence !== null && record.confidence >= 70);

    elements.conversationMeta.replaceChildren();
    appendMeta("Call", record.id);
    appendMeta("Agent", record.agent);
    appendMeta("Type", formatLabel(record.type), record.type);
    if (record.confidence !== null) appendMeta("Confidence", `${Math.round(record.confidence)}%`);

    elements.transcriptText.textContent = record.transcript || "No transcript text found in this row.";
    elements.evaluationDetail.replaceChildren();
    for (const pillar of PILLARS) {
      const chip = document.createElement("span");
      chip.className = "evaluation-chip";
      chip.classList.add(`evaluation-chip--${pillar.key}`);
      chip.append(document.createTextNode(`${pillar.label} `));
      const value = document.createElement("strong");
      value.textContent = record.scores[pillar.key] !== null
        ? formatScore(record.scores[pillar.key])
        : record.evaluationLabels[pillar.key] || "Not scored";
      chip.append(value);
      elements.evaluationDetail.append(chip);
    }
    if (record.scores.overall !== null || record.evaluationLabels.overall) {
      const chip = document.createElement("span");
      chip.className = "evaluation-chip";
      chip.append(document.createTextNode("Overall score "));
      const value = document.createElement("strong");
      value.textContent = record.scores.overall !== null
        ? formatScore(record.scores.overall)
        : record.evaluationLabels.overall;
      chip.append(value);
      elements.evaluationDetail.append(chip);
    }
    if (record.resolution) {
      const resolution = document.createElement("span");
      resolution.className = "evaluation-chip";
      resolution.append(document.createTextNode("Resolution "));
      const value = document.createElement("strong");
      value.textContent = record.resolution;
      resolution.append(value);
      elements.evaluationDetail.append(resolution);
    }

    elements.workbookFields.replaceChildren();
    for (const field of record.fields || []) {
      const item = document.createElement("div");
      item.className = "workbook-field";
      const name = document.createElement("dt");
      name.textContent = field.name || "(Unnamed column)";
      const value = document.createElement("dd");
      value.textContent = field.value instanceof Date
        ? field.value.toISOString()
        : typeof field.value === "string"
          ? field.value
          : JSON.stringify(field.value);
      item.append(name, value);
      elements.workbookFields.append(item);
    }
  }

  function setDataset(records, { demo = false, fileName = "" } = {}) {
    state.records = records;
    state.categoryColors = new Map(
      [...new Set(records.map((record) => record.type.trim().toLowerCase()))]
        .sort((a, b) => a.localeCompare(b))
        .map((category, index) => [category, COLORS[index % COLORS.length]]),
    );
    state.selectedId = records[0]?.id ?? null;
    state.selectedCategory = "all";
    state.isDemo = demo;
    state.fileName = fileName;
    updateDashboard();
  }

  function parseWorkbook(buffer) {
    const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
    const sheet = workbook.SheetNames
      .map((name) => workbook.Sheets[name])
      .find((worksheet) => worksheet && window.XLSX.utils.sheet_to_json(worksheet, { header: 1 }).length > 0);
    if (!sheet) throw new Error("No rows were found in the returned workbook.");

    const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim() !== ""));
    if (headerIndex === -1 || headerIndex >= rows.length - 1) {
      throw new Error("The returned workbook needs a header row and at least one call record.");
    }

    const headers = rows[headerIndex];
    const records = rows
      .slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell).trim() !== ""))
      .map((row, index) => readRecord(row, headers, index))
    if (records.length === 0) throw new Error("No call records were found in the returned workbook.");

    return records;
  }

  function selectFile(file) {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(extension || "")) {
      state.pendingFile = null;
      elements.fileCard.hidden = true;
      setFileStatus("Choose an XLSX, XLS or CSV file.", "error");
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      state.pendingFile = null;
      elements.fileCard.hidden = true;
      setFileStatus("This file exceeds the 20 MB limit.", "error");
      return;
    }

    state.pendingFile = file;
    elements.fileName.textContent = file.name;
    elements.fileMeta.textContent = formatBytes(file.size);
    elements.fileCard.hidden = false;
    setFileStatus("Workbook ready. Select Upload selected workbook to send it to the API.");
  }

  async function importFile() {
    const file = state.pendingFile;
    if (elements.uploadButton.disabled) return;
    if (!file) {
      setFileStatus("Choose an XLSX, XLS or CSV workbook before uploading.", "error");
      return;
    }

    elements.uploadButton.disabled = true;
    setFileStatus("Uploading workbook for evaluation…");
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_BASE}/uploadfile`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const responseText = await response.text();
        let detail = responseText;
        try {
          const errorBody = JSON.parse(responseText);
          detail = errorBody.detail || responseText;
        } 
        catch {
          alert("The API returned an unexpected response. Check the console for details.");
        }
        throw new Error(detail || `Upload failed (${response.status}).`);
      }

      setFileStatus("Evaluation complete. Loading results…");
      if (!window.XLSX) {
        throw new Error("The workbook was evaluated, but the spreadsheet reader could not load the results. Check your connection and refresh.");
      }
      const records = parseWorkbook(await response.arrayBuffer());
      setDataset(records, { fileName: file.name });
      elements.fileMeta.textContent = `${records.length} call${records.length === 1 ? "" : "s"} · ${formatBytes(file.size)}`;
      state.pendingFile = null;
      elements.uploadButton.disabled = false;
      setFileStatus("Evaluation results loaded successfully.", "success");
    } 
    catch (error) {
      console.error("Unable to upload the workbook or read evaluation results.", 
        JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
      );
      setFileStatus(
        error instanceof Error ? error.message : "Unable to upload the workbook or read evaluation results.",
        "error",
      );
      elements.uploadButton.disabled = !state.pendingFile;
    }
  }

  function clearFile() {
    state.records = [];
    state.selectedId = null;
    state.selectedCategory = "all";
    state.isDemo = false;
    state.fileName = "";
    state.pendingFile = null;
    state.categoryColors.clear();
    elements.fileInput.value = "";
    elements.fileCard.hidden = true;
    elements.callSearch.value = "";
    setFileStatus("Waiting for a workbook");
    updateDashboard();
  }

  function loadDemo() {
    const demoRecords = [
      {
        id: "DEMO-1042",
        agent: "Matt Rivera",
        type: "billing",
        transcript: "Customer: I was charged twice for my premium this month.\nAgent: I can understand why that would be concerning. Let me check your account and get this sorted.\nCustomer: Thank you. I just want to make sure it does not happen again.\nAgent: I found the duplicate charge and have submitted a refund. It should appear within 3–5 business days.",
        scores: { toneEmpathy: 4.7, knowledgeAccuracy: 4.5, resolutionQuality: 4.8 },
        confidence: 96,
        resolution: "Resolved",
        sourceIndex: 0,
      },
      {
        id: "DEMO-1043",
        agent: "Aisha Patel",
        type: "complaint",
        transcript: "Customer: My replacement still has not arrived, and I have already called twice.\nAgent: I am sorry you have had to follow up again. I will check the shipping status and stay with this until we have an answer.\nCustomer: I appreciate that.\nAgent: The parcel was delayed in transit. I have arranged priority delivery and will send you the tracking link today.",
        scores: { toneEmpathy: 4.4, knowledgeAccuracy: 4.2, resolutionQuality: 4.1 },
        confidence: 88,
        resolution: "Resolved",
        sourceIndex: 1,
      },
      {
        id: "DEMO-1044",
        agent: "Jordan Lee",
        type: "general_query",
        transcript: "Customer: Can I update the delivery address after placing an order?\nAgent: It depends on whether the order has shipped. I can check the current status for you.\nCustomer: That would be great.\nAgent: This one has already shipped, so I cannot change the label. I have shared the carrier's redirect options with you.",
        scores: { toneEmpathy: 3.8, knowledgeAccuracy: 4.6, resolutionQuality: 3.7 },
        confidence: 63,
        resolution: "Partially resolved",
        sourceIndex: 2,
      },
      {
        id: "DEMO-1045",
        agent: "Sam Chen",
        type: "claims",
        transcript: "Customer: The item arrived damaged. What do I need to do to make a claim?\nAgent: I am sorry it arrived that way. I can guide you through the claim and make sure you have what you need.\nCustomer: Should I send a photo?\nAgent: Yes, a photo of the damage and the packaging will help. I have emailed a secure link to submit them.",
        scores: { toneEmpathy: 4.8, knowledgeAccuracy: 4.7, resolutionQuality: 4.6 },
        confidence: 94,
        resolution: "Resolved",
        sourceIndex: 3,
      },
      {
        id: "DEMO-1046",
        agent: "Maya Singh",
        type: "billing",
        transcript: "Customer: I do not recognise this service fee on my statement.\nAgent: I can look into that. The fee is listed on your plan as an annual account charge.\nCustomer: I was not expecting it.\nAgent: I understand. I have explained where it comes from and sent the plan details to your email.",
        scores: { toneEmpathy: 3.4, knowledgeAccuracy: 4.1, resolutionQuality: 3.2 },
        confidence: 58,
        resolution: "Needs follow-up",
        sourceIndex: 4,
      },
    ];
    setDataset(demoRecords, { demo: true, fileName: "Illustrative sample" });
    state.pendingFile = null;
    elements.fileInput.value = "";
    elements.fileCard.hidden = true;
    setFileStatus("Illustrative preview loaded. No AI evaluation was run.");
  }

  elements.browseButton.addEventListener("click", () => elements.fileInput.click());
  elements.fileInput.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    elements.fileInput.value = "";
    selectFile(file);
  });
  elements.uploadButton.addEventListener("click", importFile);
  elements.clearFile.addEventListener("click", clearFile);
  elements.sampleButton.addEventListener("click", loadDemo);
  elements.callSearch.addEventListener("input", renderCallList);
  elements.categoryFilter.addEventListener("change", (event) => {
    state.selectedCategory = event.target.value;
    updateDashboard();
  });

  elements.dropzone.addEventListener("click", (event) => {
    if (event.target === elements.fileInput || event.target.closest("button")) return;
    elements.fileInput.click();
  });
  for (const eventName of ["dragenter", "dragover"]) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add("is-dragging");
    });
  }
  for (const eventName of ["dragleave", "drop"]) {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove("is-dragging");
    });
  }
  elements.dropzone.addEventListener("drop", (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) selectFile(file);
  });

  updateDashboard();
})();