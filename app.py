from flask import Flask, render_template, request, jsonify
from pymodbus.client import ModbusTcpClient
import time
import webbrowser
import json
import os

app = Flask(__name__)

# === MODBUS LOGIC ===

def momentary_pulse(ip='192.168.0.201', port=502, coil_address=16384, pulse_duration=0.2):
    client = ModbusTcpClient(ip, port=port)
    if client.connect():
        client.write_coil(coil_address, True)
        time.sleep(pulse_duration)
        client.write_coil(coil_address, False)
        client.close()
        return True
    return False

def read_coil_status(ip='192.168.0.201', port=502, coil_address=8192):
    client = ModbusTcpClient(ip, port=port)
    if client.connect():
        result = client.read_coils(coil_address, count=1)
        client.close()
        if result.isError():
            return None
        return result.bits[0]
    return None

# === ROUTES ===

@app.route('/')
def index():
    return render_template('index.html')  # Configurable interface

@app.route('/panel')
def view_only_panel():
    return render_template('panel.html')  # View-only version

@app.route('/coil-status')
def get_coil_status():
    ip = request.args.get('ip', '192.168.0.201')
    port = int(request.args.get('port', 502))
    address = int(request.args.get('address', 8192))

    state = read_coil_status(ip, port, address)
    if state is None:
        return {'status': 'error'}
    return {'status': 'ok', 'coil': state}

@app.route('/pulse-dynamic', methods=['POST'])
def pulse_dynamic():
    data = request.get_json()
    ip = data.get('ip', '192.168.0.201')
    port = int(data.get('port', 502))
    coil_address = int(data.get('address', 16384))

    client = ModbusTcpClient(ip, port=port)
    if client.connect():
        client.write_coil(coil_address, True)
        time.sleep(0.2)
        client.write_coil(coil_address, False)
        client.close()
        return jsonify({'status': 'ok'})
    return jsonify({'status': 'error', 'message': 'Could not connect'})

# === LAYOUT SAVE/LOAD ===

LAYOUT_FILE = 'layout.json'

@app.route('/save-layout', methods=['POST'])
def save_layout():
    data = request.get_json()
    with open(LAYOUT_FILE, 'w') as f:
        json.dump(data.get('layout', []), f)
    return jsonify({'status': 'ok'}), 200

@app.route('/get-layout')
def get_layout():
    if os.path.exists(LAYOUT_FILE):
        with open(LAYOUT_FILE, 'r') as f:
            layout = json.load(f)
        return jsonify({'layout': layout})
    return jsonify({'layout': []})

# === START APP ===

if __name__ == '__main__':
    webbrowser.open("http://127.0.0.1:5000/")
    app.run(debug=True)
