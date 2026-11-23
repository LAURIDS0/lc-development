// =====================================================================
//  Several terminals
//  Every terminal window has its own logins, folder, history and
//  password prompt. The globals the rest of the code uses (term, output,
//  prompt, input, sessions, session, history, historyIndex, pending)
//  always belong to the active terminal; useTerm switches them.
//  Anything that finishes later (ping, nmap, password checks, server
//  commands) runs in the terminal it started in, with inTerm.
// =====================================================================

const mainTerm = { main: true, term, output, prompt, input, sessions: [], session: null, history: [], historyIndex: 0, pending: null };
let terminals = [mainTerm];
let activeTerm = mainTerm;

// Loads a terminal's state into the globals
function loadTerm(t) {
    activeTerm = t;
    ({ term, output, prompt, input, sessions, session, history, historyIndex, pending } = t);
}

// Makes a terminal the active one, keeping the state of the one before
function useTerm(t) {
    if (activeTerm === t) return;
    Object.assign(activeTerm, { sessions, session, history, historyIndex, pending });
    loadTerm(t);
}

// Runs fn in a terminal, then goes back to the one that was active. Nothing if it was closed.
function inTerm(t, fn) {
    if (!terminals.includes(t)) return;
    const previous = activeTerm;
    useTerm(t);
    try {
        return fn();
    } finally {
        if (terminals.includes(previous)) useTerm(previous);
    }
}

// A new terminal, logged in like `from` (the desktop's login), in its home folder
function createTerm(from) {
    const t = { main: false, sessions: [], history: [], historyIndex: 0, pending: null };
    t.term = el('div', 'term');
    t.output = el('div', 'output');
    const line = el('div', 'line');
    t.prompt = el('span', 'prompt');
    t.input = el('input', 'input');
    t.input.autocomplete = 'off';
    t.input.spellcheck = false;
    line.append(t.prompt, t.input);
    t.term.append(t.output, line);
    t.session = { ...from, cwd: [...from.home] };
    t.sessions = [t.session];
    terminals.push(t);
    attachTerm(t);
    return t;
}

// Closes a terminal (never the main one). Its window is removed by the caller.
function closeTerm(t) {
    if (t.main || !terminals.includes(t)) return;
    terminals = terminals.filter(x => x !== t);
    if (activeTerm === t) loadTerm(mainTerm);
}

// Closes every terminal but the main one (the desktop closes, or a new hack starts)
function closeExtraTerms() {
    for (const t of terminals.filter(x => !x.main)) {
        if (t.win) t.win.remove();
        closeTerm(t);
    }
}
