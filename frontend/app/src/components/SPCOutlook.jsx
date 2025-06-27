import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

const outlooks = [
  {
    title: "Day 1 Categorical Outlook",
    imgUrl: "https://www.spc.noaa.gov/products/outlook/day1otlk.gif",
  },
  {
    title: "Tornado Outlook",
    imgUrl: "https://www.spc.noaa.gov/products/outlook/day1probotlk_torn.gif",
  },
  {
    title: "Hail Outlook",
    imgUrl: "https://www.spc.noaa.gov/products/outlook/day1probotlk_hail.gif",
  },
  {
    title: "Wind Outlook",
    imgUrl: "https://www.spc.noaa.gov/products/outlook/day1probotlk_wind.gif",
  },
];

const mainOutlookTextUrl = "https://www.spc.noaa.gov/products/outlook/day1otlk.txt";

const proxyUrl = 'https://corsproxy.io/?key=b3c6360e&url=';
const preventFileCaching = (url) => {
    return `${url}?nocache=${new Date().getTime()}`;
}

export function SPCOutlook() {
  const [outlookText, setOutlookText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const fetchOutlookText = async () => {
      setIsLoading(true);
      try {
        const fullUrl = proxyUrl + preventFileCaching(mainOutlookTextUrl);
        const response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
        const text = await response.text();
        setOutlookText(text);
      } catch (error) {
        console.error(`Error fetching outlook text:`, error);
        setOutlookText(`Could not load outlook text. ${error.message}`);
      }
      setIsLoading(false);
    };
    fetchOutlookText();
  }, []);

  useEffect(() => {
    if (!api) return;
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  const currentOutlook = outlooks[current];

  return (
    <Card>
      <CardHeader>
        <CardTitle>SPC Day 1 Convective Outlooks</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <Carousel setApi={setApi} className="w-full max-w-3xl">
          <CarouselContent>
            {outlooks.map((outlook, index) => (
              <CarouselItem key={index}>
                <img 
                  src={preventFileCaching(outlook.imgUrl)} 
                  alt={outlook.title} 
                  className="w-full aspect-video object-contain border rounded-md bg-muted/20"
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>

        <div className="w-full max-w-3xl mt-4">
          <h3 className="text-lg font-semibold text-center mb-2">{currentOutlook.title}</h3>
          <ScrollArea className="h-72 w-full rounded-md border p-4">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                outlookText
              )}
            </pre>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
