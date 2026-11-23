// =====================================================================
//  The prompt in front of the input
//  Each machine's shell decides it, so ssh from a Mac to a Linux server
//  changes the prompt too. Machines without a desktop use bash.
//  Colors come from the terminal theme (css/desktop/themes).
// =====================================================================

// Last part of a path, like zsh's %1~ and bash's \W:  ~/Documents/old -> old
function shortDir(dir) {
    return dir === '~' || dir === '/' ? dir : dir.split('/').pop();
}

// Each prompt is a list of [text, class]. end = "$" or "#" (root).
const PROMPTS = {
    // user@host:~/Documents$
    bash: (s, dir, end) => [[`${s.user}@${s.machine.host}`, 'p-user'], [':'], [dir, 'p-path'], [end + ' ']],
    // zsh: user@host Documents %
    macos: (s, dir, end) => [[`${s.user}@${s.machine.host} ${shortDir(dir)} ${end === '#' ? '#' : '%'} `]],
    // Kali zsh, two lines:  ┌──(user㉿host)-[~/Documents]
    //                       └─$
    kali: (s, dir, end) => [
        ['┌──(', 'p-frame'], [`${s.user}㉿${s.machine.host}`, 'p-user'], [')-[', 'p-frame'], [dir, 'p-path'],
        [']\n└─', 'p-frame'], [end, 'p-user'], [' '],
    ],
    // [user@host Documents]$
    fedora: (s, dir, end) => [[`[${s.user}@${s.machine.host} ${shortDir(dir)}]${end} `]],
};

// Updates the prompt, e.g. "jens@workstation:~/Documents$ ". Root gets "#", like on Linux.
function updatePrompt() {
    if (!session) return;
    const make = PROMPTS[session.machine.desktop] || PROMPTS.bash;
    const parts = make(session, pathToString(session.cwd), session.root ? '#' : '$');
    prompt.replaceChildren(...parts.map(([text, className]) => {
        const span = document.createElement('span');
        if (className) span.className = className;
        span.textContent = text;
        return span;
    }));
    prompt.classList.toggle('root', session.root);
}
