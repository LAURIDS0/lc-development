// =====================================================================
//  Saved state per terminal
//  Closing a terminal pauses it: everything is saved here and restored
//  when the player uses the same terminal again. The server tells us to
//  forget it (discard) once the player walks too far away.
// =====================================================================
const saved = {};             // terminal id -> saved state
let currentTerminal = null;   // The terminal the open hack came from (null for startHack)
let finished = false;         // The hack was won or lost, nothing to save

function saveState() {
    const deskIndex = desk ? sessions.indexOf(desk.session) : -1;
    saved[currentTerminal] = {
        machines, target, sessions, history, serverCommands,
        output: output.innerHTML,
        desktop: deskIndex >= 0 ? {
            index: deskIndex,
            remote: desk.remote,
            terminalOpen: !!(desk.terminalWin && desk.terminalWin.isConnected),
        } : null,
    };
}

function restoreState(state) {
    machines = state.machines;
    target = state.target;
    serverCommands = state.serverCommands || [];
    sessions = state.sessions;
    session = sessions[sessions.length - 1];
    history = state.history;
    output.innerHTML = state.output;
    box.style.display = 'block';
    updatePrompt();
    if (state.desktop) {
        openDesktop(sessions[state.desktop.index], state.desktop.remote);
        if (state.desktop.terminalOpen) openTerminalWindow();
    }
    scrollDown();
}
