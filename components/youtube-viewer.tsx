import React, { CSSProperties } from 'react';

interface YouTubeProps {
  code: string;
  title?: string;
  className?: string;
}

export default function YouTube({ code, title = 'YouTube video player'}: YouTubeProps) {
  const containerStyle: CSSProperties = {
    position: 'relative',
    width: '100%',
    paddingTop: '56.25%', // 16:9 aspect ratio
    borderRadius: '0.5rem',
  };

  const iframeStyle: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: '0.5rem',
  };

  return (
    <div style={containerStyle}>
      <iframe
        style={iframeStyle}
        src={`https://www.youtube.com/embed/${code}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
} 