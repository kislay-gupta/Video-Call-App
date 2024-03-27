import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useUsername } from "../context/UsernameContext";
import axios from "axios";
import "./Lobby.css";

const LobbyScreen = () => {
  const navigate = useNavigate();
  const { roomName, setRoomName } = useRoom("");
  const { username, setUsername } = useUsername("");

  useEffect(() => {
    const fetchRoomId = async () => {
      try {
        const response = await axios.get("https://vidchatnow.pagekite.me/api/rooms");
        const { roomId } = response.data;
        setRoomName(roomId);
      } catch (error) {
        console.error("Error fetching room ID:", error);
        alert("Error Creating Room.");
      }
    };
    if (!roomName) {
      fetchRoomId();
    }
    setUsername(username);
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const meetingLink = `http://localhost:3000/meeting/${roomName}`;
      navigator.clipboard.writeText(meetingLink);
      setUsername(username);
      console.log(roomName, username);
      alert("Meeting link copied to clipboard.");
      navigate(`/meeting/${roomName}`);
    } catch (error) {
      console.error("Error creating room:", error);
    }
  };

  return (
    <form id="msform" onSubmit={handleCreateRoom}>
      <ul id="progressbar">
        <li className="active">Create Meeting</li>
        <li>Share Link</li>
        <li>Connect</li>
      </ul>
      <fieldset>
        <h2 className="fs-title">Welcome to Lobby!</h2>
        <h3 className="fs-subtitle">Create your own room</h3>
        <input
          type="text"
          name="username"
          placeholder="Enter your Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="text"
          name="roomName"
          placeholder="Enter the Room Id"
          value={roomName}
          onChange={(e) => setRoomName(e.target.value)}
        />
        <input
          type="submit"
          name="Create Meeting"
          className="next action-button"
          value="Create"
        />
      </fieldset>
    </form>
  );
};

export default LobbyScreen;
