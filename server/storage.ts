import { 
  users, properties, tasks, messages, notifications, propertyAssignments, passwordResetTokens,
  type User, type InsertUser,
  type Property, type InsertProperty,
  type Task, type InsertTask,
  type Message, type InsertMessage,
  type Notification, type InsertNotification,
  type PropertyAssignment, type InsertPropertyAssignment,
  type PasswordResetToken, type InsertPasswordResetToken
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, count, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;

  // Properties
  getProperties(): Promise<Property[]>;
  getProperty(id: number): Promise<Property | undefined>;
  createProperty(property: InsertProperty): Promise<Property>;
  updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property | undefined>;
  deleteProperty(id: number): Promise<boolean>;

  // Tasks
  getTasks(filters?: { propertyId?: number; assigneeId?: number; status?: string }): Promise<(Task & { property?: Property; assignee?: User })[]>;
  getTask(id: number): Promise<(Task & { property?: Property; assignee?: User }) | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined>;
  deleteTask(id: number): Promise<boolean>;

  // Messages
  getMessages(userId: number, otherUserId?: number): Promise<(Message & { sender: User; receiver: User })[]>;
  getMessageableUsers(userId: number): Promise<User[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageAsRead(id: number): Promise<void>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;

  // Property assignments
  getPropertyAssignments(userId?: number): Promise<(PropertyAssignment & { user?: User; property?: Property })[]>;
  createPropertyAssignment(assignment: InsertPropertyAssignment): Promise<PropertyAssignment>;
  deletePropertyAssignment(userId: number, propertyId: number): Promise<boolean>;
  getUserAssignedProperties(userId: number): Promise<Property[]>;

  // Dashboard stats
  getDashboardStats(): Promise<{
    totalProperties: number;
    activeTasks: number;
    urgentRequests: number;
    monthlyRevenue: string;
  }>;

  // Password reset tokens
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<(PasswordResetToken & { user: User }) | undefined>;
  markPasswordResetTokenUsed(id: number): Promise<void>;
  deleteExpiredTokens(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  async getProperties(): Promise<Property[]> {
    return await db.select().from(properties).orderBy(desc(properties.createdAt));
  }

  async getProperty(id: number): Promise<Property | undefined> {
    const [property] = await db.select().from(properties).where(eq(properties.id, id));
    return property || undefined;
  }

  async createProperty(insertProperty: InsertProperty): Promise<Property> {
    const [property] = await db
      .insert(properties)
      .values(insertProperty)
      .returning();
    return property;
  }

  async updateProperty(id: number, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const [property] = await db
      .update(properties)
      .set(updates)
      .where(eq(properties.id, id))
      .returning();
    return property || undefined;
  }

  async deleteProperty(id: number): Promise<boolean> {
    const result = await db.delete(properties).where(eq(properties.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTasks(filters?: { propertyId?: number; assigneeId?: number; status?: string }) {
    const baseQuery = db
      .select({
        task: tasks,
        property: properties,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(properties, eq(tasks.propertyId, properties.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(desc(tasks.createdAt));

    if (filters) {
      const conditions = [];
      if (filters.propertyId) conditions.push(eq(tasks.propertyId, filters.propertyId));
      if (filters.assigneeId) conditions.push(eq(tasks.assigneeId, filters.assigneeId));
      if (filters.status) conditions.push(eq(tasks.status, filters.status));
      
      if (conditions.length > 0) {
        const results = await baseQuery.where(and(...conditions));
        return results.map(result => ({
          ...result.task,
          property: result.property || undefined,
          assignee: result.assignee || undefined,
        }));
      }
    }

    const results = await baseQuery;
    return results.map(result => ({
      ...result.task,
      property: result.property || undefined,
      assignee: result.assignee || undefined,
    }));
  }

  async getTask(id: number) {
    const [result] = await db
      .select({
        task: tasks,
        property: properties,
        assignee: users,
      })
      .from(tasks)
      .leftJoin(properties, eq(tasks.propertyId, properties.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.id, id));

    if (!result) return undefined;

    return {
      ...result.task,
      property: result.property || undefined,
      assignee: result.assignee || undefined,
    };
  }

  async createTask(insertTask: InsertTask): Promise<Task> {
    const [task] = await db
      .insert(tasks)
      .values(insertTask)
      .returning();
    return task;
  }

  async updateTask(id: number, updates: Partial<InsertTask>): Promise<Task | undefined> {
    const taskUpdates = {
      ...updates,
      dueDate: updates.dueDate ? new Date(updates.dueDate) : updates.dueDate,
    };
    const [task] = await db
      .update(tasks)
      .set(taskUpdates)
      .where(eq(tasks.id, id))
      .returning();
    return task || undefined;
  }

  async deleteTask(id: number): Promise<boolean> {
    const result = await db.delete(tasks).where(eq(tasks.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getMessages(userId: number, otherUserId?: number) {
    const messageResults = await db
      .select()
      .from(messages)
      .where(
        otherUserId
          ? or(
              and(eq(messages.senderId, userId), eq(messages.receiverId, otherUserId)),
              and(eq(messages.senderId, otherUserId), eq(messages.receiverId, userId))
            )
          : or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
      )
      .orderBy(desc(messages.createdAt));

    const enrichedMessages = await Promise.all(
      messageResults.map(async (message) => {
        const [sender] = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl, createdAt: users.createdAt, password: users.password })
          .from(users)
          .where(eq(users.id, message.senderId));
        
        const [receiver] = await db
          .select({ id: users.id, name: users.name, email: users.email, role: users.role, avatarUrl: users.avatarUrl, createdAt: users.createdAt, password: users.password })
          .from(users)
          .where(eq(users.id, message.receiverId));

        return {
          ...message,
          sender,
          receiver,
        };
      })
    );

    return enrichedMessages;
  }

  async getMessageableUsers(userId: number): Promise<User[]> {
    const [currentUser] = await db.select().from(users).where(eq(users.id, userId));
    if (!currentUser) return [];

    let whereCondition;
    
    if (currentUser.role === "admin") {
      whereCondition = or(eq(users.role, "employee"), eq(users.role, "homeowner"));
    } else if (currentUser.role === "employee" || currentUser.role === "homeowner") {
      whereCondition = eq(users.role, "admin");
    } else {
      return [];
    }

    const messageableUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        createdAt: users.createdAt,
        password: users.password
      })
      .from(users)
      .where(whereCondition);

    return messageableUsers.filter(user => user.id !== userId);
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const [message] = await db
      .insert(messages)
      .values(insertMessage)
      .returning();
    return message;
  }

  async markMessageAsRead(id: number): Promise<void> {
    await db
      .update(messages)
      .set({ readAt: new Date() })
      .where(eq(messages.id, id));
  }

  async getNotifications(userId: number): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(insertNotification)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(eq(notifications.id, id));
  }

  async getPropertyAssignments(userId?: number): Promise<(PropertyAssignment & { user?: User; property?: Property })[]> {
    const query = db
      .select({
        id: propertyAssignments.id,
        userId: propertyAssignments.userId,
        propertyId: propertyAssignments.propertyId,
        createdAt: propertyAssignments.createdAt,
        user: {
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          avatarUrl: users.avatarUrl,
          createdAt: users.createdAt,
          password: users.password,
        },
        property: {
          id: properties.id,
          name: properties.name,
          address: properties.address,
          units: properties.units,
          status: properties.status,
          notes: properties.notes,
          monthlyRevenue: properties.monthlyRevenue,
          createdAt: properties.createdAt,
        },
      })
      .from(propertyAssignments)
      .leftJoin(users, eq(propertyAssignments.userId, users.id))
      .leftJoin(properties, eq(propertyAssignments.propertyId, properties.id));

    if (userId) {
      query.where(eq(propertyAssignments.userId, userId));
    }

    const results = await query;
    return results.map(r => ({
      ...r,
      user: r.user?.id ? r.user as User : undefined,
      property: r.property?.id ? r.property as Property : undefined,
    }));
  }

  async createPropertyAssignment(assignment: InsertPropertyAssignment): Promise<PropertyAssignment> {
    const [propertyAssignment] = await db
      .insert(propertyAssignments)
      .values(assignment)
      .returning();
    return propertyAssignment;
  }

  async deletePropertyAssignment(userId: number, propertyId: number): Promise<boolean> {
    const result = await db
      .delete(propertyAssignments)
      .where(and(
        eq(propertyAssignments.userId, userId),
        eq(propertyAssignments.propertyId, propertyId)
      ));
    return (result.rowCount || 0) > 0;
  }

  async getUserAssignedProperties(userId: number): Promise<Property[]> {
    const assignments = await db
      .select({
        id: properties.id,
        name: properties.name,
        address: properties.address,
        units: properties.units,
        status: properties.status,
        notes: properties.notes,
        monthlyRevenue: properties.monthlyRevenue,
        createdAt: properties.createdAt,
      })
      .from(propertyAssignments)
      .innerJoin(properties, eq(propertyAssignments.propertyId, properties.id))
      .where(eq(propertyAssignments.userId, userId));
    
    return assignments;
  }

  async getDashboardStats() {
    const [propertiesCount] = await db.select({ count: count() }).from(properties);
    const [activeTasksCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(eq(tasks.status, "in_progress"));
    const [urgentTasksCount] = await db
      .select({ count: count() })
      .from(tasks)
      .where(and(
        eq(tasks.priority, "urgent"), 
        or(
          eq(tasks.status, "pending"),
          eq(tasks.status, "in_progress")
        )
      ));

    const propertiesData = await db.select().from(properties);
    const monthlyRevenue = propertiesData.reduce((sum, property) => {
      return sum + (property.monthlyRevenue ? parseFloat(property.monthlyRevenue) : 0);
    }, 0);

    return {
      totalProperties: propertiesCount.count,
      activeTasks: activeTasksCount.count,
      urgentRequests: urgentTasksCount.count,
      monthlyRevenue: `$${monthlyRevenue.toLocaleString()}`,
    };
  }

  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db
      .insert(passwordResetTokens)
      .values({ userId, token, expiresAt })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<(PasswordResetToken & { user: User }) | undefined> {
    const result = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        token: passwordResetTokens.token,
        expiresAt: passwordResetTokens.expiresAt,
        usedAt: passwordResetTokens.usedAt,
        createdAt: passwordResetTokens.createdAt,
        user: users,
      })
      .from(passwordResetTokens)
      .innerJoin(users, eq(passwordResetTokens.userId, users.id))
      .where(eq(passwordResetTokens.token, token));
    
    return result[0] || undefined;
  }

  async markPasswordResetTokenUsed(id: number): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db
      .delete(passwordResetTokens)
      .where(sql`${passwordResetTokens.expiresAt} < NOW()`);
  }
}

export const storage = new DatabaseStorage();
