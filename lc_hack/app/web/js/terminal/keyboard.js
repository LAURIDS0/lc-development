// =====================================================================
//  Keyboard
// =====================================================================
// Keys in a terminal's input field. The terminal becomes the active one first.
function onTermKey(t, e) {
    useTerm(t);
    if (input.disabled) return; // The game is over, or a command is still running
    if (e.key === 'Enter') {
        const value = input.value;
        input.value = '';
        if (pending) {
            const p = pending;
            pending = null;
            input.type = 'text';
            print(p.label); // The password itself is never printed
            p.onValue(value);
        } else {
            run(value);
        }
        // Update the prompt (cd/ssh/su may have changed it), unless something is still running
        if (!pending && !input.disabled) updatePrompt();
        historyIndex = history.length;
        scrollDown();
    }

    if (e.key === 'Tab') {
        e.preventDefault(); // Otherwise Tab moves focus away from the input
        if (!pending) complete();
        scrollDown();
    }

    // Arrow keys: browse previous commands
    if (e.key === 'ArrowUp' && historyIndex > 0) {
        e.preventDefault();
        input.value = history[--historyIndex];
    }
    if (e.key === 'ArrowDown' && historyIndex < history.length) {
        e.preventDefault();
        input.value = history[++historyIndex] || '';
    }
}

// Connects a terminal's elements: typing, and clicking to focus it
function attachTerm(t) {
    t.input.addEventListener('keydown', (e) => onTermKey(t, e));
    t.term.addEventListener('mousedown', () => useTerm(t));
    t.term.addEventListener('click', () => t.input.focus());
}
attachTerm(mainTerm);

// Escape closes the terminal (counts as giving up).
document.addEventListener('keyup', (e) => {
    if (e.key === 'Escape') post('close');
});

