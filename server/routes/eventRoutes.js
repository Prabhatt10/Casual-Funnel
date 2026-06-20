import express from 'express';
import {
  createEvent,
  getSessions,
  getSessionDetails,
  getSessionReplay,
  getHeatmapData,
  getDashboardStats,
  clearAllEvents
} from '../controllers/eventController.js';

const router = express.Router();

router.route('/events')
  .post(createEvent)
  .delete(clearAllEvents);

router.route('/sessions')
  .get(getSessions);

router.route('/sessions/:sessionId')
  .get(getSessionDetails);

router.route('/replay/:sessionId')
  .get(getSessionReplay);

router.route('/heatmap')
  .get(getHeatmapData);

router.route('/stats')
  .get(getDashboardStats);

export default router;
