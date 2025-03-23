import Anthropic from '@anthropic-ai/sdk';
import { SchemaGenerationResponse } from '@shared/types';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const MODEL = 'claude-3-7-sonnet-20250219';

// Initialize Anthropic client with API key
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-development',
});

/**
 * Generates SQL schema and ER diagram from a natural language prompt
 * @param prompt The user's natural language description of the database
 * @param dbType The database type (PostgreSQL, MySQL, SQLite, SQL Server)
 * @param includeConstraints Whether to include constraints in the schema
 * @param includeSampleData Whether to include sample data in the schema
 * @returns An object containing the generated schema and diagram
 */
export async function generateSchema(
  prompt: string,
  dbType: string = 'PostgreSQL',
  includeConstraints: boolean = true,
  includeSampleData: boolean = false
): Promise<SchemaGenerationResponse> {
  try {
    const systemPrompt = `You are an expert database designer.
Your task is to design a database schema based on a user's description.
Respond with a JSON object containing two keys:
1. "schema": The SQL schema for a ${dbType} database.
2. "diagram": An entity-relationship diagram representation of the schema.

The diagram should be an object with the following structure:
{
  "entities": [
    {
      "id": "unique_id",
      "name": "EntityName",
      "position": { "x": 100, "y": 100 },
      "fields": [
        {
          "id": "field_id",
          "name": "field_name",
          "type": "data_type",
          "constraints": ["NOT NULL", "UNIQUE", etc],
          "isPrimaryKey": boolean,
          "isForeignKey": boolean,
          "references": { "table": "referenced_table", "field": "referenced_field" } // only if foreign key
        }
      ]
    }
  ],
  "relationships": [
    {
      "id": "relationship_id",
      "sourceId": "source_entity_id",
      "targetId": "target_entity_id",
      "sourceField": "source_field_name",
      "targetField": "target_field_name",
      "type": "one-to-one" or "one-to-many" or "many-to-many"
    }
  ]
}

${includeConstraints ? 'Include constraints like PRIMARY KEY, FOREIGN KEY, UNIQUE, NOT NULL, CHECK, etc.' : 'Do not include constraints.'}
${includeSampleData ? 'Include INSERT statements for sample data.' : 'Do not include sample data.'}

Ensure field types are appropriate for ${dbType}.
Position the entities in a logical layout, arranging them to minimize relationship crossings.
Use appropriate naming conventions for database objects.`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { 
          role: 'user', 
          content: prompt 
        }
      ],
    });

    // Parse the JSON content from the response
    const content = response.content[0].text;
    // Look for JSON content in the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || 
                      content.match(/```\n([\s\S]*?)\n```/) || 
                      content.match(/{[\s\S]*}/);
    
    let jsonContent;
    if (jsonMatch) {
      jsonContent = jsonMatch[0].replace(/```json\n|```\n|```/g, '');
    } else {
      jsonContent = content;
    }

    return JSON.parse(jsonContent);
  } catch (error) {
    console.error('Error generating schema:', error);
    throw new Error(`Failed to generate schema: ${error.message}`);
  }
}
