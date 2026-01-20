import React, { useEffect } from 'react';

interface BackgroundVideoProps {
  videoUrl?: string;
}

const BackgroundVideo: React.FC<BackgroundVideoProps> = ({ videoUrl }) => {
  useEffect(() => {
    // Find the video tag defined manually in index.html
    const videoElement = document.getElementById('bg-video') as HTMLVideoElement;
    
    // Only attempt to change the source if a custom URL is provided via React/Backend
    if (videoElement && videoUrl) {
      // Avoid reloading if the source is effectively the same (checking endsWith to handle relative vs absolute)
      const currentSrc = videoElement.currentSrc || videoElement.src;
      
      if (!currentSrc.includes(videoUrl)) {
          videoElement.src = videoUrl;
          videoElement.load(); // Reload the video element to apply the new source
          videoElement.play().catch(e => console.log("Autoplay update prevented:", e));
      }
    }
  }, [videoUrl]);

  // This component does not render its own DOM; it manages the existing static HTML video
  return null;
};

export default BackgroundVideo;