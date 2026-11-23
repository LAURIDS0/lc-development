// =====================================================================
//  Running commands
// =====================================================================

// Runs a command from a list of words: the first word is the command, the rest are arguments.
function runCommand([name, ...args]) {
    if (serverCommands.includes(name)) runServerCommand(name, args);
    else if (has(commands, name)) commands[name](args);
    else print(`${name}: command not found`);
}

// A command from config.commands: the server runs it and sends back the lines to print
function runServerCommand(name, args) {
    const t = activeTerm;
    input.disabled = true;
    fetch(`https://${GetParentResourceName()}/command`, { method: 'POST', body: JSON.stringify({ name, args }) })
        .then(res => res.json())
        .then(lines => inTerm(t, () => printSlow(toList(lines), 40)))
        .catch(() => inTerm(t, () => printSlow([`${name}: connection to the server failed`], 0)));
}

// Runs a full line typed by the player.
function run(line) {
    // Echo the command with the prompt (and its colors), like a real terminal.
    const echo = print(line);
    echo.prepend(...[...prompt.childNodes].map(n => n.cloneNode(true)));

    const words = line.trim().split(/\s+/);
    if (!words[0]) return; // An empty line does nothing
    history.push(line.trim());
    runCommand(words);
}
