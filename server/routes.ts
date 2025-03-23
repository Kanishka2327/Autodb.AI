import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { generateSchema } from "./anthropic";
import { z } from "zod";
import { insertProjectSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all projects
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getAllProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects", error: error.message });
    }
  });

  // Get a project by ID
  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project", error: error.message });
    }
  });

  // Create a new project
  app.post("/api/projects", async (req, res) => {
    try {
      const result = insertProjectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid project data",
          errors: result.error.errors,
        });
      }

      const project = await storage.createProject(result.data);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to create project", error: error.message });
    }
  });

  // Update a project
  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const result = insertProjectSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid project data",
          errors: result.error.errors,
        });
      }

      const project = await storage.updateProject(id, result.data);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project", error: error.message });
    }
  });

  // Delete a project
  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const success = await storage.deleteProject(id);
      if (!success) {
        return res.status(404).json({ message: "Project not found" });
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project", error: error.message });
    }
  });

  // Generate schema from prompt
  app.post("/api/generate", async (req, res) => {
    try {
      const schema = z.object({
        prompt: z.string().min(1, "Prompt is required"),
        dbType: z.enum(["PostgreSQL", "MySQL", "SQLite", "SQL Server"]),
        includeConstraints: z.boolean().default(true),
        includeSampleData: z.boolean().default(false),
      });

      const result = schema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          message: "Invalid input data",
          errors: result.error.errors,
        });
      }

      const { prompt, dbType, includeConstraints, includeSampleData } = result.data;
      const response = await generateSchema(
        prompt,
        dbType,
        includeConstraints,
        includeSampleData
      );

      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate schema", error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
