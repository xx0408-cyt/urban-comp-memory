import React, { useEffect, useContext, useRef } from 'react';
import { TreeContext, TreeContextType } from '../types';

const MouseInput: React.FC = () => {
  const {
    setState,
    setRotationBoost,
    setPointer,
    setClickTrigger,
    setPanOffset,
    setZoomOffset,
    setSelectedPhotoUrl,
    selectedPhotoUrl
  } = useContext(TreeContext) as TreeContextType;

  // Use refs to track button states to avoid stale closures in event listeners
  const isLeftDown = useRef(false);
  const isRightDown = useRef(false);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) isLeftDown.current = true;
      if (e.button === 2) isRightDown.current = true;
      
      // Left click triggers interaction
      if (e.button === 0) {
        setClickTrigger(Date.now());
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        isLeftDown.current = false;
        setRotationBoost(0); // Reset rotation boost on release
      }
      if (e.button === 2) isRightDown.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize coordinates to 0-1 for the pointer (used for raycasting/hover)
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;
      setPointer({ x, y });

      // Left Drag: Rotate
      if (isLeftDown.current) {
        // movementX > 0 (moving right) -> spin faster (positive boost)
        // movementX < 0 (moving left) -> spin slower/reverse (negative boost)
        // Factor 0.01 seems reasonable
        setRotationBoost(e.movementX * 0.01);
      } else {
          // Ensure boost is 0 when not dragging
          setRotationBoost(0);
      }

      // Right Drag: Pan
      if (isRightDown.current) {
        setPanOffset(prev => ({
          x: prev.x + e.movementX * 0.02,
          y: prev.y - e.movementY * 0.02 // Invert Y because screen Y is down, world Y is up
        }));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      // Zoom
      // deltaY > 0 (scroll down) -> Zoom Out (increase offset)
      // deltaY < 0 (scroll up) -> Zoom In (decrease offset)
      setZoomOffset(prev => {
          const newOffset = prev + e.deltaY * 0.01;
          // Clamp is handled in Experience.tsx, but good to keep it sane here too
          return Math.max(-20, Math.min(newOffset, 20)); 
      });
    };

    const handleDoubleClick = () => {
      // Toggle View Mode
      setState(prev => prev === 'CHAOS' ? 'FORMED' : 'CHAOS');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent context menu
    };

    // Add listeners to window to catch events outside the component/canvas
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('wheel', handleWheel);
    window.addEventListener('dblclick', handleDoubleClick);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('dblclick', handleDoubleClick);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [setState, setRotationBoost, setPointer, setClickTrigger, setPanOffset, setZoomOffset]);

  return null;
};

export default MouseInput;
