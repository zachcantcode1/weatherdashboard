// src/pages/HomePage.jsx
import React from 'react';
import LightningStormPro from '../components/LightningStormPro';

const HomePage = () => {
  return (
    <div className="relative flex flex-col items-center justify-center h-full overflow-hidden">
      {/* Animated Gradient Background - CSS will be in index.css */}
      <div className="animated-gradient-bg absolute inset-0 -z-10 w-full h-full"></div>
      {/* Canvas-based lightning storm overlay */}
      <LightningStormPro />
      <div className="z-10 text-center px-4">
        <h1 
          className="text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 
                     animate-fadeInScaleUp opacity-0"
          style={{ animationDelay: '0.5s', animationFillMode: 'forwards' }}
        >
          WX DASHBOARD
        </h1>
        <p 
          className="text-xl md:text-2xl text-gray-200 mb-4 
                     animate-fadeInUp opacity-0"
          style={{ animationDelay: '1s', animationFillMode: 'forwards' }}
        >
          Your central hub for comprehensive weather intelligence.
        </p>
        <p 
          className="text-lg md:text-xl text-gray-300 
                     animate-fadeInUp opacity-0"
          style={{ animationDelay: '1.5s', animationFillMode: 'forwards' }}
        >
          Stay informed. Stay ahead.
        </p>
      </div>
    </div>
  );
};

export default HomePage;
