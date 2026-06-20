# User Analytics Platform

A high-performance, responsive MERN-stack analytics platform similar to a simplified version of **CausalFunnel**. The system logs page view routes and click coordinates on any website and renders analytic statistics, interactive timelines, session playback simulations, and canvas-based overlays in real time.

---

## Architecture Diagram

```mermaid
graph TD
    subgraph Client Application (Webpage / Demo)
        SDK[Tracking SDK: tracker.js]
        Web[Demo Webpage: index.html]
    end

    subgraph Node.js Backend Server
        Express[Express.js App]
        SocketIO[Socket.io Server]
        Mongoose[Mongoose ODM]
    end

    subgraph Database
        MongoDB[(MongoDB Cluster)]
    end

    subgraph Admin Dashboard
        ReactApp[Vite + React Dashboard]
        Charts[Recharts Graph Engine]
        Canvas[HTML5 Click Heatmap Canvas]
        SocketClient[Websocket Subscriber]
    end

    %% Flow links
    Web -->|Loads| SDK
    SDK -->|POST /api/events| Express
    Express -->|Stores| Mongoose
    Mongoose -->|Saves| MongoDB
    Express -->|Emits Event| SocketIO
    SocketIO -->|Pushes event| SocketClient
    ReactApp -->|GET /api/stats| Express
    ReactApp -->|GET /api/sessions| Express
    ReactApp -->|GET /api/heatmap| Express
```

---

## Folder Structure

```text
analytics-platform/
├── README.md
├── tracker/
│   └── tracker.js
├── demo/
│   ├── index.html
│   └── tracker.js
├── server/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   └── eventController.js
│   ├── models/
│   │   └── Event.js
│   ├── routes/
│   │   └── eventRoutes.js
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── utils/
│   │   └── seed.js
│   ├── server.js
│   ├── package.json
│   └── .env
└── client/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   ├── Sidebar.jsx
    │   │   ├── TopNavbar.jsx
    │   │   └── StatsCard.jsx
    │   ├── pages/
    │   │   ├── Dashboard.jsx
    │   │   ├── Sessions.jsx
    │   │   ├── SessionDetails.jsx
    │   │   └── Heatmap.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── context/
    │   │   └── SocketContext.jsx
    │   ├── hooks/
    │   │   └── useLocalStorage.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    └── package.json
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- MongoDB instance (local or MongoDB Atlas cluster connection string)

### Database Setup
Ensure MongoDB is running locally at its default port (`mongodb://localhost:27017`) or configure an alternative URI in your environment variables.

### Clone and Setup Server Dependencies
1. Navigate to the `server/` directory:
   ```bash
   cd server
   ```
2. Setup environment variables by copying `.env`:
   ```bash
   # Make sure the variables match your database configuration:
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/analytics
   CLIENT_URL=http://localhost:5173
   ```
3. Install backend packages:
   ```bash
   npm install
   ```
4. Run the seed script to populate mock user sessions and click maps:
   ```bash
   npm run seed
   ```

### Setup Client Dependencies
1. Navigate to the `client/` directory:
   ```bash
   cd ../client
   ```
2. Install packages:
   ```bash
   npm install
   ```

---

## Running the Application

### 1. Launch Backend Server
From the `server/` directory, start the development node:
```bash
npm run dev
```
The console will log:
```text
MongoDB Connected: localhost
Server running in development mode on port 5000
Socket client connected: ...
```

### 2. Launch Admin Dashboard
From the `client/` directory, start the Vite server:
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Launch Demo Webpage
To simulate new live sessions:
1. Open the [demo/index.html](file:///c:/Users/hp/Desktop/Assessment/demo/index.html) file directly in a web browser, or serve it using any local static file server (e.g. VS Code Live Server, Python HTTP server, or Node `http-server`).
2. Move your cursor around, scroll, click elements, fill forms, or navigate the simulated page links.
3. Observe how click coordinates and page views update immediately in the **Live Event Stream** on your Admin Dashboard without a browser refresh!

---

## API Documentation

### 1. Submit Event
- **Endpoint**: `POST /api/events`
- **Body**:
  ```json
  {
    "session_id": "sess_x12y34z56",
    "event_type": "click",
    "page_url": "/home",
    "timestamp": "2026-06-20T10:00:00.000Z",
    "x": 420,
    "y": 180
  }
  ```
- **Response** (`201 Created`):
  ```json
  {
    "_id": "6673f8a42f4c9c10...",
    "sessionId": "sess_x12y34z56",
    "eventType": "click",
    "pageUrl": "/home",
    "timestamp": "2026-06-20T10:00:00.000Z",
    "coordinates": { "x": 420, "y": 180 },
    "createdAt": "...",
    "updatedAt": "..."
  }
  ```

### 2. Retrieve Sessions Aggregation
- **Endpoint**: `GET /api/sessions`
- **Query Params**:
  - `search` (Optional) - Filter by matching session ID patterns.
  - `startDate`/`endDate` (Optional) - ISO string or date inputs.
  - `page`/`limit` (Optional) - Pagination details.
- **Response** (`200 OK`):
  ```json
  {
    "sessions": [
      {
        "totalEvents": 14,
        "firstSeen": "2026-06-20T08:00:00.000Z",
        "lastSeen": "2026-06-20T08:45:00.000Z",
        "pageViews": 4,
        "clicks": 10,
        "sessionId": "sess_xyz123"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "totalSessions": 15, "totalPages": 2 }
  }
  ```

### 3. Retrieve Session Timeline
- **Endpoint**: `GET /api/sessions/:sessionId`
- **Response** (`200 OK`):
  ```json
  [
    {
      "sessionId": "sess_xyz123",
      "eventType": "page_view",
      "pageUrl": "/home",
      "timestamp": "2026-06-20T08:00:00.000Z"
    },
    {
      "sessionId": "sess_xyz123",
      "eventType": "click",
      "pageUrl": "/home",
      "timestamp": "2026-06-20T08:01:00.000Z",
      "coordinates": { "x": 120, "y": 300 }
    }
  ]
  ```

### 4. Retrieve Heatmap Coordinates
- **Endpoint**: `GET /api/heatmap`
- **Query Params**:
  - `page` (Required) - e.g., `/home`
- **Response** (`200 OK`):
  ```json
  [
    { "x": 120, "y": 300 },
    { "x": 200, "y": 500 }
  ]
  ```

### 5. Fetch Dashboard Overview Statistics
- **Endpoint**: `GET /api/stats`
- **Response** (`200 OK`):
  Detailed metrics including active sessions count, events per day, most visited pages, click proportions, and recent events list.

---

## Future Improvements
- **Heatmap element overlays**: Match click coordinates directly onto dynamic screenshots of target pages.
- **Form submission analytics**: Track drop-off steps during multi-step forms.
- **Funnel Conversion Analysis**: Construct visualization chains to see percentage drop-offs between `/home` -> `/pricing` -> `/contact` routes.
- **IP Geolocation**: Match analytics to geographic locations.
