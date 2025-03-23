// Entity represents a table in the database schema
export interface Entity {
  id: string;
  name: string;
  position: { x: number; y: number };
  fields: Field[];
}

// Field represents a column in a table
export interface Field {
  id: string;
  name: string;
  type: string;
  constraints: string[];
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    field: string;
  };
}

// Relationship between entities
export interface Relationship {
  id: string;
  sourceId: string;
  targetId: string;
  sourceField: string;
  targetField: string;
  type: "one-to-one" | "one-to-many" | "many-to-many";
}

// Structure for the ER diagram
export interface ERDiagram {
  entities: Entity[];
  relationships: Relationship[];
}

// Database languages supported
export type DbType = "PostgreSQL" | "MySQL" | "SQLite" | "SQL Server";

// Structure of advanced options
export interface AdvancedOptions {
  dbType: DbType;
  includeConstraints: boolean;
  includeSampleData: boolean;
}

// Complete project structure
export interface Project {
  id?: number;
  name: string;
  prompt: string;
  schema: string;
  dbType: DbType;
  diagram: ERDiagram;
  createdAt?: string;
}

// Response from the Anthropic API
export interface SchemaGenerationResponse {
  schema: string;
  diagram: ERDiagram;
}
