import { useState, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Panel,
  MarkerType,
  Position,
  Handle,
} from "reactflow";
import "reactflow/dist/style.css";
import { Button } from "@/components/ui/button";
import { PlusIcon, KeyRound, Link } from "lucide-react";
import { Entity, Relationship, Field, DatabaseSchema } from "@shared/types";

// Custom Node Component for Entity Tables
function EntityNode({ data, selected }: any) {
  const { entity, onEditEntity, onDeleteEntity } = data;
  
  return (
    <div className={`entity-box bg-white border ${selected ? 'border-primary-400' : 'border-primary-200'} rounded-md shadow-sm w-64`}>
      <div className="bg-primary-100 text-primary-700 font-medium px-3 py-2 rounded-t-md border-b border-primary-200 flex justify-between items-center">
        <span>{entity.name}</span>
        <div className="flex space-x-1">
          <button
            className="text-primary-500 hover:text-primary-700 p-1 text-xs"
            title="Edit Entity"
            onClick={() => onEditEntity(entity.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button
            className="text-primary-500 hover:text-primary-700 p-1 text-xs"
            title="Delete Entity"
            onClick={() => onDeleteEntity(entity.id)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
          </button>
        </div>
      </div>
      <ul className="text-sm divide-y divide-neutral-100">
        {entity.fields.map((field) => (
          <li key={field.id} className="px-3 py-1.5 flex items-center">
            <span className="w-4 h-4 mr-2 flex-shrink-0">
              {field.isPrimaryKey && <KeyRound className="h-3 w-3 text-secondary-500" />}
              {field.isForeignKey && !field.isPrimaryKey && <Link className="h-3 w-3 text-primary-500" />}
            </span>
            <span className={field.isPrimaryKey ? "font-medium" : ""}>{field.name}</span>
            <span className="ml-2 text-neutral-500 text-xs">
              {field.type}
              {field.isPrimaryKey && " PK"}
              {field.isForeignKey && " FK"}
            </span>
            {field.isForeignKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${field.id}-source`}
                style={{ background: '#616e7c' }}
              />
            )}
            {field.isPrimaryKey && (
              <Handle
                type="target"
                position={Position.Left}
                id={`${field.id}-target`}
                style={{ background: '#616e7c' }}
              />
            )}
          </li>
        ))}
      </ul>
      <div 
        className="px-3 py-1 text-primary-500 hover:bg-primary-50 text-sm border-t border-neutral-100 cursor-pointer"
        onClick={() => onEditEntity(entity.id, true)}
      >
        <PlusIcon className="inline-block h-3 w-3 mr-1" /> Add field
      </div>
    </div>
  );
}

// Custom Node Types
const nodeTypes = {
  entityNode: EntityNode,
};

interface ErDiagramProps {
  schema: DatabaseSchema | null;
  onUpdateSchema: (schema: DatabaseSchema) => void;
  onEditEntity: (entityId: string | null, addField?: boolean) => void;
}

export default function ErDiagram({ schema, onUpdateSchema, onEditEntity }: ErDiagramProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Convert schema to ReactFlow nodes and edges
  useEffect(() => {
    if (!schema) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Convert entities to nodes
    const newNodes = schema.entities.map((entity) => ({
      id: entity.id,
      type: 'entityNode',
      position: entity.position,
      data: { 
        entity,
        onEditEntity: (entityId: string, addField?: boolean) => onEditEntity(entityId, addField),
        onDeleteEntity: (entityId: string) => {
          const updatedEntities = schema.entities.filter(e => e.id !== entityId);
          const updatedRelationships = schema.relationships.filter(
            r => r.sourceEntityId !== entityId && r.targetEntityId !== entityId
          );
          onUpdateSchema({
            entities: updatedEntities,
            relationships: updatedRelationships
          });
        }
      },
      draggable: true,
    }));

    // Convert relationships to edges
    const newEdges = schema.relationships.map((rel) => {
      const sourceEntity = schema.entities.find(e => e.id === rel.sourceEntityId);
      const targetEntity = schema.entities.find(e => e.id === rel.targetEntityId);
      const sourceField = sourceEntity?.fields.find(f => f.id === rel.sourceFieldId);
      const targetField = targetEntity?.fields.find(f => f.id === rel.targetFieldId);

      return {
        id: rel.id,
        source: rel.sourceEntityId,
        target: rel.targetEntityId,
        sourceHandle: `${rel.sourceFieldId}-source`,
        targetHandle: `${rel.targetFieldId}-target`,
        label: rel.type,
        type: 'default',
        animated: true,
        style: { stroke: '#616e7c' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#616e7c',
        },
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [schema, setNodes, setEdges, onEditEntity, onUpdateSchema]);

  // Update schema when nodes positions change
  const onNodeDragStop = (event: React.MouseEvent, node: Node) => {
    if (!schema) return;
    
    const updatedEntities = schema.entities.map(entity => {
      if (entity.id === node.id) {
        return {
          ...entity,
          position: node.position,
        };
      }
      return entity;
    });
    
    onUpdateSchema({
      ...schema,
      entities: updatedEntities,
    });
  };

  const handleAddEntity = () => {
    onEditEntity(null);
  };

  return (
    <div className="h-1/2 md:h-auto md:w-3/5 border-r border-neutral-200 flex flex-col bg-white">
      <div className="border-b border-neutral-200 px-4 py-2 flex justify-between items-center bg-neutral-50">
        <h2 className="font-medium text-neutral-800">ER Diagram</h2>
      </div>
      <div className="flex-1 overflow-hidden">
        <ReactFlowProvider>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            nodeTypes={nodeTypes}
            fitView
            className="diagram-container"
          >
            <Background />
            <Controls />
            <MiniMap />
            <Panel position="bottom-right">
              <Button
                size="icon"
                className="rounded-full w-12 h-12 shadow-lg"
                onClick={handleAddEntity}
              >
                <PlusIcon className="h-6 w-6" />
              </Button>
            </Panel>
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  );
}
