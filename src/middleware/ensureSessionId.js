import { v4 as uuidv4 } from "uuid";

const ensureSessionId = (req, res, next) => {
  // Check for session ID in all possible locations
  let sessionId =
    req.cookies?.sessionId ||
    req.body.sessionId ||
    req.query.sessionId ||
    req.params.sessionId;

  // If no session ID and no authenticated user
  if (!sessionId && !req.user?.id && !req.params.userId) {
    sessionId = uuidv4();

    // Set cookie
    res.cookie("sessionId", sessionId, {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/", // Ensure cookie is available across all routes
    });
  }

  // Attach to request object for downstream middleware
  req.sessionId = sessionId;
  next();
};

export default ensureSessionId;
