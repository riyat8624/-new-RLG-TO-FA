/**
 * ============================================================================
 * RLG → NFA Converter | Theory of Computation Digital Lab
 *
 * Algorithm Explanation for College Viva:
 * 1. Right-Linear Grammar (RLG):
 *    - All productions have the form: A → aB  or  A → a
 *    - Non-terminals represent States in the automaton.
 *    - Terminals represent Input Alphabet symbols.
 * 2. Start State (q0):
 *    - The left-hand side variable of the first production rule.
 * 3. Final State (F):
 *    - Created automatically for productions ending purely in a terminal (A → a).
 * 4. Transition Function δ(State, Symbol):
 *    - For A → aB :  δ(A, a) = B   [Transition: A --a--> B]
 *    - For A → a  :  δ(A, a) = F   [Transition: A --a--> F]
 * ============================================================================
 */

// Presets for quick lab testing
const TEST_PRESETS = {
  test1: `S → aA | b\nA → aS | b`,
  test2: `S → 0A | 1\nA → 0S | 1`,
  test3: `S → aA | bB\nA → a\nB → b`
};

/**
 * Validates an individual production alternative.
 * Expected formats for standard Right-Linear Grammar:
 * - A → aB (terminal followed by non-terminal)
 * - A → a  (terminal only)
 *
 * @param {string} lhs - Non-terminal on the LHS
 * @param {string} alt - Single RHS alternative
 * @param {number} lineNum - Line number for student error messages
 * @returns {object} Validation result
 */
function validateProduction(lhs, alt, lineNum) {
  const trimmed = alt.trim();

  if (!trimmed) {
    return {
      valid: false,
      error: `Line ${lineNum}: Empty alternative found in production for '${lhs}'.`
    };
  }

  // Handle single character RHS
  if (trimmed.length === 1) {
    const char = trimmed;
    // Disallow pure non-terminal (Unit production: A → B)
    if (char >= 'A' && char <= 'Z') {
      return {
        valid: false,
        error: `Invalid production on line ${lineNum}: '${lhs} → ${trimmed}'. Unit productions (A → B) are not permitted in standard Right-Linear Grammar. Expected format: A → aB or A → a.`
      };
    }
    // Terminal only: A → a (Transitions to accepting state F)
    return {
      valid: true,
      type: 'terminal_only',
      terminal: char,
      targetState: 'F',
      rawAlt: trimmed
    };
  }

  // Handle two-character RHS: Expected 'aB' (terminal followed by non-terminal)
  if (trimmed.length === 2) {
    const firstChar = trimmed[0];
    const secondChar = trimmed[1];

    const isFirstNonTerminal = firstChar >= 'A' && firstChar <= 'Z';
    const isSecondNonTerminal = secondChar >= 'A' && secondChar <= 'Z';

    // Case: A → aB
    if (!isFirstNonTerminal && isSecondNonTerminal) {
      return {
        valid: true,
        type: 'terminal_nonterminal',
        terminal: firstChar,
        targetState: secondChar,
        rawAlt: trimmed
      };
    }

    // Case: A → Ba (Left-Linear error notice)
    if (isFirstNonTerminal && !isSecondNonTerminal) {
      return {
        valid: false,
        error: `Invalid production on line ${lineNum}: '${lhs} → ${trimmed}'. This is Left-Linear (A → Ba). In Right-Linear Grammar, the terminal must come first (e.g. A → ${secondChar}${firstChar}).`
      };
    }

    // Case: A → BB (Two non-terminals) or A → ab (Two terminals)
    return {
      valid: false,
      error: `Invalid production on line ${lineNum}: '${lhs} → ${trimmed}'. Expected format: A → aB or A → a.`
    };
  }

  // Any RHS longer than 2 (e.g. aBC, abc, etc.)
  return {
    valid: false,
    error: `Invalid production on line ${lineNum}: '${lhs} → ${trimmed}'. Expected format: A → aB or A → a.`
  };
}

/**
 * Parses the raw grammar input from the code editor.
 * Supports:
 * - Arrows: both '->' and unicode '→'
 * - Alternative splitting with '|'
 * - Whitespace tolerance
 * - Start state discovery
 *
 * @param {string} text - Raw grammar input
 * @returns {object} Parsed data or error object
 */
function parseGrammar(text) {
  if (!text || !text.trim()) {
    return {
      success: false,
      error: 'Please enter a grammar first.'
    };
  }

  const lines = text.split('\n');
  const parsedProductions = [];
  const nonTerminals = new Set();
  const terminals = new Set();
  let startState = null;
  let hasTerminalOnly = false;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    const lineNum = i + 1;

    // Skip empty lines and comment lines
    if (!rawLine || rawLine.startsWith('//') || rawLine.startsWith('#')) {
      continue;
    }

    // Normalize arrow delimiter ('->' or '→')
    let arrow = '->';
    if (!rawLine.includes('->')) {
      if (rawLine.includes('→')) {
        arrow = '→';
      } else {
        return {
          success: false,
          error: `Missing production arrow ('->' or '→') on line ${lineNum}: "${rawLine}"`
        };
      }
    }

    const sides = rawLine.split(arrow);
    if (sides.length !== 2) {
      return {
        success: false,
        error: `Line ${lineNum} contains multiple arrow symbols: "${rawLine}"`
      };
    }

    const lhs = sides[0].trim();
    const rhs = sides[1].trim();

    // Validate Left-Hand Side (single uppercase variable)
    if (!lhs) {
      return {
        success: false,
        error: `Missing Left-Hand Side non-terminal on line ${lineNum}.`
      };
    }

    if (!/^[A-Z][0-9]?$/.test(lhs)) {
      return {
        success: false,
        error: `Invalid Left-Hand Side '${lhs}' on line ${lineNum}. Non-terminals must be uppercase letters (e.g. S, A, B).`
      };
    }

    // First LHS non-terminal becomes the start state
    if (!startState) {
      startState = lhs;
    }
    nonTerminals.add(lhs);

    // Split multiple alternatives using '|'
    const alternatives = rhs.split('|');
    if (alternatives.length === 0 || (alternatives.length === 1 && !alternatives[0].trim())) {
      return {
        success: false,
        error: `Missing right-hand side alternatives on line ${lineNum} for '${lhs}'.`
      };
    }

    for (let alt of alternatives) {
      const result = validateProduction(lhs, alt, lineNum);
      if (!result.valid) {
        return {
          success: false,
          error: result.error
        };
      }

      terminals.add(result.terminal);
      if (result.type === 'terminal_nonterminal') {
        nonTerminals.add(result.targetState);
      } else if (result.type === 'terminal_only') {
        hasTerminalOnly = true;
      }

      parsedProductions.push({
        lhs: lhs,
        terminal: result.terminal,
        type: result.type,
        targetState: result.targetState,
        rawAlt: result.rawAlt,
        fullProduction: `${lhs} → ${result.rawAlt}`
      });
    }
  }

  if (parsedProductions.length === 0) {
    return {
      success: false,
      error: 'Please enter at least one valid Right-Linear Grammar production.'
    };
  }

  return {
    success: true,
    startState: startState,
    hasTerminalOnly: hasTerminalOnly,
    nonTerminals: Array.from(nonTerminals),
    terminals: Array.from(terminals),
    productions: parsedProductions
  };
}

/**
 * Converts parsed grammar into formal NFA transitions.
 *
 * @param {object} parsed - Parsed grammar
 * @returns {object} NFA representation
 */
function convertToNFA(parsed) {
  const finalState = 'F';
  const transitions = [];
  const traceSteps = [];

  for (let prod of parsed.productions) {
    let toState = prod.targetState;

    if (prod.type === 'terminal_only') {
      toState = finalState;
    }

    transitions.push({
      from: prod.lhs,
      symbol: prod.terminal,
      to: toState,
      originalRule: prod.fullProduction
    });

    traceSteps.push({
      grammarRule: prod.fullProduction,
      nfaTransition: `${prod.lhs} --${prod.terminal}--> ${toState}`,
      deltaNotation: `δ(${prod.lhs}, ${prod.terminal}) = { ${toState} }`
    });
  }

  // Collect all states in natural order: Start state first, others sorted, F last
  const stateSet = new Set(parsed.nonTerminals);
  if (parsed.hasTerminalOnly || transitions.some(t => t.to === finalState)) {
    stateSet.add(finalState);
  }

  const allStates = Array.from(stateSet).sort((a, b) => {
    if (a === parsed.startState) return -1;
    if (b === parsed.startState) return 1;
    if (a === finalState) return 1;
    if (b === finalState) return -1;
    return a.localeCompare(b);
  });

  return {
    startState: parsed.startState,
    finalState: finalState,
    allStates: allStates,
    terminals: parsed.terminals.sort(),
    transitions: transitions,
    traceSteps: traceSteps
  };
}

/**
 * Populates the NFA Transition Table.
 *
 * @param {object} nfa - NFA object
 */
function renderTransitionTable(nfa) {
  const tableBody = document.getElementById('tableBody');
  tableBody.innerHTML = '';

  // Sort transitions for clean presentation
  const sorted = [...nfa.transitions].sort((a, b) => {
    if (a.from !== b.from) {
      if (a.from === nfa.startState) return -1;
      if (b.from === nfa.startState) return 1;
      return a.from.localeCompare(b.from);
    }
    return a.symbol.localeCompare(b.symbol);
  });

  sorted.forEach((t) => {
    const row = document.createElement('tr');
    const isToFinal = t.to === nfa.finalState;
    const isFromStart = t.from === nfa.startState;

    row.innerHTML = `
      <td>
        <span class="state-tag">${t.from}</span>
        ${isFromStart ? '<span style="font-size:0.75rem; color:#7c3aed; font-weight:bold; margin-left:4px;">(Start)</span>' : ''}
      </td>
      <td>
        <span class="symbol-tag">${t.symbol}</span>
      </td>
      <td>
        <span class="state-tag ${isToFinal ? 'final-state-tag' : ''}">${t.to}</span>
        ${isToFinal ? '<span style="font-size:0.75rem; color:#7e22ce; font-weight:bold; margin-left:4px;">(Final)</span>' : ''}
      </td>
    `;
    tableBody.appendChild(row);
  });
}

/**
 * Generates an SVG Diagram of the NFA.
 * Handles:
 * - Start state marked with incoming arrow from left
 * - Final state marked with double circle
 * - Self loops
 * - Bidirectional curved transitions (opposing arrows curved to avoid collisions)
 * - Bundling multiple inputs between same state pair
 *
 * @param {object} nfa - NFA object
 */
function renderNFADiagram(nfa) {
  const container = document.getElementById('svgContainer');
  container.innerHTML = '';

  const states = nfa.allStates;
  const numStates = states.length;
  const width = Math.max(640, numStates * 150);
  const height = 330;
  const stateRadius = 26;

  // Calculate layout coordinates for states
  const coords = {};
  if (numStates === 2) {
    coords[states[0]] = { x: 200, y: 165 };
    coords[states[1]] = { x: 440, y: 165 };
  } else if (numStates === 3) {
    coords[states[0]] = { x: 150, y: 165 };
    coords[states[1]] = { x: 320, y: 165 };
    coords[states[2]] = { x: 490, y: 165 };
  } else if (numStates === 4) {
    coords[states[0]] = { x: 120, y: 165 }; // Start
    coords[states[1]] = { x: 290, y: 90 };  // Intermediate 1
    coords[states[2]] = { x: 290, y: 240 }; // Intermediate 2
    coords[states[3]] = { x: 500, y: 165 }; // Final
  } else {
    // Ring distribution for 5+ states
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

  // Group transitions by state pair (from -> to)
  const grouped = {};
  nfa.transitions.forEach(t => {
    const key = `${t.from}->${t.to}`;
    if (!grouped[key]) {
      grouped[key] = { from: t.from, to: t.to, symbols: [] };
    }
    if (!grouped[key].symbols.includes(t.symbol)) {
      grouped[key].symbols.push(t.symbol);
    }
  });

  // Create SVG element
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'svg-nfa-graph');
  svg.setAttribute('width', '100%');
  svg.setAttribute('style', `max-width: ${width}px; height: auto;`);

  // Defs: Markers for arrowheads
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
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

  // Transitions layer
  const transGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  transGroup.setAttribute('class', 'transitions-layer');

  Object.values(grouped).forEach(group => {
    const { from, to, symbols } = group;
    const p1 = coords[from];
    const p2 = coords[to];
    const label = symbols.join(', ');
    const isToFinal = to === nfa.finalState;
    const strokeColor = isToFinal ? '#7c3aed' : '#0f172a';
    const marker = isToFinal ? 'url(#arrow-purple)' : 'url(#arrow-navy)';

    if (!p1 || !p2) return;

    // Self Loop
    if (from === to) {
      const loop = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const startX = p1.x - 12;
      const startY = p1.y - 23;
      const endX = p1.x + 12;
      const endY = p1.y - 23;
      const c1x = p1.x - 38;
      const c1y = p1.y - 75;
      const c2x = p1.x + 38;
      const c2y = p1.y - 75;

      loop.setAttribute('d', `M ${startX} ${startY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${endX} ${endY}`);
      loop.setAttribute('fill', 'none');
      loop.setAttribute('stroke', strokeColor);
      loop.setAttribute('stroke-width', '2');
      loop.setAttribute('marker-end', marker);
      transGroup.appendChild(loop);

      // Label background & text
      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', p1.x);
      txt.setAttribute('y', p1.y - 60);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('font-family', 'monospace');
      txt.setAttribute('font-size', '13');
      txt.setAttribute('font-weight', 'bold');
      txt.setAttribute('fill', strokeColor);
      txt.textContent = label;

      bg.setAttribute('x', p1.x - 14);
      bg.setAttribute('y', p1.y - 72);
      bg.setAttribute('width', '28');
      bg.setAttribute('height', '16');
      bg.setAttribute('fill', '#ffffff');
      bg.setAttribute('rx', '3');

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
    let pathD = '';
    let lx = 0;
    let ly = 0;

    if (reverseExists) {
      // Curve both sides outward to prevent overlap
      const curvature = 36;
      const cx = (p1.x + p2.x) / 2 + nx * curvature;
      const cy = (p1.y + p2.y) / 2 + ny * curvature;

      const sx = p1.x + ux * stateRadius + nx * 5;
      const sy = p1.y + uy * stateRadius + ny * 5;
      const ex = p2.x - ux * (stateRadius + 3) + nx * 5;
      const ey = p2.y - uy * (stateRadius + 3) + ny * 5;

      pathD = `M ${sx} ${sy} Q ${cx} ${cy} ${ex} ${ey}`;
      lx = cx + nx * 6;
      ly = cy + ny * 6;
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

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathD);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', strokeColor);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', marker);
    transGroup.appendChild(path);

    // Label pill
    const pill = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    const pillW = Math.max(22, label.length * 10 + 10);
    pill.setAttribute('x', lx - pillW / 2);
    pill.setAttribute('y', ly - 9);
    pill.setAttribute('width', pillW);
    pill.setAttribute('height', '18');
    pill.setAttribute('fill', '#ffffff');
    pill.setAttribute('stroke', '#e2e8f0');
    pill.setAttribute('rx', '4');
    transGroup.appendChild(pill);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', lx);
    txt.setAttribute('y', ly + 4);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('font-family', 'monospace');
    txt.setAttribute('font-size', '13');
    txt.setAttribute('font-weight', 'bold');
    txt.setAttribute('fill', strokeColor);
    txt.textContent = label;
    transGroup.appendChild(txt);
  });

  svg.appendChild(transGroup);

  // States layer
  const statesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  statesGroup.setAttribute('class', 'states-layer');

  states.forEach(st => {
    const pos = coords[st];
    if (!pos) return;

    const isStart = st === nfa.startState;
    const isFinal = st === nfa.finalState;

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

    // Incoming Start Arrow
    if (isStart) {
      const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const startX = pos.x - 65;
      const targetX = pos.x - stateRadius - 3;
      arrow.setAttribute('d', `M ${startX} ${pos.y} L ${targetX} ${pos.y}`);
      arrow.setAttribute('stroke', '#7c3aed');
      arrow.setAttribute('stroke-width', '2.5');
      arrow.setAttribute('marker-end', 'url(#arrow-purple)');
      g.appendChild(arrow);

      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', pos.x - 50);
      label.setAttribute('y', pos.y - 8);
      label.setAttribute('font-family', 'sans-serif');
      label.setAttribute('font-size', '12');
      label.setAttribute('font-weight', 'bold');
      label.setAttribute('fill', '#7c3aed');
      label.textContent = 'start';
      g.appendChild(label);
    }

    // Outer Circle
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', pos.x);
    outer.setAttribute('cy', pos.y);
    outer.setAttribute('r', stateRadius);

    if (isFinal) {
      outer.setAttribute('fill', '#faf5ff');
      outer.setAttribute('stroke', '#7e22ce');
      outer.setAttribute('stroke-width', '2.5');
      g.appendChild(outer);

      // Inner Circle (Automata standard double-ring for accepting state)
      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('cx', pos.x);
      inner.setAttribute('cy', pos.y);
      inner.setAttribute('r', stateRadius - 5);
      inner.setAttribute('fill', 'none');
      inner.setAttribute('stroke', '#7e22ce');
      inner.setAttribute('stroke-width', '1.8');
      g.appendChild(inner);
    } else {
      outer.setAttribute('fill', '#ffffff');
      outer.setAttribute('stroke', isStart ? '#7c3aed' : '#0f172a');
      outer.setAttribute('stroke-width', '2.5');
      g.appendChild(outer);
    }

    // State Name Label
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', pos.x);
    text.setAttribute('y', pos.y + 6);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('font-family', 'monospace');
    text.setAttribute('font-size', '16');
    text.setAttribute('font-weight', '800');
    text.setAttribute('fill', isFinal ? '#7e22ce' : '#0f172a');
    text.textContent = st;
    g.appendChild(text);

    statesGroup.appendChild(g);
  });

  svg.appendChild(statesGroup);
  container.appendChild(svg);
}

/**
 * Populates the Grammar → Transition Trace card grid.
 *
 * @param {object} nfa - NFA object
 */
function renderTrace(nfa) {
  const container = document.getElementById('traceContainer');
  container.innerHTML = '';

  nfa.traceSteps.forEach(step => {
    const card = document.createElement('div');
    card.className = 'trace-card';

    card.innerHTML = `
      <div class="trace-grammar-box">${step.grammarRule}</div>
      <div class="trace-down-arrow">&darr;</div>
      <div class="trace-nfa-box">${step.nfaTransition}</div>
    `;
    container.appendChild(card);
  });
}

/**
 * Updates the 3-step progress journey in the top navigation.
 * Steps: 1 = Grammar, 2 = Parser, 3 = NFA
 *
 * @param {number} currentStep - Active step (1, 2, or 3)
 */
function updateJourneyIndicator(currentStep) {
  const s1 = document.getElementById('stepIndicator1');
  const s2 = document.getElementById('stepIndicator2');
  const s3 = document.getElementById('stepIndicator3');
  const arr1 = document.getElementById('arrowJourney1');
  const arr2 = document.getElementById('arrowJourney2');

  // Reset all
  [s1, s2, s3].forEach(el => el.className = 'step-badge-item');
  [arr1, arr2].forEach(el => el.classList.remove('active'));

  if (currentStep === 1) {
    s1.classList.add('active');
  } else if (currentStep === 2) {
    s1.classList.add('completed');
    arr1.classList.add('active');
    s2.classList.add('active');
  } else if (currentStep === 3) {
    s1.classList.add('completed');
    arr1.classList.add('active');
    s2.classList.add('completed');
    arr2.classList.add('active');
    s3.classList.add('active');
  }
}

/**
 * Animates the 6 pipeline stages in Section 02.
 *
 * @param {Function} onComplete - Callback executed once animation concludes
 */
function runParserPipelineAnimation(onComplete) {
  const stageIds = [
    'stageStep1',
    'stageStep2',
    'stageStep3',
    'stageStep4',
    'stageStep5',
    'stageStep6'
  ];

  const statusText = document.getElementById('pipelineStatusText');
  const banner = document.getElementById('conversionCompleteBanner');

  // Reset stage checks
  stageIds.forEach(id => {
    const el = document.getElementById(id);
    el.className = 'pipeline-step-item';
    el.querySelector('.step-check-icon').innerHTML = '&cir;';
  });
  banner.style.display = 'none';
  statusText.textContent = 'Analyzing grammar syntax...';

  let current = 0;
  const interval = setInterval(() => {
    if (current < stageIds.length) {
      const stepEl = document.getElementById(stageIds[current]);
      stepEl.classList.add('step-done');
      stepEl.querySelector('.step-check-icon').innerHTML = '&#10003;';
      current++;
    } else {
      clearInterval(interval);
      banner.style.display = 'flex';
      statusText.textContent = 'All 6 stages verified ✓';
      if (onComplete) onComplete();
    }
  }, 100);
}

/**
 * Main Controller:
 * Executed when user clicks "⚡ Convert to NFA"
 */
function handleConvert() {
  const grammarInput = document.getElementById('grammarInput').value;
  const errorAlert = document.getElementById('errorAlert');
  const errorMsg = document.getElementById('errorMessage');
  const parserSection = document.getElementById('parserSection');
  const nfaSection = document.getElementById('nfaSection');

  // Hide previous errors
  errorAlert.style.display = 'none';

  // 1. Parse & Validate
  const parsed = parseGrammar(grammarInput);

  if (!parsed.success) {
    parserSection.style.display = 'none';
    nfaSection.style.display = 'none';
    errorMsg.textContent = parsed.error;
    errorAlert.style.display = 'flex';
    updateJourneyIndicator(1);
    errorAlert.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // 2. Synthesize NFA
  const nfa = convertToNFA(parsed);

  // Update Section 03 summary metrics immediately
  document.getElementById('metricStartState').textContent = nfa.startState;
  document.getElementById('metricFinalState').textContent = nfa.finalState;
  document.getElementById('metricAllStates').textContent = nfa.allStates.join(', ');
  document.getElementById('metricAllSymbols').textContent = nfa.terminals.join(', ');

  // Render Section 03 output components
  renderTransitionTable(nfa);
  renderNFADiagram(nfa);
  renderTrace(nfa);

  // 3. Reveal Section 02 (Parser in Action)
  parserSection.style.display = 'block';
  updateJourneyIndicator(2);
  parserSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // 4. Run step-by-step pipeline animation
  runParserPipelineAnimation(() => {
    // 5. Reveal Section 03 (Your NFA)
    nfaSection.style.display = 'block';
    updateJourneyIndicator(3);
    nfaSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}

/**
 * Resets all sections back to initial state.
 */
function clearAll() {
  document.getElementById('grammarInput').value = '';
  document.getElementById('parserSection').style.display = 'none';
  document.getElementById('nfaSection').style.display = 'none';
  document.getElementById('errorAlert').style.display = 'none';
  document.getElementById('tableBody').innerHTML = '';
  document.getElementById('svgContainer').innerHTML = '';
  document.getElementById('traceContainer').innerHTML = '';
  updateJourneyIndicator(1);
  document.getElementById('grammarInput').focus();
}

/**
 * Loads a specified preset grammar into the code editor.
 *
 * @param {string} presetKey - 'test1', 'test2', or 'test3'
 */
function loadExample(presetKey = 'test1') {
  const text = TEST_PRESETS[presetKey] || TEST_PRESETS.test1;
  const textarea = document.getElementById('grammarInput');
  textarea.value = text;
  textarea.focus();

  // Automatically trigger conversion
  handleConvert();
}

// Initial setup on page load
document.addEventListener('DOMContentLoaded', () => {
  // Enter the Lab from Landing Page
  const btnEnterLab = document.getElementById('btnEnterLab');
  const landingOverlay = document.getElementById('landingOverlay');
  if (btnEnterLab && landingOverlay) {
    btnEnterLab.addEventListener('click', () => {
      landingOverlay.classList.add('landing-exit');
      setTimeout(() => {
        landingOverlay.style.display = 'none';
        const grammarSection = document.getElementById('grammarInputSection');
        if (grammarSection) {
          grammarSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        const grammarInput = document.getElementById('grammarInput');
        if (grammarInput) {
          grammarInput.focus();
        }
      }, 550);
    });
  }

  // Return to Intro Page
  const btnReturnToIntro = document.getElementById('btnReturnToIntro');
  if (btnReturnToIntro && landingOverlay) {
    btnReturnToIntro.addEventListener('click', () => {
      landingOverlay.style.display = 'flex';
      // Force reflow
      void landingOverlay.offsetWidth;
      landingOverlay.classList.remove('landing-exit');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Convert Button
  const convertBtn = document.getElementById('convertBtn');
  if (convertBtn) {
    convertBtn.addEventListener('click', handleConvert);
  }

  // Clear Button
  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearAll);
  }

  // Load Example Button
  const loadExampleBtn = document.getElementById('loadExampleBtn');
  if (loadExampleBtn) {
    loadExampleBtn.addEventListener('click', () => loadExample('test1'));
  }

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to convert
  const grammarInput = document.getElementById('grammarInput');
  if (grammarInput) {
    grammarInput.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleConvert();
      }
    });
  }

  // Load default test preset 1 for immediate lab demonstration
  loadExample('test1');
});
