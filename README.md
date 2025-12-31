# talorix-connect

A Node.js client for interacting with Talorix Panel APIs and WebSockets.

## Installation

```bash
npm install talorix-connect
````

## Usage

```javascript
const TalorixConnect = require("talorix-connect");

// Initialize client
const client = new TalorixConnect({
  panelUrl: "http://localhost:3000", // Your panel URL
  key: "YOUR_API_KEY_HERE",          // Your API key
});

// --- REST API Example: list nodes ---
async function listNodes() {
  const nodes = await client.api.nodes.list();
  console.log(nodes);
}

// --- Create server ---
async function createServer() {
  const server = await client.api.servers.create({
    name: "MyServer",
    nodeId: "NODE_ID",
    allocationId: "ALLOCATION_ID",
    imageId: "IMAGE_ID",
    ram: 1024,
    core: 1,
    disk: 10240,
    userId: "USER_ID",
  });
  console.log(server);
}

// --- WebSocket Console Example ---
const wsConsole = client.ws.console("SERVER_ID", {
  onMessage: (msg) => console.log("Console:", msg),
  onClose: () => console.log("Closed"),
  onError: (err) => console.error(err),
});

// --- WebSocket Stats Example ---
const wsStats = client.ws.stats("SERVER_ID", {
  onStats: (stats) => console.log("Stats:", stats),
  onClose: () => console.log("Closed"),
  onError: (err) => console.error(err),
});
```

## Features

* Full API access: `client.api.*`
* WebSocket support for console and stats: `client.ws.*`
* Easy initialization with API key
* Promise-based API and callback-based WS events

## License

MIT
