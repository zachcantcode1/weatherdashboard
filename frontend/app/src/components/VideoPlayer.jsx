import React, { useState, useRef } from 'react'; // Removed useEffect
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose, // Added DialogClose
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label"; // Added Label
import { RefreshCw, Edit3 } from 'lucide-react';

export function VideoPlayer({ camId, initialSrc, title, onUpdateSrc }) {
  const [currentSrc, setCurrentSrc] = useState(initialSrc);
  const [iframeKey, setIframeKey] = useState(Date.now()); // Key to force iframe reload
  const iframeRef = useRef(null);
  const [isChangeSourceDialogOpen, setIsChangeSourceDialogOpen] = useState(false);
  const [newSrcInput, setNewSrcInput] = useState(initialSrc);

  const handleRefresh = () => {
    setIframeKey(Date.now());
    console.log(`Refreshing iframe for player ${camId} with src: ${currentSrc}`);
  };

  const openChangeSourceDialog = () => {
    setNewSrcInput(currentSrc); // Pre-fill with current source
    setIsChangeSourceDialogOpen(true);
  };

  const handleChangeSource = () => {
    setCurrentSrc(newSrcInput);
    if (onUpdateSrc) { // Call prop if provided
      onUpdateSrc(camId, newSrcInput);
    }
    setIframeKey(Date.now()); // Force reload with new src
    setIsChangeSourceDialogOpen(false);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Video player iframe wrapper */}
      <div 
        className="aspect-video bg-card border rounded-lg shadow-lg overflow-hidden flex flex-col relative"
      >
        <iframe
          ref={iframeRef}
          key={iframeKey}
          src={currentSrc}
          title={title || `Video Player ${camId}`}
          className="w-full h-full border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
        ></iframe>
      </div>

      {/* Buttons below the video player */}
      <div className="flex justify-start space-x-2 mt-2">
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={openChangeSourceDialog}>
          <Edit3 className="mr-2 h-4 w-4" />
          Change Source
        </Button>
      </div>

      {/* Dialog for changing source URL */}
      <Dialog open={isChangeSourceDialogOpen} onOpenChange={setIsChangeSourceDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change Video Source URL</DialogTitle>
            <DialogDescription>
              Enter the new embed URL for {title || `Cam ${camId}`}. Make sure it's a valid embeddable URL.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor={`src-url-${camId}`} className="text-right">
                URL
              </Label>
              <Input
                id={`src-url-${camId}`}
                value={newSrcInput}
                onChange={(e) => setNewSrcInput(e.target.value)}
                className="col-span-3"
                placeholder="https://www.youtube.com/embed/..."
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="button" onClick={handleChangeSource}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
