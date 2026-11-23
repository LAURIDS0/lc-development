// =====================================================================
//  Small helpers
// =====================================================================

// Lua sends a single value, a list or nothing. Always turn it into a list.
function toList(value) {
    if (value === undefined || value === null) return [];
    if (Array.isArray(value)) return value;
    return typeof value === 'object' ? Object.values(value) : [value];
}

// Is it a directory? (null doesn't count, even though typeof null is 'object' in JS)
function isDir(node) {
    return node !== null && typeof node === 'object';
}

// Does the object itself have this key? (so "constructor" etc. don't count as files)
function has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}

// Prints a line of text in the terminal.
// textContent is used (not innerHTML), so text never turns into HTML.
// An empty line gets a space, otherwise it takes up no height. Returns the line.
function print(text) {
    const div = document.createElement('div');
    div.textContent = text === '' ? ' ' : text;
    output.appendChild(div);
    return div;
}

// Prints lines one at a time with a delay (ping, nmap etc.).
// null in the list means "wait without printing". Input is disabled meanwhile.
function printSlow(lines, delay, done) {
    const t = activeTerm; // Keeps printing in this terminal, even if another one is used meanwhile
    input.disabled = true;
    let i = 0;
    const next = () => inTerm(t, () => {
        if (i < lines.length) {
            const line = lines[i++];
            if (line !== null) print(line);
            scrollDown();
            setTimeout(next, delay);
            return;
        }
        input.disabled = false;
        if (activeTerm === t) input.focus();
        updatePrompt();
        if (done) done();
    });
    next();
}

// Scrolls the CLI to the newest line.
function scrollDown() {
    term.scrollTop = term.scrollHeight;
}

// Sends a message to client/terminal.lua (RegisterNUICallback).
function post(name, data = {}) {
    fetch(`https://${GetParentResourceName()}/${name}`, { method: 'POST', body: JSON.stringify(data) });
}
