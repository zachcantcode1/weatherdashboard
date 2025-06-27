import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatInTimeZone } from 'date-fns-tz';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils"; // Import cn utility

const SOCKET_SERVER_URL = 'http://localhost:3001';

export function AlertsSidebar({ className }) { // Accept className prop
  const [alerts, setAlerts] = useState([]);
  const [selectedAlertForDetails, setSelectedAlertForDetails] = useState(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socket.on('connect', () => console.log('Connected to Socket.IO server'));

    socket.on('new-alert', (parsedAlert) => {
      console.log('Received parsed alert:', parsedAlert); // Log the full alert object
      // Ensure parsedAlert.id is used directly if it's the CAP identifier
      setAlerts(prevAlerts => [parsedAlert, ...prevAlerts]);
    });

    socket.on('disconnect', () => console.log('Disconnected from Socket.IO server'));

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleViewDetails = (alert) => {
    setSelectedAlertForDetails(alert);
    setIsDetailsDialogOpen(true);
  };

  const handleViewOnMap = (alert) => {
    console.log('AlertsSidebar: handleViewOnMap called with alert:', JSON.parse(JSON.stringify(alert))); // Log the whole alert (deep copy for better inspection)
    console.log('AlertsSidebar: alert.geometry before navigating:', alert.geometry); // Log just the geometry
    if (alert.geometry) {
      navigate('/map', { state: { alertGeometry: alert.geometry } });
    } else {
      // Optionally, navigate to map with a default view or show a message
      console.warn('No geometry data available for this alert to view on map.');
      navigate('/map'); // Navigate to map even without specific geometry
    }
  };

  return (
    // Apply className using cn
    <aside className={cn("hidden lg:flex flex-col w-80 border-l bg-background p-4", className)}>
      <h2 className="text-lg font-semibold mb-4 px-2">Severe Weather Alerts</h2>
      <ScrollArea className="flex-grow h-0">
        <div className="p-2">
          {alerts.length > 0 ? (
            alerts.map((alert) => (
              <ContextMenu key={alert.id}> {/* Key moved here, ContextMenuProvider removed */}
                <ContextMenuTrigger>
                  <TooltipProvider delayDuration={300}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Card className="hover:shadow-md transition-shadow cursor-default mb-3">
                          <CardHeader className="p-3">
                            <CardTitle className="text-base truncate">{alert.productType}</CardTitle>
                            <CardDescription>{alert.affectedArea}</CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 pt-0">
                            {alert.states && alert.states.length > 0 && (
                                <p className="text-sm text-muted-foreground"><span className="font-semibold">State(s):</span> {alert.states.join(', ')}</p>
                            )}
                            <p className="text-sm text-muted-foreground">Expires: {alert.expires && alert.expires !== 'N/A' ? formatInTimeZone(new Date(alert.expires), 'America/Chicago', 'h:mm a zzz') : 'N/A'}</p>
                          </CardContent>
                        </Card>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="max-w-xs z-[5000]">
                        <p className="text-sm font-medium">{alert.headline || 'No headline'}</p>
                        {alert.description && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{alert.description.substring(0, 200)}{alert.description.length > 200 ? '...' : ''}</p>}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => handleViewDetails(alert)}>
                    Alert Details
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => handleViewOnMap(alert)} disabled={!alert.geometry}>
                    View on Map
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            ))
          ) : (
            <div className="text-center text-muted-foreground p-4">
              <p>Waiting for new alerts...</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedAlertForDetails && (
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[600px] z-[5001]">
            <DialogHeader>
              <DialogTitle>{selectedAlertForDetails.productType}</DialogTitle>
              <DialogDescription>
                {selectedAlertForDetails.headline}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] my-4">
                <pre className="whitespace-pre-wrap text-sm p-1">
                    {selectedAlertForDetails.rawText || selectedAlertForDetails.description || 'No detailed text available.'}
                </pre>
            </ScrollArea>
            <DialogFooter className="sm:justify-start">
              <DialogClose asChild>
                <button type="button" className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90">
                  Close
                </button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </aside>
  );
}
