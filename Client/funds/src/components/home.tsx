"use client";
import React from 'react';
import HeroSectionOne from './hero-section-demo-1';

export const Home: React.FC = () => {
  return (
    <section className="flex items-center justify-center min-h-screen">
        <div className="w-full max-w-4xl">
            <HeroSectionOne />
        </div>
    </section>
  );
};
