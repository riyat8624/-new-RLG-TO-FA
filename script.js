/**
 * ============================================================================
 * RLG → NFA Converter | Theory of Computation Digital Lab
 *
 * Theory & Algorithm for College Viva:
 * 1. Right-Linear Grammar (RLG):
 *    - All productions have the form: A → aB  or  A → a
 *    - Non-terminals (uppercase) represent States in the finite automaton.
 *    - Terminals (lowercase/digits) represent Input Alphabet symbols (Σ).
 * 2. Start State:
 *    - The left-hand side non-terminal of the first production rule.
 * 3. Final State (F):
 *    - One common accepting state (F) created for productions of the form A → a.
 * 4. Transition Function δ(State, Symbol):
 *    - For A → aB :  δ(A, a) = B   [Transition: A --a--> B]
 *    - For A → a  :  δ(A, a) = F   [Transition: A --a--> F]
 * ============================================================================
 */

// Presets for quick lab testing
const TEST_PRESETS = {
  test1: "S → aA | b\nA → aS | b",
  test2: "S -> 0A | 1\nA -> 0S | 1",
  test3: "S -> aA | bB\nA -> a\nB -> b",
  test4: "S->aA|b\nA->aS|b"
};

/**
 * Parses and validates Right-Linear Grammar input.
 * Supports:
 * - Both '->' and unicode '→'
 * - Whitespace tolerance (S->aA|b, S -> aA | b, S  ->  aA  |  b)
 * - Alternatives separated by '|'
 * - Form 1: A -> aB (transitions to B on symbol a)
 * - Form 2: A -> a  (transitions to F on symbol a)
 *
 * @param {string} text - Raw grammar string from editor
 * @returns {object} Parsed structure or error details
 */
function parseGrammar(text) {
  if (!text || !text.trim()) {
    return {
      success: false,
      error: "Please enter a Right-Linear Grammar first."
    };
  }

  // Remove carriage returns (\r) to prevent Windows newline bugs
  const lines = text.replace(/\r/g, "").split("\n");
  const transitions = [];
  const nonTerminals = new Set();
  const terminals = new Set();
  const traceSteps = [];
  let startState = null;
  let hasFinalState = false;
  let validProductionsCount = 0;

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    const lineNum = i + 1;

    // Ignore empty lines and comment lines
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      continue;
    }

    // Step: Normalize unicode arrow '→' to '->'
    line = line.replace(/→/g, "->");

    // Check for arrow presence
    if (!line.includes("->")) {
      return {
        success: false,
        error: `Invalid production on line ${lineNum}: Missing '->'.\n\nExpected format:\nA -> aB\nor\nA -> a`
      };
    }

    const sides = line.split("->");
    if (sides.length !== 2) {
      return {
        success: false,
        error: `Invalid production on line ${lineNum}: Multiple arrows found.\n\nExpected format:\nA -> aB\nor\nA -> a`
      };
    }

    const lhs = sides[0].trim();
    const rhs = sides[1].trim();

    // Validate Left-Hand Side (single uppercase non-terminal)
    if (!lhs || !/^[A-Z][0-9]?$/.test(lhs)) {
      return {
        success: false,
        error: `Invalid production on line ${lineNum}: Invalid LHS variable '${lhs}'.\n\nExpected single uppercase non-terminal (e.g. S, A, B).`
      };
    }

    // First LHS non-terminal becomes the start state
    if (!startState) {
      startState = lhs;
    }
    nonTerminals.add(lhs);

    // Split alternatives by '|'
    const rawAlternatives = rhs.split("|");
    if (rawAlternatives.length === 0 || (rawAlternatives.length === 1 && !rawAlternatives[0].trim())) {
      return {
        success: false,
        error: `Invalid production on line ${lineNum}: Missing right-hand side.\n\nExpected format:\nA -> aB\nor\nA -> a`
      };
    }

    for (let rawAlt of rawAlternatives) {
      const alt = rawAlt.trim();

      if (!alt) {
        return {
          success: false,
          error: `Invalid production on line ${lineNum}: Empty alternative after '|'.\n\nExpected format:\nA -> aB\nor\nA -> a`
        };
      }

      // -------------------------------------------------------------
      // Case 1: A -> a (terminal only, length 1)
      // -------------------------------------------------------------
      if (alt.length === 1) {
        const char = alt;
        // If char is an uppercase letter (A-Z), that is A -> B (unit production), invalid in standard RLG
        if (char >= "A" && char <= "Z") {
          return {
            success: false,
            error: `Invalid production on line ${lineNum}: '${lhs} -> ${alt}'. Unit productions (A -> B) are not allowed in standard RLG.\n\nExpected format:\nA -> aB\nor\nA -> a`
          };
        }

        // Valid terminal only -> goes to Final State 'F'
        terminals.add(char);
        hasFinalState = true;

        transitions.push({
          from: lhs,
          symbol: char,
          to: "F",
          rule: `${lhs} → ${alt}`
        });

        traceSteps.push({
          grammarRule: `${lhs} → ${alt}`,
          nfaTransition: `${lhs} --${char}--> F`,
          explanation: `Terminal-only production reaches common accepting state F.`
        });

        validProductionsCount++;
      }
      // -------------------------------------------------------------
      // Case 2: A -> aB (terminal followed by non-terminal, length 2)
      // -------------------------------------------------------------
      else if (alt.length === 2) {
        const first = alt[0];
        const second = alt[1];
        const isFirstNonTerminal = first >= "A" && first <= "Z";
        const isSecondNonTerminal = second >= "A" && second <= "Z";

        // Must be: first is terminal (not uppercase), second is non-terminal (uppercase)
        if (!isFirstNonTerminal && isSecondNonTerminal) {
          terminals.add(first);
          nonTerminals.add(second);

          transitions.push({
            from: lhs,
            symbol: first,
            to: second,
            rule: `${lhs} → ${alt}`
          });

          traceSteps.push({
            grammarRule: `${lhs} → ${alt}`,
            nfaTransition: `${lhs} --${first}--> ${second}`,
            explanation: `Transitions from state ${lhs} to variable state ${second} on reading '${first}'.`
          });

          validProductionsCount++;
        } else if (isFirstNonTerminal && !isSecondNonTerminal) {
          // Left-linear format A -> Ba
          return {
            success: false,
            error: `Invalid production on line ${lineNum}: '${lhs} -> ${alt}'. This is Left-Linear (A -> Ba).\n\nExpected Right-Linear format:\nA -> aB\nor\nA -> a`
          };
        } else {
          return {
            success: false,
            error: `Invalid production on line ${lineNum}: '${lhs} -> ${alt}'.\n\nExpected format:\nA -> aB\nor\nA -> a`
          };
        }
      }
      // -------------------------------------------------------------
      // Case 3: Longer than 2 (e.g. S -> abc) -> strictly invalid in RLG
      // -------------------------------------------------------------
      else {
        return {
          success: false,
          error: `Invalid production on line ${lineNum}: '${lhs} -> ${alt}'.\n\nExpected format:\nA -> aB\nor\nA -> a`
        };
      }
    }
  }

  if (validProductionsCount === 0) {
    return {
      success: false,
      error: "Please enter a Right-Linear Grammar first."
    };
  }

  // Compile list of all automaton states
  const stateSet = new Set(nonTerminals);
  if (hasFinalState) {
    stateSet.add("F");
  }

  // Sort states: start state first, others alphabetically, F at the end
  const allStates = Array.from(stateSet).sort((a, b) => {
    if (a === startState) return -1;
    if (b === startState) return 1;
    if (a === "F") return 1;
    if (b === "F") return -1;
    return a.localeCompare(b);
  });

  return {
    success: true,
    startState: startState,
    finalState: "F",
    hasFinalState: hasFinalState,
    allStates: allStates,
    terminals: Array.from(terminals).sort(),
    transitions: transitions,
    traceSteps: traceSteps
  };
}

/**
 * Renders the NFA transition table.
 * Table Columns:
 * | From State | Input Symbol | To State |
 *
 * @param {object} nfa - Parsed NFA object
 */
function renderTransitionTable(nfa) {
  const tableBody = document.getElementById("tableBody");
  if (!tableBody) return;
  tableBody.innerHTML = "";

  // Sort transitions: start state first, then alphabetically by from state and symbol
  const sorted = [...nfa.transitions].sort((a, b) => {
    if (a.from !== b.from) {
      if (a.from === nfa.startState) return -1;
      if (b.from === nfa.startState) return 1;
      return a.from.localeCompare(b.from);
    }
    return a.symbol.localeCompare(b.symbol);
  });

  sorted.forEach((t) => {
    const row = document.createElement("tr");
    const isFromStart = t.from === nfa.startState;
    const isToFinal = t.to === nfa.finalState;

    row.innerHTML = `
      <td>
        <span class="state-tag">${t.from}</span>
        ${isFromStart ? '<span style="font-size:0.75rem; color:#7c3aed; font-weight:bold; margin-left:4px;">(Start)</span>' : ""}
      </td>
      <td>
        <span class="symbol-tag">${t.symbol}</span>
      </td>
      <td>
        <span class="state-tag ${isToFinal ? "final-state-tag" : ""}">${t.to}</span>
        ${isToFinal ? '<span style="font-size:0.75rem; color:#7e22ce; font-weight:bold; margin-left:4px;">(Final)</span>' : ""}
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Generates an SVG Diagram of the NFA automaton.
 * - Start state has an incoming arrow from the left
 * - Final state F has a double circle
 * - Self loops are supported
 * - Opposing transitions curve gracefully to avoid collisions
 * - Clear labels on every transition arc
 *
 * @param {object} nfa - Parsed NFA object
 */
function renderNFADiagram(nfa) {
  const container = document.getElementById("svgContainer");
  if (!container) return;
  container.innerHTML = "";

  const states = nfa.allStates;
  const numStates = states.length;
  const width = Math.max(620, numStates * 160);
  const height = 340;
  const stateRadius = 26;

  // Layout coordinates
  const coords = {};
  if (numStates === 2) {
    coords[states[0]] = { x: 200, y: 170 };
    coords[states[1]] = { x: 440, y: 170 };
  } else if (numStates === 3) {
    // Textbook triangle layout to avoid line overlaps between S, A, and F
    coords[states[0]] = { x: 160, y: 180 }; // Start state (S)
    coords[states[1]] = { x: 320, y: 100 }; // Intermediate (A)
    coords[states[2]] = { x: 480, y: 180 }; // Final state (F)
  } else if (numStates === 4) {
    // Diamond layout
    coords[states[0]] = { x: 130, y: 170 }; // Start
    coords[states[1]] = { x: 290, y: 95 };  // Intermediate 1
    coords[states[2]] = { x: 290, y: 245 }; // Intermediate 2
    coords[states[3]] = { x: 490, y: 170 }; // Final
  } else {
    // Circular ring for 5+ states
    const cx = width / 2;
    const cy = height / 2;
    const rx = Math.min(width / 2 - 90, 230);
    const ry = 110;

    states.forEach((st, idx) => {
      let angle;
      if (st === nfa.startState) {
        angle = Math.PI; // Far left
      } else if (st === nfa.finalState) {
        angle = 0; // Far right
      } else {
        angle = Math.PI - (idx / (numStates - 1)) * Math.PI * 2;
      }
      coords[st] = {
        x: Math.round(cx + rx * Math.cos(angle)),
        y: Math.round(cy + ry * Math.sin(angle))
      };
    });
  }

  // Group transitions by state pair (from -> to) to combine multiple symbols into "a, b"
  const grouped = {};
  nfa.transitions.forEach((t) => {
    const key = `${t.from}->${t.to}`;
    if (!grouped[key]) {
      grouped[key] = { from: t.from, to: t.to, symbols: [] };
    }
    if (!grouped[key].symbols.includes(t.symbol)) {
      grouped[key].symbols.push(t.symbol);
    }
  });

  // SVG Canvas
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.setAttribute("class", "svg-nfa-graph");
  svg.setAttribute("width", "100%");
  svg.setAttribute("style", `max-width: ${width}px; height: auto;`);

  // Defs: Markers for arrowheads
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  defs.innerHTML = `
    <marker id="arrow-navy" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#0f172a" />
    </marker>
    <marker id="arrow-purple" viewBox="0 0 10 10" refX="8" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill="#7c3aed" />
    </marker>
  `;
  svg.appendChild(defs);

  // Transitions Layer
  const transGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  transGroup.setAttribute("class", "transitions-layer");

  Object.values(grouped).forEach((group) => {
    const { from, to, symbols } = group;
    const p1 = coords[from];
    const p2 = coords[to];
    const label = symbols.join(", ");
    const isToFinal = to === nfa.finalState;
    const strokeColor = isToFinal ? "#7c3aed" : "#0f172a";
    const marker = isToFinal ? "url(#arrow-purple)" : "url(#arrow-navy)";

    if (!p1 || !p2) return;

    // Self Loop
    if (from === to) {
      const loop = document.createElementNS("http://www.w3.org/2000/svg", "path");
      const startX = p1.x - 12;
      const startY = p1.y - 23;
      const endX = p1.x + 12;
      const endY = p1.y - 23;
      const c1x = p1.x - 36;
      const c1y = p1.y - 72;
      const c2x = p1.x + 36;
      const c2y = p1.y - 72;

      loop.setAttribute("d", `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
      loop.setAttribute("fill", "none");
      loop.setAttribute("stroke", strokeColor);
      loop.setAttribute("stroke-width", "2");
      loop.setAttribute("marker-end", marker);
      transGroup.appendChild(loop);

      // Label background & text
      const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
      txt.setAttribute("x", p1.x);
      txt.setAttribute("y", p1.y - 58);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("font-family", "monospace");
      txt.setAttribute("font-size", "13");
      txt.setAttribute("font-weight", "bold");
      txt.setAttribute("fill", strokeColor);
      txt.textContent = label;

      const pillW = Math.max(24, label.length * 10 + 10);
      bg.setAttribute("x", p1.x - pillW / 2);
      bg.setAttribute("y", p1.y - 70);
      bg.setAttribute("width", pillW);
      bg.setAttribute("height", "18");
      bg.setAttribute("fill", "#ffffff");
      bg.setAttribute("stroke", "#cbd5e1");
      bg.setAttribute("rx", "4");

      transGroup.appendChild(bg);
      transGroup.appendChild(txt);
      return;
    }

    // Edge between two distinct states
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const ux = dx / dist;
    const uy = dy / dist;
    const nx = -uy;
    const ny = ux;

    const reverseExists = !!grouped[`${to}->${from}`];
    let pathD = "";
    let lx = 0;
    let ly = 0;

    if (reverseExists) {
      // Curve both directions outward so they never collide
      const curvature = 34;
      const cx = (p1.x + p2.x) / 2 + nx * curvature;
      const cy = (p1.y + p2.y) / 2 + ny * curvature;

      const sx = p1.x + ux * stateRadius + nx * 4;
      const sy = p1.y + uy * stateRadius + ny * 4;
      const ex = p2.x - ux * (stateRadius + 3) + nx * 4;
      const ey = p2.y - uy * (stateRadius + 3) + ny * 4;

      pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
      lx = cx + nx * 5;
      ly = cy + ny * 5;
    } else {
      // Straight transition
      const sx = p1.x + ux * stateRadius;
      const sy = p1.y + uy * stateRadius;
      const ex = p2.x - ux * (stateRadius + 3);
      const ey = p2.y - uy * (stateRadius + 3);

      pathD = `M ${sx} ${sy} L ${ex} ${ey}`;
      lx = (sx + ex) / 2 + nx * 14;
      ly = (sy + ey) / 2 + ny * 14;
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathD);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", strokeColor);
    path.setAttribute("stroke-width", "2");
    path.setAttribute("marker-end", marker);
    transGroup.appendChild(path);

    // Label pill
    const pill = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    const pillW = Math.max(22, label.length * 10 + 10);
    pill.setAttribute("x", lx - pillW / 2);
    pill.setAttribute("y", ly - 9);
    pill.setAttribute("width", pillW);
    pill.setAttribute("height", "18");
    pill.setAttribute("fill", "#ffffff");
    pill.setAttribute("stroke", "#cbd5e1");
    pill.setAttribute("rx", "4");
    transGroup.appendChild(pill);

    const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
    txt.setAttribute("x", lx);
    txt.setAttribute("y", ly + 4);
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-family", "monospace");
    txt.setAttribute("font-size", "13");
    txt.setAttribute("font-weight", "bold");
    txt.setAttribute("fill", strokeColor);
    txt.textContent = label;
    transGroup.appendChild(txt);
  });

  svg.appendChild(transGroup);

  // States Layer
  const statesGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
  statesGroup.setAttribute("class", "states-layer");

  states.forEach((st) => {
    const pos = coords[st];
    if (!pos) return;

    const isStart = st === nfa.startState;
    const isFinal = st === nfa.finalState;

    // Incoming Start Arrow (from left)
    if (isStart) {
      const inArrow = document.createElementNS("http://www.w3.org/2000/svg", "line");
      inArrow.setAttribute("x1", pos.x - 52);
      inArrow.setAttribute("y1", pos.y);
      inArrow.setAttribute("x2", pos.x - stateRadius - 4);
      inArrow.setAttribute("y2", pos.y);
      inArrow.setAttribute("stroke", "#7c3aed");
      inArrow.setAttribute("stroke-width", "2.5");
      inArrow.setAttribute("marker-end", "url(#arrow-purple)");
      statesGroup.appendChild(inArrow);

      const inLabel = document.createElementNS("http://www.w3.org/2000/svg", "text");
      inLabel.setAttribute("x", pos.x - 58);
      inLabel.setAttribute("y", pos.y - 7);
      inLabel.setAttribute("font-family", "sans-serif");
      inLabel.setAttribute("font-size", "11");
      inLabel.setAttribute("font-weight", "800");
      inLabel.setAttribute("fill", "#7c3aed");
      inLabel.setAttribute("text-anchor", "middle");
      inLabel.textContent = "START";
      statesGroup.appendChild(inLabel);
    }

    // Outer Circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", pos.x);
    circle.setAttribute("cy", pos.y);
    circle.setAttribute("r", stateRadius);
    circle.setAttribute("fill", "#ffffff");
    circle.setAttribute("stroke", isStart ? "#7c3aed" : isFinal ? "#7e22ce" : "#0f172a");
    circle.setAttribute("stroke-width", isStart ? "2.5" : "2");
    statesGroup.appendChild(circle);

    // Double Ring for Final State F
    if (isFinal) {
      const innerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      innerCircle.setAttribute("cx", pos.x);
      innerCircle.setAttribute("cy", pos.y);
      innerCircle.setAttribute("r", stateRadius - 5);
      innerCircle.setAttribute("fill", "none");
      innerCircle.setAttribute("stroke", "#7e22ce");
      innerCircle.setAttribute("stroke-width", "1.75");
      statesGroup.appendChild(innerCircle);
    }

    // State Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", pos.x);
    text.setAttribute("y", pos.y + 5);
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("font-family", "monospace");
    text.setAttribute("font-size", "16");
    text.setAttribute("font-weight", "800");
    text.setAttribute("fill", isStart ? "#7c3aed" : isFinal ? "#7e22ce" : "#0f172a");
    text.textContent = st;
    statesGroup.appendChild(text);
  });

  svg.appendChild(statesGroup);
  container.appendChild(svg);
}

/**
 * Renders the Grammar -> Transition mapping trace cards.
 *
 * @param {object} nfa - Parsed NFA object
 */
function renderTrace(nfa) {
  const container = document.getElementById("traceContainer");
  if (!container) return;
  container.innerHTML = "";

  nfa.traceSteps.forEach((step) => {
    const card = document.createElement("div");
    card.className = "trace-card";
    card.innerHTML = `
      <div class="trace-grammar-box">${step.grammarRule}</div>
      <div class="trace-down-arrow">&darr;</div>
      <div class="trace-nfa-box">${step.nfaTransition}</div>
    `;
    container.appendChild(card);
  });
}

/**
 * Updates the 3-step top progress indicators:
 * 01 GRAMMAR -> 02 PARSER -> 03 NFA
 *
 * @param {number} activeStep - 1, 2, or 3
 */
function updateJourneyIndicator(activeStep) {
  const s1 = document.getElementById("stepIndicator1");
  const s2 = document.getElementById("stepIndicator2");
  const s3 = document.getElementById("stepIndicator3");
  const arr1 = document.getElementById("arrowJourney1");
  const arr2 = document.getElementById("arrowJourney2");

  if (!s1 || !s2 || !s3 || !arr1 || !arr2) return;

  [s1, s2, s3].forEach((s) => (s.className = "step-badge-item"));
  [arr1, arr2].forEach((a) => (a.className = "step-journey-arrow"));

  if (activeStep === 1) {
    s1.classList.add("active");
  } else if (activeStep === 2) {
    s1.classList.add("completed");
    arr1.classList.add("active");
    s2.classList.add("active");
  } else if (activeStep >= 3) {
    s1.classList.add("completed");
    arr1.classList.add("active");
    s2.classList.add("completed");
    arr2.classList.add("active");
    s3.classList.add("active");
  }
}

/**
 * Animates the 6 pipeline stages in Section 02.
 *
 * @param {Function} onComplete - Callback executed when animation completes
 */
function runParserPipelineAnimation(onComplete) {
  const stageIds = [
    "stageStep1",
    "stageStep2",
    "stageStep3",
    "stageStep4",
    "stageStep5",
    "stageStep6"
  ];

  const statusText = document.getElementById("pipelineStatusText");
  const banner = document.getElementById("conversionCompleteBanner");

  // Reset stage checks
  stageIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.className = "pipeline-step-item";
      const icon = el.querySelector(".step-check-icon");
      if (icon) icon.innerHTML = "&cir;";
    }
  });

  if (banner) banner.style.display = "none";
  if (statusText) statusText.textContent = "Analyzing grammar syntax...";

  let current = 0;
  const interval = setInterval(() => {
    if (current < stageIds.length) {
      const stepEl = document.getElementById(stageIds[current]);
      if (stepEl) {
        stepEl.classList.add("step-done");
        const icon = stepEl.querySelector(".step-check-icon");
        if (icon) icon.innerHTML = "&#10003;";
      }
      current++;
    } else {
      clearInterval(interval);
      if (banner) banner.style.display = "flex";
      if (statusText) statusText.textContent = "All 6 stages verified ✓";
      if (onComplete) onComplete();
    }
  }, 90);
}

/**
 * Main Controller:
 * Executed when the user clicks "⚡ Convert to NFA"
 */
function handleConvert() {
  const grammarInputEl = document.getElementById("grammarInput");
  const grammarInput = grammarInputEl ? grammarInputEl.value : "";
  const errorAlert = document.getElementById("errorAlert");
  const errorMsg = document.getElementById("errorMessage");
  const parserSection = document.getElementById("parserSection");
  const nfaSection = document.getElementById("nfaSection");

  // Hide previous errors and results
  if (errorAlert) errorAlert.style.display = "none";

  // 1. Parse & Validate
  const parsed = parseGrammar(grammarInput);

  if (!parsed.success) {
    if (parserSection) parserSection.style.display = "none";
    if (nfaSection) nfaSection.style.display = "none";
    if (errorMsg) errorMsg.textContent = parsed.error;
    if (errorAlert) {
      errorAlert.style.display = "flex";
      errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    updateJourneyIndicator(1);
    return;
  }

  // 2. Synthesize NFA metrics
  const metricStart = document.getElementById("metricStartState");
  const metricFinal = document.getElementById("metricFinalState");
  const metricStates = document.getElementById("metricAllStates");
  const metricSymbols = document.getElementById("metricAllSymbols");

  if (metricStart) metricStart.textContent = parsed.startState;
  if (metricFinal) metricFinal.textContent = parsed.finalState;
  if (metricStates) metricStates.textContent = parsed.allStates.join(", ");
  if (metricSymbols) metricSymbols.textContent = parsed.terminals.join(", ");

  // Render transition table, diagram, and trace
  renderTransitionTable(parsed);
  renderNFADiagram(parsed);
  renderTrace(parsed);

  // 3. Reveal Section 02 (Parser in Action)
  if (parserSection) {
    parserSection.style.display = "block";
    parserSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  updateJourneyIndicator(2);

  // 4. Run pipeline animation
  runParserPipelineAnimation(() => {
    // 5. Reveal Section 03 (Your NFA)
    if (nfaSection) {
      nfaSection.style.display = "block";
      nfaSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    updateJourneyIndicator(3);
  });
}

/**
 * Resets all sections back to initial state.
 */
function clearAll() {
  const grammarInput = document.getElementById("grammarInput");
  if (grammarInput) {
    grammarInput.value = "";
    grammarInput.focus();
  }

  const parserSection = document.getElementById("parserSection");
  const nfaSection = document.getElementById("nfaSection");
  const errorAlert = document.getElementById("errorAlert");
  const tableBody = document.getElementById("tableBody");
  const svgContainer = document.getElementById("svgContainer");
  const traceContainer = document.getElementById("traceContainer");

  if (parserSection) parserSection.style.display = "none";
  if (nfaSection) nfaSection.style.display = "none";
  if (errorAlert) errorAlert.style.display = "none";
  if (tableBody) tableBody.innerHTML = "";
  if (svgContainer) svgContainer.innerHTML = "";
  if (traceContainer) traceContainer.innerHTML = "";

  updateJourneyIndicator(1);
}

/**
 * Loads a specified preset grammar into the code editor without showing results
 * until user explicitly clicks "Convert to NFA".
 *
 * @param {string} presetKey - 'test1', 'test2', 'test3', or 'test4'
 */
function loadExample(presetKey = "test1") {
  const text = TEST_PRESETS[presetKey] || TEST_PRESETS.test1;
  const textarea = document.getElementById("grammarInput");
  if (textarea) {
    textarea.value = text;
    textarea.focus();
  }

  // Hide old results until user clicks Convert
  const parserSection = document.getElementById("parserSection");
  const nfaSection = document.getElementById("nfaSection");
  const errorAlert = document.getElementById("errorAlert");
  if (parserSection) parserSection.style.display = "none";
  if (nfaSection) nfaSection.style.display = "none";
  if (errorAlert) errorAlert.style.display = "none";
  updateJourneyIndicator(1);
}

// ============================================================================
// INITIALIZATION ON DOMContentLoaded (Ensures Vercel deployment reliability)
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Entry Page Navigation (Enter the Automata Lab ->)
  const enterLabButton = document.getElementById("enterLabButton") || document.getElementById("btnEnterLab");
  const landingPage = document.getElementById("landingPage") || document.getElementById("landingOverlay");
  const converterPage = document.getElementById("converterPage") || document.getElementById("appMainWrapper");

  if (enterLabButton && landingPage && converterPage) {
    enterLabButton.addEventListener("click", () => {
      landingPage.classList.add("hidden");
      converterPage.classList.remove("hidden");
      converterPage.scrollIntoView({ behavior: "smooth" });
    });
  }

  // 2. Back to Intro Navigation (<- Back to Intro)
  const backToIntroButton = document.getElementById("backToIntroButton") || document.getElementById("btnReturnToIntro");
  if (backToIntroButton && landingPage && converterPage) {
    backToIntroButton.addEventListener("click", () => {
      converterPage.classList.add("hidden");
      landingPage.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // 3. Convert Button
  const convertBtn = document.getElementById("convertBtn");
  if (convertBtn) {
    convertBtn.addEventListener("click", handleConvert);
  }

  // 4. Clear Button
  const clearBtn = document.getElementById("clearBtn");
  if (clearBtn) {
    clearBtn.addEventListener("click", clearAll);
  }

  // 5. Load Example Button
  const loadExampleBtn = document.getElementById("loadExampleBtn");
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener("click", () => loadExample("test1"));
  }

  // 6. Keyboard shortcut: Ctrl+Enter or Cmd+Enter to convert
  const grammarInput = document.getElementById("grammarInput");
  if (grammarInput) {
    grammarInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleConvert();
      }
    });
  }

  // Initially:
  // - Landing page is visible
  // - Converter page is hidden
  // - Parser and NFA results sections are hidden
  // - Textarea has the default example pre-loaded
  if (grammarInput && !grammarInput.value.trim()) {
    grammarInput.value = TEST_PRESETS.test1;
  }
});
