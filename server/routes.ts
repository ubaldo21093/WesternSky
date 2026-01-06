import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { nanoid } from "nanoid";
import { storage } from "./storage";
import { sendPasswordResetEmail } from "./email";
import { insertUserSchema, insertPropertySchema, insertTaskSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes for username/password
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Please provide a valid email address" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists with this email" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await storage.createUser({
        name: username,
        email,
        password: hashedPassword,
        role: "homeowner",
        avatarUrl: null,
      });

      (req as any).session.user = newUser;
      res.json({ user: newUser });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, name, avatarUrl, username, password } = req.body;
      
      if (email && name) {
        let user = await storage.getUserByEmail(email);
        
        if (!user) {
          user = await storage.createUser({
            email,
            name,
            avatarUrl: avatarUrl || null,
            role: "homeowner",
          });
        }

        (req as any).session.user = user;
        res.json({ user });
        return;
      }
      
      if (username && password) {
        console.log("[LOGIN DEBUG] Attempting login for username:", username);
        let user = await storage.getUserByEmail(username);
        if (!user) {
          const allUsers = await storage.getAllUsers();
          user = allUsers.find(u => u.name === username);
        }

        console.log("[LOGIN DEBUG] Found user:", user?.name, "Has password:", !!user?.password);

        if (!user || !user.password) {
          console.log("[LOGIN DEBUG] Rejected - no user or no password");
          return res.status(401).json({ error: "Invalid credentials" });
        }

        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log("[LOGIN DEBUG] Password valid:", isValidPassword);
        if (!isValidPassword) {
          console.log("[LOGIN DEBUG] Rejected - invalid password");
          return res.status(401).json({ error: "Invalid credentials" });
        }

        (req as any).session.user = user;
        res.json({ user });
        return;
      }
      
      return res.status(400).json({ error: "Either email and name (for Google sign-in) or username and password are required" });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account with that email exists, a reset link has been sent." });
      }

      const rawToken = nanoid(32);
      const hashedToken = hashToken(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await storage.createPasswordResetToken(user.id, hashedToken, expiresAt);

      const emailSent = await sendPasswordResetEmail(user.email, user.name, rawToken);
      
      if (!emailSent) {
        console.error("Failed to send password reset email to:", email);
      }

      res.json({ message: "If an account with that email exists, a reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, newPassword } = req.body;
      
      if (!token || !newPassword) {
        return res.status(400).json({ error: "Token and new password are required" });
      }

      const hashedToken = hashToken(token);
      const resetToken = await storage.getPasswordResetToken(hashedToken);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset link" });
      }

      if (resetToken.usedAt) {
        return res.status(400).json({ error: "This reset link has already been used" });
      }

      if (new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "This reset link has expired" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(resetToken.userId, { password: hashedPassword });
      await storage.markPasswordResetTokenUsed(resetToken.id);

      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Password reset failed" });
    }
  });

  app.get("/api/auth/verify-reset-token", async (req, res) => {
    try {
      const token = req.query.token as string;
      
      if (!token) {
        return res.status(400).json({ valid: false, error: "Token is required" });
      }

      const hashedToken = hashToken(token);
      const resetToken = await storage.getPasswordResetToken(hashedToken);
      
      if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        return res.json({ valid: false, error: "Invalid or expired reset link" });
      }

      res.json({ valid: true, email: resetToken.user.email });
    } catch (error) {
      console.error("Verify token error:", error);
      res.status(500).json({ valid: false, error: "Failed to verify token" });
    }
  });

  // Admin routes
  app.get("/api/admin/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get all users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/admin/users/:userId/role", async (req, res) => {
    if (!(req as any).session?.user || (req as any).session.user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { userId } = req.params;
    const { role } = req.body;

    if (!["admin", "employee", "homeowner"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    try {
      const updatedUser = await storage.updateUser(parseInt(userId), { role });
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(updatedUser);
    } catch (error) {
      console.error("Update user role error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", async (req, res) => {
    const sessionUser = (req as any).session?.user;
    if (sessionUser) {
      return res.json({ user: sessionUser });
    }

    const email = req.query.email as string;
    const userId = req.headers["x-user-id"];
    
    if (!email && !userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      let user;
      if (email) {
        user = await storage.getUserByEmail(email);
      } else if (userId) {
        user = await storage.getUser(parseInt(userId as string));
      }
      
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ user });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/logout", async (req, res) => {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error:", err);
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie('connect.sid');
        res.json({ message: "Logged out successfully" });
      });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      
      if (sessionUser && sessionUser.role === "homeowner") {
        const assignedProperties = await storage.getUserAssignedProperties(sessionUser.id);
        const assignedPropertyIds = assignedProperties.map(p => p.id);
        
        const allTasks = await storage.getTasks({});
        const userTasks = allTasks.filter(task => 
          (task.propertyId !== null && assignedPropertyIds.includes(task.propertyId)) || task.requesterId === sessionUser.id
        );
        
        const activeTasks = userTasks.filter(task => 
          task.status === "pending" || task.status === "in_progress"
        ).length;
        
        const urgentRequests = userTasks.filter(task => 
          task.priority === "high" && (task.status === "pending" || task.status === "in_progress")
        ).length;
        
        const homeownerStats = {
          totalProperties: assignedProperties.length,
          activeTasks,
          urgentRequests,
          monthlyRevenue: "N/A"
        };
        
        return res.json(homeownerStats);
      }
      
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Properties routes
  app.get("/api/properties", async (req, res) => {
    try {
      const sessionUser = (req as any).session?.user;
      
      const properties = await storage.getProperties();
      
      if (sessionUser && sessionUser.role === "homeowner") {
        const assignedProperties = await storage.getUserAssignedProperties(sessionUser.id);
        return res.json(assignedProperties);
      }
      
      res.json(properties);
    } catch (error) {
      console.error("Get properties error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const property = await storage.getProperty(id);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      console.error("Get property error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/properties", async (req, res) => {
    try {
      const validatedData = insertPropertySchema.parse(req.body);
      const property = await storage.createProperty(validatedData);
      res.status(201).json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create property error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertPropertySchema.partial().parse(req.body);
      const property = await storage.updateProperty(id, validatedData);
      
      if (!property) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.json(property);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update property error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/properties/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProperty(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Property not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete property error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", async (req, res) => {
    try {
      const { propertyId, assigneeId, status } = req.query;
      const filters: any = {};
      
      if (propertyId) filters.propertyId = parseInt(propertyId as string);
      if (assigneeId) filters.assigneeId = parseInt(assigneeId as string);
      if (status) filters.status = status as string;
      
      const sessionUser = (req as any).session?.user;
      
      if (sessionUser && sessionUser.role === "homeowner") {
        const assignedProperties = await storage.getUserAssignedProperties(sessionUser.id);
        const assignedPropertyIds = assignedProperties.map(p => p.id);
        
        const allTasks = await storage.getTasks(filters);
        const filteredTasks = allTasks.filter(task => 
          (task.propertyId !== null && assignedPropertyIds.includes(task.propertyId)) || task.requesterId === sessionUser.id
        );
        return res.json(filteredTasks);
      }
      
      const tasks = await storage.getTasks(filters);
      res.json(tasks);
    } catch (error) {
      console.error("Get tasks error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const task = await storage.getTask(id);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      console.error("Get task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/tasks", async (req, res) => {
    try {
      const taskData = {
        ...req.body,
        dueDate: req.body.dueDate ? new Date(req.body.dueDate) : undefined,
      };
      const validatedData = insertTaskSchema.parse(taskData);
      const task = await storage.createTask(validatedData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertTaskSchema.partial().parse(req.body);
      
      const updateData = { 
        ...validatedData,
        ...(validatedData.status === "completed" ? { completedAt: new Date() } : {})
      };
      
      const task = await storage.updateTask(id, updateData);
      
      if (!task) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Update task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/tasks/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTask(id);
      
      if (!deleted) {
        return res.status(404).json({ error: "Task not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete task error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Messages routes
  app.get("/api/messages", async (req, res) => {
    try {
      if (!(req as any).session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = (req as any).session.user.id;
      const { otherUserId } = req.query;
      
      const messages = await storage.getMessages(
        userId,
        otherUserId ? parseInt(otherUserId as string) : undefined
      );
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/messages/users", async (req, res) => {
    try {
      if (!(req as any).session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const userId = (req as any).session.user.id;
      const messageableUsers = await storage.getMessageableUsers(userId);
      res.json(messageableUsers);
    } catch (error) {
      console.error("Get messageable users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      if (!(req as any).session?.user) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const validatedData = insertMessageSchema.parse({
        ...req.body,
        senderId: (req as any).session.user.id
      });
      const message = await storage.createMessage(validatedData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid data", details: error.errors });
      }
      console.error("Create message error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/messages/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markMessageAsRead(id);
      res.status(204).send();
    } catch (error) {
      console.error("Mark message as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Notifications routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const userId = req.headers["x-user-id"];
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      const notifications = await storage.getNotifications(parseInt(userId as string));
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/notifications/:id/read", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.markNotificationAsRead(id);
      res.status(204).send();
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Property assignments
  app.get("/api/property-assignments", async (req, res) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const assignments = await storage.getPropertyAssignments(userId);
      res.json(assignments);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching property assignments: " + error.message });
    }
  });

  app.post("/api/property-assignments", async (req, res) => {
    try {
      const { userId, propertyId } = req.body;
      const assignment = await storage.createPropertyAssignment({ userId, propertyId });
      res.json(assignment);
    } catch (error: any) {
      res.status(500).json({ message: "Error creating property assignment: " + error.message });
    }
  });

  app.delete("/api/property-assignments/:userId/:propertyId", async (req, res) => {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser) {
      return res.sendStatus(401);
    }

    if (sessionUser.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    try {
      const userId = parseInt(req.params.userId);
      const propertyId = parseInt(req.params.propertyId);
      const success = await storage.deletePropertyAssignment(userId, propertyId);
      
      if (success) {
        res.json({ message: "Property assignment removed" });
      } else {
        res.status(404).json({ message: "Property assignment not found" });
      }
    } catch (error: any) {
      res.status(500).json({ message: "Error removing property assignment: " + error.message });
    }
  });

  app.get("/api/users/:userId/assigned-properties", async (req, res) => {
    const sessionUser = (req as any).session?.user;
    if (!sessionUser) {
      return res.sendStatus(401);
    }

    try {
      const userId = parseInt(req.params.userId);
      const properties = await storage.getUserAssignedProperties(userId);
      res.json(properties);
    } catch (error: any) {
      res.status(500).json({ message: "Error fetching assigned properties: " + error.message });
    }
  });

  // Database setup endpoint
  app.post("/api/db-setup", async (req, res) => {
    try {
      const { execSync } = require('child_process');
      
      try {
        execSync('npm run db:push', { stdio: 'inherit' });
        res.json({ 
          success: true, 
          message: "Database tables created successfully" 
        });
      } catch (error) {
        console.error("Database setup error:", error);
        res.status(500).json({ 
          error: "Database setup failed", 
          details: error instanceof Error ? error.message : String(error)
        });
      }
    } catch (error) {
      console.error("Database setup error:", error);
      res.status(500).json({ error: "Database setup failed" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
