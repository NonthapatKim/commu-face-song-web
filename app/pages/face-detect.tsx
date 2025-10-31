"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import { mockLyrics } from "../dist/mockLyrics";
import FaceData from "../types/face-detect";

const FaceDetectPage: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  const [detectedFaces, setDetectedFaces] = useState<FaceData[]>([]);

  // const [currentLyricText, setCurrentLyricText] = useState<string | null>(null);
  // const [currentSongInfo, setCurrentSongInfo] = useState<string | null>(null);
  // const [currentColor, setCurrentColor] = useState<string>("");
  // const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(
  //   null
  // );

  // const [hasFace, setHasFace] = useState(false);
  // const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = "/models";
      await Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)]);
      setModelsLoaded(true);
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (!modelsLoaded) return;

    const interval = setInterval(async () => {
      const video = webcamRef.current?.video;
      if (
        !video ||
        video.readyState !== 4 ||
        !video.videoWidth ||
        !video.videoHeight
      ) {
        return;
      }

      const videoNaturalWidth = video.videoWidth;
      const videoNaturalHeight = video.videoHeight;
      const containerWidth = video.clientWidth;
      const containerHeight = video.clientHeight;

      const naturalAspect = videoNaturalWidth / videoNaturalHeight;
      const containerAspect = containerWidth / containerHeight;

      let scale = 1;
      let offsetX = 0;
      let offsetY = 0;

      if (naturalAspect > containerAspect) {
        scale = containerHeight / videoNaturalHeight;
        const scaledWidth = videoNaturalWidth * scale;
        offsetX = (containerWidth - scaledWidth) / 2;
      } else {
        scale = containerWidth / videoNaturalWidth;
        const scaledHeight = videoNaturalHeight * scale;
        offsetY = (containerHeight - scaledHeight) / 2;
      }

      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
      );

      setDetectedFaces(prevFaces => {
        const newDetectedFaces: FaceData[] = [];
        const framePadding = 40;
        const maxFacesToShow = 3;

        for (let i = 0; i < Math.min(detections.length, maxFacesToShow); i++) {
          const box = detections[i].box;

          const scaledX = box.x * scale + offsetX;
          const scaledY = box.y * scale + offsetY;
          const scaledWidth = box.width * scale;
          const scaledHeight = box.height * scale;

          const flippedX = containerWidth - scaledX - scaledWidth;

          const currentFaceCenter = {
            x: flippedX + scaledWidth / 2,
            y: scaledY + scaledHeight / 2,
          };

          const existingFace = prevFaces.find(
            (face) =>
              face.lastCenter &&
              Math.hypot(
                currentFaceCenter.x - face.lastCenter.x,
                currentFaceCenter.y - face.lastCenter.y
              ) < 150
          );

          let lyricText = existingFace ? existingFace.currentLyricText : null;
          let songInfo = existingFace ? existingFace.currentSongInfo : null;
          let color = existingFace ? existingFace.currentColor : `hsl(${Math.random() * 360}, 100%, 60%)`;
          const id = existingFace ? existingFace.id : Math.random().toString(36).substring(7);

          const moved = existingFace && existingFace.lastCenter
            ? Math.hypot(
                currentFaceCenter.x - existingFace.lastCenter.x,
                currentFaceCenter.y - existingFace.lastCenter.y
              )
            : Infinity;

          if (!existingFace || moved > 250) {
            const randomLyricString =
              mockLyrics[Math.floor(Math.random() * mockLyrics.length)];
            const parts = randomLyricString.split(" | ");
            lyricText = parts[0];
            songInfo = parts.length > 1 ? parts[1] : null;
            color = `hsl(${Math.random() * 360}, 100%, 60%)`;
          }

          newDetectedFaces.push({
            id: id,
            boxStyle: {
              position: "absolute",
              left: `${flippedX - framePadding / 2}px`,
              top: `${scaledY - framePadding / 2}px`,
              width: `${scaledWidth + framePadding}px`,
              height: `${scaledHeight + framePadding}px`,
              border: `3px solid ${color}`,
              borderRadius: "8px",
              transition: "all 0.1s linear",
            },
            currentLyricText: lyricText,
            currentSongInfo: songInfo,
            currentColor: color,
            lastCenter: currentFaceCenter,
          });
        }
        
        return newDetectedFaces;
      });

    }, 200);

    return () => clearInterval(interval);
  }, [modelsLoaded]);

  const goFullScreen = () => {
    const container = mainContainerRef.current;
    if (!container) return;

    const el = container as HTMLElement & {
      mozRequestFullScreen?: () => Promise<void> | void;
      webkitRequestFullscreen?: () => Promise<void> | void;
      msRequestFullscreen?: () => Promise<void> | void;
    };

    if (el.requestFullscreen) {
      el.requestFullscreen();
    } else if (el.mozRequestFullScreen) { // Firefox
      el.mozRequestFullScreen();
    } else if (el.webkitRequestFullscreen) { // Chrome, Safari
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) { // IE
      el.msRequestFullscreen();
    }
  };

  return (
    <div
      ref={mainContainerRef}
      className="relative w-screen h-screen bg-black overflow-hidden"
    >
      <button
        onClick={goFullScreen}
        className="absolute top-4 right-4 z-50 p-2 bg-black bg-opacity-50 text-white rounded-md text-lg"
        title="แสดงเต็มจอ"
      >
        ↗️
      </button>

      <Webcam
        ref={webcamRef}
        videoConstraints={{ facingMode: "user" }}
        className="absolute top-0 left-0 w-full h-full object-cover"
        mirrored={true}
      />

      {detectedFaces.map((face) => (
        <div key={face.id} style={face.boxStyle}>
          {(face.currentLyricText || face.currentSongInfo) && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: "50%",
                transform: "translateX(-50%)",
                marginBottom: "8px",
                width: "100%",
                maxWidth: "550px", 
                display: "flex",
                flexDirection: "column",
                zIndex: 45,
              }}
            >
              {face.currentLyricText && (
                <div
                  style={{
                    backgroundColor: `rgba(119, 54, 241, 0.7)`, 
                    color: "#ffffff",
                    padding: "5px 10px",
                    fontSize: "20px",
                    fontWeight: "bold",
                    textAlign: "center",
                    borderRadius: "4px 4px 0 0",
                    ...(!face.currentSongInfo && { borderRadius: "4px" }),
                  }}
                >
                  {face.currentLyricText}
                </div>
              )}

              {face.currentSongInfo && (
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    padding: "4px 10px",
                    fontSize: "14px",
                    fontWeight: "600",
                    textAlign: "center",
                    borderRadius: "0 0 4px 4px",
                  }}
                >
                  {face.currentSongInfo}
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {!modelsLoaded && (
        <div className="absolute bottom-4 w-full text-center text-gray-400">
          กำลังโหลดโมเดล...
        </div>
      )}

      <Image
        src="/commu-cosci-logo.png"
        width={350}
        height={150}
        alt="Commu-Cosci Logo"
        className="absolute bottom-0 left-1/2 -translate-x-1/2 z-40 w-72 opacity-100"
      />
    </div>
  );
};

export default FaceDetectPage;