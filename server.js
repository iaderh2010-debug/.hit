
// Place this after app is initialized
// Simple notifications endpoint for panel.html

// ...existing code...

// Add this after 'const app = express();'

app.get('/notifications', (req, res) => {
  res.json({ status: 'ok', notifications: [] });
});

let persistentSocket = null;
let persistentClient = null;
let isConnected = false;
let persistentIp = null;
let persistentPort = null;
let connectQueue = [];
const express = require('express');
const app = express();
const session = require('express-session');
app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: false
}));
const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const path = require('path');
const net = require('net');
const Modbus = require('jsmodbus');
const fs = require('fs');

const PORT = 3000;
const layoutFile = path.join(__dirname, 'layout.json');
const shareRequestsFile = path.join(__dirname, 'share_requests.json');

app.post('/request-share', checkAuth, async (req, res) => {
  const designer = req.session.user && req.session.user.username;
  const { user } = req.body;
  if (!designer || !user) return res.json({ status: 'error', message: 'Missing designer or user.' });
  // Check if user exists and is a user
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT * FROM users WHERE username = ? AND role = ?', [user, 'user']);
  await conn.end();
  if (rows.length === 0) return res.json({ status: 'error', message: 'User does not exist.' });
  // Save request
  let requests = [];
  try {
    requests = JSON.parse(fs.readFileSync(shareRequestsFile, 'utf8'));
  } catch {}
  if (requests.some(r => r.designer === designer && r.user === user)) {
    return res.json({ status: 'error', message: 'Request already sent.' });
  }
  requests.push({ designer, user });
  fs.writeFileSync(shareRequestsFile, JSON.stringify(requests, null, 2));
  res.json({ status: 'ok', message: 'Request sent.' });
});

// User gets pending share requests
app.get('/get-share-requests', checkAuth, (req, res) => {
  const user = req.session.user && req.session.user.username;
  let requests = [];
  try {
    requests = JSON.parse(fs.readFileSync(shareRequestsFile, 'utf8'));
  } catch {}
  const pending = requests.filter(r => r.user === user);
  res.json({ status: 'ok', requests: pending });
});

// User accepts a share request
app.post('/accept-share', checkAuth, (req, res) => {
  const user = req.session.user && req.session.user.username;
  const { designer } = req.body;
  if (!designer || !user) return res.json({ status: 'error', message: 'Missing designer or user.' });
  let requests = [];
  try {
    requests = JSON.parse(fs.readFileSync(shareRequestsFile, 'utf8'));
  } catch {}
  requests = requests.filter(r => !(r.designer === designer && r.user === user));
  fs.writeFileSync(shareRequestsFile, JSON.stringify(requests, null, 2));
  // Add permanent share link
  const permanentSharesFile = path.join(__dirname, 'permanent_shares.json');
  let permanentShares = [];
  try {
    permanentShares = JSON.parse(fs.readFileSync(permanentSharesFile, 'utf8'));
  } catch {}
  if (!permanentShares.some(r => r.designer === designer && r.user === user)) {
    permanentShares.push({ designer, user });
    fs.writeFileSync(permanentSharesFile, JSON.stringify(permanentShares, null, 2));
  }
  // Optionally, copy designer's layout to user's layout
  const designerLayout = path.join(__dirname, 'layouts', `${designer}.json`);
  const userLayout = path.join(__dirname, 'layouts', `${user}.json`);
  if (fs.existsSync(designerLayout)) {
    fs.copyFileSync(designerLayout, userLayout);
  }
  res.json({ status: 'ok', message: 'Layout shared!' });
});

// User cancels a share request
app.post('/cancel-share', checkAuth, (req, res) => {
  const sessionUser = req.session.user && req.session.user.username;
  let { designer, user } = req.body;
  let requests = [];
  try {
    requests = JSON.parse(fs.readFileSync(shareRequestsFile, 'utf8'));
  } catch {}

  // If designer is null, treat session user as designer (from index.html unlink)
  if (!designer) designer = sessionUser;
  if (!designer || !user) return res.json({ status: 'error', message: 'Missing designer or user.' });

  // Remove the share request
  requests = requests.filter(r => !(r.designer === designer && r.user === user));
  fs.writeFileSync(shareRequestsFile, JSON.stringify(requests, null, 2));

  // Reset the user's layout to blank
  const userLayoutFile = path.join(__dirname, 'layouts', `${user}.json`);
  fs.writeFile(userLayoutFile, JSON.stringify({ tabs: [] }, null, 2), err => {
    if (err) {
      console.error('Error resetting layout for user:', user, err);
      return res.status(500).json({ status: 'error', message: 'Request cancelled, but failed to reset layout.' });
    }
    res.json({ status: 'ok', message: `El usuario ${user} ha sido desvinculado y su panel fue restaurado.` });
  });
});

// User login route for /loginuser
app.post('/loginuser', async (req, res) => {
  console.log('LOGINUSER BODY:', req.body);
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);

  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) {
    res.send('❌ Credenciales inválidas.');
  } else if (rows[0].role !== 'user') {
    res.send('❌ Solo los usuarios pueden iniciar sesión aquí.');
  } else {
    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
    res.redirect('/panel.html');
  }
  await conn.end();
});

function connectModbus(ip, port, cb) {
  if (isConnected && persistentIp === ip && persistentPort === port) {
    return cb();
  }
  if (persistentSocket) {
    try { persistentSocket.end(); } catch (e) {}
    isConnected = false;
  }
  persistentSocket = new net.Socket();
  persistentClient = new Modbus.client.TCP(persistentSocket);
  persistentIp = ip;
  persistentPort = port;

  persistentSocket.on('connect', () => {
    isConnected = true;
    while (connectQueue.length) connectQueue.shift()();
  });
  persistentSocket.on('error', err => {
    isConnected = false;
    console.error('Persistent Modbus socket error:', err.message);
  });
  persistentSocket.on('close', () => {
    isConnected = false;
  });

  connectQueue.push(cb);
  persistentSocket.connect(port, ip);
}

// Database config
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'STicker123.',
  database: 'scada_users'
};

// Middleware
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use(express.static(path.join(__dirname, 'public')));

// Authentication middleware
function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login.html');
}

// Routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// Designer signup: set role to 'designer'
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);

  if (rows.length > 0) {
    res.send('❌ Usuario ya existe.');
  } else {
    const hash = await bcrypt.hash(password, 10);
    await conn.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, 'designer']);
    // Create blank layout for new user
    const layoutsDir = path.join(__dirname, 'layouts');
    if (!fs.existsSync(layoutsDir)) {
      fs.mkdirSync(layoutsDir);
    }
    const userLayoutFile = path.join(layoutsDir, `${username}.json`);
    fs.writeFileSync(userLayoutFile, JSON.stringify({ tabs: [] }, null, 2));
    res.redirect('/login.html');
  }
  await conn.end();
});

// User signup: set role to 'user'
app.post('/signupuser', async (req, res) => {
  console.log('BODY:', req.body);
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);

  if (rows.length > 0) {
    res.send('❌ Usuario ya existe.');
  } else {
    const hash = await bcrypt.hash(password, 10);
    await conn.execute('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, hash, 'user']);
    // Create blank layout for new user
    const layoutsDir = path.join(__dirname, 'layouts');
    if (!fs.existsSync(layoutsDir)) {
      fs.mkdirSync(layoutsDir);
    }
    const userLayoutFile = path.join(layoutsDir, `${username}.json`);
    fs.writeFileSync(userLayoutFile, JSON.stringify({ tabs: [] }, null, 2));
    res.redirect('/loginuser.html');
  }
  await conn.end();
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT * FROM users WHERE username = ?', [username]);

  if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) {
    res.send('❌ Credenciales inválidas.');
  } else {
    req.session.user = { id: rows[0].id, username: rows[0].username, role: rows[0].role };
    if (rows[0].role === 'designer') {
      res.redirect('/index.html');
    } else {
      res.redirect('/panel.html');
    }
  }
  await conn.end();
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// Protect UI pages
const fsPromises = require('fs').promises;
app.get('/index.html', checkAuth, async (req, res) => {
  const username = req.session.user && req.session.user.username;
  let html = await fsPromises.readFile(path.join(__dirname, 'templates', 'index.html'), 'utf8');
  // Inject meta tag with username just before </head>
  if (username) {
    html = html.replace('</head>', `<meta name="current-username" content="${username}"></head>`);
  }
  res.send(html);
});
app.get('/panel.html', checkAuth, async (req, res) => {
  const username = req.session.user && req.session.user.username;
  let html = await fs.promises.readFile(path.join(__dirname, 'templates', 'panel.html'), 'utf8');
  // Inject meta tag with username just before </head>
  if (username) {
    html = html.replace('</head>', `<meta name="current-username" content="${username}"></head>`);
  }
  res.send(html);
});

// Modbus TCP: Read coil status (persistent client)
app.get('/coil-status', checkAuth, (req, res) => {
  const { ip, port, address } = req.query;
  const portNum = parseInt(port, 10);
  const addrNum = parseInt(address, 10) - 1;
  if (!ip || isNaN(portNum) || isNaN(addrNum) || addrNum < 0) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }
  connectModbus(ip, portNum, () => {
    persistentClient.readCoils(addrNum, 1)
      .then(response => {
        const status = response.response._body.valuesAsArray[0];
        res.json({ status: 'ok', coil: status });
      })
      .catch(err => {
        console.error('🛑 Modbus read error:', err.message);
        res.status(500).json({ status: 'error', message: 'Modbus read failed: ' + err.message });
      });
  });
});

// Modbus TCP: Read holding register (persistent client)
app.get('/register-value', checkAuth, (req, res) => {
  const { ip, port, address, wordSize } = req.query;
  const portNum = parseInt(port, 10);
  const rawAddr = parseInt(address, 10);
  const numWords = parseInt(wordSize, 10) || 1;

  let offsetAddr;
  if (rawAddr >= 400001) {
    offsetAddr = rawAddr - 400001;
  } else {
    offsetAddr = rawAddr;
  }

  if (!ip || isNaN(portNum) || isNaN(rawAddr) || offsetAddr < 0) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }

  connectModbus(ip, portNum, () => {
    persistentClient.readHoldingRegisters(offsetAddr, numWords)
      .then(response => {
        const arr = response.response._body.valuesAsArray;
        let value = arr[0];
        if (numWords === 2) {
          value = (arr[1] << 16) + arr[0];
        }
        res.json({ status: 'ok', value });
      })
      .catch(err => {
        console.error('🛑 Holding register read error:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
      });
  });
});

// Modbus TCP: Pulse coil (persistent client)
app.post('/pulse-dynamic', checkAuth, (req, res) => {
  const { ip, port, address } = req.body;
  const portNum = parseInt(port, 10);
  const addrNum = parseInt(address, 10) - 1;

  if (!ip || isNaN(portNum) || isNaN(addrNum) || addrNum < 0) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }

  connectModbus(ip, portNum, () => {
    persistentClient.writeSingleCoil(addrNum, true)
      .then(() => setTimeout(() => {
        persistentClient.writeSingleCoil(addrNum, false)
          .then(() => res.json({ status: 'ok' }))
          .catch(err => {
            console.error('Pulse OFF error:', err.message);
            res.status(500).json({ status: 'error', message: err.message });
          });
      }, 100))
      .catch(err => {
        console.error('Pulse ON error:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
      });
  });
});

app.get('/get-layout', checkAuth, (req, res) => {
  // Per-user layout
  const username = req.session.user && req.session.user.username;
  if (!username) return res.status(401).json({ status: 'error', message: 'Not logged in.' });
  const userLayoutFile = path.join(__dirname, 'layouts', `${username}.json`);
  fs.readFile(userLayoutFile, 'utf8', (err, data) => {
    if (err) return res.json({ tabs: [] }); // Return blank tabs on error
    try {
      const json = JSON.parse(data);
      res.json(json);
    } catch (parseErr) {
      res.status(500).json({ status: 'error', message: 'Invalid layout format.' });
    }
  });
});

// Save layout
app.post('/save-layout', checkAuth, (req, res) => {
  // Per-user layout
  const username = req.session.user && req.session.user.username;
  if (!username) return res.status(401).json({ status: 'error', message: 'Not logged in.' });
  const userLayoutFile = path.join(__dirname, 'layouts', `${username}.json`);
  fs.writeFile(userLayoutFile, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Error saving layout:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to save layout.' });
    }

    console.log(`[SAVE] Layout saved for user: ${username}`);

    // Also update all users who have a permanent share from this designer
    const permanentSharesFile = path.join(__dirname, 'permanent_shares.json');
    let permanentShares = [];
    try {
      permanentShares = JSON.parse(fs.readFileSync(permanentSharesFile, 'utf8'));
    } catch {}
    const sharedUsers = permanentShares.filter(r => r.designer === username).map(r => r.user);
    if (sharedUsers.length > 0) {
      console.log(`[SAVE] Also updating shared users: ${sharedUsers.join(', ')}`);
    }
    for (const sharedUser of sharedUsers) {
      const sharedUserLayoutFile = path.join(__dirname, 'layouts', `${sharedUser}.json`);
      try {
        fs.writeFileSync(sharedUserLayoutFile, JSON.stringify(req.body, null, 2));
        console.log(`[SAVE] Layout updated for shared user: ${sharedUser}`);
      } catch (e) {
        console.error('Error updating shared user layout for', sharedUser, e);
      }
    }
    res.json({ status: 'ok' });
  });
});

// Dummy share requests endpoint to prevent 404 errors
app.get('/get-share-requests', checkAuth, (req, res) => {
  res.json({ status: 'ok', requests: [] });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});