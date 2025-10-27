import React, { useState, useEffect } from "react";
import socket from "./socket";

function App() {
  const [isConnected, setIsConnected] = useState(socket.connected);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      addEventLog(`Connected to server with ID: ${socket.id}`);
    };

    const onDisconnect = () => {
      setIsConnected(false);
      addEventLog("Disconnected from server.");
    };

    const onBroadcast = (data) => {
      addEventLog(
        `[Broadcast] from ${data.senderId}: ${JSON.stringify(data.data)}`
      );
    };

    const onEventResponse = (response) => {
      addEventLog(`[Response] to sampleEvent: ${JSON.stringify(response)}`);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("broadcastEvent", onBroadcast);
    socket.on("eventResponse", onEventResponse);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("broadcastEvent", onBroadcast);
      socket.off("eventResponse", onEventResponse);
    };
  }, []);

  const addEventLog = (log) => {
    const timestamp = new Date().toLocaleTimeString();
    setEvents((prevEvents) => [`[${timestamp}] ${log}`, ...prevEvents]);
  };

  const sendSampleEvent = () => {
    const eventData = { message: "Hello from client!", timestamp: new Date() };
    addEventLog(
      `Emitting [sampleEvent] with data: ${JSON.stringify(eventData)}`
    );
    socket.emit("sampleEvent", eventData);
  };

  const sendPing = () => {
    addEventLog("Emitting [pingServer]");
    socket.emit("pingServer", (response) => {
      addEventLog(`[Callback] from ping: ${JSON.stringify(response)}`);
    });
  };

  return (
    <div className="container">
      <h1>Generic Socket.io Template</h1>

      <div className="status-bar">
        <div className="status-indicator">
          <div
            className={`status-dot ${
              isConnected ? "connected" : "disconnected"
            }`}
          ></div>
          {isConnected ? "Connected" : "Disconnected"}
        </div>
        <div className="socket-id">
          <strong>Your ID:</strong> {isConnected ? socket.id : "N/A"}
        </div>
      </div>

      <div className="panel">
        <h2>Emit Events</h2>
        <div className="button-group">
          <button onClick={sendSampleEvent}>
            Send Sample Event (Broadcast)
          </button>
          <button onClick={sendPing}>Ping Server (Direct Response)</button>
        </div>
      </div>

      <div className="panel">
        <h2>Received Events Log</h2>
        <div className="event-log">
          {events.map((event, index) => (
            <p key={index}>{event}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;
