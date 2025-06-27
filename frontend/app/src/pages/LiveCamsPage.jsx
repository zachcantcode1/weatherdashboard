import React, { useState } from 'react';
import { VideoPlayer } from '@/components/VideoPlayer'; // We'll create this next

const initialCamSources = Array.from({ length: 9 }, (_, index) => ({
  id: `cam-${index}`,
  src: 'https://www.youtube.com/embed/dQw4w9WgXcQ', // Placeholder
  title: `Live Cam ${index + 1}` // Unique title
}));

export function LiveCamsPage() {
  const [camSources, setCamSources] = useState(() => {
    const loadedCamSources = initialCamSources.map(cam => {
      try {
        const savedSrc = localStorage.getItem(`videoPlayerSrc_${cam.id}`);
        return savedSrc ? { ...cam, src: savedSrc } : cam;
      } catch (error) {
        console.error(`Error reading localStorage for cam ${cam.id}:`, error);
        return cam; // Fallback to default
      }
    });
    return loadedCamSources;
  });

  const handleUpdateCamSrc = (camId, newSrc) => {
    setCamSources(prevSources =>
      prevSources.map(cam => {
        if (cam.id === camId) {
          try {
            localStorage.setItem(`videoPlayerSrc_${camId}`, newSrc);
          } catch (error) {
            console.error(`Error writing to localStorage for cam ${camId}:`, error);
          }
          return { ...cam, src: newSrc };
        }
        return cam;
      })
    );
  };

  return (
    <div className="flex-1 p-6 bg-background">
      <h1 className="text-3xl font-semibold mb-6 text-foreground">Live Cams</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {camSources.map((cam) => (
          <VideoPlayer
            key={cam.id}
            camId={cam.id}
            initialSrc={cam.src}
            title={cam.title}
            onUpdateSrc={handleUpdateCamSrc}
          />
        ))}
      </div>
    </div>
  );
}
