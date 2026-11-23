// =====================================================================
//  App: Terminal. The real CLI is moved into the window. Only one.
//  Its look comes from the desktop's theme (#term[data-os]).
// =====================================================================

registerApp('terminal', {
    open: openTerminalWindow,
    name: 'Terminal', names: { kali: 'QTerminal' },
    icon: ICONS.terminal,
});

// The first window holds the main terminal. Every one after that is a new
// terminal with its own login, folder and history, so the player can be on
// several machines at once.
function openTerminalWindow() {
    const existing = desk.terminalWin;
    if (existing && existing.isConnected && existing.classList.contains('minimized')) {
        existing.classList.remove('minimized');
        existing.style.zIndex = ++desk.z;
        useTerm(mainTerm);
        return input.focus();
    }
    if (existing && existing.isConnected) return openExtraTerminal();

    useTerm(mainTerm);
    const body = el('div', 'terminal-body');
    term.hidden = false;
    body.append(term);
    desk.terminalWin = createWindow(appName('terminal'), body, { width: 640, height: 380, app: 'terminal' });
    desk.terminalWin.addEventListener('mousedown', () => useTerm(mainTerm));

    // Closing the window hides the CLI again instead of removing it
    desk.terminalWin.querySelector('.win-close').onclick = () => {
        useTerm(mainTerm);
        term.hidden = true;
        box.prepend(term);
        desk.terminalWin.remove();
        desk.terminalWin = null;
    };
    updatePrompt();
    scrollDown();
    input.focus();
}

// Another terminal, logged in as the desktop's user
function openExtraTerminal() {
    const t = createTerm(desk.session);
    t.term.dataset.os = desk.theme;
    const body = el('div', 'terminal-body');
    body.append(t.term);
    t.win = createWindow(appName('terminal'), body, { width: 640, height: 380, app: 'terminal' });
    t.win.addEventListener('mousedown', () => useTerm(t));
    t.win.querySelector('.win-close').onclick = () => {
        t.win.remove();
        closeTerm(t);
    };
    useTerm(t);
    updatePrompt();
    input.focus();
}
