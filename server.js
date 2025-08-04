const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const path = require('path');
const net = require('net');
const Modbus = require('jsmodbus');
const fs = require('fs');

const app = express();
const PORT = 3000;
const layoutFile = path.join(__dirname, 'layout.json');

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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(session({
  secret: 'super-secret-key',
  resave: false,
  saveUninitialized: false
}));

// Authentication middleware
function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login.html');
}

// Routes
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  const conn = await mysql.createConnection(dbConfig);
  const [rows] = await conn.execute('SELECT id FROM users WHERE username = ?', [username]);

  if (rows.length > 0) {
    res.send('❌ Usuario ya existe.');
  } else {
    const hash = await bcrypt.hash(password, 10);
    await conn.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hash]);
    res.redirect('/login.html');
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
    req.session.user = { id: rows[0].id, username: rows[0].username };
    res.redirect('/index.html');
  }
  await conn.end();
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login.html'));
});

// Protect UI pages
app.get('/index.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});
app.get('/panel.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'templates', 'panel.html'));
});

// Modbus TCP: Read coil status
app.get('/coil-status', checkAuth, (req, res) => {
  const { ip, port, address } = req.query;
  const portNum = parseInt(port, 10);
  const addrNum = parseInt(address, 10);

  if (!ip || isNaN(portNum) || isNaN(addrNum)) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }

  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket);

  socket.connect(portNum, ip, () => {
    client.readCoils(addrNum, 1)
      .then(response => {
        const status = response.response._body.valuesAsArray[0];
        res.json({ status: 'ok', coil: status });
        socket.end();
      })
      .catch(err => {
        console.error('🛑 Modbus read error:', err.message);
        res.status(500).json({ status: 'error', message: 'Modbus read failed: ' + err.message });
        socket.end();
      });
  });

  socket.on('error', err => {
    console.error('🛑 Socket error:', err.message);
    res.status(500).json({ status: 'error', message: 'Socket error: ' + err.message });
  });
});

// Modbus TCP: Read holding register (for integer values like level bars)
app.get('/register-value', checkAuth, (req, res) => {
  const { ip, port, address, words } = req.query;
  const portNum = parseInt(port, 10);
  const rawAddr = parseInt(address, 10);
  // Accept both 400001+ and absolute addressing
  const offsetAddr = rawAddr >= 400001 ? rawAddr - 400001 : rawAddr;
  const numWords = parseInt(words, 10) || 1;

  if (!ip || isNaN(portNum) || isNaN(rawAddr) || offsetAddr < 0) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }

  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket);

  socket.connect(portNum, ip, () => {
    client.readHoldingRegisters(offsetAddr, numWords)
      .then(response => {
        const value = response.response._body.valuesAsArray;
        res.json({ status: 'ok', value });
        socket.end();
      })
      .catch(err => {
        console.error('🛑 Holding register read error:', err.message);
        res.status(500).json({ status: 'error', message: err.message });
        socket.end();
      });
  });

  socket.on('error', err => {
    console.error('🛑 Socket error:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  });
});

// Modbus TCP: Pulse coil
app.post('/pulse-dynamic', checkAuth, (req, res) => {
  const { ip, port, address } = req.body;
  const portNum = parseInt(port, 10);
  const addrNum = parseInt(address, 10);

  if (!ip || isNaN(portNum) || isNaN(addrNum)) {
    return res.status(400).json({ status: 'error', message: '❌ Parámetros inválidos (ip, port o address).' });
  }

  const socket = new net.Socket();
  const client = new Modbus.client.TCP(socket);

  socket.connect(portNum, ip, () => {
    client.writeSingleCoil(addrNum, true)
      .then(() => {
        setTimeout(() => {
          client.writeSingleCoil(addrNum, false)
            .then(() => {
              res.json({ status: 'ok' });
              socket.end();
            })
            .catch(err => {
              console.error('Pulse OFF error:', err.message);
              res.json({ status: 'error', message: err.message });
              socket.end();
            });
        }, 200); // pulse duration
      })
      .catch(err => {
        console.error('Pulse ON error:', err.message);
        res.json({ status: 'error', message: err.message });
        socket.end();
      });
  });

  socket.on('error', err => {
    console.error('Socket error:', err.message);
    res.json({ status: 'error', message: err.message });
  });
});

app.get('/get-layout', checkAuth, (req, res) => {
  fs.readFile(layoutFile, 'utf8', (err, data) => {
    if (err) return res.json({ layout: [] }); // Return empty layout on error
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
  fs.writeFile(layoutFile, JSON.stringify(req.body, null, 2), err => {
    if (err) {
      console.error('Error saving layout:', err);
      return res.status(500).json({ status: 'error', message: 'Failed to save layout.' });
    }
    res.json({ status: 'ok' });
  });
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
