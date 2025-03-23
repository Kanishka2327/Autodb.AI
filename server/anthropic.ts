import Anthropic from '@anthropic-ai/sdk';
import { DatabaseSchema } from '@shared/types';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025

export class AnthropicService {
  private anthropic: Anthropic;
  
  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });
  }

  async generateDatabaseSchema(prompt: string, dbType: string = 'mysql'): Promise<{ schema: DatabaseSchema; sqlCode: string }> {
    try {
      const systemPrompt = `You are an expert database architect. Your task is to generate a complete database schema based on a user's description.
      
First, analyze the requirements and design an optimal database structure. 
Then, provide TWO outputs in the exact format specified:

1. A structured JSON representation of the database schema with:
   - entities: array of tables, each with fields, data types, constraints
   - relationships: connections between tables with cardinality (1:1, 1:N, N:M)

2. The complete SQL code to create the schema in ${dbType} format

The JSON must be valid and follow this exact structure:
{
  "entities": [
    {
      "id": "unique-id-1",
      "name": "table_name",
      "fields": [
        {
          "id": "field-id-1",
          "name": "field_name",
          "type": "data_type",
          "isPrimaryKey": boolean,
          "isForeignKey": boolean,
          "isNotNull": boolean,
          "isUnique": boolean,
          "defaultValue": "optional_default_value",
          "references": {
            "table": "referenced_table_name",
            "field": "referenced_field_name"
          }
        }
      ],
      "position": {
        "x": 100,
        "y": 100
      }
    }
  ],
  "relationships": [
    {
      "id": "relationship-id-1",
      "sourceEntityId": "unique-id-of-source-entity",
      "sourceFieldId": "field-id-in-source-entity",
      "targetEntityId": "unique-id-of-target-entity",
      "targetFieldId": "field-id-in-target-entity",
      "type": "1:N"
    }
  ]
}

Place each entity at a reasonable position in the diagram by setting x/y coordinates.
Each ID must be unique. Use descriptive names for tables and fields.
For the SQL code, include appropriate comments, indexes, and constraints.

Respond with ONLY a JSON object with these exact two keys:
{
  "schema": {... the JSON schema as described above ...},
  "sqlCode": "... the complete SQL code as a string ..."
}`;

      // Call Anthropic API
      const response = await this.anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: prompt }
        ],
      });
      
      try {
        // Extract and parse the JSON response
        const content = response.content[0].text;
        console.log("Received Anthropic response:", content);
        
        // Try several strategies to extract valid JSON
        let extractedJson = null;
        
        // Strategy 1: Look for JSON in code blocks
        const jsonCodeBlockMatch = content.match(/```(?:json)?\n([\s\S]*?)\n```/);
        if (jsonCodeBlockMatch && jsonCodeBlockMatch[1]) {
          try {
            const cleanedJson = jsonCodeBlockMatch[1]
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
              .replace(/\\"/g, '"')  // Fix escaped quotes
              .replace(/^```json\s*/, '')
              .replace(/\s*```$/, '');
              
            extractedJson = JSON.parse(cleanedJson);
            console.log("Successfully parsed JSON from code block");
          } catch (err) {
            console.log("Failed to parse JSON from code block, trying other methods");
          }
        }
        
        // Strategy 2: Look for a JSON object with schema and sqlCode keys
        if (!extractedJson) {
          const fullJsonMatch = content.match(/{[\s\S]*?"schema"[\s\S]*?"sqlCode"[\s\S]*?}/);
          if (fullJsonMatch) {
            try {
              const cleanedJson = fullJsonMatch[0]
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
                .replace(/\\"/g, '"'); // Fix escaped quotes
                
              extractedJson = JSON.parse(cleanedJson);
              console.log("Successfully parsed JSON from full content match");
            } catch (err) {
              console.log("Failed to parse JSON from full content match");
            }
          }
        }
        
        // Strategy 3: Try to extract the parts manually and construct a valid response
        if (!extractedJson) {
          console.log("Attempting manual extraction of schema and SQL parts");
          
          // Extract schema part
          const schemaMatch = content.match(/"schema"\s*:\s*({[\s\S]*?})[,\s\n}]/);
          // Extract sqlCode part
          const sqlCodeMatch = content.match(/"sqlCode"\s*:\s*"([\s\S]*?)"\s*[,\n}]/);
          
          if (schemaMatch && sqlCodeMatch) {
            try {
              const schemaStr = schemaMatch[1]
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
                .replace(/\\"/g, '"');
                
              const schema = JSON.parse(schemaStr);
              const sqlCode = sqlCodeMatch[1]
                .replace(/\\\\/g, "\\")
                .replace(/\\"/g, '"')
                .replace(/\\n/g, "\n");
                
              extractedJson = { schema, sqlCode };
              console.log("Successfully extracted schema and SQL manually");
            } catch (err) {
              console.log("Failed to extract schema and SQL manually:", err);
            }
          }
        }
        
        // If we still couldn't parse the JSON, try a more aggressive approach
        if (!extractedJson) {
          // Get the content between the first and last curly braces
          const lastResortMatch = content.match(/{[\s\S]*}/);
          if (lastResortMatch) {
            try {
              // Try to normalize and fix common issues
              let jsonStr = lastResortMatch[0]
                .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
                .replace(/,(\s*[}\]])/g, "$1") // Remove trailing commas
                .replace(/([^\\])\\([^\\"])/g, "$1\\\\$2") // Fix single backslashes
                .replace(/\\'/g, "'") // Remove escaped single quotes
                .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?\s*:/g, '"$2":'); // Ensure property names are quoted
                
              extractedJson = JSON.parse(jsonStr);
              console.log("Successfully parsed JSON with aggressive cleaning");
            } catch (err) {
              console.log("Failed to parse JSON even with aggressive cleaning:", err);
            }
          }
        }
        
        if (!extractedJson) {
          throw new Error("Could not extract valid JSON from the AI response");
        }
        
        return {
          schema: extractedJson.schema,
          sqlCode: extractedJson.sqlCode
        };
      } catch (parseError) {
        console.error("Failed to parse Anthropic response:", parseError);
        throw new Error("Failed to parse the database schema from AI response");
      }
    } catch (error) {
      console.error("Anthropic API error:", error);
      throw new Error("Failed to generate database schema: " + (error as Error).message);
    }
  }
}

export default AnthropicService;
