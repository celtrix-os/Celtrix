import React, { useState, useEffect } from 'react';
import socket from './socket';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  // Let's make the sender name dynamic
  const [sender, setSender] = useState('');

  useEffect(() => {
    // Prompt for a username when the component mounts
    const username = prompt("Please enter your name");
    if (username) {
      setSender(username);
    } else {
      setSender('Anonymous');
    }

    // Fetch initial messages only once
    fetch('/api/messages')
      .then(res => res.json())
      .then(data => setMessages(data));

    // Listener for new messages from the server
    const handleNewMessage = (message) => {
      // Add a visual cue to show this message came from the socket
      console.log('Received new message via socket:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on('newMessage', handleNewMessage);

    // Clean up the socket listener when the component unmounts
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, []); // Empty dependency array ensures this runs only once

  const sendMessage = (e) => {
    e.preventDefault();
    if (input && sender) {
      const messageData = { sender, content: input };
      
      // Send message to the server via POST request.
      // The server will then emit it back to all clients.
      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData),
      });

      setInput('');
    }
  };

  return (
    <div>
      <h1>Real-Time Chat</h1>
      <div style={{ border: '1px solid #ccc', padding: '10px', height: '300px', overflowY: 'scroll', marginBottom: '10px' }}>
        {messages.map((msg, index) => (
          <p key={msg.id || index}><strong>{msg.sender}:</strong> {msg.content}</p>
        ))}
      </div>
      <form onSubmit={sendMessage}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{ padding: '8px', width: '300px' }}
        />
        <button type="submit" style={{ padding: '8px' }}>Send</button>
      </form>
    </div>
  );
}

export default App;