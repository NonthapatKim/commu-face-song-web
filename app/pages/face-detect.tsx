"use client";
import Image from "next/image";
import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import Webcam from "react-webcam";
import { mockLyrics } from "../dist/mockLyrics";

const FaceDetectPage: React.FC = () => {
  const webcamRef = useRef<Webcam>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [currentLyricText, setCurrentLyricText] = useState<string | null>(null);
  const [currentSongInfo, setCurrentSongInfo] = useState<string | null>(null);
  const [currentColor, setCurrentColor] = useState<string>("");
  const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(
    null
  );
  const [hasFace, setHasFace] = useState(false);
  const [boxStyle, setBoxStyle] = useState<React.CSSProperties>({});

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

      // คำนวณหา scale และ offset ที่ `object-cover` ทำ
      if (naturalAspect > containerAspect) {
        // วิดีโอ "กว้าง" กว่าจอ (เช่น 16:9 ในจอ 4:3) -> จะโดนตัดซ้าย/ขวา
        scale = containerHeight / videoNaturalHeight;
        const scaledWidth = videoNaturalWidth * scale;
        offsetX = (containerWidth - scaledWidth) / 2;
      } else {
        // วิดีโอ "สูง" กว่าจอ (เช่น 4:3 ในจอ 16:9) -> จะโดนตัดบน/ล่าง
        scale = containerWidth / videoNaturalWidth;
        const scaledHeight = videoNaturalHeight * scale;
        offsetY = (containerHeight - scaledHeight) / 2;
      }

      const detections = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 })
      );


      if (detections.length > 0) {
        const box = detections[0].box; // พิกัดจากวิดีโอขนาดจริง

        // เอาพิกัดจริงมาคูณ scale และบวก offset
        const scaledX = box.x * scale + offsetX;
        const scaledY = box.y * scale + offsetY;
        const scaledWidth = box.width * scale;
        const scaledHeight = box.height * scale;

        // (ความกว้างจอ - พิกัด X ที่สเกลแล้ว - ความกว้างกรอบที่สเกลแล้ว)
        const flippedX = containerWidth - scaledX - scaledWidth;

        const center = {
          x: flippedX + scaledWidth / 2,
          y: scaledY + scaledHeight / 2,
        };

        const moved = lastCenter
          ? Math.hypot(center.x - lastCenter.x, center.y - lastCenter.y)
          : Infinity;

        if (!hasFace || moved > 120) {
          const randomLyricString =
            mockLyrics[Math.floor(Math.random() * mockLyrics.length)];
          const randomColor = `hsl(${Math.random() * 360}, 100%, 60%)`;

          const parts = randomLyricString.split(" | ");
          const lyric = parts[0];
          const songInfo = parts.length > 1 ? parts[1] : null;

          setCurrentLyricText(lyric);
          setCurrentSongInfo(songInfo);
          setCurrentColor(randomColor);
          setHasFace(true);
        }

        setLastCenter(center);

        setBoxStyle({
          position: "absolute",
          left: `${flippedX}px`, // ใช้ X ที่กลับด้านแล้ว
          top: `${scaledY}px`, // ใช้ Y ที่สเกลแล้ว
          width: `${scaledWidth}px`,
          height: `${scaledHeight}px`,
          border: `3px solid ${currentColor}`,
          borderRadius: "8px",
          transition: "all 0.1s linear",
        });
      } else {
        if (hasFace) {
          setHasFace(false);
          setCurrentLyricText(null);
          setCurrentSongInfo(null);
          setBoxStyle({});
        }
      }
    }, 200); // ลด interval ลงเล็กน้อยเพื่อให้ตอบสนองเร็วขึ้น

    return () => clearInterval(interval);
  }, [modelsLoaded, hasFace, currentColor, lastCenter]);

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

      {hasFace && (
        <div style={boxStyle}>
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              marginBottom: "8px",
              // backgroundColor: "rgba(0, 0, 0, 0.7)",
              // color: "#ffffff",
              padding: "5px 10px",
              font: "20px 'Prompt', sans-serif",
              borderRadius: "4px",
              textAlign: "center",
              width: "100%",
              boxSizing: "border-box",
            }}
          >
            {currentLyricText && (
              <div
                style={{
                  backgroundColor: "rgba(119, 54, 241, 0.7)",
                  color: "#ffffff",
                  padding: "5px 10px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  textAlign: "center",
                  borderRadius: "4px 4px 0 0",
                  ...( !currentSongInfo && { borderRadius: "4px" } )
                }}
              >
                {currentLyricText}
              </div>
            )}

            {currentSongInfo && (
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
                {currentSongInfo}
              </div>
            )}
          </div>
        </div>
      )}

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
        className="absolute bottom-2 left-1/2 -translate-x-1/2 z-40 w-64 opacity-100"
      />
    </div>
  );
};

export default FaceDetectPage;