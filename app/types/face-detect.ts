export default interface FaceData {
  id: string;
  boxStyle: React.CSSProperties;
  currentLyricText: string | null;
  currentSongInfo: string | null;
  currentColor: string;
  lastCenter: { x: number; y: number } | null;
}