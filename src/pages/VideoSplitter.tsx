import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createFFmpeg, fetchFile } from "@ffmpeg/ffmpeg";

const VideoSplitter: React.FC = () => {
  const [video, setVideo] = useState<File | null>(null);
  const [numParts, setNumParts] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [videoParts, setVideoParts] = useState<Array<{ name: string; url: string }>>([]);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [ffmpegLoaded, setFfmpegLoaded] = useState<boolean>(false);
  const [ffmpegError, setFfmpegError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const ffmpegRef = useRef<any>(null);

  useEffect(() => {
    // Check for SharedArrayBuffer support
    const hasSharedArrayBuffer = typeof SharedArrayBuffer !== "undefined";
    
    if (!hasSharedArrayBuffer) {
      setFfmpegError(
        "This app requires SharedArrayBuffer which is only available when served with proper security headers. Please ensure you're accessing this app through a secure server."
      );
      return;
    }

    // Load FFmpeg
    const loadFFmpeg = async () => {
      try {
        const ffmpeg = createFFmpeg({
          log: true,
          corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
        });
        
        await ffmpeg.load();
        ffmpegRef.current = ffmpeg;
        setFfmpegLoaded(true);
        toast.success("FFmpeg loaded successfully!");
      } catch (error) {
        console.error("Failed to load FFmpeg:", error);
        setFfmpegError(
          "Failed to load FFmpeg. Please ensure you're accessing this app through a secure server with proper security headers."
        );
      }
    };

    loadFFmpeg();

    // Clean up function
    return () => {
      // Clean up any blobs
      videoParts.forEach(part => {
        URL.revokeObjectURL(part.url);
      });
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, []);

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if the file is a video
    if (!file.type.startsWith('video/')) {
      toast.error("Please upload a valid video file");
      return;
    }

    setVideo(file);
    
    // Update preview
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // Reset parts
    videoParts.forEach(part => {
      URL.revokeObjectURL(part.url);
    });
    setVideoParts([]);
  };

  const splitVideo = async () => {
    if (!video || !ffmpegLoaded || !ffmpegRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const FFmpeg = ffmpegRef.current;
      const videoData = await video.arrayBuffer();
      
      // Write the input file to FFmpeg's file system
      FFmpeg.FS('writeFile', 'input.mp4', new Uint8Array(videoData));
      
      // Get video duration using FFmpeg
      await FFmpeg.run('-i', 'input.mp4');
      
      // We need to get video duration somehow
      // Since we can't directly get it from FFmpeg output, we'll use the video element
      const videoDuration = videoRef.current?.duration || 0;
      if (videoDuration === 0) {
        throw new Error("Could not determine video duration");
      }
      
      const partDuration = videoDuration / numParts;
      const newVideoParts = [];
      
      // Process each part
      for (let i = 0; i < numParts; i++) {
        setProgress(Math.round((i / numParts) * 100));
        
        const startTime = i * partDuration;
        const outputFileName = `output_${i + 1}.mp4`;
        
        // Split the video
        await FFmpeg.run(
          '-i', 'input.mp4',
          '-ss', startTime.toString(),
          '-t', partDuration.toString(),
          '-c', 'copy',
          outputFileName
        );
        
        // Read the output file
        const data = FFmpeg.FS('readFile', outputFileName);
        
        // Create a blob and URL
        const blob = new Blob([data.buffer], { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        
        newVideoParts.push({
          name: `video-part-${i + 1}.mp4`,
          url
        });
        
        // Clean up the output file in FFmpeg's file system
        FFmpeg.FS('unlink', outputFileName);
      }
      
      // Clean up the input file
      FFmpeg.FS('unlink', 'input.mp4');
      
      setVideoParts(newVideoParts);
      toast.success(`Video successfully split into ${numParts} parts!`);
    } catch (error) {
      console.error("Error splitting video:", error);
      toast.error("Error splitting video. Please try again with a different video or fewer parts.");
    } finally {
      setIsProcessing(false);
      setProgress(100);
    }
  };

  const downloadAllParts = () => {
    if (videoParts.length === 0) return;
    
    // Download each part with a slight delay to avoid browser limitations
    videoParts.forEach((part, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = part.url;
        link.download = part.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 1000); // 1 second delay between downloads
    });
    
    toast.success("Downloading all parts...");
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-center">Video Splitter</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ffmpegError ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline"> {ffmpegError}</span>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="video-upload" className="block text-sm font-medium">
                  Upload Video
                </label>
                <Input
                  id="video-upload"
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  disabled={isProcessing}
                  className="block w-full text-sm"
                />
              </div>

              {videoUrl && (
                <div className="mt-4">
                  <video 
                    ref={videoRef}
                    className="w-full h-auto rounded" 
                    src={videoUrl} 
                    controls 
                  />
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Number of Parts: {numParts}
                </label>
                <Slider
                  value={[numParts]}
                  min={1}
                  max={100}
                  step={1}
                  onValueChange={(value) => setNumParts(value[0])}
                  disabled={isProcessing}
                />
              </div>

              <Button 
                onClick={splitVideo} 
                disabled={!video || isProcessing || !ffmpegLoaded}
                className="w-full mt-4"
              >
                {isProcessing ? "Processing..." : "Split Video"}
              </Button>

              {isProcessing && (
                <Progress value={progress} className="w-full mt-2" />
              )}
            </>
          )}
          
          {videoParts.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-2">Download Video Parts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {videoParts.map((part, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    asChild
                    className="text-left"
                  >
                    <a href={part.url} download={part.name}>
                      {part.name}
                    </a>
                  </Button>
                ))}
              </div>
              <Button 
                onClick={downloadAllParts} 
                className="w-full mt-4"
              >
                Download All Parts
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm text-gray-500 flex justify-center">
          <p>Upload a video and specify how many parts you want to split it into.</p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VideoSplitter;
