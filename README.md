# BUZZ! Mobile Phone Controller Hub

A local web application that turns smartphones into wireless **BUZZ! PS2 controllers** for games running through **PCSX2**.

Up to **8 phones** can connect to the host computer over the local network. Each phone provides the five BUZZ! controller buttons:

* Red (BUZZ!)
* Blue
* Orange
* Green
* Yellow

Button presses are transmitted from the phones to the host computer using WebSockets. The host can then expose the controller inputs to PCSX2 through the included Python bridge.

## Features

* Support for up to 8 players
* Smartphones used as BUZZ! controllers
* Real-time WebSocket communication
* QR code for quickly joining a game
* Player name selection
* Player slot selection
* Connection and latency information
* Buzzer lockout/order tracking
* Haptic feedback on supported phones
* Automatic detection of the host PC's local network addresses
* PC dashboard for managing connected players
* PCSX2 virtual controller support
* Keyboard fallback for systems where virtual gamepads are unavailable


## Requirements

### Host PC

* Windows 11
* A local network - all devices must be connected to same network
* Node.js LTS - available [here](https://nodejs.org/en/download/current)
* Python 3.x.x - available [here](https://www.python.org/downloads/)
* PCSX2 - available [here](https://pcsx2.net/)
* Your own BUZZ! PS2 .iso

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd YOUR_REPOSITORY
```

Install the Node.js dependencies:

```bash
npm install
```

## Running the Controller Hub

For development:

```bash
npm run dev
```

The server runs on:

```text
http://localhost:3000
```

For a production build:

```bash
npm run build
npm start
```

### Windows shortcut

The project includes:

```text
Start_Buzz_Controller_Hub.bat
```

Running this file will:

1. Check that Node.js is installed.
2. Install npm dependencies if necessary.
3. Build the application if necessary.
4. Start the Controller Hub.
5. Open the PC dashboard in your browser.

Keep the terminal window open while playing.

#SIMPLE GUIDE

## Connecting Phones

The Controller Hub automatically detects available network interfaces and displays the addresses that phones can use to connect.

1. Start the Controller Hub on the PC with `Start_Buzz_Controller_Hub.bat`
2. Connect the phones and PC to the same Wi-Fi network or hotspot.
3. Open the Controller Hub on the PC.
4. Use the QR code displayed by the application.
5. Open the controller page on each phone.
6. Assign each phone a player slot.

## Linking to PCSX2

1. Download `python buzz_pcsx2_bridge.py` from the web app
2. Place the .py script into the project's directory
3. If running for the first time, open `install_drivers_and_launch_python_script.bat:`
4. You will need to manually bind the keys for each phone controller in PCSX2 under Controller Ports or USB Ports (Select Buzz Controller)
5. Start the game in PCSX2.

The Controller Hub automatically detects available network interfaces and displays the addresses that phones can use to connect.


## How It Works

The system consists of three parts:

```text
┌──────────────────────┐
│      Smartphone      │
│  BUZZ! Controller UI │
└──────────┬───────────┘
           │
           │ WebSocket
           │ Local Network
           ▼
┌──────────────────────┐
│   BUZZ! Controller   │
│         Hub          │
│   Node.js / Express  │
│      WebSocket       │
└──────────┬───────────┘
           │
           │ WebSocket
           ▼
┌──────────────────────┐
│   Python PCSX2       │
│       Bridge         │
│                      │
│  vgamepad / keyboard │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        PCSX2         │
│     PS2 Emulator     │
└──────────────────────┘
```

The phones and the PC running the Controller Hub need to be able to communicate with each other over the local network.



## PCSX2 Bridge

The Controller Hub can generate a Python bridge script for connecting the phone inputs to PCSX2.

The bridge requires:

```text
websocket-client
vgamepad
keyboard
```

Install them with the included `install_drivers_and_launch_python_script.bat:`

The generated bridge uses:

* `websocket-client` for communication with the Controller Hub
* `vgamepad` for virtual gamepad input
* `keyboard` for keyboard-based input

The bridge supports up to 8 player slots.

### Virtual gamepad mapping

The default mapping is:

| BUZZ! Button | Virtual Gamepad |
| ------------ | --------------- |
| Red          | A               |
| Blue         | X               |
| Orange       | B               |
| Green        | Y               |
| Yellow       | Right Shoulder  |

Each player receives a separate virtual controller.

### Keyboard fallback

If virtual gamepad support is unavailable, the bridge can send keyboard input instead.

Default mappings:

| Player | Red   | Blue | Orange | Green | Yellow |
| ------ | ----- | ---- | ------ | ----- | ------ |
| 1      | Space | 1    | 2      | 3     | 4      |
| 2      | Enter | 5    | 6      | 7     | 8      |
| 3      | Q     | W    | E      | R     | T      |
| 4      | A     | S    | D      | F     | G      |
| 5      | Z     | X    | C      | V     | B      |
| 6      | U     | I    | O      | P     | [      |
| 7      | J     | K    | L      | ;     | '      |
| 8      | N     | M    | ,      | .     | /      |

These mappings can be changed in the generated bridge script.

## PCSX2 Configuration

The virtual controllers need to be configured in PCSX2 so that the appropriate gamepad buttons correspond to the BUZZ! game controls.

The exact configuration depends on the game and the PCSX2 version being used.

For games that require the original BUZZ! controller layout, you may need to map the virtual controller buttons accordingly inside PCSX2.

## Development

The project uses:

* React
* TypeScript
* Vite
* Express
* WebSocket
* Tailwind CSS
* QRCode
* Motion
* Google GenAI SDK

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Run the TypeScript check:

```bash
npm run lint
```

Create a production build:

```bash
npm run build
```

Start the production server:

```bash
npm start
```


## Network Requirements

The Controller Hub is designed for local-network use.

The PC and phones should be connected to the same network.

For example:

```text
PC
192.168.1.100:3000
       │
       │ Wi-Fi
       │
 ┌─────┼─────┬─────┐
 │     │     │     │
Phone Phone Phone Phone
 P1    P2    P3    P4
```

If using a Windows mobile hotspot, the phones can connect directly to the PC's hotspot.

Windows Firewall may need to allow Node.js to accept connections on the local network.

## DISCLAIMERS !!!

This application is intended primarily for use on a trusted local network.
It is **not designed to be exposed directly to the public Internet**.
I made this just for me and my friends to get drunk and play Buzz! on a laptop

This project was mostly created with Google AI Studio as I have GCSE level programming skills.
The application itself can be run locally without depending on the AI Studio development environment.

### Known Limitations

* Controller communication depends on the quality of the local network.
* Phones and the host PC need network connectivity to the Controller Hub.
* Virtual gamepad support depends on the host operating system and installed drivers.
* I have found best results for 8 players by mapping everything using the BUZZ USB Port 1+2 in PCSX2, using keyboard mappings, but you will need to clear all hotkeys
* `vgamepad` may require additional Windows virtual gamepad/ViGEm-related software depending on the configuration.
* PCSX2 controller mappings may need to be configured for individual games.

## License

