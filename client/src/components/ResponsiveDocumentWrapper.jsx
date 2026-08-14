import React, { useRef, useEffect, useState } from 'react';

/**
 * A wrapper component that makes a fixed-width document (like an 820px invoice) 
 * behave exactly like a responsive <img> element.
 * 
 * It monitors the available container width using ResizeObserver and applies a CSS 
 * `transform: scale()` while calculating and applying the collapsed height, so it 
 * doesn't leave huge empty margins.
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children The document to wrap
 * @param {number} props.documentWidth The exact design width of the document (default 820)
 */
export default function ResponsiveDocumentWrapper({ children, documentWidth = 820 }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [scaledHeight, setScaledHeight] = useState('auto');

  useEffect(() => {
    if (!containerRef.current || !contentRef.current) return;
    
    const resizeObserver = new ResizeObserver(() => {
      if (!containerRef.current || !contentRef.current) return;
      
      const availableWidth = containerRef.current.getBoundingClientRect().width;
      const actualContentHeight = contentRef.current.scrollHeight;
      
      if (availableWidth < documentWidth) {
        const newScale = availableWidth / documentWidth;
        setScale(newScale);
        setScaledHeight(`${actualContentHeight * newScale}px`);
      } else {
        setScale(1);
        setScaledHeight('auto');
      }
    });

    resizeObserver.observe(containerRef.current);
    resizeObserver.observe(contentRef.current);

    return () => resizeObserver.disconnect();
  }, [documentWidth]);

  return (
    <div 
      ref={containerRef} 
      className="w-full flex justify-center print:block print:w-auto"
      style={{ overflow: 'hidden' }}
    >
      <div 
        className="print-reset"
        style={{ 
          height: scaledHeight,
          width: `${documentWidth}px`,
          position: 'relative',
        }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: `${documentWidth}px`,
            position: 'absolute',
            top: 0,
            left: 0,
          }}
          className="print-transform-reset"
        >
          {children}
        </div>
      </div>
      
      <style>{`
        @media print {
          .print-reset {
            height: auto !important;
            width: 100% !important;
            position: static !important;
          }
          .print-transform-reset {
            transform: none !important;
            width: 100% !important;
            position: static !important;
          }
        }
      `}</style>
    </div>
  );
}
