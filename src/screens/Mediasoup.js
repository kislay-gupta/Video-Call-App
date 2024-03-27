import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { CiMicrophoneOn } from "react-icons/ci";
import { CiMicrophoneOff } from "react-icons/ci";
import { VscUnmute } from "react-icons/vsc";
import { BsFillCameraVideoOffFill } from "react-icons/bs";
import { BsFillCameraVideoFill } from "react-icons/bs";
import { FaTv } from "react-icons/fa";
import { MdOutlineTvOff } from "react-icons/md";
import { useNavigate, useParams } from "react-router-dom";
import { useRoom } from "../context/RoomContext";
import { useUsername } from "../context/UsernameContext";
const mediasoupClient = require("mediasoup-client");

const VideoChatApp = () => {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [socket, setSocket] = useState(null);
  const { username, setUsername } = useUsername("");
  const { roomName, setRoomName } = useRoom(roomId);
  // const [username, setUsername] = useState("kumar");
  // const [roomName, setRoomName] = useState(roomId);
  let peerVideo = document.getElementById("peer-video");
  const [peerVideoStream, setPeerVideoStream] = useState(null);
  const [peerVideo2Stream, setPeerVideo2Stream] = useState(null);
  const peerVideoRef = useRef(null);
  const peerVideo2Ref = useRef(null);
  const localVideo = document.getElementById("localVideo");
  const localScreen = document.getElementById("localScreen");
  const videoContainer = document.getElementById("videoContainer");
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [screenShared, setScreenShared] = useState(false);

  useEffect(() => {
    // const newSocket = io("https://vidchatnow.pagekite.me:443");
    const newSocket = io("https://vc.touchtechsoftware.com");

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(roomName);
    alert("Room ID copied to clipboard.");
  };

  // Join Button
  const handleJoin = (e) => {
    e.preventDefault();
    if (!roomName.trim() || !username.trim()) {
      alert("Please enter your name and room name.");
      return;
    }
    socket.emit("join", roomName, username);
  };
  let screenDevice;
  let device;
  let rtpCapabilities;
  let rtpScreenCapabilities;
  let producerTransport;
  let producerScreenTransport;
  let consumerTransports = [];
  let audioProducer;
  let videoProducer;
  let audioProducerScreen;
  let videoProducerScreen;
  let consumer;
  let isProducer = false;

  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerOptions
  // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
  let params = {
    // mediasoup params
    encodings: [
      {
        rid: "r0",
        maxBitrate: 100000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r1",
        maxBitrate: 300000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r2",
        maxBitrate: 900000,
        scalabilityMode: "S1T3",
      },
    ],
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };
  let paramsVideo = {
    // mediasoup params
    encodings: [
      {
        rid: "r0",
        maxBitrate: 100000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r1",
        maxBitrate: 300000,
        scalabilityMode: "S1T3",
      },
      {
        rid: "r2",
        maxBitrate: 900000,
        scalabilityMode: "S1T3",
      },
    ],
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#ProducerCodecOptions
    codecOptions: {
      videoGoogleStartBitrate: 1000,
    },
  };

  let audioParams;
  let videoParams = { params };
  let audioParamsScreen;
  let videoParamsScreen = { params };
  let videoScreenParams = { params };
  let consumingTransports = [];
  console.log("consumingTransports", consumingTransports)
  let screenSharedStream;
  let screensharedUser = false

  //  screen sharing
  const streamSuccess = (stream,streaming) => {
    localVideo.srcObject = stream;
    audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
    videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

    if (screensharedUser) {
      console.log('heeeeeeeeeeeeeee')
      audioParamsScreen = { track: streaming.getAudioTracks()[0], ...audioParamsScreen };
      videoParamsScreen = { track: streaming.getVideoTracks()[0], ...videoParamsScreen };
    }

    console.log("params 1 ", params);
    joinRoom();
  };
  //  screen sharing
  const streamSuccessScreen = (stream) => {
    // localVideo.srcObject = stream;
    audioParams = { track: stream.getAudioTracks()[0], ...audioParams };
    videoParams = { track: stream.getVideoTracks()[0], ...videoParams };

    // if (screensharedUser) {
    //   console.log('heeeeeeeeeeeeeee')
    //   audioParamsScreen = { track: streaming.getAudioTracks()[0], ...audioParamsScreen };
    //   videoParamsScreen = { track: streaming.getVideoTracks()[0], ...videoParamsScreen };
    // }

    console.log("params 1 ", params);
    joinRoom();
  };

  const joinRoom = () => {
    socket.emit("joinRoom", { roomName:roomId, userName: username }, (data) => {
      console.log(`Router RTP Capabilities... ${data.rtpCapabilities}`);
      // we assign to local variable and will be used when
      // loading the client Device (see createDevice above)
      rtpCapabilities = data.rtpCapabilities;

      // once we have rtpCapabilities from the Router, create Device
      createDevice();
    });
  };

  const getLocalStream = () => {

    navigator.mediaDevices
      .getUserMedia({
        audio: true,
        video: {
          width: {
            min: 640,
            max: 1920,
          },
          height: {
            min: 400,
            max: 1080,
          },
        },
      })
      .then((stream)=>{
        streamSuccess(stream,screenSharedStream)
      })
      .catch((error) => {
        console.log(error.message);
      });
  };
  const [screenStream, setScreenStream] = useState()
  console.log("screenStream", screenStream)
  const getSharedStream = () => {
    navigator.mediaDevices
      .getDisplayMedia(
        { video: true, audio: true }
      )
      .then(
        (stream) => {
          console.log("stream..........", stream)
          // audioParamsScreen = { track: stream.getAudioTracks()[0], ...audioParamsScreen };
          // videoParamsScreen = { track: stream.getVideoTracks()[0], ...videoParamsScreen };
          localScreen.srcObject = stream
          screenSharedStream = stream
          screensharedUser = true
          streamSuccessScreen(stream)
          // getLocalStream()
          // createSendTransport()
          // getLocalStream();
        }
      )
      .catch((error) => {
        console.log(error.message);
      });
  };

  // A device is an endpoint connecting to a Router on the
  // server side to send/recive media
  const createDevice = async () => {
    try {
      device = new mediasoupClient.Device(
        {
          rtcIceServers: [
            { urls: 'stun:13.232.15.21:3478' },
            { urls: 'turn:13.232.15.21:3478', username: 'videocalling', credential: '12345678' }
          ],
        }

        
      );

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#device-load
      // Loads the device with RTP capabilities of the Router (server side)
      await device.load({
        // see getRtpCapabilities() below
        routerRtpCapabilities: rtpCapabilities,
      });
      console.log("Device...........", device)
      console.log("Device RTP Capabilities", device.rtpCapabilities);

      // once the device loads, create transport
      createSendTransport();
    } catch (error) {
      console.log(error);
      if (error.name === "UnsupportedError")
        console.warn("browser not supported");
    }
  };

  const createSendTransport = () => {
    // see server's socket.on('createWebRtcTransport', sender?, ...)
    // this is a call from Producer, so sender = true
    console.log("params.", params);
    socket.emit("createWebRtcTransport", { consumer: false }, ({ params }) => {
      // The server sends back params needed
      // to create Send Transport on the client side

      if (params.error) {
        console.log(params.error);
        return;
      }

      console.log("params", params);

      // creates a new WebRTC Transport to send media

      // based on the server's producer transport params

      // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
      producerTransport = device.createSendTransport(params);

      // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
      // this event is raised when a first call to transport.produce() is made
      // see connectSendTransport() below
      producerTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            // Signal local DTLS parameters to the server side transport
            // see server's socket.on('transport-connect', ...)
            await socket.emit("transport-connect", {
              dtlsParameters,
            });

            // Tell the transport that parameters were transmitted.
            callback();
          } catch (error) {
            errback(error);
          }
        }
      );
      console.log("1");
      producerTransport.on("produce", async (parameters, callback, errback) => {
        console.log("2");
        console.log("Producer Parameters:", parameters);

        try {
          // tell the server to create a Producer
          // with the following parameters and produce
          // and expect back a server side producer id
          // see server's socket.on('transport-produce', ...)
          rtpParameter = parameters.rtpParameters;

          await socket.emit(
            "transport-produce",
            {
              kind: parameters.kind,
              rtpParameters: parameters.rtpParameters,
              appData: parameters.appData,
            },
            ({ id, producersExist }) => {
              // Tell the transport that parameters were transmitted and provide it with the
              // server side producer's id.
              callback({ id });

              // if producers exist, then join room
              if (producersExist) getProducers();
            }
          );
          console.log("3");
        } catch (error) {
          errback(error);
        }
      });

      connectSendTransport();
    });
  };
  const createScreenSendTransport = () => {
    // see server's socket.on('createWebRtcTransport', sender?, ...)
    // this is a call from Producer, so sender = true
    socket.emit(
      "createWebRtcTransport",
      { consumer: false },
      ({ videoParams }) => {
        // The server sends back params needed
        // to create Send Transport on the client side
        if (videoParams.error) {
          console.log(videoParams.error);
          return;
        }

        console.log(videoParams);

        // creates a new WebRTC Transport to send media

        // based on the server's producer transport videoParams

        // https://mediasoup.org/documentation/v3/mediasoup-client/api/#TransportOptions
        producerScreenTransport =
          screenDevice.createScreenSendTransport(videoParams);

        // https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media
        // this event is raised when a first call to transport.produce() is made
        // see connectSendTransport() below
        producerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              // Signal local DTLS parameters to the server side transport
              // see server's socket.on('transport-connect', ...)
              await socket.emit("transport-connect", {
                dtlsParameters,
              });

              // Tell the transport that parameters were transmitted.
              callback();
            } catch (error) {
              errback(error);
            }
          }
        );

        producerTransport.on(
          "produce",
          async (parameters, callback, errback) => {
            console.log(parameters);

            try {
              // tell the server to create a Producer
              // with the following parameters and produce
              // and expect back a server side producer id
              // see server's socket.on('transport-produce', ...)
              rtpParameter = parameters.rtpParameters;
              await socket.emit(
                "transport-produce",
                {
                  kind: parameters.kind,
                  rtpParameters: parameters.rtpParameters,
                  appData: parameters.appData,
                },
                ({ id, producersExist }) => {
                  // Tell the transport that parameters were transmitted and provide it with the
                  // server side producer's id.
                  callback({ id });

                  // if producers exist, then join room
                  if (producersExist) getProducers();
                }
              );
            } catch (error) {
              errback(error);
            }
          }
        );
        connectSendTransport();
      }
    );
  };
  let rtpParameter;
  let screenRtpParameters;
  const getProducers = () => {
    socket.emit("getProducers", (producerIds) => {
      console.log(producerIds);
      // for each of the producer create a consumer
      // producerIds.forEach(id => signalNewConsumerTransport(id))
      producerIds.forEach(signalNewConsumerTransport);
    });
  };

  const connectSendTransport = async () => {
    // we now call produce() to instruct the producer transport
    // to send media to the Router
    // https://mediasoup.org/documentation/v3/mediasoup-client/api/#transport-produce
    // this action will trigger the 'connect' and 'produce' events above

    audioProducer = await producerTransport.produce(audioParams);
    videoProducer = await producerTransport.produce(videoParams);

    // audioProducerScreen = await producerTransport.produce(audioParamsScreen);
    //   videoProducerScreen = await producerTransport.produce(videoParamsScreen);


    console.log("screenShared", screenShared)
    console.log("screensharedUser............", screensharedUser)
    if (screensharedUser) {
      console.log("screensharedUser............", screensharedUser)
      audioProducerScreen = await producerTransport.produce(audioParamsScreen);
      videoProducerScreen = await producerTransport.produce(videoParamsScreen);
    }

    audioProducer.on("trackended", () => {
      console.log("audio track ended");

      // close audio track
    });

    audioProducer.on("transportclose", () => {
      console.log("audio transport ended");

      // close audio track
    });

    videoProducer.on("trackended", () => {
      console.log("video track ended");

      // close video track
    });

    videoProducer.on("transportclose", () => {
      console.log("video transport ended");

      // close video track
    });
  };

  const signalNewConsumerTransport = async (remoteProducerId) => {
    //check if we are already consuming the remoteProducerId
    if (consumingTransports.includes(remoteProducerId)) return;
    consumingTransports.push(remoteProducerId);

    await socket.emit(
      "createWebRtcTransport",
      { consumer: true },
      ({ params }) => {
        // The server sends back params needed
        // to create Send Transport on the client side
        if (params.error) {
          console.log(params.error);
          return;
        }
        console.log(`PARAMS... ${params}`);

        let consumerTransport;
        try {
          consumerTransport = device.createRecvTransport(params);
        } catch (error) {
          // exceptions:
          // {InvalidStateError} if not loaded
          // {TypeError} if wrong arguments.
          console.log(error);
          return;
        }

        consumerTransport.on(
          "connect",
          async ({ dtlsParameters }, callback, errback) => {
            try {
              // Signal local DTLS parameters to the server side transport
              // see server's socket.on('transport-recv-connect', ...)
              await socket.emit("transport-recv-connect", {
                dtlsParameters,
                serverConsumerTransportId: params.id,
              });

              // Tell the transport that parameters were transmitted.
              callback();
            } catch (error) {
              // Tell the transport that something was wrong
              errback(error);
            }
          }
        );

        connectRecvTransport(consumerTransport, remoteProducerId, params.id);
      }
    );
  };

  const connectRecvTransport = async (
    consumerTransport,
    remoteProducerId,
    serverConsumerTransportId
  ) => {
    // for consumer, we need to tell the server first
    // to create a consumer based on the rtpCapabilities and consume
    // if the router can consume, it will send back a set of params as below
    await socket.emit(
      "consume",
      {
        rtpCapabilities: device?.rtpCapabilities,
        remoteProducerId,
        serverConsumerTransportId,
      },
      async ({ params }) => {
        let paramss = JSON.stringify(params);
        if (params.error) {
          console.log("Cannot Consume");
          return;
        }

        console.log(`Consumer Params ${paramss}`);
        // then consume with the local consumer transport
        // which creates a consumer
        const consumer = await consumerTransport.consume({
          id: params.id,
          producerId: params.producerId,
          kind: params.kind,
          rtpParameters: params.rtpParameters,
        });

        consumerTransports = [
          ...consumerTransports,
          {
            consumerTransport,
            serverConsumerTransportId: params.id,
            producerId: remoteProducerId,
            consumer,
          },
        ];

        // Add event listeners for transport-connect and track events
        consumerTransport.on("connect", async () => {
          console.log("Consumer transport connected");
        });

        // create a new div element for the new consumer media
        const newElem = document.createElement("div");
        newElem.setAttribute("id", `td-${remoteProducerId}`);

        if (params.kind == "audio") {
          //append to the audio container
          console.log("Appending audio");
          newElem.innerHTML =
            '<audio id="' + remoteProducerId + '" autoPlay></audio>';
        } else {
          //append to the video container
          console.log("Appending video");
          newElem.setAttribute("class", "remoteVideo");
          newElem.innerHTML =
            '<video id="' +
            remoteProducerId +
            '" autoPlay className="video" ></video>';
        }

        videoContainer.appendChild(newElem);

        const p = document.createElement("p");
        consumer.on("track", (track) => {
          console.log("Received track from producer:", track);
          console.log(track);
          if (track.muted) {
            // Either don't display the video element
            // or display a placeholder or message
            const videoElement = document.getElementById(remoteProducerId);
            videoElement.textContent = "Video is muted";

            p.innerHTML = "Mute";
          } else {
            // Display the video track
            console.log("track......",track)
            p.innerHTML = "Un-Mute";
            const videoElement = document.getElementById(remoteProducerId);
            videoElement.srcObject = track;
            videoElement.play();
          }

          track.onunmute = () => {
            const videoElement = document.getElementById(remoteProducerId);
            videoElement.srcObject = track;
            videoElement.play();
          };
          // Handle the received track, for example, play it in a video element
        });

        // destructure and retrieve the video track from the producer
        const { track } = consumer;
        console.log("consumer track:", track);

        if (track) {
          console.log("track muted:", track);
          if (!track.muted && track.readyState === "live") {
            console.log(
              "Video track is actively being shared by the consumer."
            );
            const videoElement = document.getElementById(remoteProducerId);
            videoElement.autoplay = true;
            videoElement.srcObject = new MediaStream([track]);
            videoElement.setAttribute("height", "300");
            videoElement.setAttribute("width", "100%");
            videoElement.setAttribute("width", "100%");
            videoElement.style.border = "7px solid green";
            videoElement.style.borderRadius = "10px";
            videoElement.style.marginLeft = "10px";
            // Wait for metadata to be loaded before playing
            videoElement.addEventListener("loadedmetadata", () => {
              videoElement
                .play()
                .then(() => {
                  console.log("The video track is played");
                })
                .catch((error) => {
                  console.error("Failed to start playback:", error);
                });
            });
          } else {
            console.log(
              "Video track is not actively being shared or is muted."
            );
          }
        } else {
          console.log("No consumer track found.");
        }

        // the server consumer started with media paused
        // so we need to inform the server to resume
        socket.emit("consumer-resume", {
          serverConsumerId: params.serverConsumerId,
        });
      }
    );
  };

  useEffect(() => {
    console.log(roomId);
    setRoomName(roomId);
    // if (!roomName || !username) {
    //   alert("navigate to lobby");
    //   navigate("/");
    // } else {
      if (socket) {
        socket.on("connection-success", ({ socketId }) => {
          console.log("socketId " + socketId);
          getLocalStream();
        });

        socket.on("producer-closed", ({ remoteProducerId }) => {
          // server notification is received when a producer is closed
          // we need to close the client-side consumer and associated transport
          const producerToClose = consumerTransports.find(
            (transportData) => transportData.producerId === remoteProducerId
          );
          producerToClose.consumerTransport.close();
          producerToClose.consumer.close();

          // remove the consumer transport from the list
          consumerTransports = consumerTransports.filter(
            (transportData) => transportData.producerId !== remoteProducerId
          );

          // remove the video div element
          videoContainer.removeChild(
            document.getElementById(`td-${remoteProducerId}`)
          );
        });

        // server informs the client of a new producer just joined

        socket.on("new-producer", ({ producerId }) =>
          signalNewConsumerTransport(producerId)
        );

        // Receive and display the screen sharing stream
        socket.on("screenStream", (screenStream) => {
          // Display the screen sharing stream alongside camera and audio streams
        });

        // server informs the client of a new producer just joined

        socket.on("new-producer", ({ producerId }) =>
          signalNewConsumerTransport(producerId)
        );

        // Receive and display the screen sharing stream
        socket.on("screenStream", (screenStream) => {
          // Display the screen sharing stream alongside camera and audio streams
        });

        return () => {};
      }
    // }
  }, [socket, videoMuted]);

  // Mute/unmute audio
  const toggleAudio = () => {
    setAudioMuted(!audioMuted);
    socket.emit("mic-on-off", {
      isMic: !audioMuted,
    });
  };

  // Mute/unmute video
  const toggleVideo = () => {
    console.log("before update video muted", videoMuted);
    setVideoMuted(!videoMuted);
    console.log("after update video muted", !videoMuted);
    socket.emit("video-on-off", {
      isCamera: !videoMuted,
    });
  };

  // Trigger screen sharing
  const startScreenSharing = async () => {
    try {
      // e.preventDefault();
      setScreenShared(!screenShared);
      if (!screenShared) {
        getSharedStream();
      } else {
        localScreen.srcObject = null;
      }
      // Capture screen sharing stream

      // console.log("screenStream Kind", screenStream.getVideoTracks()[0].kind)
      // console.log("screenStream rtpParameters", screenStream.getVideoTracks()[0].rtpParameters)
      // console.log("screenStream appData", screenStream.getVideoTracks()[0].appData)

      // Send the screen sharing stream to the server
      //  socket.emit('startScreenSharing', {screenStream:screenStream});

      console.log("Screen sharing started");
      // Send the screen sharing stream to the server
      // Handle the screen sharing stream on the server and send it to other participants
    } catch (error) {
      console.error("Error accessing screen sharing:", error);
    }
  };
  console.log("videoMuted", videoMuted);
  return (
    <div id="video">
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            padding: "25px",
          }}
        >
          <button onClick={toggleAudio}>
            {audioMuted ? (
              <CiMicrophoneOff
                style={{ fontSize: "70px", color: "red", cursor: "pointer" }}
              ></CiMicrophoneOff>
            ) : (
              <CiMicrophoneOn
                style={{ fontSize: "70px", cursor: "pointer" }}
              ></CiMicrophoneOn>
            )}
          </button>
          <button onClick={startScreenSharing}>
            {screenShared ? (
              <MdOutlineTvOff
                style={{ fontSize: "70px", color: "red", cursor: "pointer" }}
              ></MdOutlineTvOff>
            ) : (
              <FaTv style={{ fontSize: "70px", cursor: "pointer" }}></FaTv>
            )}
          </button>

          <button onClick={toggleVideo}>
            {videoMuted ? (
              <BsFillCameraVideoOffFill
                style={{ fontSize: "70px", color: "red", cursor: "pointer" }}
              ></BsFillCameraVideoOffFill>
            ) : (
              <BsFillCameraVideoFill
                style={{ fontSize: "70px", cursor: "pointer" }}
              ></BsFillCameraVideoFill>
            )}
          </button>
        </div>
        <tr>
          <td>{/* Button to toggle audio mute/unmute */}</td>
          <td>{/* Button to toggle video mute/unmute */}</td>
        </tr>
      </div>
      <table className="mainTable">
        <tbody>
          <tr>
            <td>
              {/* {
            screenShared && 
          } */}
              <video
                width="500"
                height="500"
                id="localScreen"
                autoPlay
                className="videoScreen"
                muted
              ></video>
            </td>
            <td className="localColumn">
              <video
                style={{ border: "7px solid orange", marginLeft: "10px" }}
                width="500"
                height="300"
                id="localVideo"
                autoPlay
                className="video"
                muted
              ></video>
            </td>
            <td className="remoteColumn">
              <div
                id="videoContainer"
                style={{ display: "grid", gridTemplateColumns: "5" }}
              ></div>
            </td>
          </tr>
        </tbody>
      </table>
      <table>
        <tbody>
          <tr>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default VideoChatApp;
