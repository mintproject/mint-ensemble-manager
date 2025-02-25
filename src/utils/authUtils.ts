import jwt from "jsonwebtoken";

export const verifyToken = (token: string): boolean => {
    const PUBLIC_KEY = process.env.PUBLIC_KEY;
    try {
        const decoded = jwt.verify(token, PUBLIC_KEY);
        console.log(decoded);
        return true;
    } catch (error) {
        console.error("Token verification error:", error);
        return false;
    }
};

export const securityHandlers = {
    BearerAuth: async (req, scopes) => {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        const token = authHeader.split(" ")[1];
        console.log(token);
        return true;
    },
    oauth2: async (req, scopes) => {
        // Get the token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return false;
        }

        const token = authHeader.split(" ")[1];

        try {
            return verifyToken(token);
        } catch (error) {
            console.error("Token validation error:", error);
            return false;
        }
    }
};
