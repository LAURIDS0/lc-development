// =====================================================================
//  Tab completion
//  The first word completes commands, the rest complete files and directories.
// =====================================================================

// Finds the longest common prefix, e.g. ["Documents/", "Downloads/"] -> "Do"
function commonPrefix(list) {
    let prefix = list[0];
    for (const s of list) while (!s.startsWith(prefix)) prefix = prefix.slice(0, -1);
    return prefix;
}

function complete() {
    const words = input.value.split(' ');
    const word = words.pop(); // The word being typed
    let options;

    if (words.length === 0) {
        // First word: match commands
        options = [...Object.keys(commands), ...serverCommands].filter(c => c.startsWith(word)).map(c => c + ' ');
    } else {
        // Otherwise: match files in the directory the word points to, e.g. "Doc" or "/etc/pa"
        const slash = word.lastIndexOf('/');
        const dirPart = word.slice(0, slash + 1);  // "/etc/"
        const namePart = word.slice(slash + 1);    // "pa"
        const dir = getNode(resolve(dirPart || '.'));
        if (!isDir(dir)) return;
        options = Object.keys(dir)
            .filter(n => n.startsWith(namePart))
            .filter(n => namePart.startsWith('.') || !n.startsWith('.')) // Hidden files only when typing "."
            .map(n => dirPart + n + (isDir(dir[n]) ? '/' : ' '));
    }

    if (options.length === 0) return;
    if (options.length > 1) {
        // Several options: list them all, like Linux does on double Tab
        print(prompt.textContent + input.value);
        print(options.map(o => o.trim().split('/').filter(Boolean).pop() + (o.endsWith('/') ? '/' : '')).join('  '));
    }
    input.value = [...words, options.length === 1 ? options[0] : commonPrefix(options)].join(' ');
}
