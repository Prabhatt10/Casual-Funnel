import mongoose from 'mongoose';

const EventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true
    },
    eventType: {
      type: String,
      enum: ['page_view', 'click', 'mouse_move', 'scroll', 'window_resize'],
      required: true
    },
    pageUrl: {
      type: String,
      required: true,
      index: true
    },
    timestamp: {
      type: Date,
      required: true,
      index: true
    },
    coordinates: {
      x: {
        type: Number,
        default: null
      },
      y: {
        type: Number,
        default: null
      }
    },
    scroll: {
      scrollY: {
        type: Number,
        default: null
      },
      scrollPercentage: {
        type: Number,
        default: null
      }
    },
    resize: {
      windowWidth: {
        type: Number,
        default: null
      },
      windowHeight: {
        type: Number,
        default: null
      }
    }
  },
  {
    timestamps: true
  }
);

// Compound index for optimizing heatmap and event lookups
EventSchema.index({ pageUrl: 1, eventType: 1 });

const Event = mongoose.model('Event', EventSchema);

export default Event;
