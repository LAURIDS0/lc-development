// =====================================================================
//  Passwords and win/loss
// =====================================================================

// Passwords ONLY live on the server. The client only knows whether a machine has one.
// Every attempt is sent to the server, which also counts attempts and decides the outcome.

// Asks for a password and passes it to onValue. If no prompt is needed, onValue gets ''.
function askPassword(label, needPrompt, onValue) {
    if (!needPrompt) return onValue('');
    pending = { label, onValue };
    input.type = 'password';     // Hides what is typed
    prompt.textContent = label;
}

// Asks the server whether a password is correct.
//   kind = 'login' (ssh/rdp) or 'root' (su/sudo)
//   onSuccess runs on a correct password, fail is the text shown on a wrong one.
function verify(machine, kind, user, value, onSuccess, fail) {
    const t = activeTerm; // The answer goes to this terminal
    input.disabled = true; // No typing while the server answers
    fetch(`https://${GetParentResourceName()}/verify`, {
        method: 'POST',
        body: JSON.stringify({ machine: machine.index, kind, user, value }),
    })
        .then(res => res.json())
        .then(res => inTerm(t, () => {
            input.disabled = false;
            if (res.win) return finish(true);   // Root on the target machine
            if (res.ok) {
                onSuccess();
            } else {
                print(fail);
                if (res.lost) return finish(false); // No attempts left
                print(`(${res.attempts} attempts left)`);
            }
            if (!input.disabled) { // onSuccess may have started something that is still running
                updatePrompt();
                input.focus();
            }
            scrollDown();
        }))
        .catch(() => inTerm(t, () => {
            input.disabled = false;
            print('Connection to the server failed.');
            updatePrompt();
        }));
}

// Shows the result and closes the terminal. The server has already decided it.
function finish(success) {
    print(success
        ? `root@${target.host}: access granted. Target reached.`
        : 'Too many failed attempts. ACCESS DENIED. Closing connection.');
    input.disabled = true;
    prompt.textContent = '';
    scrollDown();
    finished = true; // Nothing to resume after a win or a loss
    if (currentTerminal !== null) delete saved[currentTerminal];
    setTimeout(() => post('close'), 2000); // Short pause so the player can read it
}
