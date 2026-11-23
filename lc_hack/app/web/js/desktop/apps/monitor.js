// =====================================================================
//  App: System monitor (Activity Monitor, System Monitor, Task Manager)
//  The same processes as "ps aux" on the desktop's machine.
// =====================================================================

registerApp('monitor', {
    open: openMonitor,
    name: 'System Monitor', names: { kali: 'Task Manager', macos: 'Activity Monitor', chromeos: 'Task Manager' },
    icon: 'fa-solid fa-chart-line',
});

function openMonitor() {
    const s = desk.session;
    const body = el('div', 'monitor');
    const table = el('div', 'monitor-table');
    body.append(table);
    createWindow(appName('monitor'), body, { width: 640, height: 380, app: 'monitor' });

    const row = (cells, className) => {
        const r = el('div', 'monitor-row' + (className ? ' ' + className : ''));
        cells.forEach(c => r.append(el('span', '', String(c))));
        return r;
    };
    const processes = processList(s.machine, s.user, [appName('monitor'), 'bash']);
    table.append(
        row(['Process', 'User', 'PID', '% CPU', '% Mem'], 'monitor-head'),
        ...processes.map(p => row([p.cmd, p.user, p.pid, p.cpu, p.mem])),
    );
}
