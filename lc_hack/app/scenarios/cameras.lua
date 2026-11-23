-- Demo: a security room with three cameras. The passwords are on the desktop.
return {
    ip = '10.9.1.20',
    host = 'security',
    user = 'guard',
    desktop = 'ubuntu',
    target = false,
    files = {
        ['~/Desktop/cameras.txt'] = 'Cameras (open with: view <ip>)\n\n10.9.1.101  Lobby   admin / cam1\n10.9.1.102  Vault   admin / cam2\n10.9.1.103  Garage  admin / cam3',
    },
    network = {
        { ip = '10.9.1.101', host = 'cam-lobby', user = 'admin', password = 'cam1', camera = { coords = { x = 100, y = 200, z = 30 }, rotation = { x = -15, y = 0, z = 90 }, fov = 60 } },
        { ip = '10.9.1.102', host = 'cam-vault', user = 'admin', password = 'cam2', camera = { coords = { x = 120, y = 210, z = 28 }, rotation = { x = -20, y = 0, z = 180 }, fov = 55 } },
        { ip = '10.9.1.103', host = 'cam-garage', user = 'admin', password = 'cam3', camera = { coords = { x = 90, y = 260, z = 25 }, rotation = { x = -10, y = 0, z = 0 }, fov = 70 } },
    },
}
