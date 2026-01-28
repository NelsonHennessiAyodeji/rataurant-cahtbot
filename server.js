const express = require("express");
const session = require("express-session");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

// For Vercel serverless, use a compatible session store
const MemoryStore = require("memorystore")(session);

const app = express();

// Get port from environment or use 3000
const PORT = process.env.PORT || 3000;

// CORS configuration
app.use(
  cors({
    origin: true, // Allow all origins in development
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Static files - use absolute path
const publicPath = path.join(__dirname, "../public");
app.use(
  express.static(publicPath, {
    extensions: ["html", "css", "js"],
    setHeaders: (res, path) => {
      if (path.endsWith(".css")) {
        res.setHeader("Content-Type", "text/css");
      }
    },
  })
);

// Session configuration for Vercel
app.use(
  session({
    secret: process.env.SESSION_SECRET || "restaurant-chatbot-secret-key-2024",
    resave: false,
    saveUninitialized: false, // Changed to false for security
    store: new MemoryStore({
      checkPeriod: 86400000, // Clean up expired sessions every 24h
    }),
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      httpOnly: true,
    },
  })
);

// Import routes after session middleware
const chatRoutes = require("./routes/chat");
app.use("/api", chatRoutes);

// Route handler
app.get("/", (req, res) => {
  res.sendFile(path.join(publicPath, "index.html"));
});

// Health check endpoint for Vercel
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Vercel requires this export for serverless functions
module.exports = app;

// Only start server if not in Vercel environment
if (process.env.VERCEL !== "1") {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Public path: ${publicPath}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}
