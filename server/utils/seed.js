import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Event from '../models/Event.js';
import connectDB from '../config/db.js';

dotenv.config();

// Custom mock session generation
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString().slice(-4);
};

const pages = [
  '/home',
  '/about',
  '/pricing',
  '/contact',
  '/features',
  '/blog'
];

// Seed configurations
const SESSIONS_COUNT = 15;
const DAYS_SPAN = 7;

const seedDatabase = async () => {
  try {
    await connectDB();
    
    // Clear existing data
    console.log('Clearing database events...');
    await Event.deleteMany({});
    
    const events = [];
    const now = new Date();

    console.log(`Generating mock events across the last ${DAYS_SPAN} days with mouse moves and scrolls...`);

    for (let i = 0; i < SESSIONS_COUNT; i++) {
      const sessionId = generateSessionId();
      
      // Distribute session dates randomly across last 7 days
      const dayOffset = Math.floor(Math.random() * DAYS_SPAN);
      const sessionBaseDate = new Date(now);
      sessionBaseDate.setDate(now.getDate() - dayOffset);
      sessionBaseDate.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );

      let currentTimestamp = new Date(sessionBaseDate);
      
      // Define viewport resolution for this session
      const browserWidths = [1280, 1440, 1920, 375, 414];
      const browserHeights = [800, 900, 1080, 812, 896];
      const resIdx = Math.floor(Math.random() * browserWidths.length);
      const windowWidth = browserWidths[resIdx];
      const windowHeight = browserHeights[resIdx];

      let currentPage = '/home';
      
      // 1. Initial Page View
      events.push({
        sessionId,
        eventType: 'page_view',
        pageUrl: currentPage,
        timestamp: new Date(currentTimestamp)
      });

      // 2. Initial Window Resize event
      currentTimestamp = new Date(currentTimestamp.getTime() + 100);
      events.push({
        sessionId,
        eventType: 'window_resize',
        pageUrl: currentPage,
        timestamp: new Date(currentTimestamp),
        resize: { windowWidth, windowHeight }
      });

      let lastX = Math.round(windowWidth / 2);
      let lastY = Math.round(windowHeight / 2);
      
      // Active vs inactive sessions
      let actionCount = 4 + Math.floor(Math.random() * 6); // clicks or page switches
      if (i === 0 || i === 1) {
        actionCount = 12 + Math.floor(Math.random() * 8); // heavy interaction sessions
      }

      for (let j = 0; j < actionCount; j++) {
        // Increment timestamp to separate actions (5 to 30 seconds)
        const idleSeconds = 5 + Math.floor(Math.random() * 25);
        currentTimestamp = new Date(currentTimestamp.getTime() + idleSeconds * 1000);

        // Decide next primary action: 80% interaction on current page, 20% navigate
        const navigate = Math.random() < 0.20;

        if (navigate) {
          // Navigating
          const newPageIndex = Math.floor(Math.random() * pages.length);
          currentPage = pages[newPageIndex];
          
          events.push({
            sessionId,
            eventType: 'page_view',
            pageUrl: currentPage,
            timestamp: new Date(currentTimestamp)
          });

          // Also trigger a resize record on navigation loading
          currentTimestamp = new Date(currentTimestamp.getTime() + 100);
          events.push({
            sessionId,
            eventType: 'window_resize',
            pageUrl: currentPage,
            timestamp: new Date(currentTimestamp),
            resize: { windowWidth, windowHeight }
          });

          // Reset cursor path logic
          lastX = Math.round(windowWidth / 2);
          lastY = Math.round(windowHeight / 2);

        } else {
          // Interaction: click CTA. Generate target coordinates
          const targetX = Math.floor(Math.random() * (windowWidth - 40)) + 20;
          const targetY = Math.floor(Math.random() * (windowHeight * 1.5 - 40)) + 20; // page can be longer

          // A. If target coordinates are below fold, generate scroll steps first
          if (targetY > windowHeight) {
            const scrollSteps = 3;
            const targetScrollY = targetY - 200;
            const pageMaxScroll = windowHeight * 0.8; // mock scroll limit
            
            for (let step = 1; step <= scrollSteps; step++) {
              const currentScrollY = Math.round((targetScrollY / scrollSteps) * step);
              currentTimestamp = new Date(currentTimestamp.getTime() + 200);
              
              events.push({
                sessionId,
                eventType: 'scroll',
                pageUrl: currentPage,
                timestamp: new Date(currentTimestamp),
                scroll: {
                  scrollY: currentScrollY,
                  scrollPercentage: parseFloat(((currentScrollY / pageMaxScroll) * 100).toFixed(2))
                }
              });
            }
          }

          // B. Generate interpolation steps for mouse movement trajectory leading up to the click
          const moveSteps = 5;
          for (let step = 1; step <= moveSteps; step++) {
            const ratio = step / moveSteps;
            // Simple linear path. We can add a slight sine curve to make it look even more natural!
            const curveOffset = Math.sin(ratio * Math.PI) * 40;
            
            const mx = Math.round(lastX + (targetX - lastX) * ratio);
            const my = Math.round(lastY + (targetY - lastY) * ratio + curveOffset);
            
            currentTimestamp = new Date(currentTimestamp.getTime() + 200); // 200ms sample interval
            events.push({
              sessionId,
              eventType: 'mouse_move',
              pageUrl: currentPage,
              timestamp: new Date(currentTimestamp),
              coordinates: { x: mx, y: my }
            });
          }

          // C. Log the click event at the final coordinate destination
          currentTimestamp = new Date(currentTimestamp.getTime() + 150);
          events.push({
            sessionId,
            eventType: 'click',
            pageUrl: currentPage,
            timestamp: new Date(currentTimestamp),
            coordinates: { x: targetX, y: targetY }
          });

          // Save last cursor coordinates
          lastX = targetX;
          lastY = targetY;
        }
      }
    }

    console.log(`Inserting ${events.length} seed events (including cursor traces and scrolls) into MongoDB...`);
    await Event.insertMany(events);
    console.log('Database seeded successfully with rich replay pathways!');
    
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
