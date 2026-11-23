// =====================================================================
//  The operating system of a machine
//  Decided by its desktop; machines without a desktop are Ubuntu
//  servers. Used by the default files, uname and the ssh banner.
// =====================================================================

const OS = {
    ubuntu: {
        id: 'ubuntu', name: 'Ubuntu', version: '22.04.3 LTS (Jammy Jellyfish)', pretty: 'Ubuntu 22.04.3 LTS',
        codename: 'jammy', kernel: '5.15.0-91-generic', build: '#101-Ubuntu SMP', family: 'debian',
    },
    kali: {
        id: 'kali', name: 'Kali GNU/Linux', version: '2024.4', pretty: 'Kali GNU/Linux Rolling',
        codename: 'kali-rolling', kernel: '6.11.2-amd64', build: '#1 SMP PREEMPT_DYNAMIC Kali 6.11.2-1kali1', family: 'debian',
    },
    mint: {
        id: 'linuxmint', name: 'Linux Mint', version: '21.3 (Virginia)', pretty: 'Linux Mint 21.3',
        codename: 'virginia', kernel: '5.15.0-92-generic', build: '#102-Ubuntu SMP', family: 'debian',
    },
    fedora: {
        id: 'fedora', name: 'Fedora Linux', version: '40 (Workstation Edition)', pretty: 'Fedora Linux 40 (Workstation Edition)',
        codename: '', kernel: '6.8.5-301.fc40.x86_64', build: '#1 SMP PREEMPT_DYNAMIC', family: 'redhat',
    },
    chromeos: {
        id: 'debian', name: 'Debian GNU/Linux', version: '12 (bookworm)', pretty: 'Debian GNU/Linux 12 (bookworm)',
        codename: 'bookworm', kernel: '6.6.32-02877-gde0406ad3ff8', build: '#1 SMP PREEMPT', family: 'debian',
    },
    macos: {
        id: 'macos', name: 'macOS', version: '14.4 (Sonoma)', pretty: 'macOS Sonoma 14.4',
        codename: 'sonoma', kernel: '23.4.0', build: 'Darwin Kernel Version 23.4.0', family: 'darwin',
    },
};

// The OS of a machine (its desktop, or an Ubuntu server)
function osOf(machine) {
    return OS[machine.desktop] || OS.ubuntu;
}

// "uname -a"
function unameOf(machine) {
    const os = osOf(machine);
    return os.family === 'darwin'
        ? `Darwin ${machine.host} ${os.kernel} ${os.build}: root:xnu-10063.101.17~1/RELEASE_X86_64 x86_64`
        : `Linux ${machine.host} ${os.kernel} ${os.build} x86_64 GNU/Linux`;
}

// The first line after logging in with ssh
function bannerOf(machine) {
    const os = osOf(machine);
    if (os.family === 'darwin') return `${os.pretty}`;
    if (os.family === 'redhat') return `Web console: https://${machine.host}:9090/`;
    return `Welcome to ${os.pretty} (GNU/Linux ${os.kernel} x86_64)`;
}
